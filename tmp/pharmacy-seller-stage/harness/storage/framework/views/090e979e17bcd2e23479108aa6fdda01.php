<!doctype html>
<?php
    $patientSourceLayout = request()->routeIs('patient.dashboard');
    $baseStylesheet = $patientSourceLayout ? 'css/patient-portal-source.css' : 'css/drsam.css';
    $tableFiltersScript = $patientSourceLayout ? 'js/patient-portal-table-filters.js' : 'js/drsam-table-filters.js';
?>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script>try { if (window.frameElement?.hasAttribute('data-unit-operation-frame')) document.documentElement.classList.add('unit-operation-embedded'); if (window.frameElement?.hasAttribute('data-operational-detail-frame')) document.documentElement.classList.add('operational-detail-embedded'); } catch (_) {}</script>
    <title><?php echo e(isset($title) ? (str_contains($title, 'Klini') ? $title : $title.' | Klini') : 'Klini'); ?></title>
    <meta name="theme-color" content="#082441">
    <link rel="icon" type="image/svg+xml" href="<?php echo e(asset('brand/klini/favicon.svg')); ?>">
    <?php if (! ($patientSourceLayout)): ?>
      <link rel="preload" href="<?php echo e(asset('brand/klini/dejavu.woff')); ?>" as="font" type="font/woff" crossorigin>
    <?php endif; ?>
    <link rel="stylesheet" href="<?php echo e(asset($baseStylesheet)); ?>?v=<?php echo e(filemtime(public_path($baseStylesheet))); ?>">
    <?php echo $__env->yieldPushContent('styles'); ?>
    <?php if (! ($patientSourceLayout)): ?>
    <link rel="stylesheet" href="<?php echo e(asset('css/klini-brand.css')); ?>?v=<?php echo e(filemtime(public_path('css/klini-brand.css'))); ?>">
    <link rel="stylesheet" href="<?php echo e(asset('css/klini-workspace.css')); ?>?v=<?php echo e(filemtime(public_path('css/klini-workspace.css'))); ?>">
    <link rel="stylesheet" href="<?php echo e(asset('css/klini-system.css')); ?>?v=<?php echo e(filemtime(public_path('css/klini-system.css'))); ?>">
    <link rel="stylesheet" href="<?php echo e(asset('css/klini-carousels.css')); ?>?v=<?php echo e(filemtime(public_path('css/klini-carousels.css'))); ?>">
    <?php endif; ?>
    <link rel="stylesheet" href="<?php echo e(asset('css/platform-density.css')); ?>?v=<?php echo e(filemtime(public_path('css/platform-density.css'))); ?>">
    <link rel="stylesheet" href="<?php echo e(asset('css/unit-operation-embed.css')); ?>?v=<?php echo e(filemtime(public_path('css/unit-operation-embed.css'))); ?>">
    <?php if(request()->routeIs('operational.*', 'outpatient.*', 'external-pharmacy.*')): ?>
      <link rel="stylesheet" href="<?php echo e(asset('css/operational-table-scroll.css')); ?>?v=<?php echo e(filemtime(public_path('css/operational-table-scroll.css'))); ?>">
    <?php endif; ?>
  </head>
  <body class="native-shell <?php echo $__env->yieldContent('body_class'); ?>">
    <main class="shell">
      <?php echo $__env->yieldContent('content'); ?>
    </main>
    <?php echo $__env->yieldPushContent('scripts'); ?>
    <script src="<?php echo e(asset('js/unit-operation-embed.js')); ?>?v=<?php echo e(filemtime(public_path('js/unit-operation-embed.js'))); ?>" defer></script>
    <script src="<?php echo e(asset($tableFiltersScript)); ?>?v=<?php echo e(filemtime(public_path($tableFiltersScript))); ?>" defer></script>
    <?php if(request()->routeIs('operational.*', 'outpatient.*', 'external-pharmacy.*')): ?>
      <script src="<?php echo e(asset('js/operational-table-scroll.js')); ?>?v=<?php echo e(filemtime(public_path('js/operational-table-scroll.js'))); ?>" defer></script>
    <?php endif; ?>
    <?php if (! ($patientSourceLayout)): ?>
    <script src="<?php echo e(asset('js/klini-carousels.js')); ?>?v=<?php echo e(filemtime(public_path('js/klini-carousels.js'))); ?>" defer></script>
    <?php endif; ?>
  </body>
</html>
<?php /**PATH C:\laragon\www\dr-sam\resources\views/layouts/app.blade.php ENDPATH**/ ?>