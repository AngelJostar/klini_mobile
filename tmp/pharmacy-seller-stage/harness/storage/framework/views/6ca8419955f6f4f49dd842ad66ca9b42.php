<?php $__env->startPush('styles'); ?>
<link rel="stylesheet" href="<?php echo e(asset('css/universal-medication-catalog.css')); ?>?v=<?php echo e(filemtime(public_path('css/universal-medication-catalog.css'))); ?>">
<?php $__env->stopPush(); ?>
<?php $__env->startPush('scripts'); ?>
<script src="<?php echo e(asset('js/universal-medication-catalog.js')); ?>?v=<?php echo e(filemtime(public_path('js/universal-medication-catalog.js'))); ?>" defer></script>
<?php $__env->stopPush(); ?>
<?php
    $pharmacyCatalog = $pharmacyCatalog ?? false;
    $catalogRoute = $pharmacyCatalog ? route('superadmin.digital-pharmacy') : route('superadmin.catalog', 'medications');
    $identifierErrors = $errors->hasAny(['sku', 'barcode', 'barcode_type']);
?>
<section class="superadmin-native-catalog-card universal-medication-catalog">
    <header class="superadmin-native-section-heading">
        <div>
            <h2><?php echo e($pharmacyCatalog ? 'Administración de productos' : $catalog['title']); ?></h2>
            <p><?php echo e($records->total()); ?> presentaciones · <?php echo e($pharmacyCatalog ? 'Conectadas al catálogo universal' : 'Medicamentos y presentaciones'); ?></p>
        </div>
        <div class="superadmin-native-heading-actions">
            <?php if($pharmacyCatalog): ?><a href="<?php echo e(route('superadmin.catalog', 'medications')); ?>">Catálogo universal</a><?php endif; ?>
            <a href="<?php echo e(route('superadmin.catalog.csv', ['section' => 'medications', 'q' => request('q'), 'status' => request('status')])); ?>" aria-label="Exportar CSV">CSV</a>
            <a href="<?php echo e(request()->fullUrl()); ?>">Actualizar</a>
        </div>
    </header>
    <form method="GET" action="<?php echo e($catalogRoute); ?>" class="medication-catalog-search">
        <?php if($pharmacyCatalog): ?><input type="hidden" name="section" value="catalog"><?php endif; ?>
        <label class="medication-search-label"><span>Buscar en todo el catálogo</span><input type="search" name="q" value="<?php echo e(request('q')); ?>" maxlength="160" placeholder="SKU, código de barras, CNIS, medicamento o descripción"></label>
        <label><span>Estatus</span><select name="status"><option value="all">Todos</option><?php $__currentLoopData = \App\Models\MedicationCatalogItem::STATUS_LABELS; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $label): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><option value="<?php echo e($key); ?>" <?php if(request('status') === $key): echo 'selected'; endif; ?>><?php echo e($label); ?></option><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></select></label>
        <button type="submit">Buscar</button>
        <?php if(request()->filled('q') || array_key_exists(request('status', ''), \App\Models\MedicationCatalogItem::STATUS_LABELS)): ?><a href="<?php echo e($catalogRoute); ?>">Limpiar</a><?php endif; ?>
        <button type="button" class="medication-add-product" data-new-medication aria-haspopup="dialog" aria-controls="new-medication-dialog">+ Agregar producto</button>
    </form>
    <details class="medication-catalog-sources">
        <summary>Fuentes oficiales e identificadores de demostración</summary>
        <p>Las descripciones, claves CNIS y disponibilidad por tipo de unidad de la carga demo proceden del <a href="<?php echo e(\Database\Seeders\ImssBienestarMedicationSeeder::SOURCE_URL); ?>" target="_blank" rel="noopener">listado de IMSS Bienestar · Rutas de la Salud v5.1</a>. Se contrastaron 152 claves también presentes en el <a href="https://data.salud.cdmx.gob.mx/ssdf/portalut/archivo/Actualizaciones/4toTrimestre21/Dir_Med_Tec_Ins/CIM.pdf" target="_blank" rel="noopener">catálogo de la Secretaría de Salud CDMX, edición 2020</a>. Consulta: 12 de noviembre de 2026.</p>
        <p>Los SKU y códigos marcados «Interno · demo» son identificadores de Klini. Las fuentes no proporcionan marcas ni códigos comerciales GTIN/EAN por fabricante; esos datos quedan por registrar.</p>
        <?php if($pharmacyCatalog): ?><p>Esta tabla administra la base de medicamentos. Los precios, existencias y publicación de la tienda se gestionan con los productos de los distribuidores.</p><?php endif; ?>
    </details>
    <?php if(!$pharmacyCatalog && session('status')): ?><p role="status" class="medication-catalog-notice"><?php echo e(session('status')); ?></p><?php endif; ?>
    <p class="medication-publication-feedback" role="status" hidden></p>
    <div class="superadmin-native-catalog-scroll">
        <table class="superadmin-native-catalog-table medication-catalog-table" data-drsam-table-filter-empty>
            <thead><tr>
                <th>SKU interno</th><th>Clave CNIS</th><th>Medicamento</th><th>Descripción</th>
                <th>Código de barras numérico</th><th data-drsam-table-filter-skip-column>Código de barras imagen</th>
                <th>Grupo</th><th>Denominación distintiva</th><th>Unidades móviles</th><th>Núcleos básicos</th><th>CESSA</th><th>Catálogo institucional de</th><th>Estatus</th><th data-drsam-table-filter-skip-column>Mostrar en farmacia digital</th><th data-drsam-table-filter-skip-column>Administrar</th>
            </tr></thead>
            <tbody>
                <?php $__empty_1 = true; $__currentLoopData = $records; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $record): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                <?php ($values = $catalog['map']($record)); ?>
                <tr>
                    <td><code><?php echo e($values[9]); ?></code></td>
                    <td><span class="medication-cnis"><?php echo e($values[0]); ?></span></td>
                    <td><strong class="superadmin-medication-name"><?php echo e($record->name); ?></strong><small class="superadmin-medication-code"><?php echo e($record->presentation); ?></small></td>
                    <td><?php echo e($values[3]); ?></td>
                    <td><code><?php echo e($values[10]); ?></code><?php if($record->barcode): ?><small class="medication-code-origin"><?php echo e($record->barcode_type === 'internal' ? 'Interno · demo' : ($record->barcode_type === 'commercial' ? 'Comercial · capturado' : 'Origen por registrar')); ?></small><?php endif; ?></td>
                    <td><?php if($record->barcode): ?><a href="<?php echo e($values[11]); ?>" target="_blank" rel="noopener" title="Abrir código de barras de <?php echo e($record->name); ?>"><img class="medication-barcode" src="<?php echo e($values[11]); ?>" alt="Código de barras <?php echo e($record->barcode); ?>" loading="lazy" width="286" height="120"></a><?php else: ?><span class="superadmin-medication-missing">Por registrar</span><?php endif; ?></td>
                    <td><?php echo e($values[1]); ?></td><td><?php echo e($values[4]); ?></td><td><?php echo e($values[5]); ?></td><td><?php echo e($values[6]); ?></td><td><?php echo e($values[7]); ?></td><td><?php echo e($values[8]); ?></td>
                    <td><button type="button" class="medication-status is-<?php echo e($record->status); ?>" aria-label="Cambiar estatus de <?php echo e($record->name); ?>" aria-haspopup="dialog" aria-controls="medication-status-dialog" data-status-medication="<?php echo e(json_encode(['id' => $record->id, 'name' => $record->name, 'sku' => $record->sku, 'status' => $record->status, 'action' => route('superadmin.medications.status', $record)])); ?>"><?php echo e($record->statusLabel()); ?> ▾</button></td>
                    <td><form method="POST" action="<?php echo e(route('superadmin.medications.publication', $record)); ?>" class="medication-publication-form" data-medication-publication><?php echo csrf_field(); ?> <?php echo method_field('PATCH'); ?>
                        <input type="hidden" name="digital_pharmacy_enabled" value="<?php echo e($record->digital_pharmacy_enabled ? '0' : '1'); ?>">
                        <button type="submit" role="switch" class="medication-publication-switch" aria-checked="<?php echo e($record->digital_pharmacy_enabled ? 'true' : 'false'); ?>" aria-label="Mostrar <?php echo e($record->name); ?> en farmacia digital"><span aria-hidden="true"></span><b><?php echo e($record->digital_pharmacy_enabled ? 'ON' : 'OFF'); ?></b></button>
                        <small><?php echo e($record->pharmacyCategory()); ?></small>
                        <?php if($record->status !== 'active'): ?><small>Visible cuando esté activo</small><?php endif; ?>
                    </form></td>
                    <td><button type="button" class="medication-edit" aria-haspopup="dialog" aria-controls="medication-identifiers-dialog" data-medication-id="<?php echo e($record->id); ?>" data-medication="<?php echo e(json_encode(['id' => $record->id, 'name' => $record->name, 'cnis' => $record->cnis, 'sku' => $record->sku, 'barcode' => $record->barcode, 'barcode_type' => $record->barcode_type, 'action' => route('superadmin.medications.identifiers', $record)])); ?>">Editar identificadores</button></td>
                </tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?><tr><td colspan="15" class="medication-empty">No hay medicamentos que coincidan con la búsqueda.</td></tr><?php endif; ?>
            </tbody>
        </table>
    </div>
    <footer class="medication-catalog-pagination">
        <span><?php echo e($records->total()); ?> presentaciones · <?php echo e($records->perPage()); ?> por página · Página <?php echo e($records->currentPage()); ?> de <?php echo e($records->lastPage()); ?></span>
        <nav aria-label="Paginación del catálogo">
            <?php if($records->previousPageUrl()): ?><a href="<?php echo e($records->previousPageUrl()); ?>">Anterior</a><?php endif; ?>
            <?php if($records->nextPageUrl()): ?><a href="<?php echo e($records->nextPageUrl()); ?>">Siguiente</a><?php endif; ?>
        </nav>
    </footer>
