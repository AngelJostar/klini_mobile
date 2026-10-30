@extends('layouts.app', ['title' => 'Portal del Paciente'])

@section('body_class', 'patient-assistant-native-body patient-portal-body')

@push('styles')
  <link rel="stylesheet" href="{{ asset('css/community-activities.css') }}?v={{ filemtime(public_path('css/community-activities.css')) }}">
  <link rel="stylesheet" href="{{ asset('css/patient-health-icons.css') }}?v={{ filemtime(public_path('css/patient-health-icons.css')) }}">
  <link rel="stylesheet" href="{{ asset('css/patient-profile-panel.css') }}?v={{ filemtime(public_path('css/patient-profile-panel.css')) }}">
  <link rel="stylesheet" href="{{ asset('css/communities.css') }}?v={{ filemtime(public_path('css/communities.css')) }}">
  <link rel="stylesheet" href="{{ asset('css/patient-stories.css') }}?v={{ filemtime(public_path('css/patient-stories.css')) }}">
  <link rel="stylesheet" href="{{ asset('css/patient-insurance-drawer.css') }}?v={{ filemtime(public_path('css/patient-insurance-drawer.css')) }}">
  <link rel="stylesheet" href="{{ asset('css/policy-saved-overlay.css') }}?v={{ filemtime(public_path('css/policy-saved-overlay.css')) }}">
  <link rel="stylesheet" href="{{ asset('css/patient-history-mobile.css') }}?v={{ filemtime(public_path('css/patient-history-mobile.css')) }}">
  <link rel="stylesheet" href="{{ asset('css/patient-bottom-nav-mobile.css') }}?v={{ filemtime(public_path('css/patient-bottom-nav-mobile.css')) }}">
  <link rel="stylesheet" href="{{ asset('css/patient-calendar-mobile.css') }}?v={{ filemtime(public_path('css/patient-calendar-mobile.css')) }}">
  <link rel="stylesheet" href="{{ asset('css/patient-social.css') }}?v={{ filemtime(public_path('css/patient-social.css')) }}">
@endpush

@php
  $statusLabels = [
    'active' => 'Activo', 'inactive' => 'Inactivo', 'scheduled' => 'Programada',
    'created' => 'Creado', 'pending' => 'Pendiente', 'delivered' => 'Entregado',
    'in_route' => 'En ruta', 'requested' => 'Solicitado', 'expired' => 'Vencida',
  ];
  $statusText = fn (?string $value) => $statusLabels[$value ?? ''] ?? ($value ? ucfirst(str_replace('_', ' ', $value)) : 'Sin estatus');
  $initials = collect(explode(' ', $patient->full_name))->filter()->take(2)->map(fn ($part) => mb_substr($part, 0, 1))->implode('');
  $storyDemo = app()->isLocal() && (auth()->user()->is_demo || in_array(auth()->user()->role, ['admin', 'superadmin'], true));
  $supportViews = [
    'insurance' => ['Mi Seguro', 'shield'],
    'analyses' => ['Análisis Clínicos', 'flask'],
    'prescriptions' => ['Recetas', 'file'],
    'doctors' => ['Médicos y terapeutas', 'people'],
    'devices' => ['Dispositivos médicos', 'device'],
    'communities' => ['Comunidad', 'people'],
  ];
@endphp

