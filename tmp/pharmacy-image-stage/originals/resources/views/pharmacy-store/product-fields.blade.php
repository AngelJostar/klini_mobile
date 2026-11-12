<label>Nombre<input name="name" value="{{ $product?->name ?? old('name') }}" required maxlength="200"></label>
<label>Categoría<input name="category" value="{{ $product?->category ?? old('category') }}" maxlength="100"></label>
<label>Presentación<input name="presentation" value="{{ $product?->presentation ?? old('presentation') }}" maxlength="200"></label>
<label>Descripción<textarea name="description" maxlength="3000">{{ $product?->description ?? old('description') }}</textarea></label>
<label>Precio (MXN)<input name="price" type="number" min="0" max="999999.99" step="0.01" value="{{ $product?->price ?? old('price', 0) }}" required></label>
<label>Existencias<input name="stock" type="number" min="0" max="1000000" step="1" value="{{ $product?->stock ?? old('stock', 0) }}" required></label>
<label>Imagen (HTTPS)<input name="image_url" type="url" value="{{ $product?->image_url ?? old('image_url') }}"></label>
<label>Estado<select name="status"><option value="inactive" @selected(($product?->status ?? old('status','inactive')) === 'inactive')>Inactivo</option><option value="active" @selected(($product?->status ?? old('status','inactive')) === 'active')>Activo</option></select></label>
<label>Requiere receta<select name="requires_prescription"><option value="0" @selected(!($product?->requires_prescription ?? old('requires_prescription',false)))>No</option><option value="1" @selected($product?->requires_prescription ?? old('requires_prescription',false))>Sí</option></select></label>
<label>Especialidad<input name="specialty" value="{{ $product?->specialty ?? old('specialty') }}" maxlength="100"></label>
<label>Tipo de producto<input name="product_type" value="{{ $product?->product_type ?? old('product_type') }}" maxlength="100"></label>
<label>Precio anterior (opcional, MXN)<input name="compare_at_price" type="number" min="0" step="0.01" value="{{ $product?->compare_at_price ?? old('compare_at_price') }}"></label>
<label>Producto destacado<select name="featured"><option value="0" @selected(!($product?->featured ?? old('featured',false)))>No</option><option value="1" @selected($product?->featured ?? old('featured',false))>Sí</option></select></label>
<label>Laboratorio<input name="laboratory" value="{{ $product?->laboratory ?? old('laboratory') }}" maxlength="200"></label>