</section>
<dialog id="medication-identifiers-dialog" class="medication-identifiers-dialog" aria-labelledby="medication-identifiers-title" data-reopen-id="<?php echo e($identifierErrors ? old('identifier_id') : ''); ?>" data-old-identifiers="<?php echo e(json_encode(['sku' => old('sku'), 'barcode' => old('barcode'), 'barcode_type' => old('barcode_type')])); ?>">
    <header><div><h2 id="medication-identifiers-title">Editar identificadores</h2><p data-medication-caption></p></div><button type="button" data-close-medication aria-label="Cerrar">×</button></header>
    <form method="POST" data-medication-form>
        <?php echo csrf_field(); ?> <?php echo method_field('PATCH'); ?><input type="hidden" name="identifier_id">
        <?php if($identifierErrors): ?><div role="alert"><?php $__currentLoopData = $errors->all(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $error): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><p><?php echo e($error); ?></p><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></div><?php endif; ?>
        <label>SKU interno<input name="sku" inputmode="numeric" maxlength="9" minlength="9" pattern="1[0-9]{8}" autocomplete="off" required><small>Nueve dígitos; comienza con 1. Ejemplo: 100000001.</small></label>
        <label>Código de barras numérico<input name="barcode" inputmode="numeric" pattern="[0-9]{8,32}" minlength="8" maxlength="32" autocomplete="off"><small>Conserva los ceros iniciales. Entre 8 y 32 dígitos.</small></label>
        <label>Origen del código<select name="barcode_type"><option value="internal">Interno de Klini · demo</option><option value="commercial">Comercial del fabricante</option></select></label>
        <p class="medication-editor-hint">La imagen se genera al guardar. Para un código comercial, captura el número del envase del fabricante.</p>
        <footer><button type="button" data-close-medication>Cancelar</button><button type="submit">Guardar identificadores</button></footer>
    </form>
</dialog>
<?php echo $__env->make('superadmin.medications.create-dialog', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
<?php echo $__env->make('superadmin.medications.status-dialog', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
<?php /**PATH C:\laragon\www\dr-sam\resources\views/superadmin/medications/table.blade.php ENDPATH**/ ?>