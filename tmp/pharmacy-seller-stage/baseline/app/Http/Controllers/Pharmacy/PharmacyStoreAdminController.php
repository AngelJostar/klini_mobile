<?php
namespace App\Http\Controllers\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\{Provider, User, PharmacyProduct, PharmacyStoreOrder, PharmacyStoreSetting};
use App\Services\PharmacyProductImageService;
use App\Services\DistributorWorkspace;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\{DB, Hash};
use Illuminate\Validation\Rule;

class PharmacyStoreAdminController extends Controller
{
    private function admin(Request $request): void
    {
        abort_unless($request->user()?->role === 'superadmin' && $request->user()->status === 'active', 403);
    }

    private function provider(Request $request): Provider
    {
        abort_unless($request->user()?->role === 'provider' && $request->user()->status === 'active', 403);
        return Provider::where('user_id', $request->user()->id)->whereIn('provider_type', ['medicines', 'medication', 'distributor'])->where('status', 'active')->firstOrFail();
    }

    public function index(Request $request)
    {
        $this->admin($request);
        $filters = $request->validate(['q' => 'nullable|string|max:160', 'status' => ['nullable', Rule::in(array_merge(['all'], array_keys(\App\Models\MedicationCatalogItem::STATUS_LABELS)))]]);
        $catalog = app(\App\Services\UniversalMedicationCatalog::class)->definition();
        $query = $catalog['query']();
        if (filled($filters['q'] ?? null)) {
            $query->where(function ($query) use ($catalog, $filters) {
                foreach ($catalog['search'] as $column) {
                    $query->orWhere($column, 'like', '%'.trim($filters['q']).'%');
                }
            });
        }
        if (array_key_exists($filters['status'] ?? '', \App\Models\MedicationCatalogItem::STATUS_LABELS)) {
            $query->where('status', $filters['status']);
        }
        return view('pharmacy-store.admin', [
            'section' => 'pharmacy',
            'settings' => PharmacyStoreSetting::find(1) ?? new PharmacyStoreSetting(['enabled' => false]),
            'orders' => PharmacyStoreOrder::with('user')->latest()->paginate(20),
            'catalog' => $catalog,
            'records' => $query->paginate($catalog['per_page'])->withQueryString(),
            'pharmacyCatalog' => true,
        ]);
    }

    public function distributors(Request $request)
    {
        $this->admin($request);
        return view('pharmacy-store.admin', ['section' => 'distributors', 'providers' => Provider::with('user')->whereIn('provider_type', ['medicines', 'medication', 'distributor'])->latest()->paginate(20), 'demoAccounts' => User::where('is_demo', true)->where('status', 'active')->where('role', 'provider')->where('module', 'provider_medicines')->whereDoesntHave('provider')->orderBy('name')->get(['id', 'name'])]);
    }

    public function linkDemoDistributor(Request $request)
    {
        $this->admin($request);
        $data = $request->validate(['user_id' => 'required|integer|min:1']);
        DB::transaction(function () use ($data) {
            $user = User::whereKey($data['user_id'])->lockForUpdate()->first();
            if (!$user || !$user->is_demo || $user->status !== 'active' || $user->role !== 'provider' || $user->module !== 'provider_medicines' || Provider::where('user_id', $user->id)->exists()) {
                throw \Illuminate\Validation\ValidationException::withMessages(['user_id' => 'Selecciona una cuenta demo activa de distribuidor sin catálogo vinculado.']);
            }
            Provider::create(['user_id' => $user->id, 'name' => $user->name, 'provider_type' => 'medicines', 'status' => 'active', 'digital_pharmacy_enabled' => false]);
        });

        return redirect()->route('superadmin.distributors')->with('status', 'Cuenta demo vinculada. La publicación permanece desactivada.');
    }

