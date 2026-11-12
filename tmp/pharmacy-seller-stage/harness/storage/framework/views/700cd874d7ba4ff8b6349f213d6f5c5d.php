<?php
    $restoreInput = (string) old('_editor', 'new') === (string) ($product?->id ?? 'new');
    $linkedItem = $product?->catalogItem;
    $fieldValue = function ($field, $default = null) use ($restoreInput, $product, $linkedItem) {
        if ($linkedItem && in_array($field, ['name', 'sku', 'description', 'presentation', 'requires_prescription'])) return $linkedItem->{$field};
        if ($linkedItem && $field === 'category') return $linkedItem->pharmacyCategory();
        return $restoreInput ? old($field, $product?->{$field} ?? $default) : ($product?->{$field} ?? $default);
    };
?>
<?php if($linkedItem): ?><p class="distributor-footnote">Producto vinculado al catálogo universal. Klini administra su identidad y descripción; tú administras precio, existencias e imágenes.</p><?php endif; ?>
<label>Nombre<input name="name" value="<?php echo e($fieldValue('name')); ?>" required maxlength="<?php echo e($linkedItem ? 255 : 200); ?>" <?php if($linkedItem): echo 'readonly'; endif; ?>></label>
<label>SKU<input name="sku" value="<?php echo e($fieldValue('sku')); ?>" maxlength="100" placeholder="Código de tu catálogo" <?php if($linkedItem): echo 'readonly'; endif; ?>><small>Identificador único de esta presentación dentro de tu catálogo.</small></label>
<label>Categoría<input name="category" value="<?php echo e($fieldValue('category')); ?>" maxlength="255" <?php if($linkedItem): echo 'readonly'; endif; ?>></label>
<label>Presentación<input name="presentation" value="<?php echo e($fieldValue('presentation')); ?>" maxlength="<?php echo e($linkedItem ? 255 : 200); ?>" <?php if($linkedItem): echo 'readonly'; endif; ?>></label>
<label>Descripción<textarea name="description" maxlength="<?php echo e($linkedItem ? 6000 : 3000); ?>" <?php if($linkedItem): echo 'readonly'; endif; ?>><?php echo e($fieldValue('description')); ?></textarea></label>
<label>Precio (MXN)<input name="price" type="number" min="0" max="999999.99" step="0.01" value="<?php echo e($fieldValue('price', 0)); ?>" required></label>
<label>Existencias<input name="stock" type="number" min="0" max="1000000" step="1" value="<?php echo e($fieldValue('stock', 0)); ?>" required></label>
<label>Foto del producto<input name="image" type="file" accept="image/jpeg,image/png,image/webp"><small>JPEG, PNG o WebP. Hasta 5 MB; entre 120 y 4096 píxeles por lado. Al guardar, una nueva foto reemplaza la que se muestra.</small></label>
<?php if(!empty($demoImageOptions)): ?>
<fieldset style="grid-column:1/-1;border:1px solid #d8e8e5;border-radius:12px;padding:16px"><legend>Fototeca demo</legend>
<p>Elige una imagen para este producto o carga tu propia foto.</p>
<label><input type="radio" name="demo_image_key" value="" <?php if(!$fieldValue('demo_image_key')): echo 'checked'; endif; ?>> <?php echo e($product ? 'Conservar imagen actual' : 'Sin imagen demo'); ?></label>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px">
<?php $__currentLoopData = $demoImageOptions; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $demoImageKey => $demoImageLabel): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
<label style="display:flex;align-items:center;flex-direction:column;gap:8px"><img src="<?php echo e(route('provider.pharmacy.demo-images', $demoImageKey)); ?>" alt="" width="112" height="112" style="object-fit:contain;max-width:100%"><span><input type="radio" name="demo_image_key" value="<?php echo e($demoImageKey); ?>" <?php if($fieldValue('demo_image_key') === $demoImageKey): echo 'checked'; endif; ?>> <?php echo e($demoImageLabel); ?></span></label>
<?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
</div></fieldset>
<?php endif; ?>
<?php if($product?->uploadedStoreImage()): ?>
<div><img src="<?php echo e(route('provider.pharmacy.products.image', $product)); ?>" alt="Foto de <?php echo e($product->name); ?>" width="160" height="160" style="object-fit:contain;max-width:100%"><p>Foto guardada en tu catálogo.</p></div>
<?php elseif($product?->image_url): ?>
<div><img src="<?php echo e($product->image_url); ?>" alt="Foto de <?php echo e($product->name); ?>" width="160" height="160" style="object-fit:contain;max-width:100%" referrerpolicy="no-referrer"></div>
<?php endif; ?>
<label>Imagen externa (HTTPS, opcional)<input name="image_url" type="url" value="<?php echo e($fieldValue('image_url')); ?>" maxlength="2048"></label>
<?php if($product?->uploadedStoreImage()): ?>
<label><input name="use_external_image" type="checkbox" value="1"> Usar la imagen externa en lugar de la foto guardada</label>
<?php endif; ?>
<label>Estado<select name="status"><option value="inactive" <?php if(($fieldValue('status','inactive')) === 'inactive'): echo 'selected'; endif; ?>>Inactivo</option><option value="active" <?php if(($fieldValue('status','inactive')) === 'active'): echo 'selected'; endif; ?>>Activo</option></select></label>
<label>Requiere receta<select name="requires_prescription" <?php if($linkedItem): echo 'disabled'; endif; ?>><option value="0" <?php if(!($fieldValue('requires_prescription',false))): echo 'selected'; endif; ?>>No</option><option value="1" <?php if($fieldValue('requires_prescription',false)): echo 'selected'; endif; ?>>Sí</option></select></label>
<label>Especialidad<input name="specialty" value="<?php echo e($fieldValue('specialty')); ?>" maxlength="100"></label>
<label>Tipo de producto<input name="product_type" value="<?php echo e($fieldValue('product_type')); ?>" maxlength="100"></label>
<label>Precio anterior (opcional, MXN)<input name="compare_at_price" type="number" min="0" step="0.01" value="<?php echo e($fieldValue('compare_at_price')); ?>"></label>
<label>Producto destacado<select name="featured"><option value="0" <?php if(!($fieldValue('featured',false))): echo 'selected'; endif; ?>>No</option><option value="1" <?php if($fieldValue('featured',false)): echo 'selected'; endif; ?>>Sí</option></select></label>
<label>Laboratorio<input name="laboratory" value="<?php echo e($fieldValue('laboratory')); ?>" maxlength="200"></label>
<?php /**PATH C:\laragon\www\dr-sam\resources\views/pharmacy-store/product-fields.blade.php ENDPATH**/ ?>