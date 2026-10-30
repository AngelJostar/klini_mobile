@props(['name' => 'module'])
@php
  $key = mb_strtolower($name);
  $path = match (true) {
    $key === 'insurance-medical' => 'M9 3h6v4H9z M3 7h18v14H3z M12 11v6 M9 14h6',
    $key === 'insurance-life' => 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z',
    $key === 'admin-doctor' => 'M18 21v-2a6 6 0 0 0-12 0v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    $key === 'admin-medication' => 'm9 15 6-6 M5 19a5 5 0 0 1 0-7l7-7a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7 0z',
    $key === 'admin-device' => 'M3 3h18v18H3z M5 12h3l2-5 4 10 2-5h3',
    $key === 'admin-subscription' => 'M4 3h16v18H4z M7 7h10 M7 11h6 M7 15h3 M16 14v4m-2-2h4',
    $key === 'admin-document' => 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h6',
    str_contains($key, 'pacient'), str_contains($key, 'usuario'), str_contains($key, 'medic'), str_contains($key, 'doctor') => 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    str_contains($key, 'instit'), str_contains($key, 'unidad'), str_contains($key, 'unit'), str_contains($key, 'hospital') => 'M3 21h18 M5 21V7h14v14 M8 3h8v4 M9 11h1 M14 11h1 M9 15h1 M14 15h1 M10 21v-3h4v3',
    str_contains($key, 'asegur'), str_contains($key, 'insurance'), str_contains($key, 'permis'), str_contains($key, 'rol') => 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11 M8 12l3 3 5-6',
    str_contains($key, 'mensaje') => 'M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z M7 8h10 M7 12h7',
    str_contains($key, 'alert'), str_contains($key, 'vencer'), str_contains($key, 'vencid') => 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
    str_contains($key, 'reporte'), str_contains($key, 'auditor') => 'M4 3v18h17 M8 16v-4 M13 16V8 M18 16V5',
    str_contains($key, 'document'), str_contains($key, 'factur'), str_contains($key, 'poliz') => 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h6',
    default => 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  };
@endphp
<svg {{ $attributes->class(['klini-icon']) }} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="{{ $path }}"/></svg>