    public function storeDistributor(Request $request)
    {
        $this->admin($request);
        $data = $request->validate(['name' => 'required|string|max:200', 'email' => 'required|email|max:200|unique:users,email', 'username' => 'required|alpha_dash|max:100|unique:users,username', 'password' => ['required', 'confirmed', \Illuminate\Validation\Rules\Password::min(12)->mixedCase()->numbers()]]);
        DB::transaction(function () use ($data) {
            $user = User::create(['name' => $data['name'], 'email' => $data['email'], 'username' => $data['username'], 'password' => Hash::make($data['password']), 'role' => 'provider', 'module' => 'provider_medicines', 'status' => 'active', 'account_category' => User::CATEGORY_OPERATIONAL, 'is_demo' => false, 'passwordless_review' => false]);
            Provider::create(['user_id' => $user->id, 'name' => $data['name'], 'provider_type' => 'medicines', 'status' => 'active', 'digital_pharmacy_enabled' => false]);
        });
        return back()->with('status', 'Distribuidor creado. La publicación permanece desactivada. No se envió correo de acceso.');
    }

    public function publication(Request $request, Provider $provider)
    {
        $this->admin($request);
        abort_unless(in_array($provider->provider_type, ['medicines', 'medication', 'distributor'], true), 404);
        $data = $request->validate(['digital_pharmacy_enabled' => 'required|boolean']);
        $provider->update($data);
        return back()->with('status', 'Autorización de publicación actualizada.');
    }

    public function settings(Request $request)
    {
        $this->admin($request);
        $data = $request->validate(['title' => 'required|string|max:120', 'subtitle' => 'nullable|string|max:255', 'banner_image_url' =>  $this->publicUrlRules(), 'accent_color' => ['required', 'regex:/^#[a-fA-F0-9]{6}$/'], 'shipping_fee' => 'required|numeric|min:0|max:999999|decimal:0,2', 'delivery_estimate' => 'nullable|string|max:255', 'purchase_terms' =>  $this->publicUrlRules(), 'enabled' => 'required|boolean']);
        PharmacyStoreSetting::updateOrCreate(['id' => 1], $data);
        return back()->with('status', 'Presentación de la farmacia guardada.');
    }

    public function downloadPrescriptionUpload(Request $request, PharmacyStoreOrder $order, \App\Services\Platform\PlatformAuditService $audit)
    {
        $this->admin($request);
        abort_unless($order->prescription_upload_id, 404);
        $upload = \App\Models\PharmacyPrescriptionUpload::query()
            ->where('user_id', $order->user_id)
            ->whereHas('patient', fn ($query) => $query->where('user_id', $order->user_id))
            ->findOrFail($order->prescription_upload_id);
        $disk = \Illuminate\Support\Facades\Storage::disk('local');
        abort_unless($disk->exists($upload->path), 404);
        $audit->record($request, 'pharmacy.prescription.admin_downloaded', $upload, 'digital_pharmacy', ['order_id' => $order->id]);
        return $disk->download($upload->path, $upload->file_name, [
            'Content-Type' => 'application/octet-stream',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, max-age=0',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
        ]);
    }
    public function orderStatus(Request $request, PharmacyStoreOrder $order)
    {
        $this->admin($request);
        $data = $request->validate(['status' => ['required', Rule::in(['reviewing', 'ready', 'cancelled'])]]);
        DB::transaction(function () use ($order, $data) {
            $locked = PharmacyStoreOrder::lockForUpdate()->findOrFail($order->id);
            $allowed = ['submitted' => ['reviewing', 'cancelled'], 'reviewing' => ['ready', 'cancelled'], 'ready' => ['cancelled'], 'cancelled' => []];
            abort_unless(in_array($data['status'], $allowed[$locked->status] ?? [], true), 422, 'Transición no permitida.');
            $locked->update(['status' => $data['status']]);
        });
        return back()->with('status', 'Solicitud actualizada. No se ha procesado ningún pago.');
    }

    public function products(Request $request)
    {
        $provider = $this->provider($request);
        $workspace = app(DistributorWorkspace::class);
        $allProducts = $workspace->products($provider);
        $filters = $this->catalogFilters($request);
        $columnFilters = app(\App\Services\DistributorTableFilters::class)->products($request, $workspace->filter($allProducts, $filters), 'catalog', $workspace);
        $groups = $this->paginateRows($workspace->groups($columnFilters['rows']), $request, 8);
        $editingProduct = $request->filled('edit') ? PharmacyProduct::where('provider_id', $provider->id)->findOrFail($request->integer('edit')) : null;

        return view('pharmacy-store.products', [
            'provider' => $provider, 'section' => 'catalog', 'groups' => $groups,
            'products' => collect($groups->items())->pluck('items')->flatten(1)->unique('id'),
            'metrics' => $workspace->metrics($allProducts), 'filters' => $filters,
            'workspace' => $workspace, 'editingProduct' => $editingProduct, 'columnFilters' => $columnFilters,
            'demoImageOptions' => $this->canUseDemoImages($request, $provider) ? PharmacyProductImageService::demoOptions() : [],
        ]);
    }

