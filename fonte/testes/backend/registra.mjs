// Uso: node --experimental-strip-types --import ./backend/registra.mjs backend/<teste>.mjs
import { register } from 'node:module';
register('./hooks.mjs', import.meta.url);
