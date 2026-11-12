<dialog id="new-medication-dialog" class="medication-identifiers-dialog medication-create-dialog" aria-labelledby="new-medication-title" data-has-errors="<?php echo e($errors->newMedication->any() ? 'true' : 'false'); ?>">
    <header><div><h2 id="new-medication-title">Agregar producto</h2><p>Nuevo medicamento del catálogo universal</p></div><button type="button" data-close-new-medication aria-label="Cerrar">×</button></header>
    <form method="POST" action="<?php echo e(route('superadmin.medications.store')); ?>" data-new-medication-form>
        <?php echo csrf_field(); ?>
        <input type="hidden" name="catalog_context" value="<?php echo e($pharmacyCatalog ? 'pharmacy' : 'medications'); ?>">
        <?php if($errors->newMedication->any()): ?><div role="alert" class="medication-field-wide"><?php $__currentLoopData = $errors->newMedication->all(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $error): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><p><?php echo e($error); ?></p><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></div><?php endif; ?>
        <div class="medication-auto-sku medication-field-wide"><strong>SKU automático</strong><span>Se asignará el siguiente número consecutivo al guardar. Formato: 100000001.</span></div>
        <label>Nombre del medicamento *<input name="name" value="<?php echo e(old('name')); ?>" maxlength="255" required></label>
        <label>Nombre genérico<input name="generic_name" value="<?php echo e(old('generic_name')); ?>" maxlength="255"></label>
        <label>Clave CNIS<input name="cnis" value="<?php echo e(old('cnis')); ?>" placeholder="010.000.0000.00" pattern="[0-9]{3}\.[0-9]{3}\.[0-9]{4}\.[0-9]{2}" maxlength="15"></label>
        <label>Presentación *<input name="presentation" value="<?php echo e(old('presentation')); ?>" placeholder="Ej. Tabletas, envase con 10" maxlength="255" required></label>
        <label class="medication-field-wide">Descripción *<textarea name="description" maxlength="6000" rows="3" required><?php echo e(old('description')); ?></textarea></label>
        <label>Grupo terapéutico<input name="therapeutic_group" value="<?php echo e(old('therapeutic_group')); ?>" maxlength="255"></label>
        <label>Denominación distintiva<input name="distinctive_name" value="<?php echo e(old('distinctive_name')); ?>" maxlength="255"></label>
        <label>Código de barras numérico<input name="barcode" value="<?php echo e(old('barcode')); ?>" inputmode="numeric" pattern="[0-9]{8,32}" minlength="8" maxlength="32"><small>Opcional. Puedes registrarlo después.</small></label>
        <label>Origen del código<select name="barcode_type"><option value="commercial" <?php if(old('barcode_type', 'commercial') === 'commercial'): echo 'selected'; endif; ?>>Comercial del fabricante</option><option value="internal" <?php if(old('barcode_type') === 'internal'): echo 'selected'; endif; ?>>Interno de Klini · demo</option></select></label>
        <label>Catálogo institucional de<input name="catalog" value="<?php echo e(old('catalog')); ?>" maxlength="255" placeholder="Captura manual"></label>
        <label>Estatus<select name="status"><?php $__currentLoopData = \App\Models\MedicationCatalogItem::STATUS_LABELS; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $label): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><option value="<?php echo e($key); ?>" <?php if(old('status', 'active') === $key): echo 'selected'; endif; ?>><?php echo e($label); ?></option><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></select></label>
        <?php $__currentLoopData = ['mobile_units' => 'Unidades móviles', 'basic_units' => 'Núcleos básicos', 'cessa' => 'CESSA']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $label): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <label><?php echo e($label); ?><select name="<?php echo e($key); ?>"><option value="No especificado" <?php if(old($key, 'No especificado') === 'No especificado'): echo 'selected'; endif; ?>>No especificado</option><option value="Si" <?php if(old($key) === 'Si'): echo 'selected'; endif; ?>>Sí</option><option value="No" <?php if(old($key) === 'No'): echo 'selected'; endif; ?>>No</option></select></label>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        <footer class="medication-field-wide"><button type="button" data-close-new-medication>Cancelar</button><button type="submit">Guardar producto</button></footer>
    </form>
</dialog>
<?php /**PATH C:\laragon\www\dr-sam\resources\views/superadmin/medications/create-dialog.blade.php ENDPATH**/ ?>