    private function catalogFilters(Request $request): array
    {
        return $request->validate([
            'q' => 'nullable|string|max:200', 'page' => 'nullable|integer|min:1',
            'stock' => ['nullable', Rule::in(['all', 'available', 'empty', 'low'])],
            'status' => ['nullable', Rule::in(['all', 'active', 'inactive'])],
            'edit' => 'nullable|integer|min:1',
        ]);
    }

    private function paginateRows(Collection $rows, Request $request, int $perPage = 15): LengthAwarePaginator
    {
        $page = max(1, $request->integer('page', 1));
        return new LengthAwarePaginator($rows->forPage($page, $perPage)->values(), $rows->count(), $perPage, $page, ['path' => $request->url(), 'query' => $request->query()]);
    }

    public function workspace(Request $request, string $section)
    {
        $provider = $this->provider($request);
        $workspace = app(DistributorWorkspace::class);
        $allProducts = $workspace->products($provider);
        $filters = $this->catalogFilters($request);
        $productRows = $workspace->filter($allProducts, $filters);
        $columnFilters = null;
        $orders = in_array($section, ['summary', 'reports', 'deliveries'], true) ? $workspace->orders($provider) : collect();
        $orderCounts = $orders->countBy('status');
        $settings = PharmacyStoreSetting::current();
        $visibleIds = $settings->enabled ? PharmacyProduct::where('provider_id', $provider->id)->publiclyAvailable()->pluck('id') : collect();
        if ($section === 'store') {
            $request->validate(['visibility' => ['nullable', Rule::in(['all', 'visible', 'hidden'])]]);
            $productRows = $productRows->filter(fn ($product) => match ($request->query('visibility', 'all')) {
                'visible' => $visibleIds->contains($product->id),
                'hidden' => !$visibleIds->contains($product->id),
                default => true,
            });
        }
        if ($section === 'deliveries') {
            $request->validate(['order_status' => ['nullable', Rule::in(['all', 'submitted', 'reviewing', 'ready'])]]);
            $orders = $orders->where('status', '!=', 'cancelled');
            if ($request->filled('order_status') && $request->query('order_status') !== 'all') {
                $orders = $orders->where('status', $request->query('order_status'));
            }
        }
        if (in_array($section, ['summary', 'deliveries'], true)) {
            $columnFilters = app(\App\Services\DistributorTableFilters::class)->orders($request, $orders);
            $orders = $section === 'deliveries' ? $this->paginateRows($columnFilters['rows'], $request) : $columnFilters['rows'];
        } elseif (in_array($section, ['inventory', 'store'], true)) {
            $columnFilters = app(\App\Services\DistributorTableFilters::class)->products($request, $productRows, $section, $workspace, $visibleIds);
            $productRows = $columnFilters['rows'];
        }
        $products = $this->paginateRows($productRows, $request);

        return view('pharmacy-store.distributor.workspace', [
            'provider' => $provider, 'section' => $section, 'workspace' => $workspace,
            'products' => $products, 'metrics' => $workspace->metrics($allProducts), 'filters' => $filters, 'columnFilters' => $columnFilters,
            'orders' => $orders, 'orderCounts' => $orderCounts, 'settings' => $settings, 'visibleIds' => $visibleIds,
            'attentionProducts' => $allProducts->where('stock', '<=', 5)->sortBy('stock')->take(5),
        ]);
    }

    public function updateStock(Request $request, PharmacyProduct $product)
    {
        $provider = $this->provider($request);
        abort_unless((int) $product->provider_id === (int) $provider->id, 404);
        $data = $request->validate(['stock' => 'required|integer|min:0|max:1000000', 'current_stock' => 'required|integer|min:0|max:1000000']);
        DB::transaction(function () use ($product, $data) {
            $locked = PharmacyProduct::lockForUpdate()->findOrFail($product->id);
            if ($locked->stock !== (int) $data['current_stock']) {
                throw \Illuminate\Validation\ValidationException::withMessages(['stock' => 'Las existencias cambiaron. Revisa el valor actual antes de guardar.']);
            }
            $locked->update(['stock' => $data['stock']]);
        });
        return back()->with('status', 'Existencias actualizadas.');
    }

