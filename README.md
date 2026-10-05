# Klini Mobile

Aplicación móvil de Dr. Sam para los perfiles Paciente y Médico. Está construida con Expo SDK 55,
React Native, Expo Router y TypeScript.

## Requisitos

- Node.js 20.19 o superior.
- Expo Go para prototipos o un emulador Android.
- Dr. Sam ejecutándose como API Laravel.

## Inicio local

```powershell
npm install
Copy-Item .env.example .env
npx expo start
```

En Android Studio se puede abrir el emulador presionando `a` en la terminal de Expo.

Para usar explícitamente Expo Go:

```powershell
npm run start:go
```

Para compilar o iniciar el development build:

```powershell
npm run android:dev
npm run start:dev
```

## Verificaciones

```powershell
npm run lint
npm run typecheck
npm run format:check
npx expo-doctor
```

## Estructura inicial

- `src/app/(auth)`: acceso y recuperación de sesión.
- `src/app/(patient)`: pantallas exclusivas del paciente.
- `src/app/(doctor)`: pantallas exclusivas del médico.
- `src/config`: configuración validada de ambientes.
- `src/theme`: colores, espaciado y futuros componentes visuales.
- `docs/environments.md`: configuración local, de pruebas y producción.
- `docs/android-development.md`: emulador, Expo Go y development build.

El proyecto sigue el plan `Plan_de_construccion_Klini_Mobile.docx` de Dr. Sam.