@section('content')
<div class="patient-assistant-native-screen patient-portal" data-patient-portal>
  <header class="patient-assistant-native-topbar patient-portal-topbar">
    <button class="patient-portal-dots" type="button" aria-label="Abrir soporte" aria-expanded="false" aria-controls="patient-support-menu" data-support-toggle>⋮</button>
    <form class="patient-portal-question" onsubmit="return false" data-ai-top-form>
      <input aria-label="Pregunta para Dr. Sam" data-ai-top-input>
      <button type="submit" aria-label="Preguntar" data-ai-top-submit>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22 2 11 13"></path>
          <path d="m22 2-7 20-4-9-9-4 20-7Z"></path>
        </svg>
      </button>
    </form>
    <button class="patient-portal-profile-trigger" type="button" data-profile-panel-open aria-label="Abrir perfil del paciente">
      <span class="patient-portal-avatar" data-profile-panel-avatar>{{ $initials ?: 'PX' }}</span>
    </button>
  </header>

  <div class="patient-ai-chat-shell" data-ai-chat-panel aria-hidden="true" hidden>
    <section class="patient-ai-chat" aria-label="Chat con Dr. Sam">
      <button class="patient-ai-chat-close" type="button" aria-label="Cerrar chat" data-ai-chat-close>×</button>
      <div class="patient-ai-chat-messages" data-ai-chat-messages aria-live="polite"></div>
      <form class="patient-ai-chat-composer" data-ai-chat-form>
        <input aria-label="Escribe otro mensaje para Dr. Sam" placeholder="Escribe otro mensaje..." data-ai-chat-input>
        <button type="submit" aria-label="Enviar mensaje">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22 2 11 13"></path>
            <path d="m22 2-7 20-4-9-9-4 20-7Z"></path>
          </svg>
        </button>
      </form>
    </section>
  </div>

  <div class="patient-portal-layout">
    <aside id="patient-support-menu" class="patient-assistant-native-menu patient-portal-menu" aria-label="Menú del paciente" aria-hidden="true" data-support-menu>

      <button class="patient-profile-row patient-profile-finance-row" type="button" data-profile-view="finance">
        <span class="patient-profile-finance-art" aria-hidden="true">
          <span class="patient-profile-wallet-shape"></span>
          <span class="patient-profile-coin patient-profile-coin-one"></span>
          <span class="patient-profile-coin patient-profile-coin-two"></span>
        </span>
        <span class="patient-profile-row-copy"><strong>Billetera y Suscripción</strong><small>Pagos, saldo y plan de acceso</small></span>
        <span class="patient-profile-row-action" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></span>
      </button>

      <section class="patient-profile-support-group" data-profile-support-group>
        <button class="patient-profile-row" type="button" data-profile-support-toggle aria-expanded="false">
          <span class="patient-profile-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="2.7"/><circle cx="6.3" cy="9.4" r="2"/><circle cx="17.7" cy="9.4" r="2"/><path d="M7.7 18.8c.7-2.9 2.2-4.4 4.3-4.4s3.6 1.5 4.3 4.4"/><path d="M2.8 18.7c.5-2.2 1.7-3.4 3.6-3.4.7 0 1.3.1 1.8.4"/><path d="M21.2 18.7c-.5-2.2-1.7-3.4-3.6-3.4-.7 0-1.3.1-1.8.4"/></svg></span>
          <span class="patient-profile-row-copy"><strong>Interacciones</strong><small>Solicitudes, mensajes, alertas y enlaces</small></span>
          <span class="patient-profile-row-action patient-profile-support-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></span>
        </button>
        <div class="patient-profile-support-menu" data-profile-support-menu hidden>
          <button class="patient-profile-support-item" type="button" data-profile-view="requests">
            <span class="patient-profile-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3h6v3H9zM9 11h6M9 15h4"/></svg></span>
            <span class="patient-profile-row-copy"><strong>Solicitudes</strong><small data-profile-count-label="requests">Sin solicitudes pendientes</small></span>
            <b class="patient-profile-badge" data-profile-count="requests">0</b>
          </button>
          <button class="patient-profile-support-item" type="button" data-profile-view="messages">
            <span class="patient-profile-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></svg></span>
            <span class="patient-profile-row-copy"><strong>Mensajes</strong><small data-profile-count-label="messages">Médicos, seguros y unidades</small></span>
            <b class="patient-profile-badge" data-profile-count="messages">3</b>
          </button>
          <button class="patient-profile-support-item" type="button" data-profile-view="alerts">
            <span class="patient-profile-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM9 21h6"/></svg></span>
            <span class="patient-profile-row-copy"><strong>Alertas</strong><small data-profile-count-label="alerts">Recordatorios y avisos importantes</small></span>
            <b class="patient-profile-badge" data-profile-count="alerts">2</b>
          </button>
          <button class="patient-profile-support-item" type="button" data-profile-view="sync">
            <span class="patient-profile-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 7h-6V1M4 17h6v6"/><path d="M20 7a9 9 0 0 0-15-3M4 17a9 9 0 0 0 15 3"/></svg></span>
            <span class="patient-profile-row-copy"><strong>Sincronización</strong><small data-profile-count-label="sync">2 enlaces activos</small></span>
            <b class="patient-profile-badge" data-profile-count="sync">2</b>
          </button>
        </div>
      </section>

      @foreach ($supportViews as $key => [$label, $icon])
        @if ($key === 'analyses')
          <h2 class="patient-support-medical-heading">Soporte médico</h2>
        @endif
        @if ($key === 'insurance')
          <button class="patient-support-insurance-card" type="button" data-open-view="{{ $key }}">
            <span class="patient-support-insurance-icon">@include('patient.partials.insurance-icon', ['icon'=>'shield'])</span>
            <strong>{{ $label }}</strong>
            <span class="patient-support-insurance-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></span>
          </button>
        @else
          <button type="button" data-open-view="{{ $key }}">
            <span class="patient-support-icon patient-support-icon-{{ $icon }}" aria-hidden="true"></span>{{ $label }}
          </button>
        @endif
      @endforeach
    </aside>

    <main class="patient-portal-content">
      @php
        $patientNotice = session('patient_notice');
        $patientNoticeText = is_string($patientNotice) ? $patientNotice : null;
        $normalizedPatientNotice = $patientNoticeText
          ? str_replace(
              ['á', 'é', 'í', 'ó', 'ú', 'Á', 'É', 'Í', 'Ó', 'Ú'],
              ['a', 'e', 'i', 'o', 'u', 'a', 'e', 'i', 'o', 'u'],
              strtolower($patientNoticeText)
            )
          : '';
        $showPolicySavedNotice = $patientNoticeText
          && strpos($normalizedPatientNotice, 'poliza') !== false
          && strpos($normalizedPatientNotice, 'guard') !== false;
      @endphp

      @if ($patientNoticeText && ! $showPolicySavedNotice)
        <div class="patient-portal-notice">{{ $patientNoticeText }}</div>
      @endif

      @if ($showPolicySavedNotice)
        <div class="policy-saved-overlay" data-policy-saved-overlay role="dialog" aria-modal="true" aria-labelledby="policySavedTitle">
          <div class="policy-saved-dialog">
            <button class="policy-saved-close" type="button" data-policy-saved-close aria-label="Cerrar">&times;</button>
            <div class="policy-saved-illustration" aria-hidden="true">
              <span class="policy-confetti policy-confetti-one"></span>
              <span class="policy-confetti policy-confetti-two"></span>
              <span class="policy-confetti policy-confetti-three"></span>
              <span class="policy-confetti policy-confetti-four"></span>
              <span class="policy-saved-check">&#10003;</span>
            </div>
            <h2 id="policySavedTitle"><span>¡Póliza</span><strong>guardada!</strong></h2>
            <p>La póliza se guardó satisfactoriamente.</p>
          </div>
        </div>
      @endif
      @if ($errors->any())
        <div class="patient-portal-notice is-error">{{ $errors->first() }}</div>
      @endif

      <section class="patient-portal-view patient-portal-home-view is-active" data-patient-view="home">
        <div id="patient-home-posts-root" data-patient-home-posts-root></div>
      </section>

      <section class="patient-portal-view" data-patient-view="profile">
        <div class="patient-portal-view-heading"><div><small>PERFIL DEL PACIENTE</small><h1>Mi perfil</h1><p>Información personal y datos de contacto.</p></div></div>
        <div class="patient-portal-two-columns">
          <form class="patient-portal-card patient-portal-form" method="post" action="{{ route('patient.profile.update') }}">
            @csrf @method('PATCH')
            <h2>Datos personales</h2>
            <div class="patient-portal-form-grid">
              <label>Nombre<input name="first_name" value="{{ old('first_name', $patient->first_name) }}"></label>
              <label>Apellidos<input name="last_name" value="{{ old('last_name', $patient->last_name) }}"></label>
              <label>Fecha de nacimiento<input type="date" name="birth_date" value="{{ old('birth_date', $patient->birth_date?->format('Y-m-d')) }}"></label>
              <label>Sexo<select name="sex"><option value="unspecified">Sin especificar</option><option value="female" @selected($patient->sex === 'female')>Femenino</option><option value="male" @selected($patient->sex === 'male')>Masculino</option><option value="other" @selected($patient->sex === 'other')>Otro</option></select></label>
              <label>CURP<input name="curp" maxlength="18" value="{{ old('curp', $patient->curp) }}"></label>
              <label>No. usuario plataforma<input value="{{ $patient->platform_number }}" disabled></label>
              <label>Teléfono<input name="phone" value="{{ old('phone', $patient->phone) }}"></label>
              <label>Correo<input type="email" name="email" value="{{ old('email', $patient->email) }}" readonly aria-readonly="true"></label>
            </div>
            <button class="patient-portal-primary" type="submit">Guardar cambios</button>
          </form>
          <article class="patient-portal-card patient-portal-preview">
            <div class="patient-portal-avatar">{{ $initials ?: 'PX' }}</div>
            <h2>{{ $patient->full_name }}</h2><p>{{ $patient->platform_number ?? 'Sin número de plataforma' }}</p>
            <dl><div><dt>Estatus</dt><dd>{{ $statusText($patient->status) }}</dd></div><div><dt>Médico principal</dt><dd>{{ $patient->primaryDoctor?->full_name ?? 'Sin asignar' }}</dd></div><div><dt>Perfil completado</dt><dd>{{ $patient->profile_completed_at?->format('d/m/Y') ?? 'Pendiente' }}</dd></div></dl>
          </article>
        </div>
      </section>

      <section class="patient-portal-view patient-portal-communities-view" data-patient-view="communities">
        <div id="patient-communities-root" data-communities-root></div>
      </section>

      <section class="patient-portal-view" data-patient-view="insurance">
        @php
          $policyMeta = $policy?->metadata ?? [];
          $advisorName = $policyMeta['advisor_name'] ?? 'Asesor por asignar';
          $insuranceComplete = $policy
            && $policy->policy_number
            && $policy->insurer_name
            && $policy->starts_at
            && $policy->ends_at;
          $insuranceValue = fn ($value, $fallback = 'No registrado') => filled($value) ? $value : $fallback;
        @endphp
        @include('patient.partials.insurance-flow')
        <article class="patient-insurance-shell">
          <header class="patient-insurance-hero">
            <div class="patient-insurance-hero-icon" aria-hidden="true"><span>✓</span></div>
            <div><h1>Mi Seguro</h1></div>
          </header>
          <div class="patient-insurance-overview">
            <div class="patient-insurance-illustration" aria-hidden="true"><span class="patient-insurance-case">＋</span><span class="patient-insurance-shield">⌁</span></div>
            <section class="patient-insurance-status">
              <strong>Estado de tu seguro <span title="Información del estado">ⓘ</span></strong>
              <div class="patient-insurance-alert {{ $insuranceComplete ? 'is-complete' : '' }}">
                <span>{{ $insuranceComplete ? '✓' : '◷' }}</span>
                <div><b>{{ $insuranceComplete ? 'Información completa' : 'Información pendiente' }}</b><small>{{ $insuranceComplete ? 'Tu póliza se encuentra registrada.' : 'Hay datos por completar para tu seguro.' }}</small></div>
              </div>
              <div class="patient-insurance-actions">
                <button type="button" data-insurance-form-open>⌕&nbsp; Actualizar datos</button>
                <button class="patient-insurance-upload" type="button" data-insurance-form-open><span>●</span>Subir póliza</button>
              </div>
            </section>
            <aside class="patient-insurance-advisor">
              <div class="patient-insurance-advisor-heading"><span>{{ collect(explode(' ', $advisorName))->filter()->take(2)->map(fn($part) => mb_substr($part, 0, 1))->implode('') ?: 'AS' }}</span><div><small>ASESOR DE SEGUROS VINCULADO</small><strong>{{ $advisorName }}</strong></div></div>
              <p>Cualquier solicitud de soporte se canalizará con tu asesor vinculado para dar seguimiento a coberturas, autorizaciones y reembolsos.</p>
              <div><small>ASEGURADORA</small><strong>{{ $insuranceValue($policy?->insurer_name, 'Por asignar') }}</strong></div>
              @if($policyMeta['advisor_email'] ?? null)
                <a href="mailto:{{ $policyMeta['advisor_email'] }}">Contactar asesor</a>
              @else
                <button type="button" disabled title="Asesor sin medio de contacto registrado">Contactar asesor</button>
              @endif
            </aside>
          </div>
          <nav class="patient-insurance-tabs" data-insurance-tabs-carousel aria-label="Secciones de Mi Seguro">
            <button type="button" aria-label="Anterior" data-insurance-tab-step="-1">‹</button>
            <button class="is-active" type="button" data-insurance-tab="summary">▣&nbsp; Resumen</button>
            <button type="button" data-insurance-tab="coverage">♢&nbsp; Cobertura</button>
            <button type="button" data-insurance-tab="programs">⌘&nbsp; Programas</button>
            <button type="button" data-insurance-tab="network">♧&nbsp; Red de Médicos</button>
            <button type="button" data-insurance-tab="medications">◇&nbsp; Medicamentos</button>
            <button type="button" data-insurance-tab="refunds">▣&nbsp; Reembolsos</button>
            <button type="button" aria-label="Siguiente" data-insurance-tab-step="1">›</button>
          </nav>
          <div class="patient-insurance-content">
            <section class="patient-insurance-pane is-active" data-insurance-pane="summary">
              <header><span>▣</span><div><h2>Resumen de información</h2><p>Detalle del estado de tu información de seguro</p></div></header>
              <dl class="patient-insurance-summary">
                <div><dt>♢&nbsp; Aseguradora</dt><dd class="{{ $policy?->insurer_name ? '' : 'is-missing' }}">{{ $insuranceValue($policy?->insurer_name, 'Aseguradora no registrada') }}</dd></div>
                <div><dt>▣&nbsp; Vigencia</dt><dd class="{{ $policy?->starts_at && $policy?->ends_at ? '' : 'is-missing' }}">{{ $policy?->starts_at && $policy?->ends_at ? $policy->starts_at->format('d/m/Y').' - '.$policy->ends_at->format('d/m/Y') : 'No registrada' }}</dd></div>
                <div><dt>▯&nbsp; Póliza</dt><dd class="{{ $policy?->policy_number ? '' : 'is-missing' }}">{{ $insuranceValue($policy?->policy_number) }}</dd></div>
                <div><dt>▣&nbsp; Deducible</dt><dd class="{{ filled($policyMeta['deductible'] ?? null) ? '' : 'is-missing' }}">{{ $insuranceValue($policyMeta['deductible'] ?? null) }}</dd></div>
                <div><dt>▣&nbsp; Plan</dt><dd class="{{ $policy?->plan_name ? '' : 'is-pending' }}">{{ $insuranceValue($policy?->plan_name, 'Plan pendiente de captura') }}</dd></div>
                <div><dt>♢&nbsp; Coaseguro</dt><dd class="{{ filled($policyMeta['coinsurance'] ?? null) ? '' : 'is-missing' }}">{{ $insuranceValue($policyMeta['coinsurance'] ?? null) }}</dd></div>
              </dl>
            </section>
            @foreach (['coverage' => ['Cobertura', 'Los beneficios y límites de cobertura aparecerán cuando sean registrados.'], 'programs' => ['Programas', 'No hay programas de apego vinculados a esta póliza.'], 'network' => ['Red de Médicos', 'No hay una red médica registrada para esta póliza.'], 'medications' => ['Medicamentos', 'No hay medicamentos cubiertos registrados.'], 'refunds' => ['Reembolsos', 'No hay solicitudes de reembolso registradas.']] as $tab => [$title, $description])
              <section class="patient-insurance-pane" data-insurance-pane="{{ $tab }}"><header><span>▣</span><div><h2>{{ $title }}</h2><p>{{ $description }}</p></div></header><div class="patient-insurance-empty">No registrado</div></section>
            @endforeach
          </div>
          <form class="patient-insurance-edit-form patient-portal-form" method="post" action="{{ route('patient.insurance.save') }}" data-insurance-form hidden>
            @csrf
            <div class="patient-insurance-form-heading"><div><h2>{{ $policy ? 'Actualizar póliza' : 'Registrar póliza' }}</h2><p>Completa los datos disponibles de tu seguro médico.</p></div><button type="button" data-insurance-form-close>×</button></div>
            <div class="patient-portal-form-grid">
              <label>Número de póliza<input required name="policy_number" value="{{ old('policy_number', $policy?->policy_number) }}"></label>
              <label>Aseguradora<input required name="insurer_name" value="{{ old('insurer_name', $policy?->insurer_name) }}"></label>
              <label>Plan<input name="plan_name" value="{{ old('plan_name', $policy?->plan_name) }}"></label>
              <label>Empresa<input name="employer_name" value="{{ old('employer_name', $policy?->employer_name) }}"></label>
              <label>Inicio<input type="date" name="starts_at" value="{{ old('starts_at', $policy?->starts_at?->format('Y-m-d')) }}"></label>
              <label>Fin<input type="date" name="ends_at" value="{{ old('ends_at', $policy?->ends_at?->format('Y-m-d')) }}"></label>
              <label>Estatus<select name="status"><option value="active">Activa</option><option value="pending" @selected($policy?->status === 'pending')>Pendiente</option><option value="inactive" @selected($policy?->status === 'inactive')>Inactiva</option><option value="expired" @selected($policy?->status === 'expired')>Vencida</option></select></label>
            </div>
            <button class="patient-portal-primary" type="submit">Guardar póliza</button>
          </form>
        </article>
      </section>

      <section class="patient-portal-view patient-analyses-view" data-patient-view="analyses">
        @php
          $analysisMonthLabels = [1 => 'ene', 2 => 'feb', 3 => 'mar', 4 => 'abr', 5 => 'may', 6 => 'jun', 7 => 'jul', 8 => 'ago', 9 => 'sep', 10 => 'oct', 11 => 'nov', 12 => 'dic'];
          $analysisTypeFor = function ($document) {
            $type = strtolower((string) $document->document_type);
            $mime = strtolower((string) ($document->file_mime ?? ''));
            $path = strtolower((string) ($document->file_path ?? ''));
            if (str_contains($type, 'imag') || str_starts_with($mime, 'image/')) return 'image';
            if ($type === 'pdf' || str_contains($mime, 'pdf') || str_ends_with($path, '.pdf')) return 'pdf';
            return 'laboratory';
          };
          $analysisTypeLabel = ['laboratory' => 'Laboratorio', 'image' => 'Imagen', 'pdf' => 'PDF'];
          $analysisTypeIcon = ['laboratory' => 'lab', 'image' => 'image', 'pdf' => 'pdf'];
        @endphp
        <article class="patient-analyses-panel">
          <header class="patient-analyses-hero">
            <div class="patient-analyses-hero-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v5h4"></path><path d="M9 13h6"></path><path d="M9 17h6"></path></svg>
            </div>
            <div>
              <small>EXPEDIENTE DIGITAL</small>
              <h1>An&aacute;lisis cl&iacute;nicos</h1>
            </div>
          </header>

          <div class="patient-analyses-body">
            <nav class="patient-analyses-filter-bar" aria-label="Filtros de an&aacute;lisis cl&iacute;nicos">
              <button class="is-all is-active" type="button" data-analysis-filter="all" aria-pressed="true"><span class="patient-register-history-image patient-register-history-all-image" aria-hidden="true"><img src="/images/history-icons/all.png?v=20260828-history-all" alt="" loading="lazy"></span><b>Todos</b></button>
              <button class="is-lab" type="button" data-analysis-filter="laboratory" aria-pressed="false"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/health-icons/history/02_analisis_laboratorio.png?v=20261013" alt="" loading="lazy"></span><b>Laboratorio</b></button>
              <button class="is-image" type="button" data-analysis-filter="image" aria-pressed="false"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/health-icons/history/03_estudios.png?v=20261013" alt="" loading="lazy"></span><b>Imagen</b></button>
              <button class="is-pdf" type="button" data-analysis-filter="pdf" aria-pressed="false"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/health-icons/history/04_recetas.png?v=20261013" alt="" loading="lazy"></span><b>PDF</b></button>
            </nav>

            <div class="patient-analyses-toolbar">
              <button class="patient-analyses-sort" type="button" data-analysis-sort data-analysis-sort-direction="desc">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="3"></rect><path d="M3 10h18"></path></svg>
                <span data-analysis-sort-label>Ordenar por fecha</span>
                <b aria-hidden="true">⌄</b>
              </button>
              <button class="patient-analyses-filter-action" type="button" data-analysis-filter-open aria-haspopup="dialog">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10"></path><path d="M18 7h2"></path><path d="M16 5v4"></path><path d="M4 17h2"></path><path d="M10 17h10"></path><path d="M8 15v4"></path></svg>
                <span>Filtrar</span>
              </button>
            </div>

            <div class="patient-analyses-list" data-analysis-list>
              @forelse ($clinicalAnalyses as $document)
                @php
                  $analysisType = $analysisTypeFor($document);
                  $analysisDate = $document->loaded_at ?? $document->created_at;
                  $analysisDateLabel = $analysisDate
                    ? $analysisDate->format('j').' '.$analysisMonthLabels[(int) $analysisDate->format('n')].' '.$analysisDate->format('Y')
                    : 'Sin fecha';
                  $originName = data_get($document->metadata, 'origin')
                    ?? data_get($document->metadata, 'laboratory')
                    ?? data_get($document->metadata, 'provider')
                    ?? data_get($document->metadata, 'hospital')
                    ?? 'Laboratorio Central';
                  $analysisSpecialtyRaw = data_get($document->metadata, 'specialty')
                    ?? data_get($document->metadata, 'especialidad')
                    ?? data_get($document->metadata, 'department')
                    ?? 'General';
                  $analysisSpecialtyKey = \Illuminate\Support\Str::of($analysisSpecialtyRaw)->ascii()->lower()->slug()->toString();
                  $isNewAnalysis = in_array($document->status, ['new', 'pending', 'requested', 'created'], true);
                  $isReviewedAnalysis = in_array($document->status, ['reviewed', 'revisado', 'validated', 'validado', 'completed'], true);
                  $analysisStatusLabel = $isNewAnalysis ? 'Nuevo' : ($isReviewedAnalysis ? 'Revisado' : 'Cargado');
                  $analysisStatusClass = $isNewAnalysis ? 'is-new' : ($isReviewedAnalysis ? 'is-reviewed' : 'is-loaded');
                  $analysisStatusValue = $isNewAnalysis ? 'new' : ($isReviewedAnalysis ? 'reviewed' : 'loaded');
                @endphp
                <article class="patient-analysis-card" data-analysis-card data-analysis-type="{{ $analysisType }}" data-analysis-date="{{ $analysisDate?->timestamp ?? 0 }}" data-analysis-date-iso="{{ $analysisDate?->format('Y-m-d') }}" data-analysis-specialty="{{ $analysisSpecialtyKey ?: 'general' }}" data-analysis-status="{{ $analysisStatusValue }}">
                  <span class="patient-analysis-card-icon is-{{ $analysisTypeIcon[$analysisType] ?? 'lab' }}" aria-hidden="true">
                    @if ($analysisType === 'image')
                      <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8" cy="10" r="1.6"></circle><path d="m7 17 4-5 3 3 2-2 3 4"></path></svg>
                    @elseif ($analysisType === 'pdf')
                      <svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v5h4"></path><path d="M9 13h6"></path><path d="M9 17h5"></path></svg>
                    @else
                      <svg viewBox="0 0 24 24"><path d="M9 3v6l-4 7a4 4 0 0 0 3.5 6h7a4 4 0 0 0 3.5-6l-4-7V3"></path><path d="M8 3h8"></path><path d="M7 16h10"></path></svg>
                    @endif
                  </span>
                  <div class="patient-analysis-card-copy">
                    <h2>{{ $document->name }}</h2>
                    <p><span aria-hidden="true">▣</span>{{ $analysisDateLabel }}</p>
                    <p>{{ $originName }}</p>
                    <span class="patient-analysis-type-pill is-{{ $analysisType }}">{{ $analysisTypeLabel[$analysisType] ?? 'Laboratorio' }}</span>
                  </div>
                  <span class="patient-analysis-status {{ $analysisStatusClass }}">{{ $analysisStatusLabel }}</span>
                  @if($document->file_path)
                    <a class="patient-analysis-view-link" href="{{ asset('storage/'.$document->file_path) }}" target="_blank" rel="noopener">Ver estudio <b aria-hidden="true">›</b></a>
                  @else
                    <button class="patient-analysis-view-link" type="button" disabled>Ver estudio <b aria-hidden="true">›</b></button>
                  @endif
                </article>
              @empty
                <div class="patient-analyses-empty" data-analysis-empty>A&uacute;n no hay an&aacute;lisis cl&iacute;nicos registrados.</div>
              @endforelse
            </div>
            @if ($clinicalAnalyses->isNotEmpty())
              <div class="patient-analyses-empty" data-analysis-empty hidden>No hay estudios para este filtro.</div>
            @endif
          </div>
          <dialog class="patient-analysis-filter-dialog" data-analysis-filter-dialog aria-labelledby="patient-analysis-filter-title">
            <div class="patient-analysis-filter-modal">
              <header class="patient-analysis-filter-header">
                <h2 id="patient-analysis-filter-title">Filtrar an&aacute;lisis</h2>
                <button type="button" data-analysis-filter-close aria-label="Cerrar filtros">×</button>
              </header>
              <div class="patient-analysis-filter-content">
                <section class="patient-analysis-filter-group" aria-labelledby="patient-analysis-date-filter-title" data-analysis-filter-section>
                  <button class="patient-analysis-filter-toggle" type="button" data-analysis-filter-section-toggle aria-expanded="false" aria-controls="patient-analysis-date-filter-options">
                    <span class="patient-analysis-filter-row-icon is-date" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="3"></rect><path d="M3 10h18"></path></svg>
                    </span>
                    <span class="patient-analysis-filter-row-copy"><strong id="patient-analysis-date-filter-title">Fecha</strong><small data-analysis-filter-summary="date">Elige un periodo</small></span>
                    <span class="patient-analysis-filter-chevron" aria-hidden="true">⌄</span>
                  </button>
                  <div class="patient-analysis-filter-options" id="patient-analysis-date-filter-options" hidden>
                    <button type="button" data-analysis-modal-filter="date" data-analysis-modal-value="today" aria-pressed="false">Hoy</button>
                    <button type="button" data-analysis-modal-filter="date" data-analysis-modal-value="week" aria-pressed="false">Semana</button>
                    <button type="button" data-analysis-modal-filter="date" data-analysis-modal-value="month" aria-pressed="false">Mes</button>
                    <button type="button" data-analysis-modal-filter="date" data-analysis-modal-value="custom" aria-pressed="false">Personalizado</button>
                  </div>
                </section>
                <section class="patient-analysis-filter-group" aria-labelledby="patient-analysis-type-filter-title" data-analysis-filter-section>
                  <button class="patient-analysis-filter-toggle" type="button" data-analysis-filter-section-toggle aria-expanded="false" aria-controls="patient-analysis-type-filter-options">
                    <span class="patient-analysis-filter-row-icon is-type" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="M9 3v6l-4 7a4 4 0 0 0 3.5 6h7a4 4 0 0 0 3.5-6l-4-7V3"></path><path d="M8 3h8"></path><path d="M7 16h10"></path></svg>
                    </span>
                    <span class="patient-analysis-filter-row-copy"><strong id="patient-analysis-type-filter-title">Tipo de estudio</strong><small data-analysis-filter-summary="type">Todos los tipos</small></span>
                    <span class="patient-analysis-filter-chevron" aria-hidden="true">⌄</span>
                  </button>
                  <div class="patient-analysis-filter-options" id="patient-analysis-type-filter-options" hidden>
                    <button class="is-active" type="button" data-analysis-modal-filter="type" data-analysis-modal-value="all" aria-pressed="true">Todos</button>
                    <button type="button" data-analysis-modal-filter="type" data-analysis-modal-value="laboratory" aria-pressed="false">Laboratorio</button>
                    <button type="button" data-analysis-modal-filter="type" data-analysis-modal-value="image" aria-pressed="false">Imagen</button>
                    <button type="button" data-analysis-modal-filter="type" data-analysis-modal-value="pdf" aria-pressed="false">PDF</button>
                  </div>
                </section>
                <section class="patient-analysis-filter-group" aria-labelledby="patient-analysis-specialty-filter-title" data-analysis-filter-section>
                  <button class="patient-analysis-filter-toggle" type="button" data-analysis-filter-section-toggle aria-expanded="false" aria-controls="patient-analysis-specialty-filter-options">
                    <span class="patient-analysis-filter-row-icon is-specialty" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="M6 12h12"></path><path d="M12 6v12"></path><circle cx="12" cy="12" r="9"></circle></svg>
                    </span>
                    <span class="patient-analysis-filter-row-copy"><strong id="patient-analysis-specialty-filter-title">Especialidad</strong><small data-analysis-filter-summary="specialty">Todas las especialidades</small></span>
                    <span class="patient-analysis-filter-chevron" aria-hidden="true">⌄</span>
                  </button>
                  <div class="patient-analysis-filter-options" id="patient-analysis-specialty-filter-options" hidden>
                    <button type="button" data-analysis-modal-filter="specialty" data-analysis-modal-value="general" aria-pressed="false">General</button>
                    <button type="button" data-analysis-modal-filter="specialty" data-analysis-modal-value="cardiologia" aria-pressed="false">Cardiolog&iacute;a</button>
                    <button type="button" data-analysis-modal-filter="specialty" data-analysis-modal-value="pediatria" aria-pressed="false">Pediatr&iacute;a</button>
                    <button type="button" data-analysis-modal-filter="specialty" data-analysis-modal-value="endocrino" aria-pressed="false">Endocrino</button>
                  </div>
                </section>
                <section class="patient-analysis-filter-group" aria-labelledby="patient-analysis-status-filter-title" data-analysis-filter-section>
                  <button class="patient-analysis-filter-toggle" type="button" data-analysis-filter-section-toggle aria-expanded="false" aria-controls="patient-analysis-status-filter-options">
                    <span class="patient-analysis-filter-row-icon is-status" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="m7 12 3 3 7-7"></path><circle cx="12" cy="12" r="9"></circle></svg>
                    </span>
                    <span class="patient-analysis-filter-row-copy"><strong id="patient-analysis-status-filter-title">Estado</strong><small data-analysis-filter-summary="status">Todos los estados</small></span>
                    <span class="patient-analysis-filter-chevron" aria-hidden="true">⌄</span>
                  </button>
                  <div class="patient-analysis-filter-options" id="patient-analysis-status-filter-options" hidden>
                    <button type="button" data-analysis-modal-filter="status" data-analysis-modal-value="new" aria-pressed="false">Nuevo</button>
                    <button type="button" data-analysis-modal-filter="status" data-analysis-modal-value="loaded" aria-pressed="false">Cargado</button>
                    <button type="button" data-analysis-modal-filter="status" data-analysis-modal-value="reviewed" aria-pressed="false">Revisado</button>
                  </div>
                </section>
              </div>
              <footer class="patient-analysis-filter-footer">
                <button class="patient-analysis-filter-clear" type="button" data-analysis-filter-clear>Limpiar</button>
                <button class="patient-analysis-filter-apply" type="button" data-analysis-filter-apply>Aplicar filtros</button>
              </footer>
            </div>
          </dialog>
        </article>
      </section>

      <section class="patient-portal-view" data-patient-view="history">
        @php
          $clinicalCategory = function ($type) {
            $type = strtolower((string) $type);
            return str_contains($type, 'hospital') ? 'hospitalization'
              : (str_contains($type, 'study') || str_contains($type, 'estudio') ? 'study'
              : (str_contains($type, 'lab') || str_contains($type, 'analysis') ? 'laboratory' : 'consultation'));
          };
          $historyItems = $patient->clinicalRecords->map(fn ($record) => [
            'key' => 'clinical-record-'.$record->id,
            'date' => $record->recorded_at ?? $record->created_at,
            'category' => $clinicalCategory($record->record_type),
            'origin' => $record->doctor?->full_name ?? ($record->payload['origin'] ?? 'No registrado'),
            'service' => $record->doctor?->specialty ?? $record->title ?? ucfirst(str_replace('_', ' ', $record->record_type)),
            'summary' => $record->summary ?? 'Sin resumen clínico capturado.',
            'indications' => [],
          ])->concat($patient->documents->map(fn ($document) => [
            'key' => 'document-'.$document->id,
            'date' => $document->loaded_at ?? $document->created_at,
            'category' => in_array($document->document_type, ['clinical_analysis', 'laboratory', 'analysis'], true) ? 'laboratory' : 'study',
            'origin' => $document->metadata['origin'] ?? 'No registrado',
            'service' => $document->name ?? ucfirst(str_replace('_', ' ', $document->document_type)),
            'summary' => $document->metadata['summary'] ?? 'Documento clínico disponible en el expediente.',
            'indications' => [],
          ]))->concat($patient->hospitalizations->map(fn ($hospitalization) => [
            'key' => 'hospitalization-'.$hospitalization->id,
            'date' => $hospitalization->admitted_at ?? $hospitalization->created_at,
            'category' => 'hospitalization',
            'origin' => $hospitalization->hospital?->name ?? $hospitalization->hospital_name ?? 'No registrado',
            'service' => $hospitalization->area ?? $hospitalization->event_type ?? 'Hospitalización',
            'summary' => $hospitalization->reason ?? $hospitalization->admission_diagnosis ?? 'Sin resumen clínico capturado.',
            'indications' => [],
          ]))->concat($patient->prescriptions->map(fn ($prescription) => [
            'key' => 'prescription-'.$prescription->id,
            'date' => $prescription->issued_at ?? $prescription->created_at,
            'category' => 'prescription',
            'origin' => $prescription->doctor?->full_name ?? 'No registrado',
            'service' => $prescription->doctor?->specialty ?? 'Receta médica',
            'summary' => $prescription->notes ?? 'Indicaciones médicas emitidas.',
            'indications' => $prescription->items->map(fn ($item) => [
              'title' => trim(collect([$item->dose, $item->duration])->filter()->implode(' · ')) ?: $item->medication_name,
              'detail' => trim(collect([$item->medication_name, $item->frequency, $item->instructions])->filter()->implode('. ')),
            ])->all(),
          ]))->sortByDesc('date')->values();
          $historyCategoryLabels = [
            'consultation' => 'Consulta Médica',
            'laboratory' => 'Análisis de Laboratorio',
            'study' => 'Estudios',
            'prescription' => 'Recetas',
            'hospitalization' => 'Servicio Hospitalario',
            'manual' => 'Registro manual',
            'vaccine' => 'Vacunas',
          ];
        @endphp
        <article class="patient-history-panel">
          <header class="patient-history-hero">
            <div class="patient-history-hero-icon" aria-hidden="true"><i></i><i></i><i></i></div>
            <div><h1>Historial clínico</h1></div>
          </header>
          @include('patient.partials.clinical-history', compact('historyItems', 'historyCategoryLabels'))
        </article>
      </section>

      <section class="patient-portal-view patient-prescriptions-view" data-patient-view="prescriptions">
        <article class="patient-prescriptions-panel">
          <header class="patient-prescriptions-hero">
            <div class="patient-prescriptions-hero-icon" aria-hidden="true"><span></span></div>
            <div><h1>Recetas</h1></div>
          </header>
          <span class="patient-register-visually-hidden">Hospital donde se recetó</span>
          <span class="patient-register-visually-hidden">Institución donde se recetó</span>
          <div class="patient-prescriptions-redesign">
            <div class="patient-prescription-filter-bar" aria-label="Filtros de recetas">
              <button class="patient-prescription-filter is-all is-active" type="button" data-prescription-filter="all" aria-pressed="true"><span class="patient-register-history-image patient-register-history-all-image" aria-hidden="true"><img src="/images/history-icons/all.png?v=20260828-history-all" alt="" loading="lazy"></span><b>Todos</b></button>
              <button class="patient-prescription-filter patient-prescription-filter-active" type="button" data-prescription-filter="active" aria-pressed="false"><span class="patient-register-history-glyph" aria-hidden="true">✓</span><b>Vigentes</b></button>
              <button class="patient-prescription-filter patient-prescription-filter-expired" type="button" data-prescription-filter="expired" aria-pressed="false"><span class="patient-register-history-glyph" aria-hidden="true">−</span><b>Vencidas</b></button>
              <button class="patient-prescription-filter patient-prescription-filter-redeemed" type="button" data-prescription-filter="redeemed" aria-pressed="false"><span class="patient-register-history-glyph" aria-hidden="true">✓</span><b>Canjeadas</b></button>
              <button class="patient-prescription-filter patient-prescription-filter-partial" type="button" data-prescription-filter="partial" aria-pressed="false"><span class="patient-register-history-glyph" aria-hidden="true">1/2</span><b>Parciales</b></button>
            </div>
            @php
              $prescriptionMonthLabels = [1 => 'ene', 2 => 'feb', 3 => 'mar', 4 => 'abr', 5 => 'may', 6 => 'jun', 7 => 'jul', 8 => 'ago', 9 => 'sep', 10 => 'oct', 11 => 'nov', 12 => 'dic'];
            @endphp
            <div class="patient-prescription-card-list" data-prescription-list>
              @forelse ($patient->prescriptions->sortByDesc('issued_at') as $prescription)
                @php
                  $prescriptionMeta = $prescription->metadata ?? [];
                  $prescriptionStatusValue = strtolower((string) $prescription->status);
                  $pharmacyStatusValue = strtolower((string) data_get($prescriptionMeta, 'pharmacy_status', ''));
                  $expiresAt = $prescriptionMeta['expires_at'] ?? null;
                  $isExpiredPrescription = in_array($prescriptionStatusValue, ['expired', 'inactive', 'cancelled'], true)
                    || ($expiresAt && \Illuminate\Support\Carbon::parse($expiresAt)->isPast());
                  $isRedeemedPrescription = in_array($prescriptionStatusValue, ['filled', 'redeemed', 'dispensed', 'delivered', 'completed'], true)
                    || in_array($pharmacyStatusValue, ['filled', 'redeemed', 'dispensed', 'delivered', 'completed'], true);
                  $isPartialPrescription = in_array($prescriptionStatusValue, ['partial', 'partially_filled', 'partially_redeemed'], true)
                    || in_array($pharmacyStatusValue, ['partial', 'partially_filled', 'partially_redeemed'], true);
                  $hasAnalysis = !empty($prescriptionMeta['clinical_analysis']) || !empty($prescriptionMeta['clinical_analyses']);
                  $primaryItem = $prescription->items->first();
                  $doctorName = $prescription->doctor?->full_name ?? 'Sin médico asignado';
                  $doctorInitials = collect(explode(' ', $doctorName))->filter()->take(2)->map(fn ($part) => mb_substr($part, 0, 1))->implode('') ?: 'DR';
                  $issuedAt = $prescription->issued_at ?? $prescription->created_at;
                  $issuedLabel = $issuedAt
                    ? $issuedAt->format('j').' '.$prescriptionMonthLabels[(int) $issuedAt->format('n')].' '.$issuedAt->format('Y')
                    : 'Sin fecha';
                  $quantity = data_get($primaryItem?->metadata, 'quantity');
                  $presentation = data_get($primaryItem?->metadata, 'presentation');
                  $quantityLabel = $quantity && $presentation ? trim($quantity.' '.$presentation) : null;
                  $medicationTitle = $primaryItem
                    ? collect([$primaryItem->medication_name, $primaryItem->dose])->filter()->implode(' ')
                    : ($prescriptionMeta['clinical_analysis'] ?? 'Sin medicamentos indicados');
                  $medicationSubtitle = $primaryItem
                    ? (collect([$quantityLabel, $primaryItem->frequency])->filter()->implode(' ') ?: ($primaryItem->duration ?: 'Frecuencia no registrada'))
                    : ($hasAnalysis ? 'Análisis clínico solicitado' : 'Sin indicación registrada');
                  $instructions = $primaryItem?->instructions ?: ($prescription->notes ?: 'Indicaciones médicas emitidas.');
                  $prescriptionFilterStatus = $isExpiredPrescription ? 'expired' : ($isRedeemedPrescription ? 'redeemed' : ($isPartialPrescription ? 'partial' : 'active'));
                  $statusLabel = $isExpiredPrescription ? 'Vencida' : ($isRedeemedPrescription ? 'Canjeada' : ($isPartialPrescription ? 'Parcial' : 'Vigente'));
                  $statusClass = 'is-'.$prescriptionFilterStatus;
                @endphp
                <article class="patient-prescription-card {{ $statusClass }}" data-prescription-row data-status="{{ $prescriptionFilterStatus }}" data-has-medications="{{ $prescription->items->isNotEmpty() ? '1' : '0' }}" data-has-analysis="{{ $hasAnalysis ? '1' : '0' }}">
                  <div class="patient-prescription-card-top">
                    <div class="patient-prescription-doctor">
                      <span class="patient-prescription-avatar">{{ $doctorInitials }}</span>
                      <div>
                        <h2>{{ $doctorName }}</h2>
                        <p>{{ $prescription->doctor?->specialty ?? 'Medicina general' }}</p>
                      </div>
                    </div>
                    <span class="patient-prescription-status {{ $statusClass }}"><i></i>{{ $statusLabel }}</span>
                  </div>
                  <div class="patient-prescription-card-body">
                    <div class="patient-prescription-info-row">
                      <span class="patient-prescription-row-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M10.5 20.5 20.5 10.5a5 5 0 0 0-7-7L3.5 13.5a5 5 0 0 0 7 7Z"></path><path d="m8 9 7 7"></path></svg>
                      </span>
                      <div><strong>{{ $medicationTitle }}</strong><p>{{ $medicationSubtitle }}</p></div>
                    </div>
                    <div class="patient-prescription-info-row">
                      <span class="patient-prescription-row-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="3"></rect><path d="M3 10h18"></path><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path></svg>
                      </span>
                      <div><strong>Fecha de emisión</strong><p>{{ $issuedLabel }}</p></div>
                    </div>
                    <div class="patient-prescription-info-row">
                      <span class="patient-prescription-row-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"></path><path d="M14 3v6h5"></path><path d="M10 13h6"></path><path d="M10 17h6"></path></svg>
                      </span>
                      <div><strong>Indicaciones</strong><p>{{ $instructions }}</p></div>
                    </div>
                  </div>
                  <button class="patient-prescription-card-action" type="button" title="{{ $prescription->code ?? 'Receta médica' }}" data-prescription-open="patient-prescription-{{ $prescription->id }}">
                    <span>Ver receta</span><b aria-hidden="true">›</b>
                  </button>
                </article>
              @empty
                <div class="patient-prescriptions-empty" data-prescription-empty>No hay recetas registradas.</div>
              @endforelse
            </div>
            @if ($patient->prescriptions->isNotEmpty())
              <div class="patient-prescriptions-empty" data-prescription-empty hidden>No hay recetas para este filtro.</div>
            @endif
          </div>
        </article>
        @foreach ($patient->prescriptions->sortByDesc('issued_at') as $prescription)
          @php
            $prescriptionMeta = $prescription->metadata ?? [];
            $hospitalName = $prescriptionMeta['hospital'] ?? $prescriptionMeta['medical_unit'] ?? 'Privada';
            $institutionName = $prescriptionMeta['institution'] ?? 'Privada';
            $pharmacyName = $prescriptionMeta['external_pharmacy'] ?? 'Farmacia externa';
          @endphp
          <dialog class="patient-prescription-dialog" id="patient-prescription-{{ $prescription->id }}" aria-labelledby="patient-prescription-title-{{ $prescription->id }}">
            <header class="patient-prescription-dialog-header">
              <div><small>FORMATO PDF</small><h2 id="patient-prescription-title-{{ $prescription->id }}">Receta canjeable</h2></div>
              <button type="button" data-prescription-close aria-label="Cerrar receta">×</button>
            </header>
            <div class="patient-prescription-paper">
              <div class="patient-prescription-paper-title">
                <div><h3>Formato de Receta Médica</h3><p>{{ $pharmacyName }} - {{ $hospitalName === 'Privada' ? 'Consulta Externa Privada' : $hospitalName }}</p></div>
                <div><small>Folio</small><strong>{{ $prescription->code ?? 'RX-'.$prescription->id }}</strong></div>
              </div>
              <dl class="patient-prescription-detail-grid">
                <div><dt>Paciente</dt><dd>{{ $patient->full_name }}</dd></div>
                <div><dt>ID de paciente</dt><dd>{{ $patient->platform_number ?? $patient->id }}</dd></div>
                <div><dt>Médico tratante</dt><dd>{{ $prescription->doctor?->full_name ?? 'Sin médico asignado' }}</dd></div>
                <div><dt>Especialidad</dt><dd>{{ $prescription->doctor?->specialty ?? 'Medicina general' }}</dd></div>
                <div><dt>Fecha</dt><dd>{{ $prescription->issued_at?->format('d/m/Y') ?? 'Sin fecha' }}</dd></div>
                <div><dt>Hospital</dt><dd>{{ $hospitalName }}</dd></div>
                <div><dt>Institución</dt><dd>{{ $institutionName }}</dd></div>
                <div><dt>Farmacia externa</dt><dd>{{ $pharmacyName }}</dd></div>
                <div><dt>Formato</dt><dd>Formato de Receta Médica</dd></div>
                <div><dt>Canje</dt><dd>{{ $prescriptionMeta['redemption'] ?? 'Canje sujeto a validación de Farmacia externa.' }}</dd></div>
              </dl>
              <div class="patient-prescription-lines">
                @forelse ($prescription->items as $item)
                  <div><small>{{ $item->metadata['quantity'] ?? 1 }} {{ ($item->metadata['quantity'] ?? 1) == 1 ? 'pieza' : 'piezas' }}</small><strong>{{ $item->medication_name }}@if($item->dose) | {{ $item->dose }}@endif @if($item->metadata['presentation'] ?? null)| {{ $item->metadata['presentation'] }}@endif</strong>@if($item->frequency || $item->duration || $item->instructions)<p>{{ collect([$item->frequency, $item->duration, $item->instructions])->filter()->implode(' · ') }}</p>@endif</div>
                @empty
                  <div><strong>Sin medicamentos indicados</strong></div>
                @endforelse
              </div>
              <footer class="patient-prescription-paper-footer">
                <div class="patient-prescription-signature"><span></span><strong>{{ $prescription->doctor?->full_name ?? 'Médico tratante' }}</strong><small>Cédula profesional {{ $prescription->doctor?->professional_license ?? 'sin registrar' }}</small></div>
                <div class="patient-prescription-qr" aria-label="Código para canje"><span></span><small>QR para canje</small></div>
              </footer>
            </div>
          </dialog>
        @endforeach
      </section>

      <section class="patient-portal-view" data-patient-view="calendar" aria-label="Calendario">
        @php
          $calendarNow = now();
          $isCalendarScheduled = fn ($item) => (($item->ends_at ?? $item->starts_at)?->gte($calendarNow) ?? true)
            && !in_array($item->status, ['cancelled', 'completed', 'no_show'], true);
          $calendarGroup = function ($item) use ($calendarNow, $isCalendarScheduled) {
            if ($isCalendarScheduled($item)) return 0;
            if ($item->starts_at?->lte($calendarNow)) return 1;
            return 2;
          };
          $calendarAppointments = $patient->appointments->sort(function ($first, $second) use ($calendarGroup) {
            $firstGroup = $calendarGroup($first);
            $secondGroup = $calendarGroup($second);
            if ($firstGroup !== $secondGroup) return $firstGroup <=> $secondGroup;

            $firstTimestamp = $first->starts_at?->timestamp;
            $secondTimestamp = $second->starts_at?->timestamp;
            if ($firstGroup === 0) return ($firstTimestamp ?? PHP_INT_MAX) <=> ($secondTimestamp ?? PHP_INT_MAX);
            if ($firstGroup === 1) return ($secondTimestamp ?? PHP_INT_MIN) <=> ($firstTimestamp ?? PHP_INT_MIN);
            return ($firstTimestamp ?? PHP_INT_MAX) <=> ($secondTimestamp ?? PHP_INT_MAX);
          })->values();
          $calendarStatusLabels = ['confirmed' => 'Confirmada', 'cancelled' => 'Cancelada', 'completed' => 'Atendida', 'no_show' => 'No asistió', 'in_progress' => 'En curso'];
          $consultationHistory = $patient->clinicalRecords->sortByDesc('recorded_at')->values();
        @endphp
        <div class="patient-calendar-shell">
          <nav class="patient-calendar-section-switch" role="tablist" aria-label="Secciones del calendario">
            <button type="button" id="patient-calendar-activities-tab" role="tab" aria-selected="false" aria-controls="patient-calendar-activities-panel" tabindex="-1" data-calendar-section="activities">
              <span>Comunidades</span>
            </button>
            <button type="button" id="patient-calendar-medical-tab" role="tab" aria-selected="true" aria-controls="patient-calendar-medical-panel" data-calendar-section="medical">
              <span>Salud</span>
            </button>
          </nav>
          <section id="patient-calendar-medical-panel" role="tabpanel" aria-labelledby="patient-calendar-medical-tab" data-calendar-section-panel="medical">
          <div class="patient-calendar-periods" role="tablist" aria-label="Filtrar citas">
            <button type="button" role="tab" id="patient-calendar-upcoming-tab" aria-selected="true" aria-controls="patient-calendar-appointments" data-calendar-filter="upcoming">Próximas</button>
            <button type="button" role="tab" id="patient-calendar-past-tab" aria-selected="false" aria-controls="patient-calendar-appointments" tabindex="-1" data-calendar-filter="past">Anteriores</button>
          </div>
          <section id="patient-calendar-appointments" role="tabpanel" aria-labelledby="patient-calendar-upcoming-tab">
          <h1 class="patient-calendar-list-heading">Mis citas</h1>
          <div class="patient-calendar-list">
            @forelse ($calendarAppointments as $appointment)
              @php
                $calendarText = mb_strtolower(collect([$appointment->specialty, $appointment->modality, $appointment->reason])->filter()->implode(' '));
                $calendarType = str_contains($calendarText, 'laborat') || str_contains($calendarText, 'análisis') || str_contains($calendarText, 'muestra') ? 'laboratory' : 'consultation';
                $isUpcoming = $isCalendarScheduled($appointment);
                $appointmentUnit = $appointment->medicalUnit?->name ?? $appointment->location ?? 'Ubicación no registrada';
                $appointmentTitle = $calendarType === 'laboratory' ? 'Laboratorio' : ($appointment->specialty ?: 'Consulta médica');
                $appointmentStatus = $calendarStatusLabels[$appointment->status] ?? $statusText($appointment->status);
                $doctorName = $appointment->doctor?->full_name ?? 'Médico por asignar';
                $doctorInitials = collect(explode(' ', $doctorName))->filter()->take(2)->map(fn ($part) => mb_substr($part, 0, 1))->implode('');
                $doctorPhoto = data_get($appointment->doctor?->metadata, 'photo_url') ?? data_get($appointment->doctor?->metadata, 'avatar_url');
                $isVirtualAppointment = preg_match('/video|virtual|online|en l[ií]nea/i', $appointment->modality ?? '') === 1;
                $appointmentAddress = data_get($appointment->metadata, 'location_address') ?: ($appointment->medicalUnit?->address ?: $appointment->location);
                $appointmentMapQuery = collect([$appointment->medicalUnit?->name, $appointmentAddress, $appointment->medicalUnit?->city])->filter()->unique()->implode(', ');
              @endphp
              <article class="patient-calendar-card" data-calendar-item data-calendar-type="{{ $calendarType }}" data-calendar-upcoming="{{ $isUpcoming ? '1' : '0' }}" @if (!$isUpcoming) hidden @endif>
                <header class="patient-calendar-card-top">
                  <span class="patient-calendar-kind"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3v2M11 3v2M3 4h10v6a5 5 0 0 1-10 0V4Zm5 11v2a4 4 0 0 0 8 0v-3"/><circle cx="16" cy="11" r="3"/></svg>{{ $calendarType === 'laboratory' ? 'Estudio médico' : 'Cita médica' }}</span>
                  <span class="patient-calendar-status {{ $isUpcoming ? '' : 'is-past' }}">{{ $appointmentStatus }}</span>
                </header>
                <h2 class="patient-calendar-appointment-title">{{ $appointmentTitle }}</h2>
                <div class="patient-calendar-professional">
                  <span class="patient-calendar-avatar">
                    @if ($doctorPhoto)
                      <img src="{{ $doctorPhoto }}" alt="" loading="lazy">
                    @else
                      {{ $doctorInitials }}
                    @endif
                  </span>
                  <div><strong>{{ $doctorName }}</strong><small>{{ $appointment->specialty ?: 'Especialidad por confirmar' }}</small></div>
                </div>
                <ul class="patient-calendar-details">
                  <li><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg><span>{{ $appointment->starts_at?->copy()->locale('es')->translatedFormat('d M Y') ?? 'Fecha por confirmar' }} · {{ $appointment->starts_at?->format('H:i') ?? 'Hora por confirmar' }}@if ($appointment->ends_at)–{{ $appointment->ends_at->format('H:i') }}@endif</span></li>
                  <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span>{{ $appointment->modality ?: 'Modalidad por confirmar' }}@if (data_get($appointment->metadata, 'consulting_room')) · {{ data_get($appointment->metadata, 'consulting_room') }}@endif</span></li>
                  <li><x-klini-icon name="hospital"/><span>{{ $appointmentUnit }}@if ($appointment->medicalUnit?->city) · {{ $appointment->medicalUnit->city }}@endif</span></li>
                  <li><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2Z"/></svg><span>Paciente: {{ $patient->full_name }}</span></li>
                </ul>
                <div class="patient-calendar-reservation-actions">
                  <button type="button" data-calendar-detail-open="patient-calendar-detail-{{ $appointment->id }}" aria-label="Ver cita: {{ $appointmentTitle }}">Ver cita</button>
                  @if (!$isVirtualAppointment && $appointmentMapQuery)
                    <a href="https://www.google.com/maps/dir/?api=1&amp;destination={{ rawurlencode($appointmentMapQuery) }}" target="_blank" rel="noopener noreferrer">Cómo llegar</a>
                  @endif
                  </div>
              </article>
              <dialog class="patient-calendar-dialog" id="patient-calendar-detail-{{ $appointment->id }}">
                <header><div><small>DETALLE DE CITA</small><h2>{{ $appointmentTitle }}</h2></div><button type="button" data-calendar-detail-close aria-label="Cerrar">×</button></header>
                <dl>
                  <div><dt>Fecha y hora</dt><dd>{{ $appointment->starts_at?->format('d/m/Y H:i') ?? 'No registrada' }}</dd></div>
                  <div><dt>Estatus</dt><dd>{{ $appointmentStatus }}</dd></div>
                  <div><dt>Médico</dt><dd>{{ $appointment->doctor?->full_name ?? 'No registrado' }}</dd></div>
                  <div><dt>Especialidad</dt><dd>{{ $appointment->specialty ?: 'No registrada' }}</dd></div>
                  <div><dt>Modalidad</dt><dd>{{ $appointment->modality ?: 'No registrada' }}</dd></div>
                  <div><dt>Ubicación</dt><dd>{{ $appointmentUnit }}</dd></div>
                  <div class="is-wide"><dt>Motivo</dt><dd>{{ $appointment->reason ?: 'No registrado' }}</dd></div>
                </dl>
              </dialog>
            @empty
              <div class="patient-calendar-empty" data-calendar-empty>
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
                <span>No hay citas o estudios programados.</span>
              </div>
            @endforelse
            <div class="patient-calendar-empty" data-calendar-filter-empty hidden>
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
              <span data-calendar-empty-label>No tienes próximas citas.</span>
            </div>
          </div>
          <p class="patient-calendar-timezone">ⓘ Las citas y estudios se muestran en la zona horaria de tu ubicación actual.</p>
          </section>
          </section>
          <section class="patient-portal-communities-view patient-calendar-activities" id="patient-calendar-activities-panel" role="tabpanel" aria-labelledby="patient-calendar-activities-tab" data-calendar-section-panel="activities" hidden></section>
        </div>
        <section class="patient-calendar-history" hidden>
          <header><h2>Historial de consultas</h2><p>Consultas anteriores del paciente</p></header>
          <div class="patient-calendar-history-scroll">
            <table>
              <thead><tr><th>Fecha</th><th>Médico tratante</th><th>Especialidad</th><th>Tipo de consulta</th><th>Motivo</th><th>Diagnóstico</th><th>Medicamento, dosis y cantidad</th><th>Unidad</th><th>Estatus</th></tr></thead>
              <tbody>
                @forelse ($consultationHistory as $record)
                  @php
                    $recordPayload = $record->payload ?? [];
                    $recordMedication = $recordPayload['medications'] ?? $recordPayload['medication'] ?? null;
                    if (is_array($recordMedication)) {
                      $recordMedication = collect($recordMedication)->map(fn ($item) => is_array($item) ? collect($item)->filter()->implode(' · ') : $item)->filter()->implode('; ');
                    }
                  @endphp
                  <tr>
                    <td>{{ $record->recorded_at?->format('d/m/Y') ?? 'No registrada' }}</td><td>{{ $record->doctor?->full_name ?? 'No registrado' }}</td>
                    <td>{{ $recordPayload['specialty'] ?? $recordPayload['service'] ?? 'No registrada' }}</td><td>{{ $recordPayload['consultation_type'] ?? $record->title ?? ucfirst(str_replace('_', ' ', $record->record_type)) }}</td>
                    <td>{{ $recordPayload['reason'] ?? $record->summary ?? 'No registrado' }}</td><td>{{ $recordPayload['diagnosis'] ?? 'No registrado' }}</td>
                    <td>{{ $recordMedication ?: 'Sin receta generada' }}</td><td>{{ $recordPayload['unit'] ?? $recordPayload['location'] ?? 'No registrada' }}</td>
                    <td><span class="patient-calendar-history-status">Atendida</span></td>
                  </tr>
                @empty
                  <tr><td colspan="9" class="patient-portal-empty">No hay consultas anteriores registradas.</td></tr>
                @endforelse
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section class="patient-portal-view patient-doctors-view" data-patient-view="doctors">
        @php
          $doctorCountryOptions = collect([
            ['name' => 'México', 'flag' => '🇲🇽'],
            ['name' => 'Estados Unidos', 'flag' => '🇺🇸'],
            ['name' => 'Colombia', 'flag' => '🇨🇴'],
            ['name' => 'España', 'flag' => '🇪🇸'],
            ['name' => 'Chile', 'flag' => '🇨🇱'],
            ['name' => 'Argentina', 'flag' => '🇦🇷'],
            ['name' => 'Perú', 'flag' => '🇵🇪'],
          ]);
          $doctorInsuranceOptions = collect([
            ['name' => 'Allianz', 'mark' => 'AZ'],
            ['name' => 'AXA', 'mark' => 'AXA'],
            ['name' => 'Bupa', 'mark' => 'B'],
            ['name' => 'GNP', 'mark' => 'GNP'],
            ['name' => 'MetLife', 'mark' => 'M'],
            ['name' => 'Seguros Monterrey', 'mark' => 'SM'],
          ]);
          $doctorLocationOptions = $doctors->map(function ($doctor) {
            $country = data_get($doctor->medicalUnit?->metadata, 'country')
              ?? data_get($doctor->medicalUnit?->metadata, 'country_name')
              ?? data_get($doctor->medicalUnit?->metadata, 'pais')
              ?? 'México';
            $city = $doctor->medicalUnit?->city ?? $doctor->medicalUnit?->municipality ?? $doctor->medicalUnit?->state;
            return ['country' => $country, 'city' => $city];
          })->filter(fn ($location) => filled($location['city']))
            ->unique(fn ($location) => mb_strtolower($location['country'].'|'.$location['city']))
            ->sortBy('city')->values();
          $doctorSpecialties = $doctors->map(fn ($doctor) => $doctor->specialty ?: 'Medicina general')->unique()->sort()->values();
        @endphp
        <div class="patient-doctors-shell">
          <header class="patient-doctors-hero">
            <span class="patient-doctors-hero-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M6 3v5a4 4 0 0 0 8 0V3"></path><path d="M4 3h4M12 3h4"></path><path d="M10 12v2a5 5 0 0 0 10 0v-1"></path><circle cx="20" cy="10" r="2"></circle></svg>
            </span>
            <div><h1>Médicos y terapeutas</h1></div>
          </header>

          <section class="patient-doctors-locator" aria-labelledby="patient-doctors-location-title" data-doctor-search-form>
            <header>
              <span class="patient-doctors-location-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>
              </span>
              <div><h2 id="patient-doctors-location-title">Selecciona país y ciudad</h2></div>
            </header>

            <div class="patient-doctors-fields">
              <div class="patient-doctors-field-group">
                <label for="patient-doctor-country">País</label>
                <div class="patient-doctors-select">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
                  <select id="patient-doctor-country" data-doctor-country-filter>
                    <option value="">Escribe o selecciona país</option>
                    @foreach ($doctorCountryOptions as $country)
                      <option value="{{ $country['name'] }}">{{ $country['name'] }}</option>
                    @endforeach
                  </select>
                  <span aria-hidden="true">⌄</span>
                </div>
                <div class="patient-doctors-country-shortcuts" aria-label="Países frecuentes">
                  @foreach ($doctorCountryOptions->take(4) as $country)
                    <button type="button" data-doctor-country-shortcut="{{ $country['name'] }}" aria-pressed="false"><span>{{ $country['flag'] }}</span>{{ $country['name'] }}</button>
                  @endforeach
                  <span id="patient-doctors-more-countries" data-doctor-extra-countries hidden>
                    @foreach ($doctorCountryOptions->skip(4) as $country)
                      <button type="button" data-doctor-country-shortcut="{{ $country['name'] }}" aria-pressed="false"><span>{{ $country['flag'] }}</span>{{ $country['name'] }}</button>
                    @endforeach
                  </span>
                  <button class="patient-doctors-more" type="button" data-doctor-more-countries aria-expanded="false" aria-controls="patient-doctors-more-countries">Ver más <span aria-hidden="true">⌄</span></button>
                </div>
              </div>

              <div class="patient-doctors-field-group">
                <label for="patient-doctor-city">Ciudad <small>Primero selecciona un país para ver las ciudades disponibles.</small></label>
                <div class="patient-doctors-select">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
                  <select id="patient-doctor-city" data-doctor-city-filter disabled>
                    <option value="" data-doctor-city-placeholder>Primero selecciona país</option>
                    @foreach ($doctorLocationOptions as $location)
                      <option value="{{ $location['city'] }}" data-country="{{ $location['country'] }}">{{ $location['city'] }}</option>
                    @endforeach
                  </select>
                  <span aria-hidden="true">⌄</span>
                </div>
              </div>

              <div class="patient-doctors-field-group">
                <label for="patient-doctor-specialty">Especialidad <em>Opcional</em></label>
                <div class="patient-doctors-select">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
                  <select id="patient-doctor-specialty" data-doctor-specialty-filter>
                    <option value="">Escribe o selecciona especialidad</option>
                    @foreach ($doctorSpecialties as $specialty)
                      <option value="{{ $specialty }}">{{ $specialty }}</option>
                    @endforeach
                  </select>
                  <span aria-hidden="true">⌄</span>
                </div>
              </div>

              <div class="patient-doctors-field-group">
                <label for="patient-doctor-insurer">Aseguradora <em>Opcional</em></label>
                <div class="patient-doctors-select">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
                  <select id="patient-doctor-insurer" data-doctor-insurer-filter>
                    <option value="">Escribe o selecciona aseguradora</option>
                    @foreach ($doctorInsuranceOptions as $insurer)
                      <option value="{{ $insurer['name'] }}">{{ $insurer['name'] }}</option>
                    @endforeach
                  </select>
                  <span aria-hidden="true">⌄</span>
                </div>
                <div class="patient-doctors-country-shortcuts patient-doctors-insurer-shortcuts" aria-label="Aseguradoras frecuentes">
                  @foreach ($doctorInsuranceOptions->take(4) as $insurer)
                    <button type="button" data-doctor-insurer-shortcut="{{ $insurer['name'] }}" aria-pressed="false"><span>{{ $insurer['mark'] }}</span>{{ $insurer['name'] }}</button>
                  @endforeach
                  <span id="patient-doctors-more-insurers" data-doctor-extra-insurers hidden>
                    @foreach ($doctorInsuranceOptions->skip(4) as $insurer)
                      <button type="button" data-doctor-insurer-shortcut="{{ $insurer['name'] }}" aria-pressed="false"><span>{{ $insurer['mark'] }}</span>{{ $insurer['name'] }}</button>
                    @endforeach
                  </span>
                  <button class="patient-doctors-more" type="button" data-doctor-more-insurers aria-expanded="false" aria-controls="patient-doctors-more-insurers">Ver m&aacute;s <span aria-hidden="true">⌄</span></button>
                </div>
              </div>

              <div class="patient-doctors-field-group">
                <label for="patient-doctor-name">Nombre del m&eacute;dico</label>
                <div class="patient-doctors-name-search">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
                  <input id="patient-doctor-name" type="search" placeholder="Escribe el nombre del m&eacute;dico" autocomplete="off" data-doctor-name-filter>
                </div>
              </div>

              <button class="patient-doctors-search-action" type="button" data-doctor-search-action aria-controls="doctor-grid">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
                <span>Buscar</span>
              </button>
            </div>
          </section>

          <section class="patient-doctors-search-summary" data-doctor-search-summary hidden aria-live="polite">
            <small>BÚSQUEDA</small>
            <strong data-doctor-search-location>Todas las ubicaciones</strong>
            <p data-doctor-search-details>Todos los profesionales</p>
            <button type="button" data-doctor-edit-search>Editar búsqueda</button>
          </section>

          <section class="patient-doctors-results" aria-labelledby="patient-doctors-results-title" data-doctor-results-section hidden>
            <header>
              <h2 id="patient-doctors-results-title">Resultados (<span data-doctor-count>{{ $doctors->count() }}</span>)</h2>
              <button type="button" data-doctor-edit-search>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10"></path><path d="M18 7h2"></path><circle cx="16" cy="7" r="2"></circle><path d="M4 17h2"></path><path d="M10 17h10"></path><circle cx="8" cy="17" r="2"></circle></svg>
                <span>Filtrar</span>
              </button>
            </header>
            <div class="patient-doctors-grid" id="doctor-grid" data-doctor-results>
              @forelse ($doctors as $doctor)
                @php
                  $doctorCountry = data_get($doctor->medicalUnit?->metadata, 'country')
                    ?? data_get($doctor->medicalUnit?->metadata, 'country_name')
                    ?? data_get($doctor->medicalUnit?->metadata, 'pais')
                    ?? 'México';
                  $doctorCity = $doctor->medicalUnit?->city ?? $doctor->medicalUnit?->municipality ?? $doctor->medicalUnit?->state ?? '';
                  $doctorSpecialty = $doctor->specialty ?: 'Medicina general';
                  $doctorInsurerMetadata = data_get($doctor->metadata, 'accepted_insurers')
                    ?? data_get($doctor->metadata, 'insurance_carriers')
                    ?? data_get($doctor->metadata, 'insurers')
                    ?? [];
                  $doctorInsurers = collect(is_array($doctorInsurerMetadata) ? $doctorInsurerMetadata : [$doctorInsurerMetadata])
                    ->filter(fn ($insurer) => is_string($insurer) && filled($insurer))
                    ->values();
                  $doctorInitials = collect(explode(' ', $doctor->full_name))->filter()->take(2)->map(fn ($part) => mb_substr($part, 0, 1))->implode('');
                  $doctorPhoto = data_get($doctor->metadata, 'photo_url') ?? data_get($doctor->metadata, 'avatar_url');
                  $doctorRating = data_get($doctor->metadata, 'rating');
                  $doctorReviews = data_get($doctor->metadata, 'reviews_count');
                  $doctorAvailability = data_get($doctor->metadata, 'availability_label') ?? data_get($doctor->metadata, 'availability');
                  $doctorAvailability = is_string($doctorAvailability) && filled($doctorAvailability)
                    ? $doctorAvailability
                    : 'Disponible para consulta';
                @endphp
                <article data-doctor-card data-doctor-name="{{ $doctor->full_name }}" data-doctor-country="{{ $doctorCountry }}" data-doctor-city="{{ $doctorCity }}" data-doctor-specialty="{{ $doctorSpecialty }}" data-doctor-insurers="{{ $doctorInsurers->implode('|') }}">
                  <button class="patient-doctor-result-card" type="button" data-doctor-select="{{ $doctor->id }}" aria-label="Seleccionar a {{ $doctor->full_name }}" aria-pressed="false">
                    <span class="patient-doctors-avatar">
                      @if (is_string($doctorPhoto) && filled($doctorPhoto))
                        <img src="{{ $doctorPhoto }}" alt="">
                      @else
                        {{ $doctorInitials }}
                      @endif
                    </span>
                    <span class="patient-doctor-result-copy">
                      <span class="patient-doctor-result-name">{{ $doctor->full_name }}</span>
                      <span class="patient-doctor-result-specialty">{{ $doctorSpecialty }}</span>
                      @if (is_numeric($doctorRating))
                        <span class="patient-doctor-rating">★ {{ number_format((float) $doctorRating, 1) }}@if (is_numeric($doctorReviews)) ({{ (int) $doctorReviews }})@endif</span>
                      @endif
                      <span class="patient-doctor-result-service">{{ $doctor->subspecialty ?? $doctor->service_name ?? 'Atención médica' }}</span>
                      <span class="patient-doctor-result-unit">{{ $doctor->medicalUnit?->name ?? 'Consulta privada' }}{{ $doctorCity ? ' · '.$doctorCity : '' }}</span>
                      <span class="patient-doctor-result-availability">{{ $doctorAvailability }}</span>
                    </span>
                    <svg class="patient-doctor-result-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>
                  </button>
                </article>
              @empty
                <div class="patient-doctors-empty">No hay médicos activos.</div>
              @endforelse
              @if ($doctors->isNotEmpty())
                <div class="patient-doctors-empty" data-doctor-filter-empty hidden>No encontramos profesionales con estos filtros.</div>
              @endif
            </div>
          </section>

          <script type="application/json" data-doctor-booking-data>{!! json_encode($doctorBookingOptions, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) !!}</script>
          <script type="application/json" data-doctor-booking-confirmation>{!! json_encode($bookingConfirmation, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) !!}</script>

          <div class="patient-doctor-booking" data-doctor-booking data-booking-old-doctor="{{ old('doctor_id') }}" data-booking-old-start="{{ old('starts_at') }}" data-booking-old-reason="{{ old('reason_type') }}" data-booking-old-notes="{{ old('reason_notes') }}" hidden>
            @if ($errors->hasAny(['doctor_id', 'starts_at', 'reason_type', 'reason_notes']))
              <div class="patient-doctor-booking-error" role="alert" data-booking-error>{{ $errors->first() }}</div>
            @endif

            <section class="patient-doctor-booking-step patient-doctor-profile-step" data-doctor-booking-step="profile" hidden>
              <header class="patient-doctor-booking-heading is-profile">
                <button type="button" data-booking-back="results" aria-label="Volver a resultados">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                </button>
              </header>
              <div class="patient-doctor-profile-identity">
                <span class="patient-doctor-profile-avatar" data-booking-profile-avatar><span data-booking-profile-initials></span><img data-booking-profile-photo alt="" hidden></span>
                <h2 data-booking-doctor-name>Médico</h2>
                <p><span data-booking-doctor-specialty>Especialidad</span><i aria-hidden="true">•</i><span data-booking-doctor-license>Cédula por confirmar</span></p>
              </div>
              <div class="patient-doctor-profile-stats">
                <span data-booking-rating hidden>★ <b></b></span>
                <span data-booking-experience hidden><b></b> años de experiencia</span>
              </div>
              <section class="patient-doctor-profile-section">
                <h3>Acerca de mí</h3>
                <p data-booking-doctor-bio></p>
              </section>
              <section class="patient-doctor-profile-section patient-doctor-profile-location">
                <div><h3>Ubicación</h3><strong data-booking-doctor-unit></strong><p data-booking-doctor-address></p></div>
                <span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg></span>
              </section>
              <section class="patient-doctor-profile-section">
                <h3>Disponibilidad</h3>
                <p>Consulta los próximos horarios disponibles para agendar tu cita.</p>
                <div class="patient-doctor-availability-preview" data-booking-profile-dates></div>
              </section>
              <button class="patient-doctor-booking-primary" type="button" data-booking-next="schedule">Ver horarios disponibles</button>
            </section>

            <section class="patient-doctor-booking-step" data-doctor-booking-step="schedule" hidden>
              <header class="patient-doctor-booking-heading">
                <button type="button" data-booking-back="profile" aria-label="Volver al perfil">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                </button>
                <h2>Selecciona fecha y hora</h2>
              </header>
              <section class="patient-doctor-date-picker">
                <h3 data-booking-month>Próximas fechas</h3>
                <div class="patient-doctor-date-carousel" data-booking-date-options aria-label="Fechas disponibles"></div>
              </section>
              <section class="patient-doctor-time-picker">
                <p>Horas disponibles para <strong data-booking-selected-date-label>la fecha seleccionada</strong></p>
                <div class="patient-doctor-time-options" data-booking-time-options></div>
                <div class="patient-doctor-booking-empty" data-booking-no-slots hidden>No hay horarios disponibles para esta fecha.</div>
              </section>
              <button class="patient-doctor-booking-primary" type="button" data-booking-next="reason" disabled>Continuar</button>
            </section>

            <section class="patient-doctor-booking-step" data-doctor-booking-step="reason" hidden>
              <header class="patient-doctor-booking-heading">
                <button type="button" data-booking-back="schedule" aria-label="Volver a fecha y hora">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                </button>
                <h2>Motivo de consulta</h2>
              </header>
              <fieldset class="patient-doctor-reason-options">
                <legend>Selecciona el motivo de tu consulta</legend>
                @foreach (['Chequeo general', 'Hipertensión arterial', 'Diabetes', 'Colesterol alto', 'Enfermedades respiratorias', 'Dolor de cabeza / Migraña', 'Otro motivo'] as $bookingReason)
                  <label><input type="radio" name="booking_reason_preview" value="{{ $bookingReason }}" data-booking-reason><span></span>{{ $bookingReason }}</label>
                @endforeach
              </fieldset>
              <label class="patient-doctor-reason-notes">Describe brevemente tu motivo <small>(opcional)</small>
                <textarea maxlength="200" placeholder="Cuéntanos más sobre tu consulta..." data-booking-notes></textarea>
                <span><b data-booking-notes-count>0</b>/200</span>
              </label>
              <button class="patient-doctor-booking-primary" type="button" data-booking-next="summary" disabled>Continuar</button>
            </section>

            <section class="patient-doctor-booking-step" data-doctor-booking-step="summary" hidden>
              <header class="patient-doctor-booking-heading">
                <button type="button" data-booking-back="reason" aria-label="Volver al motivo">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                </button>
                <h2>Resumen de tu cita</h2>
              </header>
              <div class="patient-doctor-summary-list">
                <section><h3>Profesional</h3><div class="patient-doctor-summary-professional"><span data-booking-summary-initials></span><div><strong data-booking-summary-doctor></strong><small data-booking-summary-specialty></small><small data-booking-summary-license></small></div></div></section>
                <section><h3>Fecha y hora</h3><div class="patient-doctor-summary-row"><span aria-hidden="true">▣</span><strong data-booking-summary-date></strong></div></section>
                <section><h3>Ubicación</h3><div class="patient-doctor-summary-row"><span aria-hidden="true">⌖</span><div><strong data-booking-summary-unit></strong><small data-booking-summary-address></small></div></div></section>
                <section><h3>Motivo de consulta</h3><div class="patient-doctor-summary-value" data-booking-summary-reason></div></section>
                <section class="is-duration"><div class="patient-doctor-summary-row"><span aria-hidden="true">✓</span><div><strong>Duración aproximada</strong><small>30 minutos</small></div></div></section>
              </div>
              <form method="post" action="{{ route('patient.appointments.store') }}" data-booking-form>
                @csrf
                <input type="hidden" name="doctor_id" data-booking-form-doctor>
                <input type="hidden" name="starts_at" data-booking-form-start>
                <input type="hidden" name="reason_type" data-booking-form-reason>
                <input type="hidden" name="reason_notes" data-booking-form-notes>
                <button class="patient-doctor-booking-primary" type="submit">Confirmar cita</button>
              </form>
            </section>

            <section class="patient-doctor-booking-step patient-doctor-booking-success" data-doctor-booking-step="success" hidden>
              <span class="patient-doctor-success-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg></span>
              <h2>¡Cita agendada con éxito!</h2>
              <p>Los detalles de tu cita ya están disponibles en tu calendario.</p>
              <section class="patient-doctor-success-card">
                <div class="patient-doctor-success-professional"><span data-booking-success-initials></span><div><strong data-booking-success-doctor></strong><small data-booking-success-specialty></small></div></div>
                <div><span aria-hidden="true">▣</span><p><strong data-booking-success-date></strong><b data-booking-success-time></b></p></div>
                <div><span aria-hidden="true">⌖</span><p><strong data-booking-success-unit></strong><small data-booking-success-location></small></p></div>
                <div><span aria-hidden="true">▤</span><p data-booking-success-reason></p></div>
              </section>
              <button class="patient-doctor-booking-secondary" type="button" data-booking-open-calendar>Ver mis citas</button>
              <button class="patient-doctor-booking-primary" type="button" data-booking-download-calendar>Agregar al calendario</button>
            </section>
          </div>
        </div>
      </section>

      <section class="patient-portal-view" data-patient-view="wellness" aria-label="Mi Salud">
        <article class="patient-health-panel">
          <nav class="patient-health-view-switch" data-health-view-switch data-active-view="parameters" role="tablist" aria-label="Secciones de Mi Salud">
            <button class="is-active" id="patient-health-tab-parameters" type="button" data-health-view-mode="parameters" role="tab" aria-selected="true" aria-controls="patient-health-panel-parameters">Par&aacute;metros</button>
            <button id="patient-health-tab-history" type="button" data-health-view-mode="history" role="tab" aria-selected="false" aria-controls="patient-health-panel-history" tabindex="-1">Historial cl&iacute;nico</button>
          </nav>

          <div class="patient-health-view-stage" data-health-view-stage>
            <section class="patient-health-dashboard is-active" id="patient-health-panel-parameters" data-health-dashboard data-health-view-panel="parameters" role="tabpanel" aria-labelledby="patient-health-tab-parameters">
            <div class="patient-health-parameter-head">
              <div class="patient-health-parameter-switch" data-health-metric-switch role="tablist" aria-label="Tipo de parametros">
                <button class="is-active" type="button" data-health-metric-view="favorites" role="tab" aria-selected="true"><span>&#9733;</span>Favoritos</button>
                <button type="button" data-health-metric-view="all" role="tab" aria-selected="false">Todos</button>
              </div>
            </div>

            <div class="patient-health-parameter-stage" data-health-metric-stage>
              <div class="patient-health-parameter-block is-active" data-health-metric-section="favorites">
                <div class="patient-health-parameter-carousel" data-health-favorites data-health-carousel aria-label="Parametros favoritos"></div>
              </div>
              <div class="patient-health-parameter-block" data-health-metric-section="all" aria-hidden="true">
                <div class="patient-health-parameter-carousel" data-health-options data-health-carousel aria-label="Todos los parametros"></div>
              </div>
            </div>

            <article class="patient-health-detail-card" data-health-detail>
              <header class="patient-health-detail-header">
                <span class="patient-health-detail-icon" data-health-detail-icon aria-hidden="true"></span>
                <div>
                  <small>Detalle del par&aacute;metro</small>
                  <h2 data-health-detail-title>Agua</h2>
                </div>
              </header>

              <div class="patient-health-stat-grid" data-health-stat-grid></div>

              <div class="patient-health-range-tabs" data-health-range-tabs role="tablist" aria-label="Rango historico">
                <button type="button" data-health-range="day" role="tab" aria-selected="false">D&iacute;a</button>
                <button type="button" data-health-range="week" role="tab" aria-selected="false">Semana</button>
                <button class="is-active" type="button" data-health-range="month" role="tab" aria-selected="true">Mes</button>
                <button type="button" data-health-range="year" role="tab" aria-selected="false">A&ntilde;o</button>
                <button type="button" data-health-range="custom" role="tab" aria-selected="false">Personalizado</button>
              </div>

              <div class="patient-health-date-range">
                <label><span>De:</span><input type="date" data-health-date-from value="2026-08-01"></label>
                <label><span>A:</span><input type="date" data-health-date-to value="2026-08-31"></label>
              </div>

              <section class="patient-health-chart-card">
                <div class="patient-health-chart-meta">
                  <span data-health-chart-unit>Litros (L)</span>
                  <strong data-health-chart-goal>Meta 2.5 L</strong>
                </div>
                <div class="patient-health-chart" data-health-chart aria-label="Historico del parametro"></div>
              </section>

              <div class="patient-health-detail-grid">
                <section class="patient-health-history-card">
                  <h3>Hist&oacute;rico reciente</h3>
                  <div data-health-history-list></div>
                </section>
                <section class="patient-health-insights-card">
                  <h3>Insights</h3>
                  <div data-health-insights></div>
                </section>
              </div>
            </article>
            </section>

            <section class="patient-health-clinical-history" id="patient-health-panel-history" data-health-view-panel="history" role="tabpanel" aria-labelledby="patient-health-tab-history" aria-hidden="true" inert>
              @include('patient.partials.clinical-history', compact('historyItems', 'historyCategoryLabels'))
            </section>
          </div>

          <nav class="patient-health-filters" data-health-filter-carousel aria-label="Filtros de salud">
            <button class="is-active" type="button" data-health-filter="all" aria-pressed="true"><span>☰</span>Todos</button>
            <button class="is-activity" type="button" data-health-filter="activity" aria-pressed="false"><span>⌁</span>Actividad</button>
            <button class="is-nutrition" type="button" data-health-filter="nutrition" aria-pressed="false"><span>●</span>Nutrición</button>
            <button class="is-sleep" type="button" data-health-filter="sleep" aria-pressed="false"><span>◔</span>Sueño</button>
            <button class="is-vitals" type="button" data-health-filter="vitals" aria-pressed="false"><span>▱</span>Signos vitales</button>
            <button class="is-wellness" type="button" data-health-filter="wellness" aria-pressed="false"><span>☺</span>Bienestar</button>
            <button class="is-biomarkers" type="button" data-health-filter="biomarkers" aria-pressed="false"><span>♢</span>Biomarcadores</button>
          </nav>

          <section class="patient-health-metrics" aria-label="Resumen de salud">
            <article class="patient-health-metric is-green">
              <span class="patient-health-metric-icon"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.1-9-9.5C1.3 5.9 4.1 3 7.4 3c2 0 3.4 1 4.6 2.7C13.2 4 14.6 3 16.6 3 19.9 3 22.7 5.9 21 10.5 19 15.9 12 20 12 20Z"></path></svg></span>
              <strong>87</strong>
              <small>Puntaje de salud</small>
              <em>Bueno</em>
              <svg class="patient-health-sparkline" viewBox="0 0 180 44"><polyline points="0,31 14,30 28,27 42,31 56,28 70,29 84,22 98,30 112,25 126,27 140,18 154,24 168,20 180,22"></polyline></svg>
            </article>
            <article class="patient-health-metric is-blue">
              <span class="patient-health-metric-icon"><svg viewBox="0 0 24 24"><path d="M12 3s6 6.7 6 11a6 6 0 0 1-12 0c0-4.3 6-11 6-11Z"></path></svg></span>
              <strong>1.6 L</strong>
              <small>Agua hoy</small>
              <em>64% de meta</em>
              <svg class="patient-health-sparkline" viewBox="0 0 180 44"><polyline points="0,32 14,30 28,29 42,27 56,32 70,29 84,24 98,33 112,28 126,26 140,18 154,24 168,20 180,25"></polyline></svg>
            </article>
            <article class="patient-health-metric is-orange">
              <span class="patient-health-metric-icon"><svg viewBox="0 0 24 24"><path d="M8 4c1 0 2 .8 2 2v3l2 1 2-2 3 3-2 2 1 2h3c1.2 0 2 .9 2 2v3h-5l-3-3-3 3H6v-5l3-3-3-3V4h2Z"></path></svg></span>
              <strong>6,240</strong>
              <small>Pasos</small>
              <em>78% de meta</em>
              <svg class="patient-health-sparkline" viewBox="0 0 180 44"><polyline points="0,31 14,29 28,34 42,25 56,31 70,24 84,27 98,33 112,25 126,23 140,28 154,18 168,22 180,24"></polyline></svg>
            </article>
            <article class="patient-health-metric is-purple">
              <span class="patient-health-metric-icon"><svg viewBox="0 0 24 24"><path d="M18.5 15.5A8 8 0 0 1 8.5 5.5 7 7 0 1 0 18.5 15.5Z"></path><path d="M17 3v4M15 5h4"></path></svg></span>
              <strong>7h 20m</strong>
              <small>Sueño</small>
              <em>Bueno</em>
              <svg class="patient-health-sparkline" viewBox="0 0 180 44"><polyline points="0,32 14,31 28,29 42,30 56,27 70,32 84,30 98,23 112,31 126,26 140,25 154,18 168,23 180,24"></polyline></svg>
            </article>
          </section>

          <section class="patient-health-section patient-health-indicators">
            <header><h2>Indicadores clave</h2><button class="patient-health-view-all" type="button" data-health-open="indicators" aria-haspopup="dialog">Ver todos <b>›</b></button></header>
            <div class="patient-health-ring-grid">
              <article class="patient-health-ring is-green" style="--value:72"><span><strong>72%</strong></span><h3>Actividad física</h3><p>Meta semanal</p></article>
              <article class="patient-health-ring is-blue" style="--value:64"><span><strong>64%</strong></span><h3>Hidratación</h3><p>Meta diaria</p></article>
              <article class="patient-health-ring is-orange" style="--value:58"><span><strong>58%</strong></span><h3>Alimentación</h3><p>Meta diaria</p></article>
              <article class="patient-health-ring is-purple" style="--value:80"><span><strong>80%</strong></span><h3>Sueño</h3><p>Meta diaria</p></article>
            </div>
          </section>

          <section class="patient-health-section patient-health-plan">
            <header><h2>Tu plan de hoy</h2><button class="patient-health-view-all" type="button" data-health-open="plan" aria-haspopup="dialog">Ver plan completo <b>›</b></button></header>
            <div class="patient-health-plan-list">
              <article class="is-green"><span>▱</span><div><strong>Beber 2.5 L de agua</strong><small>1.6 L / 2.5 L</small><i style="--progress:64%"></i></div><b>›</b></article>
              <article class="is-orange"><span>⌁</span><div><strong>Caminar 8,000 pasos</strong><small>6,240 / 8,000 pasos</small><i style="--progress:78%"></i></div><b>›</b></article>
              <article class="is-purple"><span>◔</span><div><strong>Dormir al menos 7.5 horas</strong><small>7h 20m / 7.5h</small><i style="--progress:88%"></i></div><b>›</b></article>
            </div>
          </section>

          <section class="patient-health-section patient-health-recent">
            <header><h2>Datos recientes</h2><button class="patient-health-view-all" type="button" data-health-open="recent" aria-haspopup="dialog">Ver todos <b>›</b></button></header>
            <div class="patient-health-recent-grid">
              <article class="is-green"><span>▣</span><strong>72.4 kg</strong><small>Peso</small><em>Hoy</em><svg class="patient-health-sparkline" viewBox="0 0 150 34"><polyline points="0,24 15,22 30,26 45,18 60,23 75,16 90,25 105,18 120,20 135,16 150,18"></polyline></svg></article>
              <article class="is-blue"><span>♡</span><strong>115/75</strong><small>Presión arterial</small><em>Ayer</em><svg class="patient-health-sparkline" viewBox="0 0 150 34"><polyline points="0,25 15,23 30,27 45,24 60,14 75,25 90,20 105,13 120,26 135,21 150,22"></polyline></svg></article>
              <article class="is-orange"><span>♢</span><strong>92 <small>mg/dL</small></strong><small>Glucosa</small><em>Ayer</em><svg class="patient-health-sparkline" viewBox="0 0 150 34"><polyline points="0,25 15,18 30,27 45,23 60,16 75,25 90,20 105,18 120,24 135,21 150,19"></polyline></svg></article>
              <article class="is-purple"><span>♙</span><strong>Óptimos</strong><small>Biomarcadores</small><em>12/05/2026</em><svg class="patient-health-sparkline" viewBox="0 0 150 34"><polyline points="0,22 15,24 30,27 45,18 60,23 75,17 90,13 105,23 120,18 135,20 150,19"></polyline></svg></article>
            </div>
          </section>

          <div class="patient-health-mobile-screen-layer" data-health-screen-layer aria-hidden="true" hidden>
            <section class="patient-health-mobile-screen" data-health-screen="indicators" role="dialog" aria-modal="true" aria-labelledby="patient-health-screen-indicators-title" hidden>
              <header class="patient-health-screen-header">
                <button type="button" data-health-screen-close aria-label="Volver a Mi Salud">&larr;</button>
                <h2 id="patient-health-screen-indicators-title">Indicadores clave</h2>
              </header>
              <p class="patient-health-screen-lead">Tu progreso general hacia una vida m&aacute;s saludable.</p>
              <div class="patient-health-screen-list">
                <article class="patient-health-mobile-card patient-health-indicator-detail is-green" style="--value:72">
                  <span class="patient-health-screen-ring"><strong>72%</strong></span>
                  <div><h3>Actividad f&iacute;sica</h3><p>Meta semanal</p><small>&iexcl;Vas por buen camino! Sigue as&iacute;, tu cuerpo te lo agradece.</small></div>
                  <b>&rsaquo;</b>
                </article>
                <article class="patient-health-mobile-card patient-health-indicator-detail is-blue" style="--value:64">
                  <span class="patient-health-screen-ring"><strong>64%</strong></span>
                  <div><h3>Hidrataci&oacute;n</h3><p>Meta diaria</p><small>Bebe un poco m&aacute;s de agua para alcanzar tu meta diaria.</small></div>
                  <b>&rsaquo;</b>
                </article>
                <article class="patient-health-mobile-card patient-health-indicator-detail is-orange" style="--value:58">
                  <span class="patient-health-screen-ring"><strong>58%</strong></span>
                  <div><h3>Alimentaci&oacute;n</h3><p>Meta diaria</p><small>Sigue enfoc&aacute;ndote en elegir alimentos nutritivos.</small></div>
                  <b>&rsaquo;</b>
                </article>
                <article class="patient-health-mobile-card patient-health-indicator-detail is-purple" style="--value:80">
                  <span class="patient-health-screen-ring"><strong>80%</strong></span>
                  <div><h3>Sue&ntilde;o</h3><p>Meta diaria</p><small>&iexcl;Excelente! Est&aacute;s durmiendo lo necesario para recuperarte.</small></div>
                  <b>&rsaquo;</b>
                </article>
              </div>
              <aside class="patient-health-screen-tip">
                <span>&#127942;</span>
                <div><strong>Cada peque&ntilde;o paso cuenta</strong><p>Sigue as&iacute;, est&aacute;s construyendo h&aacute;bitos que duran toda la vida.</p></div>
              </aside>
            </section>

            <section class="patient-health-mobile-screen" data-health-screen="plan" role="dialog" aria-modal="true" aria-labelledby="patient-health-screen-plan-title" hidden>
              <header class="patient-health-screen-header">
                <button type="button" data-health-screen-close aria-label="Volver a Mi Salud">&larr;</button>
                <h2 id="patient-health-screen-plan-title">Tu plan de hoy</h2>
              </header>
              <p class="patient-health-screen-lead">Acciones simples para cuidar de tu bienestar d&iacute;a a d&iacute;a.</p>
              <h3 class="patient-health-screen-subtitle">Tu progreso del d&iacute;a</h3>
              <div class="patient-health-screen-list">
                <article class="patient-health-mobile-card patient-health-plan-detail is-green">
                  <span class="patient-health-screen-icon">&#9633;</span>
                  <div><h3>Beber 2.5 L de agua</h3><p>1.6 L / 2.5 L</p><i style="--progress:64%"></i><em>64%</em></div>
                  <b>&rsaquo;</b>
                </article>
                <article class="patient-health-mobile-card patient-health-plan-detail is-orange">
                  <span class="patient-health-screen-icon">&#8981;</span>
                  <div><h3>Caminar 8,000 pasos</h3><p>6,240 / 8,000 pasos</p><i style="--progress:78%"></i><em>78%</em></div>
                  <b>&rsaquo;</b>
                </article>
                <article class="patient-health-mobile-card patient-health-plan-detail is-purple">
                  <span class="patient-health-screen-icon">&#9684;</span>
                  <div><h3>Dormir al menos 7.5 horas</h3><p>7h 20m / 7.5h</p><i style="--progress:96%"></i><em>96%</em></div>
                  <b>&rsaquo;</b>
                </article>
              </div>
              <h3 class="patient-health-screen-subtitle">Consejo del d&iacute;a</h3>
              <aside class="patient-health-screen-tip">
                <span>&#128161;</span>
                <div><strong>Peque&ntilde;os h&aacute;bitos hoy, grandes cambios ma&ntilde;ana.</strong><p>Intenta completar tus metas antes de dormir.</p></div>
              </aside>
              <button class="patient-health-screen-primary" type="button">Ver plan completo</button>
            </section>

            <section class="patient-health-mobile-screen" data-health-screen="recent" role="dialog" aria-modal="true" aria-labelledby="patient-health-screen-recent-title" hidden>
              <header class="patient-health-screen-header">
                <button type="button" data-health-screen-close aria-label="Volver a Mi Salud">&larr;</button>
                <h2 id="patient-health-screen-recent-title">Datos recientes</h2>
              </header>
              <p class="patient-health-screen-lead">Un vistazo r&aacute;pido a tus m&eacute;tricas m&aacute;s importantes.</p>
              <div class="patient-health-screen-list patient-health-data-list">
                <article class="patient-health-mobile-card patient-health-data-detail is-green">
                  <span class="patient-health-screen-icon">&#9635;</span>
                  <div><strong>72.4 kg</strong><small>Peso</small><em>Hoy</em><svg class="patient-health-sparkline" viewBox="0 0 150 34"><polyline points="0,24 15,22 30,26 45,18 60,23 75,16 90,25 105,18 120,20 135,16 150,18"></polyline></svg></div>
                  <b>&rsaquo;</b>
                </article>
                <article class="patient-health-mobile-card patient-health-data-detail is-blue">
                  <span class="patient-health-screen-icon">&#9825;</span>
                  <div><strong>115/75</strong><small>Presi&oacute;n arterial</small><em>Ayer</em><svg class="patient-health-sparkline" viewBox="0 0 150 34"><polyline points="0,25 15,23 30,27 45,24 60,14 75,25 90,20 105,13 120,26 135,21 150,22"></polyline></svg></div>
                  <b>&rsaquo;</b>
                </article>
                <article class="patient-health-mobile-card patient-health-data-detail is-orange">
                  <span class="patient-health-screen-icon">&#9826;</span>
                  <div><strong>92 <small>mg/dL</small></strong><small>Glucosa</small><em>Ayer</em><svg class="patient-health-sparkline" viewBox="0 0 150 34"><polyline points="0,25 15,18 30,27 45,23 60,16 75,25 90,20 105,18 120,24 135,21 150,19"></polyline></svg></div>
                  <b>&rsaquo;</b>
                </article>
                <article class="patient-health-mobile-card patient-health-data-detail is-purple">
                  <span class="patient-health-screen-icon">&#9817;</span>
                  <div><strong>&Oacute;ptimos</strong><small>Biomarcadores</small><em>12/05/2026</em><svg class="patient-health-sparkline" viewBox="0 0 150 34"><polyline points="0,22 15,24 30,27 45,18 60,23 75,17 90,13 105,23 120,18 135,20 150,19"></polyline></svg></div>
                  <b>&rsaquo;</b>
                </article>
              </div>
              <aside class="patient-health-screen-tip">
                <span>&#128202;</span>
                <div><strong>La consistencia es clave</strong><p>Revisa tus datos regularmente para mantenerte en equilibrio.</p></div>
              </aside>
              <button class="patient-health-screen-primary" type="button">Ver todos los datos</button>
            </section>
          </div>
        </article>
      </section>

      <section class="patient-portal-view" data-patient-view="devices">
        <article class="patient-devices-panel">
          <header class="patient-devices-hero">
            <div class="patient-devices-hero-icon" aria-hidden="true">
              <svg viewBox="0 0 52 52" role="img" aria-label="">
                <path d="M20 7h12"></path>
                <path d="M22 7v13L12.5 38.5A5 5 0 0 0 17 46h18a5 5 0 0 0 4.5-7.5L30 20V7"></path>
                <path d="M17.5 36h17"></path>
                <path d="M20.5 31h11"></path>
              </svg>
            </div>
            <div>
              <h1>Dispositivos médicos</h1>
              <p>Dispositivos vinculados y equipos para seguimiento</p>
            </div>
          </header>

          <div class="patient-devices-redesign">
            <nav class="patient-device-filters" data-device-filter-carousel aria-label="Filtros de dispositivos">
              <button class="is-active" type="button" data-device-filter="all" aria-pressed="true"><span class="patient-device-filter-icon patient-device-filter-menu" aria-hidden="true"></span>Todos</button>
              <button class="is-linked" type="button" data-device-filter="linked" aria-pressed="false"><span class="patient-device-filter-icon patient-device-filter-check" aria-hidden="true"></span>Vinculados</button>
              <button class="is-pending" type="button" data-device-filter="pending" aria-pressed="false"><span class="patient-device-filter-icon patient-device-filter-clock" aria-hidden="true"></span>Pendientes</button>
              <button class="is-vitals" type="button" data-device-filter="vitals" aria-pressed="false"><span class="patient-device-filter-icon patient-device-filter-heart" aria-hidden="true"></span>Signos vitales</button>
              <button class="is-glucose" type="button" data-device-filter="glucose" aria-pressed="false"><span class="patient-device-filter-icon patient-device-filter-drop" aria-hidden="true"></span>Glucosa</button>
            </nav>

            <div class="patient-device-list">
              <article class="patient-device-card is-linked" data-device-card data-device-status="linked" data-device-kind="vitals">
                <div class="patient-device-icon-wrap" aria-hidden="true">
                  <span class="patient-device-presence-dot"></span>
                  <div class="patient-device-icon-tile patient-device-icon-pressure">
                    <svg viewBox="0 0 44 44" role="img" aria-label="">
                      <rect x="13" y="8" width="18" height="28" rx="2.5"></rect>
                      <path d="M18 14h8M18 20h8M18 26h8"></path>
                      <path d="M31 12h2.5c2.5 0 4.5 2 4.5 4.5v6"></path>
                    </svg>
                  </div>
                </div>
                <div class="patient-device-content">
                  <div class="patient-device-main">
                    <div class="patient-device-copy">
                      <h2>Monitor de presión arterial</h2>
                      <p>Seguimiento de signos vitales y control cardiovascular.</p>
                    </div>
                    <span class="patient-device-badge is-linked">Vinculado</span>
                  </div>
                  <dl class="patient-device-details">
                    <div><dt>Tipo</dt><dd>Signos vitales</dd></div>
                    <div><dt>Última sincronización</dt><dd>15/06/2026 08:40</dd></div>
                    <div><dt>Lectura reciente</dt><dd>120/80 mmHg</dd></div>
                  </dl>
                </div>
                <div class="patient-device-actions">
                  <button class="patient-device-action is-primary" type="button">Ver detalle</button>
                  <button class="patient-device-action" type="button">Sincronizar</button>
                </div>
              </article>

              <article class="patient-device-card is-pending" data-device-card data-device-status="pending" data-device-kind="glucose">
                <div class="patient-device-icon-wrap" aria-hidden="true">
                  <span class="patient-device-presence-dot"></span>
                  <div class="patient-device-icon-tile patient-device-icon-glucose">
                    <svg viewBox="0 0 44 44" role="img" aria-label="">
                      <path d="M17 18V8h10v10l5 7v9a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5v-9l5-7Z"></path>
                      <path d="M17 15h10M22 25v8M18 29h8"></path>
                    </svg>
                  </div>
                </div>
                <div class="patient-device-content">
                  <div class="patient-device-main">
                    <div class="patient-device-copy">
                      <h2>Glucómetro digital</h2>
                      <p>Registro de glucosa capilar y alertas de control metabólico.</p>
                    </div>
                    <span class="patient-device-badge is-pending">Pendiente</span>
                  </div>
                  <dl class="patient-device-details">
                    <div><dt>Tipo</dt><dd>Glucosa capilar</dd></div>
                    <div><dt>Última sincronización</dt><dd>Sin sincronización</dd></div>
                    <div><dt>Acción requerida</dt><dd>Configurar enlace</dd></div>
                  </dl>
                </div>
                <div class="patient-device-actions">
                  <button class="patient-device-action is-primary" type="button">Configurar</button>
                  <button class="patient-device-action" type="button">Ver guía</button>
                </div>
              </article>
              <div class="patient-device-empty" data-device-empty hidden>No hay dispositivos para este filtro.</div>
            </div>
          </div>
        </article>
      </section>

      <section class="patient-portal-view" data-patient-view="register">
        <article class="patient-register-panel">
          <div class="patient-register-workspace">
            <section class="patient-register-sheet patient-register-view-sheet" aria-label="Registro r&aacute;pido">
              <header class="patient-register-heading">
                <div>
                  <small>REGISTRO R&Aacute;PIDO</small>
                </div>
              </header>

              <nav class="patient-health-view-switch patient-register-view-switch" data-register-view-switch data-active-view="parameters" role="tablist" aria-label="Secciones de Registro r&aacute;pido">
                <button class="is-active" id="patient-register-tab-parameters" type="button" data-register-view-mode="parameters" role="tab" aria-selected="true" aria-controls="patient-register-panel-parameters">Par&aacute;metros</button>
                <button id="patient-register-tab-history" type="button" data-register-view-mode="history" role="tab" aria-selected="false" aria-controls="patient-register-panel-history" tabindex="-1">Historial cl&iacute;nico</button>
              </nav>


              <div class="patient-register-view-stage" data-register-view-stage>
              <section class="patient-register-view-panel" id="patient-register-panel-history" data-register-view-panel="history" role="tabpanel" aria-labelledby="patient-register-tab-history" aria-hidden="true" inert>
              <section class="patient-register-history-selector" aria-labelledby="patient-register-history-title">
                <h3 class="patient-register-visually-hidden" id="patient-register-history-title">Historial Cl&iacute;nico</h3>
                <div class="patient-register-history-carousel" data-register-history-carousel aria-label="Categor&iacute;as del historial cl&iacute;nico">
                  <div class="patient-register-history-card" data-register-history-card="consultation"><button class="is-consultation" type="button" data-register-history-category="consultation" aria-pressed="false" aria-expanded="false" aria-controls="patient-register-history-composer"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/health-icons/history/01_consulta_medica.png?v=20261013" alt="" loading="lazy"></span><b>Consulta m&eacute;dica</b></button><button class="patient-register-history-favorite" type="button" data-register-history-favorite="consultation" aria-label="Agregar Consulta m&eacute;dica a favoritos" aria-pressed="false" title="Agregar a favoritos">&#9734;</button></div>
                  <div class="patient-register-history-card" data-register-history-card="laboratory"><button class="is-laboratory" type="button" data-register-history-category="laboratory" aria-pressed="false" aria-expanded="false" aria-controls="patient-register-history-composer"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/health-icons/history/02_analisis_laboratorio.png?v=20261013" alt="" loading="lazy"></span><b>An&aacute;lisis de laboratorio</b></button><button class="patient-register-history-favorite" type="button" data-register-history-favorite="laboratory" aria-label="Agregar An&aacute;lisis de laboratorio a favoritos" aria-pressed="false" title="Agregar a favoritos">&#9734;</button></div>
                  <div class="patient-register-history-card" data-register-history-card="study"><button class="is-study" type="button" data-register-history-category="study" aria-pressed="false" aria-expanded="false" aria-controls="patient-register-history-composer"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/health-icons/history/03_estudios.png?v=20261013" alt="" loading="lazy"></span><b>Estudios</b></button><button class="patient-register-history-favorite" type="button" data-register-history-favorite="study" aria-label="Agregar Estudios a favoritos" aria-pressed="false" title="Agregar a favoritos">&#9734;</button></div>
                  <div class="patient-register-history-card" data-register-history-card="prescription"><button class="is-prescription" type="button" data-register-history-category="prescription" aria-pressed="false" aria-expanded="false" aria-controls="patient-register-history-composer"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/health-icons/history/04_recetas.png?v=20261013" alt="" loading="lazy"></span><b>Recetas</b></button><button class="patient-register-history-favorite" type="button" data-register-history-favorite="prescription" aria-label="Agregar Recetas a favoritos" aria-pressed="false" title="Agregar a favoritos">&#9734;</button></div>
                  <div class="patient-register-history-card" data-register-history-card="hospitalization"><button class="is-hospitalization" type="button" data-register-history-category="hospitalization" aria-pressed="false" aria-expanded="false" aria-controls="patient-register-history-composer"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/health-icons/history/05_hospitalizacion.png?v=20261013" alt="" loading="lazy"></span><b>Hospitalizaci&oacute;n</b></button><button class="patient-register-history-favorite" type="button" data-register-history-favorite="hospitalization" aria-label="Agregar Hospitalizaci&oacute;n a favoritos" aria-pressed="false" title="Agregar a favoritos">&#9734;</button></div>
                  <div class="patient-register-history-card" data-register-history-card="vaccine"><button class="is-vaccine" type="button" data-register-history-category="vaccine" aria-pressed="false" aria-expanded="false" aria-controls="patient-register-history-composer"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/health-icons/history/06_vacunas.png?v=20261013" alt="" loading="lazy"></span><b>Vacunas</b></button><button class="patient-register-history-favorite" type="button" data-register-history-favorite="vaccine" aria-label="Agregar Vacunas a favoritos" aria-pressed="false" title="Agregar a favoritos">&#9734;</button></div>
                  <div class="patient-register-history-card" data-register-history-card="manual"><button class="is-manual" type="button" data-register-history-category="manual" aria-pressed="false" aria-expanded="false" aria-controls="patient-register-history-composer"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/health-icons/history/07_registro_manual.png?v=20261013" alt="" loading="lazy"></span><b>Registro manual</b></button><button class="patient-register-history-favorite" type="button" data-register-history-favorite="manual" aria-label="Agregar Registro manual a favoritos" aria-pressed="false" title="Agregar a favoritos">&#9734;</button></div>
                </div>
                <p class="patient-register-history-empty" data-register-history-empty hidden>No hay categor&iacute;as favoritas.</p>
                <section class="patient-register-history-composer" id="patient-register-history-composer" data-register-history-composer aria-live="polite" hidden>
                  <header class="patient-register-selected-metric">
                    <span class="patient-register-selected-icon patient-register-history-composer-icon" data-register-history-composer-icon aria-hidden="true">♧</span>
                    <div>
                      <h4 data-register-history-composer-title>Consulta m&eacute;dica</h4>
                      <p class="patient-register-visually-hidden" data-register-history-composer-description>Registra tu consulta m&eacute;dica</p>
                    </div>
                    <button class="patient-register-history-collapse" type="button" data-register-history-collapse aria-label="Ocultar registro de historial cl&iacute;nico">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m6 15 6-6 6 6"></path>
                      </svg>
                    </button>
                  </header>
                  <label class="patient-register-history-field">
                    <span>Fecha y hora <em>*</em></span>
                    <div class="patient-register-date-row patient-register-history-date-row">
                      <i aria-hidden="true">▦</i>
                      <input type="datetime-local" data-register-history-date required>
                      <i aria-hidden="true">▦</i>
                    </div>
                  </label>
                  <label class="patient-register-history-field">
                    <span data-register-history-provider-label>M&eacute;dico</span>
                    <select data-register-history-provider>
                      <option value="">Selecciona el m&eacute;dico</option>
                      <option value="Dr. Carter Jimmy">Dr. Carter Jimmy</option>
                      <option value="Dra. Ana Sof&iacute;a Ram&iacute;rez">Dra. Ana Sof&iacute;a Ram&iacute;rez</option>
                      <option value="Hospital General Norte">Hospital General Norte</option>
                      <option value="Registro personal">Registro personal</option>
                    </select>
                  </label>
                  <label class="patient-register-history-field">
                    <span>Notas adicionales</span>
                    <div class="patient-register-history-textarea">
                      <textarea maxlength="1000" placeholder="Escribe notas adicionales..." data-register-history-notes aria-label="Notas adicionales para historial cl&iacute;nico"></textarea>
                      <small data-register-history-notes-count>0/1000</small>
                    </div>
                  </label>
                  <div class="patient-register-history-actions">
                    <button class="patient-register-history-photo" type="button" data-register-history-photo-pick aria-label="Tomar fotograf&iacute;a">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z"></path>
                        <circle cx="12" cy="13" r="3.5"></circle>
                      </svg>
                    </button>
                    <button class="patient-register-history-photo patient-register-file-button" type="button" data-register-history-file-pick aria-label="Adjuntar archivo" title="Adjuntar archivo">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"></path></svg>
                      <span>Adjuntar archivo</span>
                    </button>
                    <button class="patient-register-history-submit" type="button" data-register-history-submit>
                      <span>Guardar</span>
                    </button>
                  </div>
                  <input type="file" accept="image/*" capture="environment" data-register-history-photo-input hidden>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf,.doc,.docx" data-register-history-file-input hidden>
                  <section class="patient-register-image-preview patient-register-history-image-preview" data-register-history-photo-preview hidden>
                    <img src="" alt="Imagen adjunta al historial cl&iacute;nico" data-register-history-photo-preview-image hidden>
                    <span class="patient-register-history-file-type" data-register-history-file-type hidden>PDF</span>
                    <button type="button" data-register-history-photo-clear aria-label="Quitar archivo adjunto">×</button>
                    <small data-register-history-photo-preview-name></small>
                  </section>
                  <p class="patient-register-history-feedback" data-register-history-feedback hidden></p>
                </section>
                <section class="patient-register-saved-screen" data-register-saved-screen="history" hidden>
                  <span class="patient-register-saved-check" aria-hidden="true">✓</span>
                  <h3>Registro guardado</h3>
                  <p>La informaci&oacute;n se ha guardado correctamente.</p>
                  <div class="patient-register-saved-actions">
                    <button type="button" data-register-saved-history>Ver historial cl&iacute;nico</button>
                    <button type="button" data-register-saved-new>Nuevo registro</button>
                  </div>
                </section>
              </section>
              </section>

              <section class="patient-register-view-panel is-active" id="patient-register-panel-parameters" data-register-view-panel="parameters" role="tabpanel" aria-labelledby="patient-register-tab-parameters">
              <h2 class="patient-register-main-title patient-register-visually-hidden" id="patient-register-title">Par&aacute;metros</h2>

              <div class="patient-register-metric-stage" data-register-metric-stage>
                <section class="patient-register-option-block patient-register-option-block-favorites is-active" data-register-metric-section="favorites" aria-hidden="false">
                  <div class="patient-register-options patient-register-favorite-options" data-register-favorites data-register-carousel aria-label="Parametros favoritos"></div>
                </section>

                <section class="patient-register-option-block patient-register-option-block-all" data-register-metric-section="all" aria-hidden="true">
                  <div class="patient-register-options" data-register-options data-register-carousel aria-label="Tipo de parametro"></div>
                </section>
              </div>

              <div class="patient-register-segmented patient-health-parameter-switch" data-register-filter-switch role="tablist" aria-label="Vista de Registro r&aacute;pido">
                <button class="is-active" type="button" data-register-filter-view="favorites" role="tab" aria-selected="true">
                  <span aria-hidden="true">&#9733;</span>
                  Favoritos
                </button>
                <button type="button" data-register-filter-view="all" role="tab" aria-selected="false">Todos</button>
              </div>

              <form class="patient-register-form" data-register-form aria-live="polite" hidden>
                <input type="hidden" name="historyCategory" value="" data-register-history-category-input>
                <input type="hidden" name="metricType" value="water" data-register-metric-input>
                <div class="patient-register-selected-metric" data-register-selected-panel>
                  <span class="patient-register-selected-icon" data-register-selected-icon aria-hidden="true"></span>
                  <div>
                    <h3 data-register-selected-title>Agua</h3>
                  </div>
                </div>
                <label data-register-custom-wrap hidden>
                  <span>Nombre del par&aacute;metro</span>
                  <input name="customMetric" placeholder="Ej. Temperatura, dolor, energia">
                </label>
                <label>
                  <span><span data-register-value-label>Valor</span> <em>*</em></span>
                  <div class="patient-register-value-row">
                    <input name="value" type="number" step="0.1" placeholder="Meta sugerida: 2.5 L" required data-register-value>
                    <b data-register-unit>L</b>
                  </div>
                </label>
                <label>
                  <span>Fecha y hora <em>*</em></span>
                  <div class="patient-register-date-row">
                    <i aria-hidden="true">▦</i>
                    <input name="recordedAt" type="datetime-local" required data-register-date>
                    <i aria-hidden="true">▦</i>
                  </div>
                </label>
                <label class="patient-register-parameter-text">
                  <span class="patient-register-visually-hidden">Comentario opcional</span>
                  <div class="patient-register-notes-wrap">
                    <textarea name="notes" rows="5" maxlength="2000" placeholder="Escribe aqu&iacute; el registro manual..." data-register-notes></textarea>
                    <small data-register-notes-count>0/2000</small>
                  </div>
                </label>
                <div class="patient-register-attachment patient-register-parameter-attachment">
                  <div class="patient-register-parameter-actions">
                    <button class="patient-register-history-photo patient-register-parameter-photo-button" type="button" data-register-attachment-pick aria-label="Tomar fotograf&iacute;a">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z"></path>
                        <circle cx="12" cy="13" r="3.5"></circle>
                      </svg>
                    </button>
                    <button class="patient-register-history-photo patient-register-file-button" type="button" data-register-file-pick aria-label="Adjuntar archivo" title="Adjuntar archivo">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"></path></svg>
                      <span>Adjuntar archivo</span>
                    </button>
                    <button class="patient-register-primary patient-register-parameter-submit" type="submit">
                      <span>Guardar</span>
                    </button>
                  </div>
                  <input type="file" accept="image/*" capture="environment" name="attachment" data-register-attachment-input hidden>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf,.doc,.docx" data-register-file-input hidden>
                  <section class="patient-register-uploaded-card" data-register-uploaded hidden>
                    <div class="patient-register-uploaded-file">
                      <span class="patient-register-file-type" data-register-file-type>PDF</span>
                      <span class="patient-register-uploaded-preview" data-register-uploaded-preview hidden>
                        <img src="" alt="Imagen adjunta al registro" data-register-uploaded-preview-image>
                      </span>
                      <div>
                        <b>Archivo seleccionado</b>
                        <strong data-register-file-name>Archivo seleccionado</strong>
                        <small data-register-file-size></small>
                      </div>
                      <button type="button" data-register-attachment-clear aria-label="Eliminar archivo">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 7h16"></path>
                          <path d="M10 11v6"></path>
                          <path d="M14 11v6"></path>
                          <path d="M6 7l1 14h10l1-14"></path>
                          <path d="M9 7V4h6v3"></path>
                        </svg>
                      </button>
                    </div>
                    <div class="patient-register-uploaded-status">
                      <span aria-hidden="true">✓</span>
                      <strong>Listo para guardar</strong>
                      <button type="button" data-register-attachment-change>Cambiar archivo</button>
                    </div>
                  </section>
                  <section class="patient-register-transcript-card" data-register-transcript-card hidden>
                    <header>
                      <div>
                        <strong>Texto transcrito autom&aacute;ticamente</strong>
                        <small>Informaci&oacute;n transcrita del documento</small>
                        <span>IA</span>
                      </div>
                      <button type="button" data-register-transcript-edit>Editar texto</button>
                    </header>
                    <textarea name="attachmentTranscript" readonly data-register-transcript></textarea>
                    <p>La informaci&oacute;n puede contener errores. Revisa el texto antes de guardar.</p>
                  </section>
                  <label class="patient-register-attachment-category" data-register-attachment-category-wrap hidden>
                    <span>Guardar en el historial cl&iacute;nico como <em>*</em></span>
                    <select name="attachmentCategory" data-register-attachment-category>
                      <option value="">Selecciona una categor&iacute;a</option>
                      <option value="consultation">Consulta Medica</option>
                      <option value="laboratory">Analisis de Laboratorio</option>
                      <option value="study">Estudios</option>
                      <option value="prescription">Recetas</option>
                      <option value="hospitalization">Hospitalizacion</option>
                      <option value="manual">Registro Manual</option>
                      <option value="vaccine">Vacunas</option>
                    </select>
                    <small>La categor&iacute;a solo aplica al archivo adjunto y a su transcripci&oacute;n.</small>
                  </label>
                </div>
                <div class="patient-register-success" data-register-success hidden>
                  Registro guardado. Se agrego a tus datos manuales.
                </div>
              </form>
              <section class="patient-register-saved-screen" data-register-saved-screen="parameter" hidden>
                <span class="patient-register-saved-check" aria-hidden="true">✓</span>
                <h3>Registro guardado</h3>
                <p>La informaci&oacute;n se ha guardado correctamente.</p>
                <div class="patient-register-saved-actions">
                  <button type="button" data-register-saved-history>Ver historial cl&iacute;nico</button>
                  <button type="button" data-register-saved-new>Nuevo registro</button>
                </div>
              </section>
              </section>
              </div>
              <dialog class="patient-register-image-dialog" data-register-image-dialog aria-labelledby="patient-register-image-title">
                <div class="patient-register-image-sheet">
                  <header>
                    <h2 id="patient-register-image-title" data-register-image-title>Agregar imagen</h2>
                    <button type="button" data-register-image-close aria-label="Cerrar">×</button>
                  </header>
                  <div class="patient-register-image-stage" data-register-image-stage="source">
                    <button type="button" data-register-image-source="camera">
                      <span aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z"></path><circle cx="12" cy="13" r="3.5"></circle></svg>
                      </span>
                      <strong>Tomar foto</strong>
                    </button>
                    <button type="button" data-register-image-source="gallery">
                      <span aria-hidden="true">
                        <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="m8 13 2.5-2.5L15 15l1.5-1.5L21 18"></path><circle cx="9" cy="9" r="1.5"></circle></svg>
                      </span>
                      <strong>Seleccionar</strong>
                    </button>
                  </div>
                  <div class="patient-register-image-stage" data-register-image-stage="action" hidden>
                    <small data-register-image-file-name></small>
                    <button type="button" data-register-image-action="transcribe">
                      <span aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6V3Z"></path><path d="M14 3v4h4"></path><path d="M9 12h6"></path><path d="M9 16h6"></path></svg>
                      </span>
                      <div><strong>Transcribir</strong><small>Extrae el texto de la imagen.</small></div>
                    </button>
                    <button type="button" data-register-image-action="attach">
                      <span aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6V3Z"></path><path d="M14 3v4h4"></path><path d="M9 14h6"></path></svg>
                      </span>
                      <div><strong>Agregar</strong><small>Guarda la imagen como archivo adjunto.</small></div>
                    </button>
                  </div>
                  <button class="patient-register-image-cancel" type="button" data-register-image-cancel>
                    <span aria-hidden="true">×</span>
                    <strong>Cancelar</strong>
                  </button>
                </div>
              </dialog>
            </section>
          </div>
        </article>
      </section>

      <nav class="patient-portal-bottom-nav" aria-label="Navegación principal del paciente">
        <button class="is-active" type="button" data-open-view="home" aria-label="Inicio"><span class="patient-bottom-png" aria-hidden="true"><img src="{{ asset('images/patient-bottom-nav/01_Inicio.png') }}" alt=""></span></button>
        <button class="patient-bottom-communities" type="button" data-open-view="communities" aria-label="Comunidades"><span class="patient-bottom-png" aria-hidden="true"><img src="{{ asset('images/patient-bottom-nav/02_Comunidades.png') }}" alt=""></span></button>
        <button class="patient-bottom-register" type="button" data-open-view="register" aria-label="Registro"><span class="patient-bottom-png" aria-hidden="true"><img src="{{ asset('images/patient-bottom-nav/03_Registro.png') }}" alt=""></span></button>
        <button type="button" data-open-view="wellness" aria-label="Mi Salud"><span class="patient-bottom-png" aria-hidden="true"><img src="{{ asset('images/patient-bottom-nav/04_Salud.png') }}" alt=""></span></button>
        <button type="button" data-open-view="calendar" aria-label="Calendario"><span class="patient-bottom-png" aria-hidden="true"><img src="{{ asset('images/patient-bottom-nav/05_Calendario.png') }}" alt=""></span></button>
      </nav>
    </main>
  </div>
