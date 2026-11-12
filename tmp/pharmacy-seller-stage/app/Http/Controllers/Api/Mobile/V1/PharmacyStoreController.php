<?php

namespace App\Http\Controllers\Api\Mobile\V1;

use App\Http\Controllers\Controller;
use App\Models\PharmacyPrescriptionUpload;
use App\Models\PharmacyProduct;
use App\Models\PharmacyStoreOrder;
use App\Models\PharmacyStoreSetting;
use App\Models\Prescription;
use App\Models\Provider;
use App\Models\User;
use App\Services\PharmacyProductImageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PharmacyStoreController extends Controller
{
    public function settings()
    {
        return response()->json(['data' => PharmacyStoreSetting::current()->publicData()]);
    }

    private function productsQuery()
    {
        return PharmacyProduct::query()->publiclyAvailable()->with(['provider', 'catalogItem']);
    }

    public function catalog(Request $request)
    {
        $publication = app(\App\Services\PharmacyCatalogPublication::class);
        $coordinates = $publication->coordinates($request);
        $settings = PharmacyStoreSetting::current();
        $products = $settings->enabled ? $this->productsQuery()->orderByDesc('featured')->orderBy('name')->limit(100)->get() : collect();
        $items = $settings->enabled ? $publication->itemsQuery()->orderBy('name')->orderBy('id')->limit(100)->get() : collect();

        return response()->json(['data' => ['settings' => $settings->publicData(),
            'products' => $products->map(fn ($p) => $this->productData($p, $request))->values(),
            'catalog_items' => $items->map(fn ($item) => $publication->itemData($item, $coordinates, $request)),
            'categories' => $settings->enabled ? $this->productsQuery()->whereNotNull('category')->distinct()->orderBy('category')->pluck('category')->merge(\App\Models\MedicationCatalogItem::publishedInPharmacy()->get()->map->pharmacyCategory())->unique()->sort()->values() : [],
            'programs' => []]]);
    }

    public function catalogItems(Request $request)
    {
        $publication = app(\App\Services\PharmacyCatalogPublication::class);
        $coordinates = $publication->coordinates($request);
        $data = $request->validate(['q' => 'nullable|string|max:160', 'category' => 'nullable|string|max:255', 'brand' => 'nullable|string|max:200', 'page' => 'nullable|integer|min:1']);
        $query = $publication->itemsQuery();
        if (!PharmacyStoreSetting::current()->enabled) $query->whereRaw('1 = 0');
        if (filled($data['q'] ?? null)) {
            $query->where(fn ($q) => $q->where('name', 'like', '%'.$data['q'].'%')->orWhere('sku', 'like', '%'.$data['q'].'%')->orWhere('description', 'like', '%'.$data['q'].'%')->orWhere('metadata->distinctive_name', 'like', '%'.$data['q'].'%')->orWhereHas('pharmacyOffers', fn ($offer) => $offer->publiclyAvailable()->where('laboratory', 'like', '%'.$data['q'].'%')));
        }
        if (filled($data['category'] ?? null)) {
            $ids = \App\Models\MedicationCatalogItem::publishedInPharmacy()->get()->filter(fn ($item) => $item->pharmacyCategory() === $data['category'])->pluck('id');
            $query->whereIn('id', $ids);
        }
        if (filled($data['brand'] ?? null)) {
            $query->where(fn ($q) => $q->where('metadata->distinctive_name', $data['brand'])->orWhereHas('pharmacyOffers', fn ($offers) => $offers->publiclyAvailable()->where('laboratory', $data['brand'])));
        }
        return response()->json($query->orderBy('name')->orderBy('id')->paginate(24)->withQueryString()->through(fn ($item) => $publication->itemData($item, $coordinates, $request)));
    }

    public function catalogItem(Request $request, int $medication)
    {
        abort_unless(PharmacyStoreSetting::current()->enabled, 404);
        $publication = app(\App\Services\PharmacyCatalogPublication::class);
        $coordinates = $publication->coordinates($request);
        $item = $publication->itemsQuery()->findOrFail($medication);
        return response()->json(['data' => $publication->itemData($item, $coordinates, $request)])->header('Cache-Control', 'no-store');
    }

    public function products(Request $request)
    {
        app(\App\Services\PharmacyCatalogPublication::class)->coordinates($request);
        $data = $request->validate(['q' => 'nullable|string|max:120', 'category' => 'nullable|string|max:100', 'specialty' => 'nullable|string|max:100', 'product_type' => 'nullable|string|max:100', 'page' => 'nullable|integer|min:1']);
        $query = $this->productsQuery();
        if (! PharmacyStoreSetting::current()->enabled) {
            $query->whereRaw('1 = 0');
        }
        if (! empty($data['q'])) {
            $query->where('name', 'like', '%'.$data['q'].'%');
        }
        foreach (['category', 'specialty', 'product_type'] as $filter) {
            if (! empty($data[$filter])) {
                $query->where($filter, $data[$filter]);
            }
        }

        return response()->json($query->orderByDesc('featured')->orderBy('name')->paginate(24)->through(fn ($p) => $this->productData($p, $request)));
    }

    public function product(Request $request, int $product)
    {
        abort_unless(PharmacyStoreSetting::current()->enabled, 404);

        return response()->json(['data' => $this->productData($this->productsQuery()->findOrFail($product), $request)]);
    }

    public function productImage(int $product, PharmacyProductImageService $images)
    {
        abort_unless(PharmacyStoreSetting::current()->enabled, 404);

        return $images->response($this->productsQuery()->findOrFail($product));
    }

    private function productData(PharmacyProduct $p, Request $request): array
    {
        $publication = app(\App\Services\PharmacyCatalogPublication::class);
        return $publication->offerData($p, $publication->coordinates($request), $request);
    }

    public function orders(Request $request)
    {
        return response()->json(PharmacyStoreOrder::query()->where('user_id', $request->user()->id)->latest('id')->paginate(20));
    }

    public function order(Request $request, int $order)
    {
        return response()->json(['data' => PharmacyStoreOrder::query()->where('user_id', $request->user()->id)->findOrFail($order)]);
    }

    public function storeOrder(Request $request)
    {
        $data = $request->validate([
            'client_request_id' => 'required|uuid', 'items' => 'required|array|min:1|max:50',
            'items.*.product_id' => 'required|integer|distinct', 'items.*.quantity' => 'required|integer|min:1|max:99',
            'prescription_id' => 'nullable|integer', 'prescription_upload_id' => 'nullable|integer',
            'delivery_method' => 'required|in:delivery', 'terms_accepted' => 'required|accepted',
            'address' => 'required|array:name,street,neighborhood,postal_code,references',
            'address.name' => 'required|string|max:150', 'address.street' => 'required|string|max:250',
            'address.neighborhood' => 'required|string|max:150', 'address.postal_code' => 'required|regex:/^[0-9]{5}$/',
            'address.references' => 'nullable|string|max:500']);
        $order = DB::transaction(function () use ($request, $data) {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);
            $existing = PharmacyStoreOrder::query()->where('user_id', $user->id)->where('client_request_id', $data['client_request_id'])->first();
            if ($existing) {
                return $existing;
            }
            $settings = PharmacyStoreSetting::query()->whereKey(1)->lockForUpdate()->first();
            abort_unless($settings?->enabled, 503, 'La farmacia digital no está disponible.');
            $patient = $user->patient;
            abort_unless($patient, 403, 'Se requiere un perfil de paciente.');
            $prescription = null;
            $upload = null;
            if (! empty($data['prescription_id'])) {
                $prescription = Prescription::query()->where('patient_id', $patient->id)->find($data['prescription_id']);
                if (! $prescription) {
                    throw ValidationException::withMessages(['prescription_id' => 'La receta no pertenece al paciente.']);
                }
            }
            if (! empty($data['prescription_upload_id'])) {
                $upload = PharmacyPrescriptionUpload::query()->where('user_id', $user->id)->where('patient_id', $patient->id)->where('status', 'pending_review')->find($data['prescription_upload_id']);
                if (! $upload) {
                    throw ValidationException::withMessages(['prescription_upload_id' => 'La receta adjunta no está disponible para este paciente.']);
                }
            }
            $items = [];
            $subtotalCents = 0;
            foreach ($data['items'] as $item) {
                $product = $this->productsQuery()->lockForUpdate()->find($item['product_id']);
                if (! $product || $product->stock < $item['quantity']) {
                    throw ValidationException::withMessages(['items' => 'Un producto ya no está disponible o excede las existencias.']);
                }
                if ($product->medication_catalog_item_id) {
                    $catalogItem = \App\Models\MedicationCatalogItem::publishedInPharmacy()->lockForUpdate()->find($product->medication_catalog_item_id);
                    if (!$catalogItem) throw ValidationException::withMessages(['items' => 'El producto fue retirado del catálogo de farmacia digital.']);
                    $product->requires_prescription = $catalogItem->requires_prescription;
                    $product->name = $catalogItem->name;
                    $product->sku = $catalogItem->sku;
                }
                // Lock authorization too: disabling a distributor cannot race a new submission.
                $provider = Provider::query()->lockForUpdate()->find($product->provider_id);
                $providerUser = User::query()->lockForUpdate()->find($provider?->user_id);
                if (! $provider?->digital_pharmacy_enabled || $provider->status !== 'active' || ! $providerUser || $providerUser->status !== 'active' || $providerUser->role !== 'provider') {
                    throw ValidationException::withMessages(['items' => 'El distribuidor ya no está disponible.']);
                }
                if ($product->requires_prescription && ! $prescription && ! $upload) {
                    throw ValidationException::withMessages(['prescription_id' => 'Selecciona o adjunta una receta del paciente. Quedará pendiente de revisión.']);
                }
                $priceCents = (int) round((float) $product->price * 100);
                $lineCents = $priceCents * $item['quantity'];
                $subtotalCents += $lineCents;
                $items[] = ['product_id' => $product->id, 'catalog_item_id' => $product->medication_catalog_item_id, 'sku' => $product->sku, 'provider_id' => $product->provider_id, 'provider_name' => $provider->name, 'provider_is_klini' => $settings->klini_provider_id !== null && $provider->id === $settings->klini_provider_id, 'name' => $product->name, 'quantity' => $item['quantity'],
                    'unit_price' => number_format($priceCents / 100, 2, '.', ''), 'total' => number_format($lineCents / 100, 2, '.', ''), 'requires_prescription' => (bool) $product->requires_prescription];
            }
            $shippingCents = (int) round((float) $settings->shipping_fee * 100);
            if ($subtotalCents + $shippingCents > 100000000) {
                throw ValidationException::withMessages(['items' => 'El importe excede el máximo por solicitud. Reduce las cantidades.']);
            }

            return PharmacyStoreOrder::query()->create([
                'user_id' => $user->id, 'client_request_id' => $data['client_request_id'], 'prescription_id' => $prescription?->id, 'prescription_upload_id' => $upload?->id,
                'prescription_status' => ($prescription || $upload) ? 'pending_review' : null,
                'items' => $items, 'subtotal' => number_format($subtotalCents / 100, 2, '.', ''), 'shipping_fee' => number_format($shippingCents / 100, 2, '.', ''),
                'total' => number_format(($subtotalCents + $shippingCents) / 100, 2, '.', ''), 'currency' => 'MXN', 'status' => 'submitted', 'payment_status' => 'not_configured',
                'address' => $data['address'], 'delivery_method' => 'delivery', 'terms_accepted_at' => now(), 'purchase_terms' => $settings->purchase_terms]);
        }, 3);

        return response()->json(['data' => $order], $order->wasRecentlyCreated ? 201 : 200);
    }
}
