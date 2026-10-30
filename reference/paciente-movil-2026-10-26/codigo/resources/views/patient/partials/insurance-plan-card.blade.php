@php
  $displayMoney = fn ($value) => $value === null ? 'Por definir' : '$'.number_format((float)$value, 2).' MXN';
@endphp
<label class="ki-enroll-plan" data-plan-category="{{ $option['category'] }}">
  @unless($preview ?? false)<input type="radio" name="enroll_plan" value="{{ $option['id'] }}" required>@endunless
  <div><small>{{ $option['category'] === 'life' ? 'Seguro de vida' : 'Gastos médicos mayores' }}{{ $option['is_demo'] ? ' · Demostración' : '' }}</small><strong>{{ $option['name'] }}</strong><small>{{ $option['carrier'] }}</small>
    <b>{{ $option['price'] === null ? 'Por cotizar' : $displayMoney($option['price']).'/mes' }}</b>
    <p>Suma asegurada: {{ $displayMoney($option['insured_amount']) }}</p>
    @if($option['category'] === 'gmm')<p>Deducible: {{ $displayMoney($option['deductible']) }} · Coaseguro: {{ $option['coinsurance'] === null ? 'Por definir' : (float)$option['coinsurance'].'%' }}</p>
    @else<p>{{ data_get($option, 'details.main_coverage', 'Cobertura por definir') }} · Plazo: {{ data_get($option, 'details.term') ?: 'Por definir' }}</p>@endif
  </div>
</label>
