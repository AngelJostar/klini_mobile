<div class="patient-profile-shade" data-patient-profile-shade hidden></div>
<aside
  class="patient-profile-panel"
  data-patient-profile-panel
  data-storage-key="{{ 'drsam_patient_profile_panel_'.$patient->id }}"
  data-profile-name="{{ e($patient->full_name) }}"
  data-profile-id="{{ e($patient->platform_number ?? (string) $patient->id) }}"
  data-profile-curp="{{ e($patient->curp ?: 'No registrado') }}"
  data-profile-email="{{ e($patient->email ?: 'paciente@demo.drsam.local') }}"
  data-profile-phone="{{ e($patient->phone ?: 'No registrado') }}"
  data-profile-status="{{ e($statusText($patient->status)) }}"
  data-profile-doctor="{{ e($patient->primaryDoctor?->full_name ?? 'Sin asignar') }}"
  data-profile-completed="{{ e($patient->profile_completed_at?->format('d/m/Y') ?? 'Pendiente') }}"
  data-logout-url="{{ route('logout') }}"
  data-home-url="{{ route('home') }}"
  data-csrf-token="{{ csrf_token() }}"
  aria-label="Perfil del paciente"
  aria-hidden="true"
  hidden>
  <div class="patient-profile-scroll">
    <section class="patient-profile-selector" aria-label="Cuentas del paciente">
      <header class="patient-profile-selector-heading">
        <strong>Tu cuenta</strong>
        <button class="patient-profile-icon-button" type="button" data-profile-panel-close aria-label="Cerrar perfil">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <klini-profiles data-patient-profile-selector aria-label="Selector de perfiles"></klini-profiles>
    </section>
    <section class="patient-social" data-patient-social data-storage-key="{{ 'drsam_patient_social_'.$patient->id }}" data-demo="{{ app()->isLocal() ? 'true' : 'false' }}" aria-label="Solicitudes de seguidores y actividad social"></section>
  </div>
</aside>

<div class="patient-profile-modal" data-patient-profile-modal aria-hidden="true" hidden>
  <section class="patient-profile-dialog" data-patient-profile-dialog role="dialog" aria-modal="true" aria-labelledby="patient-profile-modal-title">
    <header class="patient-profile-modal-header">
      <div><small data-patient-profile-modal-eyebrow>PERFIL DEL PACIENTE</small><h2 id="patient-profile-modal-title" data-patient-profile-modal-title>Detalle</h2></div>
      <button class="patient-profile-icon-button" type="button" data-profile-close-modal aria-label="Cerrar ventana"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    </header>
    <div class="patient-profile-modal-body" data-patient-profile-modal-body></div>
  </section>
</div>
<input type="file" accept="image/*" data-patient-profile-photo hidden>


