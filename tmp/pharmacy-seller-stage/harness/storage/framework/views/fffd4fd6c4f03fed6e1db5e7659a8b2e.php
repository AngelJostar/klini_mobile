<?php $attributes ??= new \Illuminate\View\ComponentAttributeBag;

$__newAttributes = [];
$__propNames = \Illuminate\View\ComponentAttributeBag::extractPropNames((['showProfile' => false]));

foreach ($attributes->all() as $__key => $__value) {
    if (in_array($__key, $__propNames)) {
        $$__key = $$__key ?? $__value;
    } else {
        $__newAttributes[$__key] = $__value;
    }
}

$attributes = new \Illuminate\View\ComponentAttributeBag($__newAttributes);

unset($__propNames);
unset($__newAttributes);

foreach (array_filter((['showProfile' => false]), 'is_string', ARRAY_FILTER_USE_KEY) as $__key => $__value) {
    $$__key = $$__key ?? $__value;
}

$__defined_vars = get_defined_vars();

foreach ($attributes->all() as $__key => $__value) {
    if (array_key_exists($__key, $__defined_vars)) unset($$__key);
}

unset($__defined_vars, $__key, $__value); ?>
<?php
  $sessionUser = auth()->user();
  $sessionModules = $sessionUser ? app(\App\Services\Platform\DashboardRegistry::class)->modulesFor($sessionUser) : collect();
?>
<details class="klini-session-menu">
  <summary aria-label="Opciones de sesión y módulos">
    <span class="klini-session-avatar" aria-hidden="true"><?php echo e(mb_substr($sessionUser?->name ?? 'K', 0, 1)); ?></span>
    <?php if($showProfile): ?>
      <span><?php echo e($sessionUser?->name ?? 'Mi sesión'); ?><small class="klini-session-user"><?php echo e($sessionUser?->role_enum?->label() ?? 'Usuario'); ?> · Sesión activa</small></span>
    <?php else: ?>
      <span>Cambiar módulo<small class="klini-session-user"><?php echo e($sessionUser?->name ?? 'Mi sesión'); ?></small></span>
    <?php endif; ?>
    <span aria-hidden="true">⌄</span>
  </summary>
  <div class="klini-session-dropdown">
    <div class="klini-session-heading">Cambiar de módulo<small>Accesos autorizados para tu sesión</small></div>
    <nav aria-label="Módulos autorizados">
      <?php $__currentLoopData = $sessionModules; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $sessionModule): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <a href="<?php echo e($sessionModule['url']); ?>" <?php if(url()->current() === $sessionModule['url']): ?> aria-current="page" <?php endif; ?>><?php if (isset($component)) { $__componentOriginal1dfdea2f50f15cd96777011ab20e2673 = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginal1dfdea2f50f15cd96777011ab20e2673 = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.klini-icon','data' => ['name' => ''.e($sessionModule['key']).'']] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('klini-icon'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['name' => ''.e($sessionModule['key']).'']); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginal1dfdea2f50f15cd96777011ab20e2673)): ?>
<?php $attributes = $__attributesOriginal1dfdea2f50f15cd96777011ab20e2673; ?>
<?php unset($__attributesOriginal1dfdea2f50f15cd96777011ab20e2673); ?>
<?php endif; ?>
<?php if (isset($__componentOriginal1dfdea2f50f15cd96777011ab20e2673)): ?>
<?php $component = $__componentOriginal1dfdea2f50f15cd96777011ab20e2673; ?>
<?php unset($__componentOriginal1dfdea2f50f15cd96777011ab20e2673); ?>
<?php endif; ?><span><?php echo e($sessionModule['label']); ?></span><span aria-hidden="true">↗</span></a>
      <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    </nav>
    <form method="post" action="<?php echo e(route('logout')); ?>">
      <?php echo csrf_field(); ?>
      <button type="submit">Cerrar sesión <span aria-hidden="true">→</span></button>
    </form>
  </div>
</details>
<form class="klini-session-logout" method="post" action="<?php echo e(route('logout')); ?>">
  <?php echo csrf_field(); ?>
  <button type="submit">Cerrar sesión <span aria-hidden="true">→</span></button>
</form>
<?php /**PATH C:\laragon\www\dr-sam\resources\views/components/klini-session-menu.blade.php ENDPATH**/ ?>