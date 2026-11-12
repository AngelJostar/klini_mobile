<?php

namespace App\Services;

use App\Models\PharmacyProduct;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PharmacyProductImageService
{
    private const DEMO_IMAGES = [
        'protector-solar' => ['label' => 'Protector solar', 'file' => 'protector-solar-fps50-50ml-v1.png'],
        'gel-limpiador' => ['label' => 'Gel limpiador', 'file' => 'gel-limpiador-turquesa-200ml-v1.png'],
        'tiras-glucosa' => ['label' => 'Tiras de glucosa', 'file' => 'tiras-glucosa-50-piezas-v1.png'],
        'medicamento-a' => ['label' => 'Medicamento A', 'file' => 'medicamento-a-20-tabletas-v1.png'],
    ];

    public static function demoOptions(): array
    {
        return array_map(fn (array $image) => $image['label'], self::DEMO_IMAGES);
    }

    public static function fileRules(): array
    {
        return ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'mimetypes:image/jpeg,image/png,image/webp', 'max:5120', 'dimensions:min_width=120,min_height=120,max_width=4096,max_height=4096'];
    }

    public function demoFile(string $key): UploadedFile
    {
        $entry = self::DEMO_IMAGES[$key] ?? null;
        if (!$entry) {
            throw ValidationException::withMessages(['demo_image_key' => 'Selecciona una imagen de la fototeca demo.']);
        }
        // Only these server-owned filenames can enter the library; no client paths or URLs.
        $path = resource_path('pharmacy-demo-images/'.$entry['file']);
        abort_unless(is_file($path), 404);
        $file = new UploadedFile($path, $entry['file'], null, UPLOAD_ERR_OK, true);
        Validator::make(['image' => $file], ['image' => self::fileRules()])->validate();

        return $file;
    }

    public function storeDemo(PharmacyProduct $product, string $key): void
    {
        $this->store($product, $this->demoFile($key));
    }

    public function store(PharmacyProduct $product, UploadedFile $file): void
    {
        Validator::make(['image' => $file], ['image' => self::fileRules()])->validate();
        $mime = $file->getMimeType();
        $extension = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$mime] ?? null;
        if (!$file->isValid() || !$extension) {
            throw ValidationException::withMessages(['image' => 'Selecciona una imagen JPEG, PNG o WebP válida.']);
        }

        // Immutable opaque names keep replacements separate from existing images.
        $directory = 'pharmacy-products/'.$product->provider_id.'/'.$product->id;
        $path = Storage::disk('local')->putFileAs($directory, $file, bin2hex(random_bytes(16)).'.'.$extension);
        if ($path === false) {
            throw new \RuntimeException('No se pudo guardar la imagen del producto.');
        }
        $metadata = $product->metadata ?? [];
        $metadata[PharmacyProduct::STORE_IMAGE_METADATA_KEY] = ['path' => $path, 'mime' => $mime];
        $product->update(['metadata' => $metadata]);
    }

    public function response(PharmacyProduct $product): StreamedResponse
    {
        $image = $product->uploadedStoreImage();
        abort_unless($image && Storage::disk('local')->exists($image['path']), 404);

        return Storage::disk('local')->response($image['path'], 'producto-'.$product->id.'.'.pathinfo($image['path'], PATHINFO_EXTENSION), [
            'Content-Type' => $image['mime'],
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, max-age=0',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
        ], 'inline');
    }
}
