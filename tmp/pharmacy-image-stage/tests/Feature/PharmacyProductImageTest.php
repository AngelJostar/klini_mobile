<?php

namespace Tests\Feature;

use App\Models\{PharmacyProduct, PharmacyStoreSetting, Provider, User};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\{Http, Storage};
use Illuminate\Support\Str;
use Tests\TestCase;

class PharmacyProductImageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Http::preventStrayRequests();
    }

    private function user(string $role = 'provider'): User
    {
        $id = (string) Str::uuid();

        return User::create(['name' => 'Prueba imagen', 'username' => $id, 'email' => $id.'@test.local', 'role' => $role, 'module' => $role === 'provider' ? 'provider_medicines' : $role, 'status' => 'active']);
    }

    private function provider(User $user): Provider
    {
        return Provider::create(['user_id' => $user->id, 'name' => 'Distribuidor prueba', 'provider_type' => 'medicines', 'status' => 'active', 'digital_pharmacy_enabled' => false]);
    }

    private function payload(array $changes = []): array
    {
        return array_replace(['name' => 'Producto con foto', 'price' => '25.50', 'stock' => 5, 'status' => 'active', 'requires_prescription' => false], $changes);
    }

    private function upload(User $user): PharmacyProduct
    {
        $this->actingAs($user)->post(route('provider.pharmacy.products.store'), $this->payload(['image' => UploadedFile::fake()->image('producto.png', 480, 480)]))->assertRedirect()->assertSessionHasNoErrors();

        return PharmacyProduct::latest('id')->firstOrFail();
    }

    public function test_owner_upload_is_private_and_preview_requires_owner_or_active_superadmin(): void
    {
        $owner = $this->user();
        $provider = $this->provider($owner);
        $other = $this->user();
        $otherProvider = $this->provider($other);
        $this->actingAs($owner)->post(route('provider.pharmacy.products.store'), $this->payload([
            'image' => UploadedFile::fake()->image('patient-name.png', 480, 480),
            'provider_id' => $otherProvider->id, 'metadata' => ['path' => '/etc/passwd'],
        ]))->assertRedirect()->assertSessionHasNoErrors();
        $product = PharmacyProduct::firstOrFail();
        $this->assertSame($provider->id, $product->provider_id);
        $image = $product->uploadedStoreImage();
        $this->assertMatchesRegularExpression('#^pharmacy-products/'.$provider->id.'/'.$product->id.'/[a-f0-9]{32}\.png$#', $image['path']);
        Storage::disk('local')->assertExists($image['path']);
        $this->get(route('provider.pharmacy.products.image', $product))->assertOk()->assertHeader('Content-Type', 'image/png')->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->get(route('provider.pharmacy.products'))->assertOk()->assertSee('multipart/form-data', false)->assertSee(route('provider.pharmacy.products.image', $product), false);
        $this->actingAs($other)->get(route('provider.pharmacy.products.image', $product))->assertNotFound();
        $this->actingAs($this->user('admin'))->get(route('provider.pharmacy.products.image', $product))->assertForbidden();
        $admin = $this->user('superadmin');
        $this->actingAs($admin)->get(route('provider.pharmacy.products.image', $product))->assertOk();
        $admin->update(['status' => 'inactive']);
        $this->get(route('provider.pharmacy.products.image', $product))->assertForbidden();
        $this->assertSame(1, count(Storage::disk('local')->allFiles()));
    }

    public function test_upload_rejects_forged_mime_svg_file_size_and_dimensions(): void
    {
        $owner = $this->user();
        $this->provider($owner);
        $this->actingAs($owner);
        $files = [
            UploadedFile::fake()->createWithContent('forged.png', '<script>alert(1)</script>'),
            UploadedFile::fake()->createWithContent('vector.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"></svg>'),
            UploadedFile::fake()->image('large.png', 200, 200)->size(5121),
            UploadedFile::fake()->image('small.png', 119, 120),
            UploadedFile::fake()->image('wide.png', 4097, 120),
        ];
        foreach ($files as $file) {
            $this->postJson(route('provider.pharmacy.products.store'), $this->payload(['image' => $file]))->assertUnprocessable()->assertJsonValidationErrors('image');
        }
        $this->assertSame(0, PharmacyProduct::count());
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_allowed_raster_formats_are_detected_from_contents_and_ambiguous_source_is_rejected(): void
    {
        $owner = $this->user();
        $this->provider($owner);
        $this->actingAs($owner);
        foreach (['jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'] as $extension => $mime) {
            $this->post(route('provider.pharmacy.products.store'), $this->payload(['image' => UploadedFile::fake()->image('upload.'.$extension, 200, 200)]))->assertRedirect()->assertSessionHasNoErrors();
            $product = PharmacyProduct::latest('id')->firstOrFail();
            $this->assertSame($mime, $product->uploadedStoreImage()['mime']);
            $this->get(route('provider.pharmacy.products.image', $product))->assertOk()->assertHeader('Content-Type', $mime);
        }
        $this->postJson(route('provider.pharmacy.products.store'), $this->payload(['image' => UploadedFile::fake()->image('upload.png', 200, 200), 'use_external_image' => true, 'image_url' => 'https://example.com/product.png']))->assertUnprocessable()->assertJsonValidationErrors('image');
        $this->assertSame(3, PharmacyProduct::count());
        $this->assertSame(3, count(Storage::disk('local')->allFiles()));
    }

    public function test_public_photo_uses_request_origin_and_rechecks_every_publication_gate(): void
    {
        $owner = $this->user();
        $provider = $this->provider($owner);
        $product = $this->upload($owner);
        $url = '/api/mobile/v1/pharmacy/products/'.$product->id.'/image';
        $this->get($url)->assertNotFound();
        PharmacyStoreSetting::create(['id' => 1, 'enabled' => true, 'title' => 'Farmacia']);
        $this->get($url)->assertNotFound();
        $provider->update(['digital_pharmacy_enabled' => true]);
        $this->get('http://192.168.50.7:8000'.$url)->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->getJson('http://192.168.50.7:8000/api/mobile/v1/pharmacy/catalog')->assertOk()->assertJsonPath('data.products.0.image_url', 'http://192.168.50.7:8000'.$url);
        $this->getJson('http://192.168.50.7:8000/api/mobile/v1/pharmacy/products')->assertOk()->assertJsonPath('data.0.image_url', 'http://192.168.50.7:8000'.$url);
        $this->getJson('http://192.168.50.7:8000/api/mobile/v1/pharmacy/products/'.$product->id)->assertOk()->assertJsonPath('data.image_url', 'http://192.168.50.7:8000'.$url);
        foreach ([[$provider, 'digital_pharmacy_enabled', false, true], [$provider, 'status', 'inactive', 'active'], [$provider, 'provider_type', 'import', 'medicines'], [$owner, 'status', 'inactive', 'active'], [$owner, 'role', 'patient', 'provider'], [$product, 'status', 'inactive', 'active'], [$product, 'controlled', true, false], [$product, 'cold_chain', true, false]] as [$model, $field, $invalid, $valid]) {
            $model->update([$field => $invalid]);
            $this->get($url)->assertNotFound();
            $model->update([$field => $valid]);
        }
        PharmacyStoreSetting::findOrFail(1)->update(['enabled' => false]);
        $this->get($url)->assertNotFound();
    }

    public function test_other_distributor_cannot_replace_a_photo_or_change_its_product(): void
    {
        $owner = $this->user();
        $this->provider($owner);
        $product = $this->upload($owner);
        $original = $product->getRawOriginal();
        $other = $this->user();
        $this->provider($other);
        $this->actingAs($other)->patch(route('provider.pharmacy.products.update', $product), $this->payload(['name' => 'Ajeno', 'image' => UploadedFile::fake()->image('other.png', 200, 200)]))->assertNotFound();
        $this->assertSame($original, $product->fresh()->getRawOriginal());
        $this->assertSame(1, count(Storage::disk('local')->allFiles()));
    }

    public function test_replacement_preserves_existing_files_and_https_url_compatibility(): void
    {
        $owner = $this->user();
        $this->provider($owner);
        $product = $this->upload($owner);
        $first = $product->uploadedStoreImage()['path'];
        $this->patch(route('provider.pharmacy.products.update', $product), $this->payload(['name' => 'Solo texto']))->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame($first, $product->fresh()->uploadedStoreImage()['path']);
        $this->patch(route('provider.pharmacy.products.update', $product), $this->payload(['image' => UploadedFile::fake()->image('replacement.jpg', 200, 200)]))->assertRedirect()->assertSessionHasNoErrors();
        $second = $product->fresh()->uploadedStoreImage()['path'];
        $this->assertNotSame($first, $second);
        Storage::disk('local')->assertExists([$first, $second]);
        $this->patchJson(route('provider.pharmacy.products.update', $product), $this->payload(['use_external_image' => true]))->assertUnprocessable()->assertJsonValidationErrors('image_url');
        $this->patch(route('provider.pharmacy.products.update', $product), $this->payload(['use_external_image' => true, 'image_url' => 'https://example.com/product.jpg']))->assertRedirect()->assertSessionHasNoErrors();
        $this->assertNull($product->fresh()->uploadedStoreImage());
        $this->assertSame('https://example.com/product.jpg', $product->fresh()->image_url);
        Storage::disk('local')->assertExists([$first, $second]);
        $product->provider->update(['digital_pharmacy_enabled' => true]);
        PharmacyStoreSetting::create(['id' => 1, 'enabled' => true, 'title' => 'Farmacia']);
        $this->getJson('/api/mobile/v1/pharmacy/catalog')->assertJsonPath('data.products.0.image_url', 'https://example.com/product.jpg');
        $this->get('/api/mobile/v1/pharmacy/products/'.$product->id.'/image')->assertNotFound();
        Http::assertNothingSent();
    }

    public function test_metadata_cannot_serve_another_products_file_or_arbitrary_paths(): void
    {
        $owner = $this->user();
        $provider = $this->provider($owner);
        $product = $this->upload($owner);
        $image = $product->uploadedStoreImage();
        $other = PharmacyProduct::create($this->payload() + ['provider_id' => $provider->id]);
        $provider->update(['digital_pharmacy_enabled' => true]);
        PharmacyStoreSetting::create(['id' => 1, 'enabled' => true, 'title' => 'Farmacia']);
        foreach ([$image, ['path' => '../../secret.txt', 'mime' => 'image/png'], ['path' => $image['path'], 'mime' => 'image/svg+xml']] as $invalid) {
            $other->update(['metadata' => [PharmacyProduct::STORE_IMAGE_METADATA_KEY => $invalid]]);
            $this->assertNull($other->fresh()->uploadedStoreImage());
            $this->get('/api/mobile/v1/pharmacy/products/'.$other->id.'/image')->assertNotFound();
            $this->get(route('provider.pharmacy.products.image', $other))->assertNotFound();
        }
        Storage::disk('local')->delete($image['path']);
        $this->get('/api/mobile/v1/pharmacy/products/'.$product->id.'/image')->assertNotFound();
    }
}