</div>

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

<script src="{{ asset('js/klini-profiles.js') }}?v={{ filemtime(public_path('js/klini-profiles.js')) }}"></script>
<script src="{{ asset('js/patient-profile-panel.js') }}?v={{ filemtime(public_path('js/patient-profile-panel.js')) }}"></script>
<script src="{{ asset('js/patient-social.js') }}?v={{ filemtime(public_path('js/patient-social.js')) }}"></script>
<script src="{{ asset('js/community-activities.js') }}?v={{ filemtime(public_path('js/community-activities.js')) }}"></script>
<script src="{{ asset('js/communities.js') }}?v={{ filemtime(public_path('js/communities.js')) }}"></script>
<script src="{{ asset('js/patient-stories.js') }}?v={{ filemtime(public_path('js/patient-stories.js')) }}"></script>
<script src="{{ asset('js/insurance-enrollment.js') }}?v={{ filemtime(public_path('js/insurance-enrollment.js')) }}"></script>
<script src="{{ asset('js/patient-insurance-drawer.js') }}?v={{ filemtime(public_path('js/patient-insurance-drawer.js')) }}"></script>
<script>
(() => {
  const portal = document.querySelector('[data-patient-portal]');
  if (!portal) return;
  const primaryPatientProfile = {
    id: @json($patient->platform_number ?? (string) $patient->id),
    userId: @json($patient->platform_number ?? (string) $patient->id),
    name: @json($patient->full_name),
    photo: '',
  };
  const profilePanelStorageKey = @json('drsam_patient_profile_panel_'.$patient->id);
  const registerStorageBaseKey = @json('drsam_patient_manual_records_'.$patient->id);
  const registerAttachmentUploadUrl = @json(route('patient.register_attachments.store'));
  const registerAttachmentDownloadTemplate = @json(route('patient.register_attachments.download', ['document' => '__DOCUMENT__']));
  const registerAttachmentCsrfToken = @json(csrf_token());
  const registerFavoriteStorageBaseKey = @json('drsam_patient_register_favorites_'.$patient->id);
  const registerHistoryFavoriteStorageBaseKey = @json('drsam_patient_register_history_favorites_'.$patient->id);
  const historyFavoriteStorageBaseKey = @json('drsam_patient_history_favorites_'.$patient->id);
  const aiChatStorageBaseKey = @json('drsam_patient_ai_chat_'.$patient->id);
  const communitiesStorageBaseKey = @json('drsam_patient_communities_'.$patient->id);
  const profileStorageSuffix = value => String(value ?? '').replace(/\D/g, '') || 'primary';
  const normalizeActivePatientProfile = profile => ({
    ...primaryPatientProfile,
    ...(profile || {}),
    id: String(profile?.userId || profile?.id || primaryPatientProfile.userId),
    userId: String(profile?.userId || profile?.id || primaryPatientProfile.userId),
    name: String(profile?.name || primaryPatientProfile.name),
    photo: String(profile?.photo || ''),
  });
  const readActivePatientProfile = () => {
    const panelApi = window.DrSamPatientProfilePanel;
    if (panelApi?.getActiveProfile) return normalizeActivePatientProfile(panelApi.getActiveProfile());
    try {
      const saved = JSON.parse(localStorage.getItem(profilePanelStorageKey) || 'null');
      const accounts = Array.isArray(saved?.alternateAccounts) ? saved.alternateAccounts : [];
      const activeAccount = accounts.find(account => account.id === saved?.activeAlternateId);
      if (activeAccount) return normalizeActivePatientProfile(activeAccount);
      if (saved?.profile) return normalizeActivePatientProfile(saved.profile);
    } catch (error) {}
    return normalizeActivePatientProfile(primaryPatientProfile);
  };
  let activePatientProfile = readActivePatientProfile();
  const getActivePatientProfile = () => activePatientProfile || normalizeActivePatientProfile(primaryPatientProfile);
  const getActivePatientProfileId = () => getActivePatientProfile().userId || primaryPatientProfile.userId;
  const isPrimaryPatientProfileActive = () => profileStorageSuffix(getActivePatientProfileId()) === profileStorageSuffix(primaryPatientProfile.userId);
  const applyActivePatientProfileShell = () => {
    const activeProfile = getActivePatientProfile();
    portal.dataset.activeProfileId = getActivePatientProfileId();
    portal.dataset.activeProfileName = activeProfile.name;
    portal.classList.toggle('is-admin-profile-active', isPrimaryPatientProfileActive());
    portal.classList.toggle('is-subprofile-active', !isPrimaryPatientProfileActive());
  };
  const scopedStorageKey = base => `${base}_${profileStorageSuffix(getActivePatientProfileId())}`;
  const ensurePrimaryScopedStorage = (base, scoped) => {
    if (profileStorageSuffix(getActivePatientProfileId()) !== profileStorageSuffix(primaryPatientProfile.userId)) return;
    try {
      const legacy = localStorage.getItem(base);
      if (legacy !== null && localStorage.getItem(scoped) === null) localStorage.setItem(scoped, legacy);
    } catch (error) {}
  };
  const activeRegisterStorageKey = () => {
    const key = scopedStorageKey(registerStorageBaseKey);
    ensurePrimaryScopedStorage(registerStorageBaseKey, key);
    return key;
  };
  const activeRegisterFavoriteStorageKey = () => {
    const key = scopedStorageKey(registerFavoriteStorageBaseKey);
    ensurePrimaryScopedStorage(registerFavoriteStorageBaseKey, key);
    return key;
  };
  const activeRegisterHistoryFavoriteStorageKey = () => scopedStorageKey(registerHistoryFavoriteStorageBaseKey);
  const activeHistoryFavoriteStorageKey = () => scopedStorageKey(historyFavoriteStorageBaseKey);
  const activeAiChatStorageKey = () => {
    const key = scopedStorageKey(aiChatStorageBaseKey);
    ensurePrimaryScopedStorage(aiChatStorageBaseKey, key);
    return key;
  };
  const activeCommunitiesStorageKey = () => {
    const key = scopedStorageKey(communitiesStorageBaseKey);
    ensurePrimaryScopedStorage(communitiesStorageBaseKey, key);
    return key;
  };
  const clearProfileScopedStorage = profileId => {
    const profileIdValue = String(profileId ?? '').trim();
    const suffix = profileIdValue ? profileStorageSuffix(profileIdValue) : '';
    if (!suffix || suffix === profileStorageSuffix(primaryPatientProfile.userId)) return;
    [
      registerStorageBaseKey,
      registerFavoriteStorageBaseKey,
      registerHistoryFavoriteStorageBaseKey,
      historyFavoriteStorageBaseKey,
      aiChatStorageBaseKey,
      communitiesStorageBaseKey,
    ].forEach(base => {
      try {
        localStorage.removeItem(`${base}_${suffix}`);
      } catch (error) {}
    });
  };
  const registerPatientName = () => getActivePatientProfile().name || primaryPatientProfile.name;
  applyActivePatientProfileShell();
  let homePostsApp = null;
  const patientStoryOptions = {
    url: @json(route('patient.stories.index')),
    csrf: @json(csrf_token()),
    demo: @json($storyDemo),
  };
  const mountHomePosts = () => {
    const root = portal.querySelector('[data-patient-home-posts-root]');
    if (!root || !window.KliniCommunities) return;
    if (homePostsApp) { homePostsApp.load(); homePostsApp.render(); return; }
    const activeProfile = getActivePatientProfile();
    homePostsApp = window.KliniCommunities.mount(root, {
      patient: {
        id: getActivePatientProfileId(),
        name: activeProfile.name,
        photo: activeProfile.photo,
      },
      storageKey: activeCommunitiesStorageKey(),
      profileStorageKey: profilePanelStorageKey,
      startView: 'posts',
      stories: patientStoryOptions,
      hideBottomNav: true,
      onAction: event => window.dispatchEvent(new CustomEvent('drsam:communities-action', { detail: event })),
    });
  };
  let communitiesApp = null;
  const communitiesHome = portal.querySelector('[data-patient-view="communities"]');
  const communitiesRoot = portal.querySelector('[data-communities-root]');
  const calendarActivities = portal.querySelector('[data-calendar-section-panel="activities"]');
  let calendarSection = 'medical';
  const mountCommunities = () => {
    const root = communitiesRoot;
    if (!root || !window.KliniCommunities) return;
    if (communitiesApp) {
      communitiesApp.load();
      communitiesApp.render();
      window.KliniCommunityActivities?.load().then(() => communitiesApp.render()).catch(() => {});
      return;
    }
    const activeProfile = getActivePatientProfile();
    communitiesApp = window.KliniCommunities.mount(root, {
      patient: {
        id: getActivePatientProfileId(),
        name: activeProfile.name,
        photo: activeProfile.photo,
      },
      storageKey: activeCommunitiesStorageKey(),
      profileStorageKey: profilePanelStorageKey,
      separateCalendar: true,
      hideBottomNav: true,
      onNavigate: view => {
        if (view === 'calendar') {
          calendarSection = 'activities';
          openView('calendar');
        } else if (root.parentElement === calendarActivities) {
          openView('communities');
        }
      },
      onAction: event => window.dispatchEvent(new CustomEvent('drsam:communities-action', { detail: event })),
    });
    window.KliniCommunitiesApp = communitiesApp;
    @if (app()->isLocal() && request()->boolean('demo_reservations'))
    communitiesApp.seedDemoReservations();
    homePostsApp?.load();
    @endif
  };
  const selectCalendarSection = section => {
    calendarSection = section === 'activities' ? 'activities' : 'medical';
    portal.querySelectorAll('[data-calendar-section]').forEach(button => {
      const selected = button.dataset.calendarSection === calendarSection;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    portal.querySelectorAll('[data-calendar-section-panel]').forEach(panel => {
      panel.hidden = panel.dataset.calendarSectionPanel !== calendarSection;
    });
    if (calendarSection === 'activities') {
      mountCommunities();
      if (communitiesRoot && calendarActivities) calendarActivities.append(communitiesRoot);
      communitiesApp?.showCalendar();
    }
  };
  const calendarSectionButtons = [...portal.querySelectorAll('[data-calendar-section]')];
  calendarSectionButtons.forEach((button, index) => {
    button.addEventListener('click', () => selectCalendarSection(button.dataset.calendarSection));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? calendarSectionButtons.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + calendarSectionButtons.length) % calendarSectionButtons.length;
      const next = calendarSectionButtons[nextIndex];
      selectCalendarSection(next.dataset.calendarSection);
      next.focus();
    });
  });
  const insuranceDrawer = window.KliniInsuranceDrawer?.mount(portal);
  const openView = (name) => {
    if (name === 'insurance' && insuranceDrawer) {
      mountHomePosts();
      insuranceDrawer.open();
      return;
    }
    portal.querySelectorAll('[data-social-transition-overlay]').forEach(el => el.remove());
    const previousSocialView = portal.querySelector('[data-patient-view].is-active')?.dataset.patientView;
    const previousTrack = portal.querySelector('[data-patient-view].is-active [data-carousel="stories"]');
    const storyScrollLeft = previousTrack?.scrollLeft || 0;
    const outgoingFeed = portal.querySelector('[data-patient-view].is-active .kc-post-list, [data-patient-view].is-active .kc-community-feed-list');
    const outgoingRect = outgoingFeed?.getBoundingClientRect();
    const outgoingCopy = outgoingFeed?.cloneNode(true);
    const socialSwitch = ['home', 'communities'].includes(name) && ['home', 'communities'].includes(previousSocialView) && name !== previousSocialView;
    insuranceDrawer?.close();
    portal.querySelectorAll('[data-patient-view]').forEach(el => el.classList.toggle('is-active', el.dataset.patientView === name));
    portal.querySelectorAll('[data-open-view]').forEach(el => el.classList.toggle('is-active', el.dataset.openView === name));
    sessionStorage.setItem('patientPortalView', name);
    if (name === 'home') {
      if (homePostsApp?.stories) homePostsApp.stories.app = homePostsApp;
      mountHomePosts();
    }
    if (name === 'communities') {
      if (communitiesRoot && communitiesHome) communitiesHome.append(communitiesRoot);
      if (!homePostsApp) mountHomePosts();
      mountCommunities();
      if (homePostsApp?.stories && communitiesApp) {
        communitiesApp.stories = homePostsApp.stories;
        communitiesApp.stories.app = communitiesApp;
        communitiesApp.render();
      }
    }
    if (name === 'calendar') selectCalendarSection(calendarSection);
    if (name === 'wellness') renderHealthDashboard();
    if (name === 'register') {
      if (registerSuccess) registerSuccess.hidden = true;
      hideRegisterSavedScreens();
      if (registerDateInput && !registerDateInput.value) registerDateInput.value = registerDateValue();
      hideRegisterHistoryComposer();
      hideRegisterMetricPanel({ sync: false });
      selectRegisterMetric(registerMetricInput?.value || 'water');
    }
    if (socialSwitch) {
      const activeView = portal.querySelector('[data-patient-view="' + name + '"]');
      const track = activeView?.querySelector('[data-carousel="stories"]');
      if (track) track.scrollLeft = storyScrollLeft;
      const feed = activeView?.querySelector('.kc-post-list, .kc-community-feed-list');
      feed?.getAnimations?.().forEach(animation => animation.cancel());
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const timing = {duration:1100,easing:'cubic-bezier(.22,.61,.36,1)'};
        feed?.animate([{opacity:0},{opacity:1}], timing);
        activeView?.querySelector('.kc-community-workspace-heading')?.animate([{opacity:0},{opacity:1}], timing);
        if (outgoingCopy && outgoingRect && window.scrollY < 1) {
          outgoingCopy.dataset.socialTransitionOverlay = 'true';
          outgoingCopy.setAttribute('aria-hidden','true'); outgoingCopy.inert = true;
          outgoingCopy.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
          Object.assign(outgoingCopy.style,{position:'fixed',top:outgoingRect.top+'px',left:outgoingRect.left+'px',width:outgoingRect.width+'px',pointerEvents:'none',zIndex:'2',background:'#fff'});
          const overlayHost = document.createElement('div');
          overlayHost.className = 'patient-portal-' + previousSocialView + '-view';
          overlayHost.dataset.socialTransitionOverlay = 'true'; overlayHost.setAttribute('aria-hidden','true'); overlayHost.inert = true;
          overlayHost.appendChild(outgoingCopy); portal.appendChild(overlayHost);
          outgoingCopy.animate([{opacity:1},{opacity:0}], timing).finished.catch(() => {}).finally(() => overlayHost.remove());
        }
      }
    }
    window.scrollTo({ top: 0, behavior: socialSwitch ? 'instant' : 'smooth' });
  };

  window.addEventListener('drsam:social-open', event => {
    const item = event.detail || {};
    const view = item.source === 'communities' ? 'communities' : 'home';
    window.DrSamPatientProfilePanel?.close();
    openView(view);
    const app = view === 'communities' ? communitiesApp : homePostsApp;
    app?.openSocialPost(item.postId, item.communityId, item.type === 'message');
  });

  const policySavedOverlay = document.querySelector('[data-policy-saved-overlay]');
  if (policySavedOverlay) {
    openView('insurance');
    document.body.classList.add('has-policy-saved-overlay');

    const closePolicySavedNotice = () => {
      openView('insurance');
      document.body.classList.remove('has-policy-saved-overlay');
      policySavedOverlay.classList.add('is-closing');
      window.setTimeout(() => policySavedOverlay.remove(), 260);
    };

    policySavedOverlay.querySelector('[data-policy-saved-close]')
      ?.addEventListener('click', closePolicySavedNotice);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.body.contains(policySavedOverlay)) {
        closePolicySavedNotice();
      }
    });
  }
  const healthScreenLayer = portal.querySelector('[data-health-screen-layer]');
  const healthScreens = [...portal.querySelectorAll('[data-health-screen]')];
  const registerForm = document.querySelector('[data-register-form]');
  const registerOptions = document.querySelector('[data-register-options]');
  const registerFavorites = document.querySelector('[data-register-favorites]');
  const registerViewSwitch = portal.querySelector('[data-register-view-switch]');
  const registerViewButtons = [...portal.querySelectorAll('[data-register-view-mode]')];
  const registerViewPanels = [...portal.querySelectorAll('[data-register-view-panel]')];
  const registerFilterSwitch = portal.querySelector('[data-register-filter-switch]');
  const registerFilterViewButtons = [...portal.querySelectorAll('[data-register-filter-view]')];
  const registerMetricSections = [...portal.querySelectorAll('[data-register-metric-section]')];
  const healthViewSwitch = portal.querySelector('[data-health-view-switch]');
  const healthViewButtons = [...portal.querySelectorAll('[data-health-view-mode]')];
  const healthViewPanels = [...portal.querySelectorAll('[data-health-view-panel]')];
  const healthDashboard = portal.querySelector('[data-health-dashboard]');
  const healthFavorites = portal.querySelector('[data-health-favorites]');
  const healthOptions = portal.querySelector('[data-health-options]');
  const healthMetricSwitch = portal.querySelector('[data-health-metric-switch]');
  const healthMetricViewButtons = [...portal.querySelectorAll('[data-health-metric-view]')];
  const healthMetricSections = [...portal.querySelectorAll('[data-health-metric-section]')];
  const healthDetailIcon = portal.querySelector('[data-health-detail-icon]');
  const healthDetailTitle = portal.querySelector('[data-health-detail-title]');
  const healthStatGrid = portal.querySelector('[data-health-stat-grid]');
  const healthRangeTabs = portal.querySelector('[data-health-range-tabs]');
  const healthDateFrom = portal.querySelector('[data-health-date-from]');
  const healthDateTo = portal.querySelector('[data-health-date-to]');
  const healthChart = portal.querySelector('[data-health-chart]');
  const healthChartUnit = portal.querySelector('[data-health-chart-unit]');
  const healthChartGoal = portal.querySelector('[data-health-chart-goal]');
  const healthHistoryList = portal.querySelector('[data-health-history-list]');
  const healthInsights = portal.querySelector('[data-health-insights]');
  const registerMetricInput = document.querySelector('[data-register-metric-input]');
  const registerHistoryCategoryInput = document.querySelector('[data-register-history-category-input]');
  const registerHistoryCarousel = portal.querySelector('[data-register-history-carousel]');
  const registerHistoryEmpty = portal.querySelector('[data-register-history-empty]');
  const registerHistoryComposer = portal.querySelector('[data-register-history-composer]');
  const registerHistoryComposerIcon = portal.querySelector('[data-register-history-composer-icon]');
  const registerHistoryComposerTitle = portal.querySelector('[data-register-history-composer-title]');
  const registerHistoryComposerDescription = portal.querySelector('[data-register-history-composer-description]');
  const registerHistoryPrimaryLabel = portal.querySelector('[data-register-history-primary-label]');
  const registerHistoryManualInput = portal.querySelector('[data-register-history-manual]');
  const registerHistoryManualCount = portal.querySelector('[data-register-history-manual-count]');
  const registerHistoryDateInput = portal.querySelector('[data-register-history-date]');
  const registerHistoryProviderLabel = portal.querySelector('[data-register-history-provider-label]');
  const registerHistoryProviderInput = portal.querySelector('[data-register-history-provider]');
  const registerHistoryNotesInput = portal.querySelector('[data-register-history-notes]');
  const registerHistoryNotesCount = portal.querySelector('[data-register-history-notes-count]');
  const registerHistoryCollapse = portal.querySelector('[data-register-history-collapse]');
  const registerHistoryPhotoPick = portal.querySelector('[data-register-history-photo-pick]');
  const registerHistoryPhotoInput = portal.querySelector('[data-register-history-photo-input]');
  const registerHistoryFilePick = portal.querySelector('[data-register-history-file-pick]');
  const registerHistoryFileInput = portal.querySelector('[data-register-history-file-input]');
  const registerHistoryPhotoPreview = portal.querySelector('[data-register-history-photo-preview]');
  const registerHistoryPhotoPreviewImage = portal.querySelector('[data-register-history-photo-preview-image]');
  const registerHistoryPhotoPreviewName = portal.querySelector('[data-register-history-photo-preview-name]');
  const registerHistoryFileType = portal.querySelector('[data-register-history-file-type]');
  const registerHistoryPhotoClear = portal.querySelector('[data-register-history-photo-clear]');
  const registerHistorySubmit = portal.querySelector('[data-register-history-submit]');
  const registerHistoryFeedback = portal.querySelector('[data-register-history-feedback]');
  const registerValueInput = document.querySelector('[data-register-value]');
  const registerValueLabel = document.querySelector('[data-register-value-label]');
  const registerUnit = document.querySelector('[data-register-unit]');
  const registerDateInput = document.querySelector('[data-register-date]');
  const registerCustomWrap = document.querySelector('[data-register-custom-wrap]');
  const registerNotesInput = document.querySelector('[data-register-notes]');
  const registerNotesCount = document.querySelector('[data-register-notes-count]');
  const registerAttachmentPick = document.querySelector('[data-register-attachment-pick]');
  const registerAttachmentInput = document.querySelector('[data-register-attachment-input]');
  const registerFilePick = document.querySelector('[data-register-file-pick]');
  const registerFileInput = document.querySelector('[data-register-file-input]');
  const registerAttachmentName = document.querySelector('[data-register-attachment-name]');
  const registerUploadedCard = document.querySelector('[data-register-uploaded]');
  const registerUploadedFileName = document.querySelector('[data-register-file-name]');
  const registerUploadedFileSize = document.querySelector('[data-register-file-size]');
  const registerUploadedFileType = document.querySelector('[data-register-file-type]');
  const registerUploadedPreview = document.querySelector('[data-register-uploaded-preview]');
  const registerUploadedPreviewImage = document.querySelector('[data-register-uploaded-preview-image]');
  const registerAttachmentChange = document.querySelector('[data-register-attachment-change]');
  const registerAttachmentClear = document.querySelector('[data-register-attachment-clear]');
  const registerTranscriptCard = document.querySelector('[data-register-transcript-card]');
  const registerTranscriptInput = document.querySelector('[data-register-transcript]');
  const registerTranscriptEdit = document.querySelector('[data-register-transcript-edit]');
  const registerAttachmentCategoryWrap = document.querySelector('[data-register-attachment-category-wrap]');
  const registerAttachmentCategoryInput = document.querySelector('[data-register-attachment-category]');
  const registerSuccess = document.querySelector('[data-register-success]');
  const registerSelectedTitle = document.querySelector('[data-register-selected-title]');
  const registerSelectedIcon = document.querySelector('[data-register-selected-icon]');
  const registerImageDialog = portal.querySelector('[data-register-image-dialog]');
  const registerImageTitle = portal.querySelector('[data-register-image-title]');
  const registerImageStages = [...portal.querySelectorAll('[data-register-image-stage]')];
  const registerImageFileName = portal.querySelector('[data-register-image-file-name]');
  const registerSavedScreens = [...portal.querySelectorAll('[data-register-saved-screen]')];
  const historyScopes = [...portal.querySelectorAll('[data-clinical-history]')];
  const registerIconVersion = '20261013-health-icons';
  const registerMetricImageSrc = src => src
    ? `${src}${src.includes('?') ? '&' : '?'}v=${registerIconVersion}`
    : '';
  const registerMetricConfig = {
    water: { label: 'Agua', image: '/images/health-icons/parameters/01_agua.png', icon: '&#9676;', unit: 'L', inputType: 'number', step: '0.1', placeholder: 'Meta sugerida: 2.5 L' },
    steps: { label: 'Pasos', image: '/images/health-icons/parameters/02_pasos.png', icon: '&#8961;', unit: 'pasos', inputType: 'number', step: '1', placeholder: 'Ej. 8000' },
    sleep: { label: 'Sueño', image: '/images/health-icons/parameters/03_sueno.png', icon: '&#9684;', unit: 'h', inputType: 'number', step: '0.1', placeholder: 'Ej. 7.5' },
    rest: { label: 'Descanso', image: '/images/health-icons/parameters/04_descanso.png', icon: '&#9684;', unit: 'h', inputType: 'number', step: '0.1', placeholder: 'Ej. 8' },
    weight: { label: 'Peso', image: '/images/health-icons/parameters/05_peso.png', icon: '&#9635;', unit: 'kg', inputType: 'number', step: '0.1', placeholder: 'Ej. 72.4' },
    pressure: { label: 'Presión', image: '/images/health-icons/parameters/06_presion.png', icon: '&#9825;', unit: 'mmHg', inputType: 'text', step: '', placeholder: 'Ej. 120/80' },
    glucose: { label: 'Glucosa', image: '/images/health-icons/parameters/07_glucosa.png', icon: '&#9826;', unit: 'mg/dL', inputType: 'number', step: '0.1', placeholder: 'Ej. 92' },
    ph: { label: 'PH', image: '/images/health-icons/parameters/08_ph.png', icon: '&#9676;', unit: 'pH', inputType: 'number', step: '0.1', placeholder: 'Ej. 7.4' },
    medication: { label: 'Medicamentos', image: '/images/health-icons/parameters/09_medicamentos.png', icon: '&#9877;', unit: '', inputType: 'text', step: '', placeholder: 'Ej. Metformina 500 mg' },
    nutrition: { label: 'Alimentos', image: '/images/health-icons/parameters/10_alimentos.png', icon: '&#9671;', unit: '', inputType: 'text', step: '', placeholder: 'Ej. Desayuno alto en proteína' },
    calories: { label: 'Calorías', image: '/images/health-icons/parameters/11_calorias.png', icon: '&#9672;', unit: 'kcal', inputType: 'number', step: '1', placeholder: 'Ej. 1850' },
    activity: { label: 'Ejercicio', image: '/images/health-icons/parameters/12_ejercicio.png', icon: '&#10022;', unit: 'min', inputType: 'number', step: '1', placeholder: 'Ej. 45' },
    meditation: { label: 'Meditación', image: '/images/health-icons/parameters/13_meditacion.png', icon: '&#10003;', unit: 'min', inputType: 'number', step: '1', placeholder: 'Ej. 15' },
    menstrualCycle: { label: 'Ciclo menstrual', image: '/images/health-icons/parameters/14_ciclo_menstrual.png', icon: '&#9792;', unit: '', inputType: 'text', step: '', placeholder: 'Ej. Día 12 / fase folicular' },
    fertility: { label: 'Fertilidad', image: '/images/health-icons/parameters/15_fertilidad.png', icon: '&#9825;', unit: '', inputType: 'text', step: '', placeholder: 'Ej. Ventana fértil / prueba negativa' },
    laboratory: { label: 'Análisis de laboratorio', image: '/images/health-icons/parameters/16_analisis_laboratorio.png', icon: '&#9879;', unit: '', inputType: 'text', step: '', placeholder: 'Ej. Biometría hemática' },
    studies: { label: 'Estudios', image: '/images/health-icons/parameters/17_estudios.png', icon: '&#9635;', unit: '', inputType: 'text', step: '', placeholder: 'Ej. Ultrasonido abdominal' },
    prescriptions: { label: 'Recetas', image: '/images/health-icons/parameters/18_recetas.png', icon: '&#9877;', unit: '', inputType: 'text', step: '', placeholder: 'Ej. Receta de control' },
    hospitalization: { label: 'Hospitalización', image: '/images/health-icons/parameters/19_hospitalizacion.png', icon: '&#9873;', unit: '', inputType: 'text', step: '', placeholder: 'Ej. Ingreso / egreso hospitalario' },
    vaccines: { label: 'Vacunas', image: '/images/health-icons/parameters/20_vacunas.png', icon: '&#10003;', unit: '', inputType: 'text', step: '', placeholder: 'Ej. Influenza 2026' },
    manualRegister: { label: 'Registro manual', image: '/images/health-icons/parameters/21_registro_manual.png', icon: '+', unit: '', inputType: 'text', step: '', placeholder: 'Ingresa el valor o detalle' },
    mood: { label: 'Ánimo', image: '/images/health-icons/parameters/22_animo.png', icon: '&#9786;', unit: '/5', inputType: 'number', step: '1', placeholder: 'Ej. 4' },
    temperature: { label: 'Temperatura', image: '/images/health-icons/parameters/23_temperatura.png', icon: '&#8451;', unit: 'C', inputType: 'number', step: '0.1', placeholder: 'Ej. 36.7' },
    oxygen: { label: 'Oxígeno', image: '/images/health-icons/parameters/24_oxigeno.png', icon: '&#9711;', unit: '%', inputType: 'number', step: '1', placeholder: 'Ej. 98' },
    heartRate: { label: 'Frecuencia', image: '/images/health-icons/parameters/25_frecuencia.png', icon: '&#9825;', unit: 'lpm', inputType: 'number', step: '1', placeholder: 'Ej. 72' },
    pain: { label: 'Dolor', image: '/images/health-icons/parameters/26_dolor.png', icon: '&#9675;', unit: '/10', inputType: 'number', step: '1', placeholder: 'Ej. 3' },
    symptoms: { label: 'Síntomas', image: '/images/health-icons/parameters/27_sintomas.png', icon: '&#8942;', unit: '', inputType: 'text', step: '', placeholder: 'Ej. Dolor de cabeza leve' },
    note: { label: 'Nota personal', image: '/images/health-icons/parameters/28_nota_personal.png', icon: '+', unit: '', inputType: 'text', step: '', placeholder: 'Ej. Me sentí con más energía' },
    custom: { label: 'Personalizado', image: '/images/health-icons/parameters/29_personalizado.png', icon: '+', unit: '', inputType: 'text', step: '', placeholder: 'Ingresa el valor' },
  };
  const registerMetricViewConfig = {
    water: { valueLabel: 'Litros de agua' },
    steps: { description: 'Captura tus pasos o actividad caminada.', meta: 'Registro manual de movimiento', valueLabel: 'Cantidad de pasos' },
    sleep: { description: 'Anota las horas reales de sueño.', meta: 'Registro manual de sueño', valueLabel: 'Horas de sueño' },
    rest: { description: 'Registra la calidad o duración de tu descanso.', meta: 'Registro manual de descanso', valueLabel: 'Descanso registrado' },
    weight: { description: 'Guarda tu peso corporal actualizado.', meta: 'Registro manual de peso', valueLabel: 'Peso registrado' },
    pressure: { description: 'Registra tu lectura de presión arterial.', meta: 'Formato sugerido: 120/80', valueLabel: 'Presión arterial' },
    glucose: { description: 'Captura tu lectura de glucosa capilar.', meta: 'Registro manual en mg/dL', valueLabel: 'Nivel de glucosa' },
    ph: { description: 'Guarda una lectura de pH relevante para tu seguimiento.', meta: 'Registro manual de pH', valueLabel: 'Lectura de pH' },
    mood: { description: 'Marca como te sientes hoy.', meta: 'Escala sugerida de 1 a 5', valueLabel: 'Estado de animo' },
    medication: { description: 'Anota medicamentos, dosis o tomas del dia.', meta: 'Registro manual de tratamiento', valueLabel: 'Medicamento o dosis' },
    activity: { description: 'Registra ejercicio, caminata o actividad física.', meta: 'Registro manual en minutos', valueLabel: 'Tiempo de actividad' },
    calories: { description: 'Captura una estimación de calorías consumidas.', meta: 'Registro manual de nutrición', valueLabel: 'Calorías' },
    temperature: { description: 'Guarda una lectura de temperatura corporal.', meta: 'Registro manual en C', valueLabel: 'Temperatura' },
    oxygen: { description: 'Registra tu saturación de oxígeno.', meta: 'Registro manual en porcentaje', valueLabel: 'Oxígeno en sangre' },
    heartRate: { description: 'Captura tu frecuencia cardiaca.', meta: 'Registro manual en lpm', valueLabel: 'Frecuencia cardiaca' },
    pain: { description: 'Indica el nivel de dolor percibido.', meta: 'Escala sugerida de 0 a 10', valueLabel: 'Nivel de dolor' },
    symptoms: { description: 'Describe síntomas relevantes del día.', meta: 'Registro manual de síntomas', valueLabel: 'Síntomas' },
    nutrition: { description: 'Anota alimentación, comidas o adherencia nutricional.', meta: 'Registro manual de alimentos', valueLabel: 'Detalle de alimentos' },
    meditation: { description: 'Captura minutos de meditación o respiración.', meta: 'Registro manual de bienestar', valueLabel: 'Minutos de práctica' },
    menstrualCycle: { description: 'Registra fase, día del ciclo o notas menstruales.', meta: 'Registro manual de ciclo menstrual', valueLabel: 'Detalle del ciclo' },
    fertility: { description: 'Guarda información relacionada con fertilidad.', meta: 'Registro manual de fertilidad', valueLabel: 'Detalle de fertilidad' },
    laboratory: { description: 'Anota resultados o seguimiento de laboratorio.', meta: 'Registro manual de laboratorio', valueLabel: 'Resultado o estudio' },
    studies: { description: 'Registra estudios clínicos o de imagen.', meta: 'Registro manual de estudios', valueLabel: 'Detalle del estudio' },
    prescriptions: { description: 'Captura una receta o indicación médica relevante.', meta: 'Registro manual de recetas', valueLabel: 'Detalle de receta' },
    hospitalization: { description: 'Anota información de hospitalización.', meta: 'Registro manual hospitalario', valueLabel: 'Detalle hospitalario' },
    vaccines: { description: 'Registra vacunas aplicadas o pendientes.', meta: 'Registro manual de vacunas', valueLabel: 'Vacuna' },
    manualRegister: { description: 'Crea un registro libre dentro de tus parámetros.', meta: 'Registro manual libre', valueLabel: 'Valor o detalle' },
    note: { description: 'Guarda una nota personal de salud.', meta: 'Registro manual libre', valueLabel: 'Nota' },
    custom: { description: 'Crea un registro manual con el parametro que necesites.', meta: 'Registro manual personalizado', valueLabel: 'Valor' },
  };
  const registerAttachmentCategoryConfig = {
    consultation: {
      label: 'Consulta médica',
      historyFilter: 'consultation',
      service: 'Consulta médica',
      parameterService: 'Parámetro de consulta médica',
      description: 'Registro rápido de consulta médica.',
      primaryLabel: 'Motivo o resumen de consulta',
      primaryPlaceholder: 'Escribe motivo, diagnóstico o indicación relevante...',
      providerLabel: 'Médico',
      providerPlaceholder: 'Selecciona el médico',
      providerOptions: ['Dr. Carter Jimmy', 'Dra. Ana Sofía Ramírez', 'Registro personal'],
      defaultSource: 'Registro de consulta',
    },
    laboratory: {
      label: 'Análisis de laboratorio',
      historyFilter: 'laboratory',
      service: 'Resultados de laboratorio',
      parameterService: 'Parámetro de laboratorio',
      description: 'Registro rápido de laboratorio.',
      primaryLabel: 'Resultado o estudio',
      primaryPlaceholder: 'Escribe el resultado o estudio de laboratorio...',
      providerLabel: 'Laboratorio',
      providerPlaceholder: 'Selecciona el laboratorio',
      providerOptions: ['Laboratorio Central', 'Centro Biotecnológico', 'Hospital General Norte', 'Registro personal'],
      defaultSource: 'Registro de laboratorio',
    },
    study: {
      label: 'Estudios',
      historyFilter: 'study',
      service: 'Estudio clínico',
      parameterService: 'Parámetro de estudio clínico',
      description: 'Registro rápido de estudios.',
      primaryLabel: 'Detalle del estudio',
      primaryPlaceholder: 'Escribe el tipo de estudio o hallazgo...',
      providerLabel: 'Centro o especialista',
      providerPlaceholder: 'Selecciona el origen',
      providerOptions: ['Centro de Imagen Diagnóstica', 'Hospital General Norte', 'Especialista externo', 'Registro personal'],
      defaultSource: 'Registro de estudio',
    },
    prescription: {
      label: 'Recetas',
      historyFilter: 'prescription',
      service: 'Documento de receta',
      parameterService: 'Parámetro relacionado a receta',
      description: 'Registro rápido de receta.',
      primaryLabel: 'Detalle de receta',
      primaryPlaceholder: 'Escribe medicamento, dosis o indicación...',
      providerLabel: 'Médico',
      providerPlaceholder: 'Selecciona el médico',
      providerOptions: ['Dr. Carter Jimmy', 'Dra. Ana Sofía Ramírez', 'Registro personal'],
      defaultSource: 'Registro de receta',
    },
    hospitalization: {
      label: 'Hospitalización',
      historyFilter: 'hospitalization',
      service: 'Documento hospitalario',
      parameterService: 'Parámetro hospitalario',
      description: 'Registro rápido hospitalario.',
      primaryLabel: 'Motivo de hospitalización',
      primaryPlaceholder: 'Escribe el motivo o resumen hospitalario...',
      providerLabel: 'Hospital',
      providerPlaceholder: 'Selecciona el hospital',
      providerOptions: ['Hospital General Norte', 'Hospital Integral Sur', 'Clínica externa', 'Registro personal'],
      defaultSource: 'Registro hospitalario',
    },
    manual: {
      label: 'Registro manual',
      historyFilter: 'manual',
      service: 'Adjunto de registro manual',
      parameterService: 'Registro manual de parámetro',
      description: 'Registro rápido manual.',
      primaryLabel: 'Detalle del registro',
      primaryPlaceholder: 'Escribe aquí el registro manual...',
      providerLabel: 'Origen',
      providerPlaceholder: 'Selecciona el origen',
      providerOptions: ['Paciente', 'Cuidador', 'Registro personal'],
      defaultSource: 'Registro manual',
    },
    vaccine: {
      label: 'Vacunas',
      historyFilter: 'vaccine',
      service: 'Cartilla o comprobante de vacuna',
      parameterService: 'Parámetro de vacunación',
      description: 'Registro rápido de vacuna.',
      primaryLabel: 'Vacuna',
      primaryPlaceholder: 'Escribe vacuna, lote o aplicación...',
      providerLabel: 'Centro de vacunación',
      providerPlaceholder: 'Selecciona el origen',
      providerOptions: ['Centro de vacunación', 'Hospital General Norte', 'Farmacia', 'Registro personal'],
      defaultSource: 'Registro de vacuna',
    },
  };
  const aiTopForm = portal.querySelector('[data-ai-top-form]');
  const aiTopInput = portal.querySelector('[data-ai-top-input]');
  const aiChatPanel = portal.querySelector('[data-ai-chat-panel]');
  const aiChatMessages = portal.querySelector('[data-ai-chat-messages]');
  const aiChatForm = portal.querySelector('[data-ai-chat-form]');
  const aiChatInput = portal.querySelector('[data-ai-chat-input]');
  const aiQuickActions = ['Consultar estudios', 'Mis medicamentos', 'Laboratorios', 'Recetas', 'Ver historial', 'Programar cita'];
  const loadAiConversation = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(activeAiChatStorageKey()) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      return [];
    }
  };
  let aiConversation = loadAiConversation();
  const escapeAiText = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
  const aiTimeLabel = () => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const saveAiConversation = () => {
    localStorage.setItem(activeAiChatStorageKey(), JSON.stringify(aiConversation.slice(-40)));
  };
  const normalizeAiPrompt = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const renderAiConversation = () => {
    if (!aiChatMessages) return;
    aiChatMessages.innerHTML = aiConversation.map(message => {
      const isUser = message.role === 'user';
      return `
        <article class="patient-ai-message ${isUser ? 'is-user' : 'is-assistant'}">
          ${isUser ? '' : '<span class="patient-ai-avatar" aria-hidden="true">✦✦</span>'}
          <div class="patient-ai-bubble">
            <p>${escapeAiText(message.text)}</p>
          </div>
          <time>${escapeAiText(message.time || '')}</time>
        </article>
      `;
    }).join('');
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
  };
  const openAiChat = () => {
    if (!aiChatPanel) return;
    aiChatPanel.hidden = false;
    aiChatPanel.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      aiChatPanel.classList.add('is-open');
      renderAiConversation();
      aiChatInput?.focus({ preventScroll: true });
    });
  };
  const closeAiChat = () => {
    if (!aiChatPanel) return;
    if (aiTopInput) aiTopInput.value = '';
    aiChatPanel.classList.remove('is-open');
    aiChatPanel.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => {
      if (!aiChatPanel.classList.contains('is-open')) aiChatPanel.hidden = true;
    }, 280);
  };
  const buildAiResponse = prompt => {
    const normalized = normalizeAiPrompt(prompt);
    if (normalized.includes('consulta') || normalized.includes('cita') || normalized.includes('proxima')) {
      return {
        text: 'Tu próxima consulta médica es el viernes 15 de agosto de 2026 a las 10:00 a. m. con la Dra. Laura Martínez, en Centro Biotecnológico.',
      };
    }
    if (normalized.includes('receta') || normalized.includes('medicamento')) {
      return {
        text: 'Puedo ayudarte a revisar tus recetas y medicamentos activos. También puedo llevarte al historial para ver indicaciones anteriores.',
      };
    }
    if (normalized.includes('estudio') || normalized.includes('laboratorio')) {
      return {
        text: 'Tus estudios y laboratorios se consultan desde el expediente. Puedo ayudarte a filtrar los registros clínicos o abrir análisis clínicos.',
      };
    }
    if (normalized.includes('historial') || normalized.includes('expediente')) {
      return {
        text: 'Tu historial clínico reúne consultas, estudios, recetas, hospitalizaciones y registros manuales.',
      };
    }
    return {
      text: 'Listo. Te puedo ayudar con consultas, recetas, estudios, dispositivos, pagos, comunidades o registros manuales.',
      chips: aiQuickActions,
    };
  };
  const sendAiMessage = (value, options = {}) => {
    const text = String(value || '').trim();
    if (!text) return;
    aiConversation.push({ role: 'user', text, time: aiTimeLabel() });
    saveAiConversation();
    openAiChat();
    renderAiConversation();
    if (options.clearTop !== false && aiTopInput) aiTopInput.value = text;
    if (aiChatInput) aiChatInput.value = '';
    window.setTimeout(() => {
      const response = buildAiResponse(text);
      aiConversation.push({ role: 'assistant', text: response.text, time: aiTimeLabel() });
      saveAiConversation();
      renderAiConversation();
    }, 260);
  };
  const registerDateValue = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };
  const registerMetricOrder = Object.keys(registerMetricConfig);
  const defaultRegisterFavorites = ['water', 'steps', 'sleep', 'medication', 'activity'];
  const escapeRegisterText = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
  const normalizeRegisterFavorites = values => [...new Set((Array.isArray(values) ? values : []).filter(type => registerMetricConfig[type]))];
  const loadRegisterFavorites = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(activeRegisterFavoriteStorageKey()) || 'null');
      const normalized = normalizeRegisterFavorites(saved);
      return normalized.length ? normalized : defaultRegisterFavorites;
    } catch (error) {
      return defaultRegisterFavorites;
    }
  };
  let registerFavoriteMetrics = loadRegisterFavorites();
  const saveRegisterFavorites = () => {
    localStorage.setItem(activeRegisterFavoriteStorageKey(), JSON.stringify(registerFavoriteMetrics));
  };
  const normalizeRegisterHistoryFavorites = values => [...new Set((Array.isArray(values) ? values : []).filter(key => registerAttachmentCategoryConfig[key]))];
  const loadRegisterHistoryFavorites = () => {
    try {
      return normalizeRegisterHistoryFavorites(JSON.parse(localStorage.getItem(activeRegisterHistoryFavoriteStorageKey()) || '[]'));
    } catch (error) {
      return [];
    }
  };
  let registerFavoriteHistoryCategories = loadRegisterHistoryFavorites();
  const saveRegisterHistoryFavorites = () => {
    localStorage.setItem(activeRegisterHistoryFavoriteStorageKey(), JSON.stringify(registerFavoriteHistoryCategories));
  };
  const healthMetricOrder = [
    'water',
    'sleep',
    'steps',
    'weight',
    'medication',
    'glucose',
    'pressure',
    'activity',
    'nutrition',
    'calories',
    'rest',
    'temperature',
    'oxygen',
    'heartRate',
    'ph',
    'meditation',
    'menstrualCycle',
    'fertility',
    'laboratory',
    'studies',
    'prescriptions',
    'hospitalization',
    'vaccines',
    'manualRegister',
  ].filter(type => registerMetricConfig[type]);
  const healthMetricTone = {
    water: 'is-blue',
    sleep: 'is-purple',
    rest: 'is-blue',
    steps: 'is-green',
    activity: 'is-green',
    meditation: 'is-purple',
    weight: 'is-green',
    nutrition: 'is-green',
    calories: 'is-orange',
    medication: 'is-red',
    glucose: 'is-orange',
    ph: 'is-blue',
    pressure: 'is-rose',
    temperature: 'is-orange',
    oxygen: 'is-blue',
    heartRate: 'is-rose',
    menstrualCycle: 'is-rose',
    fertility: 'is-rose',
    laboratory: 'is-green',
    studies: 'is-purple',
    prescriptions: 'is-orange',
    hospitalization: 'is-red',
    vaccines: 'is-teal',
    manualRegister: 'is-teal',
  };
  const healthRangeDates = {
    day: ['2026-08-27', '2026-08-27'],
    week: ['2026-08-21', '2026-08-27'],
    month: ['2026-08-01', '2026-08-31'],
    year: ['2026-01-01', '2026-12-31'],
  };
  const healthDefaultBars = {
    day: [
      ['7a', 28], ['9a', 46], ['11a', 38], ['1p', 63], ['3p', 52], ['5p', 78], ['7p', 58], ['9p', 68],
    ],
    week: [
      ['Lun', 70], ['Mar', 54], ['Mie', 82], ['Jue', 66], ['Vie', 74], ['Sab', 48], ['Dom', 60],
    ],
    month: [
      ['1', 62], ['4', 78], ['7', 56], ['10', 70], ['13', 84], ['16', 64], ['19', 72], ['22', 80], ['25', 60], ['28', 76], ['31', 68],
    ],
    year: [
      ['Ene', 62], ['Feb', 58], ['Mar', 72], ['Abr', 66], ['May', 78], ['Jun', 69], ['Jul', 74], ['Ago', 82], ['Sep', 0], ['Oct', 0], ['Nov', 0], ['Dic', 0],
    ],
    custom: [
      ['Inicio', 64], ['2', 78], ['3', 70], ['4', 86], ['5', 72], ['Fin', 80],
    ],
  };
  const healthMetricAnalytics = {
    water: {
      unitLabel: 'Litros (L)',
      goalLabel: 'Meta 2.5 L',
      stats: [
        ['Hoy', '1.6 L', '&#9676;'],
        ['Meta', '2.5 L', '&#9673;'],
        ['Cumplimiento', '64%', '&#9681;'],
        ['Promedio semanal', '1.8 L', '&#9603;'],
      ],
      history: [
        ['12 ago 2026', '08:30 a. m.', '500 ml'],
        ['12 ago 2026', '12:45 p. m.', '350 ml'],
        ['12 ago 2026', '04:20 p. m.', '400 ml'],
        ['11 ago 2026', '07:50 p. m.', '500 ml'],
      ],
      insights: [
        ['Has mejorado', '12% respecto a la semana anterior'],
        ['Mejor cumplimiento', 'lun y jue'],
      ],
    },
    steps: {
      unitLabel: 'Pasos',
      goalLabel: 'Meta 8,000',
      stats: [
        ['Hoy', '6,240', '&#8961;'],
        ['Meta', '8,000', '&#9673;'],
        ['Cumplimiento', '78%', '&#9681;'],
        ['Promedio semanal', '7,180', '&#9603;'],
      ],
      history: [
        ['27 ago 2026', '06:40 p. m.', '6,240 pasos'],
        ['26 ago 2026', '09:15 p. m.', '8,120 pasos'],
        ['25 ago 2026', '08:10 p. m.', '7,540 pasos'],
      ],
      insights: [
        ['Racha activa', '4 dias con movimiento registrado'],
        ['Pico de actividad', 'entre 6 p. m. y 8 p. m.'],
      ],
    },
    sleep: {
      unitLabel: 'Horas',
      goalLabel: 'Meta 7.5 h',
      stats: [
        ['Ultima noche', '7h 20m', '&#9684;'],
        ['Meta', '7.5 h', '&#9673;'],
        ['Cumplimiento', '92%', '&#9681;'],
        ['Promedio semanal', '7h 05m', '&#9603;'],
      ],
      history: [
        ['27 ago 2026', '07:10 a. m.', '7h 20m'],
        ['26 ago 2026', '07:00 a. m.', '6h 45m'],
        ['25 ago 2026', '06:50 a. m.', '7h 35m'],
      ],
      insights: [
        ['Buen descanso', 'la meta se mantiene estable'],
        ['Dia mas constante', 'martes'],
      ],
    },
    medication: {
      unitLabel: 'Tomas',
      goalLabel: 'Adherencia 100%',
      stats: [
        ['Hoy', '2/3', '&#9877;'],
        ['Pendiente', '1 toma', '&#9673;'],
        ['Adherencia', '82%', '&#9681;'],
        ['Semana', '14 tomas', '&#9603;'],
      ],
      history: [
        ['27 ago 2026', '08:00 a. m.', 'Metformina 500 mg'],
        ['27 ago 2026', '02:00 p. m.', 'Vitamina D'],
        ['26 ago 2026', '08:00 p. m.', 'Losartan 50 mg'],
      ],
      insights: [
        ['Recordatorio util', 'programa alerta para la toma nocturna'],
        ['Adherencia', 'mejor que la semana pasada'],
      ],
    },
    glucose: {
      unitLabel: 'mg/dL',
      goalLabel: 'Rango 70-100',
      stats: [
        ['Ultima lectura', '92', '&#9826;'],
        ['Promedio', '96', '&#9673;'],
        ['En rango', '86%', '&#9681;'],
        ['Lecturas', '12', '&#9603;'],
      ],
      history: [
        ['27 ago 2026', '07:40 a. m.', '92 mg/dL'],
        ['26 ago 2026', '08:05 a. m.', '98 mg/dL'],
        ['25 ago 2026', '07:55 a. m.', '95 mg/dL'],
      ],
      insights: [
        ['Estable', 'sin picos relevantes esta semana'],
        ['Mejor horario', 'ayuno matutino'],
      ],
    },
    pressure: {
      unitLabel: 'mmHg',
      goalLabel: 'Objetivo 120/80',
      stats: [
        ['Ultima lectura', '115/75', '&#9825;'],
        ['Promedio', '118/77', '&#9673;'],
        ['En rango', '90%', '&#9681;'],
        ['Lecturas', '8', '&#9603;'],
      ],
      history: [
        ['27 ago 2026', '08:15 a. m.', '115/75 mmHg'],
        ['26 ago 2026', '08:20 a. m.', '120/78 mmHg'],
        ['25 ago 2026', '08:10 a. m.', '118/76 mmHg'],
      ],
      insights: [
        ['Control adecuado', 'lecturas dentro de objetivo'],
        ['Consistencia', 'mejor por la manana'],
      ],
    },
    activity: {
      unitLabel: 'Minutos',
      goalLabel: 'Meta 45 min',
      stats: [
        ['Hoy', '38 min', '&#10022;'],
        ['Meta', '45 min', '&#9673;'],
        ['Cumplimiento', '84%', '&#9681;'],
        ['Semana', '220 min', '&#9603;'],
      ],
      history: [
        ['27 ago 2026', '06:30 p. m.', '38 min'],
        ['26 ago 2026', '07:00 p. m.', '45 min'],
        ['25 ago 2026', '06:45 p. m.', '30 min'],
      ],
      insights: [
        ['Buen ritmo', 'estas cerca de la meta diaria'],
        ['Tendencia', 'subio 9% esta semana'],
      ],
    },
    weight: {
      unitLabel: 'kg',
      goalLabel: 'Seguimiento',
      stats: [
        ['Actual', '72.4 kg', '&#9635;'],
        ['Cambio mensual', '-0.8 kg', '&#9673;'],
        ['Registros', '6', '&#9681;'],
        ['Promedio', '72.9 kg', '&#9603;'],
      ],
      history: [
        ['27 ago 2026', '07:30 a. m.', '72.4 kg'],
        ['20 ago 2026', '07:35 a. m.', '72.8 kg'],
        ['13 ago 2026', '07:20 a. m.', '73.1 kg'],
      ],
      insights: [
        ['Tendencia suave', 'cambio gradual y estable'],
        ['Mejor dia de registro', 'jueves'],
      ],
    },
  };
  let activeHealthMetric = 'water';
  let activeHealthRange = 'month';
  let activeHealthView = 'favorites';
  let activeHealthSection = 'parameters';
  let healthDashboardRendered = false;
  const getHealthFavoriteOrder = () => normalizeRegisterFavorites(registerFavoriteMetrics).filter(type => healthMetricOrder.includes(type));
  const renderHealthMetricIcon = (type, className = 'patient-health-parameter-image') => {
    const config = registerMetricConfig[type] || registerMetricConfig.water;
    if (config.image) {
      return `<span class="${className}"><img src="${escapeRegisterText(registerMetricImageSrc(config.image))}" alt="" loading="lazy"></span>`;
    }
    return `<span class="${className} is-glyph">${config.icon || '+'}</span>`;
  };
  const getHealthMetricData = (type) => {
    const config = registerMetricConfig[type] || registerMetricConfig.water;
    const view = registerMetricViewConfig[type] || {};
    const fallbackStats = [
      ['Ultimo registro', config.placeholder?.replace(/^Ej\.?\s*/i, '') || 'Sin dato', config.icon || '+'],
      ['Unidad', config.unit || 'Libre', '&#9673;'],
      ['Registros', '0', '&#9681;'],
      ['Tendencia', 'Por iniciar', '&#9603;'],
    ];
    return {
      unitLabel: config.unit ? `${config.label} (${config.unit})` : config.label,
      goalLabel: view.valueLabel || 'Seguimiento',
      stats: fallbackStats,
      history: [
        ['Sin registros', 'Aun no hay datos', 'Agrega un registro rapido'],
      ],
      insights: [
        ['Nuevo parametro', 'cuando registres datos aparecera la tendencia'],
        ['Seguimiento', 'usa los rangos para revisar cambios'],
      ],
      ...healthMetricAnalytics[type],
    };
  };
  const getHealthRecords = (type) => {
    try {
      const records = JSON.parse(localStorage.getItem(activeRegisterStorageKey()) || '[]');
      return (Array.isArray(records) ? records : []).filter(record => record.metricType === type).slice(0, 5);
    } catch (error) {
      return [];
    }
  };
  const formatHealthRecordDate = value => {
    if (!value) return ['Sin fecha', ''];
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return [value, ''];
    return [
      parsed.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', ''),
      parsed.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    ];
  };
  const renderHealthMetricButton = type => {
    const config = registerMetricConfig[type] || registerMetricConfig.water;
    const favorite = registerFavoriteMetrics.includes(type);
    const active = activeHealthMetric === type;
    return `
      <button class="${healthMetricTone[type] || 'is-teal'} ${active ? 'is-active' : ''}" type="button" data-health-metric="${escapeRegisterText(type)}" aria-pressed="${active ? 'true' : 'false'}">
        <i class="${favorite ? 'is-favorite' : ''}" aria-hidden="true">${favorite ? '&#9733;' : '&#9734;'}</i>
        ${renderHealthMetricIcon(type)}
        <b>${escapeRegisterText(config.label)}</b>
      </button>
    `;
  };
  const syncHealthMetricButtons = () => {
    portal.querySelectorAll('[data-health-metric]').forEach(button => {
      const active = button.dataset.healthMetric === activeHealthMetric;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  };
  const renderHealthMetricRows = () => {
    const favorites = getHealthFavoriteOrder();
    if (healthFavorites) {
      healthFavorites.innerHTML = favorites.length
        ? favorites.map(renderHealthMetricButton).join('')
        : '<div class="patient-health-empty">Marca parametros favoritos en Registro rapido.</div>';
    }
    if (healthOptions) {
      healthOptions.innerHTML = healthMetricOrder.map(renderHealthMetricButton).join('');
    }
    syncHealthMetricButtons();
  };
  const setHealthMetricView = (view = 'favorites') => {
    activeHealthView = view === 'all' ? 'all' : 'favorites';
    healthMetricViewButtons.forEach(button => {
      const active = button.dataset.healthMetricView === activeHealthView;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.setAttribute('tabindex', active ? '0' : '-1');
    });
    healthMetricSections.forEach(section => {
      const active = section.dataset.healthMetricSection === activeHealthView;
      section.classList.toggle('is-active', active);
      section.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
  };
  const setHealthSection = (section = 'parameters') => {
    const nextSection = section === 'history' ? 'history' : 'parameters';
    if (nextSection === 'history') syncHistoryRowsVisibility();
    activeHealthSection = nextSection;
    if (healthViewSwitch) healthViewSwitch.dataset.activeView = activeHealthSection;
    healthViewButtons.forEach(button => {
      const active = button.dataset.healthViewMode === activeHealthSection;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.setAttribute('tabindex', active ? '0' : '-1');
    });
    healthViewPanels.forEach(panel => {
      const active = panel.dataset.healthViewPanel === activeHealthSection;
      panel.hidden = false;
      panel.classList.toggle('is-active', active);
      panel.setAttribute('aria-hidden', active ? 'false' : 'true');
      panel.toggleAttribute('inert', !active);
    });
  };
  const getHealthViewportPosition = () => ({
    top: window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0,
    left: window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft || 0,
  });
  const preserveHealthViewport = (callback, position = null) => {
    const { top, left } = position || getHealthViewportPosition();
    callback();
    const restore = () => {
      window.scrollTo(left, top);
      try { document.documentElement.scrollTop = top; } catch (error) {}
      try { document.body.scrollTop = top; } catch (error) {}
    };
    restore();
    requestAnimationFrame(restore);
    window.setTimeout(restore, 80);
  };
  const setHealthRange = (range = 'month', options = {}) => {
    activeHealthRange = ['day', 'week', 'month', 'year', 'custom'].includes(range) ? range : 'month';
    healthRangeTabs?.querySelectorAll('[data-health-range]').forEach(button => {
      const active = button.dataset.healthRange === activeHealthRange;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (activeHealthRange !== 'custom' && healthRangeDates[activeHealthRange]) {
      const [from, to] = healthRangeDates[activeHealthRange];
      if (healthDateFrom) healthDateFrom.value = from;
      if (healthDateTo) healthDateTo.value = to;
    }
    if (options.render !== false) preserveHealthViewport(() => renderHealthMetricDetail(activeHealthMetric, { keepRange: true, scroll: false }));
  };
  const renderHealthChart = data => {
    if (!healthChart) return;
    const bars = healthDefaultBars[activeHealthRange] || healthDefaultBars.month;
    const max = Math.max(100, ...bars.map(item => Number(item[1]) || 0));
    healthChart.innerHTML = bars.map(([label, value]) => {
      const height = Math.max(8, Math.round(((Number(value) || 0) / max) * 100));
      return `<span class="patient-health-chart-bar" style="--bar:${height}%"><i></i><b>${escapeRegisterText(label)}</b></span>`;
    }).join('');
    if (healthChartUnit) healthChartUnit.textContent = data.unitLabel;
    if (healthChartGoal) healthChartGoal.textContent = data.goalLabel;
  };
  const renderHealthHistory = (type, data) => {
    if (!healthHistoryList) return;
    const manualRecords = getHealthRecords(type);
    const rows = manualRecords.length
      ? manualRecords.map(record => {
        const [date, time] = formatHealthRecordDate(record.recordedAt);
        const value = `${record.value || 'Sin valor'}${record.unit ? ` ${record.unit}` : ''}`;
        return [date, time || 'Registro manual', value];
      })
      : data.history;
    healthHistoryList.innerHTML = rows.map(row => `
      <article class="patient-health-history-row">
        <span aria-hidden="true">&#9638;</span>
        <strong>${escapeRegisterText(row[0])}</strong>
        <small>${escapeRegisterText(row[1])}</small>
        <b>${escapeRegisterText(row[2])}</b>
      </article>
    `).join('');
  };
  const renderHealthInsights = data => {
    if (!healthInsights) return;
    healthInsights.innerHTML = data.insights.map(item => `
      <article class="patient-health-insight-row">
        <span aria-hidden="true">&#8599;</span>
        <div><strong>${escapeRegisterText(item[0])}</strong><p>${escapeRegisterText(item[1])}</p></div>
      </article>
    `).join('');
  };
  const renderHealthMetricDetail = (type = 'water', options = {}) => {
    if (!registerMetricConfig[type]) type = 'water';
    activeHealthMetric = type;
    if (!options.keepRange) setHealthRange(activeHealthRange, { render: false });
    const config = registerMetricConfig[type] || registerMetricConfig.water;
    const data = getHealthMetricData(type);
    if (healthDetailTitle) healthDetailTitle.textContent = config.label;
    if (healthDetailIcon) healthDetailIcon.innerHTML = renderHealthMetricIcon(type, 'patient-health-detail-image');
    if (healthStatGrid) {
      healthStatGrid.innerHTML = data.stats.map(stat => `
        <article class="patient-health-stat">
          <span aria-hidden="true">${stat[2]}</span>
          <small>${escapeRegisterText(stat[0])}</small>
          <strong>${escapeRegisterText(stat[1])}</strong>
        </article>
      `).join('');
    }
    renderHealthChart(data);
    renderHealthHistory(type, data);
    renderHealthInsights(data);
    syncHealthMetricButtons();
    if (options.scroll === true) {
      portal.querySelector('[data-health-detail]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };
  const renderHealthDashboard = () => {
    if (!healthDashboard) return;
    const favorites = getHealthFavoriteOrder();
    if (!registerMetricConfig[activeHealthMetric]) activeHealthMetric = favorites[0] || 'water';
    if (!healthDashboardRendered && activeHealthView === 'favorites' && favorites.length && !favorites.includes(activeHealthMetric)) {
      activeHealthMetric = favorites[0];
    }
    renderHealthMetricRows();
    setHealthMetricView(activeHealthView);
    renderHealthMetricDetail(activeHealthMetric, { scroll: false, keepRange: healthDashboardRendered });
    healthDashboardRendered = true;
  };
  const bindHealthCarousel = track => {
    if (!track) return;
    let isPanning = false;
    let panStart = 0;
    let panScroll = 0;
    let panMoved = false;
    let tapHandled = false;
    let pointerMetric = '';
    let pointerViewportPosition = null;
    track.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const button = event.target.closest('[data-health-metric]');
      pointerViewportPosition = getHealthViewportPosition();
      isPanning = true;
      panStart = event.clientX;
      panScroll = track.scrollLeft;
      panMoved = false;
      tapHandled = false;
      pointerMetric = button && track.contains(button) ? button.dataset.healthMetric : '';
      track.setPointerCapture?.(event.pointerId);
    });
    track.addEventListener('pointermove', event => {
      if (!isPanning) return;
      const movement = event.clientX - panStart;
      track.scrollLeft = panScroll - movement;
      if (Math.abs(movement) > 8) {
        panMoved = true;
        track.classList.add('is-panning');
        event.preventDefault();
      }
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => {
      track.addEventListener(type, event => {
        if (type === 'pointerup' && !panMoved && pointerMetric) {
          event.preventDefault();
          preserveHealthViewport(() => renderHealthMetricDetail(pointerMetric, { scroll: false }), pointerViewportPosition);
          tapHandled = true;
        }
        isPanning = false;
        track.classList.remove('is-panning');
        pointerMetric = '';
        pointerViewportPosition = null;
        if (track.hasPointerCapture?.(event.pointerId)) track.releasePointerCapture(event.pointerId);
      });
    });
    track.addEventListener('click', event => {
      const button = event.target.closest('[data-health-metric]');
      if (!button || !track.contains(button)) return;
      if (tapHandled) {
        tapHandled = false;
        return;
      }
      if (panMoved) {
        event.preventDefault();
        panMoved = false;
        return;
      }
      event.preventDefault();
      preserveHealthViewport(() => renderHealthMetricDetail(button.dataset.healthMetric, { scroll: false }), pointerViewportPosition);
      pointerViewportPosition = null;
    });
  };
  const getRegisterHistorySelectedCategoryKey = () => {
    const current = registerHistoryCategoryInput?.value || '';
    return registerAttachmentCategoryConfig[current] ? current : '';
  };
  const getRegisterHistoryCategoryKey = () => {
    const current = getRegisterHistorySelectedCategoryKey() || 'manual';
    return registerAttachmentCategoryConfig[current] ? current : 'manual';
  };
  const getRegisterHistoryCategoryIcon = key => {
    const button = [...(registerHistoryCarousel?.querySelectorAll('[data-register-history-category]') || [])]
      .find(item => item.dataset.registerHistoryCategory === key);
    const imageSrc = button?.querySelector('img')?.getAttribute('src');
    if (imageSrc) return `<img src="${escapeRegisterText(imageSrc)}" alt="">`;
    return escapeRegisterText(button?.querySelector('span')?.textContent?.trim() || '+');
  };
  const syncRegisterHistoryComposerPointer = () => {
    if (!registerHistoryComposer || !registerHistoryCarousel || registerHistoryComposer.hidden) return;
    const key = getRegisterHistorySelectedCategoryKey();
    const button = [...registerHistoryCarousel.querySelectorAll('[data-register-history-category]')]
      .find(item => item.dataset.registerHistoryCategory === key);
    if (!button) return;
    requestAnimationFrame(() => {
      const composerRect = registerHistoryComposer.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const rawLeft = buttonRect.left + (buttonRect.width / 2) - composerRect.left - 8;
      const minLeft = 18;
      const maxLeft = Math.max(minLeft, composerRect.width - 34);
      const left = Math.min(Math.max(rawLeft, minLeft), maxLeft);
      registerHistoryComposer.style.setProperty('--history-pointer-left', `${left}px`);
    });
  };
  const isRegisterHistoryComposerVisible = () => Boolean(registerHistoryComposer && !registerHistoryComposer.hidden);
  const updateRegisterHistoryComposer = (key, options = {}) => {
    const safeKey = registerAttachmentCategoryConfig[key] ? key : 'consultation';
    const category = registerAttachmentCategoryConfig[safeKey] || registerAttachmentCategoryConfig.consultation;
    const showComposer = options.show !== false;
    if (showComposer) hideRegisterSavedScreens();
    if (registerHistoryComposer) {
      registerHistoryComposer.hidden = !showComposer;
      registerHistoryComposer.classList.toggle('is-popup-open', showComposer);
      registerHistoryComposer.setAttribute('aria-hidden', showComposer ? 'false' : 'true');
    }
    if (registerHistoryComposerIcon) registerHistoryComposerIcon.innerHTML = getRegisterHistoryCategoryIcon(safeKey);
    if (registerHistoryComposerTitle) registerHistoryComposerTitle.textContent = category.label;
    if (registerHistoryComposerDescription) registerHistoryComposerDescription.textContent = category.description || `Registra información de ${category.label}.`;
    if (registerHistoryPrimaryLabel) registerHistoryPrimaryLabel.textContent = category.primaryLabel || 'Detalle del registro';
    if (registerHistoryManualInput) {
      registerHistoryManualInput.placeholder = category.primaryPlaceholder || 'Escribe aquí el registro manual...';
      registerHistoryManualInput.required = showComposer;
    }
    if (registerHistoryDateInput && showComposer && !registerHistoryDateInput.value) registerHistoryDateInput.value = registerDateValue();
    if (registerHistoryProviderLabel) registerHistoryProviderLabel.textContent = category.providerLabel || 'Origen';
    updateRegisterHistoryProviderOptions(category, !options.resetFields);
    if (options.resetFields) resetRegisterHistoryComposerFields();
    else if (registerHistoryFeedback) registerHistoryFeedback.hidden = true;
    updateRegisterHistoryManualCount();
    updateRegisterHistoryNotesCount();
    syncRegisterHistoryComposerPointer();
  };
  const updateRegisterHistoryManualCount = () => {
    if (!registerHistoryManualInput || !registerHistoryManualCount) return;
    const max = Number(registerHistoryManualInput.getAttribute('maxlength')) || 500;
    registerHistoryManualCount.textContent = `${registerHistoryManualInput.value.length}/${max}`;
  };
  const updateRegisterHistoryNotesCount = () => {
    if (!registerHistoryNotesInput || !registerHistoryNotesCount) return;
    const max = Number(registerHistoryNotesInput.getAttribute('maxlength')) || 1000;
    registerHistoryNotesCount.textContent = `${registerHistoryNotesInput.value.length}/${max}`;
  };
  let registerHistoryAttachmentFile = null;
  const setRegisterHistoryAttachment = file => {
    registerHistoryAttachmentFile = file || null;
    if (registerHistoryPhotoPreviewUrl) {
      URL.revokeObjectURL(registerHistoryPhotoPreviewUrl);
      registerHistoryPhotoPreviewUrl = '';
    }
    const isImage = Boolean(file?.type.startsWith('image/'));
    if (registerHistoryPhotoPreview) registerHistoryPhotoPreview.hidden = !file;
    if (registerHistoryPhotoPreviewImage) {
      registerHistoryPhotoPreviewImage.hidden = !isImage;
      registerHistoryPhotoPreviewImage.src = '';
    }
    if (registerHistoryFileType) {
      registerHistoryFileType.hidden = !file || isImage;
      registerHistoryFileType.textContent = file ? registerAttachmentType(file) : '';
    }
    if (registerHistoryPhotoPreviewName) registerHistoryPhotoPreviewName.textContent = file?.name || '';
    if (isImage && registerHistoryPhotoPreviewImage) {
      registerHistoryPhotoPreviewUrl = URL.createObjectURL(file);
      registerHistoryPhotoPreviewImage.src = registerHistoryPhotoPreviewUrl;
    }
  };
  const setRegisterHistoryFeedback = (message, type = 'success') => {
    if (!registerHistoryFeedback) return;
    registerHistoryFeedback.hidden = false;
    registerHistoryFeedback.textContent = message;
    registerHistoryFeedback.classList.toggle('is-error', type === 'error');
  };
  let lastRegisterSavedHistoryCategory = 'consultation';
  let lastRegisterSavedMetricType = 'water';
  const hideRegisterSavedScreens = () => {
    registerSavedScreens.forEach(screen => {
      screen.hidden = true;
      screen.classList.remove('is-visible');
    });
  };
  const showRegisterSavedScreen = (type = 'history', options = {}) => {
    const savedType = type === 'parameter' ? 'parameter' : 'history';
    if (options.historyCategory) lastRegisterSavedHistoryCategory = options.historyCategory;
    if (options.metricType) lastRegisterSavedMetricType = options.metricType;
    hideRegisterSavedScreens();
    if (registerSuccess) registerSuccess.hidden = true;
    hideRegisterHistoryComposer();
    hideRegisterMetricPanel({ sync: true });
    const screen = registerSavedScreens.find(item => item.dataset.registerSavedScreen === savedType);
    if (!screen) return;
    screen.hidden = false;
    screen.classList.add('is-visible');
    requestAnimationFrame(() => {
      screen.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };
  const resetRegisterHistoryComposerFields = () => {
    if (registerHistoryManualInput) registerHistoryManualInput.value = '';
    if (registerHistoryNotesInput) registerHistoryNotesInput.value = '';
    if (registerHistoryProviderInput) registerHistoryProviderInput.value = '';
    if (registerHistoryDateInput) registerHistoryDateInput.value = registerDateValue();
    if (registerHistoryPhotoInput) registerHistoryPhotoInput.value = '';
    if (registerHistoryFileInput) registerHistoryFileInput.value = '';
    setRegisterHistoryAttachment(null);
    if (registerHistoryFeedback) registerHistoryFeedback.hidden = true;
    updateRegisterHistoryManualCount();
    updateRegisterHistoryNotesCount();
  };
  const updateRegisterHistoryProviderOptions = (category, keepValue = false) => {
    if (!registerHistoryProviderInput) return;
    const currentValue = keepValue ? registerHistoryProviderInput.value : '';
    registerHistoryProviderInput.replaceChildren();
    registerHistoryProviderInput.appendChild(new Option(category.providerPlaceholder || 'Selecciona el origen', ''));
    (category.providerOptions || []).forEach(option => {
      registerHistoryProviderInput.appendChild(new Option(option, option));
    });
    registerHistoryProviderInput.value = (category.providerOptions || []).includes(currentValue) ? currentValue : '';
  };
  const selectRegisterHistoryCategory = (key, options = {}) => {
    const safeKey = registerAttachmentCategoryConfig[key] ? key : 'consultation';
    const shouldResetFields = options.resetFields !== false && getRegisterHistorySelectedCategoryKey() !== safeKey;
    if (registerHistoryCategoryInput) registerHistoryCategoryInput.value = safeKey;
    if (registerAttachmentCategoryInput) registerAttachmentCategoryInput.value = safeKey;
    portal.querySelectorAll('[data-register-history-category]').forEach(button => {
      const active = button.dataset.registerHistoryCategory === safeKey;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.setAttribute('aria-expanded', active && options.showComposer !== false ? 'true' : 'false');
      if (active && options.scroll !== false) {
        button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
    updateRegisterHistoryComposer(safeKey, { show: options.showComposer !== false, resetFields: shouldResetFields });
  };
  const hideRegisterHistoryComposer = () => {
    if (registerHistoryComposer) {
      registerHistoryComposer.hidden = true;
      registerHistoryComposer.classList.remove('is-popup-open');
      registerHistoryComposer.setAttribute('aria-hidden', 'true');
    }
    if (registerHistoryFeedback) registerHistoryFeedback.hidden = true;
    if (registerHistoryCategoryInput) registerHistoryCategoryInput.value = '';
    if (registerAttachmentCategoryInput) registerAttachmentCategoryInput.value = '';
    if (registerHistoryManualInput) registerHistoryManualInput.required = false;
    portal.querySelectorAll('[data-register-history-category]').forEach(button => {
      button.classList.remove('is-active');
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-expanded', 'false');
    });
  };
  const registerFilterViews = { parameters: 'favorites', history: 'all' };
  let activeRegisterSection = 'parameters';
  const syncRegisterFilterSwitch = () => {
    const activeView = registerFilterViews[activeRegisterSection];
    registerFilterSwitch?.setAttribute('aria-label', activeRegisterSection === 'history' ? 'Vista de historial clínico' : 'Vista de parámetros');
    registerFilterViewButtons.forEach(button => {
      const active = button.dataset.registerFilterView === activeView;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.setAttribute('tabindex', active ? '0' : '-1');
    });
  };
  const syncRegisterHistoryCategories = () => {
    const favorites = new Set(registerFavoriteHistoryCategories);
    let visibleCount = 0;
    registerHistoryCarousel?.querySelectorAll('[data-register-history-card]').forEach(card => {
      const key = card.dataset.registerHistoryCard;
      const favorite = favorites.has(key);
      card.hidden = registerFilterViews.history === 'favorites' && !favorite;
      if (!card.hidden) visibleCount += 1;
      const button = card.querySelector('[data-register-history-favorite]');
      if (!button) return;
      const label = registerAttachmentCategoryConfig[key]?.label || 'Categoría';
      button.classList.toggle('is-favorite', favorite);
      button.setAttribute('aria-pressed', favorite ? 'true' : 'false');
      button.setAttribute('aria-label', `${favorite ? 'Quitar' : 'Agregar'} ${label} ${favorite ? 'de' : 'a'} favoritos`);
      button.setAttribute('title', favorite ? 'Quitar de favoritos' : 'Agregar a favoritos');
      button.innerHTML = favorite ? '&#9733;' : '&#9734;';
    });
    if (registerHistoryEmpty) registerHistoryEmpty.hidden = visibleCount > 0;
  };
  const setRegisterHistoryView = (view = 'all', options = {}) => {
    registerFilterViews.history = view === 'favorites' ? 'favorites' : 'all';
    if (options.hideSaved !== false) hideRegisterSavedScreens();
    if (registerFilterViews.history === 'favorites' && isRegisterHistoryComposerVisible() && !registerFavoriteHistoryCategories.includes(getRegisterHistoryCategoryKey())) {
      hideRegisterHistoryComposer();
    }
    syncRegisterHistoryCategories();
    if (activeRegisterSection === 'history') syncRegisterFilterSwitch();
  };
  const toggleRegisterHistoryFavorite = key => {
    if (!registerAttachmentCategoryConfig[key]) return;
    registerFavoriteHistoryCategories = registerFavoriteHistoryCategories.includes(key)
      ? registerFavoriteHistoryCategories.filter(item => item !== key)
      : [...registerFavoriteHistoryCategories, key];
    saveRegisterHistoryFavorites();
    if (registerFilterViews.history === 'favorites' && !registerFavoriteHistoryCategories.includes(key) && isRegisterHistoryComposerVisible() && getRegisterHistoryCategoryKey() === key) {
      hideRegisterHistoryComposer();
    }
    syncRegisterHistoryCategories();
  };
  const toggleRegisterHistoryComposer = categoryKey => {
    if (categoryKey === getRegisterHistoryCategoryKey() && isRegisterHistoryComposerVisible()) {
      hideRegisterHistoryComposer();
      return;
    }
    hideRegisterMetricPanel({ sync: true });
    selectRegisterHistoryCategory(categoryKey, { showComposer: true });
    requestAnimationFrame(() => {
      registerHistoryComposer?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };
  const renderRegisterMetricButton = (type) => {
    const config = registerMetricConfig[type] || registerMetricConfig.water;
    const active = isRegisterMetricPanelVisible() && (registerMetricInput?.value || 'water') === type;
    const favorite = registerFavoriteMetrics.includes(type);
    const favoriteLabel = favorite ? 'Quitar de favoritos' : 'Agregar a favoritos';
    const iconMarkup = config.image
      ? `<span class="patient-register-metric-image"><img src="${escapeRegisterText(registerMetricImageSrc(config.image))}" alt="" loading="lazy"></span>`
      : `<span class="patient-register-metric-glyph">${config.icon || '+'}</span>`;
    return `
      <button class="${active ? 'is-active' : ''}" type="button" data-register-metric="${escapeRegisterText(type)}" aria-pressed="${active ? 'true' : 'false'}">
        <i class="patient-register-favorite-toggle ${favorite ? 'is-favorite' : ''}" data-register-favorite-toggle data-register-metric-favorite="${escapeRegisterText(type)}" role="button" tabindex="0" aria-label="${favoriteLabel}" aria-pressed="${favorite ? 'true' : 'false'}">${favorite ? '&#9733;' : '&#9734;'}</i>
        ${iconMarkup}
        <b>${escapeRegisterText(config.label)}</b>
      </button>
    `;
  };
  const renderRegisterSelectedIcon = config => {
    if (config?.image) {
      return `<img src="${escapeRegisterText(registerMetricImageSrc(config.image))}" alt="">`;
    }
    return `<span>${config?.icon || '+'}</span>`;
  };
  const syncRegisterActiveButtons = () => {
    const current = registerMetricInput?.value || 'water';
    const panelVisible = isRegisterMetricPanelVisible();
    portal.querySelectorAll('[data-register-metric]').forEach(button => {
      const active = panelVisible && button.dataset.registerMetric === current;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const currentConfig = registerMetricConfig[current] || registerMetricConfig.water;
    if (registerSelectedTitle) registerSelectedTitle.textContent = currentConfig.label;
    if (registerSelectedIcon) registerSelectedIcon.innerHTML = renderRegisterSelectedIcon(currentConfig);
    registerSelectedIcon?.classList.toggle('has-image', Boolean(currentConfig.image));
  };
  const renderRegisterMetricRows = () => {
    if (registerFavorites) {
      registerFavorites.innerHTML = registerFavoriteMetrics.length
        ? registerFavoriteMetrics.map(renderRegisterMetricButton).join('')
        : '<div class="patient-register-favorites-empty">Marca la estrella de un par&aacute;metro para verlo aqu&iacute;.</div>';
    }
    if (registerOptions) {
      registerOptions.innerHTML = registerMetricOrder.map(renderRegisterMetricButton).join('');
    }
    syncRegisterActiveButtons();
  };
  const toggleRegisterFavorite = (type) => {
    if (!registerMetricConfig[type]) return;
    registerFavoriteMetrics = registerFavoriteMetrics.includes(type)
      ? registerFavoriteMetrics.filter(item => item !== type)
      : [...registerFavoriteMetrics, type];
    saveRegisterFavorites();
    renderRegisterMetricRows();
    if (healthDashboardRendered) renderHealthDashboard();
  };
  const addRegisterFavorite = (type) => {
    if (!registerMetricConfig[type] || registerFavoriteMetrics.includes(type)) {
      syncRegisterActiveButtons();
      return;
    }
    registerFavoriteMetrics = [...registerFavoriteMetrics, type];
    saveRegisterFavorites();
    renderRegisterMetricRows();
    if (healthDashboardRendered) renderHealthDashboard();
  };
  const isRegisterMetricPanelVisible = () => Boolean(registerForm && !registerForm.hidden);
  const hideRegisterMetricPanel = (options = {}) => {
    if (registerForm) {
      registerForm.hidden = true;
      registerForm.classList.remove('is-popup-open');
      registerForm.setAttribute('aria-hidden', 'true');
    }
    if (options.sync !== false) syncRegisterActiveButtons();
  };
  const setRegisterMetricView = (view = 'favorites', options = {}) => {
    const activeView = view === 'all' ? 'all' : 'favorites';
    registerFilterViews.parameters = activeView;
    if (options.hideSaved !== false) hideRegisterSavedScreens();
    registerMetricSections.forEach(section => {
      const isActive = section.dataset.registerMetricSection === activeView;
      section.classList.toggle('is-active', isActive);
      section.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
    if (options.hidePanel !== false) hideRegisterMetricPanel({ sync: false });
    syncRegisterActiveButtons();
    if (activeRegisterSection === 'parameters') syncRegisterFilterSwitch();
  };
  const setRegisterSection = (section = 'parameters') => {
    const activeSection = section === 'history' ? 'history' : 'parameters';
    activeRegisterSection = activeSection;
    const filterAnchor = activeSection === 'history'
      ? portal.querySelector('[data-register-history-carousel]')
      : portal.querySelector('[data-register-metric-stage]');
    if (registerFilterSwitch && filterAnchor) {
      filterAnchor.after(registerFilterSwitch);
    }
    if (registerViewSwitch) registerViewSwitch.dataset.activeView = activeSection;
    registerViewButtons.forEach(button => {
      const active = button.dataset.registerViewMode === activeSection;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.setAttribute('tabindex', active ? '0' : '-1');
    });
    registerViewPanels.forEach(panel => {
      const active = panel.dataset.registerViewPanel === activeSection;
      panel.classList.toggle('is-active', active);
      panel.setAttribute('aria-hidden', active ? 'false' : 'true');
      panel.toggleAttribute('inert', !active);
    });
    syncRegisterFilterSwitch();
  };
  const showRegisterMetricPanel = (type, options = {}) => {
    if (!registerMetricConfig[type]) return;
    hideRegisterSavedScreens();
    hideRegisterHistoryComposer();
    selectRegisterMetric(type);
    if (registerForm) {
      registerForm.hidden = false;
      registerForm.classList.add('is-popup-open');
      registerForm.setAttribute('aria-hidden', 'false');
    }
    syncRegisterActiveButtons();
    if (options.scroll !== false) {
      requestAnimationFrame(() => {
        registerForm?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  };
  const toggleRegisterMetricPanel = (type) => {
    if (!registerMetricConfig[type]) return;
    const current = registerMetricInput?.value || 'water';
    if (isRegisterMetricPanelVisible() && current === type) {
      hideRegisterMetricPanel();
      return;
    }
    showRegisterMetricPanel(type);
  };
  const selectRegisterMetric = (type) => {
    const config = registerMetricConfig[type] || registerMetricConfig.water;
    const view = registerMetricViewConfig[type] || registerMetricViewConfig.water;
    if (registerMetricInput) registerMetricInput.value = type;
    if (registerValueLabel) registerValueLabel.textContent = view.valueLabel || (type === 'note' ? 'Nota' : 'Valor');
    if (registerValueInput) {
      registerValueInput.type = config.inputType;
      registerValueInput.step = config.step || '';
      registerValueInput.placeholder = config.placeholder;
      registerValueInput.value = '';
    }
    if (registerUnit) {
      registerUnit.textContent = config.unit || ' ';
      registerUnit.hidden = !config.unit;
    }
    if (registerCustomWrap) {
      registerCustomWrap.hidden = type !== 'custom';
      registerCustomWrap.querySelector('input')?.toggleAttribute('required', type === 'custom');
    }
    syncRegisterActiveButtons();
  };
  const saveRegisterRecord = (record) => {
    let records = [];
    try {
      records = JSON.parse(localStorage.getItem(activeRegisterStorageKey()) || '[]');
    } catch (error) {
      records = [];
    }
    records.unshift({
      ...record,
      profileId: getActivePatientProfileId(),
      profileName: registerPatientName(),
    });
    localStorage.setItem(activeRegisterStorageKey(), JSON.stringify(records));
  };
  const uploadRegisterAttachment = async (file, recordId, category) => {
    if (!file) return null;
    const body = new FormData();
    body.append('file', file);
    body.append('record_id', String(recordId));
    body.append('profile_id', getActivePatientProfileId());
    body.append('category', category);
    const response = await fetch(registerAttachmentUploadUrl, {
      method: 'POST',
      headers: { 'X-CSRF-TOKEN': registerAttachmentCsrfToken, Accept: 'application/json' },
      credentials: 'same-origin',
      body,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !Number.isSafeInteger(Number(result.document_id)) || Number(result.document_id) < 1) {
      throw new Error('No se pudo guardar el archivo. Usa PDF, imagen o Word de hasta 10 MB.');
    }
    return Number(result.document_id);
  };
  const updateRegisterNotesCount = () => {
    if (!registerNotesInput || !registerNotesCount) return;
    registerNotesCount.textContent = `${registerNotesInput.value.length}/2000`;
  };
  const formatRegisterFileSize = bytes => {
    const size = Number(bytes || 0);
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${size} B`;
  };
  const registerAttachmentType = file => {
    if (file?.type.startsWith('image/')) return 'IMG';
    const extension = String(file?.name || '').split('.').pop().toUpperCase();
    return /^[A-Z0-9]{2,4}$/.test(extension) ? extension : 'FILE';
  };
  let registerHistoryPhotoPreviewUrl = '';
  let registerAttachmentPreviewUrl = '';
  let registerParameterAttachmentFile = null;
  let pendingRegisterImageTarget = '';
  let pendingRegisterImageFile = null;
  const buildRegisterTranscript = (file, context = 'parameter') => {
    const fileName = file?.name || 'Documento adjunto';
    const lowerName = fileName.toLowerCase();
    const historyCategory = context === 'history' ? getRegisterHistoryCategoryKey() : '';
    const metricType = registerMetricInput?.value || '';
    const looksLikeLaboratory = historyCategory === 'laboratory' || metricType === 'laboratory' || lowerName.includes('lab') || lowerName.includes('analisis') || lowerName.includes('laboratorio');
    const looksLikePrescription = historyCategory === 'prescription' || metricType === 'medication' || metricType === 'prescriptions' || lowerName.includes('receta') || lowerName.includes('prescripcion') || lowerName.includes('medicamento');
    const looksLikeStudy = historyCategory === 'study' || metricType === 'studies' || lowerName.includes('estudio') || lowerName.includes('imagen') || lowerName.includes('ultrasonido') || lowerName.includes('rx');
    if (looksLikeLaboratory) {
      return [
        'Resultados:',
        '- Glucosa en ayunas: 92 mg/dL',
        '- Hemoglobina glicosilada: 5.4%',
        '- Colesterol total: 168 mg/dL',
        '- Trigliceridos: 120 mg/dL',
        '- HDL: 48 mg/dL',
      ].join('\n');
    }
    if (looksLikePrescription) {
      return [
        'Indicaciones detectadas:',
        'Tomar 1 tableta cada 8 horas durante 5 dias.',
        'No consumir alcohol.',
        'Acudir a revision en 7 dias.',
      ].join('\n');
    }
    if (looksLikeStudy) {
      return [
        'Estudio detectado:',
        'Tipo de estudio pendiente de confirmar.',
        'Hallazgos principales pendientes de revisar.',
        'Adjuntar interpretacion medica cuando este disponible.',
      ].join('\n');
    }
    return [
      'Texto detectado:',
      'Informacion extraida de la imagen.',
      'Revisa el contenido antes de guardar el registro.',
    ].join('\n');
  };
  const appendRegisterText = (textarea, text) => {
    if (!textarea || !text) return;
    const max = Number(textarea.getAttribute('maxlength')) || 2000;
    const current = String(textarea.value || '').trim();
    const next = current ? `${current}\n\n${text}` : text;
    textarea.value = next.slice(0, max);
  };
  const setRegisterTranscriptEditing = editing => {
    if (!registerTranscriptInput || !registerTranscriptEdit) return;
    registerTranscriptInput.readOnly = !editing;
    registerTranscriptCard?.classList.toggle('is-editing', editing);
    registerTranscriptEdit.textContent = editing ? 'Guardar texto' : 'Editar texto';
    if (editing) registerTranscriptInput.focus({ preventScroll: true });
  };
  const setRegisterAttachmentState = (file, options = {}) => {
    registerParameterAttachmentFile = file || null;
    const hasFile = Boolean(file);
    const shouldTranscribe = Boolean(options.transcribe);
    if (registerAttachmentPreviewUrl) {
      URL.revokeObjectURL(registerAttachmentPreviewUrl);
      registerAttachmentPreviewUrl = '';
    }
    if (registerUploadedCard) registerUploadedCard.hidden = !hasFile;
    if (registerTranscriptCard) registerTranscriptCard.hidden = !hasFile || !shouldTranscribe;
    if (registerAttachmentCategoryWrap) registerAttachmentCategoryWrap.hidden = true;
    if (registerAttachmentCategoryInput) {
      registerAttachmentCategoryInput.required = false;
      registerAttachmentCategoryInput.value = hasFile ? getRegisterHistoryCategoryKey() : '';
      registerAttachmentCategoryInput.setCustomValidity('');
    }
    if (!hasFile) {
      if (registerAttachmentName) registerAttachmentName.textContent = 'Sin archivo seleccionado';
      if (registerTranscriptInput) registerTranscriptInput.value = '';
      if (registerUploadedPreview) registerUploadedPreview.hidden = true;
      if (registerUploadedPreviewImage) registerUploadedPreviewImage.src = '';
      if (registerUploadedFileType) registerUploadedFileType.hidden = false;
      setRegisterTranscriptEditing(false);
      return;
    }
    const isImage = file.type.startsWith('image/');
    if (registerAttachmentName) registerAttachmentName.textContent = file.name;
    if (registerUploadedFileName) registerUploadedFileName.textContent = file.name;
    if (registerUploadedFileSize) registerUploadedFileSize.textContent = formatRegisterFileSize(file.size);
    if (registerUploadedFileType) {
      registerUploadedFileType.textContent = registerAttachmentType(file);
      registerUploadedFileType.classList.toggle('is-image', isImage);
      registerUploadedFileType.hidden = isImage && Boolean(registerUploadedPreview && registerUploadedPreviewImage);
    }
    if (registerUploadedPreview && registerUploadedPreviewImage) {
      const showPreview = isImage;
      registerUploadedPreview.hidden = !showPreview;
      if (showPreview) {
        registerAttachmentPreviewUrl = URL.createObjectURL(file);
        registerUploadedPreviewImage.src = registerAttachmentPreviewUrl;
      } else {
        registerUploadedPreviewImage.src = '';
      }
    }
    const transcript = shouldTranscribe ? buildRegisterTranscript(file, 'parameter') : '';
    if (registerTranscriptInput) registerTranscriptInput.value = transcript;
    if (shouldTranscribe) {
      appendRegisterText(registerNotesInput, transcript);
      updateRegisterNotesCount();
    }
    setRegisterTranscriptEditing(false);
  };
  const setRegisterImageDialogStage = stage => {
    registerImageStages.forEach(item => {
      const active = item.dataset.registerImageStage === stage;
      item.hidden = !active;
    });
    if (registerImageTitle) {
      registerImageTitle.textContent = stage === 'action' ? '¿Qué deseas hacer con esta imagen?' : 'Agregar imagen';
    }
  };
  const resetPendingRegisterImage = () => {
    pendingRegisterImageTarget = '';
    pendingRegisterImageFile = null;
    if (registerImageFileName) registerImageFileName.textContent = '';
  };
  const closeRegisterImageDialog = (options = {}) => {
    const shouldDiscardSelectedFile = options.clearInput !== false && Boolean(pendingRegisterImageFile);
    if (shouldDiscardSelectedFile) {
      const input = registerImageInputForTarget(pendingRegisterImageTarget);
      if (input) input.value = '';
    }
    if (options.clearPending !== false) resetPendingRegisterImage();
    registerImageDialog?.close();
  };
  const openRegisterImageDialog = target => {
    pendingRegisterImageTarget = target;
    pendingRegisterImageFile = null;
    if (registerImageFileName) registerImageFileName.textContent = '';
    setRegisterImageDialogStage('source');
    if (registerImageDialog?.showModal && !registerImageDialog.open) {
      registerImageDialog.showModal();
    }
  };
  const registerImageInputForTarget = target => target === 'history' ? registerHistoryPhotoInput : registerAttachmentInput;
  const chooseRegisterImageSource = source => {
    const input = registerImageInputForTarget(pendingRegisterImageTarget);
    if (!input) return;
    input.setAttribute('accept', 'image/*');
    if (source === 'camera') input.setAttribute('capture', 'environment');
    else input.removeAttribute('capture');
    input.click();
  };
  const handleRegisterImageSelection = (target, file) => {
    if (!file) return;
    pendingRegisterImageTarget = target;
    pendingRegisterImageFile = file;
    if (registerImageFileName) registerImageFileName.textContent = file.name;
    setRegisterImageDialogStage('action');
    if (registerImageDialog && !registerImageDialog.open && registerImageDialog.showModal) {
      registerImageDialog.showModal();
    }
  };
  const applyRegisterImageSelection = action => {
    const file = pendingRegisterImageFile;
    const target = pendingRegisterImageTarget;
    if (!file || !target) return;
    const shouldTranscribe = action === 'transcribe';
    if (target === 'history') {
      if (registerHistoryFileInput) registerHistoryFileInput.value = '';
      setRegisterHistoryAttachment(file);
      if (shouldTranscribe) {
        const transcript = buildRegisterTranscript(file, 'history');
        appendRegisterText(registerHistoryNotesInput, transcript);
        updateRegisterHistoryNotesCount();
        setRegisterHistoryFeedback('Texto transcrito desde la imagen.');
      } else {
        setRegisterHistoryFeedback('Imagen agregada como archivo adjunto.');
      }
    } else {
      if (registerFileInput) registerFileInput.value = '';
      setRegisterAttachmentState(file, { transcribe: shouldTranscribe });
      if (registerSuccess) {
        registerSuccess.classList.remove('is-error');
        registerSuccess.textContent = shouldTranscribe ? 'Texto transcrito desde la imagen.' : 'Imagen agregada como archivo adjunto.';
        registerSuccess.hidden = false;
      }
    }
    closeRegisterImageDialog({ clearInput: false });
  };
  const escapeManualHistoryText = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
  const loadHistoryFavoriteKeys = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(activeHistoryFavoriteStorageKey()) || '[]');
      return new Set((Array.isArray(saved) ? saved : []).map(String).filter(Boolean));
    } catch (error) {
      return new Set();
    }
  };
  const saveHistoryFavoriteKeys = favorites => {
    localStorage.setItem(activeHistoryFavoriteStorageKey(), JSON.stringify([...favorites]));
  };
  const historyFavoriteButtonMarkup = '<button class="patient-history-favorite" type="button" data-history-favorite aria-pressed="false" aria-label="Agregar registro a favoritos" title="Agregar a favoritos"><span aria-hidden="true">&#9734;</span></button>';
  const formatManualHistoryDate = value => {
    if (!value) return { date: 'No registrada', day: '' };
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return { date: value, day: '' };
    return {
      date: parsed.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      day: parsed.toLocaleDateString('es-MX', { weekday: 'long' }),
    };
  };
  const renderManualHistoryRecords = () => {
    let records = [];
    try {
      records = JSON.parse(localStorage.getItem(activeRegisterStorageKey()) || '[]');
    } catch (error) {
      records = [];
    }
    historyScopes.forEach(historyScope => {
      const historyBody = historyScope.querySelector('[data-history-body]');
      if (!historyBody) return;
      historyBody.querySelectorAll('[data-history-manual-row]').forEach(row => row.remove());
      const fragment = document.createDocumentFragment();
      records.forEach(record => {
        const date = formatManualHistoryDate(record.recordedAt);
        const label = escapeManualHistoryText(record.label || 'Parametro manual');
        const unit = record.unit ? ` ${escapeManualHistoryText(record.unit)}` : '';
        const value = escapeManualHistoryText(record.value || 'Sin valor');
        const notes = String(record.notes || '').trim();
        const attachment = String(record.attachmentName || '').trim();
        const categoryKey = record.historyCategory || 'manual';
        const category = registerAttachmentCategoryConfig[categoryKey] || registerAttachmentCategoryConfig.manual;
        const recordKey = `manual-${record.id || `${record.recordedAt || 'undated'}-${record.metricType || 'record'}`}`;
        const row = document.createElement('tr');
        row.dataset.historyRow = category.historyFilter;
        row.dataset.historyManualRow = '1';
        row.dataset.historyFavoriteKey = recordKey;
        row.innerHTML = `
          <td><div class="patient-history-date-cell"><div class="patient-history-date"><span>+</span><strong>${escapeManualHistoryText(date.date)}<small>${escapeManualHistoryText(date.day)}</small></strong></div>${historyFavoriteButtonMarkup}</div></td>
          <td><span class="patient-history-category is-${escapeManualHistoryText(category.historyFilter)}">${escapeManualHistoryText(record.historyCategoryLabel || category.label)}</span></td>
          <td><div class="patient-history-origin"><span>◇</span><strong>${escapeManualHistoryText(record.source || 'Paciente')}</strong></div></td>
          <td><div class="patient-history-service"><span>▣</span><strong>${escapeManualHistoryText(record.historyCategoryService || category.parameterService || category.service)}</strong></div></td>
          <td><strong>${label}: ${value}${unit}</strong>${notes ? `<p class="patient-history-manual-note">${escapeManualHistoryText(notes)}</p>` : ''}</td>
          <td><span class="patient-history-not-registered">No registrado</span></td>
        `;
        fragment.appendChild(row);
        if (attachment) {
          const attachmentCategoryKey = record.attachmentCategory || record.historyCategory || 'manual';
          const attachmentCategory = registerAttachmentCategoryConfig[attachmentCategoryKey] || category || registerAttachmentCategoryConfig.manual;
          const transcript = String(record.attachmentTranscript || '').trim();
          const documentId = Number(record.attachmentDocumentId);
          const downloadLink = Number.isSafeInteger(documentId) && documentId > 0
            ? `<a class="patient-history-attachment-download" href="${escapeManualHistoryText(registerAttachmentDownloadTemplate.replace('__DOCUMENT__', String(documentId)))}">Descargar archivo</a>`
            : '';
          const attachmentRow = document.createElement('tr');
          attachmentRow.dataset.historyRow = attachmentCategory.historyFilter;
          attachmentRow.dataset.historyManualRow = '1';
          attachmentRow.dataset.historyFavoriteKey = `${recordKey}-attachment`;
          attachmentRow.innerHTML = `
            <td><div class="patient-history-date-cell"><div class="patient-history-date"><span>+</span><strong>${escapeManualHistoryText(date.date)}<small>${escapeManualHistoryText(date.day)}</small></strong></div>${historyFavoriteButtonMarkup}</div></td>
            <td><span class="patient-history-category is-${escapeManualHistoryText(attachmentCategory.historyFilter)}">${escapeManualHistoryText(record.attachmentCategoryLabel || attachmentCategory.label)}</span></td>
            <td><div class="patient-history-origin"><span>◇</span><strong>Registro manual</strong></div></td>
            <td><div class="patient-history-service"><span>▣</span><strong>${escapeManualHistoryText(attachmentCategory.service)}</strong></div></td>
            <td><strong>${escapeManualHistoryText(attachment)}</strong>${transcript ? `<p class="patient-history-manual-note patient-history-manual-transcript">${escapeManualHistoryText(transcript)}</p>` : ''}</td>
            <td><div class="patient-history-manual-evidence"><span>▣</span><div><strong>${downloadLink ? 'Archivo adjunto' : 'Archivo registrado'}</strong><p>${escapeManualHistoryText(attachment)}</p><small>${transcript ? 'Texto asociado al registro.' : 'Sin transcripción.'}</small>${downloadLink}</div></div></td>
          `;
          fragment.appendChild(attachmentRow);
        }
      });
      historyBody.prepend(fragment);
    });
    syncHistoryRowsVisibility();
  };
  const syncHistoryRowsVisibility = (targetScope = null) => {
    const favoriteKeys = loadHistoryFavoriteKeys();
    (targetScope ? [targetScope] : historyScopes).forEach(historyScope => {
      const historyBody = historyScope.querySelector('[data-history-body]');
      if (!historyBody) return;
      const historyEmptyRow = historyScope.querySelector('[data-history-empty]');
      const historyEmptyFilterRow = historyScope.querySelector('[data-history-filter-empty]');
      const activeFilterButton = historyScope.querySelector('[data-history-filter].is-active');
      const activeFilter = activeFilterButton?.dataset.historyFilter || 'all';
      const activeViewButton = historyScope.querySelector('[data-history-view].is-active');
      const activeView = activeViewButton?.dataset.historyView || 'all';
      let visibleRows = 0;
      historyBody.querySelectorAll('[data-history-row]').forEach(row => {
        const belongsToPrimaryProfile = row.dataset.historyPrimaryRow === '1';
        const profileMatches = !belongsToPrimaryProfile || isPrimaryPatientProfileActive();
        const categoryMatches = activeFilter === 'all' || row.dataset.historyRow === activeFilter;
        const favoriteKey = String(row.dataset.historyFavoriteKey || '');
        const isFavorite = Boolean(favoriteKey && favoriteKeys.has(favoriteKey));
        const favoriteMatches = activeView === 'all' || isFavorite;
        const favoriteButton = row.querySelector('[data-history-favorite]');
        if (favoriteButton) {
          favoriteButton.classList.toggle('is-active', isFavorite);
          favoriteButton.setAttribute('aria-pressed', isFavorite ? 'true' : 'false');
          favoriteButton.setAttribute('aria-label', isFavorite ? 'Quitar registro de favoritos' : 'Agregar registro a favoritos');
          favoriteButton.setAttribute('title', isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos');
          const favoriteIcon = favoriteButton.querySelector('span');
          if (favoriteIcon) favoriteIcon.innerHTML = isFavorite ? '&#9733;' : '&#9734;';
        }
        row.hidden = !(profileMatches && categoryMatches && favoriteMatches);
        if (!row.hidden) visibleRows += 1;
      });
      if (historyEmptyRow) historyEmptyRow.hidden = visibleRows > 0 || activeFilter !== 'all' || activeView !== 'all';
      if (historyEmptyFilterRow) {
        const emptyCell = historyEmptyFilterRow.querySelector('td');
        const activeLabel = activeFilterButton?.querySelector('b')?.textContent?.trim() || 'esta categoría';
        if (emptyCell) {
          emptyCell.textContent = activeView === 'favorites'
            ? (activeFilter === 'all' ? 'Aún no tienes registros favoritos. Marca la estrella de un registro para verlo aquí.' : `No hay registros favoritos en ${activeLabel}.`)
            : (activeFilter === 'all' ? 'No hay registros clínicos.' : `No hay registros en ${activeLabel}.`);
        }
        historyEmptyFilterRow.hidden = visibleRows > 0 || (activeView === 'all' && activeFilter === 'all' && Boolean(historyEmptyRow));
      }
    });
  };
  const closeHealthScreen = () => {
    if (!healthScreenLayer) return;
    healthScreenLayer.hidden = true;
    healthScreenLayer.setAttribute('aria-hidden', 'true');
    healthScreens.forEach(screen => {
      screen.hidden = true;
      screen.classList.remove('is-active');
    });
    document.body.classList.remove('is-health-screen-open');
  };
  const openHealthScreen = (name) => {
    const target = healthScreens.find(screen => screen.dataset.healthScreen === name);
    if (!healthScreenLayer || !target) return;
    healthScreens.forEach(screen => {
      const active = screen === target;
      screen.hidden = !active;
      screen.classList.toggle('is-active', active);
    });
    healthScreenLayer.hidden = false;
    healthScreenLayer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-health-screen-open');
    healthScreenLayer.scrollTop = 0;
    target.scrollTop = 0;
  };
  const deviceFilterCarousel = portal.querySelector('[data-device-filter-carousel]');
  if (deviceFilterCarousel) {
    const deviceFilterButtons = [...deviceFilterCarousel.querySelectorAll('[data-device-filter]')];
    const deviceCards = [...portal.querySelectorAll('[data-device-card]')];
    const deviceEmpty = portal.querySelector('[data-device-empty]');
    const deviceReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let isDeviceFilterDragging = false;
    let deviceDragStart = 0;
    let deviceDragScroll = 0;
    let devicePreviousScroll = 0;
    let devicePreviousTime = 0;
    let deviceDragVelocity = 0;
    let deviceDragMoved = false;
    let blockDeviceFilterClick = false;
    let deviceGlideFrame = 0;
    let deviceClickTimer = 0;

    const renderDeviceFilter = filter => {
      let visible = 0;
      deviceCards.forEach(card => {
        const matches = filter === 'all' || card.dataset.deviceStatus === filter || card.dataset.deviceKind === filter;
        card.hidden = !matches;
        if (matches) visible++;
      });
      if (deviceEmpty) deviceEmpty.hidden = visible > 0;
    };
    const stopDeviceGlide = () => {
      if (deviceGlideFrame) cancelAnimationFrame(deviceGlideFrame);
      deviceGlideFrame = 0;
      deviceFilterCarousel.classList.remove('is-gliding');
    };
    const snapDeviceFilter = () => {
      if (!deviceFilterButtons.length) return;
      const carouselCenter = deviceFilterCarousel.scrollLeft + (deviceFilterCarousel.clientWidth / 2);
      const closest = deviceFilterButtons.reduce((selected, button) => {
        const selectedCenter = selected.offsetLeft + (selected.offsetWidth / 2);
        const buttonCenter = button.offsetLeft + (button.offsetWidth / 2);
        return Math.abs(buttonCenter - carouselCenter) < Math.abs(selectedCenter - carouselCenter) ? button : selected;
      }, deviceFilterButtons[0]);
      closest.scrollIntoView({ behavior: deviceReducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
    };
    const startDeviceGlide = () => {
      if (deviceReducedMotion || Math.abs(deviceDragVelocity) < .03) {
        snapDeviceFilter();
        return;
      }
      let speed = Math.max(-20, Math.min(20, deviceDragVelocity * 16));
      deviceFilterCarousel.classList.add('is-gliding');
      const glide = () => {
        const previousPosition = deviceFilterCarousel.scrollLeft;
        deviceFilterCarousel.scrollLeft += speed;
        const reachedEdge = Math.abs(deviceFilterCarousel.scrollLeft - previousPosition) < .1;
        speed *= .92;
        if (Math.abs(speed) < .35 || reachedEdge) {
          deviceGlideFrame = 0;
          deviceFilterCarousel.classList.remove('is-gliding');
          snapDeviceFilter();
          return;
        }
        deviceGlideFrame = requestAnimationFrame(glide);
      };
      deviceGlideFrame = requestAnimationFrame(glide);
    };
    const finishDeviceDrag = (event, withGlide) => {
      if (!isDeviceFilterDragging) return;
      isDeviceFilterDragging = false;
      deviceFilterCarousel.classList.remove('is-dragging');
      if (deviceFilterCarousel.hasPointerCapture?.(event.pointerId)) deviceFilterCarousel.releasePointerCapture(event.pointerId);
      if (deviceDragMoved) {
        blockDeviceFilterClick = true;
        window.clearTimeout(deviceClickTimer);
        deviceClickTimer = window.setTimeout(() => {
          blockDeviceFilterClick = false;
        }, 240);
        if (withGlide) startDeviceGlide();
      }
      deviceDragVelocity = 0;
    };

    deviceFilterCarousel.addEventListener('pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      stopDeviceGlide();
      isDeviceFilterDragging = true;
      deviceDragStart = event.clientX;
      deviceDragScroll = deviceFilterCarousel.scrollLeft;
      devicePreviousScroll = deviceDragScroll;
      devicePreviousTime = performance.now();
      deviceDragVelocity = 0;
      deviceDragMoved = false;
      deviceFilterCarousel.classList.add('is-dragging');
      deviceFilterCarousel.setPointerCapture?.(event.pointerId);
    });
    deviceFilterCarousel.addEventListener('pointermove', event => {
      if (!isDeviceFilterDragging) return;
      const movement = event.clientX - deviceDragStart;
      const now = performance.now();
      const elapsed = Math.max(1, now - devicePreviousTime);
      deviceFilterCarousel.scrollLeft = deviceDragScroll - movement;
      const instantVelocity = (deviceFilterCarousel.scrollLeft - devicePreviousScroll) / elapsed;
      deviceDragVelocity = (deviceDragVelocity * .68) + (instantVelocity * .32);
      devicePreviousScroll = deviceFilterCarousel.scrollLeft;
      devicePreviousTime = now;
      if (Math.abs(movement) > 6) {
        deviceDragMoved = true;
        event.preventDefault();
      }
    });
    deviceFilterCarousel.addEventListener('pointerup', event => finishDeviceDrag(event, true));
    deviceFilterCarousel.addEventListener('pointercancel', event => finishDeviceDrag(event, false));
    deviceFilterCarousel.addEventListener('lostpointercapture', event => finishDeviceDrag(event, false));
    deviceFilterButtons.forEach(button => {
      button.addEventListener('click', event => {
        if (blockDeviceFilterClick) {
          event.preventDefault();
          return;
        }
        deviceFilterButtons.forEach(item => {
          const active = item === button;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        renderDeviceFilter(button.dataset.deviceFilter || 'all');
        button.scrollIntoView({ behavior: deviceReducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
      });
    });
    renderDeviceFilter('all');
  }
  const healthFilterCarousel = portal.querySelector('[data-health-filter-carousel]');
  if (healthFilterCarousel) {
    const healthFilterButtons = [...healthFilterCarousel.querySelectorAll('[data-health-filter]')];
    const healthReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let isDragging = false;
    let dragStart = 0;
    let dragScroll = 0;
    let previousScroll = 0;
    let previousTime = 0;
    let dragVelocity = 0;
    let dragMoved = false;
    let blockHealthFilterClick = false;
    let healthGlideFrame = 0;
    let healthClickTimer = 0;
    const stopHealthGlide = () => {
      if (healthGlideFrame) cancelAnimationFrame(healthGlideFrame);
      healthGlideFrame = 0;
      healthFilterCarousel.classList.remove('is-gliding');
    };
    const snapHealthFilter = () => {
      if (!healthFilterButtons.length) return;
      const carouselCenter = healthFilterCarousel.scrollLeft + (healthFilterCarousel.clientWidth / 2);
      const closest = healthFilterButtons.reduce((selected, button) => {
        const selectedCenter = selected.offsetLeft + (selected.offsetWidth / 2);
        const buttonCenter = button.offsetLeft + (button.offsetWidth / 2);
        return Math.abs(buttonCenter - carouselCenter) < Math.abs(selectedCenter - carouselCenter) ? button : selected;
      }, healthFilterButtons[0]);
      closest.scrollIntoView({ behavior: healthReducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
    };
    const startHealthGlide = () => {
      if (healthReducedMotion || Math.abs(dragVelocity) < .03) {
        snapHealthFilter();
        return;
      }
      let speed = Math.max(-20, Math.min(20, dragVelocity * 16));
      healthFilterCarousel.classList.add('is-gliding');
      const glide = () => {
        const previousPosition = healthFilterCarousel.scrollLeft;
        healthFilterCarousel.scrollLeft += speed;
        const reachedEdge = Math.abs(healthFilterCarousel.scrollLeft - previousPosition) < .1;
        speed *= .9;
        if (Math.abs(speed) < .35 || reachedEdge) {
          healthGlideFrame = 0;
          healthFilterCarousel.classList.remove('is-gliding');
          snapHealthFilter();
          return;
        }
        healthGlideFrame = requestAnimationFrame(glide);
      };
      healthGlideFrame = requestAnimationFrame(glide);
    };
    const finishHealthDrag = (event, withGlide) => {
      if (!isDragging) return;
      isDragging = false;
      healthFilterCarousel.classList.remove('is-dragging');
      if (healthFilterCarousel.hasPointerCapture?.(event.pointerId)) healthFilterCarousel.releasePointerCapture(event.pointerId);
      if (dragMoved) {
        blockHealthFilterClick = true;
        window.clearTimeout(healthClickTimer);
        healthClickTimer = window.setTimeout(() => {
          blockHealthFilterClick = false;
        }, 240);
        if (withGlide) startHealthGlide();
      }
      dragVelocity = 0;
    };
    healthFilterCarousel.addEventListener('pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      stopHealthGlide();
      isDragging = true;
      dragStart = event.clientX;
      dragScroll = healthFilterCarousel.scrollLeft;
      previousScroll = dragScroll;
      previousTime = performance.now();
      dragVelocity = 0;
      dragMoved = false;
      healthFilterCarousel.classList.add('is-dragging');
      healthFilterCarousel.setPointerCapture?.(event.pointerId);
    });
    healthFilterCarousel.addEventListener('pointermove', event => {
      if (!isDragging) return;
      const movement = event.clientX - dragStart;
      const nextScroll = dragScroll - movement;
      const now = performance.now();
      const elapsed = Math.max(1, now - previousTime);
      healthFilterCarousel.scrollLeft = nextScroll;
      const instantVelocity = (healthFilterCarousel.scrollLeft - previousScroll) / elapsed;
      dragVelocity = (dragVelocity * .68) + (instantVelocity * .32);
      previousScroll = healthFilterCarousel.scrollLeft;
      previousTime = now;
      if (Math.abs(movement) > 6) {
        dragMoved = true;
        event.preventDefault();
      }
    });
    healthFilterCarousel.addEventListener('pointerup', event => finishHealthDrag(event, true));
    healthFilterCarousel.addEventListener('pointercancel', event => finishHealthDrag(event, false));
    healthFilterCarousel.addEventListener('lostpointercapture', event => finishHealthDrag(event, false));
    healthFilterButtons.forEach(button => {
      button.addEventListener('click', event => {
        if (blockHealthFilterClick) {
          event.preventDefault();
          return;
        }
        healthFilterButtons.forEach(item => {
          const active = item === button;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      });
    });
  }
  const bindRegisterCarousel = (track) => {
    if (!track) return;
    let isRegisterPanning = false;
    let registerPanStart = 0;
    let registerPanScroll = 0;
    let registerPanMoved = false;
    let registerTapHandled = false;
    let registerPointerMetric = '';
    track.addEventListener('pointerdown', event => {
      if (event.target.closest('[data-register-favorite-toggle]')) return;
      const button = event.target.closest('[data-register-metric]');
      isRegisterPanning = true;
      registerPanStart = event.clientX;
      registerPanScroll = track.scrollLeft;
      registerPanMoved = false;
      registerTapHandled = false;
      registerPointerMetric = button && track.contains(button) ? button.dataset.registerMetric : '';
      track.setPointerCapture?.(event.pointerId);
    });
    track.addEventListener('pointermove', event => {
      if (!isRegisterPanning) return;
      const movement = event.clientX - registerPanStart;
      track.scrollLeft = registerPanScroll - movement;
      if (Math.abs(movement) > 8) {
        registerPanMoved = true;
        track.classList.add('is-panning');
      }
      if (registerPanMoved) event.preventDefault();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => {
      track.addEventListener(type, event => {
        if (event.target.closest('[data-register-favorite-toggle]')) {
          isRegisterPanning = false;
          track.classList.remove('is-panning');
          registerPointerMetric = '';
          return;
        }
        if (type === 'pointerup' && !registerPanMoved && registerPointerMetric) {
          toggleRegisterMetricPanel(registerPointerMetric);
          registerTapHandled = true;
        }
        isRegisterPanning = false;
        track.classList.remove('is-panning');
        registerPointerMetric = '';
        if (track.hasPointerCapture?.(event.pointerId)) track.releasePointerCapture(event.pointerId);
      });
    });
    track.addEventListener('click', event => {
      const favoriteToggle = event.target.closest('[data-register-favorite-toggle]');
      if (favoriteToggle && track.contains(favoriteToggle)) {
        event.preventDefault();
        event.stopPropagation();
        toggleRegisterFavorite(favoriteToggle.dataset.registerMetricFavorite);
        return;
      }
      const button = event.target.closest('[data-register-metric]');
      if (!button || !track.contains(button)) return;
      if (registerTapHandled) {
        registerTapHandled = false;
        return;
      }
      if (registerPanMoved) {
        event.preventDefault();
        registerPanMoved = false;
        return;
      }
      toggleRegisterMetricPanel(button.dataset.registerMetric);
    });
    track.addEventListener('keydown', event => {
      const favoriteToggle = event.target.closest('[data-register-favorite-toggle]');
      if (!favoriteToggle || !track.contains(favoriteToggle)) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleRegisterFavorite(favoriteToggle.dataset.registerMetricFavorite);
    });
  };
  renderRegisterMetricRows();
  setRegisterMetricView('favorites', { hidePanel: false });
  setRegisterHistoryView('all', { hideSaved: false });
  setRegisterSection('parameters');
  hideRegisterHistoryComposer();
  registerViewSwitch?.addEventListener('click', event => {
    const button = event.target.closest('[data-register-view-mode]');
    if (!button || !registerViewSwitch.contains(button)) return;
    setRegisterSection(button.dataset.registerViewMode);
  });
  registerViewSwitch?.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const currentIndex = registerViewButtons.findIndex(button => button.classList.contains('is-active'));
    const nextButton = registerViewButtons[currentIndex <= 0 ? 1 : 0];
    if (!nextButton) return;
    setRegisterSection(nextButton.dataset.registerViewMode);
    nextButton.focus();
  });
  const setActiveRegisterFilterView = view => {
    if (activeRegisterSection === 'history') setRegisterHistoryView(view);
    else setRegisterMetricView(view);
  };
  registerFilterSwitch?.addEventListener('click', event => {
    const button = event.target.closest('[data-register-filter-view]');
    if (!button || !registerFilterSwitch.contains(button)) return;
    setActiveRegisterFilterView(button.dataset.registerFilterView);
  });
  registerFilterSwitch?.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const currentIndex = registerFilterViewButtons.findIndex(button => button.classList.contains('is-active'));
    const nextIndex = currentIndex <= 0 ? 1 : 0;
    const nextButton = registerFilterViewButtons[nextIndex];
    if (!nextButton) return;
    setActiveRegisterFilterView(nextButton.dataset.registerFilterView);
    nextButton.focus();
  });
  setHealthSection('parameters');
  healthViewSwitch?.addEventListener('click', event => {
    const button = event.target.closest('[data-health-view-mode]');
    if (!button || !healthViewSwitch.contains(button)) return;
    setHealthSection(button.dataset.healthViewMode);
  });
  healthViewSwitch?.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const currentIndex = healthViewButtons.findIndex(button => button.classList.contains('is-active'));
    const nextButton = healthViewButtons[currentIndex <= 0 ? 1 : 0];
    if (!nextButton) return;
    setHealthSection(nextButton.dataset.healthViewMode);
    nextButton.focus();
  });
  renderHealthDashboard();
  portal.querySelectorAll('[data-health-carousel]').forEach(bindHealthCarousel);
  healthMetricSwitch?.addEventListener('click', event => {
    const button = event.target.closest('[data-health-metric-view]');
    if (!button || !healthMetricSwitch.contains(button)) return;
    setHealthMetricView(button.dataset.healthMetricView);
  });
  healthMetricSwitch?.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const currentIndex = healthMetricViewButtons.findIndex(button => button.classList.contains('is-active'));
    const nextButton = healthMetricViewButtons[currentIndex <= 0 ? 1 : 0];
    if (!nextButton) return;
    setHealthMetricView(nextButton.dataset.healthMetricView);
    nextButton.focus();
  });
  healthRangeTabs?.addEventListener('click', event => {
    const button = event.target.closest('[data-health-range]');
    if (!button || !healthRangeTabs.contains(button)) return;
    setHealthRange(button.dataset.healthRange);
  });
  [healthDateFrom, healthDateTo].forEach(input => {
    input?.addEventListener('change', () => setHealthRange('custom'));
  });
  let historyPanMoved = false;
  let historyClickBlocked = false;
  let historyPointerCategory = '';
  let historyTapHandled = false;
  if (registerHistoryCarousel) {
    let isHistoryPanning = false;
    let historyPanStart = 0;
    let historyPanScroll = 0;
    let historyClickBlockTimer = null;

    registerHistoryCarousel.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (event.target.closest('[data-register-history-favorite]')) return;
      const button = event.target.closest('[data-register-history-category]');
      if (historyClickBlockTimer) window.clearTimeout(historyClickBlockTimer);
      isHistoryPanning = true;
      historyPanStart = event.clientX;
      historyPanScroll = registerHistoryCarousel.scrollLeft;
      historyPanMoved = false;
      historyClickBlocked = false;
      historyTapHandled = false;
      historyPointerCategory = button && registerHistoryCarousel.contains(button) ? button.dataset.registerHistoryCategory : '';
      registerHistoryCarousel.setPointerCapture?.(event.pointerId);
    });

    registerHistoryCarousel.addEventListener('pointermove', event => {
      if (!isHistoryPanning) return;
      const movement = event.clientX - historyPanStart;
      registerHistoryCarousel.scrollLeft = historyPanScroll - movement;
      if (Math.abs(movement) > 8) {
        historyPanMoved = true;
        registerHistoryCarousel.classList.add('is-panning');
      }
      if (historyPanMoved) event.preventDefault();
    });

    const finishHistoryPan = event => {
      if (!isHistoryPanning) return;
      isHistoryPanning = false;
      registerHistoryCarousel.classList.remove('is-panning');
      if (registerHistoryCarousel.hasPointerCapture?.(event.pointerId)) {
        registerHistoryCarousel.releasePointerCapture(event.pointerId);
      }
      if (!historyPanMoved && historyPointerCategory) {
        event.preventDefault();
        toggleRegisterHistoryComposer(historyPointerCategory);
        historyTapHandled = true;
        historyPointerCategory = '';
        return;
      }
      historyPointerCategory = '';
      if (!historyPanMoved) return;
      historyClickBlocked = true;
      historyClickBlockTimer = window.setTimeout(() => {
        historyClickBlocked = false;
        historyPanMoved = false;
      }, 180);
    };

    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => {
      registerHistoryCarousel.addEventListener(type, finishHistoryPan);
    });
  }
  registerHistoryCarousel?.addEventListener('click', event => {
    const favorite = event.target.closest('[data-register-history-favorite]');
    if (favorite && registerHistoryCarousel.contains(favorite)) {
      event.preventDefault();
      historyTapHandled = false;
      if (!historyClickBlocked && !historyPanMoved) toggleRegisterHistoryFavorite(favorite.dataset.registerHistoryFavorite);
      return;
    }
    if (historyTapHandled) {
      historyTapHandled = false;
      return;
    }
    if (historyClickBlocked || historyPanMoved) {
      event.preventDefault();
      return;
    }
    const button = event.target.closest('[data-register-history-category]');
    if (!button || !registerHistoryCarousel.contains(button)) return;
    toggleRegisterHistoryComposer(button.dataset.registerHistoryCategory);
  });
  registerHistoryCarousel?.addEventListener('scroll', syncRegisterHistoryComposerPointer, { passive: true });
  registerHistoryManualInput?.addEventListener('input', updateRegisterHistoryManualCount);
  registerHistoryNotesInput?.addEventListener('input', updateRegisterHistoryNotesCount);
  registerHistoryCollapse?.addEventListener('click', hideRegisterHistoryComposer);
  registerHistoryPhotoPick?.addEventListener('click', () => {
    openRegisterImageDialog('history');
  });
  registerHistoryFilePick?.addEventListener('click', () => registerHistoryFileInput?.click());
  registerHistoryFileInput?.addEventListener('change', () => {
    const file = registerHistoryFileInput.files?.[0];
    if (!file) return;
    if (registerHistoryPhotoInput) registerHistoryPhotoInput.value = '';
    setRegisterHistoryAttachment(file);
    if (registerHistoryFeedback) registerHistoryFeedback.hidden = true;
  });
  registerHistoryPhotoInput?.addEventListener('change', () => {
    const file = registerHistoryPhotoInput.files && registerHistoryPhotoInput.files[0];
    handleRegisterImageSelection('history', file || null);
    if (registerHistoryFeedback) registerHistoryFeedback.hidden = true;
  });
  registerHistoryPhotoClear?.addEventListener('click', () => {
    if (registerHistoryPhotoInput) registerHistoryPhotoInput.value = '';
    if (registerHistoryFileInput) registerHistoryFileInput.value = '';
    setRegisterHistoryAttachment(null);
    if (registerHistoryFeedback) registerHistoryFeedback.hidden = true;
  });
  registerHistorySubmit?.addEventListener('click', async () => {
    const historyCategoryKey = getRegisterHistoryCategoryKey();
    const historyCategory = registerAttachmentCategoryConfig[historyCategoryKey] || registerAttachmentCategoryConfig.consultation;
    const text = String(registerHistoryManualInput?.value || '').trim();
    const notes = String(registerHistoryNotesInput?.value || '').trim();
    const provider = String(registerHistoryProviderInput?.value || '').trim();
    const recordedAt = registerHistoryDateInput?.value || registerDateValue();
    const attachment = registerHistoryAttachmentFile;
    if (!text && !notes && !attachment) {
      setRegisterHistoryFeedback('Agrega texto o un archivo antes de guardar.', 'error');
      registerHistoryManualInput?.focus({ preventScroll: true });
      return;
    }
    if (registerHistoryDateInput && !registerHistoryDateInput.value) {
      registerHistoryDateInput.value = registerDateValue();
    }
    const summaryText = text || notes || 'Archivo adjunto';
    const preview = summaryText.length > 90 ? `${summaryText.slice(0, 87)}...` : summaryText;
    registerHistorySubmit.disabled = true;
    try {
      const recordId = Date.now();
      const documentId = await uploadRegisterAttachment(attachment, recordId, historyCategory.historyFilter);
      saveRegisterRecord({
        id: recordId,
        metricType: 'clinical-history-note',
        label: historyCategory.label,
        value: preview,
        unit: '',
        recordedAt,
        notes,
        historyDetail: text || notes || 'Archivo adjunto',
        historyCategory: historyCategory.historyFilter,
        historyCategoryLabel: historyCategory.label,
        historyCategoryService: historyCategory.service,
        attachmentName: attachment ? attachment.name : '',
        attachmentSize: attachment ? attachment.size : 0,
        attachmentDocumentId: documentId,
        attachmentTranscript: [text, notes].filter(Boolean).join('\n\n'),
        attachmentCategory: attachment ? historyCategory.historyFilter : '',
        attachmentCategoryLabel: attachment ? historyCategory.label : '',
        source: provider || historyCategory.defaultSource || 'Registro manual',
      });
      renderManualHistoryRecords();
      resetRegisterHistoryComposerFields();
      showRegisterSavedScreen('history', { historyCategory: historyCategoryKey });
    } catch (error) {
      setRegisterHistoryFeedback(error.message || 'No se pudo guardar el registro.', 'error');
    } finally {
      registerHistorySubmit.disabled = false;
    }
  });
  portal.querySelectorAll('[data-register-carousel]').forEach(bindRegisterCarousel);
  registerAttachmentInput?.addEventListener('change', () => {
    const file = registerAttachmentInput.files && registerAttachmentInput.files[0];
    handleRegisterImageSelection('parameter', file || null);
  });
  registerFilePick?.addEventListener('click', () => registerFileInput?.click());
  registerFileInput?.addEventListener('change', () => {
    const file = registerFileInput.files?.[0];
    if (!file) return;
    if (registerAttachmentInput) registerAttachmentInput.value = '';
    setRegisterAttachmentState(file);
    if (registerSuccess) registerSuccess.hidden = true;
  });
  registerNotesInput?.addEventListener('input', updateRegisterNotesCount);
  registerAttachmentPick?.addEventListener('click', () => {
    openRegisterImageDialog('parameter');
  });
  registerAttachmentChange?.addEventListener('click', () => {
    registerFileInput?.click();
  });
  registerAttachmentClear?.addEventListener('click', () => {
    if (registerAttachmentInput) registerAttachmentInput.value = '';
    if (registerFileInput) registerFileInput.value = '';
    setRegisterAttachmentState(null);
  });
  registerImageDialog?.querySelectorAll('[data-register-image-source]').forEach(button => {
    button.addEventListener('click', () => chooseRegisterImageSource(button.dataset.registerImageSource));
  });
  registerImageDialog?.querySelectorAll('[data-register-image-action]').forEach(button => {
    button.addEventListener('click', () => applyRegisterImageSelection(button.dataset.registerImageAction));
  });
  registerImageDialog?.querySelector('[data-register-image-close]')?.addEventListener('click', () => closeRegisterImageDialog());
  registerImageDialog?.querySelector('[data-register-image-cancel]')?.addEventListener('click', () => closeRegisterImageDialog());
  registerImageDialog?.addEventListener('click', event => {
    const sheet = registerImageDialog.querySelector('.patient-register-image-sheet');
    if (!sheet) return;
    const bounds = sheet.getBoundingClientRect();
    const clickedOutside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (clickedOutside) closeRegisterImageDialog();
  });
  registerImageDialog?.addEventListener('close', () => {
    if (!pendingRegisterImageTarget) return;
    const input = registerImageInputForTarget(pendingRegisterImageTarget);
    if (input) input.value = '';
    resetPendingRegisterImage();
  });
  registerTranscriptEdit?.addEventListener('click', () => {
    setRegisterTranscriptEditing(Boolean(registerTranscriptInput?.readOnly));
  });
  registerAttachmentCategoryInput?.addEventListener('change', () => {
    registerAttachmentCategoryInput.setCustomValidity('');
  });
  registerForm?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!registerForm.reportValidity()) return;
    const data = new FormData(registerForm);
    const metricType = String(data.get('metricType') || 'water');
    const config = registerMetricConfig[metricType] || registerMetricConfig.water;
    const customMetric = String(data.get('customMetric') || '').trim();
    const attachment = registerParameterAttachmentFile;
    const historyCategoryKey = registerAttachmentCategoryConfig[String(data.get('historyCategory') || '')] ? String(data.get('historyCategory')) : 'manual';
    const historyCategory = registerAttachmentCategoryConfig[historyCategoryKey] || registerAttachmentCategoryConfig.manual;
    const attachmentCategoryKey = attachment ? String(data.get('attachmentCategory') || historyCategoryKey) : '';
    registerAttachmentCategoryInput?.setCustomValidity('');
    const attachmentCategory = attachment ? (registerAttachmentCategoryConfig[attachmentCategoryKey] || historyCategory) : null;
    const submitButton = registerForm.querySelector('.patient-register-parameter-submit');
    if (submitButton) submitButton.disabled = true;
    try {
      const recordId = Date.now();
      const documentId = await uploadRegisterAttachment(attachment, recordId, attachmentCategory?.historyFilter || historyCategory.historyFilter);
      saveRegisterRecord({
        id: recordId,
        metricType,
        label: metricType === 'custom' && customMetric ? customMetric : config.label,
        value: String(data.get('value') || '').trim(),
        unit: config.unit,
        recordedAt: String(data.get('recordedAt') || ''),
        notes: String(data.get('notes') || '').trim(),
        historyCategory: historyCategory.historyFilter,
        historyCategoryLabel: historyCategory.label,
        historyCategoryService: historyCategory.parameterService || historyCategory.service,
        attachmentName: attachment ? attachment.name : '',
        attachmentSize: attachment ? attachment.size : 0,
        attachmentDocumentId: documentId,
        attachmentTranscript: attachment ? String(data.get('attachmentTranscript') || '').trim() : '',
        attachmentCategory: attachmentCategory ? attachmentCategory.historyFilter : '',
        attachmentCategoryLabel: attachmentCategory ? attachmentCategory.label : '',
        source: 'Registro manual',
      });
      renderManualHistoryRecords();
      registerForm.reset();
      if (registerDateInput) registerDateInput.value = registerDateValue();
      updateRegisterNotesCount();
      setRegisterAttachmentState(null);
      hideRegisterHistoryComposer();
      selectRegisterMetric(metricType);
      showRegisterSavedScreen('parameter', { metricType });
    } catch (error) {
      if (registerSuccess) {
        registerSuccess.textContent = error.message || 'No se pudo guardar el registro.';
        registerSuccess.classList.add('is-error');
        registerSuccess.hidden = false;
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
  registerForm?.addEventListener('reset', () => {
    setTimeout(() => {
      if (registerDateInput) registerDateInput.value = registerDateValue();
      updateRegisterNotesCount();
      setRegisterAttachmentState(null);
      if (registerSuccess) registerSuccess.hidden = true;
      hideRegisterHistoryComposer();
      selectRegisterMetric(registerMetricInput?.value || 'water');
    });
  });
  registerSavedScreens.forEach(screen => {
    screen.querySelector('[data-register-saved-history]')?.addEventListener('click', () => {
      hideRegisterSavedScreens();
      renderManualHistoryRecords();
      openView('history');
    });
    screen.querySelector('[data-register-saved-new]')?.addEventListener('click', () => {
      const savedType = screen.dataset.registerSavedScreen;
      hideRegisterSavedScreens();
      if (savedType === 'parameter') {
        showRegisterMetricPanel(lastRegisterSavedMetricType || registerMetricInput?.value || 'water');
        return;
      }
      selectRegisterHistoryCategory(lastRegisterSavedHistoryCategory || 'consultation', { showComposer: true });
      requestAnimationFrame(() => {
        registerHistoryComposer?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  });
  updateRegisterNotesCount();
  updateRegisterHistoryManualCount();
  updateRegisterHistoryNotesCount();
  setRegisterAttachmentState(null);
  aiTopForm?.addEventListener('submit', event => {
    event.preventDefault();
    sendAiMessage(aiTopInput?.value, { clearTop: false });
  });
  aiChatForm?.addEventListener('submit', event => {
    event.preventDefault();
    sendAiMessage(aiChatInput?.value);
  });
  aiChatPanel?.addEventListener('click', event => {
    if (event.target.closest('[data-ai-chat-close]')) {
      closeAiChat();
      return;
    }
  });
  renderAiConversation();
  const syncActivePatientProfileContext = (profile = null) => {
    activePatientProfile = normalizeActivePatientProfile(profile || readActivePatientProfile());
    applyActivePatientProfileShell();
    aiConversation = loadAiConversation();
    registerFavoriteMetrics = loadRegisterFavorites();
    registerFavoriteHistoryCategories = loadRegisterHistoryFavorites();
    const registerFavoriteScroll = registerFavorites?.scrollLeft || 0;
    const registerOptionsScroll = registerOptions?.scrollLeft || 0;
    const healthFavoriteScroll = healthFavorites?.scrollLeft || 0;
    const healthOptionsScroll = healthOptions?.scrollLeft || 0;
    renderRegisterMetricRows();
    syncRegisterHistoryCategories();
    renderManualHistoryRecords();
    healthDashboardRendered = false;
    renderHealthDashboard();
    renderAiConversation();
    requestAnimationFrame(() => {
      if (registerFavorites) registerFavorites.scrollLeft = registerFavoriteScroll;
      if (registerOptions) registerOptions.scrollLeft = registerOptionsScroll;
      if (healthFavorites) healthFavorites.scrollLeft = healthFavoriteScroll;
      if (healthOptions) healthOptions.scrollLeft = healthOptionsScroll;
    });
    if (homePostsApp?.switchPatientProfile || communitiesApp?.switchPatientProfile) {
      const activeProfile = getActivePatientProfile();
      const patientContext = {
        id: getActivePatientProfileId(),
        name: activeProfile.name,
        photo: activeProfile.photo,
      };
      homePostsApp?.switchPatientProfile(patientContext, activeCommunitiesStorageKey());
      communitiesApp?.switchPatientProfile(patientContext, activeCommunitiesStorageKey());
      if (calendarSection === 'activities' && communitiesRoot?.parentElement === calendarActivities) communitiesApp?.showCalendar();
    }
  };
  window.addEventListener('drsam:patient-profile', event => {
    if (event.detail?.action === 'profile:deleted') {
      clearProfileScopedStorage(event.detail.payload?.profileId || event.detail.payload?.profile?.userId);
      return;
    }
    if (event.detail?.action !== 'profile:active-changed') return;
    syncActivePatientProfileContext(event.detail.payload?.profile || null);
  });
  portal.addEventListener('click', event => {
    const healthClose = event.target.closest('[data-health-screen-close]');
    if (healthClose) {
      closeHealthScreen();
      return;
    }
    const healthOpen = event.target.closest('[data-health-open]');
    if (healthOpen) {
      openHealthScreen(healthOpen.dataset.healthOpen);
      return;
    }
    if (healthScreenLayer && event.target === healthScreenLayer) {
      closeHealthScreen();
      return;
    }
    const supportToggle = event.target.closest('[data-support-toggle]');
    if (supportToggle) {
      const menu = portal.querySelector('[data-support-menu]');
      const willOpen = !portal.classList.contains('is-support-open');
      portal.classList.toggle('is-support-open', willOpen);
      supportToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      menu?.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
      return;
    }
    if (event.target.closest('[data-support-menu] [data-profile-view]')) {
      portal.classList.remove('is-support-open');
      portal.querySelector('[data-support-toggle]')?.setAttribute('aria-expanded', 'false');
      portal.querySelector('[data-support-menu]')?.setAttribute('aria-hidden', 'true');
      return;
    }
    const trigger = event.target.closest('[data-open-view]');
    if (trigger) {
      openView(trigger.dataset.openView);
      if (trigger.dataset.openView === 'home') homePostsApp?.showPosts();
      if (trigger.dataset.openView === 'communities') communitiesApp?.showFeed();
      portal.classList.remove('is-support-open');
      portal.querySelector('[data-support-toggle]')?.setAttribute('aria-expanded', 'false');
      portal.querySelector('[data-support-menu]')?.setAttribute('aria-hidden', 'true');
    }
  });
  document.addEventListener('click', event => {
    if (!portal.classList.contains('is-support-open') || event.target.closest('[data-support-toggle], [data-support-menu]')) return;
    portal.classList.remove('is-support-open');
    portal.querySelector('[data-support-toggle]')?.setAttribute('aria-expanded', 'false');
    portal.querySelector('[data-support-menu]')?.setAttribute('aria-hidden', 'true');
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeHealthScreen();
    portal.classList.remove('is-support-open');
    portal.querySelector('[data-support-toggle]')?.setAttribute('aria-expanded', 'false');
    portal.querySelector('[data-support-menu]')?.setAttribute('aria-hidden', 'true');
  });
  const initialHashView = window.location.hash === '#communities' || window.location.hash?.startsWith('#community-admin-') ? 'communities' : null;
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#communities') {
      openView('communities');
      communitiesApp?.showFeed();
    } else if (window.location.hash?.startsWith('#community-admin-')) {
      openView('communities');
    }
  });
  const serverRequestedView = @json(session('patient_open_view'));
  const validationErrorView = @json($errors->any() ? (old('doctor_id') ? 'doctors' : (old('policy_number') ? 'insurance' : 'profile')) : null);
  const initial = initialHashView || serverRequestedView || validationErrorView || sessionStorage.getItem('patientPortalView') || 'home';
  openView(portal.querySelector(`[data-patient-view="${initial}"]`) ? initial : 'home');

  portal.querySelectorAll('[data-table-search]').forEach(input => input.addEventListener('input', () => {
    const table = document.getElementById(input.dataset.tableSearch);
    table?.querySelectorAll('tbody tr').forEach(row => row.hidden = !row.innerText.toLowerCase().includes(input.value.toLowerCase()));
  }));
  portal.querySelectorAll('[data-card-search]').forEach(input => input.addEventListener('input', () => {
    document.getElementById(input.dataset.cardSearch)?.querySelectorAll('article').forEach(card => card.hidden = !card.innerText.toLowerCase().includes(input.value.toLowerCase()));
  }));
  const doctorCards = [...portal.querySelectorAll('[data-doctor-card]')];
  const doctorCountryFilter = portal.querySelector('[data-doctor-country-filter]');
  const doctorCityFilter = portal.querySelector('[data-doctor-city-filter]');
  const doctorSpecialtyFilter = portal.querySelector('[data-doctor-specialty-filter]');
  const doctorInsurerFilter = portal.querySelector('[data-doctor-insurer-filter]');
  const doctorNameFilter = portal.querySelector('[data-doctor-name-filter]');
  const doctorSearchAction = portal.querySelector('[data-doctor-search-action]');
  const doctorSearchForm = portal.querySelector('[data-doctor-search-form]');
  const doctorSearchSummary = portal.querySelector('[data-doctor-search-summary]');
  const doctorSearchLocation = portal.querySelector('[data-doctor-search-location]');
  const doctorSearchDetails = portal.querySelector('[data-doctor-search-details]');
  const doctorResultsSection = portal.querySelector('[data-doctor-results-section]');
  const doctorEditSearchButtons = [...portal.querySelectorAll('[data-doctor-edit-search]')];
  const doctorSelectButtons = [...portal.querySelectorAll('[data-doctor-select]')];
  const doctorCount = portal.querySelector('[data-doctor-count]');
  const doctorFilterEmpty = portal.querySelector('[data-doctor-filter-empty]');
  const doctorHero = portal.querySelector('.patient-doctors-view .patient-doctors-hero');
  const doctorBookingRoot = portal.querySelector('[data-doctor-booking]');
  const doctorBookingSteps = [...portal.querySelectorAll('[data-doctor-booking-step]')];
  const parseDoctorBookingJson = selector => {
    try {
      return JSON.parse(portal.querySelector(selector)?.textContent || 'null');
    } catch (error) {
      return null;
    }
  };
  const doctorBookingData = parseDoctorBookingJson('[data-doctor-booking-data]') || {};
  const doctorBookingConfirmation = parseDoctorBookingJson('[data-doctor-booking-confirmation]');
  let activeBookingDoctor = null;
  let activeBookingDate = null;
  let activeBookingSlot = null;
  let activeBookingReason = '';
  const normalizeDoctorValue = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const renderDoctorDirectory = () => {
    const country = normalizeDoctorValue(doctorCountryFilter?.value);
    const city = normalizeDoctorValue(doctorCityFilter?.value);
    const specialty = normalizeDoctorValue(doctorSpecialtyFilter?.value);
    const insurer = normalizeDoctorValue(doctorInsurerFilter?.value);
    const doctorName = normalizeDoctorValue(doctorNameFilter?.value);
    let visible = 0;
    doctorCards.forEach(card => {
      const matchesCountry = !country || normalizeDoctorValue(card.dataset.doctorCountry) === country;
      const matchesCity = !city || normalizeDoctorValue(card.dataset.doctorCity) === city;
      const matchesSpecialty = !specialty || normalizeDoctorValue(card.dataset.doctorSpecialty) === specialty;
      const acceptedInsurers = String(card.dataset.doctorInsurers || '').split('|').map(normalizeDoctorValue).filter(Boolean);
      const matchesInsurer = !insurer || acceptedInsurers.includes(insurer);
      const matchesName = !doctorName || normalizeDoctorValue(card.dataset.doctorName).includes(doctorName);
      card.hidden = !(matchesCountry && matchesCity && matchesSpecialty && matchesInsurer && matchesName);
      if (!card.hidden) visible++;
    });
    portal.querySelectorAll('[data-doctor-country-shortcut]').forEach(button => {
      const isActive = Boolean(country) && normalizeDoctorValue(button.dataset.doctorCountryShortcut) === country;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    portal.querySelectorAll('[data-doctor-insurer-shortcut]').forEach(button => {
      const isActive = Boolean(insurer) && normalizeDoctorValue(button.dataset.doctorInsurerShortcut) === insurer;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    if (doctorCount) doctorCount.textContent = String(visible);
    if (doctorFilterEmpty) doctorFilterEmpty.hidden = visible > 0;
    return visible;
  };
  const updateDoctorSearchSummary = () => {
    const country = doctorCountryFilter?.value?.trim() || '';
    const city = doctorCityFilter?.value?.trim() || '';
    const details = [
      doctorSpecialtyFilter?.value?.trim() || '',
      doctorInsurerFilter?.value ? `Aseguradora: ${doctorInsurerFilter.value}` : '',
      doctorNameFilter?.value?.trim() ? `Nombre: ${doctorNameFilter.value.trim()}` : '',
    ].filter(Boolean);
    if (doctorSearchLocation) {
      doctorSearchLocation.textContent = [city, country].filter(Boolean).join(', ') || 'Todas las ubicaciones';
    }
    if (doctorSearchDetails) {
      doctorSearchDetails.textContent = details.join(' · ') || 'Todos los profesionales';
    }
  };
  const selectDoctorResult = selectedButton => {
    doctorSelectButtons.forEach(button => {
      const isSelected = button === selectedButton;
      button.classList.toggle('is-selected', isSelected);
      button.closest('[data-doctor-card]')?.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  };
  const showDoctorSearchForm = () => {
    if (doctorHero) doctorHero.hidden = false;
    if (doctorBookingRoot) doctorBookingRoot.hidden = true;
    if (doctorSearchForm) doctorSearchForm.hidden = false;
    if (doctorSearchSummary) doctorSearchSummary.hidden = true;
    if (doctorResultsSection) doctorResultsSection.hidden = true;
    requestAnimationFrame(() => doctorSearchForm?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const showDoctorSearchResults = () => {
    renderDoctorDirectory();
    updateDoctorSearchSummary();
    selectDoctorResult(null);
    if (doctorHero) doctorHero.hidden = false;
    if (doctorBookingRoot) doctorBookingRoot.hidden = true;
    if (doctorSearchForm) doctorSearchForm.hidden = true;
    if (doctorSearchSummary) doctorSearchSummary.hidden = false;
    if (doctorResultsSection) doctorResultsSection.hidden = false;
    requestAnimationFrame(() => doctorSearchSummary?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const setBookingText = (selector, value) => {
    const element = doctorBookingRoot?.querySelector(selector);
    if (element) element.textContent = value || '';
  };
  const doctorInitials = name => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();
  const showDoctorBookingStep = stepName => {
    if (!doctorBookingRoot) return;
    if (doctorHero) doctorHero.hidden = true;
    if (doctorSearchForm) doctorSearchForm.hidden = true;
    if (doctorSearchSummary) doctorSearchSummary.hidden = true;
    if (doctorResultsSection) doctorResultsSection.hidden = true;
    doctorBookingRoot.hidden = false;
    doctorBookingSteps.forEach(step => {
      step.hidden = step.dataset.doctorBookingStep !== stepName;
    });
    const activeStep = doctorBookingSteps.find(step => step.dataset.doctorBookingStep === stepName);
    requestAnimationFrame(() => activeStep?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const populateDoctorProfile = doctor => {
    if (!doctorBookingRoot || !doctor) return;
    const initials = doctor.initials || doctorInitials(doctor.name);
    setBookingText('[data-booking-profile-initials]', initials);
    setBookingText('[data-booking-doctor-name]', doctor.name);
    setBookingText('[data-booking-doctor-specialty]', doctor.specialty);
    setBookingText('[data-booking-doctor-license]', doctor.license ? `Cédula ${doctor.license}` : 'Cédula por confirmar');
    setBookingText('[data-booking-doctor-bio]', doctor.bio);
    setBookingText('[data-booking-doctor-unit]', doctor.unit);
    setBookingText('[data-booking-doctor-address]', doctor.address);
    const photo = doctorBookingRoot.querySelector('[data-booking-profile-photo]');
    const initialsElement = doctorBookingRoot.querySelector('[data-booking-profile-initials]');
    if (photo) {
      photo.hidden = !doctor.photo;
      if (doctor.photo) photo.src = doctor.photo;
    }
    if (initialsElement) initialsElement.hidden = Boolean(doctor.photo);
    const rating = doctorBookingRoot.querySelector('[data-booking-rating]');
    if (rating) {
      const hasRating = doctor.rating !== null && doctor.rating !== '' && Number.isFinite(Number(doctor.rating));
      rating.hidden = !hasRating;
      const value = rating.querySelector('b');
      if (value && hasRating) value.textContent = `${Number(doctor.rating).toFixed(1)}${doctor.reviews !== null && doctor.reviews !== '' ? ` (${doctor.reviews} reseñas)` : ''}`;
    }
    const experience = doctorBookingRoot.querySelector('[data-booking-experience]');
    if (experience) {
      const hasExperience = doctor.experience !== null && doctor.experience !== '' && Number.isFinite(Number(doctor.experience));
      experience.hidden = !hasExperience;
      const value = experience.querySelector('b');
      if (value && hasExperience) value.textContent = String(doctor.experience);
    }
    const preview = doctorBookingRoot.querySelector('[data-booking-profile-dates]');
    preview?.replaceChildren();
    (doctor.slots || []).slice(0, 5).forEach(date => {
      const item = document.createElement('span');
      item.textContent = `${date.weekday} ${date.day}\n${date.slots?.[0]?.label || ''}`;
      preview?.appendChild(item);
    });
    if (preview && !doctor.slots?.length) {
      const empty = document.createElement('span');
      empty.textContent = 'Sin horarios disponibles';
      preview.appendChild(empty);
    }
    const profileNext = doctorBookingRoot.querySelector('[data-doctor-booking-step="profile"] [data-booking-next="schedule"]');
    if (profileNext) {
      profileNext.disabled = !doctor.slots?.length;
      profileNext.textContent = doctor.slots?.length ? 'Ver horarios disponibles' : 'Sin horarios disponibles';
    }
  };
  const selectBookingTime = (button, slot) => {
    activeBookingSlot = slot;
    doctorBookingRoot?.querySelectorAll('[data-booking-time-options] button').forEach(item => item.classList.toggle('is-selected', item === button));
    const scheduleNext = doctorBookingRoot?.querySelector('[data-doctor-booking-step="schedule"] [data-booking-next="reason"]');
    if (scheduleNext) scheduleNext.disabled = false;
  };
  const selectBookingDate = dateIndex => {
    const dates = activeBookingDoctor?.slots || [];
    activeBookingDate = dates[dateIndex] || null;
    activeBookingSlot = null;
    doctorBookingRoot?.querySelectorAll('[data-booking-date-options] button').forEach((button, index) => {
      button.classList.toggle('is-selected', index === dateIndex);
      button.setAttribute('aria-pressed', index === dateIndex ? 'true' : 'false');
    });
    setBookingText('[data-booking-month]', activeBookingDate?.month || 'Próximas fechas');
    setBookingText('[data-booking-selected-date-label]', activeBookingDate?.label || 'la fecha seleccionada');
    const timeOptions = doctorBookingRoot?.querySelector('[data-booking-time-options]');
    timeOptions?.replaceChildren();
    (activeBookingDate?.slots || []).forEach(slot => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'patient-doctor-time-option';
      button.textContent = slot.label;
      button.addEventListener('click', () => selectBookingTime(button, slot));
      timeOptions?.appendChild(button);
    });
    const noSlots = doctorBookingRoot?.querySelector('[data-booking-no-slots]');
    if (noSlots) noSlots.hidden = Boolean(activeBookingDate?.slots?.length);
    const scheduleNext = doctorBookingRoot?.querySelector('[data-doctor-booking-step="schedule"] [data-booking-next="reason"]');
    if (scheduleNext) scheduleNext.disabled = true;
  };
  const renderBookingSchedule = () => {
    const dateOptions = doctorBookingRoot?.querySelector('[data-booking-date-options]');
    dateOptions?.replaceChildren();
    (activeBookingDoctor?.slots || []).forEach((date, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'patient-doctor-date-option';
      button.setAttribute('aria-pressed', 'false');
      const weekday = document.createElement('span');
      weekday.textContent = date.weekday;
      const day = document.createElement('strong');
      day.textContent = date.day;
      button.append(weekday, day);
      button.addEventListener('click', () => selectBookingDate(index));
      dateOptions?.appendChild(button);
    });
    selectBookingDate(0);
  };
  const updateBookingSummary = () => {
    if (!activeBookingDoctor || !activeBookingDate || !activeBookingSlot) return;
    const initials = activeBookingDoctor.initials || doctorInitials(activeBookingDoctor.name);
    setBookingText('[data-booking-summary-initials]', initials);
    setBookingText('[data-booking-summary-doctor]', activeBookingDoctor.name);
    setBookingText('[data-booking-summary-specialty]', activeBookingDoctor.specialty);
    setBookingText('[data-booking-summary-license]', activeBookingDoctor.license ? `Cédula ${activeBookingDoctor.license}` : 'Cédula por confirmar');
    setBookingText('[data-booking-summary-date]', `${activeBookingDate.label} · ${activeBookingSlot.label}`);
    setBookingText('[data-booking-summary-unit]', activeBookingDoctor.unit);
    setBookingText('[data-booking-summary-address]', activeBookingDoctor.address);
    setBookingText('[data-booking-summary-reason]', activeBookingReason);
    const formDoctor = doctorBookingRoot?.querySelector('[data-booking-form-doctor]');
    const formStart = doctorBookingRoot?.querySelector('[data-booking-form-start]');
    const formReason = doctorBookingRoot?.querySelector('[data-booking-form-reason]');
    const formNotes = doctorBookingRoot?.querySelector('[data-booking-form-notes]');
    if (formDoctor) formDoctor.value = activeBookingDoctor.id;
    if (formStart) formStart.value = activeBookingSlot.value;
    if (formReason) formReason.value = activeBookingReason;
    if (formNotes) formNotes.value = doctorBookingRoot?.querySelector('[data-booking-notes]')?.value || '';
  };
  const startDoctorBooking = button => {
    const doctor = doctorBookingData[String(button?.dataset.doctorSelect || '')];
    if (!doctor) return;
    activeBookingDoctor = doctor;
    activeBookingDate = null;
    activeBookingSlot = null;
    activeBookingReason = '';
    selectDoctorResult(button);
    doctorBookingRoot?.querySelectorAll('[data-booking-reason]').forEach(input => { input.checked = false; });
    const notes = doctorBookingRoot?.querySelector('[data-booking-notes]');
    if (notes) notes.value = '';
    setBookingText('[data-booking-notes-count]', '0');
    const reasonNext = doctorBookingRoot?.querySelector('[data-doctor-booking-step="reason"] [data-booking-next="summary"]');
    if (reasonNext) reasonNext.disabled = true;
    populateDoctorProfile(doctor);
    showDoctorBookingStep('profile');
  };
  const renderBookingSuccess = confirmation => {
    if (!confirmation) return;
    const initials = doctorInitials(confirmation.doctor);
    setBookingText('[data-booking-success-initials]', initials);
    setBookingText('[data-booking-success-doctor]', confirmation.doctor);
    setBookingText('[data-booking-success-specialty]', confirmation.specialty);
    setBookingText('[data-booking-success-date]', confirmation.date);
    setBookingText('[data-booking-success-time]', confirmation.time);
    setBookingText('[data-booking-success-unit]', confirmation.unit);
    setBookingText('[data-booking-success-location]', confirmation.location);
    setBookingText('[data-booking-success-reason]', confirmation.reason);
    showDoctorBookingStep('success');
  };
  const updateDoctorCities = () => {
    if (!doctorCityFilter) return;
    const country = normalizeDoctorValue(doctorCountryFilter?.value);
    const placeholder = doctorCityFilter.querySelector('[data-doctor-city-placeholder]');
    let availableCities = 0;
    [...doctorCityFilter.options].forEach(option => {
      if (!option.dataset.country) return;
      const isAvailable = Boolean(country) && normalizeDoctorValue(option.dataset.country) === country;
      option.hidden = !isAvailable;
      option.disabled = !isAvailable;
      if (isAvailable) availableCities++;
    });
    doctorCityFilter.value = '';
    doctorCityFilter.disabled = !country || availableCities === 0;
    if (placeholder) {
      placeholder.textContent = !country
        ? 'Primero selecciona país'
        : availableCities > 0 ? 'Selecciona una ciudad' : 'No hay ciudades disponibles';
    }
  };
  doctorCountryFilter?.addEventListener('change', () => {
    updateDoctorCities();
    renderDoctorDirectory();
  });
  doctorCityFilter?.addEventListener('change', renderDoctorDirectory);
  doctorSpecialtyFilter?.addEventListener('change', renderDoctorDirectory);
  doctorInsurerFilter?.addEventListener('change', renderDoctorDirectory);
  doctorNameFilter?.addEventListener('input', renderDoctorDirectory);
  doctorNameFilter?.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    doctorSearchAction?.click();
  });
  doctorSearchAction?.addEventListener('click', () => {
    showDoctorSearchResults();
  });
  doctorEditSearchButtons.forEach(button => button.addEventListener('click', showDoctorSearchForm));
  doctorSelectButtons.forEach(button => button.addEventListener('click', () => startDoctorBooking(button)));
  doctorBookingRoot?.querySelectorAll('[data-booking-back]').forEach(button => button.addEventListener('click', () => {
    const destination = button.dataset.bookingBack;
    if (destination === 'results') {
      showDoctorSearchResults();
      return;
    }
    showDoctorBookingStep(destination);
  }));
  doctorBookingRoot?.querySelectorAll('[data-booking-next]').forEach(button => button.addEventListener('click', () => {
    const destination = button.dataset.bookingNext;
    if (destination === 'schedule') {
      renderBookingSchedule();
    }
    if (destination === 'reason' && !activeBookingSlot) return;
    if (destination === 'summary') {
      if (!activeBookingReason) return;
      updateBookingSummary();
    }
    showDoctorBookingStep(destination);
  }));
  doctorBookingRoot?.querySelectorAll('[data-booking-reason]').forEach(input => input.addEventListener('change', () => {
    activeBookingReason = input.value;
    const reasonNext = doctorBookingRoot.querySelector('[data-doctor-booking-step="reason"] [data-booking-next="summary"]');
    if (reasonNext) reasonNext.disabled = false;
  }));
  doctorBookingRoot?.querySelector('[data-booking-notes]')?.addEventListener('input', event => {
    setBookingText('[data-booking-notes-count]', String(event.currentTarget.value.length));
  });
  doctorBookingRoot?.querySelector('[data-booking-form]')?.addEventListener('submit', event => {
    if (!activeBookingDoctor || !activeBookingSlot || !activeBookingReason) {
      event.preventDefault();
      return;
    }
    updateBookingSummary();
    const submit = event.currentTarget.querySelector('button[type="submit"]');
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Agendando...';
    }
  });
  doctorBookingRoot?.querySelector('[data-booking-open-calendar]')?.addEventListener('click', () => {
    calendarSection = 'medical';
    openView('calendar');
    requestAnimationFrame(() => portal.querySelector('[data-patient-view="calendar"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  });
  doctorBookingRoot?.querySelector('[data-booking-download-calendar]')?.addEventListener('click', () => {
    if (!doctorBookingConfirmation?.starts_at || !doctorBookingConfirmation?.ends_at) return;
    const formatCalendarDate = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const escapeCalendarText = value => String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const calendarContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Dr Sam//Cita medica//ES',
      'BEGIN:VEVENT',
      `UID:drsam-${Date.now()}@drsam.local`,
      `DTSTAMP:${formatCalendarDate(new Date().toISOString())}`,
      `DTSTART:${formatCalendarDate(doctorBookingConfirmation.starts_at)}`,
      `DTEND:${formatCalendarDate(doctorBookingConfirmation.ends_at)}`,
      `SUMMARY:${escapeCalendarText(`Cita con ${doctorBookingConfirmation.doctor}`)}`,
      `DESCRIPTION:${escapeCalendarText(doctorBookingConfirmation.reason)}`,
      `LOCATION:${escapeCalendarText(doctorBookingConfirmation.location || doctorBookingConfirmation.unit)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const calendarUrl = URL.createObjectURL(new Blob([calendarContent], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = calendarUrl;
    link.download = 'cita-medica-drsam.ics';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(calendarUrl);
  });
  portal.querySelectorAll('[data-doctor-country-shortcut]').forEach(button => button.addEventListener('click', () => {
    if (!doctorCountryFilter) return;
    doctorCountryFilter.value = button.dataset.doctorCountryShortcut || '';
    updateDoctorCities();
    renderDoctorDirectory();
  }));
  portal.querySelectorAll('[data-doctor-insurer-shortcut]').forEach(button => button.addEventListener('click', () => {
    if (!doctorInsurerFilter) return;
    doctorInsurerFilter.value = button.dataset.doctorInsurerShortcut || '';
    renderDoctorDirectory();
  }));
  portal.querySelector('[data-doctor-more-countries]')?.addEventListener('click', event => {
    const button = event.currentTarget;
    const extraCountries = portal.querySelector('[data-doctor-extra-countries]');
    if (!extraCountries) return;
    const willOpen = extraCountries.hidden;
    extraCountries.hidden = !willOpen;
    button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    button.firstChild.textContent = willOpen ? 'Ver menos ' : 'Ver más ';
  });
  portal.querySelector('[data-doctor-more-insurers]')?.addEventListener('click', event => {
    const button = event.currentTarget;
    const extraInsurers = portal.querySelector('[data-doctor-extra-insurers]');
    if (!extraInsurers) return;
    const willOpen = extraInsurers.hidden;
    extraInsurers.hidden = !willOpen;
    button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    button.firstChild.textContent = willOpen ? 'Ver menos ' : 'Ver más ';
  });
  updateDoctorCities();
  renderDoctorDirectory();
  if (doctorBookingConfirmation) {
    renderBookingSuccess(doctorBookingConfirmation);
  } else if (doctorBookingRoot?.dataset.bookingOldDoctor) {
    const oldDoctorButton = doctorSelectButtons.find(button => button.dataset.doctorSelect === doctorBookingRoot.dataset.bookingOldDoctor);
    if (oldDoctorButton) {
      startDoctorBooking(oldDoctorButton);
      renderBookingSchedule();
      const oldStart = doctorBookingRoot.dataset.bookingOldStart;
      const oldDateIndex = (activeBookingDoctor?.slots || []).findIndex(date => date.slots?.some(slot => slot.value === oldStart));
      if (oldDateIndex >= 0) {
        selectBookingDate(oldDateIndex);
        const oldSlotIndex = activeBookingDate?.slots?.findIndex(slot => slot.value === oldStart) ?? -1;
        const oldSlotButton = doctorBookingRoot.querySelectorAll('[data-booking-time-options] button')[oldSlotIndex];
        if (oldSlotIndex >= 0 && oldSlotButton) selectBookingTime(oldSlotButton, activeBookingDate.slots[oldSlotIndex]);
      }
      const oldReason = doctorBookingRoot.dataset.bookingOldReason;
      const oldReasonInput = [...doctorBookingRoot.querySelectorAll('[data-booking-reason]')].find(input => input.value === oldReason);
      if (oldReasonInput) {
        oldReasonInput.checked = true;
        activeBookingReason = oldReason;
      }
      const oldNotes = doctorBookingRoot.querySelector('[data-booking-notes]');
      if (oldNotes) {
        oldNotes.value = doctorBookingRoot.dataset.bookingOldNotes || '';
        setBookingText('[data-booking-notes-count]', String(oldNotes.value.length));
      }
      showDoctorBookingStep('schedule');
    }
  }
  const bindClinicalHistory = historyScope => {
    const historyFilters = [...historyScope.querySelectorAll('[data-history-filter]')];
    const historyViewButtons = [...historyScope.querySelectorAll('[data-history-view]')];
    const historyFilterCarousel = historyScope.querySelector('.patient-history-filters');
    const historyResultsWrap = historyScope.querySelector('.patient-history-table-wrap');
    if (!historyFilterCarousel || !historyFilters.length) return;
    let historyFilterClickBlocked = false;
    let historyFilterTapHandled = false;
    let isHistoryFilterPanning = false;
    let historyFilterPanMoved = false;
    let historyFilterPanStart = 0;
    let historyFilterPanScroll = 0;
    let historyFilterClickBlockTimer = null;
    let historyFilterPointerButton = null;

    const selectHistoryView = button => {
      if (!button) return;
      historyViewButtons.forEach(item => {
        const isActive = item === button;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-selected', isActive ? 'true' : 'false');
        item.setAttribute('tabindex', isActive ? '0' : '-1');
      });
      syncHistoryRowsVisibility(historyScope);
    };
    const centerHistoryFilterButton = button => {
      if (!button) return;
      const targetLeft = button.offsetLeft - ((historyFilterCarousel.clientWidth - button.offsetWidth) / 2);
      const left = Math.max(0, targetLeft);
      if (typeof historyFilterCarousel.scrollTo === 'function') {
        historyFilterCarousel.scrollTo({ left, behavior: 'smooth' });
      } else {
        historyFilterCarousel.scrollLeft = left;
      }
    };
    const selectHistoryFilter = (button, options = {}) => {
      if (!button) return;
      historyFilters.forEach(item => {
        const isActive = item === button;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      syncHistoryRowsVisibility(historyScope);
      if (options.scroll !== false) centerHistoryFilterButton(button);
      if (historyResultsWrap && options.resetResults !== false) {
        if (typeof historyResultsWrap.scrollTo === 'function') {
          historyResultsWrap.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          historyResultsWrap.scrollLeft = 0;
        }
      }
    };

    const activateHistoryCarouselButton = (button, options = {}) => {
      if (button.dataset.openView) openView(button.dataset.openView);
      else selectHistoryFilter(button, options);
    };

    historyViewButtons.forEach((button, index) => {
      button.addEventListener('click', () => selectHistoryView(button));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const next = historyViewButtons[(index + direction + historyViewButtons.length) % historyViewButtons.length];
        selectHistoryView(next);
        next?.focus();
      });
    });
    historyScope.addEventListener('click', event => {
      const favoriteButton = event.target.closest('[data-history-favorite]');
      if (!favoriteButton || !historyScope.contains(favoriteButton)) return;
      const row = favoriteButton.closest('[data-history-favorite-key]');
      const favoriteKey = String(row?.dataset.historyFavoriteKey || '');
      if (!favoriteKey) return;
      const favorites = loadHistoryFavoriteKeys();
      if (favorites.has(favoriteKey)) favorites.delete(favoriteKey);
      else favorites.add(favoriteKey);
      saveHistoryFavoriteKeys(favorites);
      syncHistoryRowsVisibility();
    });

    historyFilterCarousel.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (historyFilterClickBlockTimer) window.clearTimeout(historyFilterClickBlockTimer);
      isHistoryFilterPanning = true;
      historyFilterPanMoved = false;
      historyFilterClickBlocked = false;
      historyFilterPanStart = event.clientX;
      historyFilterPanScroll = historyFilterCarousel.scrollLeft;
      historyFilterPointerButton = event.target.closest('[data-history-filter], [data-open-view]');
      historyFilterCarousel.setPointerCapture?.(event.pointerId);
    });

    historyFilterCarousel.addEventListener('pointermove', event => {
      if (!isHistoryFilterPanning) return;
      const movement = event.clientX - historyFilterPanStart;
      historyFilterCarousel.scrollLeft = historyFilterPanScroll - movement;
      if (Math.abs(movement) > 8) {
        historyFilterPanMoved = true;
        historyFilterCarousel.classList.add('is-panning');
      }
      if (historyFilterPanMoved) event.preventDefault();
    });

    const finishHistoryFilterPan = event => {
      if (!isHistoryFilterPanning) return;
      isHistoryFilterPanning = false;
      historyFilterCarousel.classList.remove('is-panning');
      if (historyFilterCarousel.hasPointerCapture?.(event.pointerId)) {
        historyFilterCarousel.releasePointerCapture(event.pointerId);
      }
      if (event.type === 'pointerup' && !historyFilterPanMoved && historyFilterPointerButton) {
        activateHistoryCarouselButton(historyFilterPointerButton, { scroll: false });
        historyFilterTapHandled = true;
        window.setTimeout(() => {
          historyFilterTapHandled = false;
        }, 0);
        historyFilterPointerButton = null;
        return;
      }
      historyFilterPointerButton = null;
      if (!historyFilterPanMoved) return;
      historyFilterClickBlocked = true;
      historyFilterClickBlockTimer = window.setTimeout(() => {
        historyFilterClickBlocked = false;
        historyFilterPanMoved = false;
      }, 180);
    };

    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => {
      historyFilterCarousel.addEventListener(type, finishHistoryFilterPan);
    });
    historyFilterCarousel.addEventListener('click', event => {
      const button = event.target.closest('[data-history-filter], [data-open-view]');
      if (!button || !historyFilterCarousel.contains(button)) return;
      event.preventDefault();
      event.stopPropagation();
      if (historyFilterClickBlocked || historyFilterTapHandled) return;
      activateHistoryCarouselButton(button);
    });
    historyScope.querySelectorAll('[data-history-step]').forEach(button => button.addEventListener('click', () => {
      const current = Math.max(0, historyFilters.findIndex(item => item.classList.contains('is-active')));
      const next = (current + Number(button.dataset.historyStep) + historyFilters.length) % historyFilters.length;
      selectHistoryFilter(historyFilters[next]);
    }));
  };
  historyScopes.forEach(bindClinicalHistory);
  renderManualHistoryRecords();
  portal.querySelectorAll('[data-prescription-filter]').forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.prescriptionFilter;
    portal.querySelectorAll('[data-prescription-filter]').forEach(item => {
      const isCurrent = item === button;
      item.classList.toggle('is-active', isCurrent);
      item.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
    });
    const prescriptionRows = [...portal.querySelectorAll('[data-prescription-row]')];
    prescriptionRows.forEach(row => {
      row.hidden = filter === 'active' ? row.dataset.status !== 'active'
        : filter === 'expired' ? row.dataset.status !== 'expired'
        : filter === 'redeemed' ? row.dataset.status !== 'redeemed'
        : filter === 'partial' ? row.dataset.status !== 'partial'
        : filter === 'medications' ? row.dataset.hasMedications !== '1'
        : filter === 'analysis' ? row.dataset.hasAnalysis !== '1'
        : false;
    });
    const emptyState = portal.querySelector('[data-prescription-empty]');
    if (emptyState && prescriptionRows.length) {
      emptyState.hidden = prescriptionRows.some(row => !row.hidden);
    }
  }));
  const analysisCards = [...portal.querySelectorAll('[data-analysis-card]')];
  const analysisFilters = [...portal.querySelectorAll('[data-analysis-filter]')];
  const analysisList = portal.querySelector('[data-analysis-list]');
  const analysisFilterBar = portal.querySelector('.patient-analyses-filter-bar');
  const analysisFilteredEmpty = portal.querySelector('.patient-analyses-body > [data-analysis-empty]');
  const analysisFilterDialog = portal.querySelector('[data-analysis-filter-dialog]');
  const analysisFilterChips = [...portal.querySelectorAll('[data-analysis-modal-filter]')];
  const analysisFilterSections = [...portal.querySelectorAll('[data-analysis-filter-section]')];
  const analysisFilterSectionToggles = [...portal.querySelectorAll('[data-analysis-filter-section-toggle]')];
  const analysisFilterSummaries = [...portal.querySelectorAll('[data-analysis-filter-summary]')];
  const analysisFilterOptionRows = [...portal.querySelectorAll('.patient-analysis-filter-options')];
  let analysisFilter = 'all';
  let analysisDateFilter = 'all';
  let analysisSpecialtyFilter = 'all';
  let analysisStatusFilter = 'all';
  let analysisFilterPanMoved = false;
  const analysisFilterSummaryLabels = {
    type: {
      all: 'Todos los tipos',
      laboratory: 'Laboratorio',
      image: 'Imagen',
      pdf: 'PDF',
    },
    date: {
      all: 'Elige un periodo',
      today: 'Hoy',
      week: 'Semana',
      month: 'Mes',
      custom: 'Personalizado',
    },
    specialty: {
      all: 'Todas las especialidades',
      general: 'General',
      cardiologia: 'Cardiología',
      pediatria: 'Pediatría',
      endocrino: 'Endocrino',
    },
    status: {
      all: 'Todos los estados',
      new: 'Nuevo',
      loaded: 'Cargado',
      reviewed: 'Revisado',
    },
  };
  const currentAnalysisFilterValues = () => ({
    type: analysisFilter,
    date: analysisDateFilter,
    specialty: analysisSpecialtyFilter,
    status: analysisStatusFilter,
  });
  const selectedAnalysisChipValue = group => analysisFilterChips
    .find(button => button.dataset.analysisModalFilter === group && button.classList.contains('is-active'))
    ?.dataset.analysisModalValue || 'all';
  const updateAnalysisFilterSummaries = values => {
    const nextValues = values || currentAnalysisFilterValues();
    analysisFilterSummaries.forEach(summary => {
      const group = summary.dataset.analysisFilterSummary;
      const value = nextValues[group] || 'all';
      summary.textContent = analysisFilterSummaryLabels[group]?.[value] || analysisFilterSummaryLabels[group]?.all || '';
    });
  };
  const setAnalysisFilterSectionOpen = (section, isOpen) => {
    const toggle = section.querySelector('[data-analysis-filter-section-toggle]');
    const options = section.querySelector('.patient-analysis-filter-options');
    section.classList.toggle('is-open', isOpen);
    toggle?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (options) options.hidden = !isOpen;
    if (isOpen) {
      options?.querySelector('.is-active')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };
  const closeAnalysisFilterSections = () => {
    analysisFilterSections.forEach(section => setAnalysisFilterSectionOpen(section, false));
  };
  const updateAnalysisFilterButtons = () => {
    analysisFilters.forEach(button => {
      const isCurrent = button.dataset.analysisFilter === analysisFilter;
      button.classList.toggle('is-active', isCurrent);
      button.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
    });
  };
  const updateAnalysisDialogChips = () => {
    const selectedValues = currentAnalysisFilterValues();
    analysisFilterChips.forEach(button => {
      const group = button.dataset.analysisModalFilter;
      const isCurrent = button.dataset.analysisModalValue === selectedValues[group];
      button.classList.toggle('is-active', isCurrent);
      button.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
      if (isCurrent && !button.closest('.patient-analysis-filter-options')?.hidden) {
        button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
    updateAnalysisFilterSummaries(selectedValues);
  };
  const matchesAnalysisDateFilter = card => {
    if (analysisDateFilter === 'all' || analysisDateFilter === 'custom') return true;
    const timestamp = Number(card.dataset.analysisDate || 0);
    if (!timestamp) return false;
    const cardDate = new Date(timestamp * 1000);
    const cardDay = new Date(cardDate);
    const today = new Date();
    cardDay.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (analysisDateFilter === 'today') {
      return cardDay.getTime() === today.getTime();
    }
    if (analysisDateFilter === 'week') {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);
      return cardDay >= weekStart && cardDay <= today;
    }
    if (analysisDateFilter === 'month') {
      return cardDate.getMonth() === today.getMonth() && cardDate.getFullYear() === today.getFullYear();
    }
    return true;
  };
  const renderAnalyses = () => {
    let visible = 0;
    analysisCards.forEach(card => {
      const matchesType = analysisFilter === 'all' || card.dataset.analysisType === analysisFilter;
      const matchesDate = matchesAnalysisDateFilter(card);
      const matchesSpecialty = analysisSpecialtyFilter === 'all' || card.dataset.analysisSpecialty === analysisSpecialtyFilter;
      const matchesStatus = analysisStatusFilter === 'all' || card.dataset.analysisStatus === analysisStatusFilter;
      const isVisible = matchesType && matchesDate && matchesSpecialty && matchesStatus;
      card.hidden = !isVisible;
      if (isVisible) visible++;
    });
    if (analysisFilteredEmpty) {
      analysisFilteredEmpty.hidden = visible > 0 || analysisCards.length === 0;
    }
  };
  if (analysisFilterBar) {
    let isAnalysisFilterPanning = false;
    let analysisFilterPanStart = 0;
    let analysisFilterPanScroll = 0;

    analysisFilterBar.addEventListener('pointerdown', event => {
      isAnalysisFilterPanning = true;
      analysisFilterPanStart = event.clientX;
      analysisFilterPanScroll = analysisFilterBar.scrollLeft;
      analysisFilterPanMoved = false;
      analysisFilterBar.setPointerCapture?.(event.pointerId);
    });

    analysisFilterBar.addEventListener('pointermove', event => {
      if (!isAnalysisFilterPanning) return;
      const movement = event.clientX - analysisFilterPanStart;
      analysisFilterBar.scrollLeft = analysisFilterPanScroll - movement;
      if (Math.abs(movement) > 8) {
        analysisFilterPanMoved = true;
        analysisFilterBar.classList.add('is-panning');
        event.preventDefault();
      }
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => {
      analysisFilterBar.addEventListener(type, event => {
        isAnalysisFilterPanning = false;
        analysisFilterBar.classList.remove('is-panning');
        if (analysisFilterBar.hasPointerCapture?.(event.pointerId)) {
          analysisFilterBar.releasePointerCapture(event.pointerId);
        }
        if (type === 'pointerup' && analysisFilterPanMoved) {
          window.setTimeout(() => {
            analysisFilterPanMoved = false;
          }, 180);
        } else if (type !== 'pointerup') {
          analysisFilterPanMoved = false;
        }
      });
    });
  }
  analysisFilters.forEach(button => button.addEventListener('click', event => {
    if (analysisFilterPanMoved) {
      event.preventDefault();
      window.setTimeout(() => {
        analysisFilterPanMoved = false;
      }, 180);
      return;
    }
    analysisFilter = button.dataset.analysisFilter || 'all';
    updateAnalysisFilterButtons();
    updateAnalysisDialogChips();
    button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    renderAnalyses();
  }));
  analysisFilterOptionRows.forEach(row => {
    let isPanning = false;
    let panStart = 0;
    let panScroll = 0;
    row.dataset.panMoved = '0';

    row.addEventListener('pointerdown', event => {
      isPanning = true;
      panStart = event.clientX;
      panScroll = row.scrollLeft;
      row.dataset.panMoved = '0';
      row.setPointerCapture?.(event.pointerId);
    });

    row.addEventListener('pointermove', event => {
      if (!isPanning) return;
      const movement = event.clientX - panStart;
      row.scrollLeft = panScroll - movement;
      if (Math.abs(movement) > 8) {
        row.dataset.panMoved = '1';
        row.classList.add('is-panning');
        event.preventDefault();
      }
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => {
      row.addEventListener(type, event => {
        isPanning = false;
        row.classList.remove('is-panning');
        if (row.hasPointerCapture?.(event.pointerId)) {
          row.releasePointerCapture(event.pointerId);
        }
        if (type === 'pointerup' && row.dataset.panMoved === '1') {
          window.setTimeout(() => {
            row.dataset.panMoved = '0';
          }, 180);
        } else if (type !== 'pointerup') {
          row.dataset.panMoved = '0';
        }
      });
    });
  });
  analysisFilterSectionToggles.forEach(toggle => toggle.addEventListener('click', () => {
    const section = toggle.closest('[data-analysis-filter-section]');
    if (!section) return;
    const shouldOpen = !section.classList.contains('is-open');
    closeAnalysisFilterSections();
    setAnalysisFilterSectionOpen(section, shouldOpen);
  }));
  portal.querySelector('[data-analysis-sort]')?.addEventListener('click', event => {
    if (!analysisList || !analysisCards.length) return;
    const button = event.currentTarget;
    const currentDirection = button.dataset.analysisSortDirection === 'asc' ? 'asc' : 'desc';
    const nextDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    button.dataset.analysisSortDirection = nextDirection;
    const sortedCards = [...analysisCards].sort((first, second) => {
      const firstDate = Number(first.dataset.analysisDate || 0);
      const secondDate = Number(second.dataset.analysisDate || 0);
      return nextDirection === 'asc' ? firstDate - secondDate : secondDate - firstDate;
    });
    sortedCards.forEach(card => analysisList.appendChild(card));
    const label = button.querySelector('[data-analysis-sort-label]');
    if (label) label.textContent = nextDirection === 'asc' ? 'Fecha antigua' : 'Fecha reciente';
    renderAnalyses();
  });
  analysisFilterChips.forEach(button => button.addEventListener('click', event => {
    const row = button.closest('.patient-analysis-filter-options');
    if (row?.dataset.panMoved === '1') {
      event.preventDefault();
      return;
    }
    const group = button.dataset.analysisModalFilter;
    const shouldActivate = group === 'type' || !button.classList.contains('is-active');
    analysisFilterChips
      .filter(item => item.dataset.analysisModalFilter === group)
      .forEach(item => {
        const isCurrent = shouldActivate && item === button;
        item.classList.toggle('is-active', isCurrent);
        item.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
      });
    if (shouldActivate) button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    updateAnalysisFilterSummaries({
      type: selectedAnalysisChipValue('type'),
      date: selectedAnalysisChipValue('date'),
      specialty: selectedAnalysisChipValue('specialty'),
      status: selectedAnalysisChipValue('status'),
    });
  }));
  portal.querySelector('[data-analysis-filter-open]')?.addEventListener('click', () => {
    updateAnalysisDialogChips();
    closeAnalysisFilterSections();
    if (analysisFilterDialog?.showModal) {
      analysisFilterDialog.showModal();
    }
  });
  portal.querySelector('[data-analysis-filter-close]')?.addEventListener('click', () => {
    analysisFilterDialog?.close();
  });
  analysisFilterDialog?.addEventListener('click', event => {
    const modal = analysisFilterDialog.querySelector('.patient-analysis-filter-modal');
    if (!modal) return;
    const bounds = modal.getBoundingClientRect();
    const clickedOutside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (clickedOutside) analysisFilterDialog.close();
  });
  portal.querySelector('[data-analysis-filter-clear]')?.addEventListener('click', () => {
    analysisFilter = 'all';
    analysisDateFilter = 'all';
    analysisSpecialtyFilter = 'all';
    analysisStatusFilter = 'all';
    updateAnalysisFilterButtons();
    updateAnalysisDialogChips();
    closeAnalysisFilterSections();
    analysisFilters.find(button => button.dataset.analysisFilter === 'all')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    renderAnalyses();
    analysisFilterDialog?.close();
  });
  portal.querySelector('[data-analysis-filter-apply]')?.addEventListener('click', () => {
    analysisFilter = selectedAnalysisChipValue('type');
    analysisDateFilter = selectedAnalysisChipValue('date');
    analysisSpecialtyFilter = selectedAnalysisChipValue('specialty');
    analysisStatusFilter = selectedAnalysisChipValue('status');
    updateAnalysisFilterButtons();
    updateAnalysisFilterSummaries();
    analysisFilters.find(button => button.dataset.analysisFilter === analysisFilter)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    renderAnalyses();
    analysisFilterDialog?.close();
  });
  updateAnalysisFilterButtons();
  updateAnalysisDialogChips();
  renderAnalyses();
  const insuranceForm = portal.querySelector('[data-insurance-form]');
  portal.querySelectorAll('[data-insurance-form-open]').forEach(button => button.addEventListener('click', () => {
    if (!insuranceForm) return;
    insuranceForm.hidden = false;
    insuranceForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  portal.querySelector('[data-insurance-form-close]')?.addEventListener('click', () => {
    insuranceForm.hidden = true;
  });
  const insuranceTabs = [...portal.querySelectorAll('[data-insurance-tab]')];
  const insuranceTabsCarousel = portal.querySelector('[data-insurance-tabs-carousel]');
  const selectInsuranceTab = button => {
    if (!button) return;
    insuranceTabs.forEach(item => item.classList.toggle('is-active', item === button));
    portal.querySelectorAll('[data-insurance-pane]').forEach(pane => {
      pane.classList.toggle('is-active', pane.dataset.insurancePane === button.dataset.insuranceTab);
    });
  };
  let insuranceTabsPanMoved = false;
  let insuranceTabsClickBlocked = false;
  if (insuranceTabsCarousel) {
    let isInsuranceTabsPanning = false;
    let insuranceTabsPanStart = 0;
    let insuranceTabsPanScroll = 0;

    insuranceTabsCarousel.addEventListener('pointerdown', event => {
      isInsuranceTabsPanning = true;
      insuranceTabsPanStart = event.clientX;
      insuranceTabsPanScroll = insuranceTabsCarousel.scrollLeft;
      insuranceTabsPanMoved = false;
      insuranceTabsClickBlocked = false;
      insuranceTabsCarousel.setPointerCapture?.(event.pointerId);
    });

    insuranceTabsCarousel.addEventListener('pointermove', event => {
      if (!isInsuranceTabsPanning) return;
      const movement = event.clientX - insuranceTabsPanStart;
      insuranceTabsCarousel.scrollLeft = insuranceTabsPanScroll - movement;
      if (Math.abs(movement) > 8) {
        insuranceTabsPanMoved = true;
        insuranceTabsCarousel.classList.add('is-panning');
      }
      if (insuranceTabsPanMoved) event.preventDefault();
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => {
      insuranceTabsCarousel.addEventListener(type, event => {
        isInsuranceTabsPanning = false;
        insuranceTabsCarousel.classList.remove('is-panning');
        if (insuranceTabsCarousel.hasPointerCapture?.(event.pointerId)) {
          insuranceTabsCarousel.releasePointerCapture(event.pointerId);
        }
        if (type === 'pointerup' && insuranceTabsPanMoved) {
          insuranceTabsClickBlocked = true;
          window.setTimeout(() => {
            insuranceTabsClickBlocked = false;
            insuranceTabsPanMoved = false;
          }, 180);
        } else if (type !== 'pointerup') {
          insuranceTabsPanMoved = false;
        }
      });
    });
  }
  insuranceTabs.forEach(button => button.addEventListener('click', event => {
    if (insuranceTabsClickBlocked) {
      event.preventDefault();
      return;
    }
    selectInsuranceTab(button);
  }));
  portal.querySelectorAll('[data-insurance-tab-step]').forEach(button => button.addEventListener('click', () => {
    if (insuranceTabsClickBlocked) return;
    const current = Math.max(0, insuranceTabs.findIndex(item => item.classList.contains('is-active')));
    const next = (current + Number(button.dataset.insuranceTabStep) + insuranceTabs.length) % insuranceTabs.length;
    selectInsuranceTab(insuranceTabs[next]);
    insuranceTabs[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }));
  portal.querySelectorAll('[data-prescription-open]').forEach(button => button.addEventListener('click', () => {
    document.getElementById(button.dataset.prescriptionOpen)?.showModal();
  }));
  portal.querySelectorAll('.patient-prescription-dialog').forEach(dialog => {
    dialog.querySelector('[data-prescription-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
  });
  const calendarItems = [...portal.querySelectorAll('[data-calendar-item]')];
  const calendarFilters = [...portal.querySelectorAll('[data-calendar-filter]')];
  let calendarFilter = 'upcoming';
  const renderCalendar = () => {
    let visible = 0;
    calendarItems.forEach(item => {
      item.hidden = (item.dataset.calendarUpcoming === '1') !== (calendarFilter === 'upcoming');
      if (!item.hidden) visible++;
    });
    const panel = portal.querySelector('#patient-calendar-appointments');
    panel?.setAttribute('aria-labelledby', 'patient-calendar-' + calendarFilter + '-tab');
    const empty = portal.querySelector('[data-calendar-filter-empty]');
    if (empty) empty.hidden = visible > 0 || calendarItems.length === 0;
    const emptyLabel = portal.querySelector('[data-calendar-empty-label]');
    if (emptyLabel) emptyLabel.textContent = calendarFilter === 'upcoming' ? 'No tienes próximas citas.' : 'No tienes citas anteriores.';
  };
  calendarFilters.forEach((button, index) => {
    button.addEventListener('click', () => {
      calendarFilter = button.dataset.calendarFilter;
      calendarFilters.forEach(item => {
        const selected = item === button;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
      });
      renderCalendar();
    });
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % calendarFilters.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + calendarFilters.length) % calendarFilters.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = calendarFilters.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      calendarFilters[next].click();
      calendarFilters[next].focus();
    });
  });
  renderCalendar();
  portal.querySelectorAll('[data-calendar-detail-open]').forEach(button => button.addEventListener('click', () => {
    document.getElementById(button.dataset.calendarDetailOpen)?.showModal();
  }));
  portal.querySelectorAll('.patient-calendar-dialog').forEach(dialog => {
    dialog.querySelector('[data-calendar-detail-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
  });
})();
</script>
@endsection
