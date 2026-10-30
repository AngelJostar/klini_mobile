@php
$insuranceIconPaths = [
 'shield'=>'M12 3 21 7v6c0 5-5 9-9 11C8 22 3 18 3 13V7l9-4Z M12 11c-4-5-9 1 0 7 9-6 4-12 0-7Z',
 'credential'=>'M3 5h18v14H3z M6 15c0-4 6-4 6 0 M9 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4 M15 9h3 M15 12h3 M15 15h3',
 'coverage'=>'M12 3 21 7v6c0 5-5 9-9 11C8 22 3 18 3 13V7l9-4Z M8 12h8 M12 8v8',
 'network'=>'M3 21V9h4V3h10v6h4v12H3 M9 21v-5h6v5 M10 7h4 M12 5v4 M7 12h1 M16 12h1',
 'documents'=>'M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8 M8 16h5',
 'calendar'=>'M4 5h16v16H4z M8 3v5 M16 3v5 M4 10h16 M8 14h1 M12 14h1 M16 14h1',
 'money'=>'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M15 8c-5-3-8 3-3 4 5 1 2 7-3 4 M12 6v12',
 'coins'=>'M3 7c0-4 10-4 10 0s-10 4-10 0 M3 7v5c0 4 10 4 10 0V7 M11 12c0-4 10-4 10 0s-10 4-10 0 M11 12v5c0 4 10 4 10 0v-5',
 'phone'=>'M7 3 3 6c0 8 7 15 15 15l3-4-5-3-3 3c-3-1-5-3-6-6l3-3-3-5Z',
 'chat'=>'M12 3c-12 0-12 15 0 15h4l5 3-1-7c3-7-1-11-8-11 M7 10h.1 M12 10h.1 M17 10h.1',
 'assistance'=>'M4 13V9a8 8 0 0 1 16 0v4 M4 11H2v7h4v-7H4 M20 11h2v7h-4v-7h2 M20 18c0 4-4 4-7 4 M11 21h3v2h-3z M12 8c-4-4-8 2 0 6 8-4 4-10 0-6',
 'user'=>'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-2c0-9 16-9 16 0v2H4',
 'check'=>'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M7 12l3 3 7-7',
 'lock'=>'M6 10h12v11H6z M8 10V6c0-6 8-6 8 0v4 M12 14v3',
 'pin'=>'M12 2c-11 0-8 13 0 20 8-7 11-20 0-20 M12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
];
@endphp
<svg class="ki-icon" viewBox="0 0 24 26" fill="none" aria-hidden="true" focusable="false"><path d="{{ $insuranceIconPaths[$icon] ?? $insuranceIconPaths['documents'] }}"/></svg>