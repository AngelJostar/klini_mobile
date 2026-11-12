<?php $attributes ??= new \Illuminate\View\ComponentAttributeBag;

$__newAttributes = [];
$__propNames = \Illuminate\View\ComponentAttributeBag::extractPropNames((['label' => null, 'inverse' => false]));

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

foreach (array_filter((['label' => null, 'inverse' => false]), 'is_string', ARRAY_FILTER_USE_KEY) as $__key => $__value) {
    $$__key = $$__key ?? $__value;
}

$__defined_vars = get_defined_vars();

foreach ($attributes->all() as $__key => $__value) {
    if (array_key_exists($__key, $__defined_vars)) unset($$__key);
}

unset($__defined_vars, $__key, $__value); ?>
<span <?php echo e($attributes->class(['klini-brand'])); ?>>
  <img src="<?php echo e(asset('brand/klini/'.($inverse ? 'klini-white.svg' : 'klini.svg'))); ?>" alt="Klini" width="120" height="56">
  <?php if($label): ?><span class="klini-brand-label"><?php echo e($label); ?></span><?php endif; ?>
</span>
<?php /**PATH C:\laragon\www\dr-sam\resources\views/components/klini-brand.blade.php ENDPATH**/ ?>