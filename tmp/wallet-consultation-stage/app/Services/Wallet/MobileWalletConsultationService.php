<?php

namespace App\Services\Wallet;

use App\Models\Appointment;
use App\Models\DoctorConsultationTariff;
use App\Models\MobileWalletAccount;
use App\Models\MobileWalletConsultationQuote;
use App\Models\MobileWalletServicePayment;
use App\Models\Patient;
use App\Models\User;
use App\Services\DoctorConsultationTariffService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class MobileWalletConsultationService
{
    public const MATERIAL_FIELDS = ['patient_id', 'doctor_id', 'medical_unit_id', 'procedure_area_id', 'specialty', 'modality', 'location', 'starts_at', 'ends_at'];

    public const PAYMENT_HISTORY_MESSAGE = 'Esta consulta tiene un pago registrado. Cancela y agenda una nueva cita para cambiarla.';

    public function __construct(private readonly MobileWalletService $wallet, private readonly DoctorConsultationTariffService $tariffs) {}

    private function account(User $user, bool $create = false): ?MobileWalletAccount
    {
        $identity = ['user_id' => $user->id, 'mode' => $this->wallet->mode(), 'currency' => MobileWalletService::CURRENCY, 'scope' => MobileWalletService::SCOPE];

        return $create ? MobileWalletAccount::firstOrCreate($identity) : MobileWalletAccount::where($identity)->first();
    }

    private function eligible(User $user): Builder
    {
        return Appointment::query()->where('status', 'confirmed')->where('modality', 'Presencial')->where('starts_at', '>', now())
            ->whereHas('patient', fn ($query) => $query->where('user_id', $user->id)->where('status', 'active'))
            ->whereHas('doctor', fn ($query) => $query->where('status', 'active')
                ->whereHas('user', fn ($actor) => $actor->where('status', 'active')->where('role', 'doctor')
                    ->when($this->wallet->mode() === 'live', fn ($real) => $real->where('is_demo', false))));
    }

    private function ownAppointment(User $user, int $id): Appointment
    {
        $appointment = Appointment::query()->whereKey($id)->lockForUpdate()->firstOrFail();
        abort_unless($appointment->patient()->where('user_id', $user->id)->where('status', 'active')->exists(), 404);

        return $appointment;
    }

    private function assertEligible(User $user, Appointment $appointment): void
    {
        if (! $this->eligible($user)->whereKey($appointment->id)->exists()) {
            throw new WalletPaymentException('consultation_not_payable', 'Solo puedes pagar una consulta presencial confirmada y próxima.', 409);
        }
    }

    public function fingerprint(Appointment $appointment): string
    {
        $values = [];
        foreach (self::MATERIAL_FIELDS as $field) {
            $value = $appointment->getAttribute($field);
            $values[$field] = in_array($field, ['starts_at', 'ends_at'], true) ? $value?->copy()->utc()->format('Y-m-d H:i:s') : $value;
        }

        return hash('sha256', json_encode($values, JSON_THROW_ON_ERROR));
    }

    private function quoteStatus(MobileWalletConsultationQuote $quote, Appointment $appointment, ?MobileWalletServicePayment $payment): string
    {
        if ($payment?->status === 'paid') {
            return 'paid';
        }
        if ($payment || $quote->appointment_fingerprint !== $this->fingerprint($appointment) || $appointment->status !== 'confirmed') {
            return 'invalidated';
        }

        return $quote->expires_at->isFuture() ? 'valid' : 'expired';
    }

    private function quoteData(MobileWalletConsultationQuote $quote, Appointment $appointment, ?MobileWalletServicePayment $payment = null): array
    {
        return ['id' => $quote->id, 'appointment_id' => $quote->appointment_id, 'tariff_id' => $quote->tariff_id,
            'tariff_version' => $quote->tariff_version, 'amount_cents' => $quote->amount_cents, 'currency' => $quote->currency,
            'scope' => $quote->scope, 'mode' => $quote->mode, 'expires_at' => $quote->expires_at->toIso8601String(),
            'status' => $this->quoteStatus($quote, $appointment, $payment)];
    }

    private function paymentData(MobileWalletServicePayment $payment): array
    {
        return ['id' => $payment->id, 'appointment_id' => $payment->appointment_id, 'quote_id' => $payment->quote_id,
            'amount_cents' => $payment->amount_cents, 'currency' => $payment->currency, 'scope' => $payment->scope,
            'mode' => $payment->mode, 'status' => $payment->status, 'paid_at' => $payment->paid_at->toIso8601String(),
            'reversed_at' => $payment->reversed_at?->toIso8601String()];
    }

    private function tariffData(?DoctorConsultationTariff $tariff): ?array
    {
        return $tariff ? ['id' => $tariff->id, 'version' => $tariff->version, 'amount_cents' => $tariff->amount_cents,
            'currency' => $tariff->currency, 'modality' => $tariff->modality] : null;
    }

    public function consultations(User $user): array
    {
        $account = $this->account($user);
        $appointments = $this->eligible($user)->with('doctor')->orderBy('starts_at')->orderBy('id')->limit(51)->get();

        return ['appointments' => $appointments->take(50)->map(function (Appointment $appointment) use ($account): array {
            $payment = $account ? MobileWalletServicePayment::where('wallet_account_id', $account->id)->where('appointment_id', $appointment->id)->first() : null;
            $quote = $payment?->quote ?? ($account ? MobileWalletConsultationQuote::where('wallet_account_id', $account->id)
                ->where('appointment_id', $appointment->id)->latest('created_at')->latest('id')->first() : null);

            return ['id' => $appointment->id, 'doctor' => ['name' => $appointment->doctor->full_name],
                'starts_at' => $appointment->starts_at->toIso8601String(), 'modality' => 'Presencial', 'status' => 'confirmed',
                'tariff' => $this->tariffData($this->tariffs->current($appointment->doctor)),
                'quote' => $quote ? $this->quoteData($quote, $appointment, $payment) : null,
                'payment' => $payment ? $this->paymentData($payment) : null];
        })->values()->all(), 'has_more' => $appointments->count() > 50];
    }

    public function quote(User $user, int $appointmentId): array
    {
        return DB::transaction(function () use ($user, $appointmentId): array {
            $appointment = $this->ownAppointment($user, $appointmentId);
            $this->assertEligible($user, $appointment);
            $account = $this->account($user, true);
            $account = MobileWalletAccount::whereKey($account->id)->lockForUpdate()->firstOrFail();
            $payment = MobileWalletServicePayment::where('wallet_account_id', $account->id)->where('appointment_id', $appointment->id)->lockForUpdate()->first();
            if ($payment) {
                return ['quote' => $this->quoteData($payment->quote, $appointment, $payment)];
            }
            $existing = MobileWalletConsultationQuote::where('wallet_account_id', $account->id)->where('appointment_id', $appointment->id)
                ->where('appointment_fingerprint', $this->fingerprint($appointment))->where('expires_at', '>', now())->latest('created_at')->latest('id')->first();
            if ($existing) {
                return ['quote' => $this->quoteData($existing, $appointment)];
            }
            $tariff = $this->tariffs->current($appointment->doctor);
            if (! $tariff || $tariff->amount_cents < DoctorConsultationTariffService::MIN_AMOUNT_CENTS || $tariff->amount_cents > DoctorConsultationTariffService::MAX_AMOUNT_CENTS) {
                throw new WalletPaymentException('consultation_tariff_unavailable', 'El médico todavía no ha publicado una tarifa para esta consulta.', 409);
            }
            $quote = MobileWalletConsultationQuote::create(['id' => (string) Str::uuid(), 'wallet_account_id' => $account->id,
                'appointment_id' => $appointment->id, 'doctor_id' => $appointment->doctor_id, 'tariff_id' => $tariff->id,
                'tariff_version' => $tariff->version, 'amount_cents' => $tariff->amount_cents, 'currency' => MobileWalletService::CURRENCY,
                'scope' => MobileWalletService::SCOPE, 'mode' => $this->wallet->mode(),
                'appointment_fingerprint' => $this->fingerprint($appointment), 'expires_at' => now()->addMinutes(15)]);

            return ['quote' => $this->quoteData($quote, $appointment)];
        });
    }

    public function pay(User $user, string $quoteId, string $clientId): array
    {
        $quote = MobileWalletConsultationQuote::whereKey($quoteId)->whereHas('account', fn ($query) => $query->where('user_id', $user->id)
            ->where('mode', $this->wallet->mode())->where('currency', MobileWalletService::CURRENCY)->where('scope', MobileWalletService::SCOPE))->firstOrFail();

        return DB::transaction(function () use ($user, $quote, $clientId): array {
            $appointment = $this->ownAppointment($user, $quote->appointment_id);
            $account = MobileWalletAccount::whereKey($quote->wallet_account_id)->lockForUpdate()->firstOrFail();
            $request = MobileWalletServicePayment::where('wallet_account_id', $account->id)->where('client_request_id', $clientId)->lockForUpdate()->first();
            if ($request && $request->quote_id !== $quote->id) {
                throw new WalletPaymentException('idempotency_conflict', 'La solicitud ya existe para otra cotización.', 409);
            }
            $existing = MobileWalletServicePayment::where('appointment_id', $appointment->id)->where('mode', $this->wallet->mode())->lockForUpdate()->first();
            if ($existing) {
                if ($existing->quote_id !== $quote->id || $existing->wallet_account_id !== $account->id || ! $request) {
                    throw new WalletPaymentException('consultation_already_paid', 'Esta consulta ya tiene un pago registrado.', 409);
                }

                return $this->paymentResult($user, $existing);
            }
            if (config('wallet-payments.service_redemption_enabled') !== true) {
                throw new WalletPaymentException('service_payments_unavailable', 'El pago de consultas todavía no está disponible.', 503);
            }
            $this->assertEligible($user, $appointment);
            if ($this->quoteStatus($quote, $appointment, null) !== 'valid' || $quote->mode !== $account->mode
                || $quote->currency !== $account->currency || $quote->scope !== $account->scope
                || $quote->doctor_id !== (int) $appointment->doctor_id || $quote->tariff->doctor_id !== $quote->doctor_id
                || $quote->tariff->version !== $quote->tariff_version || $quote->tariff->amount_cents !== $quote->amount_cents
                || $quote->tariff->modality !== 'in_person' || $quote->tariff->currency !== MobileWalletService::CURRENCY
                || $quote->amount_cents < DoctorConsultationTariffService::MIN_AMOUNT_CENTS || $quote->amount_cents > DoctorConsultationTariffService::MAX_AMOUNT_CENTS) {
                throw new WalletPaymentException('consultation_quote_invalid', 'La cotización cambió o venció. Revisa tu consulta otra vez.', 409);
            }
            // Current locking read, rather than an old repeatable-read snapshot after waiting for the account lock.
            $balance = (int) $account->movements()->select('id', 'amount_cents')->lockForUpdate()->get()->sum('amount_cents');
            if ($account->blocked || $balance < 0) {
                throw new WalletPaymentException('wallet_blocked', 'Tu billetera necesita revisión.', 409);
            }
            if ($balance < $quote->amount_cents) {
                throw new WalletPaymentException('insufficient_balance', 'Tu saldo no es suficiente para pagar esta consulta.', 409);
            }
            $payment = MobileWalletServicePayment::create(['id' => (string) Str::uuid(), 'wallet_account_id' => $account->id,
                'appointment_id' => $appointment->id, 'quote_id' => $quote->id, 'client_request_id' => $clientId,
                'amount_cents' => $quote->amount_cents, 'mode' => $account->mode, 'currency' => $account->currency,
                'scope' => $account->scope, 'status' => 'paid', 'paid_at' => now()]);
            $account->movements()->create(['id' => (string) Str::uuid(), 'service_payment_id' => $payment->id,
                'type' => 'service_payment', 'amount_cents' => -$payment->amount_cents,
                'source_key' => 'service-payment:'.$payment->mode.':'.$payment->id]);

            return $this->paymentResult($user, $payment);
        });
    }

    private function paymentResult(User $user, MobileWalletServicePayment $payment): array
    {
        // Snapshot exceptions roll back the debit. Locking reads see the current ledger, not an earlier RR snapshot.
        return ['payment' => $this->paymentData($payment), 'wallet' => $this->wallet->snapshot($user, true)];
    }

    private function paymentAccounts(Appointment $appointment): Collection
    {
        // Appointment first, then every owner account in ascending order, and only then payment rows.
        // Do not depend on a JOIN optimizer's row-lock acquisition order or an old repeatable-read snapshot.
        $patient = Patient::withTrashed()->whereKey($appointment->patient_id)->lockForUpdate()->first();
        $accounts = $patient?->user_id ? MobileWalletAccount::where('user_id', $patient->user_id)
            ->where('currency', MobileWalletService::CURRENCY)->where('scope', MobileWalletService::SCOPE)
            ->orderBy('id')->lockForUpdate()->get() : collect();
        $payments = MobileWalletServicePayment::where('appointment_id', $appointment->id)
            ->orderBy('wallet_account_id')->lockForUpdate()->get();
        foreach ($payments as $payment) {
            $account = $accounts->firstWhere('id', $payment->wallet_account_id);
            if (! $account || $payment->mode !== $account->mode || $payment->currency !== $account->currency || $payment->scope !== $account->scope) {
                throw new WalletPaymentException('wallet_reconciliation_required', 'Esta consulta necesita revisión antes de cambiarla.', 409);
            }
        }

        return $accounts->filter(fn ($account) => $payments->contains('wallet_account_id', $account->id))->values();
    }

    public function guardMutation(Appointment $fresh, array $changes): void
    {
        if ($this->paymentAccounts($fresh)->isEmpty()) {
            return;
        }
        foreach (self::MATERIAL_FIELDS as $field) {
            if (array_key_exists($field, $changes)) {
                abort(409, self::PAYMENT_HISTORY_MESSAGE);
            }
        }
        if ($fresh->status === 'cancelled' && isset($changes['status']) && $changes['status'] !== 'cancelled') {
            abort(409, self::PAYMENT_HISTORY_MESSAGE);
        }
    }

    public function reverseCancelled(Appointment $appointment): void
    {
        if ($appointment->status !== 'cancelled') {
            return;
        }
        foreach ($this->paymentAccounts($appointment) as $account) {
            $payment = MobileWalletServicePayment::where('wallet_account_id', $account->id)->where('appointment_id', $appointment->id)->lockForUpdate()->firstOrFail();
            if ($payment->status === 'reversed') {
                continue;
            }
            $account->movements()->create(['id' => (string) Str::uuid(), 'service_payment_id' => $payment->id,
                'type' => 'service_reversal', 'amount_cents' => $payment->amount_cents,
                'source_key' => 'service-reversal:'.$payment->mode.':'.$payment->id]);
            $payment->update(['status' => 'reversed', 'reversed_at' => now()]);
            // An earlier dispute/refund block always requires deliberate manual resolution, even after the balance recovers.
        }
    }
}
