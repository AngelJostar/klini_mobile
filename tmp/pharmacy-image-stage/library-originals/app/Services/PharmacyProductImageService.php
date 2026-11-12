<?php

namespace App\Services;

use App\Models\PharmacyProduct;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PharmacyProductImageService
{
    public function store(PharmacyProduct $product, UploadedFile $file): void
    {
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
