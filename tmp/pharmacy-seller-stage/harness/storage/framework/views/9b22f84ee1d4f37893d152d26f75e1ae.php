<?php
    $paths = [
        'summary' => 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
        'catalog' => 'M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM8 3v18M11 8h6M11 12h6',
        'inventory' => 'm12 3 9 5v9l-9 5-9-5V8l9-5ZM3 8l9 5 9-5M12 13v9M7.5 5.5l9 5',
        'orders' => 'M8 5H5v16h14V5h-3M9 3h6v4H9zM8 12h8M8 16h6',
        'deliveries' => 'M3 5h11v12H3zM14 9h4l3 4v4h-7M6 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM18 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
        'store' => 'M4 10v11h16V10M3 10l2-7h14l2 7M3 10c0 4 5 4 5 0 0 4 8 4 8 0 0 4 5 4 5 0M10 21v-6h4v6',
        'reports' => 'M4 3v18h17M8 17v-6M13 17V6M18 17V9',
        'settings' => 'M3 6h7M14 6h7M3 12h12M19 12h2M3 18h2M9 18h12M10 3v6M15 9v6M5 15v6',
        'edit' => 'm15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15l-1 5Z',
        'search' => 'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM16 16l5 5',
        'check' => 'm5 12 4 4L19 6',
        'shield' => 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
        'pill' => 'm8 5-3 3a6 6 0 0 0 8 8l3-3a6 6 0 0 0-8-8ZM7 6l11 11',
        'plus' => 'M12 4v16M4 12h16', 'chevron' => 'm9 5 7 7-7 7',
    ];
?>
<svg class="klini-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="<?php echo e($paths[$icon] ?? $paths['catalog']); ?>" /></svg><?php /**PATH C:\laragon\www\dr-sam\resources\views/pharmacy-store/distributor/icon.blade.php ENDPATH**/ ?>