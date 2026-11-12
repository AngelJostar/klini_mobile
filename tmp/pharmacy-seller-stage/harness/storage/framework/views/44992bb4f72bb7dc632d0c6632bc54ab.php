<?php $__env->startSection('body_class', 'superadmin-native-body superadmin-catalog-body distributor-body'); ?>
<?php $__env->startPush('styles'); ?>
<link rel="stylesheet" href="<?php echo e(asset('css/superadmin-workspace.css')); ?>">
<link rel="stylesheet" href="<?php echo e(asset('css/superadmin-catalog.css')); ?>">
<link rel="stylesheet" href="<?php echo e(asset('css/pharmacy-store-admin.css')); ?>">
<link rel="stylesheet" href="<?php echo e(asset('css/distributor-workspace.css')); ?>?v=<?php echo e(filemtime(public_path('css/distributor-workspace.css'))); ?>">
<?php $__env->stopPush(); ?>
<?php $__env->startPush('scripts'); ?>
<script src="<?php echo e(asset('js/superadmin-workspace.js')); ?>" defer></script>
<script src="<?php echo e(asset('js/distributor-workspace.js')); ?>?v=<?php echo e(filemtime(public_path('js/distributor-workspace.js'))); ?>" defer></script>
<script src="<?php echo e(asset('js/distributor-table-filters.js')); ?>?v=<?php echo e(filemtime(public_path('js/distributor-table-filters.js'))); ?>" defer></script>
<?php $__env->stopPush(); ?>
<?php $__env->startSection('content'); ?>
<?php
    $menu = [
        'Operación' => ['summary' => 'Resumen', 'catalog' => 'Catálogo propio', 'inventory' => 'Inventario', 'orders' => 'Solicitudes y pedidos', 'deliveries' => 'Entregas'],
        'Administración' => ['pharmacy-catalog' => 'Catálogo de farmacia digital', 'store' => 'Tienda digital', 'reports' => 'Reportes', 'settings' => 'Configuración'],
    ];
    $menuUrl = fn ($key) => match ($key) {
        'catalog' => route('provider.pharmacy.products'), 'orders' => route('provider.pharmacy.orders'), 'pharmacy-catalog' => route('provider.pharmacy.catalog'),
        default => route('provider.pharmacy.workspace', $key),
    };
    $carousel = match ($section) {
        'catalog' => ['list' => 'Catálogo propio', 'create' => 'Nuevo producto'],
        'pharmacy-catalog' => ['all' => 'Todos', 'selected' => 'Seleccionados', 'unselected' => 'Por seleccionar'],
        'inventory' => ['all' => 'Todas', 'available' => 'Con existencias', 'empty' => 'Agotadas', 'low' => 'Existencias bajas'],
        'orders' => ['all' => 'Todas', 'submitted' => 'Recibidas', 'reviewing' => 'En revisión', 'ready' => 'Seguimiento', 'cancelled' => 'Canceladas'],
        'deliveries' => ['all' => 'Pendientes', 'ready' => 'Seguimiento', 'reviewing' => 'En revisión', 'submitted' => 'Recibidas'],
        'store' => ['all' => 'Todas', 'visible' => 'Visibles', 'hidden' => 'No visibles'],
        'settings' => ['all' => 'General', 'profile' => 'Distribuidor', 'access' => 'Cuenta', 'publication' => 'Publicación'],
        default => ['all' => 'General', 'stock' => 'Catálogo', 'orders' => 'Solicitudes'],
    };
    $parameter = match ($section) { 'pharmacy-catalog' => 'selection', 'catalog' => 'section', 'inventory' => 'stock', 'orders', 'deliveries' => 'order_status', 'store' => 'visibility', default => null };
