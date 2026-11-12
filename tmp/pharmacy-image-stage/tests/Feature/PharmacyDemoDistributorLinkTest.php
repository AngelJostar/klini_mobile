<?php

namespace Tests\Feature;

use App\Models\Provider;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PharmacyDemoDistributorLinkTest extends TestCase
{
    use RefreshDatabase;

    private function user(array $attributes = []): User
    {
        static $number = 0;
        $number++;

        return User::create(array_replace([
            'name' => 'Distribuidor DEMO de prueba '.$number,
            'username' => 'demo-distributor-link-'.$number,
            'email' => 'demo-distributor-link-'.$number.'@test.local',
            'password' => Hash::make('Synthetic-demo-link-password'),
            'role' => 'provider',
            'module' => 'provider_medicines',
            'status' => 'active',
            'is_demo' => true,
            'passwordless_review' => true,
            'account_category' => User::CATEGORY_OPERATIONAL,
            'metadata' => ['fixture' => 'demo-distributor-link'],
        ], $attributes));
    }

    public function test_superadmin_links_eligible_demo_user_without_changing_user_or_credentials(): void
    {
        $superadmin = $this->user(['role' => 'superadmin', 'module' => 'superadmin']);
        $candidate = $this->user();
        $candidate->setRememberToken('synthetic-remember-token');
        $candidate->save();
        $userBefore = $candidate->fresh()->getRawOriginal();
        $userCount = User::count();

        $this->actingAs($superadmin)
            ->post(route('superadmin.distributors.link-demo'), ['user_id' => $candidate->id])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseCount('users', $userCount);
        $this->assertSame($userBefore, $candidate->fresh()->getRawOriginal());
        $this->assertDatabaseCount('providers', 1);
        $provider = Provider::where('user_id', $candidate->id)->firstOrFail();
        $this->assertSame($candidate->name, $provider->name);
        $this->assertSame('medicines', $provider->provider_type);
        $this->assertSame('active', $provider->status);
        $this->assertFalse($provider->digital_pharmacy_enabled);
        $this->assertTrue($candidate->fresh()->passwordless_review);
    }

    public function test_ineligible_users_cannot_be_linked(): void
    {
        $this->actingAs($this->user(['role' => 'superadmin', 'module' => 'superadmin']));

        foreach ([
            ['is_demo' => false],
            ['status' => 'inactive'],
            ['module' => 'provider_import'],
            ['role' => 'patient'],
        ] as $attributes) {
            $candidate = $this->user($attributes);
            $userBefore = $candidate->fresh()->getRawOriginal();

            $this->postJson(route('superadmin.distributors.link-demo'), ['user_id' => $candidate->id])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('user_id');

            $this->assertSame($userBefore, $candidate->fresh()->getRawOriginal());
            $this->assertDatabaseMissing('providers', ['user_id' => $candidate->id]);
        }

        $this->assertDatabaseCount('providers', 0);
    }

    public function test_repeated_link_never_duplicates_or_changes_an_existing_provider(): void
    {
        $superadmin = $this->user(['role' => 'superadmin', 'module' => 'superadmin']);
        $candidate = $this->user();
        $this->actingAs($superadmin)
            ->post(route('superadmin.distributors.link-demo'), ['user_id' => $candidate->id])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $provider = Provider::where('user_id', $candidate->id)->firstOrFail();
        $provider->update(['status' => 'inactive', 'digital_pharmacy_enabled' => true]);
        $providerBefore = $provider->fresh()->getRawOriginal();
        $userBefore = $candidate->fresh()->getRawOriginal();

        $this->postJson(route('superadmin.distributors.link-demo'), ['user_id' => $candidate->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('user_id');

        $this->assertDatabaseCount('providers', 1);
        $this->assertDatabaseCount('users', 2);
        $this->assertSame($providerBefore, $provider->fresh()->getRawOriginal());
        $this->assertSame($userBefore, $candidate->fresh()->getRawOriginal());
    }

    public function test_only_superadmin_can_link_demo_distributors(): void
    {
        $candidate = $this->user();
        $userBefore = $candidate->fresh()->getRawOriginal();
        $url = route('superadmin.distributors.link-demo');

        $this->postJson($url, ['user_id' => $candidate->id])->assertUnauthorized();

        foreach (['admin', 'provider'] as $role) {
            $actor = $this->user(['role' => $role, 'module' => $role === 'admin' ? 'admin' : 'provider_medicines']);
            $this->actingAs($actor)->postJson($url, ['user_id' => $candidate->id])->assertForbidden();
        }

        $this->assertDatabaseCount('providers', 0);
        $this->assertSame($userBefore, $candidate->fresh()->getRawOriginal());
    }
}
