import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs'],
    target: 'node20',
    clean: true,
    sourcemap: true,
    // Packages del monorepo que se consumen desde su fuente TypeScript (no
    // tienen dist): se empaquetan dentro del build de la API. Sus dependencias
    // (better-auth, astronomy-engine, @astrolegia/database) quedan externas y
    // por eso figuran también en las dependencies de la API.
    noExternal: ['@astrolegia/auth', '@astrolegia/core'],
});
