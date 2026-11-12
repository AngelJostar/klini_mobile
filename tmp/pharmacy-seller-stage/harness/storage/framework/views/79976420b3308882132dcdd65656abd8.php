<header class="superadmin-native-topbar" aria-label="Perfil del usuario activo">
  <div class="superadmin-native-brand"><?php if (isset($component)) { $__componentOriginalaf03e9d7210fc1ea2feb6cc91ab05eba = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginalaf03e9d7210fc1ea2feb6cc91ab05eba = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.klini-brand','data' => ['label' => 'Superadministrador']] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('klini-brand'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['label' => 'Superadministrador']); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginalaf03e9d7210fc1ea2feb6cc91ab05eba)): ?>
<?php $attributes = $__attributesOriginalaf03e9d7210fc1ea2feb6cc91ab05eba; ?>
<?php unset($__attributesOriginalaf03e9d7210fc1ea2feb6cc91ab05eba); ?>
<?php endif; ?>
<?php if (isset($__componentOriginalaf03e9d7210fc1ea2feb6cc91ab05eba)): ?>
<?php $component = $__componentOriginalaf03e9d7210fc1ea2feb6cc91ab05eba; ?>
<?php unset($__componentOriginalaf03e9d7210fc1ea2feb6cc91ab05eba); ?>
<?php endif; ?></div>
  <div class="superadmin-native-session">
    <?php if (isset($component)) { $__componentOriginal8bda052d00eb3b1ee971634423df2d85 = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginal8bda052d00eb3b1ee971634423df2d85 = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.klini-session-menu','data' => ['showProfile' => true]] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('klini-session-menu'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['show-profile' => true]); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginal8bda052d00eb3b1ee971634423df2d85)): ?>
<?php $attributes = $__attributesOriginal8bda052d00eb3b1ee971634423df2d85; ?>
<?php unset($__attributesOriginal8bda052d00eb3b1ee971634423df2d85); ?>
<?php endif; ?>
<?php if (isset($__componentOriginal8bda052d00eb3b1ee971634423df2d85)): ?>
<?php $component = $__componentOriginal8bda052d00eb3b1ee971634423df2d85; ?>
<?php unset($__componentOriginal8bda052d00eb3b1ee971634423df2d85); ?>
<?php endif; ?>
  </div>
</header>
<?php echo $__env->make('superadmin._feedback', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
<?php /**PATH C:\laragon\www\dr-sam\resources\views/superadmin/_topbar.blade.php ENDPATH**/ ?>