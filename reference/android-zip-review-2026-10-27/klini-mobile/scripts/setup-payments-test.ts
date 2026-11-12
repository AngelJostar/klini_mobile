import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const destination = resolve('.env.payments.local');
if (existsSync(destination)) {
  console.log('El archivo privado de pagos ya existe; se conserva sin modificaciones.');
} else {
  const token = randomBytes(32).toString('base64url');
  writeFileSync(destination, [
    '# Configuración privada del servidor local de Stripe TEST. No compartir ni subir a Git.',
    '# Recomendado: clave restringida rk_test_ con Payment Intents: Write (incluye Read).',
    '# También se admite sk_test_. Nunca uses sk_live_ ni rk_live_.',
    'STRIPE_SECRET_KEY=',
    `KLINI_PAYMENTS_DEV_TOKEN=${token}`,
    '# Opcional: IP privada de este equipo para probar desde tu iPhone en la misma red.',
    'KLINI_PAYMENTS_LAN_HOST=',
    '',
  ].join('\n'), { flag: 'wx', mode: 0o600 });
  console.log('Archivo privado de pagos creado. El token local no se muestra en consola.');
}
console.log('Configura tu clave de Stripe TEST en .env.payments.local y ejecuta npm run payments:server.');
console.log('La clave privada permanece en el servidor; en la app solo se introduce el token local de conexión.');
