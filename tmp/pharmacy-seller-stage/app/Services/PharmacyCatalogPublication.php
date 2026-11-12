<?php

namespace App\Services;

use App\Models\{MedicationCatalogItem, PharmacyProduct, PharmacyStoreSetting, Provider};
use Illuminate\Http\Request;

class PharmacyCatalogPublication
{
    public function coordinates(Request $request): ?array
    {
        $data = $request->validate([
            'latitude' => 'nullable|required_with:longitude|numeric|between:-90,90',
            'longitude' => 'nullable|required_with:latitude|numeric|between:-180,180',
        ]);
        return isset($data['latitude'], $data['longitude']) ? [(float)$data['latitude'], (float)$data['longitude']] : null;
    }

    public function providerData(Provider $provider, ?array $coordinates, ?int $kliniProviderId = null): array
    {
        $distance = null;
        if ($coordinates !== null && $provider->pharmacy_latitude !== null && $provider->pharmacy_longitude !== null) {
            [$lat, $lng] = array_map('deg2rad', $coordinates);
            $providerLat = deg2rad($provider->pharmacy_latitude);
            $providerLng = deg2rad($provider->pharmacy_longitude);
            $a = sin(($providerLat - $lat) / 2) ** 2 + cos($lat) * cos($providerLat) * sin(($providerLng - $lng) / 2) ** 2;
            $distance = round(6371.0088 * 2 * asin(sqrt(min(1, max(0, $a)))), 2);
        }
        return ['id' => $provider->id, 'name' => $provider->name, 'is_klini' => $kliniProviderId !== null && $provider->id === $kliniProviderId, 'address' => $provider->pharmacy_address,
            'latitude' => $provider->pharmacy_latitude, 'longitude' => $provider->pharmacy_longitude,
            'distance_km' => $distance];
    }

    public function offerData(PharmacyProduct $product, ?array $coordinates, Request $request): array
    {
        $item = $product->catalogItem;
        // Cache configuration only on this request, never across requests or accounts.
        if (!$request->attributes->has('pharmacy.klini_provider_id')) {
            $request->attributes->set('pharmacy.klini_provider_id', PharmacyStoreSetting::current()->klini_provider_id);
        }
        return [
            'id' => $product->id, 'catalog_item_id' => $item?->id, 'sku' => $item?->sku ?? $product->sku,
            'name' => $item?->name ?? $product->name, 'description' => $item?->description ?? $product->description,
            'category' => $item?->pharmacyCategory() ?? $product->category,
            'specialty' => $product->specialty, 'product_type' => $product->product_type,
            'compare_at_price' => $product->compare_at_price,
            'is_promotion' => $product->compare_at_price !== null && (float)$product->compare_at_price > (float)$product->price,
            'adherence_program_id' => null,
            'image_url' => $product->uploadedStoreImage() ? $request->getSchemeAndHttpHost().route('api.mobile.v1.pharmacy.product.image', ['product' => $product->id], false) : $product->image_url,
            'price' => $product->price, 'currency' => 'MXN', 'stock' => $product->stock,
            'available' => $product->stock > 0,
            'requires_prescription' => $item?->requires_prescription ?? $product->requires_prescription,
            'featured' => $product->featured, 'presentation' => $item?->presentation ?? $product->presentation,
            'laboratory' => $product->laboratory,
            'provider' => $this->providerData($product->provider, $coordinates, $request->attributes->get('pharmacy.klini_provider_id')),
        ];
    }

    public function itemsQuery()
    {
        return MedicationCatalogItem::publishedInPharmacy()->with([
            'pharmacyOffers' => fn ($query) => $query->publiclyAvailable()->with(['provider', 'catalogItem']),
        ]);
    }

    public function itemData(MedicationCatalogItem $item, ?array $coordinates, Request $request): array
    {
        $offers = $item->pharmacyOffers->map(fn ($offer) => $this->offerData($offer, $coordinates, $request))
            ->sort(fn ($a, $b) => [!$a['available'], $a['provider']['distance_km'] ?? INF, (float)$a['price'], $a['id']]
                <=> [!$b['available'], $b['provider']['distance_km'] ?? INF, (float)$b['price'], $b['id']])->values();
        $available = $offers->where('available', true);
        $nearest = $coordinates ? $available->first(fn ($offer) => $offer['provider']['distance_km'] !== null) : null;
        return [
            'id' => $item->id, 'sku' => $item->sku, 'name' => $item->name,
            'description' => $item->description, 'presentation' => $item->presentation,
            'category' => $item->pharmacyCategory(), 'brand' => data_get($item->metadata, 'distinctive_name'),
            'requires_prescription' => $item->requires_prescription, 'currency' => 'MXN',
            'price_from' => $available->isNotEmpty() ? number_format($available->min(fn ($offer) => (float)$offer['price']), 2, '.', '') : null,
            'available' => $available->isNotEmpty(), 'offers' => $offers,
            'nearest_offer_id' => $nearest['id'] ?? null,
            'image_url' => $offers->first(fn ($offer) => filled($offer['image_url']))['image_url'] ?? null,
        ];
    }
}
