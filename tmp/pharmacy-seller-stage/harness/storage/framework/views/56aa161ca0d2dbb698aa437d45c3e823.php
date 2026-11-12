<?php $__env->startPush('styles'); ?>
  <link rel="stylesheet" href="<?php echo e(asset('css/superadmin-workspace.css')); ?>?v=<?php echo e(filemtime(public_path('css/superadmin-workspace.css'))); ?>">
  <link rel="stylesheet" href="<?php echo e(asset('css/superadmin-catalog.css')); ?>?v=<?php echo e(filemtime(public_path('css/superadmin-catalog.css'))); ?>">
<?php $__env->stopPush(); ?>
<?php $__env->startPush('scripts'); ?>
  <script src="<?php echo e(asset('js/superadmin-workspace.js')); ?>?v=<?php echo e(filemtime(public_path('js/superadmin-workspace.js'))); ?>" defer></script>
<?php $__env->stopPush(); ?>
<?php
  $active = $active ?? 'dashboard';
  if (in_array($active, ['prescription-format', 'mix-request-format'], true)) $active = 'services';
  $sidebarItems = [
    ['key' => 'dashboard', 'icon' => '#', 'label' => 'Dashboard', 'href' => route('superadmin.dashboard')],
    ['key' => 'mobile-app', 'icon' => 'App', 'label' => 'Aplicacion Movil', 'href' => route('superadmin.mobile-app')],
    ['key' => 'digital-pharmacy', 'icon' => 'Rx', 'label' => 'Farmacia digital', 'href' => route('superadmin.digital-pharmacy')],
    ['key' => 'distributors', 'icon' => 'D', 'label' => 'Distribuidores', 'href' => route('superadmin.distributors')],
    ['key' => 'users', 'icon' => 'U', 'label' => 'Usuarios de la plataforma', 'href' => route('superadmin.catalog', 'users')],
    ['key' => 'institutions', 'icon' => 'I', 'label' => 'Instituciones', 'href' => route('superadmin.catalog', 'institutions')],
    ['key' => 'services', 'icon' => 'S', 'label' => 'Servicios integrales', 'href' => route('superadmin.catalog', 'services')],
    ['key' => 'doctors', 'icon' => 'M', 'label' => 'Médicos', 'href' => route('superadmin.catalog', 'doctors')],
    ['key' => 'providers', 'icon' => 'V', 'label' => 'Vendedores', 'href' => route('superadmin.catalog', 'providers')],
    ['key' => 'insurance-carriers', 'icon' => 'A', 'label' => 'Aseguradoras', 'href' => route('superadmin.catalog', 'insurance-carriers')],
    ['key' => 'insurance-advisors', 'icon' => 'As', 'label' => 'Asesores de seguros', 'href' => route('superadmin.catalog', 'insurance-advisors')],
    ['key' => 'specialties', 'icon' => 'E', 'label' => 'Especialidades', 'href' => route('superadmin.catalog', 'specialties')],
    ['key' => 'medications', 'icon' => 'Rx', 'label' => 'Medicamentos e insumos', 'href' => route('superadmin.catalog', 'medications')],
    ['key' => 'medical-devices', 'icon' => 'Dm', 'label' => 'Dispositivos médicos', 'href' => route('superadmin.catalog', 'medical-devices')],
    ['key' => 'patients', 'icon' => 'P', 'label' => 'Pacientes', 'href' => route('superadmin.catalog', 'patients')],
    ['key' => 'hospitals', 'icon' => 'H', 'label' => 'Hospitales', 'href' => route('superadmin.catalog', 'hospitals')],
    ['key' => 'subscriptions', 'icon' => 'S', 'label' => 'Suscripciones', 'href' => route('superadmin.catalog', 'subscriptions')],
    ['key' => 'advertising', 'icon' => 'Ad', 'label' => 'Publicidad', 'href' => route('superadmin.catalog', 'advertising')],
    ['key' => 'modules', 'icon' => 'Mo', 'label' => 'Modulos', 'href' => route('superadmin.catalog', 'modules')],
    ['key' => 'access', 'icon' => 'K', 'label' => 'Acceso', 'href' => route('superadmin.catalog', 'access')],
  ];
?>

<aside class="superadmin-native-sidebar" aria-label="Navegacion superadministrador">
  <nav class="superadmin-native-menu" tabindex="0" aria-label="Menú del Superadministrador">
    <?php $__currentLoopData = $sidebarItems; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
      <a class="<?php echo \Illuminate\Support\Arr::toCssClasses(['is-active' => $active === $item['key']]); ?>" href="<?php echo e($item['href']); ?>">
        <span class="klini-nav-icon" aria-hidden="true"><?php if (isset($component)) { $__componentOriginal1dfdea2f50f15cd96777011ab20e2673 = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginal1dfdea2f50f15cd96777011ab20e2673 = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.klini-icon','data' => ['name' => ''.e(['doctors' => 'admin-doctor', 'medications' => 'admin-medication', 'medical-devices' => 'admin-device', 'subscriptions' => 'admin-subscription', 'prescription-format' => 'admin-document'][$item['key']] ?? \Illuminate\Support\Str::ascii($item['label'])).'']] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('klini-icon'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['name' => ''.e(['doctors' => 'admin-doctor', 'medications' => 'admin-medication', 'medical-devices' => 'admin-device', 'subscriptions' => 'admin-subscription', 'prescription-format' => 'admin-document'][$item['key']] ?? \Illuminate\Support\Str::ascii($item['label'])).'']); ?>
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
        <?php echo e($item['label']); ?>

      </a>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
  </nav>
</aside>
<?php /**PATH C:\laragon\www\dr-sam\resources\views/superadmin/_sidebar.blade.php ENDPATH**/ ?>