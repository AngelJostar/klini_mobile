# Ambientes de Klini Mobile

Klini Mobile utiliza variables `EXPO_PUBLIC_*`, que Expo incorpora al paquete de la aplicación.
Estas variables nunca deben contener contraseñas, tokens ni otros secretos.

## Configuración local

1. Copiar `.env.example` como `.env`.
2. Usar `http://10.0.2.2:8000/api/mobile/v1` desde el emulador Android.
3. Usar la IP LAN de la computadora cuando Expo Go se ejecute en un teléfono físico.

```env
EXPO_PUBLIC_APP_ENV=local
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/mobile/v1
```

## Pruebas

```env
EXPO_PUBLIC_APP_ENV=test
EXPO_PUBLIC_API_URL=https://api-pruebas.example.com/api/mobile/v1
```

## Producción

```env
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_API_URL=https://api.example.com/api/mobile/v1
```

Después de cambiar una variable se debe recargar completamente la aplicación. Las direcciones de
pruebas y producción son marcadores y se sustituirán cuando existan esos servicios.
