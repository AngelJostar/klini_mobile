<?php

namespace Tests\Feature;

use App\Models\{PharmacyProduct, PharmacyStoreSetting, Provider, User};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\{Http, Storage};
use Illuminate\Support\Str;
use Tests\TestCase;

class PharmacyDemoImageLibraryTest extends TestCase
{
    use RefreshDatabase;

    private const IMAGES = [
        'protector-solar' => ['Protector solar', 'protector-solar-fps50-50ml-v1.png'],
        'gel-limpiador' => ['Gel limpiador', 'gel-limpiador-turquesa-200ml-v1.png'],
        'tiras-glucosa' => ['Tiras de glucosa', 'tiras-glucosa-50-piezas-v1.png'],
        'medicamento-a' => ['Medicamento A', 'medicamento-a-20-tabletas-v1.png'],
    ];

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Http::preventStrayRequests();
    }

    private function user(array $changes = []): User
    {
        $id = (string) Str::uuid();

        return User::create(array_replace([
            'name' => 'Distribuidor fototeca de prueba', 'username' => $id, 'email' => $id.'@test.local',
            'role' => 'provider', 'module' => 'provider_medicines', 'status' => 'active', 'is_demo' => true,
        ], $changes));
    }

    private function provider(User $user, array $changes = []): Provider
    {
        return Provider::create(array_replace([
            'user_id' => $user->id, 'name' => 'Distribuidor fototeca de prueba', 'provider_type' => 'medicines',
            'status' => 'active', 'digital_pharmacy_enabled' => true,
        ], $changes));
    }

    private function payload(array $changes = []): array
    {
        return array_replace([
            'name' => 'Producto fototeca de prueba', 'price' => '25.50', 'stock' => 5,
            'status' => 'active', 'requires_prescription' => false,
        ], $changes);
    }

    private function sourceHash(string $key): string
    {
        $path = resource_path('pharmacy-demo-images/'.self::IMAGES[$key][1]);
        $this->assertFileExists($path);

        return hash_file('sha256', $path);
    }

    public function test_eligible_provider_can_view_png_library_and_unknown_key_is_not_found(): void
    {
        $owner = $this->user();
        $this->provider($owner);
        $expectedHash = $this->sourceHash('protector-solar');

        $response = $this->actingAs($owner)
            ->get(route('provider.pharmacy.demo-images', ['imageKey' => 'protector-solar']))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertSame($expectedHash, hash_file('sha256', $response->baseResponse->getFile()->getPathname()));
        $this->get(route('provider.pharmacy.demo-images', ['imageKey' => 'unknown-image']))->assertNotFound();
        $this->assertSame([], Storage::disk('local')->allFiles());
        Http::assertNothingSent();
    }

    public function test_library_access_requires_active_enabled_demo_provider(): void
    {
        $url = route('provider.pharmacy.demo-images', ['imageKey' => 'protector-solar']);
        $this->getJson($url)->assertUnauthorized();

        foreach ([
            [['is_demo' => false], [], 403],
            [[], ['digital_pharmacy_enabled' => false], 403],
            [['status' => 'inactive'], [], 403],
            [[], ['status' => 'inactive'], 404],
        ] as [$userChanges, $providerChanges, $status]) {
            $owner = $this->user($userChanges);
            $this->provider($owner, $providerChanges);
            $this->actingAs($owner)->getJson($url)->assertStatus($status);
        }

        foreach (['admin', 'superadmin'] as $role) {
            $this->actingAs($this->user(['role' => $role, 'module' => $role]))->getJson($url)->assertForbidden();
        }

        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_product_form_shows_four_demo_choices_only_for_eligible_provider(): void
    {
        $url = route('provider.pharmacy.products', ['section' => 'create']);
        $owner = $this->user();
        $provider = $this->provider($owner);
        $response = $this->actingAs($owner)->get($url)->assertOk()->assertSeeText('Fototeca demo');

        foreach (self::IMAGES as $key => [$label]) {
            $response->assertSeeText($label)->assertSee(route('provider.pharmacy.demo-images', ['imageKey' => $key]), false);
        }

        $provider->update(['digital_pharmacy_enabled' => false]);
        $this->get($url)->assertOk()->assertDontSeeText('Fototeca demo');
        $provider->update(['digital_pharmacy_enabled' => true]);
        $owner->update(['is_demo' => false]);
        $this->actingAs($owner)->get($url)->assertOk()->assertDontSeeText('Fototeca demo');
    }

    public function test_all_demo_choices_copy_exact_resources_to_private_owned_opaque_paths(): void
    {
        $owner = $this->user();
        $provider = $this->provider($owner);
        $otherProvider = $this->provider($this->user());
        $this->actingAs($owner);
        $sourceHashes = [];

        foreach (self::IMAGES as $key => [$label]) {
            $sourceHashes[$key] = $this->sourceHash($key);
            $this->post(route('provider.pharmacy.products.store'), $this->payload([
                'name' => $label.' de prueba', 'demo_image_key' => $key, 'provider_id' => $otherProvider->id,
                'metadata' => ['untrusted' => true, PharmacyProduct::STORE_IMAGE_METADATA_KEY => ['path' => '../secret.png', 'mime' => 'image/png']],
            ]))->assertRedirect()->assertSessionHasNoErrors();

            $product = PharmacyProduct::latest('id')->firstOrFail();
            $image = $product->uploadedStoreImage();
            $this->assertSame($provider->id, $product->provider_id);
            $this->assertSame('image/png', $image['mime']);
            $this->assertMatchesRegularExpression('#^pharmacy-products/'.$provider->id.'/'.$product->id.'/[a-f0-9]{32}\.png$#', $image['path']);
            $this->assertArrayNotHasKey('untrusted', $product->metadata);
            Storage::disk('local')->assertExists($image['path']);
            $this->assertSame($sourceHashes[$key], hash('sha256', Storage::disk('local')->get($image['path'])));
            $this->get(route('provider.pharmacy.products.image', $product))->assertOk()->assertHeader('Content-Type', 'image/png');
        }

        foreach ($sourceHashes as $key => $expectedHash) {
            $this->assertSame($expectedHash, $this->sourceHash($key));
        }
        $this->assertDatabaseCount('pharmacy_products', 4);
        $this->assertCount(4, Storage::disk('local')->allFiles());
        Http::assertNothingSent();
    }

    public function test_store_rejects_ineligible_unknown_or_ambiguous_demo_selections_without_writes(): void
    {
        foreach ([
            [['is_demo' => false], [], 'protector-solar'],
            [[], ['digital_pharmacy_enabled' => false], 'protector-solar'],
            [[], [], 'unknown-image'],
        ] as [$userChanges, $providerChanges, $key]) {
            $owner = $this->user($userChanges);
            $this->provider($owner, $providerChanges);
            $this->actingAs($owner)->postJson(route('provider.pharmacy.products.store'), $this->payload(['demo_image_key' => $key]))
                ->assertUnprocessable()->assertJsonValidationErrors('demo_image_key');
        }

        $owner = $this->user();
        $this->provider($owner);
        $this->actingAs($owner)->postJson(route('provider.pharmacy.products.store'), $this->payload([
            'demo_image_key' => 'protector-solar', 'image' => UploadedFile::fake()->image('own.png', 200, 200),
        ]))->assertUnprocessable()->assertJsonValidationErrors(['image', 'demo_image_key']);
        $this->postJson(route('provider.pharmacy.products.store'), $this->payload([
            'demo_image_key' => 'protector-solar', 'use_external_image' => true, 'image_url' => 'https://example.com/product.png',
        ]))->assertUnprocessable()->assertJsonValidationErrors('demo_image_key');

        $this->assertDatabaseCount('pharmacy_products', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
        Http::assertNothingSent();
    }

    public function test_owned_updates_preserve_metadata_and_public_images_obey_publication_gates(): void
    {
        $owner = $this->user();
        $provider = $this->provider($owner);
        $product = PharmacyProduct::create($this->payload() + ['provider_id' => $provider->id, 'metadata' => ['existing' => 'preserved']]);
        $this->actingAs($owner)->patch(route('provider.pharmacy.products.update', $product), $this->payload(['demo_image_key' => 'protector-solar']))
            ->assertRedirect()->assertSessionHasNoErrors();
        $firstImage = $product->fresh()->uploadedStoreImage();
        $this->patch(route('provider.pharmacy.products.update', $product), $this->payload(['demo_image_key' => 'gel-limpiador']))
            ->assertRedirect()->assertSessionHasNoErrors();
        $product = $product->fresh();
        $secondImage = $product->uploadedStoreImage();
        $this->assertNotSame($firstImage['path'], $secondImage['path']);
        $this->assertSame('preserved', $product->metadata['existing']);
        $this->assertSame($this->sourceHash('gel-limpiador'), hash('sha256', Storage::disk('local')->get($secondImage['path'])));
        Storage::disk('local')->assertExists([$firstImage['path'], $secondImage['path']]);

        $other = $this->user();
        $otherProvider = $this->provider($other);
        $before = $product->fresh()->getRawOriginal();
        $this->actingAs($other)->patch(route('provider.pharmacy.products.update', $product), $this->payload([
            'name' => 'Cambio ajeno', 'demo_image_key' => 'medicamento-a', 'provider_id' => $otherProvider->id,
        ]))->assertNotFound();
        $this->assertSame($before, $product->fresh()->getRawOriginal());
        $this->assertCount(2, Storage::disk('local')->allFiles());

        $url = '/api/mobile/v1/pharmacy/products/'.$product->id.'/image';
        $this->get($url)->assertNotFound();
        PharmacyStoreSetting::create(['id' => 1, 'enabled' => true, 'title' => 'Farmacia de prueba']);
        $this->get($url)->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->getJson('/api/mobile/v1/pharmacy/products/'.$product->id)->assertOk()->assertJsonPath('data.image_url', url($url));
        $provider->update(['digital_pharmacy_enabled' => false]);
        $this->get($url)->assertNotFound();
        $provider->update(['digital_pharmacy_enabled' => true]);
        $product->update(['status' => 'inactive']);
        $this->get($url)->assertNotFound();
        Http::assertNothingSent();
    }
}