    public function updateProductStatus(Request $request, PharmacyProduct $product)
    {
        $provider = $this->provider($request);
        abort_unless((int) $product->provider_id === (int) $provider->id, 404);
        $data = $request->validate(['status' => ['required', Rule::in(['active', 'inactive'])]]);
        // Set an explicit state so resubmitting the form never reverses the change.
        $product->update(['status' => $data['status']]);

        return back()->with('status', $data['status'] === 'active' ? 'Producto activado.' : 'Producto inactivado. Ya no se muestra en la farmacia digital.');
    }

    public function distributorSettings(Request $request)
    {
        $provider = $this->provider($request);
        $data = $request->validate([
            'name' => 'required|string|max:200', 'pharmacy_address' => 'sometimes|nullable|string|max:500',
            'pharmacy_latitude' => 'nullable|required_with:pharmacy_longitude|numeric|between:-90,90',
            'pharmacy_longitude' => 'nullable|required_with:pharmacy_latitude|numeric|between:-180,180',
        ]);
        $provider->update($data);
        return back()->with('status', 'Datos del distribuidor actualizados.');
    }

    private function canUseDemoImages(Request $request, Provider $provider): bool
    {
        return (bool) $request->user()?->is_demo && $provider->digital_pharmacy_enabled;
    }

    public function demoProductImage(Request $request, string $imageKey, PharmacyProductImageService $images)
    {
        $provider = $this->provider($request);
        abort_unless($this->canUseDemoImages($request, $provider), 403);
        abort_unless(array_key_exists($imageKey, PharmacyProductImageService::demoOptions()), 404);
        $file = $images->demoFile($imageKey);

        return response()->file($file->getPathname(), [
            'Content-Type' => $file->getMimeType(),
            'Content-Disposition' => 'inline; filename="catalogo-demo.png"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, max-age=0',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
        ]);
    }

    public function providerOrders(Request $request)
    {
        $provider = $this->provider($request);
        $request->validate(['order_status' => ['nullable', Rule::in(array_merge(['all'], array_keys(DistributorWorkspace::ORDER_STATUSES)))], 'q' => 'nullable|string|max:200', 'page' => 'nullable|integer|min:1']);
        $rows = app(DistributorWorkspace::class)->orders($provider);
        $orderCounts = $rows->countBy('status');
        if ($request->filled('order_status') && $request->query('order_status') !== 'all') {
            $rows = $rows->where('status', $request->query('order_status'));
        }
        $search = mb_strtolower(trim($request->string('q')->toString()));
        if ($search !== '') {
            $rows = $rows->filter(fn ($row) => str_contains(mb_strtolower('#'.$row['id'].' '.collect($row['items'])->pluck('name')->implode(' ')), $search));
        }
        $columnFilters = app(\App\Services\DistributorTableFilters::class)->orders($request, $rows);
        $orders = $this->paginateRows($columnFilters['rows'], $request);
        return view('pharmacy-store.provider-orders', ['provider' => $provider, 'orders' => $orders, 'orderCounts' => $orderCounts, 'section' => 'orders', 'columnFilters' => $columnFilters]);
    }
    public function productImage(Request $request, PharmacyProduct $product, PharmacyProductImageService $images)
    {
        if ($request->user()?->role === 'superadmin') {
            $this->admin($request);
        } else {
            $provider = $this->provider($request);
            abort_unless((int) $product->provider_id === (int) $provider->id, 404);
        }

        return $images->response($product);
    }

    public function storeProduct(Request $request, PharmacyProductImageService $images)
    {
        $provider = $this->provider($request);
        $data = $this->productData($request, $provider);
        DB::transaction(function () use ($request, $provider, $data, $images) {
            $product = PharmacyProduct::create($data + ['provider_id' => $provider->id]);
            if ($request->hasFile('image')) {
                $images->store($product, $request->file('image'));
            } elseif ($request->filled('demo_image_key')) {
                $images->storeDemo($product, $request->string('demo_image_key')->toString());
            }
        });
        return ($request->has('_editor') ? redirect()->route('provider.pharmacy.products') : back())->with('status', 'Producto creado. Su visibilidad depende de la autorización del superadministrador.');
    }

