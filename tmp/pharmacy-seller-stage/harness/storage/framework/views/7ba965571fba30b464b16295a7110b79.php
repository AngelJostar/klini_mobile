<dialog id="new-distributor-dialog" class="pharmacy-distributor-dialog" aria-labelledby="new-distributor-title" aria-describedby="new-distributor-description" data-open-on-load="<?php echo e($distributorErrors || (request('section') === 'create' && !session('status')) ? 'true' : 'false'); ?>">
  <header class="pharmacy-distributor-dialog-header">
    <div>
      <h2 id="new-distributor-title" tabindex="-1" autofocus>Nuevo distribuidor</h2>
      <p id="new-distributor-description">Agrega los datos de su cuenta para darlo de alta.</p>
    </div>
    <button type="button" class="pharmacy-distributor-close" data-close-distributor aria-label="Cerrar nuevo distribuidor">&times;</button>
  </header>
  <div class="pharmacy-distributor-dialog-content">
    <?php if($distributorErrors): ?>
      <div role="alert" class="pharmacy-notice pharmacy-distributor-errors">
        <?php $__currentLoopData = $errors->all(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $error): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><p><?php echo e($error); ?></p><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
      </div>
    <?php endif; ?>
    <form method="POST" action="<?php echo e(route('superadmin.distributors.store')); ?>" class="pharmacy-form" id="new-distributor-form">
      <?php echo csrf_field(); ?>
      <label class="pharmacy-distributor-wide">Nombre<input name="name" value="<?php echo e(old('name')); ?>" required maxlength="200" autocomplete="name"></label>
      <label>Correo<input name="email" type="email" value="<?php echo e(old('email')); ?>" required maxlength="200" autocomplete="email"></label>
      <label>Usuario<input name="username" value="<?php echo e(old('username')); ?>" required maxlength="100" autocomplete="off"></label>
      <label>Contraseña inicial<input name="password" type="password" autocomplete="new-password" required minlength="12"><small>12 caracteres, mayúsculas, minúsculas y números.</small></label>
      <label>Confirmar contraseña<input name="password_confirmation" type="password" autocomplete="new-password" required></label>
      <p class="pharmacy-distributor-wide pharmacy-distributor-hint">La publicación en Farmacia digital estará desactivada hasta que la autorices.</p>
    </form>
    <details class="pharmacy-distributor-demo" <?php if($errors->has('user_id')): ?> open <?php endif; ?>>
      <summary>Vincular cuenta demo existente</summary>
      <?php if($demoAccounts->isNotEmpty()): ?>
        <form method="POST" action="<?php echo e(route('superadmin.distributors.link-demo')); ?>" class="pharmacy-form">
          <?php echo csrf_field(); ?>
          <label class="pharmacy-distributor-wide">Cuenta demo<select name="user_id" required><option value="">Selecciona una cuenta</option><?php $__currentLoopData = $demoAccounts; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $demoAccount): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><option value="<?php echo e($demoAccount->id); ?>" <?php if(old('user_id') == $demoAccount->id): echo 'selected'; endif; ?>><?php echo e($demoAccount->name); ?> · Cuenta demo</option><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></select></label>
          <p class="pharmacy-distributor-wide">Se vincula su catálogo con publicación desactivada. Sus accesos se conservan.</p>
          <button type="submit">Vincular cuenta demo</button>
        </form>
      <?php else: ?>
        <p>No hay cuentas demo de distribuidor pendientes de vincular.</p>
      <?php endif; ?>
    </details>
  </div>
  <footer class="pharmacy-distributor-dialog-actions">
    <button type="button" class="pharmacy-distributor-cancel" data-close-distributor>Cancelar</button>
    <button type="submit" form="new-distributor-form">Crear distribuidor</button>
  </footer>
</dialog>
<?php /**PATH C:\laragon\www\dr-sam\resources\views/pharmacy-store/_distributor-dialog.blade.php ENDPATH**/ ?>