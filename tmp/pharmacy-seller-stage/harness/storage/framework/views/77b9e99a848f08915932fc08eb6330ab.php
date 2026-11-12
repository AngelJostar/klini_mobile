<?php
    $editorId = $product?->id ?? 'new';
    $requestedEditor = old('_editor') ?? request('edit') ?? (request('section') === 'create' ? 'new' : null);
    $autoOpen = (string) $requestedEditor === (string) $editorId;
?>
<dialog id="distributor-product-<?php echo e($editorId); ?>" class="distributor-dialog distributor-product-dialog" aria-labelledby="distributor-product-title-<?php echo e($editorId); ?>" <?php if($autoOpen): ?> data-distributor-auto-open <?php endif; ?>>
    <header><div><h2 id="distributor-product-title-<?php echo e($editorId); ?>"><?php echo e($product ? 'Editar presentación' : 'Nuevo producto'); ?></h2><p><?php echo e($product?->name ?? 'Completa los datos para agregarlo a tu catálogo.'); ?></p></div><button type="button" class="distributor-close" data-close-distributor-dialog aria-label="Cerrar formulario">×</button></header>
    <div class="distributor-dialog-content">
        <?php if($autoOpen && $errors->any()): ?><div class="distributor-errors" role="alert"><?php $__currentLoopData = $errors->all(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $error): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><p><?php echo e($error); ?></p><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></div><?php endif; ?>
        <form id="distributor-product-form-<?php echo e($editorId); ?>" class="pharmacy-form" method="POST" enctype="multipart/form-data" action="<?php echo e($product ? route('provider.pharmacy.products.update', $product) : route('provider.pharmacy.products.store')); ?>">
            <?php echo csrf_field(); ?> <?php if($product): ?> <?php echo method_field('PATCH'); ?> <?php endif; ?>
            <input type="hidden" name="_editor" value="<?php echo e($editorId); ?>">
            <?php echo $__env->make('pharmacy-store.product-fields', ['product' => $product], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
        </form>
    </div>
    <footer><button type="button" class="distributor-button secondary" data-close-distributor-dialog>Cancelar</button><button type="submit" class="distributor-button" form="distributor-product-form-<?php echo e($editorId); ?>"><?php echo e($product ? 'Guardar cambios' : 'Crear producto'); ?></button></footer>
</dialog>
<?php /**PATH C:\laragon\www\dr-sam\resources\views/pharmacy-store/distributor/product-dialog.blade.php ENDPATH**/ ?>