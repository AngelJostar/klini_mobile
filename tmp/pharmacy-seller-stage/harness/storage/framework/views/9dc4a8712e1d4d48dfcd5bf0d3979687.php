<footer class="distributor-pagination">
    <span><?php echo e($paginator->total()); ?> <?php echo e($unit ?? 'registros'); ?><?php if($paginator->lastPage() > 1): ?> · Página <?php echo e($paginator->currentPage()); ?> de <?php echo e($paginator->lastPage()); ?><?php endif; ?></span>
    <?php if($paginator->hasPages()): ?><nav aria-label="Paginación">
        <?php if($paginator->previousPageUrl()): ?><a class="distributor-button secondary" href="<?php echo e($paginator->previousPageUrl()); ?>">Anterior</a><?php endif; ?>
        <?php if($paginator->nextPageUrl()): ?><a class="distributor-button secondary" href="<?php echo e($paginator->nextPageUrl()); ?>">Siguiente</a><?php endif; ?>
    </nav><?php endif; ?>
</footer><?php /**PATH C:\laragon\www\dr-sam\resources\views/pharmacy-store/distributor/pagination.blade.php ENDPATH**/ ?>