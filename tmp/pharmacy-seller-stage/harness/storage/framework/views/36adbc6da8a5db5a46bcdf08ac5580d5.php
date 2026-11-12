<?php $__env->startSection('distributor-content'); ?>
<header class="distributor-heading">
    <div><p class="distributor-eyebrow">Operación / Catálogo</p><h1>Catálogo propio</h1><p>Precios y existencias por presentación.</p></div>
    <div class="distributor-heading-actions"><button type="button" class="distributor-publication" data-open-distributor-dialog="distributor-publication"><?php echo $__env->make('pharmacy-store.distributor.icon', ['icon' => 'shield'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?> Publicación <?php echo e($provider->digital_pharmacy_enabled ? 'autorizada' : 'pendiente'); ?></button><a class="distributor-button" href="<?php echo e(route('provider.pharmacy.products', ['section' => 'create'])); ?>" data-open-distributor-dialog="distributor-product-new"><?php echo $__env->make('pharmacy-store.distributor.icon', ['icon' => 'plus'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?> Nuevo producto</a></div>
</header>
<div class="distributor-metrics" aria-label="Resumen del catálogo">
    <div><strong><?php echo e($metrics['products']); ?></strong><span>Productos</span></div>
    <div><strong><?php echo e($metrics['presentations']); ?></strong><span>Presentaciones</span></div>
    <div class="distributor-warning"><strong><?php echo e($metrics['empty']); ?></strong><span>Presentaciones<br>sin existencias</span></div>
</div>
<section class="distributor-card">
    <?php echo $__env->make('pharmacy-store.distributor.filters', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
    <?php echo $__env->make('pharmacy-store.distributor.column-filter-summary', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
    <div class="distributor-table-scroll">
        <table class="distributor-table distributor-catalog-table">
            <thead><tr>
                <th scope="col"><?php echo $__env->make('pharmacy-store.distributor.column-header', ['column' => 'product', 'label' => 'Producto y presentación'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?></th>
                <th scope="col" class="numeric"><?php echo $__env->make('pharmacy-store.distributor.column-header', ['column' => 'price', 'label' => 'Precio por paquete · MXN'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?></th>
                <th scope="col" class="numeric"><?php echo $__env->make('pharmacy-store.distributor.column-header', ['column' => 'stock', 'label' => 'Existencias'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?></th>
                <th scope="col"><?php echo $__env->make('pharmacy-store.distributor.column-header', ['column' => 'status', 'label' => 'Estado'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?></th>
                <th scope="col" class="distributor-edit-column">Editar</th>
            </tr></thead>
            <?php $__empty_1 = true; $__currentLoopData = $groups; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $group): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                <?php $groupId = 'product-group-'.$loop->index; $open = $loop->first || request()->filled('q') || !empty($columnFilters['selected']) || ($filters['stock'] ?? 'all') !== 'all'; $items = $group['items']; ?>
                <tbody data-product-group>
                    <tr class="distributor-group-row"><th scope="row"><button class="distributor-group-toggle" type="button" aria-expanded="<?php echo e($open ? 'true' : 'false'); ?>" aria-controls="<?php echo e($groupId); ?>">
                        <span class="distributor-chevron"><?php echo $__env->make('pharmacy-store.distributor.icon', ['icon' => 'chevron'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?></span><span class="distributor-product-symbol"><?php echo $__env->make('pharmacy-store.distributor.icon', ['icon' => 'pill'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?></span>
                        <span><strong><?php echo e($group['name']); ?></strong><small><?php echo e($items->count()); ?> <?php echo e($items->count() === 1 ? 'presentación' : 'presentaciones'); ?><?php if($items->where('stock', 0)->count()): ?> · <?php echo e($items->where('stock', 0)->count()); ?> sin existencias <?php endif; ?> <?php if($group['laboratory']): ?> · <?php echo e($group['laboratory']); ?><?php endif; ?></small></span>
                    </button></th><td class="numeric distributor-muted">$<?php echo e(number_format((float)$items->min('price'), 2)); ?><?php if($items->min('price') != $items->max('price')): ?> – $<?php echo e(number_format((float)$items->max('price'), 2)); ?><?php endif; ?></td><td class="numeric distributor-muted"><?php echo e($items->where('stock', '>', 0)->count()); ?> de <?php echo e($items->count()); ?> disponibles</td><td><span class="distributor-state <?php echo e($items->where('status', 'active')->isEmpty() ? 'muted' : ''); ?>"><?php echo e($items->every(fn($item) => $item->status === 'active') ? 'Activo' : ($items->every(fn($item) => $item->status === 'inactive') ? 'Inactivo' : 'Mixto')); ?></span></td><td></td></tr>
                </tbody>
                <tbody id="<?php echo e($groupId); ?>" <?php if(!$open): ?> hidden <?php endif; ?>>
                    <?php $__currentLoopData = $items; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $product): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                        <tr><td class="distributor-presentation"><?php echo e($workspace->presentation($product)); ?></td><td class="numeric">$<?php echo e(number_format((float)$product->price, 2)); ?></td><td class="numeric"><?php if($product->stock === 0): ?><span class="distributor-stock-empty">0 · Agotado</span><?php else: ?><?php echo e($product->stock); ?> ud.<?php endif; ?></td><td><span class="distributor-state <?php echo e($product->status !== 'active' ? 'muted' : ''); ?>"><?php echo e($product->status === 'active' ? 'Activo' : 'Inactivo'); ?></span></td><td class="distributor-edit-column"><a class="distributor-icon-button" href="<?php echo e(route('provider.pharmacy.products', ['edit' => $product->id])); ?>" data-open-distributor-dialog="distributor-product-<?php echo e($product->id); ?>" aria-label="Editar <?php echo e($product->name); ?>"><?php echo $__env->make('pharmacy-store.distributor.icon', ['icon' => 'edit'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?></a></td></tr>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                </tbody>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                <tbody><tr><td colspan="5"><div class="distributor-empty"><?php echo $__env->make('pharmacy-store.distributor.icon', ['icon' => 'catalog'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><h2><?php echo e($metrics['presentations'] ? 'Sin coincidencias' : 'Tu catálogo empieza aquí'); ?></h2><p><?php echo e($metrics['presentations'] ? 'Prueba otro nombre o cambia los filtros.' : 'Agrega tu primer producto y sus datos de presentación.'); ?></p></div></td></tr></tbody>
            <?php endif; ?>
        </table>
    </div>
    <?php echo $__env->make('pharmacy-store.distributor.pagination', ['paginator' => $groups, 'unit' => 'productos en esta consulta'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
</section>
<?php $__env->stopSection(); ?>
<?php $__env->startSection('distributor-dialogs'); ?>
<?php echo $__env->make('pharmacy-store.distributor.product-dialog', ['product' => null], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
<?php $__currentLoopData = $products->when($editingProduct, fn($items) => $items->push($editingProduct))->unique('id'); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $product): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <?php echo $__env->make('pharmacy-store.distributor.product-dialog', ['product' => $product], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
<?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
<dialog id="distributor-publication" class="distributor-dialog distributor-notice-dialog" aria-labelledby="distributor-publication-title" data-publication-key="<?php echo e($provider->id); ?>-<?php echo e((int)$provider->digital_pharmacy_enabled); ?>" <?php if(!request()->hasAny(['section', 'edit']) && !$errors->any() && !session('status')): ?> data-show-publication <?php endif; ?>>
    <header><div><span class="distributor-product-symbol"><?php echo $__env->make('pharmacy-store.distributor.icon', ['icon' => 'shield'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?></span><h2 id="distributor-publication-title">Publicación <?php echo e($provider->digital_pharmacy_enabled ? 'autorizada' : 'pendiente'); ?></h2></div><button type="button" class="distributor-close" data-close-distributor-dialog aria-label="Cerrar mensaje" autofocus>×</button></header>
    <div class="distributor-dialog-content"><p><?php echo e($provider->digital_pharmacy_enabled ? 'Puedes gestionar tu catálogo aunque no esté visible en la tienda.' : 'Tu publicación está pendiente de autorización del superadministrador. Puedes seguir preparando tu catálogo.'); ?></p></div>
</dialog>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('pharmacy-store.distributor.layout', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH C:\laragon\www\dr-sam\resources\views/pharmacy-store/products.blade.php ENDPATH**/ ?>