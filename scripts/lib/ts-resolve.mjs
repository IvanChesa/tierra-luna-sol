// Deja que un script de Node importe los módulos TS de `src/` (por ejemplo, las efemérides para
// generar `src/app/data/eclipses.ts`), sin dependencias nuevas: registra los ganchos de
// `ts-hooks.mjs`, que transpilan los `.ts` con el compilador de TypeScript del proyecto.
//
// Uso, al principio del script:   import './lib/ts-resolve.mjs';
// y después, con import() dinámico: const m = await import('../src/app/ephemeris/eclipse-search.ts');
import { register } from 'node:module';

register('./ts-hooks.mjs', import.meta.url);
