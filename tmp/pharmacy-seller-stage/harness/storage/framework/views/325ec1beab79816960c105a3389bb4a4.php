<?php if(!empty($columnFilters['selected'])): ?>
    <div class="distributor-column-summary" role="status">
        <span><?php echo e(count($columnFilters['selected'])); ?> <?php echo e(count($columnFilters['selected']) === 1 ? 'columna filtrada' : 'columnas filtradas'); ?></span>
        <a class="distributor-reset" href="<?php echo e(request()->fullUrlWithoutQuery(['columns', 'page'])); ?>">Limpiar filtros de columnas</a>
    </div>
<?php endif; ?>
<?php /**PATH C:\laragon\www\dr-sam\resources\views/pharmacy-store/distributor/column-filter-summary.blade.php ENDPATH**/ ?>