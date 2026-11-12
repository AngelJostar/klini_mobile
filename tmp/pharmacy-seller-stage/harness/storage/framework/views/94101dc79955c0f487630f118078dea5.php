<?php $__env->startSection('distributor-content'); ?>
<header class="distributor-heading"><div><p class="distributor-eyebrow">Operación / Solicitudes</p><h1>Solicitudes y pedidos</h1><p>Consulta las solicitudes de la farmacia que incluyen tus productos.</p></div></header>
<div class="distributor-metrics"><div><strong><?php echo e($orderCounts->sum()); ?></strong><span>Solicitudes</span></div><div><strong><?php echo e($orderCounts->get('submitted', 0) + $orderCounts->get('reviewing', 0)); ?></strong><span>Pendientes de revisión</span></div><div><strong><?php echo e($orderCounts->get('ready', 0)); ?></strong><span>Listas para seguimiento</span></div></div>
<section class="distributor-card">
    <form class="distributor-filters" method="GET" role="search"><label class="distributor-search"><?php echo $__env->make('pharmacy-store.distributor.icon', ['icon' => 'search'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><span class="distributor-sr-only">Buscar folio o producto</span><input type="search" name="q" value="<?php echo e(request('q')); ?>" placeholder="Buscar folio o producto" maxlength="200"></label><input type="hidden" name="order_status" value="<?php echo e(request('order_status', 'all')); ?>">
        <?php if(!empty($columnFilters['selected'])): ?><input type="hidden" name="columns" value="<?php echo e(json_encode($columnFilters['selected'])); ?>"><?php endif; ?>
        <button class="distributor-button secondary">Buscar</button>
    </form>
    <?php echo $__env->make('pharmacy-store.distributor.orders-table', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
    <?php echo $__env->make('pharmacy-store.distributor.pagination', ['paginator' => $orders, 'unit' => 'solicitudes'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
</section>
<p class="distributor-footnote">Se muestran únicamente tus productos y su subtotal de referencia. El superadministrador coordina los estados; las solicitudes no representan cobros ni entregas confirmadas.</p>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('pharmacy-store.distributor.layout', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH C:\laragon\www\dr-sam\resources\views/pharmacy-store/provider-orders.blade.php ENDPATH**/ ?>