<?php

namespace App\Http\Controllers\Api\Mobile\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Wallet\MobileWalletConsultationService;
use App\Services\Wallet\MobileWalletService;
use App\Services\Wallet\WalletPaymentException;
use App\Support\MobileApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

final class WalletController extends Controller
{
    public function __construct(private readonly MobileWalletService $wallet, private readonly MobileWalletConsultationService $consultations) {}

    private function patient(Request $request): User
    {
        $this->wallet->guardTransport($request);
        $user = $request->user();
        abort_unless($request->bearerToken() && $user?->currentAccessToken() instanceof PersonalAccessToken, 403);
        abort_unless($user->patient()->where('status', 'active')->exists(), 403);
        abort_if($this->wallet->mode() === 'live' && $user->is_demo, 403);

        return $user;
    }

    private function respond(callable $operation): JsonResponse
    {
        try {
            return MobileApiResponse::success($operation());
        } catch (WalletPaymentException $exception) {
            return MobileApiResponse::error($exception->errorCode, $exception->getMessage(), $exception->httpStatus);
        }
    }

    public function show(Request $request): JsonResponse
    {
        return $this->respond(fn () => $this->wallet->snapshot($this->patient($request)));
    }

    public function consultations(Request $request): JsonResponse
    {
        return $this->respond(fn () => $this->consultations->consultations($this->patient($request)));
    }

    public function quote(Request $request, int $appointment): JsonResponse
    {
        return $this->respond(function () use ($request, $appointment) {
            $user = $this->patient($request);
            abort_if($request->all() !== [], 422);

            return $this->consultations->quote($user, $appointment);
        });
    }

    public function payConsultation(Request $request): JsonResponse
    {
        return $this->respond(function () use ($request) {
            $user = $this->patient($request);
            abort_if(array_diff(array_keys($request->all()), ['quote_id', 'client_request_id']) !== [], 422);
            $data = $request->validate(['quote_id' => 'required|uuid', 'client_request_id' => 'required|uuid']);

            return $this->consultations->pay($user, $data['quote_id'], $data['client_request_id']);
        });
    }

    public function store(Request $request): JsonResponse
    {
        return $this->respond(function () use ($request) {
            $user = $this->patient($request);
            abort_if(array_diff(array_keys($request->all()), ['amount_cents', 'client_request_id']) !== [], 422);
            $data = $request->validate(['amount_cents' => ['required', 'integer', 'min:'.MobileWalletService::MIN_AMOUNT, 'max:'.MobileWalletService::MAX_AMOUNT], 'client_request_id' => 'required|uuid']);
            // JSON integers only: never silently round a decimal/string money value.
            abort_unless(is_int($data['amount_cents']), 422);

            return $this->wallet->create($user, $data['amount_cents'], $data['client_request_id']);
        });
    }

    public function recharge(Request $request, string $recharge): JsonResponse
    {
        return $this->respond(fn () => $this->wallet->read($this->patient($request), $recharge));
    }

    public function refresh(Request $request, string $recharge): JsonResponse
    {
        return $this->respond(fn () => $this->wallet->refresh($this->patient($request), $recharge));
    }

    public function resume(Request $request, string $recharge): JsonResponse
    {
        return $this->respond(fn () => $this->wallet->refresh($this->patient($request), $recharge, true));
    }

    public function cancel(Request $request, string $recharge): JsonResponse
    {
        return $this->respond(fn () => $this->wallet->cancel($this->patient($request), $recharge));
    }

    public function webhook(Request $request): JsonResponse
    {
        return $this->respond(function () use ($request) {
            $this->wallet->webhook($request);

            return ['received' => true];
        });
    }
}
