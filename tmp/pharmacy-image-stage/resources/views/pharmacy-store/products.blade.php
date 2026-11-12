@extends('layouts.app', ['title' => 'Distribuidor de medicamentos'])
@section('body_class', 'superadmin-native-body superadmin-catalog-body')
@push('styles')
<link rel="stylesheet" href="{{ asset('css/superadmin-workspace.css') }}"><link rel="stylesheet" href="{{ asset('css/superadmin-catalog.css') }}"><link rel="stylesheet" href="{{ asset('css/pharmacy-store-admin.css') }}">
@endpush
@push('scripts')<script src="{{ asset('js/superadmin-workspace.js') }}" defer></script>@endpush
@section('content')
<div class="superadmin-native-screen">
<header class="superadmin-native-topbar"><div class="superadmin-native-brand"><x-klini-brand label="Distribuidor de medicamentos" /></div><div class="superadmin-native-session"><x-klini-session-menu :show-profile="true" /></div></header>
<aside class="superadmin-native-sidebar"><nav class="superadmin-native-menu"><a class="is-active" href="{{ route('provider.pharmacy.products') }}">Mis productos</a><a href="{{ route('provider.pharmacy.orders') }}">Solicitudes propias</a><a href="{{ route('provider.medicines.dashboard') }}">Panel del distribuidor</a></nav></aside>
<section class="superadmin-native-workspace pharmacy-store-admin"><h1 class="superadmin-native-page-title">{{ $provider->name }}</h1>
@include('superadmin._filter-carousel', ['carouselOptions' => ['list'=>'Mis productos', 'create'=>'Nuevo producto'], 'carouselSelected'=>request('section','list'), 'carouselParameter'=>'section'])
@if(session('status'))<p role="status" class="pharmacy-notice">{{ session('status') }}</p>@endif
@if($errors->any())<div role="alert" class="pharmacy-notice">@foreach($errors->all() as $error)<p>{{ $error }}</p>@endforeach</div>@endif
<p class="pharmacy-notice">Publicación {{ $provider->digital_pharmacy_enabled ? 'autorizada' : 'pendiente de autorización del superadministrador' }}. Puedes gestionar tu catálogo aunque no esté visible en la tienda.</p>
@if(request('section') === 'create')
<section class="superadmin-native-catalog-card"><h2>Nuevo producto</h2><form class="pharmacy-form" method="POST" enctype="multipart/form-data" action="{{ route('provider.pharmacy.products.store') }}">@csrf @include('pharmacy-store.product-fields', ['product'=>null])<button>Crear producto</button></form></section>
@else
<section class="superadmin-native-catalog-card"><header class="superadmin-native-section-heading"><h2>Catálogo propio</h2><a href="{{ route('provider.pharmacy.products', ['section'=>'create']) }}">Nuevo producto</a></header>
@forelse($products as $product)
<details class="pharmacy-product"><summary><strong>{{ $product->name }}</strong> · ${{ number_format((float)$product->price,2) }} MXN · {{ $product->stock }} unidades · {{ ['active'=>'Activo', 'inactive'=>'Inactivo'][$product->status] ?? 'Estado por confirmar' }}</summary><form class="pharmacy-form" method="POST" enctype="multipart/form-data" action="{{ route('provider.pharmacy.products.update', $product) }}">@csrf @method('PATCH') @include('pharmacy-store.product-fields', ['product'=>$product])<button>Guardar producto</button></form></details>
@empty<p>Aún no hay productos. Agrega el primero para preparar tu catálogo.</p>@endforelse
{{ $products->links() }}</section>
@endif
</section></div>
@endsection
