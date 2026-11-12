<?php $__env->startSection('distributor-content'); ?>
<header class="distributor-heading"><div><p class="distributor-eyebrow">Administración / Farmacia digital</p><h1>Catálogo de farmacia digital</h1><p>Selecciona los productos publicados por Klini y registra tu precio y existencias.</p></div></header>
<section class="distributor-card">
    <form method="GET" class="distributor-filters"><label class="distributor-search">Buscar producto o SKU<input name="q" type="search" maxlength="160" value="<?php echo e(request('q')); ?>" placeholder="Nombre, SKU, descripción o categoría"></label><input type="hidden" name="selection" value="<?php echo e(request('selection', 'all')); ?>"><button class="distributor-button secondary">Buscar</button></form>
    <?php echo $__env->make('pharmacy-store.distributor.column-filter-summary', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
    <div class="distributor-table-scroll"><table class="distributor-table"><thead><tr>
        <?php $__currentLoopData = ['sku' => 'SKU', 'product' => 'Producto y descripción', 'category' => 'Categoría', 'price' => 'Tu precio · MXN', 'stock' => 'Tus existencias', 'selection' => 'Tu oferta']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $column => $label): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><th><?php echo $__env->make('pharmacy-store.distributor.column-header', ['column' => $column, 'label' => $label], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?></th><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        <th>Seleccionar</th></tr></thead><tbody>
    <?php $__empty_1 = true; $__currentLoopData = $records; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
        <?php $offer = $item->pharmacyOffers->first(); ?>
        <tr><td><?php echo e($item->sku); ?></td><td><strong><?php echo e($item->name); ?></strong><small><?php echo e($item->description ?: $item->presentation); ?></small></td><td><?php echo e($item->pharmacyCategory()); ?></td><td><?php echo e($offer ? '$'.number_format((float)$offer->price, 2) : 'Por registrar'); ?></td><td><?php echo e($offer ? $offer->stock.' ud.' : '—'); ?></td><td><span class="distributor-state <?php echo e($offer?->status === 'active' ? '' : 'muted'); ?>"><?php echo e($offer?->status === 'active' ? 'Seleccionado' : 'No seleccionado'); ?></span></td><td><button type="button" class="distributor-button secondary" data-open-distributor-dialog="catalog-offer-<?php echo e($item->id); ?>"><?php echo e($offer ? 'Editar oferta' : 'Seleccionar producto'); ?></button></td></tr>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?><tr><td colspan="7"><div class="distributor-empty"><h2>No hay productos disponibles</h2><p>Aquí aparecen los productos activos con «Mostrar en farmacia digital» en ON.</p></div></td></tr><?php endif; ?>
    </tbody></table></div>
    <?php echo $__env->make('pharmacy-store.distributor.pagination', ['paginator' => $records, 'unit' => 'productos'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
</section>
<?php $__env->stopSection(); ?>
<?php $__env->startSection('distributor-dialogs'); ?>
<?php $__currentLoopData = $records; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <?php
        $offer = $item->pharmacyOffers->first();
        $reopen = $errors->catalogOffer->any() && (string)old('catalog_id') === (string)$item->id;
    ?>
    <dialog id="catalog-offer-<?php echo e($item->id); ?>" class="distributor-dialog distributor-notice-dialog" aria-labelledby="catalog-offer-title-<?php echo e($item->id); ?>" <?php if($reopen): ?> data-distributor-auto-open <?php endif; ?>>
        <header><div><h2 id="catalog-offer-title-<?php echo e($item->id); ?>"><?php echo e($offer ? 'Editar oferta' : 'Seleccionar producto'); ?></h2><p><?php echo e($item->name); ?> · SKU <?php echo e($item->sku); ?></p></div><button type="button" class="distributor-close" data-close-distributor-dialog aria-label="Cerrar">×</button></header>
        <div class="distributor-dialog-content"><form id="catalog-offer-form-<?php echo e($item->id); ?>" class="distributor-settings-form" action="<?php echo e(route('provider.pharmacy.catalog.offer', $item)); ?>" method="POST">
            <?php echo csrf_field(); ?> <?php echo method_field('PUT'); ?><input type="hidden" name="catalog_id" value="<?php echo e($item->id); ?>">
            <?php if($reopen): ?><div class="distributor-errors" role="alert"><?php $__currentLoopData = $errors->catalogOffer->all(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $error): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><p><?php echo e($error); ?></p><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></div><?php endif; ?>
            <label>Precio por presentación · MXN<input type="number" name="price" min="0.01" max="999999.99" step="0.01" required value="<?php echo e($reopen ? old('price') : $offer?->price); ?>"></label>
            <label>Existencias<input type="number" name="stock" min="0" max="1000000" step="1" required value="<?php echo e($reopen ? old('stock') : ($offer?->stock ?? 0)); ?>"></label>
            <label>Marca o laboratorio<input name="laboratory" maxlength="200" value="<?php echo e($reopen ? old('laboratory') : $offer?->laboratory); ?>"></label>
            <label>Publicar mi oferta<select name="status"><option value="active" <?php if(($reopen ? old('status') : $offer?->status) !== 'inactive'): echo 'selected'; endif; ?>>ON · Seleccionado</option><option value="inactive" <?php if(($reopen ? old('status') : $offer?->status) === 'inactive'): echo 'selected'; endif; ?>>OFF · No seleccionado</option></select></label>
            <p class="distributor-footnote">Se mostrará el nombre y la ubicación pública de tu distribuidor. Puedes completar tu ubicación en Configuración.</p>
        </form></div><footer><button type="button" class="distributor-button secondary" data-close-distributor-dialog>Cancelar</button><button type="submit" class="distributor-button" form="catalog-offer-form-<?php echo e($item->id); ?>">Guardar oferta</button></footer>
    </dialog>
<?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('pharmacy-store.distributor.layout', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH C:\laragon\www\dr-sam\resources\views/pharmacy-store/distributor/universal-catalog.blade.php ENDPATH**/ ?>