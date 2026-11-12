@extends('layouts.app', ['title' => $section === 'distributors' ? 'Distribuidores' : 'Farmacia digital'])
@section('body_class', 'superadmin-native-body superadmin-catalog-body')
@push('styles')<link rel="stylesheet" href="{{ asset('css/pharmacy-store-admin.css') }}?v={{ filemtime(public_path('css/pharmacy-store-admin.css')) }}">@endpush
@php($distributorErrors = $section === 'distributors' && $errors->hasAny(['name', 'email', 'username', 'password', 'user_id']))
@section('content')
<div class="superadmin-native-screen">
@include('superadmin._topbar')
@include('superadmin._sidebar', ['active' => $section === 'distributors' ? 'distributors' : 'digital-pharmacy'])
<section class="superadmin-native-workspace pharmacy-store-admin">
<h1 class="superadmin-native-page-title">{{ $section === 'distributors' ? 'Distribuidores' : 'Farmacia digital' }}</h1>
@include('superadmin._filter-carousel', ['carouselOptions' => $section === 'distributors' ? ['list' => 'Distribuidores', 'create' => 'Nuevo distribuidor'] : ['catalog' => 'Catálogo', 'visual' => 'Presentación', 'klini' => 'Ofertas Klini', 'orders' => 'Solicitudes'], 'carouselSelected' => $section === 'distributors' ? 'list' : request('section', 'catalog'), 'carouselParameter' => 'section'])
@if($errors->any() && !$distributorErrors)<div role="alert" class="pharmacy-notice">@foreach($errors->all() as $error)<p>{{ $error }}</p>@endforeach</div>@endif
@if(session('status'))<p role="status" class="pharmacy-notice">{{ session('status') }}</p>@endif
@if($section === 'distributors')
<section class="superadmin-native-catalog-card"><header class="superadmin-native-section-heading"><h2>Distribuidores registrados</h2><button type="button" data-new-distributor aria-haspopup="dialog" aria-controls="new-distributor-dialog">Nuevo distribuidor</button></header>
<div class="superadmin-native-catalog-scroll"><table class="superadmin-native-catalog-table"><thead><tr><th>Distribuidor</th><th>Cuenta</th><th>Estado</th><th>Farmacia digital</th></tr></thead><tbody>
@forelse($providers as $provider)<tr><td>{{ $provider->name }} @if($provider->user?->is_demo)<small>Cuenta demo</small>@endif</td><td>{{ $provider->user?->email ?? 'Sin cuenta vinculada' }}</td><td>{{ ['active'=>'Activo', 'inactive'=>'Inactivo'][$provider->status] ?? 'Estado por confirmar' }}</td><td><form method="POST" action="{{ route('superadmin.distributors.publication', $provider) }}">@csrf @method('PATCH')<input type="hidden" name="digital_pharmacy_enabled" value="{{ $provider->digital_pharmacy_enabled ? 0 : 1 }}"><button>{{ $provider->digital_pharmacy_enabled ? 'Inactivar publicación' : 'Activar publicación' }}</button></form><small>{{ $provider->digital_pharmacy_enabled ? 'Autorizada' : 'No autorizada' }}</small></td></tr>
@empty<tr><td colspan="4">No hay distribuidores registrados.</td></tr>@endforelse
</tbody></table></div>{{ $providers->links() }}</section>
@elseif(request('section') === 'orders')
<section class="superadmin-native-catalog-card"><h2>Control de solicitudes</h2><p class="pharmacy-notice">Estos registros son solicitudes de revisión, no ventas cobradas. Pagos y envíos no están integrados. “Lista” significa revisión administrativa concluida, no dispensación ni entrega.</p>
<div class="superadmin-native-catalog-scroll"><table class="superadmin-native-catalog-table"><thead><tr><th>Folio</th><th>Contacto y dirección solicitada</th><th>Productos</th><th>Total de referencia</th><th>Receta</th><th>Estado</th></tr></thead><tbody>
@forelse($orders as $order)<tr><td>#{{ $order->id }}</td><td><strong>{{ $order->user?->name ?? 'Usuario no disponible' }}</strong><div>{{ $order->user?->email }}</div><p>Destinatario: {{ $order->address['name'] ?? 'No especificado' }}</p><div>{{ $order->address['street'] ?? '' }}</div><div>{{ $order->address['neighborhood'] ?? '' }}</div><div>C.P. {{ $order->address['postal_code'] ?? '' }}</div>@if(!empty($order->address['references']))<small>Referencias: {{ $order->address['references'] }}</small>@endif</td><td>@foreach($order->items ?? [] as $item)<div>{{ $item['name'] ?? $item['product_name'] ?? 'Producto' }} × {{ $item['quantity'] ?? 0 }}</div>@endforeach</td><td>${{ number_format((float)$order->total, 2) }} {{ $order->currency }}<br>Sin cobro</td><td>@if($order->prescription_upload_id)<a href="{{ route('superadmin.digital-pharmacy.orders.prescription', $order) }}">Descargar receta adjunta</a><small>Pendiente de revisión clínica; la descarga no valida la receta.</small>@elseif($order->prescription_id)Vinculada para revisión clínica@else Sin receta vinculada @endif</td><td>{{ ['submitted'=>'Solicitud recibida', 'reviewing'=>'En revisión', 'ready'=>'Listo para seguimiento', 'cancelled'=>'Cancelado'][$order->status] ?? 'En seguimiento' }}
@php($next = ['submitted'=>['reviewing'=>'Revisar', 'cancelled'=>'Cancelar'], 'reviewing'=>['ready'=>'Marcar lista', 'cancelled'=>'Cancelar'], 'ready'=>['cancelled'=>'Cancelar']][$order->status] ?? [])
@if($next)<form method="POST" action="{{ route('superadmin.digital-pharmacy.orders.status', $order) }}">@csrf @method('PATCH')<label class="sr-only" for="status-{{ $order->id }}">Nuevo estado</label><select id="status-{{ $order->id }}" name="status">@foreach($next as $value=>$label)<option value="{{ $value }}">{{ $label }}</option>@endforeach</select><button>Actualizar</button></form>@endif</td></tr>
@empty<tr><td colspan="6">Aún no hay solicitudes.</td></tr>@endforelse</tbody></table></div>{{ $orders->links() }}</section>
@elseif(request('section') === 'klini')
@include('pharmacy-store.klini-offers')
@elseif(request('section', 'catalog') === 'catalog')
@include('superadmin.medications.table')
@else
<section class="superadmin-native-catalog-card"><h2>Presentación de la tienda</h2><p>La tienda muestra únicamente productos activos de distribuidores autorizados con cuenta activa.</p>
<form method="POST" action="{{ route('superadmin.digital-pharmacy.settings') }}" class="pharmacy-form">@csrf @method('PUT')
<label>Título<input name="title" value="{{ old('title', $settings->title ?? 'Farmacia digital') }}" required maxlength="120"></label>
<label>Subtítulo<input name="subtitle" value="{{ old('subtitle', $settings->subtitle) }}" maxlength="255"></label>
<label>Distribuidor de venta Klini<select name="klini_provider_id"><option value="" @selected(!old('klini_provider_id', $settings->klini_provider_id))>Sin configurar</option>@if($kliniProvider && !$kliniProviders->contains('id', $kliniProvider->id))<option value="{{ $kliniProvider->id }}" selected>{{ $kliniProvider->name }} · Cuenta no disponible</option>@endif @foreach($kliniProviders as $candidate)<option value="{{ $candidate->id }}" @selected((string)old('klini_provider_id', $settings->klini_provider_id) === (string)$candidate->id)>{{ $candidate->name }}</option>@endforeach</select><small>Identifica una cuenta existente. No cambia su nombre, autorización de publicación, inventario ni precios.</small></label>
<label>Imagen de portada (HTTPS)<input name="banner_image_url" type="url" value="{{ old('banner_image_url', $settings->banner_image_url) }}"><small>Usa una imagen publicada sin información personal.</small></label>
<label>Color principal<input type="color" name="accent_color" value="{{ old('accent_color', $settings->accent_color ?? '#176B65') }}"></label>
<label>Visibilidad<select name="enabled"><option value="0" @selected(!old('enabled', $settings->enabled))>Tienda cerrada</option><option value="1" @selected(old('enabled', $settings->enabled))>Tienda abierta</option></select></label>
<label>Costo de envío de referencia (MXN)<input name="shipping_fee" type="number" step="0.01" min="0" value="{{ old('shipping_fee', $settings->shipping_fee ?? 0) }}" required></label>
<label>Estimación de entrega<input name="delivery_estimate" value="{{ old('delivery_estimate', $settings->delivery_estimate) }}" maxlength="255"></label>
<label>Términos de compra (HTTPS)<input name="purchase_terms" type="url" value="{{ old('purchase_terms', $settings->purchase_terms) }}"></label><button>Guardar presentación</button></form></section>
@endif
</section></div>
@if($section === 'distributors')
  @include('pharmacy-store._distributor-dialog')
  @push('scripts')
    <script src="{{ asset('js/pharmacy-distributor-dialog.js') }}?v={{ filemtime(public_path('js/pharmacy-distributor-dialog.js')) }}" defer></script>
  @endpush
@endif
@endsection
