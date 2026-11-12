<?php

namespace App\Services\Wallet;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

final class StripeWalletGateway
{
    public function request(string $method, string $path, array $parameters = [], ?string $idempotencyKey = null): array
    {
        // The destination is never supplied by clients or mutable account metadata.
        if (! preg_match('#^/(account|balance|payment_intents(?:/pi_[A-Za-z0-9]+(?:/cancel)?)?|charges/ch_[A-Za-z0-9]+)$#D', $path)) {
            throw new WalletPaymentException('payment_provider_invalid', 'No fue posible verificar el pago.', 502);
        }
        $http = Http::withToken((string) config('wallet-payments.secret_key'))
            ->acceptJson()->asForm()->connectTimeout(5)->timeout(15)->withoutRedirecting()
            ->withHeaders(['Stripe-Version' => config('wallet-payments.api_version')]);
        if ($idempotencyKey !== null) {
            $http = $http->withHeaders(['Idempotency-Key' => $idempotencyKey]);
        }
        try {
            $response = $method === 'GET'
                ? $http->get('https://api.stripe.com/v1'.$path, $parameters)
                : $http->post('https://api.stripe.com/v1'.$path, $parameters);
        } catch (ConnectionException) {
            // Retain the local order. Retrying its stable key is the recovery path.
            throw new WalletPaymentException('payment_provider_unavailable', 'No pudimos consultar el pago. Intenta nuevamente.');
        }
        if (! $response->successful()) {
            throw new WalletPaymentException('payment_provider_unavailable', 'No pudimos verificar el pago. Intenta nuevamente.');
        }
        $data = $response->json();
        if (! is_array($data)) {
            throw new WalletPaymentException('payment_provider_invalid', 'No fue posible verificar el pago.', 502);
        }

        return $data;
    }
}
