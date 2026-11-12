<?php
  $feedbackErrors = collect($errors->getBags())->flatMap(fn ($bag) => $bag->all())->unique()->values();
  $feedbackMessages = collect(['status', 'success', 'error', 'warning', 'info'])
    ->map(fn ($key) => session($key))->filter(fn ($message) => is_string($message) && $message !== '')->unique()->values();
  $feedbackIsError = $feedbackErrors->isNotEmpty() || session()->has('error');
?>

<?php if($feedbackMessages->isNotEmpty() || $feedbackErrors->isNotEmpty()): ?>
  <dialog class="superadmin-feedback-dialog <?php echo e($feedbackIsError ? 'is-error' : ''); ?>" data-admin-feedback-dialog aria-labelledby="admin-feedback-title" aria-describedby="admin-feedback-content">
    <header>
      <h2 id="admin-feedback-title"><?php echo e($feedbackIsError ? 'Revisa la información' : 'Aviso'); ?></h2>
      <button type="button" data-admin-feedback-close aria-label="Cerrar mensaje" autofocus>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </header>
    <div id="admin-feedback-content">
      <?php $__currentLoopData = $feedbackMessages; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $message): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <p><?php echo e($message); ?></p>
      <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
      <?php if($feedbackErrors->isNotEmpty()): ?>
        <ul><?php $__currentLoopData = $feedbackErrors; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $error): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><li><?php echo e($error); ?></li><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></ul>
      <?php endif; ?>
    </div>
  </dialog>
<?php endif; ?>
<?php /**PATH C:\laragon\www\dr-sam\resources\views/superadmin/_feedback.blade.php ENDPATH**/ ?>