?>
<div class="superadmin-native-screen">
    <header class="superadmin-native-topbar">
        <div class="superadmin-native-brand"><?php if (isset($component)) { $__componentOriginalaf03e9d7210fc1ea2feb6cc91ab05eba = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginalaf03e9d7210fc1ea2feb6cc91ab05eba = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.klini-brand','data' => ['label' => 'Distribuidor de medicamentos']] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('klini-brand'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['label' => 'Distribuidor de medicamentos']); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginalaf03e9d7210fc1ea2feb6cc91ab05eba)): ?>
<?php $attributes = $__attributesOriginalaf03e9d7210fc1ea2feb6cc91ab05eba; ?>
<?php unset($__attributesOriginalaf03e9d7210fc1ea2feb6cc91ab05eba); ?>
<?php endif; ?>
<?php if (isset($__componentOriginalaf03e9d7210fc1ea2feb6cc91ab05eba)): ?>
<?php $component = $__componentOriginalaf03e9d7210fc1ea2feb6cc91ab05eba; ?>
<?php unset($__componentOriginalaf03e9d7210fc1ea2feb6cc91ab05eba); ?>
<?php endif; ?></div>
        <div class="superadmin-native-session"><?php if (isset($component)) { $__componentOriginal8bda052d00eb3b1ee971634423df2d85 = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginal8bda052d00eb3b1ee971634423df2d85 = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.klini-session-menu','data' => ['showProfile' => true]] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('klini-session-menu'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['show-profile' => true]); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginal8bda052d00eb3b1ee971634423df2d85)): ?>
<?php $attributes = $__attributesOriginal8bda052d00eb3b1ee971634423df2d85; ?>
<?php unset($__attributesOriginal8bda052d00eb3b1ee971634423df2d85); ?>
<?php endif; ?>
<?php if (isset($__componentOriginal8bda052d00eb3b1ee971634423df2d85)): ?>
<?php $component = $__componentOriginal8bda052d00eb3b1ee971634423df2d85; ?>
<?php unset($__componentOriginal8bda052d00eb3b1ee971634423df2d85); ?>
<?php endif; ?></div>
    </header>
    <aside class="superadmin-native-sidebar">
        <nav class="superadmin-native-menu" aria-label="Menú del distribuidor">
            <?php $__currentLoopData = $menu; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $group => $items): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <p class="distributor-menu-label"><?php echo e($group); ?></p>
                <?php $__currentLoopData = $items; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $label): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <a href="<?php echo e($menuUrl($key)); ?>" class="<?php echo \Illuminate\Support\Arr::toCssClasses(['is-active' => $section === $key]); ?>" <?php if($section === $key): ?> aria-current="page" <?php endif; ?>>
                        <?php echo $__env->make('pharmacy-store.distributor.icon', ['icon' => $key], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><span><?php echo e($label); ?></span>
                    </a>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </nav>
        <div class="distributor-account"><?php echo $__env->make('pharmacy-store.distributor.icon', ['icon' => 'summary'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><div><strong><?php echo e($provider->name); ?></strong><small>Cuenta de distribuidor</small></div></div>
    </aside>
    <main class="superadmin-native-workspace" tabindex="-1">
        <?php echo $__env->make('superadmin._filter-carousel', ['carouselOptions' => $carousel, 'carouselParameter' => $parameter, 'carouselSelected' => $parameter ? request($parameter, $section === 'catalog' ? 'list' : 'all') : 'all', 'carouselLabel' => 'Opciones del distribuidor'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
        <div class="distributor-content" data-drsam-table-filter-skip>
            <?php if(session('status')): ?><div class="distributor-flash" role="status"><?php echo $__env->make('pharmacy-store.distributor.icon', ['icon' => 'check'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><span><?php echo e(session('status')); ?></span><button type="button" data-dismiss-flash aria-label="Cerrar mensaje">×</button></div><?php endif; ?>
            <?php if($errors->any()): ?><div class="distributor-errors" role="alert"><?php $__currentLoopData = $errors->all(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $error): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><p><?php echo e($error); ?></p><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></div><?php endif; ?>
            <?php echo $__env->yieldContent('distributor-content'); ?>
        </div>
    </main>
</div>
<?php echo $__env->yieldContent('distributor-dialogs'); ?>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.app', ['title' => 'Distribuidor de medicamentos'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH C:\laragon\www\dr-sam\resources\views/pharmacy-store/distributor/layout.blade.php ENDPATH**/ ?>