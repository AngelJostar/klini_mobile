<!doctype html>
@php
    $patientSourceLayout = request()->routeIs('patient.dashboard');
    $baseStylesheet = $patientSourceLayout ? 'css/patient-portal-source.css' : 'css/drsam.css';
    $tableFiltersScript = $patientSourceLayout ? 'js/patient-portal-table-filters.js' : 'js/drsam-table-filters.js';
@endphp
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ isset($title) ? (str_contains($title, 'Klini') ? $title : $title.' | Klini') : 'Klini' }}</title>
    <meta name="theme-color" content="#082441">
    <link rel="icon" type="image/svg+xml" href="{{ asset('brand/klini/favicon.svg') }}">
    @unless($patientSourceLayout)
      <link rel="preload" href="{{ asset('brand/klini/dejavu.woff') }}" as="font" type="font/woff" crossorigin>
    @endunless
    <link rel="stylesheet" href="{{ asset($baseStylesheet) }}?v={{ filemtime(public_path($baseStylesheet)) }}">
    @stack('styles')
    @unless($patientSourceLayout)
    <link rel="stylesheet" href="{{ asset('css/klini-brand.css') }}?v={{ filemtime(public_path('css/klini-brand.css')) }}">
    <link rel="stylesheet" href="{{ asset('css/klini-workspace.css') }}?v={{ filemtime(public_path('css/klini-workspace.css')) }}">
    <link rel="stylesheet" href="{{ asset('css/klini-system.css') }}?v={{ filemtime(public_path('css/klini-system.css')) }}">
    <link rel="stylesheet" href="{{ asset('css/klini-carousels.css') }}?v={{ filemtime(public_path('css/klini-carousels.css')) }}">
    @endunless
  </head>
  <body class="native-shell @yield('body_class')">
    <main class="shell">
      @yield('content')
    </main>
    @stack('scripts')
    <script src="{{ asset($tableFiltersScript) }}?v={{ filemtime(public_path($tableFiltersScript)) }}" defer></script>
    @unless($patientSourceLayout)
    <script src="{{ asset('js/klini-carousels.js') }}?v={{ filemtime(public_path('js/klini-carousels.js')) }}" defer></script>
    @endunless
  </body>
</html>
