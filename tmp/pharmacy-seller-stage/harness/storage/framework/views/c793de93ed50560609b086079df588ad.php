<dialog id="medication-status-dialog" class="medication-identifiers-dialog" aria-labelledby="medication-status-title" data-reopen-status="<?php echo e($errors->medicationStatus->any() ? old('status_medication_id') : ''); ?>" data-old-status="<?php echo e(old('status')); ?>">
    <header><div><h2 id="medication-status-title">Cambiar estatus</h2><p data-status-caption></p></div><button type="button" data-close-status aria-label="Cerrar">×</button></header>
    <form method="POST" data-status-form>
        <?php echo csrf_field(); ?> <?php echo method_field('PATCH'); ?><input type="hidden" name="status_medication_id">
        <?php if($errors->medicationStatus->any()): ?><div role="alert"><?php $__currentLoopData = $errors->medicationStatus->all(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $error): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><p><?php echo e($error); ?></p><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></div><?php endif; ?>
        <label>Estatus del medicamento<select name="status" required><?php $__currentLoopData = \App\Models\MedicationCatalogItem::STATUS_LABELS; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $label): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><option value="<?php echo e($key); ?>"><?php echo e($label); ?></option><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></select></label>
        <p class="medication-editor-hint">Solo los productos activos con publicación ON se muestran en la farmacia digital. Las ofertas de los distribuidores se conservan al cambiar el estatus.</p>
        <footer><button type="button" data-close-status>Cancelar</button><button type="submit">Guardar estatus</button></footer>
    </form>
</dialog>
<?php /**PATH C:\laragon\www\dr-sam\resources\views/superadmin/medications/status-dialog.blade.php ENDPATH**/ ?>