# Venta Klini: cambio preparado, todavía no aplicado

Se conservan las ofertas de `pharmacy_products`: el precio Klini es el precio de la oferta del distribuidor elegido, independiente del de las demás cuentas. Ningún nombre identifica al vendedor Klini por sí mismo.

- La migración añade `pharmacy_store_settings.klini_provider_id` nullable, FK a `providers`, sin datos predeterminados ni asignaciones.
- Solo un superadministrador activo puede elegir o retirar esa cuenta desde Farmacia digital → Presentación. Se valida tipo de distribuidor y cuenta activa; esta selección no activa publicación.
- Farmacia digital → Ofertas Klini lista solo ofertas ya existentes de la cuenta configurada. El superadministrador puede editar su precio MXN. No se crean usuarios, ofertas ni precios ficticios.
- La API pública añade `settings.klini_provider_id` nullable y `provider.is_klini` boolean. Los filtros existentes de publicación siguen excluyendo cuentas/distribuidores/productos no disponibles.
- El pedido sigue tomando `product_id` de la oferta seleccionada y recalcula su precio en servidor. Cada línea guarda `provider_is_klini` para conservar la identidad histórica después de cambiar la configuración. No se habilitan pagos, dispensación ni reserva de inventario.
- No se limita el catálogo del servidor a tres distribuidores: la app puede presentar hasta tres alternativas disponibles del mismo `catalog_item_id`, además de Klini si existe oferta autorizada.

## Revisión y aplicación

`review.patch` contiene el diff. `baseline/` conserva los seis archivos de origen y sus hashes están en `baseline-manifest.json`. `patch-manifest.json` enumera exactamente nueve archivos de despliegue, con hash anterior (null si es nuevo) y hash preparado. El helper comprueba TODOS antes de escribir alguno; se detiene si hubo cambios concurrentes.

```powershell
node C:/laragon/www/klini_mobile/tmp/pharmacy-seller-stage/apply-pharmacy-seller.cjs --check
# Solo después de revisar y con permiso de escritura al backend:
node C:/laragon/www/klini_mobile/tmp/pharmacy-seller-stage/apply-pharmacy-seller.cjs --apply
Set-Location C:/laragon/www/dr-sam
& C:/laragon/bin/php/php-8.3.13-Win32-vs16-x64/php.exe artisan migrate --path=database/migrations/2026_11_12_000008_configure_klini_pharmacy_seller.php --force
```

La migración es únicamente de esquema. Después, la elección del vendedor y de sus precios requiere una acción explícita del superadministrador; este paquete no la ejecuta. `harness/`, los manifiestos, baselines, helper y este plan no se copian al backend.

## Validación aislada

```powershell
& C:/laragon/bin/php/php-8.3.13-Win32-vs16-x64/php.exe C:/laragon/www/dr-sam/vendor/bin/phpunit --configuration C:/laragon/www/klini_mobile/tmp/pharmacy-seller-stage/harness/phpunit.xml
```

Resultado: **35 pruebas / 394 aserciones PASS** (8 nuevas y las suites existentes PharmacyStoreAdmin, UniversalPharmacyPublication y PharmacyStoreApi). El harness sustituye las clases/rutas/vistas afectadas por las copias de stage, omite el `.env` del backend, fuerza SQLite `:memory:` y comprueba esa configuración antes de migrar. Sus archivos temporales y vistas compiladas permanecen en `harness/`. No se ha consultado ni escrito la base real. Sintaxis PHP de todos los archivos preparados: PASS. Pint aplicado solo al test y a la migración nuevos.

Pendiente: aplicar el paquete tras revisar los hashes, ejecutar su migración y comprobar la UI administrativa real. No se ha aplicado aún ni se ha elegido vendedor alguno.
