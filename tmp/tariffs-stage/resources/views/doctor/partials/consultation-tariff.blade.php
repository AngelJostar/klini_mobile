@php
  $consultationTariff = $doctor->currentConsultationTariff;
  $canEditConsultationTariff = auth()->user()?->role === 'doctor'
    && auth()->user()?->status === 'active'
    && $doctor->status === 'active'
    && (int) $doctor->user_id === (int) auth()->id();
@endphp
<section class="doctor-workspace-card" aria-labelledby="doctor-consultation-tariff-title" data-consultation-tariff>
  <div class="doctor-assistant-native-heading">
    <div><h2 id="doctor-consultation-tariff-title">Tarifa de consulta presencial</h2><p>Importe total por consulta, en MXN.</p></div>
    <strong data-current-consultation-tariff>{{ $consultationTariff ? '$'.number_format($consultationTariff->amount_cents / 100, 2).' MXN' : 'Sin tarifa publicada' }}</strong>
  </div>
  @if ($canEditConsultationTariff)
    <form method="post" action="{{ route('doctor.consultation_tariff.update') }}" class="doctor-workspace-form" data-consultation-tariff-form>
      @csrf @method('PATCH')
      <input type="hidden" name="action" value="publish">
      <input type="hidden" name="expected_tariff_id" value="{{ $doctor->current_consultation_tariff_id }}">
      <label>Tarifa total (MXN)<input name="amount" inputmode="decimal" value="{{ old('amount', $consultationTariff ? number_format($consultationTariff->amount_cents / 100, 2, '.', '') : '') }}" placeholder="Escribe tu tarifa" maxlength="16" required></label>
      <button type="submit">{{ $consultationTariff ? 'Guardar nueva tarifa' : 'Publicar tarifa' }}</button>
      <small class="wide">De $50 a $10,000 MXN. Se aplica a nuevas cotizaciones; las vigentes conservan su importe.</small>
    </form>
    @if ($consultationTariff)
      <form method="post" action="{{ route('doctor.consultation_tariff.update') }}" class="doctor-inline-delete" data-consultation-tariff-withdraw>
        @csrf @method('PATCH')
        <input type="hidden" name="action" value="withdraw">
        <input type="hidden" name="expected_tariff_id" value="{{ $consultationTariff->id }}">
        <button type="submit" class="doctor-workspace-secondary">Retirar tarifa</button>
      </form>
    @endif
  @else
    <p>El médico define su tarifa desde su propia cuenta activa.</p>
  @endif
</section>
