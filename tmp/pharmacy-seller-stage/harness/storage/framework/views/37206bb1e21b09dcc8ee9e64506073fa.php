<div class="drsam-table-filter-head">
    <span class="drsam-table-filter-label"><?php echo e($label); ?></span>
    <button type="button" class="<?php echo \Illuminate\Support\Arr::toCssClasses(['drsam-table-filter-button', 'is-active' => array_key_exists($column, $columnFilters['selected'])]); ?>"
        data-distributor-column="<?php echo e($column); ?>" data-column-options="<?php echo e(json_encode($columnFilters['columns'][$column], JSON_UNESCAPED_UNICODE)); ?>"
        aria-label="Filtrar <?php echo e($label); ?>" aria-haspopup="dialog" aria-expanded="false"
        aria-pressed="<?php echo e(array_key_exists($column, $columnFilters['selected']) ? 'true' : 'false'); ?>"></button>
</div>
<?php /**PATH C:\laragon\www\dr-sam\resources\views/pharmacy-store/distributor/column-header.blade.php ENDPATH**/ ?>