    public function updateProduct(Request $request, PharmacyProduct $product, PharmacyProductImageService $images)
    {
        $provider = $this->provider($request);
        abort_unless((int) $product->provider_id === (int) $provider->id, 404);
        $data = $this->productData($request, $provider, $product);
        DB::transaction(function () use ($request, $product, $data, $images) {
            $product->update($data);
            if ($request->hasFile('image')) {
                $images->store($product, $request->file('image'));
            } elseif ($request->filled('demo_image_key')) {
                $images->storeDemo($product, $request->string('demo_image_key')->toString());
            } elseif ($request->boolean('use_external_image')) {
                $metadata = $product->metadata ?? [];
                unset($metadata[PharmacyProduct::STORE_IMAGE_METADATA_KEY]);
                $product->update(['metadata' => $metadata]);
            }
        });
        return ($request->has('_editor') ? redirect()->route('provider.pharmacy.products') : back())->with('status', 'Producto actualizado.');
    }

    private function publicUrlRules(): array
    {
        return ['nullable', 'url:https', 'max:2048', function (string $attribute, mixed $value, \Closure $fail): void {
            $parts = parse_url((string) $value);
            if ($parts === false || isset($parts['user']) || isset($parts['pass'])) {
                $fail('La URL no debe incluir usuario ni contraseña.');
            }
        }];
    }
    private function productData(Request $request, Provider $provider, ?PharmacyProduct $product = null): array
    {
        $linked = $product?->medication_catalog_item_id !== null;
        $data = $request->validate([
            'name' => $linked ? 'exclude' : 'required|string|max:200',
            'sku' => $linked ? ['exclude'] : ['nullable', 'string', 'max:100', Rule::unique('pharmacy_products', 'sku')->where('provider_id', $provider->id)->ignore($product?->id)],
            'description' => $linked ? 'exclude' : 'nullable|string|max:3000',
            'category' => $linked ? 'exclude' : 'nullable|string|max:100',
            'laboratory' => 'nullable|string|max:200',
            'specialty' => 'nullable|string|max:100',
            'product_type' => 'nullable|string|max:100',
            'compare_at_price' => 'nullable|numeric|min:0|max:999999.99|decimal:0,2',
            'presentation' => $linked ? 'exclude' : 'nullable|string|max:200',
            'price' => 'required|numeric|min:0|max:999999.99|decimal:0,2',
            'stock' => 'required|integer|min:0|max:1000000',
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'featured' => 'sometimes|boolean',
            'requires_prescription' => $linked ? 'exclude' : 'required|boolean',
            'image_url' => array_merge($this->publicUrlRules(), [Rule::requiredIf($request->boolean('use_external_image'))]),
            'image' => array_merge(['nullable'], PharmacyProductImageService::fileRules(), [Rule::prohibitedIf($request->boolean('use_external_image') || $request->filled('demo_image_key'))]),
            'demo_image_key' => ['nullable', 'string', Rule::in(array_keys(PharmacyProductImageService::demoOptions())), Rule::prohibitedIf(!$this->canUseDemoImages($request, $provider) || $request->hasFile('image') || $request->boolean('use_external_image'))],
            'use_external_image' => 'sometimes|boolean',
        ]);
        unset($data['image'], $data['demo_image_key'], $data['use_external_image']);

        if ($product?->medication_catalog_item_id) {
            // Linked identities and restrictions belong to the universal catalog.
            $item = $product->catalogItem;
            if ($item->sku && PharmacyProduct::where('provider_id', $provider->id)->where('sku', $item->sku)->where('id', '!=', $product->id)->exists()) {
                throw \Illuminate\Validation\ValidationException::withMessages(['sku' => 'Otro producto de tu catálogo usa este SKU. Corrige su identificador antes de guardar.']);
            }
            $data = array_replace($data, [
                'name' => $item->name, 'sku' => $item->sku, 'cnis' => $item->cnis,
                'description' => $item->description, 'presentation' => $item->presentation,
                'category' => $item->pharmacyCategory(), 'requires_prescription' => $item->requires_prescription,
                'controlled' => $item->controlled, 'cold_chain' => $item->cold_chain,
            ]);
        }

        return $data;
    }
}
