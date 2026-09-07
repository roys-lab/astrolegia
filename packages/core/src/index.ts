/**
 * @astrolegia/core — motores puros del dominio.
 *
 * Subpaths disponibles (preferir el subpath al barrel raíz para importar
 * solo lo que se usa):
 *   @astrolegia/core/astrology   efemérides, favorabilidad, rueda zodiacal, formato de cartas
 *   @astrolegia/core/numerology  motor Hitchcock, auditoría de nombres, arquetipos
 *   @astrolegia/core/people      modelo canónico de personas y normalización de perfil
 *   @astrolegia/core/types       tipos compartidos (Person, PersonChart, UserProfile, BirthData…)
 *
 * Regla del package: nada de React, Next, Firebase, fetch ni fs. Todo lo de
 * acá se testea con vitest en Node y se puede portar tal cual a Expo o a la API.
 */
export * from './astrology';
export * from './numerology';
export * from './people';
export * from './types';
