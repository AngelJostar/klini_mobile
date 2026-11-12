<?php

namespace Tests\Feature\Api\Mobile;

use App\Models\MobileWalletAccount;
use App\Models\MobileWalletMovement;
use App\Models\MobileWalletRecharge;
use App\Models\MobileWalletWebhookEvent;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request as StripeRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class MobileWalletPaymentTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = '/api/mobile/v1/patient/wallet';

    private const WEBHOOK = '/api/integrations/stripe/wallet';

    private array $intents = [];

    private array $charges = [];

    private array $intentKeys = [];

    private array $createAttempts = [];

    private int $creationTimeouts = 0;

    private array $stripeAccount = ['object' => 'account', 'id' => 'acct_WalletFixture123', 'country' => 'MX', 'charges_enabled' => true];

    private bool $stripeBalanceLive = true;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('wallet-payments', [
            'enabled' => true, 'live_enabled' => false, 'service_redemption_enabled' => false, 'mode' => 'test',
            'secret_key' => 'sk_test_'.str_repeat('S', 24), 'publishable_key' => 'pk_test_'.str_repeat('P', 24),
            'webhook_secret' => 'whsec_'.str_repeat('W', 24), 'account_id' => 'acct_WalletFixture123',
            'merchant_identifier' => 'merchant.mx.klini', 'api_version' => '2026-10-28.endive',
        ]);
        Http::preventStrayRequests();
        Http::fake(function (StripeRequest $request) {
            $this->assertStringStartsWith('https://api.stripe.com/v1/', $request->url());
            $path = parse_url($request->url(), PHP_URL_PATH);
            if ($request->method() === 'GET' && $path === '/v1/account') {
                return Http::response($this->stripeAccount);
            }
            if ($request->method() === 'GET' && $path === '/v1/balance') {
                return Http::response(['object' => 'balance', 'livemode' => $this->stripeBalanceLive, 'available' => [], 'pending' => []]);
            }
            if ($request->method() === 'POST' && $path === '/v1/payment_intents') {
                $key = $request->header('Idempotency-Key')[0] ?? '';
                $this->createAttempts[] = $key;
                if (! isset($this->intentKeys[$key])) {
                    $id = 'pi_WalletFixture'.str_pad((string) (count($this->intents) + 1), 12, '0', STR_PAD_LEFT);
                    $body = $request->data();
                    $this->intentKeys[$key] = $id;
                    $this->intents[$id] = [
                        'id' => $id, 'object' => 'payment_intent', 'amount' => (int) $body['amount'], 'amount_received' => 0,
                        'currency' => $body['currency'], 'livemode' => config('wallet-payments.mode') === 'live',
                        'capture_method' => $body['capture_method'], 'payment_method_types' => $body['payment_method_types'],
                        'status' => 'requires_payment_method', 'metadata' => $body['metadata'], 'latest_charge' => null,
                        'client_secret' => $id.'_secret_'.str_repeat('C', 24),
                    ];
                }
                if ($this->creationTimeouts > 0) {
                    $this->creationTimeouts--;
                    throw new ConnectionException('Simulated ambiguous provider timeout.');
                }

                return Http::response($this->intents[$this->intentKeys[$key]]);
            }
            if (preg_match('#^/v1/payment_intents/(pi_[A-Za-z0-9]+)(/cancel)?$#D', $path, $matches)) {
                $id = $matches[1];
                if (! isset($this->intents[$id])) {
                    return Http::response(['error' => ['code' => 'resource_missing']], 404);
                }
                if (($matches[2] ?? '') === '/cancel' && $request->method() === 'POST') {
                    if (in_array($this->intents[$id]['status'], ['succeeded', 'processing'], true)) {
                        return Http::response(['error' => ['code' => 'payment_intent_unexpected_state']], 400);
                    }
                    $this->intents[$id]['status'] = 'canceled';
                }

                return Http::response($this->intents[$id]);
            }
            if ($request->method() === 'GET' && preg_match('#^/v1/charges/(ch_[A-Za-z0-9]+)$#D', $path, $matches)) {
                return Http::response($this->charges[$matches[1]] ?? ['error' => ['code' => 'resource_missing']], isset($this->charges[$matches[1]]) ? 200 : 404);
            }
            $this->fail('Unexpected Stripe request: '.$request->method().' '.$path);
        });
    }

    private function patient(array $userChanges = [], bool $withProfile = true, string $profileStatus = 'active'): User
    {
        $id = (string) Str::uuid();
        $user = User::create(array_replace([
            'name' => 'Paciente wallet de prueba', 'username' => $id, 'email' => $id.'@test.local',
            'role' => 'patient', 'module' => 'patient', 'status' => 'active', 'is_demo' => false,
        ], $userChanges));
        if ($withProfile) {
            Patient::create(['user_id' => $user->id, 'full_name' => $user->name, 'status' => $profileStatus]);
        }

        return $user;
    }

    private function authorize(User $user, array $abilities = ['mobile:access'], bool $expired = false): void
    {
        Auth::forgetGuards();
        $token = $user->createToken('wallet-test-fixture', $abilities, $expired ? now()->subMinute() : now()->addHour());
        $this->withToken($token->plainTextToken);
    }

    private function createRecharge(User $user, int $amount = 10000, ?string $clientId = null, bool $live = false): array
    {
        $this->authorize($user);
        $response = $this->postJson(($live ? 'https://klini.test' : '').self::BASE.'/recharges', [
            'amount_cents' => $amount, 'client_request_id' => $clientId ?? (string) Str::uuid(),
        ])->assertSuccessful()->assertJsonPath('success', true);

        return $response->json('data');
    }

    private function succeed(string $intentId): void
    {
        $chargeId = 'ch_WalletFixture'.substr($intentId, -12);
        $this->intents[$intentId]['status'] = 'succeeded';
        $this->intents[$intentId]['amount_received'] = $this->intents[$intentId]['amount'];
        $this->intents[$intentId]['latest_charge'] = $chargeId;
        $this->charges[$chargeId] = [
            'id' => $chargeId, 'object' => 'charge', 'payment_intent' => $intentId,
            'amount' => $this->intents[$intentId]['amount'], 'currency' => 'mxn',
            'livemode' => $this->intents[$intentId]['livemode'], 'paid' => true, 'captured' => true,
            'amount_refunded' => 0, 'refunded' => false, 'disputed' => false,
        ];
    }

    private function event(string $id, string $type, array $object, ?bool $live = null): array
    {
        return ['id' => $id, 'object' => 'event', 'type' => $type, 'created' => time(),
            'livemode' => $live ?? (bool) ($object['livemode'] ?? false), 'data' => ['object' => $object]];
    }

    private function webhook(array $event, ?int $timestamp = null, ?string $signature = null)
    {
        $raw = json_encode($event, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $timestamp ??= time();
        $signature ??= hash_hmac('sha256', $timestamp.'.'.$raw, config('wallet-payments.webhook_secret'));
        Auth::forgetGuards();

        return $this->call('POST', (config('wallet-payments.mode') === 'live' ? 'https://klini.test' : '').self::WEBHOOK, [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json', 'HTTP_AUTHORIZATION' => '',
            'HTTP_STRIPE_SIGNATURE' => 't='.$timestamp.',v1='.$signature,
        ], $raw);
    }

    private function liveConfiguration(): void
    {
        config()->set([
            'wallet-payments.mode' => 'live', 'wallet-payments.live_enabled' => true,
            'wallet-payments.service_redemption_enabled' => true,
            'wallet-payments.secret_key' => 'sk_live_'.str_repeat('S', 24),
            'wallet-payments.publishable_key' => 'pk_live_'.str_repeat('P', 24),
        ]);
    }

    public function test_disabled_wallet_returns_zero_without_provider_access_and_rejects_creating_funds(): void
    {
        config()->set('wallet-payments.enabled', false);
        $this->authorize($this->patient());
        $this->getJson(self::BASE)->assertOk()->assertJsonPath('data.mode', 'test')
            ->assertJsonPath('data.balance_cents', 0)->assertJsonPath('data.payment_config.enabled', false)
            ->assertJsonCount(0, 'data.movements');
        $this->postJson(self::BASE.'/recharges', ['amount_cents' => 5000, 'client_request_id' => (string) Str::uuid()])->assertStatus(503);
        $this->assertDatabaseCount('mobile_wallet_recharges', 0);
        Http::assertNothingSent();
    }

    public function test_all_private_operations_reject_missing_or_expired_bearer_tokens(): void
    {
        $id = (string) Str::uuid();
        $this->getJson(self::BASE)->assertUnauthorized();
        $this->getJson(self::BASE.'/recharges/'.$id)->assertUnauthorized();
        foreach (['recharges', 'recharges/'.$id.'/refresh', 'recharges/'.$id.'/resume', 'recharges/'.$id.'/cancel'] as $path) {
            $this->postJson(self::BASE.'/'.$path, ['amount_cents' => 5000, 'client_request_id' => (string) Str::uuid()])->assertUnauthorized();
        }
        $this->authorize($this->patient(), ['mobile:access'], true);
        $this->getJson(self::BASE)->assertUnauthorized();
        Http::assertNothingSent();
    }

    public function test_session_only_authentication_and_bearer_without_mobile_ability_are_rejected(): void
    {
        $patient = $this->patient();
        $response = $this->actingAs($patient)->getJson(self::BASE);
        $this->assertContains($response->getStatusCode(), [401, 403]);
        Auth::forgetGuards();
        $this->app['auth']->guard('web')->logout();
        $this->authorize($patient, ['unrelated:read']);
        $this->getJson(self::BASE)->assertForbidden();
        Http::assertNothingSent();
    }

    public function test_non_patient_roles_inactive_accounts_and_unavailable_profiles_are_denied(): void
    {
        foreach (['doctor', 'provider', 'admin', 'superadmin'] as $role) {
            $this->authorize($this->patient(['role' => $role]));
            $this->getJson(self::BASE)->assertForbidden();
        }
        foreach ([[$this->patient(['status' => 'inactive'])], [$this->patient([], false)], [$this->patient([], true, 'inactive')]] as [$user]) {
            $this->authorize($user);
            $this->getJson(self::BASE)->assertForbidden();
        }
        Http::assertNothingSent();
    }

    public function test_recharge_validates_amount_bounds_integer_and_client_uuid_before_stripe(): void
    {
        $this->authorize($this->patient());
        foreach ([0, -1, 4999, 1000001, 5000.25] as $amount) {
            $this->postJson(self::BASE.'/recharges', ['amount_cents' => $amount, 'client_request_id' => (string) Str::uuid()])->assertUnprocessable();
        }
        $this->postJson(self::BASE.'/recharges', ['amount_cents' => 5000, 'client_request_id' => 'invalid'])->assertUnprocessable();
        $this->assertDatabaseCount('mobile_wallet_recharges', 0);
        Http::assertNothingSent();
    }

    public function test_minimum_and_maximum_recharge_amounts_are_accepted_in_cents(): void
    {
        foreach ([5000, 1000000] as $amount) {
            $data = $this->createRecharge($this->patient(), $amount);
            $this->assertSame($amount, $data['recharge']['amount_cents']);
        }
        $this->assertDatabaseCount('mobile_wallet_recharges', 2);
        $this->assertDatabaseCount('mobile_wallet_movements', 0);
    }

    public function test_create_sends_server_owned_stripe_contract_and_does_not_credit_unpaid_order(): void
    {
        $data = $this->createRecharge($this->patient());
        $id = $data['recharge']['id'];
        $this->assertTrue(Str::isUuid($id));
        $this->assertSame('requires_payment_method', $data['recharge']['status']);
        $this->assertSame('test', $data['recharge']['mode']);
        $this->assertSame('MXN', $data['recharge']['currency']);
        $this->assertSame('health_services', $data['recharge']['scope']);
        $this->assertSame($data['payment_intent_id'].'_secret_'.str_repeat('C', 24), $data['client_secret']);
        Http::assertSent(fn (StripeRequest $request) => $request->method() === 'POST'
            && $request->url() === 'https://api.stripe.com/v1/payment_intents'
            && $request->hasHeader('Idempotency-Key', 'klini-wallet:test:'.$id)
            && (int) $request['amount'] === 10000 && $request['currency'] === 'mxn'
            && $request['capture_method'] === 'automatic' && $request['payment_method_types'] === ['card']
            && $request['metadata'] === ['klini_wallet_order_id' => $id, 'mode' => 'test', 'scope' => 'health_services']);
        $this->getJson(self::BASE)->assertOk()->assertJsonPath('data.balance_cents', 0)->assertJsonCount(1, 'data.pending_recharges');
        $this->assertDatabaseCount('mobile_wallet_movements', 0);
        $this->assertStringNotContainsString($data['client_secret'], json_encode(MobileWalletRecharge::firstOrFail()->getAttributes()));
    }

    public function test_read_only_recharge_get_neither_calls_stripe_exposes_secret_nor_changes_balance(): void
    {
        $data = $this->createRecharge($this->patient());
        $this->succeed($data['payment_intent_id']);
        $before = MobileWalletRecharge::findOrFail($data['recharge']['id'])->getRawOriginal();
        $requests = count(Http::recorded());
        $this->getJson(self::BASE.'/recharges/'.$data['recharge']['id'])->assertOk()
            ->assertJsonPath('data.client_secret', null)->assertJsonPath('data.recharge.status', 'requires_payment_method');
        $this->assertSame($requests, count(Http::recorded()));
        $this->assertSame($before, MobileWalletRecharge::findOrFail($data['recharge']['id'])->getRawOriginal());
        $this->assertDatabaseCount('mobile_wallet_movements', 0);
    }

    public function test_same_client_request_reuses_order_and_stripe_intent_without_duplicate_creation(): void
    {
        $patient = $this->patient();
        $key = (string) Str::uuid();
        $first = $this->createRecharge($patient, 10000, $key);
        $second = $this->createRecharge($patient, 10000, $key);
        $this->assertSame($first['recharge']['id'], $second['recharge']['id']);
        $this->assertSame($first['payment_intent_id'], $second['payment_intent_id']);
        $this->assertCount(1, $this->createAttempts);
        $this->assertDatabaseCount('mobile_wallet_recharges', 1);
        $this->assertDatabaseCount('mobile_wallet_movements', 0);
    }

    public function test_changed_amount_or_second_pending_key_conflicts_without_provider_side_effect(): void
    {
        $patient = $this->patient();
        $key = (string) Str::uuid();
        $this->createRecharge($patient, 10000, $key);
        $requests = count(Http::recorded());
        foreach ([['amount_cents' => 20000, 'client_request_id' => $key], ['amount_cents' => 10000, 'client_request_id' => (string) Str::uuid()]] as $body) {
            $this->postJson(self::BASE.'/recharges', $body)->assertConflict();
        }
        $this->assertSame($requests, count(Http::recorded()));
        $this->assertDatabaseCount('mobile_wallet_recharges', 1);
        $this->assertSame(10000, MobileWalletRecharge::firstOrFail()->amount_cents);
    }

    public function test_other_owner_cannot_read_refresh_resume_or_cancel_an_order(): void
    {
        $data = $this->createRecharge($this->patient());
        $id = $data['recharge']['id'];
        $before = MobileWalletRecharge::findOrFail($id)->getRawOriginal();
        $requests = count(Http::recorded());
        $this->authorize($this->patient());
        $this->getJson(self::BASE.'/recharges/'.$id)->assertNotFound();
        foreach (['refresh', 'resume', 'cancel'] as $action) {
            $this->postJson(self::BASE.'/recharges/'.$id.'/'.$action)->assertNotFound();
        }
        $this->assertSame($requests, count(Http::recorded()));
        $this->assertSame($before, MobileWalletRecharge::findOrFail($id)->getRawOriginal());
        $this->assertDatabaseCount('mobile_wallet_movements', 0);
    }

    public function test_client_payment_claims_never_credit_a_provider_unpaid_order(): void
    {
        $data = $this->createRecharge($this->patient());
        $this->postJson(self::BASE.'/recharges/'.$data['recharge']['id'].'/refresh', [
            'status' => 'succeeded', 'amount_received' => 10000, 'payment_intent_id' => 'pi_ForgedFixture123',
            'balance_cents' => 10000, 'wallet_account_id' => 999999,
        ])->assertOk()->assertJsonPath('data.recharge.status', 'requires_payment_method')->assertJsonPath('data.client_secret', null);
        $this->assertDatabaseCount('mobile_wallet_movements', 0);
        $this->assertSame($data['payment_intent_id'], MobileWalletRecharge::firstOrFail()->stripe_payment_intent_id);
    }

    public function test_verified_success_credits_once_and_late_pending_snapshots_do_not_roll_it_back(): void
    {
        $data = $this->createRecharge($this->patient());
        $id = $data['recharge']['id'];
        $pi = $data['payment_intent_id'];
        $this->succeed($pi);
        foreach ([1, 2] as $attempt) {
            $this->postJson(self::BASE.'/recharges/'.$id.'/refresh')->assertOk()
                ->assertJsonPath('data.recharge.status', 'succeeded')->assertJsonPath('data.client_secret', null)
                ->assertJsonPath('data.wallet.balance_cents', 10000);
        }
        $this->intents[$pi]['status'] = 'processing';
        $this->postJson(self::BASE.'/recharges/'.$id.'/refresh')->assertOk()->assertJsonPath('data.recharge.status', 'succeeded');
        $this->getJson(self::BASE)->assertOk()->assertJsonPath('data.balance_cents', 10000)->assertJsonCount(0, 'data.pending_recharges');
        $this->assertDatabaseCount('mobile_wallet_movements', 1);
        $movement = MobileWalletMovement::firstOrFail();
        $this->assertSame('recharge', $movement->type);
        $this->assertSame(10000, $movement->amount_cents);
        $this->assertSame($id, $movement->recharge_id);
    }

    public function test_incongruent_payment_intents_or_charges_cannot_create_a_credit(): void
    {
        foreach ([
            ['amount', 9999], ['amount_received', 9999], ['livemode', true],
            ['metadata.klini_wallet_order_id', (string) Str::uuid()], ['metadata.mode', 'live'],
            ['metadata.scope', 'digital_services'],
        ] as [$field, $value]) {
            $data = $this->createRecharge($this->patient());
            $this->succeed($data['payment_intent_id']);
            data_set($this->intents[$data['payment_intent_id']], $field, $value);
            $this->postJson(self::BASE.'/recharges/'.$data['recharge']['id'].'/refresh')->assertStatus(502);
        }
        foreach ([['amount', 9999], ['paid', false]] as [$field, $value]) {
            $data = $this->createRecharge($this->patient());
            $this->succeed($data['payment_intent_id']);
            $charge = $this->intents[$data['payment_intent_id']]['latest_charge'];
            $this->charges[$charge][$field] = $value;
            $this->postJson(self::BASE.'/recharges/'.$data['recharge']['id'].'/refresh')->assertStatus(502);
        }
        $this->assertDatabaseCount('mobile_wallet_movements', 0);
    }

    public function test_ambiguous_creation_recovers_same_key_and_expired_unknown_orders_require_review(): void
    {
        $patient = $this->patient();
        $this->authorize($patient);
        $key = (string) Str::uuid();
        $this->creationTimeouts = 1;
        $this->postJson(self::BASE.'/recharges', ['amount_cents' => 10000, 'client_request_id' => $key])->assertStatus(503);
        $order = MobileWalletRecharge::firstOrFail();
        $this->assertNull($order->stripe_payment_intent_id);
        $this->postJson(self::BASE.'/recharges/'.$order->id.'/cancel')->assertConflict();
        $this->getJson(self::BASE.'/recharges/'.$order->id)->assertOk()->assertJsonPath('data.client_secret', null);
        $this->postJson(self::BASE.'/recharges/'.$order->id.'/resume')->assertOk()
            ->assertJsonPath('data.recharge.id', $order->id)->assertJsonPath('data.recharge.status', 'requires_payment_method');
        $this->assertSame(['klini-wallet:test:'.$order->id, 'klini-wallet:test:'.$order->id], $this->createAttempts);
        $this->assertCount(1, $this->intents);
        $this->assertDatabaseCount('mobile_wallet_recharges', 1);

        $this->authorize($this->patient());
        $this->creationTimeouts = 1;
        $this->postJson(self::BASE.'/recharges', ['amount_cents' => 5000, 'client_request_id' => (string) Str::uuid()])->assertStatus(503);
        $expired = MobileWalletRecharge::whereNull('stripe_payment_intent_id')->firstOrFail();
        $expired->update(['creation_started_at' => now()->subHours(24)]);
        $attempts = count($this->createAttempts);
        $this->postJson(self::BASE.'/recharges/'.$expired->id.'/resume')->assertConflict();
        $this->assertSame($attempts, count($this->createAttempts));
        $this->assertDatabaseCount('mobile_wallet_movements', 0);
    }

    public function test_resume_only_exposes_secret_for_server_verified_payable_state(): void
    {
        $data = $this->createRecharge($this->patient());
        $url = self::BASE.'/recharges/'.$data['recharge']['id'].'/resume';
        $this->postJson($url)->assertOk()->assertJsonPath('data.client_secret', $data['client_secret']);
        $this->intents[$data['payment_intent_id']]['status'] = 'processing';
        $this->postJson($url)->assertOk()->assertJsonPath('data.client_secret', null);
        $this->succeed($data['payment_intent_id']);
        $this->postJson($url)->assertOk()->assertJsonPath('data.client_secret', null)->assertJsonPath('data.wallet.balance_cents', 10000);
        $this->assertCount(1, $this->createAttempts);
        $this->assertDatabaseCount('mobile_wallet_movements', 1);
    }

    public function test_cancel_distinguishes_payable_processing_and_already_paid_orders(): void
    {
        foreach (['requires_payment_method', 'processing', 'succeeded'] as $status) {
            $data = $this->createRecharge($this->patient());
            $pi = $data['payment_intent_id'];
            $this->intents[$pi]['status'] = $status;
            if ($status === 'succeeded') {
                $this->succeed($pi);
            }
            $response = $this->postJson(self::BASE.'/recharges/'.$data['recharge']['id'].'/cancel')->assertOk()->assertJsonPath('data.client_secret', null);
            $response->assertJsonPath('data.recharge.status', $status === 'requires_payment_method' ? 'canceled' : $status);
            if ($status === 'succeeded') {
                $response->assertJsonPath('data.wallet.balance_cents', 10000);
            }
        }
        $cancels = Http::recorded()->filter(fn ($pair) => $pair[0]->method() === 'POST' && str_ends_with($pair[0]->url(), '/cancel'));
        $this->assertCount(1, $cancels);
        $this->assertDatabaseCount('mobile_wallet_movements', 1);
    }

    public function test_webhook_rejects_bad_expired_future_or_connected_account_signatures_without_credit(): void
    {
        $data = $this->createRecharge($this->patient());
        $event = $this->event('evt_BadSignatureFixture123', 'payment_intent.succeeded', $this->intents[$data['payment_intent_id']]);
        $requests = count(Http::recorded());
        $this->webhook($event, null, str_repeat('0', 64))->assertStatus(400);
        $this->webhook($event, time() - 360)->assertStatus(400);
        $this->webhook($event, time() + 360)->assertStatus(400);
        $event['account'] = 'acct_UnrelatedFixture123';
        $this->webhook($event)->assertStatus(400);
        $this->assertSame($requests, count(Http::recorded()));
        $this->assertDatabaseCount('mobile_wallet_webhook_events', 0);
        $this->assertDatabaseCount('mobile_wallet_movements', 0);
    }

    public function test_signed_webhooks_use_provider_truth_and_repeated_events_never_duplicate_credit(): void
    {
        $data = $this->createRecharge($this->patient());
        $pi = $data['payment_intent_id'];
        $claimed = $this->intents[$pi];
        $claimed['status'] = 'succeeded';
        $claimed['amount_received'] = 10000;
        $this->webhook($this->event('evt_ClaimedFixture123', 'payment_intent.succeeded', $claimed))->assertOk();
        $this->assertDatabaseCount('mobile_wallet_movements', 0);
        $this->succeed($pi);
        $event = $this->event('evt_SucceededFixture123', 'payment_intent.succeeded', $this->intents[$pi]);
        $this->webhook($event)->assertOk();
        $this->webhook($event)->assertOk();
        $this->webhook($this->event('evt_SucceededOtherFixture123', 'payment_intent.succeeded', $this->intents[$pi]))->assertOk();
        $this->assertDatabaseCount('mobile_wallet_movements', 1);
        $this->assertDatabaseCount('mobile_wallet_webhook_events', 3);
        $this->assertSame(10000, MobileWalletAccount::firstOrFail()->balanceCents());
        foreach (MobileWalletWebhookEvent::all() as $receipt) {
            $this->assertNotNull($receipt->processed_at);
            $this->assertArrayNotHasKey('payload', $receipt->getAttributes());
            $this->assertStringNotContainsString($data['client_secret'], json_encode($receipt->getAttributes()));
        }
    }

    public function test_refunds_apply_only_new_cumulative_delta_and_ignore_duplicate_or_older_totals(): void
    {
        $patient = $this->patient();
        $data = $this->createRecharge($patient);
        $pi = $data['payment_intent_id'];
        $this->succeed($pi);
        $this->postJson(self::BASE.'/recharges/'.$data['recharge']['id'].'/refresh')->assertOk();
        $chargeId = $this->intents[$pi]['latest_charge'];
        foreach ([[3000, 'evt_RefundFirstFixture123'], [5000, 'evt_RefundSecondFixture123'], [3000, 'evt_RefundOlderFixture123']] as [$total, $eventId]) {
            $this->charges[$chargeId]['amount_refunded'] = $total;
            $event = $this->event($eventId, 'charge.refunded', $this->charges[$chargeId]);
            $this->webhook($event)->assertOk();
            $this->webhook($event)->assertOk();
            if ($eventId === 'evt_RefundFirstFixture123') {
                $this->charges[$chargeId]['amount_refunded'] = 0;
                $this->authorize($patient);
                $this->postJson(self::BASE.'/recharges/'.$data['recharge']['id'].'/refresh')->assertOk()
                    ->assertJsonPath('data.wallet.balance_cents', 7000)->assertJsonPath('data.wallet.blocked', false);
                $this->assertSame(3000, MobileWalletRecharge::findOrFail($data['recharge']['id'])->refunded_cents);
                $this->assertDatabaseCount('mobile_wallet_movements', 2);
                $this->charges[$chargeId]['amount_refunded'] = $total;
            }
        }
        $this->assertSame(5000, MobileWalletRecharge::findOrFail($data['recharge']['id'])->refunded_cents);
        $refunds = MobileWalletMovement::where('type', 'refund')->orderBy('amount_cents')->pluck('amount_cents')->all();
        $this->assertSame([-3000, -2000], $refunds);
        $this->assertDatabaseCount('mobile_wallet_movements', 3);
        $this->authorize($patient);
        $this->getJson(self::BASE)->assertOk()->assertJsonPath('data.balance_cents', 5000)->assertJsonPath('data.blocked', false);
    }

    public function test_dispute_blocks_further_recharges_and_closed_event_never_automatically_unblocks(): void
    {
        $patient = $this->patient();
        $data = $this->createRecharge($patient);
        $pi = $data['payment_intent_id'];
        $this->succeed($pi);
        $chargeId = $this->intents[$pi]['latest_charge'];
        $this->charges[$chargeId]['disputed'] = true;
        $dispute = ['id' => 'dp_WalletFixture123', 'object' => 'dispute', 'charge' => $chargeId,
            'payment_intent' => $pi, 'amount' => 10000, 'currency' => 'mxn', 'livemode' => false, 'status' => 'needs_response'];
        $this->webhook($this->event('evt_DisputeOpenedFixture123', 'charge.dispute.created', $dispute))->assertOk();
        $this->charges[$chargeId]['disputed'] = false;
        $dispute['status'] = 'won';
        $this->webhook($this->event('evt_DisputeClosedFixture123', 'charge.dispute.closed', $dispute))->assertOk();
        $this->authorize($patient);
        $this->getJson(self::BASE)->assertOk()->assertJsonPath('data.blocked', true)
            ->assertJsonPath('data.blocked_reason', 'payment_dispute')->assertJsonPath('data.payment_config.enabled', false);
        $this->postJson(self::BASE.'/recharges', ['amount_cents' => 5000, 'client_request_id' => (string) Str::uuid()])
            ->assertConflict()->assertJsonPath('error.code', 'wallet_blocked');
        $this->assertDatabaseCount('mobile_wallet_recharges', 1);
    }

    public function test_snapshot_uses_full_signed_ledger_despite_page_limit_and_isolates_owner_and_mode(): void
    {
        $patient = $this->patient();
        $identity = ['user_id' => $patient->id, 'currency' => 'MXN', 'scope' => 'health_services'];
        $test = MobileWalletAccount::create($identity + ['mode' => 'test']);
        $live = MobileWalletAccount::create($identity + ['mode' => 'live']);
        $other = MobileWalletAccount::create(['user_id' => $this->patient()->id, 'mode' => 'test', 'currency' => 'MXN', 'scope' => 'health_services']);
        $first = null;
        for ($i = 0; $i < 101; $i++) {
            $order = $test->recharges()->create(['id' => (string) Str::uuid(), 'client_request_id' => (string) Str::uuid(), 'amount_cents' => 10000, 'status' => 'succeeded']);
            $first ??= $order;
            $test->movements()->create(['id' => (string) Str::uuid(), 'recharge_id' => $order->id,
                'type' => 'recharge', 'amount_cents' => 10000, 'source_key' => 'fixture:test:'.$order->id, 'created_at' => now()->subMinutes($i)]);
        }
        $test->movements()->create(['id' => (string) Str::uuid(), 'recharge_id' => $first->id,
            'type' => 'refund', 'amount_cents' => -5000, 'source_key' => 'fixture:refund:'.$first->id, 'created_at' => now()]);
        foreach ([[$live, 90000], [$other, 70000]] as [$account, $amount]) {
            $order = $account->recharges()->create(['id' => (string) Str::uuid(), 'client_request_id' => (string) Str::uuid(), 'amount_cents' => $amount, 'status' => 'succeeded']);
            $account->movements()->create(['id' => (string) Str::uuid(), 'recharge_id' => $order->id, 'type' => 'recharge',
                'amount_cents' => $amount, 'source_key' => 'fixture:'.$account->mode.':'.$order->id, 'created_at' => now()]);
        }
        $sharedKey = (string) Str::uuid();
        foreach ([$test, $live] as $account) {
            $account->recharges()->create(['id' => (string) Str::uuid(), 'client_request_id' => $sharedKey, 'amount_cents' => 5000, 'status' => 'creating', 'creation_started_at' => now()]);
        }
        $this->authorize($patient);
        $response = $this->getJson(self::BASE)->assertOk()->assertJsonPath('data.balance_cents', 1005000)
            ->assertJsonCount(100, 'data.movements')->assertJsonPath('data.has_more_movements', true)->assertJsonCount(1, 'data.pending_recharges');
        foreach ($response->json('data.movements') as $movement) {
            $this->assertSame('test', $movement['mode']);
        }
        $this->liveConfiguration();
        $this->getJson('https://klini.test'.self::BASE)->assertOk()->assertJsonPath('data.mode', 'live')
            ->assertJsonPath('data.balance_cents', 90000)->assertJsonCount(1, 'data.movements')
            ->assertJsonPath('data.has_more_movements', false)->assertJsonCount(1, 'data.pending_recharges');
        Http::assertNothingSent();
    }

    public function test_live_requires_opt_in_redemption_secure_transport_and_non_demo_patient(): void
    {
        $this->liveConfiguration();
        $this->authorize($this->patient());
        $body = ['amount_cents' => 5000, 'client_request_id' => (string) Str::uuid()];
        config()->set('wallet-payments.live_enabled', false);
        $this->getJson('https://klini.test'.self::BASE)->assertOk()->assertJsonPath('data.payment_config.enabled', false)
            ->assertJsonPath('data.payment_config.publishable_key', null)->assertJsonPath('data.payment_config.merchant_identifier', null);
        $this->postJson('https://klini.test'.self::BASE.'/recharges', $body)->assertStatus(503);
        config()->set(['wallet-payments.live_enabled' => true, 'wallet-payments.service_redemption_enabled' => false]);
        $this->postJson('https://klini.test'.self::BASE.'/recharges', $body)->assertStatus(503);
        config()->set('wallet-payments.service_redemption_enabled', true);
        $this->postJson('http://localhost'.self::BASE.'/recharges', $body)->assertStatus(503);
        $this->authorize($this->patient(['is_demo' => true]));
        $this->postJson('https://klini.test'.self::BASE.'/recharges', $body)->assertForbidden();
        $this->assertDatabaseCount('mobile_wallet_recharges', 0);
        Http::assertNothingSent();
    }

    public function test_live_preflight_verifies_stripe_account_country_capability_and_balance_mode_before_creation(): void
    {
        $this->liveConfiguration();
        $patient = $this->patient();
        $this->authorize($patient);
        $body = ['amount_cents' => 5000, 'client_request_id' => (string) Str::uuid()];
        foreach ([['id', 'acct_UnrelatedFixture123'], ['country', 'US'], ['charges_enabled', false]] as [$field, $invalid]) {
            $before = $this->stripeAccount[$field];
            $this->stripeAccount[$field] = $invalid;
            $this->postJson('https://klini.test'.self::BASE.'/recharges', $body)->assertStatus(503);
            $this->stripeAccount[$field] = $before;
        }
        $this->stripeBalanceLive = false;
        $this->postJson('https://klini.test'.self::BASE.'/recharges', $body)->assertStatus(503);
        $this->stripeBalanceLive = true;
        $this->assertSame([], $this->createAttempts);
        $data = $this->createRecharge($patient, 5000, $body['client_request_id'], true);
        $this->assertSame('live', $data['recharge']['mode']);
        $this->assertTrue($this->intents[$data['payment_intent_id']]['livemode']);
        $paths = Http::recorded()->map(fn ($pair) => parse_url($pair[0]->url(), PHP_URL_PATH))->all();
        $this->assertSame(['/v1/account', '/v1/balance', '/v1/payment_intents'], array_slice($paths, -3));
        $this->assertSame(['klini-wallet:live:'.$data['recharge']['id']], $this->createAttempts);
        $this->assertDatabaseCount('mobile_wallet_movements', 0);
    }

    public function test_failed_or_canceled_refunds_require_review_without_recredit_or_cross_owner_block(): void
    {
        $patient = $this->patient();
        $data = $this->createRecharge($patient);
        $pi = $data['payment_intent_id'];
        $this->succeed($pi);
        $this->postJson(self::BASE.'/recharges/'.$data['recharge']['id'].'/refresh')->assertOk();
        $chargeId = $this->intents[$pi]['latest_charge'];
        $this->charges[$chargeId]['amount_refunded'] = 3000;
        $this->webhook($this->event('evt_ReviewDebitFixture123', 'charge.refunded', $this->charges[$chargeId]))->assertOk();
        $account = MobileWalletRecharge::findOrFail($data['recharge']['id'])->account;
        $this->assertSame(7000, $account->balanceCents());

        $foreign = $this->createRecharge($this->patient());
        $this->succeed($foreign['payment_intent_id']);
        $this->postJson(self::BASE.'/recharges/'.$foreign['recharge']['id'].'/refresh')->assertOk();
        $foreignCharge = $this->intents[$foreign['payment_intent_id']]['latest_charge'];
        $foreignRefund = ['id' => 're_ForeignReviewFixture123', 'object' => 'refund', 'charge' => $foreignCharge,
            'payment_intent' => $foreign['payment_intent_id'], 'amount' => 3000, 'currency' => 'mxn',
            'livemode' => false, 'status' => 'failed', 'metadata' => ['klini_wallet_order_id' => $data['recharge']['id']]];
        $this->webhook($this->event('evt_ForeignReviewFixture123', 'refund.failed', $foreignRefund))->assertOk();
        $this->assertFalse($account->fresh()->blocked);
        $this->assertSame(7000, $account->balanceCents());

        foreach ([['refund.failed', 'failed', 'evt_RefundFailedFixture123'], ['refund.updated', 'canceled', 'evt_RefundCanceledFixture123']] as [$type, $status, $eventId]) {
            $refund = ['id' => 're_OwnReviewFixture123', 'object' => 'refund', 'charge' => $chargeId,
                'payment_intent' => $pi, 'amount' => 3000, 'currency' => 'mxn', 'livemode' => false, 'status' => $status];
            $event = $this->event($eventId, $type, $refund);
            $this->webhook($event)->assertOk();
            $this->webhook($event)->assertOk();
            $this->assertSame(7000, $account->balanceCents());
            $this->assertSame(3000, MobileWalletRecharge::findOrFail($data['recharge']['id'])->refunded_cents);
            $this->assertSame(2, $account->movements()->count());
        }

        $this->authorize($patient);
        $this->getJson(self::BASE)->assertOk()->assertJsonPath('data.balance_cents', 7000)
            ->assertJsonPath('data.blocked', true)->assertJsonPath('data.blocked_reason', 'payment_review')
            ->assertJsonPath('data.payment_config.enabled', false);
    }

    public function test_live_collection_flags_do_not_disable_balance_refunds_or_existing_payment_reconciliation(): void
    {
        $this->liveConfiguration();
        $patient = $this->patient();
        $data = $this->createRecharge($patient, 10000, null, true);
        $pi = $data['payment_intent_id'];
        $this->succeed($pi);
        $orderUrl = 'https://klini.test'.self::BASE.'/recharges/'.$data['recharge']['id'];
        $this->postJson($orderUrl.'/refresh')->assertOk()->assertJsonPath('data.wallet.balance_cents', 10000);
        config()->set([
            'wallet-payments.enabled' => false,
            'wallet-payments.live_enabled' => false,
            'wallet-payments.service_redemption_enabled' => false,
        ]);
        $requests = count(Http::recorded());
        $this->getJson('https://klini.test'.self::BASE)->assertOk()->assertJsonPath('data.balance_cents', 10000)
            ->assertJsonPath('data.payment_config.enabled', false)->assertJsonPath('data.payment_config.publishable_key', null)
            ->assertJsonPath('data.payment_config.merchant_identifier', null);
        $this->assertSame($requests, count(Http::recorded()));

        $chargeId = $this->intents[$pi]['latest_charge'];
        $this->charges[$chargeId]['amount_refunded'] = 2000;
        $this->webhook($this->event('evt_LiveFlagsRefundFixture123', 'charge.refunded', $this->charges[$chargeId]))->assertOk();
        $this->authorize($patient);
        $this->postJson($orderUrl.'/refresh')->assertOk()->assertJsonPath('data.client_secret', null)
            ->assertJsonPath('data.wallet.balance_cents', 8000);
        $this->assertDatabaseCount('mobile_wallet_movements', 2);
        $this->assertDatabaseHas('mobile_wallet_movements', ['recharge_id' => $data['recharge']['id'], 'type' => 'refund', 'amount_cents' => -2000]);

        $requests = count(Http::recorded());
        $this->postJson('https://klini.test'.self::BASE.'/recharges', ['amount_cents' => 5000, 'client_request_id' => (string) Str::uuid()])->assertStatus(503);
        $this->postJson($orderUrl.'/resume')->assertStatus(503);
        $this->assertSame($requests, count(Http::recorded()));
        $this->assertDatabaseCount('mobile_wallet_recharges', 1);
    }

    public function test_default_preflight_is_read_only_reports_redemption_not_ready_and_prints_no_keys(): void
    {
        $before = config('wallet-payments');
        $this->artisan('wallet:preflight')
            ->expectsOutputToContain('service_redemption_enabled: not_ready')
            ->expectsOutputToContain('wallet_preflight: not_ready_for_live')
            ->doesntExpectOutputToContain('sk_test_')
            ->doesntExpectOutputToContain('pk_test_')
            ->doesntExpectOutputToContain('whsec_')
            ->assertExitCode(1);

        $this->assertSame($before, config('wallet-payments'));
        foreach (['mobile_wallet_accounts', 'mobile_wallet_recharges', 'mobile_wallet_movements', 'mobile_wallet_webhook_events'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
        Http::assertNothingSent();
    }

    public function test_provider_preflight_only_reads_account_and_balance_and_never_activates_or_changes_funds(): void
    {
        $this->liveConfiguration();
        config()->set('app.url', 'https://klini.us');
        $before = config('wallet-payments');
        $this->artisan('wallet:preflight', ['--provider' => true])
            ->expectsOutputToContain('provider_account_and_mode: ready')
            ->expectsOutputToContain('wallet_preflight: ready_for_deployment_review')
            ->doesntExpectOutputToContain('sk_live_')
            ->doesntExpectOutputToContain('pk_live_')
            ->doesntExpectOutputToContain('whsec_')
            ->assertExitCode(0);
        $this->assertSame($before, config('wallet-payments'));
        $this->assertCount(2, Http::recorded());

        $this->stripeAccount['id'] = 'acct_UnrelatedFixture123';
        $this->artisan('wallet:preflight', ['--provider' => true])
            ->expectsOutputToContain('provider_account_and_mode: not_ready')
            ->expectsOutputToContain('wallet_preflight: not_ready_for_live')->assertExitCode(1);
        $this->stripeAccount['id'] = 'acct_WalletFixture123';
        config()->set('wallet-payments.service_redemption_enabled', false);
        $this->artisan('wallet:preflight', ['--provider' => true])
            ->expectsOutputToContain('service_redemption_enabled: not_ready')
            ->expectsOutputToContain('wallet_preflight: not_ready_for_live')->assertExitCode(1);
        $this->assertFalse(config('wallet-payments.service_redemption_enabled'));

        foreach (Http::recorded() as [$request]) {
            $this->assertSame('GET', $request->method());
            $this->assertContains($request->url(), ['https://api.stripe.com/v1/account', 'https://api.stripe.com/v1/balance']);
        }
        foreach (['mobile_wallet_accounts', 'mobile_wallet_recharges', 'mobile_wallet_movements', 'mobile_wallet_webhook_events'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
        $this->assertSame([], $this->createAttempts);
    }
}
