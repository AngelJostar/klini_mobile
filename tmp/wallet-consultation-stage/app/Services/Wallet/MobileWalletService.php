<?php

namespace App\Services\Wallet;

use App\Models\MobileWalletAccount;
use App\Models\MobileWalletRecharge;
use App\Models\MobileWalletWebhookEvent;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class MobileWalletService
{
    public const MIN_AMOUNT = 5000;

    public const MAX_AMOUNT = 1000000;

    public const SCOPE = 'health_services';

    public const CURRENCY = 'MXN';

    private const PAYABLE = ['requires_payment_method', 'requires_confirmation', 'requires_action'];

    private const PENDING = ['creating', 'requires_payment_method', 'requires_confirmation', 'requires_action', 'processing'];

    private const STATUSES = ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'succeeded', 'canceled'];

    public function __construct(private readonly StripeWalletGateway $stripe) {}

    public function mode(): string
    {
        $mode = config('wallet-payments.mode');
        if (! in_array($mode, ['test', 'live'], true)) {
            throw new WalletPaymentException('payments_not_configured', 'Los pagos no están disponibles.');
        }

        return $mode;
    }

    public function preflightConfiguration(): array
    {
        return ['mode' => $this->mode(), 'credentials_binding_ready' => $this->configured(), 'collection_allowed' => $this->collectingAllowed()];
    }

    public function guardTransport(Request $request): void
    {
        if ($request->isSecure()) {
            return;
        }
        $host = $request->getHost();
        $private = $host === 'localhost' || $host === '::1'
            || (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) && (
                str_starts_with($host, '127.') || str_starts_with($host, '10.') || str_starts_with($host, '192.168.')
                || (preg_match('/^172\.(\d+)\./', $host, $matches) && (int) $matches[1] >= 16 && (int) $matches[1] <= 31)
            ));
        if ($this->mode() !== 'test' || ! $private) {
            throw new WalletPaymentException('secure_connection_required', 'Se requiere una conexión segura.');
        }
    }

    private function configured(): bool
    {
        $mode = $this->mode();

        return preg_match('/^sk_'.$mode.'_[A-Za-z0-9]{12,}$/D', (string) config('wallet-payments.secret_key'))
            && preg_match('/^pk_'.$mode.'_[A-Za-z0-9]{12,}$/D', (string) config('wallet-payments.publishable_key'))
            && preg_match('/^whsec_[A-Za-z0-9]{12,}$/D', (string) config('wallet-payments.webhook_secret'))
            && preg_match('/^merchant\.[A-Za-z0-9.-]+$/D', (string) config('wallet-payments.merchant_identifier'))
            && ($mode !== 'live' || preg_match('/^acct_[A-Za-z0-9]{6,}$/D', (string) config('wallet-payments.account_id')));
    }

    private function collectingAllowed(): bool
    {
        return config('wallet-payments.enabled') === true && ($this->mode() === 'test'
            || (config('wallet-payments.live_enabled') === true && config('wallet-payments.service_redemption_enabled') === true));
    }

    private function operational(bool $creating = false): void
    {
        if (! $this->configured() || ($creating && ! $this->collectingAllowed())) {
            throw new WalletPaymentException('payments_not_configured', 'Los pagos no están disponibles.');
        }
        if ($this->mode() === 'live') {
            $account = $this->stripe->request('GET', '/account');
            $balance = $this->stripe->request('GET', '/balance');
            if (($account['id'] ?? null) !== config('wallet-payments.account_id') || ($account['country'] ?? null) !== 'MX'
                || ($creating && ($account['charges_enabled'] ?? null) !== true) || ($balance['livemode'] ?? null) !== true) {
                throw new WalletPaymentException('stripe_account_not_ready', 'Los pagos no están disponibles.');
            }
        }
    }

    private function account(User $user, bool $create = false, bool $locking = false): ?MobileWalletAccount
    {
        $identity = ['user_id' => $user->id, 'mode' => $this->mode(), 'currency' => self::CURRENCY, 'scope' => self::SCOPE];

        return $create ? MobileWalletAccount::firstOrCreate($identity) : MobileWalletAccount::where($identity)
            ->when($locking, fn ($query) => $query->lockForUpdate())->first();
    }

    private function order(User $user, string $id): MobileWalletRecharge
    {
        $account = $this->account($user);
        abort_unless($account, 404);

        return $account->recharges()->findOrFail($id);
    }

    public function snapshot(User $user, bool $locking = false): array
    {
        if ($this->mode() === 'live' && ! $this->configured()) {
            throw new WalletPaymentException('payments_not_configured', 'Los pagos no están disponibles.');
        }
        $account = $this->account($user, false, $locking);
        $movements = $account?->movements()->with(['servicePayment' => fn ($query) => $query->select('id', 'appointment_id')
            ->when($locking, fn ($current) => $current->lockForUpdate())])->orderByDesc('created_at')->orderByDesc('id')->limit(101)
            ->when($locking, fn ($query) => $query->lockForUpdate())->get() ?? collect();
        $balance = $account && $locking
            ? (int) $account->movements()->select('id', 'amount_cents')->lockForUpdate()->get()->sum('amount_cents')
            : ($account?->balanceCents() ?? 0);
        if (abs($balance) > 9007199254740991) {
            throw new WalletPaymentException('wallet_reconciliation_required', 'Tu saldo necesita revisión.', 409);
        }

        $blocked = (bool) $account?->blocked || $balance < 0;
        $collecting = $this->collectingAllowed() && $this->configured() && ! $blocked;

        return ['mode' => $this->mode(), 'currency' => self::CURRENCY, 'scope' => self::SCOPE,
            'balance_cents' => $balance, 'available_balance_cents' => $blocked ? 0 : max(0, $balance), 'blocked' => $blocked,
            'blocked_reason' => $blocked
                ? (in_array($account?->blocked_reason, ['payment_dispute', 'payment_review'], true) ? $account->blocked_reason : 'payment_review') : null,
            'movements' => $movements->take(100)->map(fn ($movement) => [
                'id' => $movement->id, 'order_id' => $movement->recharge_id, 'service_payment_id' => $movement->service_payment_id,
                'appointment_id' => $movement->servicePayment?->appointment_id, 'type' => $movement->type,
                'amount_cents' => $movement->amount_cents, 'mode' => $this->mode(), 'currency' => self::CURRENCY,
                'scope' => self::SCOPE, 'created_at' => $movement->created_at->toIso8601String(),
            ])->values()->all(), 'has_more_movements' => $movements->count() > 100,
            'pending_recharges' => $account?->recharges()->whereIn('status', self::PENDING)->orderBy('created_at')->limit(20)->when($locking, fn ($query) => $query->lockForUpdate())->get()
                ->map(fn ($order) => $this->orderData($order))->all() ?? [],
            'payment_config' => ['enabled' => $collecting, 'service_payments_enabled' => config('wallet-payments.service_redemption_enabled') === true && ! $blocked,
                'publishable_key' => $collecting ? config('wallet-payments.publishable_key') : null,
                'merchant_identifier' => $collecting ? config('wallet-payments.merchant_identifier') : null,
                'country' => 'MX', 'min_amount_cents' => self::MIN_AMOUNT, 'max_amount_cents' => self::MAX_AMOUNT]];
    }

    private function orderData(MobileWalletRecharge $order): array
    {
        return ['id' => $order->id, 'amount_cents' => $order->amount_cents, 'status' => $order->status,
            'mode' => $this->mode(), 'currency' => self::CURRENCY, 'scope' => self::SCOPE,
            'created_at' => $order->created_at->toIso8601String()];
    }

    private function result(User $user, MobileWalletRecharge $order, ?array $intent = null, bool $includeSecret = false): array
    {
        $order = $order->fresh();
        $secret = null;
        if ($includeSecret && $intent && in_array($order->status, self::PAYABLE, true) && ! $order->account->blocked) {
            $candidate = $intent['client_secret'] ?? null;
            if (! is_string($candidate) || ! preg_match('/^'.preg_quote($order->stripe_payment_intent_id, '/').'_secret_[A-Za-z0-9]+$/D', $candidate)) {
                throw new WalletPaymentException('payment_provider_invalid', 'No fue posible preparar el pago.', 502);
            }
            $secret = $candidate;
        }

        return ['recharge' => $this->orderData($order), 'payment_intent_id' => $order->stripe_payment_intent_id,
            'client_secret' => $secret, 'wallet' => $order->status === 'succeeded' ? $this->snapshot($user) : null];
    }

    public function create(User $user, int $amount, string $clientId): array
    {
        $this->operational(true);
        $account = $this->account($user, true);
        $order = DB::transaction(function () use ($account, $amount, $clientId) {
            $locked = MobileWalletAccount::whereKey($account->id)->lockForUpdate()->firstOrFail();
            $existing = $locked->recharges()->where('client_request_id', $clientId)->first();
            if ($existing) {
                if ($existing->amount_cents !== $amount) {
                    throw new WalletPaymentException('idempotency_conflict', 'La solicitud ya existe con otro importe.', 409);
                }

                return $existing;
            }
            if ($locked->blocked) {
                throw new WalletPaymentException('wallet_blocked', 'Tu billetera necesita revisión.', 409);
            }
            if ($locked->recharges()->whereIn('status', self::PENDING)->exists()) {
                throw new WalletPaymentException('recharge_already_pending', 'Ya tienes una recarga pendiente.', 409);
            }

            return $locked->recharges()->create(['id' => (string) Str::uuid(), 'client_request_id' => $clientId,
                'amount_cents' => $amount, 'status' => 'creating', 'creation_started_at' => now()]);
        });
        if (in_array($order->status, ['succeeded', 'canceled'], true)) {
            return $this->result($user, $order);
        }
        if ($order->account->blocked) {
            throw new WalletPaymentException('wallet_blocked', 'Tu billetera necesita revisión.', 409);
        }
        if ($order->stripe_payment_intent_id) {
            $intent = $this->stripe->request('GET', '/payment_intents/'.$order->stripe_payment_intent_id);
        } else {
            if (! $order->creation_started_at || $order->creation_started_at->lt(now()->subHours(23))) {
                throw new WalletPaymentException('recharge_recovery_required', 'Esta recarga necesita revisión antes de continuar.', 409);
            }
            $intent = $this->stripe->request('POST', '/payment_intents', [
                'amount' => $order->amount_cents, 'currency' => 'mxn', 'payment_method_types' => ['card'],
                'capture_method' => 'automatic', 'metadata' => ['klini_wallet_order_id' => $order->id,
                    'mode' => $this->mode(), 'scope' => self::SCOPE],
            ], 'klini-wallet:'.$this->mode().':'.$order->id);
        }
        $this->reconcile($order, $intent);

        return $this->result($user, $order, $intent, true);
    }

    public function read(User $user, string $id): array
    {
        return $this->result($user, $this->order($user, $id));
    }

    public function refresh(User $user, string $id, bool $resume = false): array
    {
        $order = $this->order($user, $id);
        if ($resume && $order->account->blocked) {
            throw new WalletPaymentException('wallet_blocked', 'Tu billetera necesita revisión.', 409);
        }
        if (! $order->stripe_payment_intent_id) {
            if ($resume) {
                // Recover the existing order with its original provider key, not a new order.
                return $this->create($user, $order->amount_cents, $order->client_request_id);
            }

            $this->operational();

            return $this->result($user, $order);
        }
        $this->operational($resume);
        $intent = $this->stripe->request('GET', '/payment_intents/'.$order->stripe_payment_intent_id);
        $this->reconcile($order, $intent);

        return $this->result($user, $order, $intent, $resume);
    }

    public function cancel(User $user, string $id): array
    {
        $order = $this->order($user, $id);
        $this->operational();
        if (! $order->stripe_payment_intent_id) {
            throw new WalletPaymentException('recharge_recovery_required', 'La recarga necesita revisión antes de cancelarla.', 409);
        }
        $intent = $this->stripe->request('GET', '/payment_intents/'.$order->stripe_payment_intent_id);
        $this->reconcile($order, $intent);
        if (in_array($intent['status'], self::PAYABLE, true)) {
            try {
                $intent = $this->stripe->request('POST', '/payment_intents/'.$order->stripe_payment_intent_id.'/cancel', [], 'klini-wallet-cancel:'.$this->mode().':'.$order->id);
            } catch (WalletPaymentException) {
                // A confirmation can win the race with cancellation. Never imply no charge.
                $intent = $this->stripe->request('GET', '/payment_intents/'.$order->stripe_payment_intent_id);
            }
            $this->reconcile($order, $intent);
        }

        return $this->result($user, $order);
    }

    private function validateIntent(MobileWalletRecharge $order, array $intent): void
    {
        $id = $intent['id'] ?? null;
        $valid = is_string($id) && strlen($id) <= 100 && preg_match('/^pi_[A-Za-z0-9]{6,}$/D', $id)
            && $order->account->mode === $this->mode() && $order->account->currency === self::CURRENCY && $order->account->scope === self::SCOPE
            && ($intent['object'] ?? null) === 'payment_intent'
            && (! $order->stripe_payment_intent_id || $order->stripe_payment_intent_id === $id)
            && ($intent['amount'] ?? null) === $order->amount_cents && ($intent['currency'] ?? null) === 'mxn'
            && ($intent['livemode'] ?? null) === ($this->mode() === 'live')
            && ($intent['capture_method'] ?? null) === 'automatic' && ($intent['payment_method_types'] ?? null) === ['card']
            && ($intent['metadata']['klini_wallet_order_id'] ?? null) === $order->id
            && ($intent['metadata']['mode'] ?? null) === $this->mode() && ($intent['metadata']['scope'] ?? null) === self::SCOPE
            && in_array($intent['status'] ?? null, self::STATUSES, true);
        if ($valid && $intent['status'] === 'succeeded') {
            $valid = ($intent['amount_received'] ?? null) === $order->amount_cents
                && is_string($intent['latest_charge'] ?? null) && preg_match('/^ch_[A-Za-z0-9]{6,}$/D', $intent['latest_charge'])
                && (! $order->stripe_charge_id || $order->stripe_charge_id === $intent['latest_charge']);
        }
        if (! $valid) {
            throw new WalletPaymentException('payment_provider_invalid', 'No fue posible verificar el pago.', 502);
        }
    }

    private function applyIntent(MobileWalletRecharge $order, array $intent): void
    {
        $this->validateIntent($order, $intent);
        DB::transaction(function () use ($order, $intent) {
            $account = MobileWalletAccount::whereKey($order->wallet_account_id)->lockForUpdate()->firstOrFail();
            $locked = MobileWalletRecharge::whereKey($order->id)->lockForUpdate()->firstOrFail();
            $this->validateIntent($locked, $intent);
            // Late/duplicate snapshots may never roll a credited or canceled order backwards.
            if ($locked->status === 'succeeded' && $intent['status'] !== 'succeeded') {
                return;
            }
            if ($locked->status === 'canceled' && $intent['status'] !== 'canceled') {
                throw new WalletPaymentException('payment_provider_invalid', 'La recarga necesita revisión.', 502);
            }
            $locked->update(['stripe_payment_intent_id' => $intent['id'], 'status' => $intent['status'],
                'stripe_charge_id' => $intent['status'] === 'succeeded' ? $intent['latest_charge'] : $locked->stripe_charge_id]);
            if ($intent['status'] === 'succeeded') {
                $account->movements()->firstOrCreate(['source_key' => 'credit:'.$this->mode().':'.$intent['id']], [
                    'id' => (string) Str::uuid(), 'recharge_id' => $locked->id, 'type' => 'recharge', 'amount_cents' => $locked->amount_cents,
                ]);
            }
        });
    }

    private function reconcile(MobileWalletRecharge $order, array $intent, ?array $charge = null): void
    {
        $this->validateIntent($order, $intent);
        if ($intent['status'] === 'succeeded') {
            $charge ??= $this->stripe->request('GET', '/charges/'.$intent['latest_charge']);
            $this->validateCharge($order, $charge, $intent);
        } elseif ($charge !== null) {
            throw new WalletPaymentException('payment_provider_invalid', 'No fue posible verificar el pago.', 502);
        }
        DB::transaction(function () use ($order, $intent, $charge) {
            $this->applyIntent($order, $intent);
            if ($intent['status'] === 'succeeded') {
                $fresh = $order->fresh();
                $this->refund($fresh, $charge);
                if (($charge['disputed'] ?? false) === true) {
                    $fresh->account()->update(['blocked' => true, 'blocked_reason' => 'payment_dispute']);
                }
            }
        });
    }

    private function validateCharge(MobileWalletRecharge $order, array $charge, ?array $intent = null): void
    {
        $valid = ($charge['object'] ?? null) === 'charge' && ($charge['id'] ?? null) === ($intent['latest_charge'] ?? $order->stripe_charge_id)
            && ($charge['payment_intent'] ?? null) === ($intent['id'] ?? $order->stripe_payment_intent_id)
            && ($charge['amount'] ?? null) === $order->amount_cents && ($charge['currency'] ?? null) === 'mxn'
            && ($charge['livemode'] ?? null) === ($this->mode() === 'live')
            && ($charge['paid'] ?? null) === true && ($charge['captured'] ?? null) === true
            && is_int($charge['amount_refunded'] ?? null) && $charge['amount_refunded'] >= 0 && $charge['amount_refunded'] <= $order->amount_cents;
        if (! $valid) {
            throw new WalletPaymentException('payment_provider_invalid', 'No fue posible verificar el reembolso.', 502);
        }
    }

    private function refund(MobileWalletRecharge $order, array $charge): void
    {
        $this->validateCharge($order, $charge);
        DB::transaction(function () use ($order, $charge) {
            $account = MobileWalletAccount::whereKey($order->wallet_account_id)->lockForUpdate()->firstOrFail();
            $locked = MobileWalletRecharge::whereKey($order->id)->lockForUpdate()->firstOrFail();
            $delta = $charge['amount_refunded'] - $locked->refunded_cents;
            if ($delta <= 0) {
                return;
            }
            $account->movements()->create(['id' => (string) Str::uuid(), 'recharge_id' => $locked->id,
                'type' => 'refund', 'amount_cents' => -$delta,
                'source_key' => 'refund:'.$this->mode().':'.$charge['id'].':'.$charge['amount_refunded']]);
            $locked->update(['refunded_cents' => $charge['amount_refunded']]);
            $balance = (int) $account->movements()->select('id', 'amount_cents')->lockForUpdate()->get()->sum('amount_cents');
            if ($balance < 0) {
                $account->update(['blocked' => true, 'blocked_reason' => 'payment_review']);
            }
        });
    }

    public function webhook(Request $request): void
    {
        $this->guardTransport($request);
        $secret = (string) config('wallet-payments.webhook_secret');
        if (! $this->configured() || $secret === '') {
            throw new WalletPaymentException('payments_not_configured', 'Los pagos no están disponibles.');
        }
        $raw = $request->getContent();
        $header = (string) $request->header('Stripe-Signature');
        if (strlen($raw) > 1048576 || strlen($header) > 4096) {
            throw new WalletPaymentException('invalid_webhook', 'Aviso no válido.', 400);
        }
        $timestamps = [];
        $signatures = [];
        foreach (explode(',', $header) as $part) {
            [$key, $value] = array_pad(explode('=', trim($part), 2), 2, '');
            if ($key === 't' && preg_match('/^[0-9]{10}$/D', $value)) {
                $timestamps[] = $value;
            }
            if ($key === 'v1' && preg_match('/^[a-f0-9]{64}$/D', $value)) {
                $signatures[] = $value;
            }
        }
        $valid = false;
        if (count($timestamps) === 1 && abs(time() - (int) $timestamps[0]) <= 300) {
            $expected = hash_hmac('sha256', $timestamps[0].'.'.$raw, $secret);
            foreach ($signatures as $signature) {
                $valid = hash_equals($expected, $signature) || $valid;
            }
        }
        if (! $valid) {
            throw new WalletPaymentException('invalid_webhook_signature', 'Firma de aviso no válida.', 400);
        }
        $event = json_decode($raw, true);
        if (! is_array($event) || ! is_string($event['id'] ?? null) || strlen($event['id']) > 100 || ! preg_match('/^evt_[A-Za-z0-9]{6,}$/D', $event['id'])
            || ($event['object'] ?? null) !== 'event' || ($event['livemode'] ?? null) !== ($this->mode() === 'live')
            || ! empty($event['account'])
            || ! is_string($event['type'] ?? null) || strlen($event['type']) > 100) {
            throw new WalletPaymentException('invalid_webhook', 'Aviso no válido.', 400);
        }
        $receipt = MobileWalletWebhookEvent::firstOrCreate(['mode' => $this->mode(), 'event_id' => $event['id']], ['event_type' => $event['type']]);
        if ($receipt->processed_at) {
            return;
        }
        $type = $event['type'];
        $object = $event['data']['object'] ?? [];
        if (! is_array($object)) {
            throw new WalletPaymentException('invalid_webhook', 'Aviso no válido.', 400);
        }
        $paymentEvent = in_array($type, ['payment_intent.succeeded', 'payment_intent.processing', 'payment_intent.payment_failed', 'payment_intent.canceled'], true);
        $chargeEvent = $type === 'charge.refunded';
        $disputeEvent = in_array($type, ['charge.dispute.created', 'charge.dispute.closed'], true);
        $refundEvent = in_array($type, ['refund.failed', 'refund.updated'], true);
        if ($refundEvent && ($object['object'] ?? null) !== 'refund') {
            throw new WalletPaymentException('invalid_webhook', 'Aviso no válido.', 400);
        }
        $refundFailureEvent = $refundEvent && ($type === 'refund.failed' || in_array($object['status'] ?? null, ['failed', 'canceled'], true));
        if ($paymentEvent || $chargeEvent || $disputeEvent || $refundFailureEvent) {
            $objectType = $paymentEvent ? 'payment_intent' : ($chargeEvent ? 'charge' : ($disputeEvent ? 'dispute' : 'refund'));
            if (($object['object'] ?? null) !== $objectType) {
                throw new WalletPaymentException('invalid_webhook', 'Aviso no válido.', 400);
            }
            $this->operational();
            $charge = null;
            if ($disputeEvent || $refundFailureEvent) {
                $chargeId = $object['charge'] ?? null;
                if (! is_string($chargeId) || ! preg_match('/^ch_[A-Za-z0-9]{6,}$/D', $chargeId)) {
                    throw new WalletPaymentException('invalid_webhook', 'Aviso no válido.', 400);
                }
                $charge = $this->stripe->request('GET', '/charges/'.$chargeId);
                $intentId = $charge['payment_intent'] ?? null;
            } elseif ($chargeEvent) {
                $chargeId = $object['id'] ?? null;
                if (! is_string($chargeId) || ! preg_match('/^ch_[A-Za-z0-9]{6,}$/D', $chargeId)) {
                    throw new WalletPaymentException('invalid_webhook', 'Aviso no válido.', 400);
                }
                $charge = $this->stripe->request('GET', '/charges/'.$chargeId);
                $intentId = $charge['payment_intent'] ?? null;
            } else {
                $intentId = $object['id'] ?? null;
            }
            if (! is_string($intentId) || ! preg_match('/^pi_[A-Za-z0-9]{6,}$/D', $intentId)) {
                throw new WalletPaymentException('invalid_webhook', 'Aviso no válido.', 400);
            }
            $order = MobileWalletRecharge::where('stripe_payment_intent_id', $intentId)->whereHas('account', fn ($query) => $query->where('mode', $this->mode()))->first();
            if (! $order && $paymentEvent) {
                $candidateId = $object['metadata']['klini_wallet_order_id'] ?? null;
                if (is_string($candidateId) && Str::isUuid($candidateId)) {
                    $order = MobileWalletRecharge::whereKey($candidateId)->whereHas('account', fn ($query) => $query->where('mode', $this->mode()))->first();
                }
            }
            if ($order) {
                $intent = $this->stripe->request('GET', '/payment_intents/'.$intentId);
                $this->reconcile($order, $intent, $charge);
                $order = $order->fresh();
                if ($disputeEvent) {
                    $this->validateCharge($order, $charge);
                    // Both opened and closed disputes require a deliberate manual resolution.
                    DB::transaction(function () use ($order) {
                        $account = MobileWalletAccount::whereKey($order->wallet_account_id)->lockForUpdate()->firstOrFail();
                        $account->update(['blocked' => true, 'blocked_reason' => 'payment_dispute']);
                    });
                }
                if ($refundFailureEvent) {
                    $this->validateCharge($order, $charge);
                    DB::transaction(function () use ($order) {
                        $account = MobileWalletAccount::whereKey($order->wallet_account_id)->lockForUpdate()->firstOrFail();
                        $account->update(['blocked' => true, 'blocked_reason' => 'payment_review']);
                    });
                }
            }
        }
        $receipt->update(['processed_at' => now()]);
    }
}
