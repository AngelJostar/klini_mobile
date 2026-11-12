<?php $__env->startSection('body_class', 'superadmin-native-body superadmin-catalog-body'.($section === 'doctors' ? ' superadmin-doctors-catalog-body' : '').($section === 'medications' ? ' superadmin-medications-catalog-body' : '').($section === 'institutions' ? ' superadmin-institutions-catalog-body' : '')); ?>

<?php
  $statusLabels = [
    'active' => 'Activo',
    'inactive' => 'Inactivo',
    'suspended' => 'Suspendido',
    'enabled' => 'Habilitado',
    'disabled' => 'Deshabilitado',
    'authorized' => 'Autorizado',
  ];

  $badgeText = fn ($value) => $statusLabels[strtolower((string) $value)] ?? ucfirst((string) $value);
  $carouselParameter = 'status';
  $carouselOptions = ['all' => 'Todos', 'active' => 'Activos', 'inactive' => 'Inactivos'];
  if (in_array($section, ['users', 'insurance-advisors'], true)) {
    $carouselOptions['suspended'] = 'Suspendidos';
  } elseif ($section === 'medications') {
    $carouselOptions += ['shortage' => 'Desabasto', 'discontinued' => 'Descontinuado'];
  } elseif ($section === 'medical-devices') {
    $carouselOptions['evaluation'] = 'En evaluación';
  } elseif ($section === 'access') {
    $carouselParameter = 'module';
    $carouselShortLabels = [
      'superadmin' => 'Superadmin', 'institution' => 'Instituciones', 'unit' => 'Unidades',
      'operational' => 'Operación', 'operational_outpatient' => 'Consulta externa',
      'external_pharmacy' => 'Farmacia externa', 'digital_pharmacy' => 'Farmacia digital',
      'doctor' => 'Médicos', 'patient' => 'Pacientes', 'insurance_health' => 'Aseguradoras',
      'insurance_advisor' => 'Asesores GMM', 'provider_npt' => 'Proveedor NPT',
      'provider_import' => 'Importación', 'provider_medicines' => 'Distribuidores',
      'provider_clinical_labs' => 'Laboratorios', 'community_admin' => 'Comunidades',
    ];
    $moduleLabels = \App\Models\PlatformModule::query()->pluck('label', 'key');
    foreach (\App\Models\User::query()->whereNotNull('module')->distinct()->orderBy('module')->pluck('module') as $moduleKey) {
      $carouselOptions[$moduleKey] = $moduleLabels[$moduleKey] ?? ucfirst(str_replace('_', ' ', $moduleKey));
    }
    unset($carouselOptions['active'], $carouselOptions['inactive']);
  } elseif ($section === 'subscriptions') {
    $carouselParameter = null;
    $carouselOptions = ['all' => 'Todos'] + collect($subscriptionSettings['plans'])->pluck('name', 'id')->all();
  } elseif ($section === 'prescription-format') {
    $carouselParameter = null;
    $carouselOptions = ['all' => 'Completo', 'patient' => 'Paciente', 'clinical' => 'Datos clínicos', 'medications' => 'Medicamentos', 'doctor' => 'Médico'];
  } elseif ($section === 'mix-request-format') {
    $carouselParameter = null;
    $carouselOptions = ['all' => 'Todos', 'oncology' => 'Mezcla oncologica', 'parenteral' => 'Nutricion parenteral'];
  } elseif ($section === 'advertising') {
    $carouselParameter = null;
    $carouselOptions = ['all' => 'Todos', 'primary' => 'Principal', 'secondary' => 'Secundario'];
  }
  $carouselSelected = $carouselParameter ? ($filters[$carouselParameter] ?: 'all') : 'all';
  if ($section === 'mix-request-format' && isset($mixFormatPanel)) {
    $carouselOptions = [$mixFormatPanel => $carouselOptions[$mixFormatPanel]];
    $carouselSelected = $mixFormatPanel;
  }
  if ($section === 'users') {
    $carouselOptions = ['all' => 'Todos', 'klini' => 'Klini', 'operational' => 'Operativos'] + $carouselOptions;
    $carouselQueries = [];
    foreach ($carouselOptions as $value => $label) {
      $isCategory = in_array($value, ['klini', 'operational'], true);
      $carouselQueries[$value] = ['category' => $isCategory ? $value : null, 'status' => $isCategory ? null : $value];
    }
    if (in_array($filters['category'], ['klini', 'operational'], true)) {
      $carouselSelected = $filters['category'];
    }
  }
  $doctorView = $section === 'doctors' && in_array(request('view'), ['catalog', 'commissions'], true) ? request('view') : 'all';
  if ($section === 'insurance-carriers') {
    $carouselShortLabels = ['gmm' => 'Gastos médicos', 'life' => 'Seguros de vida'];
    $carouselOptions += ['gmm' => 'Seguros de gastos médicos mayores', 'life' => 'Seguros de vida'];
    $carouselQueries = [
      'all' => ['status' => 'all', 'view' => request('view', 'carriers'), 'edit_plan' => null],
      'active' => ['status' => 'active', 'edit_plan' => null], 'inactive' => ['status' => 'inactive', 'edit_plan' => null],
      'gmm' => ['view' => 'gmm', 'edit_plan' => null], 'life' => ['view' => 'life', 'edit_plan' => null],
    ];
    $carouselIcons = ['gmm' => 'insurance-medical', 'life' => 'insurance-life'];
    $carouselSelectedValues = [in_array($filters['status'], ['active', 'inactive'], true) ? $filters['status'] : 'all'];
    if (in_array(request('view'), ['gmm', 'life'], true)) $carouselSelectedValues[] = request('view');
  }
  if ($section === 'doctors') {
    $carouselOptions += ['catalog' => 'Catálogo', 'commissions' => 'Tabla de comisiones'];
    $carouselQueries = [
      'all' => ['status' => 'all', 'view' => null],
      'active' => ['status' => 'active', 'view' => null],
      'inactive' => ['status' => 'inactive', 'view' => null],
      'catalog' => ['view' => 'catalog'],
      'commissions' => ['view' => 'commissions'],
    ];
    $carouselIcons = ['catalog' => 'admin-document', 'commissions' => 'module'];
    if ($doctorView !== 'all') $carouselSelected = $doctorView;
  }
  $csvUrl = route('superadmin.catalog.csv', array_filter([
    'section' => $section,
    'q' => $filters['q'] ?: null,
    'status' => $filters['status'] ?: null,
    'module' => $filters['module'] ?: null,
    'category' => $filters['category'] ?: null,
    'view' => $section === 'insurance-carriers' ? request('view') : null,
    'carrier' => $section === 'insurance-carriers' ? request('carrier') : null,
  ]));
  $advertisingSettings = \App\Models\PlatformModule::query()->where('key', 'advertising')->first()?->settings['advertising_config'] ?? [];
  $prescriptionSettings = \App\Models\PlatformModule::query()->where('key', 'doctor')->first()?->settings['prescription_format'] ?? [];
?>

