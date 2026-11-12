<section class="superadmin-native-catalog-card">
<h2>Ofertas Klini</h2>
@if(!$kliniProvider)
<p class="pharmacy-notice">Selecciona el distribuidor de venta Klini en Presentación. No se asignará un distribuidor ni un precio automáticamente.</p>
@else
<p>Distribuidor configurado: <strong>{{ $kliniProvider->name }}</strong>. Cada precio Klini pertenece a una oferta existente de esta cuenta.</p>
<p class="pharmacy-notice">Las ofertas se crean desde el panel de este distribuidor. La visibilidad sigue dependiendo de la autorización de publicación y del estado del producto y de la cuenta. Guardar un precio no publica ni vende el producto.</p>
<div class="superadmin-native-catalog-scroll"><table class="superadmin-native-catalog-table"><thead><tr><th>Producto</th><th>Presentación</th><th>Existencias</th><th>Estado</th><th>Precio Klini (MXN)</th></tr></thead><tbody>
@forelse($kliniOffers as $offer)
<tr><td>{{ $offer->catalogItem?->name ?? $offer->name }}<small>SKU: {{ $offer->catalogItem?->sku ?? $offer->sku ?? 'Sin SKU' }}</small></td><td>{{ $offer->catalogItem?->presentation ?? $offer->presentation ?? 'No indicada' }}</td><td>{{ $offer->stock }}</td><td>{{ $offer->status === 'active' ? 'Activo' : 'Inactivo' }}</td><td><form method="POST" action="{{ route('superadmin.digital-pharmacy.klini-offers.price', $offer) }}">@csrf @method('PATCH')<label class="sr-only" for="klini-price-{{ $offer->id }}">Precio Klini de {{ $offer->catalogItem?->name ?? $offer->name }} en MXN</label><input id="klini-price-{{ $offer->id }}" name="price" type="number" step="0.01" min="0.01" max="999999.99" value="{{ $offer->price }}" required><button>Guardar precio Klini</button></form></td></tr>
@empty<tr><td colspan="5">Este distribuidor todavía no tiene ofertas. No se crearon precios de ejemplo.</td></tr>@endforelse
</tbody></table></div>{{ $kliniOffers->links() }}
@endif
</section>
