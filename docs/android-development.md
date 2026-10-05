# Desarrollo en Android

## Emulador local validado

- AVD: `Pixel_9_Pro`
- Dispositivo: Pixel 9 Pro
- Imagen: Android 37.2, Google APIs con Play Store, x86_64
- SDK: `%LOCALAPPDATA%\Android\Sdk`
- API Laravel desde el emulador: `http://10.0.2.2:8000`

## Prototipo con Expo Go

Expo Go se conserva para revisar cambios que solo utilicen módulos incluidos en Expo Go.

```powershell
npm run start:go
```

Con el emulador encendido, presionar `a` para abrir la aplicación.

## Development build local

El development build es el flujo principal porque permite utilizar módulos nativos propios.

La primera vez o después de cambiar una dependencia nativa:

```powershell
npm run android:dev
```

Después de instalar el build, para cambios únicamente de TypeScript o JavaScript:

```powershell
npm run start:dev
```

No se deben editar manualmente las carpetas nativas generadas. Si la configuración nativa cambia,
se regeneran con `npx expo prebuild --clean` y se vuelve a ejecutar `npm run android:dev`.

## Development build con EAS

`eas.json` incluye un perfil `development` que genera un APK interno con el cliente de desarrollo.
Requiere iniciar sesión en una cuenta Expo antes de ejecutar:

```powershell
npx eas-cli@latest build --platform android --profile development
```