<?php $__env->startSection('content'); ?>
  <div class="superadmin-native-screen">
    <?php echo $__env->make('superadmin._topbar', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
    <?php echo $__env->make('superadmin._sidebar', ['active' => $section], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>

    <section class="superadmin-native-workspace<?php if($section === 'insurance-carriers'): ?> superadmin-insurance-workspace<?php endif; ?>" tabindex="0" aria-label="Contenido del Superadministrador">
      <h1 class="superadmin-native-page-title"><?php echo e($catalog['title']); ?></h1>

      <?php echo $__env->make('superadmin._filter-carousel', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>

      <?php if(false && $section === 'advertising'): ?>
        <section class="superadmin-native-admin-form">
          <div>
            <p class="eyebrow">Gestion de banners</p>
            <h2>Publicidad editable</h2>
          </div>
          <form method="post" action="<?php echo e(route('superadmin.settings.update', 'advertising')); ?>">
            <?php echo csrf_field(); ?>
            <label>Modulo con espacios publicitarios
              <select name="module">
                <?php $__currentLoopData = \App\Models\PlatformModule::query()->orderBy('label')->get(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $module): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                  <option value="<?php echo e($module->key); ?>" <?php if(($advertisingSettings['module'] ?? 'doctor') === $module->key): echo 'selected'; endif; ?>><?php echo e($module->label); ?></option>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
              </select>
            </label>
            <label>Titulo principal
              <input name="primary_title" required value="<?php echo e($advertisingSettings['primary_title'] ?? 'Consulta Privada'); ?>">
            </label>
            <label>Texto principal
              <input name="primary_copy" value="<?php echo e($advertisingSettings['primary_copy'] ?? 'Agenda, paciente y resumen clinico.'); ?>">
            </label>
            <label>CTA principal
              <input name="primary_cta" value="<?php echo e($advertisingSettings['primary_cta'] ?? 'Ver servicio'); ?>">
            </label>
            <label>Titulo secundario
              <input name="secondary_title" value="<?php echo e($advertisingSettings['secondary_title'] ?? 'Receta digital'); ?>">
            </label>
            <label>CTA secundario
              <input name="secondary_cta" value="<?php echo e($advertisingSettings['secondary_cta'] ?? 'Abrir receta'); ?>">
            </label>
            <button type="submit">Guardar banners</button>
          </form>
        </section>
      <?php endif; ?>

      <?php if(false && $section === 'patients'): ?>
        <section class="superadmin-native-admin-form">
          <div>
            <p class="eyebrow">Alta de paciente</p>
            <h2>Nuevo paciente usuario</h2>
          </div>
          <form method="post" action="<?php echo e(route('superadmin.patients.store')); ?>">
            <?php echo csrf_field(); ?>
            <label>Nombre completo
              <input name="full_name" required placeholder="Claudia Beatriz Salinas Vega">
            </label>
            <label>Nombre(s)
              <input name="first_name" placeholder="Claudia Beatriz">
            </label>
            <label>Apellidos
              <input name="last_name" placeholder="Salinas Vega">
            </label>
            <label>No. plataforma
              <input name="platform_number" placeholder="100000001">
            </label>
            <label>Usuario
              <input name="username" placeholder="paciente">
            </label>
            <label>Correo
              <input name="email" type="email" placeholder="paciente@example.com">
            </label>
            <label>Telefono
              <input name="phone" placeholder="5555550101">
            </label>
            <label>CURP
              <input name="curp" maxlength="18" placeholder="CURP">
            </label>
            <label>Estatus
              <select name="status">
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </label>
            <button type="submit">Guardar paciente</button>
          </form>
        </section>
      <?php endif; ?>

      <?php if(false && $section === 'prescription-format'): ?>
        <section class="superadmin-native-admin-form">
          <div>
            <p class="eyebrow">Formato de receta</p>
            <h2>Configuracion documental</h2>
          </div>
          <form method="post" action="<?php echo e(route('superadmin.settings.update', 'prescription-format')); ?>">
            <?php echo csrf_field(); ?>
            <label>Prefijo de folio
              <input name="folio_prefix" required value="<?php echo e($prescriptionSettings['folio_prefix'] ?? 'RX-SA'); ?>">
            </label>
            <label>Servicio por defecto
              <input name="default_service" value="<?php echo e($prescriptionSettings['default_service'] ?? 'Consulta externa'); ?>">
            </label>
            <label>Diagnostico requerido
              <select name="diagnosis_required">
                <option value="1" <?php if(($prescriptionSettings['diagnosis_required'] ?? true) == true): echo 'selected'; endif; ?>>Si</option>
                <option value="0" <?php if(($prescriptionSettings['diagnosis_required'] ?? true) == false): echo 'selected'; endif; ?>>No</option>
              </select>
            </label>
            <label>Medicamento requerido
              <select name="medication_required">
                <option value="1" <?php if(($prescriptionSettings['medication_required'] ?? true) == true): echo 'selected'; endif; ?>>Si</option>
                <option value="0" <?php if(($prescriptionSettings['medication_required'] ?? true) == false): echo 'selected'; endif; ?>>No</option>
              </select>
            </label>
            <label>Nota al pie
              <input name="footer_note" value="<?php echo e($prescriptionSettings['footer_note'] ?? 'Formato base copiado del modulo Area Operativa de Farmacia Externa.'); ?>">
            </label>
            <button type="submit">Guardar formato</button>
          </form>
        </section>
      <?php endif; ?>

      <?php if($section === 'patients'): ?>
        <?php
          $patientInstitutions = \App\Models\Institution::query()
              ->with(['medicalUnits' => fn ($query) => $query->orderBy('name')])
              ->orderBy('name')
              ->get();
          $totalPatients = \App\Models\Patient::query()->count();

          $patientInstitutionGroups = $patientInstitutions->map(function ($institution) {
              $units = $institution->medicalUnits->map(function ($unit) {
                  $appointments = \App\Models\Appointment::query()
                      ->with('patient')
                      ->where('medical_unit_id', $unit->id)
                      ->whereNotNull('patient_id')
                      ->latest('starts_at')
                      ->get()
                      ->unique('patient_id')
                      ->values();

                  return (object) [
                      'unit' => $unit,
                      'appointments' => $appointments,
                      'patient_count' => $appointments->count(),
                  ];
              });

              return (object) [
                  'institution' => $institution,
                  'units' => $units,
                  'patient_count' => $units->sum('patient_count'),
              ];
          });
        ?>

        <div id="patient-catalog-overview">
          <section class="superadmin-native-catalog-card superadmin-native-patient-card">
            <div class="superadmin-native-section-heading">
              <div>
                <h2>Pacientes usuarios de plataforma</h2>
                <p><?php echo e($records->total()); ?> usuarios pacientes</p>
              </div>
              <a href="<?php echo e($csvUrl); ?>">CSV</a>
            </div>
            <div class="superadmin-native-catalog-scroll">
              <table class="superadmin-native-catalog-table">
              <thead>
                <tr>
                  <th>Paciente usuario</th>
                  <th>No. usuario plataforma</th>
                  <th>Usuario</th>
                  <th>Contrasena</th>
                  <th>Estatus</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <?php $__empty_1 = true; $__currentLoopData = $records; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $patient): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                  <tr>
                    <td>
                      <strong><?php echo e($patient->full_name); ?></strong>
                      <span>Usuario de plataforma</span>
                    </td>
                    <td><?php echo e($patient->platform_number ?? str_pad((string) $patient->id, 8, '0', STR_PAD_LEFT)); ?></td>
                    <td><?php echo e($patient->user?->username ?? 'Sin usuario'); ?></td>
                    <td>••••••••</td>
                    <td>
                      <span class="<?php echo \Illuminate\Support\Arr::toCssClasses(['superadmin-native-status-pill', 'is-danger' => $patient->status !== 'active']); ?>">
                        <?php echo e($badgeText($patient->status)); ?>

                      </span>
                    </td>
                    <td>
                      <div class="superadmin-native-row-actions">
                        <a href="<?php echo e(route('patient.dashboard')); ?>">Abrir</a>
                      </div>
                    </td>
                  </tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                  <tr>
                    <td colspan="6">Sin pacientes usuarios de plataforma.</td>
                  </tr>
                <?php endif; ?>
              </tbody>
              </table>
            </div>
          </section>

          <section class="superadmin-native-catalog-card superadmin-native-patient-card">
            <div class="superadmin-native-section-heading">
              <div>
                <h2>Pacientes de unidades por institucion</h2>
                <p><?php echo e($patientInstitutions->count()); ?> instituciones con pacientes</p>
              </div>
            </div>
            <div class="superadmin-native-catalog-scroll">
              <table class="superadmin-native-catalog-table">
              <thead>
                <tr>
                  <th>Institucion</th>
                  <th>Unidades</th>
                  <th>Pacientes</th>
                  <th>Estatus</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <?php $__empty_1 = true; $__currentLoopData = $patientInstitutionGroups; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $group): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                  <?php
                    $institution = $group->institution;
                  ?>
                  <tr>
                    <td>
                      <strong><?php echo e($institution->name); ?></strong>
                      <span><?php echo e($institution->external_id ?? 'institution'); ?></span>
                    </td>
                    <td><?php echo e($group->units->count()); ?></td>
                    <td><?php echo e($group->patient_count ?: ($loop->first ? $totalPatients : 0)); ?></td>
                    <td>
                      <span class="<?php echo \Illuminate\Support\Arr::toCssClasses(['superadmin-native-status-pill', 'is-danger' => $institution->status !== 'active']); ?>">
                        <?php echo e($badgeText($institution->status)); ?>

                      </span>
                    </td>
                    <td>
                      <div class="superadmin-native-row-actions">
                        <button type="button" data-patient-units="<?php echo e($institution->id); ?>">Ver unidades</button>
                      </div>
                    </td>
                  </tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                  <tr>
                    <td colspan="5">Sin instituciones con pacientes.</td>
                  </tr>
                <?php endif; ?>
              </tbody>
              </table>
            </div>
          </section>
        </div>

        <?php $__currentLoopData = $patientInstitutionGroups; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $group): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
          <section class="superadmin-native-catalog-card superadmin-native-patient-card superadmin-patient-units-panel"
                   data-patient-units-panel="<?php echo e($group->institution->id); ?>" hidden>
            <div class="superadmin-native-section-heading">
              <div>
                <h2><?php echo e($group->institution->name); ?></h2>
                <p><?php echo e($group->units->count()); ?> unidades con pacientes</p>
              </div>
              <button type="button" class="superadmin-patient-back" data-patient-units-back>&larr; Volver</button>
            </div>
            <div class="superadmin-native-catalog-scroll">
              <table class="superadmin-native-catalog-table">
                <thead>
                  <tr>
                    <th>Unidad</th>
                    <th>Pacientes</th>
                    <th>Estatus</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <?php $__empty_1 = true; $__currentLoopData = $group->units; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $unitData): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                    <tr>
                      <td>
                        <strong><?php echo e($unitData->unit->name); ?></strong>
                        <span><?php echo e($unitData->unit->external_id ?? 'unidad-'.str_pad((string) $unitData->unit->id, 3, '0', STR_PAD_LEFT)); ?></span>
                      </td>
                      <td><?php echo e($unitData->patient_count); ?></td>
                      <td>
                        <span class="<?php echo \Illuminate\Support\Arr::toCssClasses(['superadmin-native-status-pill', 'is-danger' => $unitData->unit->status !== 'active']); ?>">
                          <?php echo e($badgeText($unitData->unit->status)); ?>

                        </span>
                      </td>
                      <td>
                        <div class="superadmin-native-row-actions">
                          <button type="button"
                                  data-unit-patients="<?php echo e($unitData->unit->id); ?>"
                                  data-parent-institution="<?php echo e($group->institution->id); ?>">Ver pacientes</button>
                        </div>
                      </td>
                    </tr>
                  <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                    <tr>
                      <td colspan="4">Esta institucion no tiene unidades registradas.</td>
                    </tr>
                  <?php endif; ?>
                </tbody>
              </table>
            </div>
          </section>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

        <?php $__currentLoopData = $patientInstitutionGroups; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $group): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
          <?php $__currentLoopData = $group->units; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $unitData): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <section class="superadmin-native-catalog-card superadmin-native-patient-card superadmin-unit-patients-panel"
                     data-unit-patients-panel="<?php echo e($unitData->unit->id); ?>" hidden>
              <div class="superadmin-native-section-heading">
                <div>
                  <h2><?php echo e($unitData->unit->name); ?></h2>
                  <p><?php echo e($unitData->patient_count); ?> pacientes ordenados alfabeticamente</p>
                </div>
                <button type="button" class="superadmin-patient-back"
                        data-unit-patients-back="<?php echo e($group->institution->id); ?>">&larr; Volver a unidades</button>
              </div>
              <div class="superadmin-native-catalog-scroll">
                <table class="superadmin-native-catalog-table">
                  <thead>
                    <tr>
                      <th>Paciente</th>
                      <th>Expediente</th>
                      <th>Servicio</th>
                      <th>Diagnostico</th>
                      <th>Unidad</th>
                      <th>Estatus</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <?php $__empty_1 = true; $__currentLoopData = $unitData->appointments->sortBy(fn ($appointment) => $appointment->patient?->full_name); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $appointment): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                      <?php
                        $unitPatient = $appointment->patient;
                        $recordNumber = data_get($appointment->metadata, 'record_number')
                            ?? data_get($unitPatient?->metadata, 'record_number')
                            ?? 'EXP-'.str_pad((string) $unitPatient?->id, 5, '0', STR_PAD_LEFT);
                        $service = data_get($appointment->metadata, 'service')
                            ?? $appointment->specialty
                            ?? $appointment->reason
                            ?? 'Consulta general';
                        $diagnosis = data_get($appointment->metadata, 'diagnosis')
                            ?? data_get($unitPatient?->metadata, 'diagnosis')
                            ?? 'Sin diagnostico registrado';
                      ?>
                      <tr>
                        <td>
                          <strong><?php echo e($unitPatient?->full_name ?? 'Paciente sin nombre'); ?></strong>
                          <span>
                            <?php echo e($unitPatient?->platform_number ?? 'PAC-'.str_pad((string) $unitPatient?->id, 4, '0', STR_PAD_LEFT)); ?>

                            <?php if($unitPatient?->sex): ?> - <?php echo e(ucfirst($unitPatient->sex)); ?> <?php endif; ?>
                            <?php if($unitPatient?->birth_date): ?> - <?php echo e($unitPatient->birth_date->age); ?> anos <?php endif; ?>
                          </span>
                        </td>
                        <td><?php echo e($recordNumber); ?></td>
                        <td><?php echo e($service); ?></td>
                        <td><?php echo e($diagnosis); ?></td>
                        <td><?php echo e($unitData->unit->name); ?></td>
                        <td><span class="superadmin-native-status-pill"><?php echo e($badgeText($appointment->status)); ?></span></td>
                        <td><div class="superadmin-native-row-actions"><a href="<?php echo e(route('patient.dashboard')); ?>">Abrir</a></div></td>
                      </tr>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                      <tr><td colspan="7">Esta unidad no tiene pacientes registrados.</td></tr>
                    <?php endif; ?>
                  </tbody>
                </table>
              </div>
            </section>
          <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

        <script>
          (() => {
            const overview = document.getElementById('patient-catalog-overview');
            const panels = document.querySelectorAll('[data-patient-units-panel]');
            const patientPanels = document.querySelectorAll('[data-unit-patients-panel]');

            document.querySelectorAll('[data-patient-units]').forEach((button) => {
              button.addEventListener('click', () => {
                overview.hidden = true;
                patientPanels.forEach((panel) => panel.hidden = true);
                panels.forEach((panel) => {
                  panel.hidden = panel.dataset.patientUnitsPanel !== button.dataset.patientUnits;
                });
              });
            });

            document.querySelectorAll('[data-patient-units-back]').forEach((button) => {
              button.addEventListener('click', () => {
                panels.forEach((panel) => panel.hidden = true);
                overview.hidden = false;
              });
            });

            document.querySelectorAll('[data-unit-patients]').forEach((button) => {
              button.addEventListener('click', () => {
                panels.forEach((panel) => panel.hidden = true);
                patientPanels.forEach((panel) => {
                  panel.hidden = panel.dataset.unitPatientsPanel !== button.dataset.unitPatients;
                });
              });
            });

            document.querySelectorAll('[data-unit-patients-back]').forEach((button) => {
              button.addEventListener('click', () => {
                patientPanels.forEach((panel) => panel.hidden = true);
                panels.forEach((panel) => {
                  panel.hidden = panel.dataset.patientUnitsPanel !== button.dataset.unitPatientsBack;
                });
              });
            });
          })();
        </script>
      <?php elseif($section === 'subscriptions'): ?>
        <?php echo $__env->make('superadmin._subscriptions', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
      <?php elseif($section === 'mix-request-format'): ?>
        <?php echo $__env->make('superadmin._mix_request_format', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
      <?php elseif($section === 'advertising'): ?>
        <?php
          $adModule = $advertisingSettings['module'] ?? 'doctor';
          $primaryTitle = $advertisingSettings['primary_title'] ?? 'Consulta Privada';
          $primaryCopy = $advertisingSettings['primary_copy'] ?? 'Espacio publicitario para medicos usuarios de la plataforma.';
          $primaryCta = $advertisingSettings['primary_cta'] ?? 'Ver servicio';
          $secondaryTitle = $advertisingSettings['secondary_title'] ?? 'Receta digital';
          $secondaryCta = $advertisingSettings['secondary_cta'] ?? 'Abrir receta';
        ?>

        <?php echo $__env->make('superadmin._catalog-heading', [
          'headingTitle' => 'Gestion de banners publicitarios',
          'headingDescription' => '2 banners en Medico - sin cambios pendientes',
          'headingActions' => [['label' => 'Actualizar', 'href' => request()->fullUrl()]],
        ], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
        <form class="superadmin-native-advertising-controls" method="post" action="<?php echo e(route('superadmin.settings.update', 'advertising')); ?>">
          <?php echo csrf_field(); ?>
          <label>Modulo con espacios publicitarios
            <select name="module">
              <?php $__currentLoopData = \App\Models\PlatformModule::query()->orderBy('label')->get(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $module): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <option value="<?php echo e($module->key); ?>" <?php if($adModule === $module->key): echo 'selected'; endif; ?>><?php echo e($module->label); ?></option>
              <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </select>
          </label>
          <input type="hidden" name="primary_title" value="<?php echo e($primaryTitle); ?>">
          <input type="hidden" name="primary_copy" value="<?php echo e($primaryCopy); ?>">
          <input type="hidden" name="primary_cta" value="<?php echo e($primaryCta); ?>">
          <input type="hidden" name="secondary_title" value="<?php echo e($secondaryTitle); ?>">
          <input type="hidden" name="secondary_cta" value="<?php echo e($secondaryCta); ?>">
          <a href="<?php echo e(route('superadmin.catalog', 'advertising')); ?>">Descartar cambios</a>
          <button type="submit">Guardar cambios</button>
        </form>

        <section class="superadmin-native-advertising-card">
          <div class="superadmin-native-advertising-preview">
            <header>
              <div>
                <p>Vista previa clon</p>
                <h3>Modulo Medico</h3>
                <span>Banners para consulta Privada, receta digital y servicios del medico.</span>
              </div>
              <strong>Los cambios se aplican al guardar</strong>
            </header>

            <div class="superadmin-native-advertising-layout">
              <div class="superadmin-native-advertising-main" data-admin-filter-panel="primary">
                <div class="superadmin-native-advertising-banner">
                  <div>Banner</div>
                  <article>
                    <span>Banner de consulta privada</span>
                    <h3><?php echo e($primaryTitle); ?></h3>
                    <p><?php echo e($primaryCopy); ?></p>
                    <button type="button"><?php echo e($primaryCta); ?></button>
                  </article>
                  <button type="button" class="superadmin-native-advertising-edit">Editar banner</button>
                </div>

                <div class="superadmin-native-advertising-mini-grid">
                  <article>
                    <h4><?php echo e($primaryTitle); ?></h4>
                    <p>Agenda, paciente y resumen clinico.</p>
                  </article>
                  <article>
                    <h4><?php echo e($secondaryTitle); ?></h4>
                    <p>Medicamentos indicados y enlace a compra.</p>
                  </article>
                </div>
              </div>

              <aside class="superadmin-native-advertising-side" data-admin-filter-panel="secondary">
                <button type="button" class="superadmin-native-advertising-edit">Editar banner</button>
                <div>Banner</div>
                <article>
                  <span>Banner de receta digital</span>
                  <h3><?php echo e($secondaryTitle); ?></h3>
                  <p>Promocion asociada al flujo de receta medica de plataforma.</p>
                  <button type="button"><?php echo e($secondaryCta); ?></button>
                </article>
              </aside>
            </div>
          </div>
        </section>
      <?php elseif($section === 'prescription-format'): ?>
        <?php
          $folioPrefix = $prescriptionSettings['folio_prefix'] ?? 'RX-SA';
          $footerNote = $prescriptionSettings['footer_note'] ?? 'Formato base copiado del modulo Area Operativa de Farmacia Externa.';
        ?>

        <?php echo $__env->make('superadmin._catalog-heading', [
          'headingTitle' => $serviceFormat->name ?? 'Formato de Receta Medica',
          'headingDescription' => isset($formatService) ? 'Servicios integrales · '.$formatService->name : 'Datos del paciente, indicaciones y médico tratante.',
          'headingActions' => [
            ['label' => 'Volver a servicios integrales', 'href' => route('superadmin.catalog', 'services')],
            ['label' => 'Actualizar', 'href' => request()->fullUrl()],
          ],
        ], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
        <section class="superadmin-native-prescription-paper">
          <header class="superadmin-native-prescription-head">
            <div>
              <p>Formato de receta medica de plataforma</p>
              <h2>Formato de Receta Medica</h2>
            </div>
            <div>
              <span>Folio</span>
              <strong><?php echo e($folioPrefix); ?>-20260714</strong>
              <span>Fecha 14/07/2026</span>
            </div>
          </header>

          <div class="superadmin-native-prescription-intake">
            <label>Paciente agendado en Consulta Externa
              <select>
                <option>Andrea Montserrat Pineda Lopez - 14/07/2026 - Dr. Carter Jimmy</option>
              </select>
            </label>
            <strong><?php echo e($footerNote); ?></strong>
          </div>

          <section class="superadmin-native-prescription-section" data-admin-filter-panel="patient">
            <h3>Datos del paciente</h3>
            <div class="superadmin-native-prescription-grid">
              <label>Nombre(s)<input value="Andrea Montserrat" readonly></label>
              <label>Apellidos<input value="Pineda Lopez" readonly></label>
              <label>CURP<input value="Sin CURP" readonly></label>
              <label>NSS / registro<input value="EXP-44007" readonly></label>
              <label>Edad<input value="36" readonly></label>
              <label>Sexo<input value="Femenino" readonly></label>
              <label>Servicio<input value="Hemodialisis" readonly></label>
              <label>Consultorio<input value="Consultorio asignado" readonly></label>
              <label>Fecha de atencion<input value="14/07/2026" readonly></label>
            </div>
          </section>

          <section class="superadmin-native-prescription-section" data-admin-filter-panel="clinical">
            <h3>Diagnostico y resumen clinico</h3>
            <div class="superadmin-native-prescription-clinical">
              <label>Diagnostico presuntivo o definitivo
                <input placeholder="Escribir diagnostico">
              </label>
              <label>Resumen clinico, exploracion, evolucion e indicaciones generales
                <textarea placeholder="Escribir resumen clinico" rows="7"></textarea>
              </label>
            </div>
          </section>

          <section class="superadmin-native-prescription-section" data-admin-filter-panel="medications">
            <h3>Medicamentos indicados</h3>
            <div class="superadmin-native-prescription-meds">
              <table>
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Clave CNIS</th>
                    <th>Medicamento</th>
                    <th>Dosis</th>
                    <th>Presentacion</th>
                    <th>Via</th>
                    <th>Frecuencia<br>(x veces por dia)</th>
                    <th>Duracion</th>
                    <th>Cantidad</th>
                    <th>Indicaciones</th>
                  </tr>
                </thead>
                <tbody data-prescription-medications>
                  <tr data-prescription-medication>
                    <td class="superadmin-prescription-row-control">
                      <span data-medication-number>1</span>
                      <button type="button" class="superadmin-native-prescription-remove" data-remove-medication aria-label="Quitar medicamento">-</button>
                    </td>
                    <td><input name="medications[0][cnis]" data-medication-field="cnis" placeholder="CNIS"></td>
                    <td><input name="medications[0][medication]" data-medication-field="medication" placeholder="Escribir medicamento libre"></td>
                    <td><input name="medications[0][dose]" data-medication-field="dose" placeholder="Dosis"></td>
                    <td><input name="medications[0][presentation]" data-medication-field="presentation" placeholder="Presentacion"></td>
                    <td><input name="medications[0][route]" data-medication-field="route" placeholder="Via"></td>
                    <td><input name="medications[0][frequency]" data-medication-field="frequency" placeholder="Frecuencia (x veces)"></td>
                    <td><input name="medications[0][duration]" data-medication-field="duration" placeholder="Duracion"></td>
                    <td><input name="medications[0][quantity]" data-medication-field="quantity" placeholder="Piezas"></td>
                    <td><textarea name="medications[0][instructions]" data-medication-field="instructions" placeholder="Indicaciones" rows="2"></textarea></td>
                  </tr>
                </tbody>
              </table>
              <button type="button" class="superadmin-native-prescription-add" data-add-medication aria-label="Agregar medicamento">+</button>
            </div>
          </section>

          <script>
            (() => {
              const medications = document.querySelector('[data-prescription-medications]');
              const addButton = document.querySelector('[data-add-medication]');

              if (!medications || !addButton) return;
              const medicationTemplate = medications.querySelector('[data-prescription-medication]')?.cloneNode(true);

              const renumberRows = () => {
                medications.querySelectorAll('[data-prescription-medication]').forEach((row, index) => {
                  row.querySelector('[data-medication-number]').textContent = index + 1;
                  row.querySelectorAll('[data-medication-field]').forEach((field) => {
                    field.name = `medications[${index}][${field.dataset.medicationField}]`;
                  });
                });
              };

              const bindRemoveButton = (button) => {
                button.addEventListener('click', () => {
                  button.closest('[data-prescription-medication]').remove();
                  renumberRows();
                });
              };

              medications.querySelectorAll('[data-remove-medication]').forEach(bindRemoveButton);

              addButton.addEventListener('click', () => {
                if (!medicationTemplate) return;

                const newRow = medicationTemplate.cloneNode(true);
                newRow.querySelectorAll('input, textarea').forEach((field) => field.value = '');
                bindRemoveButton(newRow.querySelector('[data-remove-medication]'));
                medications.appendChild(newRow);
                renumberRows();
                newRow.querySelector('input, textarea')?.focus();
              });
            })();
          </script>

          <section class="superadmin-native-prescription-section" data-admin-filter-panel="doctor">
            <h3>Medico tratante</h3>
            <div class="superadmin-native-prescription-grid is-doctor">
              <label>Nombre del medico<input value="Dr. Carter Jimmy" readonly></label>
                    <label>Cedula profesional<input value="CED-2026" readonly></label>
              <label>Especialidad<input value="Medicina interna" readonly></label>
              <label>Firma y sello<input value="Dr. Carter Jimmy - Ced. 1234567890" readonly></label>
            </div>
          </section>
        </section>
      <?php elseif(isset($insuranceCategory)): ?>
        <?php echo $__env->make('superadmin._insurance-plans', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
      <?php elseif($section === 'insurance-carriers'): ?>
        <?php echo $__env->make('superadmin._insurance-carriers', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
      <?php elseif($section === 'medications'): ?>
        <?php echo $__env->make('superadmin.medications.table', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
      <?php else: ?>
      <section class="superadmin-native-catalog-card">
        <?php if($section === 'institutions'): ?><div class="superadmin-institution-catalog"><?php endif; ?>
        <?php if($section === 'doctors'): ?><div data-admin-filter-panel="catalog"<?php if($doctorView === 'commissions'): ?> hidden<?php endif; ?>><?php endif; ?>
        <div class="superadmin-native-section-heading">
          <div>
            <h2><?php echo e($catalog['title']); ?></h2>
            <p><?php echo e($records->total()); ?> <?php echo $section === 'medications' && $records->total() === 1 ? 'registro visible' : 'registros visibles'; ?></p>
          </div>

          <div class="superadmin-native-heading-actions">
          <a class="superadmin-native-csv" href="<?php echo e($csvUrl); ?>" aria-label="Exportar CSV" title="Exportar CSV">CSV</a>
          <?php if(! empty($catalog['primary_action'])): ?>
            <?php
              $primaryRoute = $catalog['primary_action']['route'];
              $primaryHref = $primaryRoute === 'superadmin.catalog'
                ? route('superadmin.catalog', $section)
                : (\Illuminate\Support\Facades\Route::has($primaryRoute) ? route($primaryRoute) : route('superadmin.catalog', $section));
            ?>
            <a href="<?php echo e($section === 'institutions' ? '#create-institution' : ($section === 'providers' ? '#create-vendor' : ($section === 'insurance-carriers' ? '#create-insurance-carrier' : ($section === 'insurance-advisors' ? '#create-insurance-advisor' : ($section === 'hospitals' ? '#create-hospital' : $primaryHref))))); ?>">+ <?php echo e($catalog['primary_action']['label']); ?></a>
          <?php else: ?>
            <a href="<?php echo e(request()->fullUrl()); ?>">Actualizar</a>
          <?php endif; ?>
          </div>
        </div>

        <div class="superadmin-native-catalog-scroll">
          <table class="superadmin-native-catalog-table">
            <thead>
              <tr>
                <?php $__currentLoopData = $catalog['columns']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $column): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                  <th<?php if($section === 'services' && $column === 'Formatos'): ?> data-drsam-table-filter-skip-column<?php endif; ?>><?php echo e($column); ?></th>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
              </tr>
            </thead>
            <tbody>
              <?php $__empty_1 = true; $__currentLoopData = $records; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $record): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                <?php
                  $values = $catalog['map']($record);
                  $isModule = $record instanceof \App\Models\PlatformModule;
                  $isUser = $record instanceof \App\Models\User;
                  $isSelectedInstitution = $section === 'institutions' && $selectedInstitution?->id === $record->id;
                ?>
                <tr<?php if($isSelectedInstitution): ?> class="is-selected-institution"<?php endif; ?><?php if($section === 'institutions'): ?> data-institution-row data-institution-href="<?php echo e(request()->fullUrlWithQuery(['selected_institution' => $record->id])); ?>#institution-detail"<?php endif; ?>>
                  <?php $__currentLoopData = $values; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $index => $value): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <?php
                      $column = strtolower($catalog['columns'][$index] ?? '');
                      $isActionColumn = str_contains($column, 'accion') || str_contains($column, 'destino');
                      $isStatusColumn = str_contains($column, 'estatus') || str_contains($column, 'validacion');
                    ?>

                    <td<?php if($column === 'fuente / perfil'): ?> class="superadmin-native-profile-cell"<?php endif; ?>>
                      <?php if($section === 'services' && $column === 'formatos'): ?>
                        <button type="button" data-service-formats="<?php echo e($record->id); ?>" data-service-name="<?php echo e($record->name); ?>" aria-haspopup="dialog" aria-controls="service-formats-dialog" aria-label="Ver formatos de <?php echo e($record->name); ?>">Ver</button>
                      <?php elseif($section === 'institutions' && $index === 0): ?>
                        <button type="button" class="superadmin-institution-select" data-institution-select aria-controls="institution-detail" aria-pressed="<?php echo $isSelectedInstitution ? 'true' : 'false'; ?>" aria-label="Ver información de <?php echo e($record->name); ?>"><?php echo e($value); ?></button>
                      <?php elseif($section === 'institutions' && $index >= 7): ?>
                        <?php echo $__env->make('superadmin._institution-action', ['record' => $record, 'index' => $index, 'value' => $value])->render(); ?>
                      <?php elseif($section === 'medications' && $index === 2): ?>
                        <strong class="superadmin-medication-name"><?php echo e($record->name); ?></strong>
                        <?php if(filled($record->external_id)): ?><small class="superadmin-medication-code"><?php echo e($record->external_id); ?></small><?php endif; ?>
                      <?php elseif($section === 'medications' && $index === 4 && $value === 'Por registrar'): ?>
                        <span class="superadmin-medication-missing"><?php echo e($value); ?></span>
                      <?php elseif($isActionColumn): ?>
                        <div class="superadmin-native-row-actions">
                          <?php if($isModule): ?>
                            <?php
                              $configuredTarget = data_get(config('drsam.modules'), $record->key.'.route');
                              $moduleTarget = is_string($record->target) && \Illuminate\Support\Facades\Route::has($record->target)
                                  ? $record->target
                                  : (is_string($configuredTarget) && \Illuminate\Support\Facades\Route::has($configuredTarget) ? $configuredTarget : null);
                              $targetRoute = $moduleTarget
                                  ? \Illuminate\Support\Facades\Route::getRoutes()->getByName($moduleTarget)
                                  : null;
                              $moduleOpenHref = $moduleTarget && empty($targetRoute?->parameterNames())
                                  ? route($moduleTarget)
                                  : route('superadmin.dashboard');

                              if (in_array($record->key, ['advertising', 'publicidad'], true)) {
                                  $moduleOpenHref = route('superadmin.catalog', 'advertising');
                              } elseif (in_array($record->key, ['access', 'acceso'], true)) {
                                  $moduleOpenHref = route('superadmin.catalog', 'access');
                              }
                            ?>
                            <a
                              href="<?php echo e(route('superadmin.catalog', ['section' => 'modules', 'selected_module' => $record->key])); ?>#module-config"
                              class="<?php echo \Illuminate\Support\Arr::toCssClasses(['is-active' => $selectedModule?->is($record)]); ?>"
                            >Editar</a>
                            <a href="<?php echo e($moduleOpenHref); ?>">Abrir</a>
                          <?php elseif($section === 'access' && $record instanceof \App\Models\User): ?>
                            <?php
                              $accessRoute = data_get(config('drsam.modules'), $record->module.'.route', 'dashboard');
                            ?>
                            <?php if($record->status !== 'active'): ?>
                              <span class="superadmin-native-status-pill is-danger">Inactivo</span>
                            <?php elseif(\Illuminate\Support\Facades\Route::has($accessRoute)): ?>
                              <a href="<?php echo e(route($accessRoute)); ?>">Abrir</a>
                            <?php else: ?>
                              <a href="<?php echo e(route('dashboard')); ?>">Abrir</a>
                            <?php endif; ?>
                          <?php elseif($section === 'insurance-advisors' && $record instanceof \App\Models\User): ?>
                            <a href="#edit-insurance-advisor-<?php echo e($record->id); ?>">Editar</a>
                            <form method="post" action="<?php echo e(route('superadmin.insurance-advisors.update', $record)); ?>">
                              <?php echo csrf_field(); ?>
                              <?php echo method_field('patch'); ?>
                              <input type="hidden" name="name" value="<?php echo e($record->name); ?>">
                              <input type="hidden" name="username" value="<?php echo e($record->username); ?>">
                              <input type="hidden" name="email" value="<?php echo e($record->email); ?>">
                              <input type="hidden" name="insurance_carrier" value="<?php echo e(data_get($record->metadata, 'insurance_carrier')); ?>">
                              <input type="hidden" name="agent_number" value="<?php echo e(data_get($record->metadata, 'agent_number')); ?>">
                              <input type="hidden" name="phone" value="<?php echo e(data_get($record->metadata, 'phone')); ?>">
                              <input type="hidden" name="scope" value="<?php echo e(data_get($record->metadata, 'scope')); ?>">
                              <input type="hidden" name="status" value="<?php echo e($record->status === 'active' ? 'inactive' : 'active'); ?>">
                              <button type="submit"><?php echo e($record->status === 'active' ? 'Inactivar' : 'Activar'); ?></button>
                            </form>
                            <a href="<?php echo e(route('insurance-advisor.dashboard')); ?>">Abrir</a>
                          <?php elseif($isUser): ?>
                            <a href="#edit-platform-user-<?php echo e($record->id); ?>">Editar</a>
                            <form method="post" action="<?php echo e(route('superadmin.users.update', $record)); ?>">
                              <?php echo csrf_field(); ?>
                              <?php echo method_field('patch'); ?>
                              <input type="hidden" name="status" value="<?php echo e($record->status === 'active' ? 'inactive' : 'active'); ?>">
                              <button type="submit"><?php echo e($record->status === 'active' ? 'Inactivar' : 'Activar'); ?></button>
                            </form>
                          <?php elseif($record instanceof \App\Models\Hospital): ?>
                            <a href="#edit-hospital-<?php echo e($record->id); ?>">Editar</a>
                            <form method="post" action="<?php echo e(route('superadmin.hospitals.update', $record)); ?>">
                              <?php echo csrf_field(); ?>
                              <?php echo method_field('patch'); ?>
                              <input type="hidden" name="name" value="<?php echo e($record->name); ?>">
                              <input type="hidden" name="network_type" value="<?php echo e($record->network_type); ?>">
                              <input type="hidden" name="address" value="<?php echo e($record->address); ?>">
                              <input type="hidden" name="contact_phone" value="<?php echo e($record->contact_phone); ?>">
                              <input type="hidden" name="rfc" value="<?php echo e($record->rfc); ?>">
                              <input type="hidden" name="state" value="<?php echo e(data_get($record->metadata, 'state')); ?>">
                              <input type="hidden" name="unit_type" value="<?php echo e(data_get($record->metadata, 'unit_type')); ?>">
                              <input type="hidden" name="scope" value="<?php echo e(data_get($record->metadata, 'scope')); ?>">
                              <input type="hidden" name="source" value="<?php echo e(data_get($record->metadata, 'source')); ?>">
                              <input type="hidden" name="status" value="<?php echo e($record->status === 'active' ? 'inactive' : 'active'); ?>">
                              <button type="submit"><?php echo e($record->status === 'active' ? 'Inactivar' : 'Activar'); ?></button>
                            </form>
                          <?php elseif($record instanceof \App\Models\Doctor): ?>
                            <a href="<?php echo e(route('doctor.dashboard')); ?>">Abrir</a>
                          <?php elseif($record instanceof \App\Models\Patient): ?>
                            <form method="post" action="<?php echo e(route('superadmin.patients.update', $record)); ?>">
                              <?php echo csrf_field(); ?>
                              <?php echo method_field('patch'); ?>
                              <input type="hidden" name="full_name" value="<?php echo e($record->full_name); ?>">
                              <input type="hidden" name="phone" value="<?php echo e($record->phone); ?>">
                              <input type="hidden" name="email" value="<?php echo e($record->email); ?>">
                              <input type="hidden" name="curp" value="<?php echo e($record->curp); ?>">
                              <input type="hidden" name="status" value="<?php echo e($record->status === 'active' ? 'inactive' : 'active'); ?>">
                              <button type="submit"><?php echo e($record->status === 'active' ? 'Inactivar' : 'Activar'); ?></button>
                            </form>
                            <a href="<?php echo e(route('patient.dashboard')); ?>">Abrir</a>
                          <?php elseif($record instanceof \App\Models\Provider): ?>
                            <a href="#edit-vendor-<?php echo e($record->id); ?>">Editar</a>
                            <form method="post" action="<?php echo e(route('superadmin.providers.update', $record)); ?>">
                              <?php echo csrf_field(); ?>
                              <?php echo method_field('patch'); ?>
                              <input type="hidden" name="name" value="<?php echo e(data_get($record->metadata, 'first_name', $record->name)); ?>">
                              <input type="hidden" name="last_name" value="<?php echo e(data_get($record->metadata, 'last_name')); ?>">
                              <input type="hidden" name="phone" value="<?php echo e(data_get($record->metadata, 'phone')); ?>">
                              <input type="hidden" name="email" value="<?php echo e($record->user?->email); ?>">
                              <input type="hidden" name="provider_type" value="<?php echo e($record->provider_type); ?>">
                              <input type="hidden" name="status" value="<?php echo e($record->status === 'active' ? 'inactive' : 'active'); ?>">
                              <?php $__currentLoopData = data_get($record->metadata, 'doctor_ids', []); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $selectedDoctorId): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                <input type="hidden" name="doctor_ids[]" value="<?php echo e($selectedDoctorId); ?>">
                              <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                              <button type="submit"><?php echo e($record->status === 'active' ? 'Inactivar' : 'Activar'); ?></button>
                            </form>
                            <a href="<?php echo e(route(match ($record->provider_type) { 'chemotherapy' => 'provider.chemo.dashboard', 'import' => 'provider.import.dashboard', default => 'provider.npt.dashboard' })); ?>">Abrir</a>
                          <?php elseif($record instanceof \App\Models\InsuranceCarrier): ?>
                            <a href="#edit-insurance-carrier-<?php echo e($record->id); ?>">Editar</a>
                            <form method="post" action="<?php echo e(route('superadmin.insurance-carriers.update', $record)); ?>">
                              <?php echo csrf_field(); ?>
                              <?php echo method_field('patch'); ?>
                              <input type="hidden" name="name" value="<?php echo e($record->name); ?>">
                              <input type="hidden" name="slug" value="<?php echo e($record->slug); ?>">
                              <input type="hidden" name="type" value="<?php echo e($record->type); ?>">
                              <input type="hidden" name="contact" value="<?php echo e($record->contact); ?>">
                              <input type="hidden" name="phone" value="<?php echo e($record->phone); ?>">
                              <input type="hidden" name="email" value="<?php echo e($record->email); ?>">
                              <input type="hidden" name="scope" value="<?php echo e($record->scope); ?>">
                              <input type="hidden" name="status" value="<?php echo e($record->status === 'active' ? 'inactive' : 'active'); ?>">
                              <button type="submit"><?php echo e($record->status === 'active' ? 'Inactivar' : 'Activar'); ?></button>
                            </form>
                          <?php elseif(! empty($catalog['open_route']) && \Illuminate\Support\Facades\Route::has($catalog['open_route'])): ?>
                            <a href="<?php echo e(route($catalog['open_route'])); ?>">Abrir</a>
                          <?php else: ?>
                            <button type="button"><?php echo e($value); ?></button>
                          <?php endif; ?>
                        </div>
                      <?php elseif($section === 'users' && $catalog['columns'][$index] === 'Contraseña'): ?>
                        <span title="Las contraseñas se almacenan como hashes y no se pueden recuperar."><?php echo e($value); ?></span>
                      <?php elseif($isStatusColumn): ?>
                        <span class="<?php echo \Illuminate\Support\Arr::toCssClasses(['superadmin-native-status-pill', 'is-danger' => in_array(strtolower((string) $value), ['inactive', 'inactivo', 'suspended', 'suspendido', 'deshabilitado'], true)]); ?>">
                          <?php echo e($badgeText($value)); ?>

                        </span>
                      <?php elseif($section === 'insurance-carriers' && $index === 0 && $record instanceof \App\Models\InsuranceCarrier): ?>
                        <strong><?php echo e($record->name); ?></strong>
                        <small><?php echo e($record->slug); ?></small>
                      <?php elseif($section === 'insurance-advisors' && $index === 0 && $record instanceof \App\Models\User): ?>
                        <strong><?php echo e($record->name); ?></strong>
                        <small><?php echo e($record->username); ?></small>
                      <?php elseif($section === 'medical-devices' && $index === 0 && $record instanceof \App\Models\MedicalDevice): ?>
                        <strong><?php echo e($record->name); ?></strong>
                        <small><?php echo e($record->code); ?></small>
                      <?php else: ?>
                        <?php echo e($value); ?>

                      <?php endif; ?>
                    </td>
                  <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                </tr>
              <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                <tr>
                  <td colspan="<?php echo e(count($catalog['columns'])); ?>">Sin registros disponibles.</td>
                </tr>
              <?php endif; ?>
            </tbody>
          </table>
        </div>

        <?php if($section === 'institutions'): ?></div><?php endif; ?>
        <?php if($section === 'doctors'): ?></div><?php endif; ?>

        <?php if($section === 'users'): ?>
          <?php $__currentLoopData = $records; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $platformUser): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <section id="edit-platform-user-<?php echo e($platformUser->id); ?>" class="superadmin-user-modal" role="dialog" aria-modal="true" aria-labelledby="edit-platform-user-title-<?php echo e($platformUser->id); ?>">
              <a class="superadmin-user-modal-backdrop" href="#" aria-label="Cerrar formulario"></a>
              <div class="superadmin-user-modal-card">
                <header>
                  <div>
                    <h2 id="edit-platform-user-title-<?php echo e($platformUser->id); ?>">Editar usuario de plataforma</h2>
                    <p>Usuario numero <?php echo e($platformUser->patient?->platform_number ?? $platformUser->doctor?->external_id ?? (100000000 + $platformUser->id)); ?></p>
                  </div>
                  <a href="#" aria-label="Cerrar">x</a>
                </header>

                <form method="post" action="<?php echo e(route('superadmin.users.update', $platformUser)); ?>">
                  <?php echo csrf_field(); ?>
                  <?php echo method_field('patch'); ?>
                  <div class="superadmin-user-modal-grid">
                    <label>No. usuario de la plataforma<input value="<?php echo e($platformUser->patient?->platform_number ?? $platformUser->doctor?->external_id ?? (100000000 + $platformUser->id)); ?>" readonly></label>
                    <label>Tipo de usuario<input value="<?php echo e(\App\Enums\UserRole::tryFrom($platformUser->role)?->label() ?? $platformUser->role); ?>" readonly></label>
                    <label class="span-2">Nombre<input name="name" value="<?php echo e($platformUser->name); ?>" required></label>
                    <label>Correo electronico<input name="email" type="email" value="<?php echo e($platformUser->email); ?>"></label>
                    <label>Usuario<input name="username" value="<?php echo e($platformUser->username); ?>" required></label>
                    <label>Validacion correo
                      <select name="email_validation">
                        <option value="validated" <?php if($platformUser->email_verified_at): echo 'selected'; endif; ?>>Validado</option>
                        <option value="pending" <?php if(! $platformUser->email_verified_at): echo 'selected'; endif; ?>>Pendiente</option>
                      </select>
                    </label>
                    <label>Fecha validacion<input value="<?php echo e($platformUser->email_verified_at?->format('d/m/Y') ?? 'Sin validar'); ?>" readonly></label>
                    <label>Telefono<input name="phone" placeholder="Ej. 5551234567"></label>
                    <label>CURP<input name="curp" maxlength="18" value="<?php echo e($platformUser->patient?->curp); ?>"></label>
                    <label>Cedula profesional<input value="CED-2026" readonly></label>
                    <label>Especialidad<input name="specialty" value="<?php echo e($platformUser->doctor?->specialty); ?>" <?php if(! $platformUser->doctor): echo 'disabled'; endif; ?>></label>
                    <label>Estatus
                      <select name="status" required>
                        <?php $__currentLoopData = ['active' => 'Activo', 'inactive' => 'Inactivo', 'suspended' => 'Suspendido']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $status => $label): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                          <option value="<?php echo e($status); ?>" <?php if($platformUser->status === $status): echo 'selected'; endif; ?>><?php echo e($label); ?></option>
                        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                      </select>
                    </label>
                    <label class="span-2">Fuente / perfil<input value="<?php echo e($platformUser->doctor ? 'Catalogo medico, Acceso medico' : ($platformUser->patient ? 'Catalogo paciente, Acceso paciente' : 'Registro plataforma')); ?>" readonly></label>
                  </div>
                  <footer>
                    <a href="#">Cancelar</a>
                    <button type="submit">Guardar cambios</button>
                  </footer>
                </form>
              </div>
            </section>
          <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        <?php endif; ?>

        <?php if($section === 'institutions'): ?>
          <?php if($selectedInstitution): ?>
            <?php echo $__env->make('superadmin._institution-detail', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
          <?php endif; ?>

          <?php $__currentLoopData = $records; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $institutionRecord): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <section id="edit-institution-<?php echo e($institutionRecord->id); ?>" class="superadmin-user-modal" role="dialog" aria-modal="true">
              <a class="superadmin-user-modal-backdrop" href="#"></a>
              <div class="superadmin-user-modal-card">
                <header><div><h2>Editar institucion</h2><p>Actualiza la informacion y credenciales de acceso.</p></div><a href="#">x</a></header>
                <form method="post" action="<?php echo e(route('superadmin.institutions.update', $institutionRecord)); ?>">
                  <?php echo csrf_field(); ?> <?php echo method_field('patch'); ?>
                  <div class="superadmin-user-modal-grid">
                    <label>Nombre de la institucion<input name="name" value="<?php echo e($institutionRecord->name); ?>" required></label>
                    <label>Usuario<input name="username" value="<?php echo e($institutionRecord->owner?->username); ?>"></label>
                    <label>Contrasena<input name="password" type="password" placeholder="Dejar vacio para conservar"></label>
                    <label>Tipo de institucion<select name="type"><option value="publica" <?php if($institutionRecord->type === 'publica'): echo 'selected'; endif; ?>>Publica</option><option value="privada" <?php if($institutionRecord->type === 'privada'): echo 'selected'; endif; ?>>Privada</option></select></label>
                    <label>Estatus<select name="status"><option value="active" <?php if($institutionRecord->status === 'active'): echo 'selected'; endif; ?>>Activo</option><option value="inactive" <?php if($institutionRecord->status !== 'active'): echo 'selected'; endif; ?>>Inactivo</option></select></label>
                    <input type="hidden" name="legal_name" value="<?php echo e($institutionRecord->legal_name); ?>">
                  </div>
                  <footer><a href="#">Cancelar</a><button type="submit">Guardar cambios</button></footer>
                </form>
              </div>
            </section>
          <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

          <section id="create-institution" class="superadmin-user-modal" role="dialog" aria-modal="true">
            <a class="superadmin-user-modal-backdrop" href="#"></a>
            <div class="superadmin-user-modal-card">
              <header><div><h2>Alta de institucion</h2><p>Crea la institucion y asigna sus credenciales de acceso.</p></div><a href="#">x</a></header>
              <form method="post" action="<?php echo e(route('superadmin.institutions.store')); ?>">
                <?php echo csrf_field(); ?>
                <div class="superadmin-user-modal-grid">
                  <label>Nombre de la institucion<input name="name" placeholder="Ej. Secretaria de Salud Estatal" required></label>
                  <label>Usuario<input name="username" placeholder="Ej. salud.estatal" required></label>
                  <label>Contrasena<input name="password" type="password" placeholder="Captura la contrasena" required></label>
                  <label>Tipo de institucion<select name="type"><option value="publica">Publica</option><option value="privada">Privada</option></select></label>
                  <label>Estatus<select name="status"><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label>
                </div>
                <footer><a href="#">Cancelar</a><button type="submit">Guardar institucion</button></footer>
              </form>
            </div>
          </section>
        <?php endif; ?>

        <?php if($section === 'doctors'): ?>
          <section id="doctor-commissions" class="superadmin-doctor-commissions" data-admin-filter-panel="commissions"<?php if($doctorView === 'catalog'): ?> hidden<?php endif; ?>>
            <header>
              <div><h3>Tabla de comisiones por médico</h3><p>Vista tipo Excel con un médico por renglón.</p></div>
              <span><?php echo e($records->count()); ?> medicos - <?php echo e($records->count() * 3); ?> operaciones - $<?php echo e(number_format($records->count() * 532.40, 2)); ?> comision estimada</span>
            </header>
            <div class="superadmin-doctor-commission-scroll">
              <table>
                <thead><tr><th>No.</th><th>Nombre</th><th>Apellidos</th><th>Telefono</th><th>Correo</th><th>Estatus</th><th>Medicos relacionados</th><th>Operaciones totales</th><th>Venta total</th><th>% promedio</th><th>Comision estimada</th><th>Reglas de comision</th><th>Medicamentos operaciones</th><th>Medicamentos venta</th><th>Medicamentos comision</th><th>Consultas privadas operaciones</th><th>Consultas privadas venta</th><th>Consultas privadas comision</th><th>Nutricion parenteral operaciones</th><th>Nutricion parenteral venta</th><th>Nutricion parenteral comision</th><th>Solicitudes oncologicas operaciones</th><th>Solicitudes oncologicas venta</th><th>Solicitudes oncologicas comision</th></tr></thead>
                <tbody>
                  <?php $__currentLoopData = $records; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $doctorRecord): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <?php $parts = preg_split('/\s+/', trim($doctorRecord->full_name), 2); ?>
                    <tr>
                      <td><?php echo e($loop->iteration); ?></td><td><?php echo e($parts[0] ?? $doctorRecord->full_name); ?></td><td><?php echo e($parts[1] ?? ''); ?></td><td><?php echo e(data_get($doctorRecord->metadata, 'phone', 'Sin telefono')); ?></td><td><?php echo e($doctorRecord->user?->email ?? 'Sin correo'); ?></td><td><span class="superadmin-native-status-pill">Autorizado</span></td><td>1</td><td>4</td><td>$11,240.00</td><td>4.74%</td><td><strong>$532.40</strong></td><td><a href="#commission-format-<?php echo e($doctorRecord->id); ?>">Editar reglas</a><small>Usa universales</small></td><td>2</td><td>$1,240.00</td><td><strong>$74.40</strong></td><td>0</td><td>$0.00</td><td><strong>$0.00</strong></td><td>1</td><td>$4,200.00</td><td><strong>$168.00</strong></td><td>1</td><td>$5,800.00</td><td><strong>$290.00</strong></td>
                    </tr>
                  <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                </tbody>
              </table>
            </div>
          </section>

          <?php
            $commissionProducts = \App\Models\MedicationCatalogItem::query()->orderBy('name')->limit(50)->get();
          ?>
          <?php $__currentLoopData = $records; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $doctorRecord): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <section id="commission-format-<?php echo e($doctorRecord->id); ?>" class="superadmin-commission-format">
              <header><div><h3>Formato de comisioncologiader>
              <div class="superadmin-commission-toolbar">
                <label>Catalogo de trabajo<select><option>Todos los catalogos</option><option>Farmacia Digital</option><option>NPT</option><option>Oncologia</option></select></label>
                <label class="search"><span>Buscar</span><input type="search" placeholder="Buscar producto, ID, catalogo..."></label>
                <strong><?php echo e($commissionProducts->count()); ?> productos visibles<small><?php echo e($commissionProducts->count()); ?> seleccionados - <?php echo e($commissionProducts->count()); ?> reglas activas</small></strong>
              </div>
              <p class="superadmin-commission-help">Cada renglon conserva el ID del catalogo original. Si la remision incluye este producto, se usa la regla de comision configurada.</p>
              <div class="superadmin-commission-products-scroll">
                <table><thead><tr><th>Seleccionar</th><th>Catalogo</th><th>ID producto</th><th>Denominacion generica</th><th>Concentracion</th><th>Unidad de medida</th><th>Presentacion</th><th>Denominacion comercial</th><th>Patente</th><th>% comision</th></tr></thead>
                  <tbody>
                    <?php $__empty_1 = true; $__currentLoopData = $commissionProducts; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $product): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                      <tr><td><input type="checkbox" checked></td><td>Farmacia Digital</td><td><strong><?php echo e($product->external_id ?? $product->cnis ?? 'med-'.$product->id); ?></strong></td><td><strong><?php echo e($product->generic_name ?? $product->name); ?></strong></td><td><?php echo e(data_get($product->metadata, 'concentration', 'No especificada')); ?></td><td><?php echo e(data_get($product->metadata, 'unit', 'No especificada')); ?></td><td><?php echo e($product->presentation ?? $product->description ?? 'Sin presentacion'); ?></td><td><?php echo e($product->name); ?></td><td><select><option>Generico/Biosimilar</option><option>Patente</option></select></td><td><input type="number" value="6" min="0" max="100" step="0.1"></td></tr>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                      <tr><td colspan="10">No hay productos disponibles en el catalogo.</td></tr>
                    <?php endif; ?>
                  </tbody>
                </table>
              </div>
            </section>
          <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        <?php endif; ?>

        <?php if($section === 'providers'): ?>
          <div class="superadmin-vendor-filters">
            <label>Vendedor<select><option>Sin vendedores</option></select></label>
            <label>Medico<select><option>Todos</option></select></label>
            <label>Institucion<select><option>Todas</option><?php $__currentLoopData = \App\Models\Institution::query()->orderBy('name')->get(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $institution): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><option><?php echo e($institution->name); ?></option><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></select></label>
            <label>Categoria<select><option>Todas</option><option>Medicamentos</option><option>Consulta privada</option><option>Nutricion parenteral</option><option>Oncologia</option></select></label>
            <label>Concepto, producto o servicio<select><option>Todos</option></select></label>
          </div>

          <section class="superadmin-doctor-commissions superadmin-vendor-commissions">
            <header><div><h3>Tabla de comisiones por vendedor</h3><p>Vista tipo Excel con un vendedor por renglon.</p></div></header>
            <div class="superadmin-doctor-commission-scroll">
                <thead><tr><th>No.</th><th>Nombre</th><th>Apellidos</th><th>Telefono</th><th>Correo</th><th>Estatus</th><th>Medicos relacionados</th><th>Operaciones totales</th><th>Venta total</th><th>% promedio</th><th>Comision estimada</th><th>Reglas de comision</th><th>Medicamentos operaciones</th><th>Medicamentos venta</th><th>Medicamentos comision</th><th>Consultas privadas operaciones</th><th>Consultas privadas venta</th><th>Consultas privadas comision</th><th>Nutricion parenteral operaciones</th><th>Nutricion parenteral venta</th><th>Nutricion parenteral comision</th><th>Solicitudes oncologicas operaciones</th><th>Solicitudes oncologicas venta</th><th>Solicitudes oncologicas comision</th></tr></thead>
                <tbody><tr><td class="superadmin-vendor-empty" colspan="24">Sin vendedores registrados para calcular comisiones.</td></tr></tbody>
              </table>
            </div>
          </section>

          <section class="superadmin-universal-commissions">
            <header><h3>Reglas de comision universales</h3><p>En este cuadro se muestran las reglas de comision universales. Cada vez que se registre una remision se aplicara la regla configurada.</p></header>
            <div class="superadmin-commission-products-scroll"><table><thead><tr><th>Modulo conectado</th><th>Institucion</th><th>Categoria</th><th>Regla</th><th>Porcentaje</th><th>Notas</th></tr></thead><tbody>
              <?php $__currentLoopData = \App\Models\Institution::query()->orderBy('name')->get(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $institution): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <?php $__currentLoopData = [['Solicitudes de nutricion parenteral', 'Solicitud de nutricion parenteral', 'NPT institucional', 4], ['Solicitudes oncologicas', 'Solicitud oncologica', 'Oncologia institucional', 5]]; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $rule): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                  <tr><td>Farmacia Intrahospitalaria / Solicitudes</td><td><?php echo e($institution->name); ?></td><td><?php echo e($rule[0]); ?></td><td><?php echo e($rule[1]); ?></td><td><?php echo e($rule[2]); ?></td><td><input type="number" value="<?php echo e($rule[3]); ?>" min="0" max="100"></td><td><select><option>Activo</option><option>Inactivo</option></select></td></tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
              <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
              <tr><td>Modulo Medico / Consulta Privada</td><td>Privada</td><td>Consultas generadas desde plataforma</td><td>Consulta privada</td><td>5%</td><td>Comision base editable</td></tr>
              <tr><td>Farmacia Digital / Carrito / Compras</td><td>Privada</td><td>Medicamentos comprados desde receta</td><td>Medicamento comprado por paciente usuario</td><td>Medicamento de receta privada</td><td><input type="number" value="6"></td><td><select><option>Activo</option><option>Inactivo</option></select></td></tr>
            </tbody></table></div>
          </section>

          <?php $__currentLoopData = $records; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $vendorRecord): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <?php
              $selectedDoctorIds = collect(data_get($vendorRecord->metadata, 'doctor_ids', []))->map(fn ($id) => (int) $id)->all();
            ?>
            <section id="edit-vendor-<?php echo e($vendorRecord->id); ?>" class="superadmin-user-modal" role="dialog" aria-modal="true">
              <a class="superadmin-user-modal-backdrop" href="#"></a>
              <div class="superadmin-user-modal-card superadmin-vendor-modal-card">
                  <a href="#" aria-label="Cerrar">x</a>
                <form method="post" action="<?php echo e(route('superadmin.providers.update', $vendorRecord)); ?>">
                  <?php echo csrf_field(); ?>
                  <?php echo method_field('patch'); ?>
                  <input type="hidden" name="provider_type" value="vendor">
                  <div class="superadmin-user-modal-grid">
                    <label>Nombre<input name="name" value="<?php echo e(data_get($vendorRecord->metadata, 'first_name', $vendorRecord->name)); ?>" required></label>
                    <label>Apellidos<input name="last_name" value="<?php echo e(data_get($vendorRecord->metadata, 'last_name')); ?>"></label>
                    <label>Telefono<input name="phone" placeholder="Ej. 5551234567"></label>
                    <label>Correo<input name="email" type="email" value="<?php echo e($vendorRecord->user?->email); ?>"></label>
                    <label>Estatus<select name="status"><option value="active" <?php if($vendorRecord->status === 'active'): echo 'selected'; endif; ?>>Activo</option><option value="inactive" <?php if($vendorRecord->status !== 'active'): echo 'selected'; endif; ?>>Inactivo</option></select></label>
                  </div>
                  <fieldset class="superadmin-vendor-doctors">
                    <legend>Medicos relacionados</legend>
                    <label class="superadmin-vendor-doctor-search"><span>Buscar</span><input type="search" placeholder="Buscar por nombre o numero de usuario"></label>
                    <div class="superadmin-vendor-doctor-list">
                      <table><thead><tr><th></th><th>Medico</th><th>No. usuario plataforma</th><th>Vendedor asignado</th></tr></thead><tbody>
                        <?php $__empty_1 = true; $__currentLoopData = \App\Models\Doctor::query()->with('user')->orderBy('full_name')->get(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $doctorOption): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                          <tr><td><input type="checkbox" name="doctor_ids[]" value="<?php echo e($doctorOption->id); ?>" <?php if(in_array($doctorOption->id, $selectedDoctorIds, true)): echo 'checked'; endif; ?>></td><td><strong><?php echo e($doctorOption->full_name); ?></strong> <span><?php echo e($doctorOption->specialty); ?></span></td><td><?php echo e($doctorOption->external_id ?? 'MED-'.str_pad((string) $doctorOption->id, 6, '0', STR_PAD_LEFT)); ?></td><td><?php echo e(in_array($doctorOption->id, $selectedDoctorIds, true) ? $vendorRecord->name : 'Sin vendedor'); ?></td></tr>
                        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                          <tr><td colspan="4">No hay medicos disponibles.</td></tr>
                        <?php endif; ?>
                      </tbody></table>
                    </div>
                  </fieldset>
                  <footer><a href="#">Cancelar</a><button type="submit">Guardar vendedor</button></footer>
                </form>
              </div>
            </section>
          <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
          <section id="create-vendor" class="superadmin-user-modal" role="dialog" aria-modal="true">
            <a class="superadmin-user-modal-backdrop" href="#"></a>
            <div class="superadmin-user-modal-card superadmin-vendor-modal-card">
              <header><div><h2>Alta de vendedor</h2><p>Relaciona el vendedor con medicos usuarios de la plataforma.</p></div><a href="#">x</a></header>
              <form method="post" action="<?php echo e(route('superadmin.providers.store')); ?>">
                <?php echo csrf_field(); ?>
                <input type="hidden" name="provider_type" value="vendor">
                <input type="hidden" name="password" value="Temporal2026!">
                <div class="superadmin-user-modal-grid">
                  <label>Nombre<input name="name" placeholder="Ej. Mariana" required></label>
                  <label>Apellidos<input name="last_name" placeholder="Ej. Lopez Rivera"></label>
                  <label>Telefono<input name="phone" placeholder="Ej. 5551234567"></label>
                  <label>Correo<input name="email" type="email" placeholder="Ej. vendedor@plataforma.com"></label>
                  <label>Estatus<select name="status"><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label>
                </div>
                <fieldset class="superadmin-vendor-doctors">
                  <legend>Medicos relacionados</legend>
                  <label class="superadmin-vendor-doctor-search"><span>Buscar</span><input type="search" placeholder="Buscar por nombre o numero de usuario"></label>
                  <div class="superadmin-vendor-doctor-list">
                    <table><thead><tr><th></th><th>Medico</th><th>No. usuario plataforma</th><th>Vendedor asignado</th></tr></thead><tbody>
                      <?php $__empty_1 = true; $__currentLoopData = \App\Models\Doctor::query()->with('user')->orderBy('full_name')->get(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $doctorOption): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                        <tr><td><input type="checkbox" name="doctor_ids[]" value="<?php echo e($doctorOption->id); ?>"></td><td><strong><?php echo e($doctorOption->full_name); ?></strong> <span><?php echo e($doctorOption->specialty); ?></span></td><td><?php echo e($doctorOption->external_id ?? 'MED-'.str_pad((string) $doctorOption->id, 6, '0', STR_PAD_LEFT)); ?></td><td>Sin vendedor</td></tr>
                      <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                        <tr><td colspan="4">No hay medicos disponibles.</td></tr>
                      <?php endif; ?>
                    </tbody></table>
                  </div>
                </fieldset>
                <footer><a href="#">Cancelar</a><button type="submit">Guardar vendedor</button></footer>
              </form>
            </div>
          </section>
        <?php endif; ?>

        <?php if($section === 'insurance-advisors'): ?>
          <?php $__currentLoopData = $records; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $advisorRecord): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <section id="edit-insurance-advisor-<?php echo e($advisorRecord->id); ?>" class="superadmin-user-modal" role="dialog" aria-modal="true">
              <a class="superadmin-user-modal-backdrop" href="#"></a>
              <div class="superadmin-user-modal-card">
                  <a href="#" aria-label="Cerrar">x</a>
                <form method="post" action="<?php echo e(route('superadmin.insurance-advisors.update', $advisorRecord)); ?>">
                  <?php echo csrf_field(); ?>
                  <?php echo method_field('patch'); ?>
                  <div class="superadmin-user-modal-grid">
                    <label>Nombre<input name="name" value="<?php echo e($advisorRecord->name); ?>" required></label>
                    <label>Usuario<input name="username" value="<?php echo e($advisorRecord->username); ?>"></label>
                    <label>Correo<input name="email" type="email" value="<?php echo e($advisorRecord->email); ?>"></label>
                    <label>Contrasena nueva<input name="password" type="password" placeholder="Dejar vacia para conservar"></label>
                    <label>Aseguradora<input name="insurance_carrier" value="<?php echo e(data_get($advisorRecord->metadata, 'insurance_carrier')); ?>"></label>
                    <label>No. agente<input name="agent_number" value="<?php echo e(data_get($advisorRecord->metadata, 'agent_number')); ?>"></label>
                    <label>Telefono<input name="phone" placeholder="Ej. 5551234567"></label>
                    <label>Estatus<select name="status"><option value="active" <?php if($advisorRecord->status === 'active'): echo 'selected'; endif; ?>>Activo</option><option value="inactive" <?php if($advisorRecord->status === 'inactive'): echo 'selected'; endif; ?>>Inactivo</option><option value="suspended" <?php if($advisorRecord->status === 'suspended'): echo 'selected'; endif; ?>>Suspendido</option></select></label>
                    <label class="span-2">Alcance<textarea name="scope" rows="3"><?php echo e(data_get($advisorRecord->metadata, 'scope', 'Seguimiento de polizas y pacientes')); ?></textarea></label>
                  </div>
                  <footer><a href="#">Cancelar</a><button type="submit">Guardar asesor</button></footer>
                </form>
              </div>
            </section>
          <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
          <section id="create-insurance-advisor" class="superadmin-user-modal" role="dialog" aria-modal="true">
            <a class="superadmin-user-modal-backdrop" href="#"></a>
            <div class="superadmin-user-modal-card">
                  <a href="#" aria-label="Cerrar">x</a>
              <form method="post" action="<?php echo e(route('superadmin.insurance-advisors.store')); ?>">
                <?php echo csrf_field(); ?>
                <div class="superadmin-user-modal-grid">
                  <label>Nombre<input name="name" required></label>
                  <label>Usuario<input name="username" placeholder="Opcional"></label>
                  <label>Correo<input name="email" type="email"></label>
                  <label>Contrasena inicial<input name="password" type="password" required></label>
                  <label>Aseguradora<input name="insurance_carrier"></label>
                  <label>No. agente<input name="agent_number"></label>
                    <label>Telefono<input name="phone" placeholder="Ej. 5551234567"></label>
                  <label>Estatus<select name="status"><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label>
                  <label class="span-2">Alcance<textarea name="scope" rows="3" placeholder="Seguimiento de polizas y pacientes"></textarea></label>
                </div>
                <footer><a href="#">Cancelar</a><button type="submit">Crear asesor</button></footer>
              </form>
            </div>
          </section>
        <?php endif; ?>
        <?php if($section === 'hospitals'): ?>
          <?php $__currentLoopData = $records; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $hospitalRecord): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <section id="edit-hospital-<?php echo e($hospitalRecord->id); ?>" class="superadmin-user-modal" role="dialog" aria-modal="true">
              <a class="superadmin-user-modal-backdrop" href="#"></a>
              <div class="superadmin-user-modal-card superadmin-hospital-modal-card">
                <header><div><h2>Editar hospital privado</h2><p>Actualiza la informacion del hospital privado.</p></div><a href="#">x</a></header>
                <form method="post" action="<?php echo e(route('superadmin.hospitals.update', $hospitalRecord)); ?>">
                  <?php echo csrf_field(); ?> <?php echo method_field('patch'); ?>
                  <div class="superadmin-user-modal-grid">
                    <label>Nombre del hospital<input name="name" value="<?php echo e($hospitalRecord->name); ?>" required></label>
                    <label>Grupo o institucion<input name="network_type" value="<?php echo e($hospitalRecord->network_type); ?>"></label>
                    <label>Ciudad<input name="city" value="<?php echo e(data_get($hospitalRecord->metadata, 'city')); ?>" placeholder="Ej. Ciudad de Mexico"></label>
                    <label>Estado<input name="state" value="<?php echo e(data_get($hospitalRecord->metadata, 'state')); ?>"></label>
                    <label>Tipo de unidad<input name="unit_type" value="<?php echo e(data_get($hospitalRecord->metadata, 'unit_type')); ?>"></label>
                    <label>Alcance<input name="scope" value="<?php echo e(data_get($hospitalRecord->metadata, 'scope')); ?>"></label>
                    <label class="span-2">Fuente URL<input name="source" value="<?php echo e(data_get($hospitalRecord->metadata, 'source')); ?>"></label>
                    <label class="span-2">Direccion<input name="address" value="<?php echo e($hospitalRecord->address); ?>" placeholder="Calle, numero, colonia"></label>
                    <label>Contacto<input name="contact_name" value="<?php echo e(data_get($hospitalRecord->metadata, 'contact_name')); ?>" placeholder="Ej. Area de compras"></label>
                    <label>Telefono<input name="phone" placeholder="Ej. 5551234567"></label>
                    <label>Correo<input name="contact_email" type="email" value="<?php echo e(data_get($hospitalRecord->metadata, 'contact_email')); ?>" placeholder="Ej. contacto@hospital.com"></label>
                    <label>Estatus<select name="status"><option value="active" <?php if($hospitalRecord->status === 'active'): echo 'selected'; endif; ?>>Activo</option><option value="inactive" <?php if($hospitalRecord->status !== 'active'): echo 'selected'; endif; ?>>Inactivo</option></select></label>
                    <label class="span-2">Servicios relacionados<input name="related_services" value="<?php echo e(data_get($hospitalRecord->metadata, 'related_services')); ?>" placeholder="Ej. Nutricion parenteral, Oncologia"></label>
                    <label class="span-2">Notas<textarea name="notes" rows="4" placeholder="Observaciones internas del superadministrador"><?php echo e(data_get($hospitalRecord->metadata, 'notes')); ?></textarea></label>
                    <input type="hidden" name="rfc" value="<?php echo e($hospitalRecord->rfc); ?>">
                  </div>
                  <footer><a href="#">Cancelar</a><button type="submit">Guardar cambios</button></footer>
                </form>
              </div>
            </section>
          <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
          <section id="create-hospital" class="superadmin-user-modal" role="dialog" aria-modal="true">
            <a class="superadmin-user-modal-backdrop" href="#"></a>
            <div class="superadmin-user-modal-card superadmin-hospital-modal-card">
              <header><div><h2>Agregar hospital privado</h2><p>Captura la informacion del hospital privado.</p></div><a href="#">x</a></header>
              <form method="post" action="<?php echo e(route('superadmin.hospitals.store')); ?>">
                <?php echo csrf_field(); ?>
                <div class="superadmin-user-modal-grid">
                  <label>Nombre del hospital<input name="name" placeholder="Ej. Hospital ABC Observatorio" required></label>
                  <label>Grupo o institucion<input name="network_type" placeholder="Ej. Hospital ABC"></label>
                  <label>Ciudad<input name="city" placeholder="Ej. Ciudad de Mexico"></label>
                  <label>Estado<input name="state" placeholder="Ej. Ciudad de Mexico"></label>
                  <label>Tipo de unidad<input name="unit_type" placeholder="Ej. Hospital"></label>
                  <label>Alcance<input name="scope" placeholder="Ej. Cadena privada"></label>
                  <label class="span-2">Fuente URL<input name="source" placeholder="https://..."></label>
                  <label class="span-2">Direccion<input name="address" placeholder="Calle, numero, colonia"></label>
                  <label>Contacto<input name="contact_name" placeholder="Ej. Area de compras"></label>
                    <label>Telefono<input name="phone" placeholder="Ej. 5551234567"></label>
                  <label>Correo<input name="contact_email" type="email" placeholder="Ej. contacto@hospital.com"></label>
                  <label>Estatus<select name="status"><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label>
                  <label class="span-2">Servicios relacionados<input name="related_services" placeholder="Ej. Nutricion parenteral, Oncologia"></label>
                  <label class="span-2">Notas<textarea name="notes" rows="4" placeholder="Observaciones internas del superadministrador"></textarea></label>
                </div>
                <footer><a href="#">Cancelar</a><button type="submit">Agregar hospital</button></footer>
              </form>
            </div>
          </section>
        <?php endif; ?>

        <?php if($section === 'modules' && $selectedModule): ?>
          <?php
            $modulePermissions = data_get($selectedModule->settings, 'permissions', ['Consultar', 'Crear / editar', 'Usuarios', 'Reportes', 'Configuracion', 'Auditoria']);
            $permissionOptions = [
              'Consultar' => 'Visualizar informacion y tableros del modulo.',
              'Crear / editar' => 'Modificar registros administrables del modulo.',
              'Usuarios' => 'Administrar perfiles, responsables y accesos.',
              'Reportes' => 'Generar y exportar reportes del modulo.',
              'Configuracion' => 'Ajustar reglas, alcance y estado operativo.',
              'Auditoria' => 'Consultar trazabilidad y cambios relevantes.',
            ];
          ?>

          <section id="module-config" class="superadmin-native-module-config">
            <header>
              <div>
                <h3><?php echo e($selectedModule->label); ?></h3>
                <p><?php echo e(data_get($selectedModule->settings, 'description', 'Catalogo institucional, unidades, servicios, contratos y cobertura.')); ?></p>
              </div>
              <?php if(\Illuminate\Support\Facades\Route::has($selectedModule->target)): ?>
                <a href="<?php echo e(route($selectedModule->target)); ?>">Abrir modulo</a>
              <?php endif; ?>
            </header>

            <form method="post" action="<?php echo e(route('superadmin.modules.details', ['module' => $selectedModule, 'selected_module' => $selectedModule->key])); ?>#module-config">
              <?php echo csrf_field(); ?>
              <?php echo method_field('patch'); ?>
              <input type="hidden" name="label" value="<?php echo e($selectedModule->label); ?>">
              <input type="hidden" name="target" value="<?php echo e($selectedModule->target); ?>">
              <input type="hidden" name="description" value="<?php echo e(data_get($selectedModule->settings, 'description')); ?>">

              <div class="superadmin-native-module-config-grid">
                <label>Estatus
                  <select name="status">
                    <option value="active" <?php if($selectedModule->enabled): echo 'selected'; endif; ?>>Activo</option>
                    <option value="inactive" <?php if(! $selectedModule->enabled): echo 'selected'; endif; ?>>Inactivo</option>
                  </select>
                </label>
                <label>Responsable
                  <select name="owner">
                    <?php $__currentLoopData = ['Direccion General', 'Direccion Administrativa', 'Direccion Medica', 'Superadministracion', 'Seguridad y Acceso']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $owner): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                      <option value="<?php echo e($owner); ?>" <?php if(data_get($selectedModule->settings, 'owner', 'Direccion General') === $owner): echo 'selected'; endif; ?>><?php echo e($owner); ?></option>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                  </select>
                </label>
              </div>

              <fieldset>
                <legend>Permisos administrativos</legend>
                <div class="superadmin-native-module-permissions">
                  <?php $__currentLoopData = $permissionOptions; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $permission => $copy): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <label>
                      <input type="checkbox" name="permissions[]" value="<?php echo e($permission); ?>" <?php if(in_array($permission, $modulePermissions, true)): echo 'checked'; endif; ?>>
                      <span>
                        <strong><?php echo e($permission); ?></strong>
                        <small><?php echo e($copy); ?></small>
                      </span>
                    </label>
                  <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                </div>
              </fieldset>

              <label class="superadmin-native-module-note">Nota operativa
                <textarea name="note" rows="4" placeholder="Captura una nota de administracion"><?php echo e(data_get($selectedModule->settings, 'note')); ?></textarea>
              </label>

              <button type="submit">Guardar configuracion</button>
            </form>
          </section>
        <?php endif; ?>

        <div class="pagination-wrap"><?php echo e($records->links()); ?></div>
      </section>
      <?php endif; ?>
    </section>
  </div>
<?php if($section === 'services'): ?>
  <?php echo $__env->make('superadmin._service-formats-dialog', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
<?php endif; ?>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.app', ['title' => $catalog['title']], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH C:\laragon\www\dr-sam-laravel\resources\views\superadmin\catalog.blade.php ENDPATH**/ ?>
<?php /**PATH C:\laragon\www\dr-sam\resources\views/superadmin/catalog.blade.php ENDPATH**/ ?>