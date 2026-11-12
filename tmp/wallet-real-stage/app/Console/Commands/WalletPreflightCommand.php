<?php

namespace App\Console\Commands;

use App\Services\Wallet\MobileWalletService;
use App\Services\Wallet\StripeWalletGateway;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use Throwable;

final class WalletPreflightCommand extends Command
{
    protected $signature = 'wallet:preflight {--provider : Verify account and mode with read-only Stripe GET requests}';

    protected $description = 'Read-only wallet activation checks; never changes flags, schema or funds';

    public function handle(MobileWalletService $wallet, StripeWalletGateway $stripe): int
    {
        try {
            $configuration = $wallet->preflightConfiguration();
        } catch (Throwable) {
            $this->error('wallet_preflight: configuration_invalid');

            return self::FAILURE;
        }
        $url = parse_url((string) config('app.url'));
        $checks = [
            'production_domain' => is_array($url) && ($url['scheme'] ?? '') === 'https' && ($url['host'] ?? '') === 'klini.us'
                && ! isset($url['user']) && ! isset($url['pass']) && ! isset($url['query']) && ! isset($url['fragment'])
                && in_array($url['path'] ?? '', ['', '/'], true) && ! isset($url['port']),
            'credentials_binding' => $configuration['credentials_binding_ready'],
            'collection_enabled' => config('wallet-payments.enabled') === true,
            'live_enabled' => config('wallet-payments.live_enabled') === true,
            'service_redemption_enabled' => config('wallet-payments.service_redemption_enabled') === true,
            'production_mode' => $configuration['mode'] === 'live',
        ];
        try {
            $checks['sql_tables'] = collect(['mobile_wallet_accounts', 'mobile_wallet_recharges', 'mobile_wallet_movements', 'mobile_wallet_webhook_events'])
                ->every(fn (string $table) => Schema::hasTable($table));
        } catch (Throwable) {
            $checks['sql_tables'] = false;
        }
        if ($this->option('provider')) {
            $checks['provider_account_and_mode'] = false;
            if ($configuration['credentials_binding_ready'] && preg_match('/^acct_[A-Za-z0-9]{6,}$/D', (string) config('wallet-payments.account_id'))) {
                try {
                    $account = $stripe->request('GET', '/account');
                    $balance = $stripe->request('GET', '/balance');
                    $checks['provider_account_and_mode'] = ($account['id'] ?? null) === config('wallet-payments.account_id')
                        && ($account['country'] ?? null) === 'MX' && ($account['charges_enabled'] ?? null) === true
                        && ($balance['livemode'] ?? null) === ($configuration['mode'] === 'live');
                } catch (Throwable) {
                    // Deliberately omit request/response details, identifiers and credentials.
                }
            }
        } else {
            $this->line('provider_check: not_run (use --provider for read-only verification)');
        }
        foreach ($checks as $name => $ready) {
            $this->line($name.': '.($ready ? 'ready' : 'not_ready'));
        }
        $ready = ! in_array(false, $checks, true) && $this->option('provider');
        $this->line('wallet_preflight: '.($ready ? 'ready_for_deployment_review' : 'not_ready_for_live'));
        $this->line('No schema, flags, credentials, bookings or funds were changed. Redemption implementation must be reviewed separately.');

        return $ready ? self::SUCCESS : self::FAILURE;
    }
}
