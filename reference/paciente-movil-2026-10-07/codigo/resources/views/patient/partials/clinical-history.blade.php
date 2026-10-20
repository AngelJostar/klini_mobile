<div class="patient-history-body" data-clinical-history>
  <nav class="patient-health-parameter-switch patient-history-view-switch" data-history-view-switch role="tablist" aria-label="Vista del historial clínico">
    <button type="button" data-history-view="favorites" role="tab" aria-selected="false" tabindex="-1"><span aria-hidden="true">&#9733;</span>Favoritos</button>
    <button class="is-active" type="button" data-history-view="all" role="tab" aria-selected="true">Todos</button>
  </nav>
  <nav class="patient-history-filters" aria-label="Filtros del historial clínico">
    <button class="is-all is-active" type="button" data-history-filter="all" aria-pressed="true"><span class="patient-register-history-image patient-register-history-all-image" aria-hidden="true"><img src="/images/history-icons/all.png?v=20260828-history-all" alt="" loading="lazy"></span><b>Todos</b></button>
    <button class="is-consultation" type="button" data-history-filter="consultation" aria-pressed="false"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/history-icons/consultation.png?v=20260827-history-icons" alt="" loading="lazy"></span><b>Consulta médica</b></button>
    <button class="is-laboratory" type="button" data-history-filter="laboratory" aria-pressed="false"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/history-icons/laboratory.png?v=20260827-history-icons" alt="" loading="lazy"></span><b>Análisis de laboratorio</b></button>
    <button class="is-study" type="button" data-history-filter="study" aria-pressed="false"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/history-icons/studies.png?v=20260827-history-icons" alt="" loading="lazy"></span><b>Estudios</b></button>
    <button class="is-prescription" type="button" data-history-filter="prescription" aria-pressed="false"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/history-icons/prescriptions.png?v=20260827-history-icons" alt="" loading="lazy"></span><b>Recetas</b></button>
    <button class="is-hospitalization" type="button" data-history-filter="hospitalization" aria-pressed="false"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/history-icons/hospitalization.png?v=20260827-history-icons" alt="" loading="lazy"></span><b>Hospitalización</b></button>
    <button class="is-vaccine" type="button" data-history-filter="vaccine" aria-pressed="false"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/history-icons/vaccines.png?v=20260827-history-icons" alt="" loading="lazy"></span><b>Vacunas</b></button>
    <button class="is-manual" type="button" data-history-filter="manual" aria-pressed="false"><span class="patient-register-history-image" aria-hidden="true"><img src="/images/history-icons/manual-register.png?v=20260827-history-icons" alt="" loading="lazy"></span><b>Registro manual</b></button>
    <button class="is-devices" type="button" data-open-view="devices" title="Ver dispositivos médicos">
      <span class="patient-register-history-glyph" aria-hidden="true">
        <svg viewBox="0 0 44 44" width="44" height="44" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="8" y="4" width="28" height="36" rx="6" fill="#e1f8f4"></rect>
          <rect x="12" y="9" width="20" height="19" rx="3" fill="#fff"></rect>
          <path d="M15 19h3l2-5 4 10 2-5h3"></path>
          <circle cx="22" cy="34" r="2" fill="currentColor" stroke="none"></circle>
        </svg>
      </span>
      <b>Dispositivos médicos</b>
    </button>
  </nav>
  <div class="patient-history-table-wrap">
    <table class="patient-history-table">
      <thead><tr><th>Fecha</th><th>Categoría</th><th>Origen</th><th>Especialidad o tipo de servicio</th><th>Resumen clínico</th><th>Receta / Indicaciones</th></tr></thead>
      <tbody data-history-body>
        @forelse ($historyItems as $item)
          <tr data-history-row="{{ $item['category'] }}" data-history-favorite-key="{{ $item['key'] }}" data-history-primary-row="1">
            <td>
              <div class="patient-history-date-cell">
                <div class="patient-history-date"><span>□</span><strong>{{ $item['date']?->format('d/m/Y') ?? 'No registrada' }}<small>{{ $item['date']?->translatedFormat('l') ?? '' }}</small></strong></div>
                <button class="patient-history-favorite" type="button" data-history-favorite aria-pressed="false" aria-label="Agregar registro a favoritos" title="Agregar a favoritos"><span aria-hidden="true">&#9734;</span></button>
              </div>
            </td>
            <td><span class="patient-history-category is-{{ $item['category'] }}">{{ $historyCategoryLabels[$item['category']] ?? 'Registro clínico' }}</span></td>
            <td><div class="patient-history-origin"><span>♙</span><strong>{{ $item['origin'] }}</strong></div></td>
            <td><div class="patient-history-service"><span>⌁</span><strong>{{ $item['service'] }}</strong></div></td>
            <td>{{ $item['summary'] }}</td>
            <td>
              @if(count($item['indications']))
                <div class="patient-history-indications">
                  <span>▤</span>
                  @foreach($item['indications'] as $indication)
                    <div><strong>{{ $indication['title'] }}</strong><p>{{ $indication['detail'] }}</p></div>
                  @endforeach
                </div>
              @else
                <span class="patient-history-not-registered">No registrado</span>
              @endif
            </td>
          </tr>
        @empty
          <tr data-history-empty><td colspan="6" class="patient-portal-empty">No hay registros clínicos.</td></tr>
        @endforelse
        <tr data-history-filter-empty hidden><td colspan="6" class="patient-portal-empty">No hay registros en esta categoría.</td></tr>
      </tbody>
    </table>
  </div>
</div>
