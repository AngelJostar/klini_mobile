<?php
  $carouselSelected = $carouselSelected ?? 'all';
  $carouselParameter = $carouselParameter ?? null;
?>
<nav class="superadmin-filter-carousel" aria-label="<?php echo e($carouselLabel ?? 'Filtros del menú'); ?>" data-admin-carousel>
  <button type="button" class="superadmin-filter-arrow" data-admin-carousel-prev aria-label="Filtros anteriores" disabled>&lsaquo;</button>
  <div class="superadmin-filter-track" data-admin-carousel-track>
    <?php $__currentLoopData = $carouselOptions; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $value => $label): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
      <?php
        $selected = in_array((string) $value, $carouselSelectedValues ?? [$carouselSelected], true);
        $displayLabel = $carouselShortLabels[$value] ?? $label;
      ?>
      <?php if($carouselParameter): ?>
        <a href="<?php echo e(request()->fullUrlWithQuery(array_merge(['page' => null, 'selected_module' => null, 'selected_institution' => null], $carouselQueries[$value] ?? [$carouselParameter => $value]))); ?>"
           class="<?php echo \Illuminate\Support\Arr::toCssClasses(['superadmin-filter-tile', 'is-active' => $selected]); ?>" data-admin-filter="<?php echo e($value); ?>"
           <?php if($selected): ?> aria-current="true" <?php endif; ?> title="<?php echo e($label); ?>" aria-label="<?php echo e($label); ?>">
      <?php else: ?>
        <button type="button" class="<?php echo \Illuminate\Support\Arr::toCssClasses(['superadmin-filter-tile', 'is-active' => $selected]); ?>"
                data-admin-filter="<?php echo e($value); ?>" aria-pressed="<?php echo e($selected ? 'true' : 'false'); ?>" title="<?php echo e($label); ?>">
      <?php endif; ?>
        <span class="superadmin-filter-icon"><?php if (isset($component)) { $__componentOriginal1dfdea2f50f15cd96777011ab20e2673 = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginal1dfdea2f50f15cd96777011ab20e2673 = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.klini-icon','data' => ['name' => $carouselIcons[$value] ?? \Illuminate\Support\Str::ascii($label)]] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('klini-icon'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['name' => \Illuminate\View\Compilers\BladeCompiler::sanitizeComponentAttribute($carouselIcons[$value] ?? \Illuminate\Support\Str::ascii($label))]); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginal1dfdea2f50f15cd96777011ab20e2673)): ?>
<?php $attributes = $__attributesOriginal1dfdea2f50f15cd96777011ab20e2673; ?>
<?php unset($__attributesOriginal1dfdea2f50f15cd96777011ab20e2673); ?>
<?php endif; ?>
<?php if (isset($__componentOriginal1dfdea2f50f15cd96777011ab20e2673)): ?>
<?php $component = $__componentOriginal1dfdea2f50f15cd96777011ab20e2673; ?>
<?php unset($__componentOriginal1dfdea2f50f15cd96777011ab20e2673); ?>
<?php endif; ?></span>
        <span class="superadmin-filter-label"><?php echo e($displayLabel); ?></span>
        <span class="superadmin-filter-selected" aria-hidden="true">✓</span>
      <?php if($carouselParameter): ?> </a> <?php else: ?> </button> <?php endif; ?>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
  </div>
  <button type="button" class="superadmin-filter-arrow" data-admin-carousel-next aria-label="Filtros siguientes" disabled>&rsaquo;</button>
  <div class="superadmin-filter-indicators" aria-hidden="true">
    <?php $__currentLoopData = $carouselOptions; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $value => $label): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
      <span class="<?php echo \Illuminate\Support\Arr::toCssClasses(['is-active' => in_array((string) $value, $carouselSelectedValues ?? [$carouselSelected], true)]); ?>" data-admin-filter-dot="<?php echo e($value); ?>"></span>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
  </div>
</nav>
<?php /**PATH C:\laragon\www\dr-sam\resources\views/superadmin/_filter-carousel.blade.php ENDPATH**/ ?>