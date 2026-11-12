<section class="superadmin-native-catalog-card">
<h2>Ofertas Klini</h2>
<?php if(!$kliniProvider): ?>
<p class="pharmacy-notice">Selecciona el distribuidor de venta Klini en Presentación. No se asignará un distribuidor ni un precio automáticamente.</p>
<?php else: ?>
<p>Distribuidor configurado: <strong><?php echo e($kliniProvider->name); ?></strong>. Cada precio Klini pertenece a una oferta existente de esta cuenta.</p>
<p class="pharmacy-notice">Las ofertas se crean desde el panel de este distribuidor. La visibilidad sigue dependiendo de la autorización de publicación y del estado del producto y de la cuenta. Guardar un precio no publica ni vende el producto.</p>
<div class="superadmin-native-catalog-scroll"><table class="superadmin-native-catalog-table"><thead><tr><th>Producto</th><th>Presentación</th><th>Existencias</th><th>Estado</th><th>Precio Klini (MXN)</th></tr></thead><tbody>
<?php $__empty_1 = true; $__currentLoopData = $kliniOffers; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $offer): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
<tr><td><?php echo e($offer->catalogItem?->name ?? $offer->name); ?><small>SKU: <?php echo e($offer->catalogItem?->sku ?? $offer->sku ?? 'Sin SKU'); ?></small></td><td><?php echo e($offer->catalogItem?->presentation ?? $offer->presentation ?? 'No indicada'); ?></td><td><?php echo e($offer->stock); ?></td><td><?php echo e($offer->status === 'active' ? 'Activo' : 'Inactivo'); ?></td><td><form method="POST" action="<?php echo e(route('superadmin.digital-pharmacy.klini-offers.price', $offer)); ?>"><?php echo csrf_field(); ?> <?php echo method_field('PATCH'); ?><label class="sr-only" for="klini-price-<?php echo e($offer->id); ?>">Precio Klini de <?php echo e($offer->catalogItem?->name ?? $offer->name); ?> en MXN</label><input id="klini-price-<?php echo e($offer->id); ?>" name="price" type="number" step="0.01" min="0.01" max="999999.99" value="<?php echo e($offer->price); ?>" required><button>Guardar precio Klini</button></form></td></tr>
<?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?><tr><td colspan="5">Este distribuidor todavía no tiene ofertas. No se crearon precios de ejemplo.</td></tr><?php endif; ?>
</tbody></table></div><?php echo e($kliniOffers->links()); ?>

<?php endif; ?>
</section>
<?php /**PATH C:\laragon\www\klini_mobile\tmp\pharmacy-seller-stage\resources\views/pharmacy-store/klini-offers.blade.php ENDPATH**/ ?>