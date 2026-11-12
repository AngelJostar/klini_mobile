<?php

namespace Tests\Feature;

use App\Models\MedicationCatalogItem;
use App\Models\Patient;
use App\Models\PharmacyProduct;
use App\Models\PharmacyStoreSetting;
use App\Models\Provider;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PharmacyKliniSellerTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role = 'provider', array $attributes = []): User
    {
        return User::create($attributes + ['name' => 'Cuenta prueba', 'username' => (string) Str::uuid(), 'role' => $role, 'status' => 'active', 'module' => $role === 'provider' ? 'provider_medicines' : $role]);
    }

    private function provider(array $attributes = [], ?User $user = null): Provider
    {
        return Provider::create($attributes + ['user_id' => ($user ?? $this->user())->id, 'name' => 'Distribuidor '.Str::uuid(), 'provider_type' => 'medicines', 'status' => 'active', 'digital_pharmacy_enabled' => true]);
    }

    private function settings(array $attributes = []): PharmacyStoreSetting
    {
        return PharmacyStoreSetting::create($attributes + ['id' => 1, 'enabled' => true, 'title' => 'Farmacia', 'shipping_fee' => '0.00']);
    }

    private function settingsPayload(array $attributes = []): array
    {
        return $attributes + ['title' => 'Farmacia', 'accent_color' => '#008c95', 'shipping_fee' => '0.00', 'enabled' => true];
    }

    private function item(): MedicationCatalogItem
    {
        return MedicationCatalogItem::create(['name' => 'Producto canónico prueba', 'sku' => (string) Str::uuid(), 'presentation' => 'Caja', 'status' => 'active', 'digital_pharmacy_enabled' => true]);
    }

    private function offer(Provider $provider, MedicationCatalogItem $item, string $price = '35.50'): PharmacyProduct
    {
        return PharmacyProduct::create(['provider_id' => $provider->id, 'medication_catalog_item_id' => $item->id, 'name' => $item->name, 'price' => $price, 'stock' => 10, 'status' => 'active']);
    }

    public function test_no_klini_seller_or_price_is_created_automatically(): void
    {
        $provider = $this->provider();
        $offer = $this->offer($provider, $this->item());
        $this->getJson('/api/mobile/v1/pharmacy/settings')->assertOk()->assertJsonPath('data.klini_provider_id', null);
        $this->settings();
        $this->getJson('/api/mobile/v1/pharmacy/products/'.$offer->id)->assertOk()->assertJsonPath('data.provider.is_klini', false);
        $this->assertDatabaseCount('providers', 1);
        $this->assertDatabaseCount('pharmacy_products', 1);
        $this->assertSame('35.50', $offer->fresh()->price);
    }

    public function test_superadmin_configures_and_clears_a_real_seller_without_renaming_or_publication_changes(): void
    {
        $provider = $this->provider(['digital_pharmacy_enabled' => false]);
        $before = $provider->fresh()->getAttributes();
        $this->actingAs($this->user('superadmin'))->put(route('superadmin.digital-pharmacy.settings'), $this->settingsPayload(['klini_provider_id' => $provider->id]))->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame($provider->id, PharmacyStoreSetting::current()->klini_provider_id);
        $this->assertSame($before, $provider->fresh()->getAttributes());
        $this->put(route('superadmin.digital-pharmacy.settings'), $this->settingsPayload())->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame($provider->id, PharmacyStoreSetting::current()->klini_provider_id);
        $this->put(route('superadmin.digital-pharmacy.settings'), $this->settingsPayload(['klini_provider_id' => null]))->assertRedirect()->assertSessionHasNoErrors();
        $this->assertNull(PharmacyStoreSetting::current()->klini_provider_id);
        $this->assertDatabaseCount('pharmacy_products', 0);
    }

    public function test_configuration_rejects_inactive_wrong_type_missing_and_ineligible_accounts(): void
    {
        $settings = $this->settings();
        $invalid = [
            $this->provider(['status' => 'inactive']), $this->provider(['provider_type' => 'equipment']),
            $this->provider([], $this->user('provider', ['status' => 'inactive'])),
            $this->provider([], $this->user('patient')), $this->provider(['user_id' => null]),
        ];
        $this->actingAs($this->user('superadmin'));
        foreach (array_merge(array_map(fn ($provider) => $provider->id, $invalid), [999999]) as $id) {
            $this->putJson(route('superadmin.digital-pharmacy.settings'), $this->settingsPayload(['klini_provider_id' => $id]))->assertUnprocessable()->assertJsonValidationErrors('klini_provider_id');
            $this->assertNull($settings->fresh()->klini_provider_id);
        }
    }

    public function test_only_active_superadmin_can_configure_or_edit_klini_prices(): void
    {
        $provider = $this->provider();
        $settings = $this->settings(['klini_provider_id' => $provider->id]);
        $offer = $this->offer($provider, $this->item());
        foreach ([$this->user('provider'), $this->user('admin'), $this->user('patient'), $this->user('superadmin', ['status' => 'inactive'])] as $user) {
            $this->actingAs($user)->putJson(route('superadmin.digital-pharmacy.settings'), $this->settingsPayload(['klini_provider_id' => null]))->assertForbidden();
            $this->patchJson(route('superadmin.digital-pharmacy.klini-offers.price', $offer), ['price' => '77.00'])->assertForbidden();
        }
        $this->assertSame('35.50', $offer->fresh()->price);
        $this->assertSame($provider->id, $settings->fresh()->klini_provider_id);
    }

    public function test_klini_price_is_independent_and_old_or_foreign_offer_urls_cannot_change_another_price(): void
    {
        $item = $this->item();
        $klini = $this->provider();
        $other = $this->provider();
        $settings = $this->settings(['klini_provider_id' => $klini->id]);
        $own = $this->offer($klini, $item);
        $foreign = $this->offer($other, $item, '87.00');
        $this->actingAs($this->user('superadmin'))->patch(route('superadmin.digital-pharmacy.klini-offers.price', $own), ['price' => '42.25', 'provider_id' => $other->id, 'stock' => 999])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame('42.25', $own->fresh()->price);
        $this->assertSame(10, $own->fresh()->stock);
        $this->assertSame('87.00', $foreign->fresh()->price);
        $this->patchJson(route('superadmin.digital-pharmacy.klini-offers.price', $foreign), ['price' => '1.00'])->assertNotFound();
        foreach (['0', '-1', '12.345', '1000000', 'invalid'] as $price) {
            $this->patchJson(route('superadmin.digital-pharmacy.klini-offers.price', $own), ['price' => $price])->assertUnprocessable();
        }
        $settings->update(['klini_provider_id' => $other->id]);
        $this->patchJson(route('superadmin.digital-pharmacy.klini-offers.price', $own), ['price' => '1.00'])->assertNotFound();
        $this->assertSame('42.25', $own->fresh()->price);
        $this->assertSame('87.00', $foreign->fresh()->price);
    }

    public function test_public_flags_are_configuration_based_and_do_not_bypass_publication(): void
    {
        $item = $this->item();
        $klini = $this->provider();
        $other = $this->provider(['name' => 'Klini']);
        $settings = $this->settings(['klini_provider_id' => $klini->id]);
        $own = $this->offer($klini, $item);
        $foreign = $this->offer($other, $item, '87.00');
        $this->getJson('/api/mobile/v1/pharmacy/products/'.$own->id)->assertOk()->assertJsonPath('data.provider.is_klini', true)->assertJsonPath('data.price', '35.50');
        $this->getJson('/api/mobile/v1/pharmacy/products/'.$foreign->id)->assertOk()->assertJsonPath('data.provider.is_klini', false);
        $response = $this->getJson('/api/mobile/v1/pharmacy/catalog-items/'.$item->id)->assertOk()->assertJsonCount(2, 'data.offers');
        $offers = collect($response->json('data.offers'))->keyBy('id');
        $this->assertTrue($offers[$own->id]['provider']['is_klini']);
        $this->assertFalse($offers[$foreign->id]['provider']['is_klini']);
        $this->getJson('/api/mobile/v1/pharmacy/catalog')->assertJsonPath('data.settings.klini_provider_id', $klini->id)->assertJsonCount(2, 'data.products');
        $klini->update(['digital_pharmacy_enabled' => false]);
        $this->getJson('/api/mobile/v1/pharmacy/products/'.$own->id)->assertNotFound();
        $this->getJson('/api/mobile/v1/pharmacy/catalog-items/'.$item->id)->assertJsonCount(1, 'data.offers')->assertJsonPath('data.offers.0.provider.is_klini', false);
        $settings->update(['klini_provider_id' => null]);
        $this->getJson('/api/mobile/v1/pharmacy/products/'.$foreign->id)->assertJsonPath('data.provider.is_klini', false);
    }

    public function test_admin_controls_render_only_existing_offers_and_preserve_other_seller_prices(): void
    {
        $klini = $this->provider(['name' => 'Cuenta Klini prueba']);
        $other = $this->provider();
        $this->settings(['klini_provider_id' => $klini->id]);
        $this->offer($klini, $this->item());
        $this->offer($other, $this->item(), '87654.32');
        $this->actingAs($this->user('superadmin'))->get(route('superadmin.digital-pharmacy', ['section' => 'visual']))->assertOk()->assertSee('Distribuidor de venta Klini')->assertSee('Cuenta Klini prueba');
        $this->get(route('superadmin.digital-pharmacy', ['section' => 'klini']))->assertOk()->assertSee('Precio Klini (MXN)')->assertSee('35.50')->assertDontSee('87654.32');
    }

    public function test_order_snapshot_keeps_selected_price_and_historical_klini_flag_after_reconfiguration(): void
    {
        $klini = $this->provider();
        $other = $this->provider();
        $settings = $this->settings(['klini_provider_id' => $klini->id]);
        $item = $this->item();
        $own = $this->offer($klini, $item);
        $foreign = $this->offer($other, $item, '87.00');
        $patientUser = $this->user('patient');
        Patient::create(['user_id' => $patientUser->id, 'full_name' => 'Paciente prueba', 'status' => 'active']);
        Sanctum::actingAs($patientUser, ['mobile:access']);
        $payload = ['client_request_id' => (string) Str::uuid(), 'items' => [['product_id' => $own->id, 'quantity' => 1], ['product_id' => $foreign->id, 'quantity' => 1]], 'delivery_method' => 'delivery', 'terms_accepted' => true, 'address' => ['name' => 'Prueba', 'street' => 'Calle', 'neighborhood' => 'Centro', 'postal_code' => '01000']];
        $response = $this->postJson('/api/mobile/v1/pharmacy/orders', $payload)->assertCreated()->assertJsonPath('data.items.0.provider_is_klini', true)->assertJsonPath('data.items.1.provider_is_klini', false)->assertJsonPath('data.items.0.unit_price', '35.50')->assertJsonPath('data.subtotal', '122.50')->assertJsonPath('data.payment_status', 'not_configured');
        $settings->update(['klini_provider_id' => $other->id]);
        $this->getJson('/api/mobile/v1/pharmacy/orders/'.$response->json('data.id'))->assertOk()->assertJsonPath('data.items.0.provider_is_klini', true)->assertJsonPath('data.items.1.provider_is_klini', false);
        $this->postJson('/api/mobile/v1/pharmacy/orders', $payload)->assertOk()->assertJsonPath('data.items.0.provider_is_klini', true);
        $this->assertDatabaseCount('pharmacy_store_orders', 1);
    }
}
