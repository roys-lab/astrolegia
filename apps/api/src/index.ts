import 'dotenv/config';
import { createApp } from './app';
import { env, warnMissingFeatures } from './env';
import { googleCallbackUrl } from '@astrolegia/auth';

warnMissingFeatures();

const app = createApp();

const server = app.listen(env.PORT, () => {
    console.log(`✓ Astrolegia API escuchando en http://localhost:${env.PORT}`);
    console.log(`  Callback de Google a registrar: ${googleCallbackUrl(env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`)}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n[ERROR FATAL] El puerto ${env.PORT} ya está ocupado por otra aplicación.`);
        console.error(`Por favor cierra la aplicación que esté utilizando el puerto ${env.PORT} e intenta nuevamente.\n`);
        process.exit(1);
    } else {
        console.error('Error en el servidor API:', err);
    }
});
