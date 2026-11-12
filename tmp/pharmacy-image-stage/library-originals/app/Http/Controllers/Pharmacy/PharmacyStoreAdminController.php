<?php
namespace App\Http\Controllers\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\{Provider, User, PharmacyProduct, PharmacyStoreOrder, PharmacyStoreSetting};
use App\Services\PharmacyProductImageService;
use Illuminate\Http\Request;
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
        return view('pharmacy-store.admin', ['section' => 'pharmacy', 'settings' => PharmacyStoreSetting::find(1) ?? new PharmacyStoreSetting(['enabled' => false]), 'orders' => PharmacyStoreOrder::with('user')->latest()->paginate(20)]);
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
        return view('pharmacy-store.products', ['provider' => $provider, 'products' => PharmacyProduct::where('provider_id', $provider->id)->latest()->paginate(15)]);
    }

    public function providerOrders(Request $request)
    {
        $provider = $this->provider($request);
        $page = max(1, (int) $request->query('page', 1));
        $perPage = 15;
        $total = 0;
        $rows = [];
        // Stream snapshots for database portability; never pass order models to this view.
        foreach (PharmacyStoreOrder::query()->select(['id', 'status', 'created_at', 'items'])->latest()->cursor() as $order) {
            $items = collect($order->items ?? [])->filter(fn ($item) => is_array($item) && (int) ($item['provider_id'] ?? 0) === (int) $provider->id)
                ->map(fn ($item) => array_intersect_key($item, array_flip(['product_id', 'name', 'quantity', 'unit_price', 'total'])))->values()->all();
            if (!$items) {
                continue;
            }
            $total++;
            if ($total <= ($page - 1) * $perPage || $total > $page * $perPage) {
                continue;
            }
            $subtotalCents = 0;
            foreach ($items as $item) {
                $subtotalCents += (int) round((float) ($item['unit_price'] ?? 0) * 100) * (int) ($item['quantity'] ?? 0);
            }
            $rows[] = ['id' => $order->id, 'status' => $order->status, 'created_at' => $order->created_at, 'items' => $items, 'subtotal' => number_format($subtotalCents / 100, 2, '.', '')];
        }
        $orders = new \Illuminate\Pagination\LengthAwarePaginator($rows, $total, $perPage, $page, ['path' => $request->url()]);
        return view('pharmacy-store.provider-orders', compact('provider', 'orders'));
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
        $data = $this->productData($request);
        DB::transaction(function () use ($request, $provider, $data, $images) {
            $product = PharmacyProduct::create($data + ['provider_id' => $provider->id]);
            if ($request->hasFile('image')) {
                $images->store($product, $request->file('image'));
            }
        });
        return back()->with('status', 'Producto creado. Su visibilidad depende de la autorización del superadministrador.');
    }

    public function updateProduct(Request $request, PharmacyProduct $product, PharmacyProductImageService $images)
    {
        $provider = $this->provider($request);
        abort_unless((int) $product->provider_id === (int) $provider->id, 404);
        $data = $this->productData($request);
        DB::transaction(function () use ($request, $product, $data, $images) {
            $product->update($data);
            if ($request->hasFile('image')) {
                $images->store($product, $request->file('image'));
            } elseif ($request->boolean('use_external_image')) {
                $metadata = $product->metadata ?? [];
                unset($metadata[PharmacyProduct::STORE_IMAGE_METADATA_KEY]);
                $product->update(['metadata' => $metadata]);
            }
        });
        return back()->with('status', 'Producto actualizado.');
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
    private function productData(Request $request): array
    {
        $data = $request->validate(['name' => 'required|string|max:200', 'description' => 'nullable|string|max:3000', 'category' => 'nullable|string|max:100', 'laboratory' => 'nullable|string|max:200', 'specialty' => 'nullable|string|max:100', 'product_type' => 'nullable|string|max:100', 'compare_at_price' => 'nullable|numeric|min:0|max:999999.99|decimal:0,2', 'presentation' => 'nullable|string|max:200', 'price' => 'required|numeric|min:0|max:999999.99|decimal:0,2', 'stock' => 'required|integer|min:0|max:1000000', 'status' => ['required', Rule::in(['active', 'inactive'])], 'featured' => 'sometimes|boolean', 'requires_prescription' => 'required|boolean', 'image_url' => array_merge($this->publicUrlRules(), [Rule::requiredIf($request->boolean('use_external_image'))]), 'image' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'mimetypes:image/jpeg,image/png,image/webp', 'max:5120', 'dimensions:min_width=120,min_height=120,max_width=4096,max_height=4096', Rule::prohibitedIf($request->boolean('use_external_image'))], 'use_external_image' => 'sometimes|boolean']);
        unset($data['image'], $data['use_external_image']);

        return $data;
    }
}
