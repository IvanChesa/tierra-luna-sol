import { Component } from '@angular/core';

/**
 * Créditos (regla permanente: toda imagen o dato de terceros, en docs/FUENTES.md y aquí). Lista
 * mínima de lo que ya se publica, con su licencia; la fase 9 la completa fichero a fichero.
 */
@Component({
  selector: 'tls-credits-page',
  host: { class: 'page' },
  template: `
    <h1>Créditos</h1>
    <p>Este explorador usa recursos de terceros con estas licencias.</p>

    <h2>Texturas</h2>
    <ul>
      <li>
        Planetas, Tierra y anillos de Saturno:
        <a href="https://www.solarsystemscope.com/textures/">Solar System Scope</a>, con licencia
        <a href="https://creativecommons.org/licenses/by/4.0/deed.es">CC BY 4.0</a>. Se han reducido
        y convertido a WebP; el color de algunos planetas se ha corregido con fotos del Hubble; el
        del océano de la Tierra, con fotos de
        <a href="https://epic.gsfc.nasa.gov/">EPIC (DSCOVR), del NASA EPIC Team</a>, y la opacidad
        de los anillos, con la ficha de los anillos de la NASA.
      </li>
      <li>
        Luna: CGI Moon Kit del
        <a href="https://svs.gsfc.nasa.gov/4720">Scientific Visualization Studio de la NASA</a>, con
        datos de LRO/LROC.
      </li>
      <li>
        Relieve de Mercurio: modelo de elevación global de MESSENGER del
        <a href="https://astrogeology.usgs.gov/search/map/mercury_messenger_global_dem_665m"
          >USGS Astrogeology</a
        >
        (Becker et al., 2016).
      </li>
      <li>
        Relieve de Marte: altímetro MOLA de la Mars Global Surveyor (NASA), en el
        <a href="https://pds-geosciences.wustl.edu/missions/mgs/megdr.html">PDS</a>.
      </li>
      <li>
        Vía Láctea: «The Milky Way panorama», de
        <a href="https://www.eso.org/public/images/eso0932a/">ESO/S. Brunier</a>, con licencia
        <a href="https://creativecommons.org/licenses/by/4.0/deed.es">CC BY 4.0</a>.
      </li>
    </ul>

    <h2>Estrellas</h2>
    <p>
      HYG Database v4.1, de David Nash (<a href="https://github.com/astronexus/HYG-Database"
        >Astronomy Nexus</a
      >), con licencia
      <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es">CC BY-SA 4.0</a>. El catálogo
      derivado que usa el explorador (las estrellas hasta la magnitud 6,5) mantiene esa licencia.
    </p>

    <h2>Datos</h2>
    <ul>
      <li>
        Datos de los cuerpos: fichas de la
        <a href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/">NASA (NSSDCA)</a> y parámetros de
        los satélites de la <a href="https://ssd.jpl.nasa.gov/sats/phys_par/">NASA/JPL</a>.
      </li>
      <li>
        Comprobación de las posiciones:
        <a href="https://ssd.jpl.nasa.gov/horizons/">JPL Horizons</a> y el
        <a href="https://aa.usno.navy.mil/">USNO</a>.
      </li>
      <li>Fraga y Lleida: © Instituto Geográfico Nacional.</li>
      <li>
        Brillo y color de los planetas: leyes de fase de Hilton (2005) y de astronomy-engine,
        colores medidos en fotos del Hubble (NASA/ESA) y en la reconstrucción de Urano y Neptuno de
        <a href="https://doi.org/10.1093/mnras/stad3761">Irwin et al. (2024)</a>.
      </li>
    </ul>

    <h2>Software</h2>
    <ul>
      <li>
        <a href="https://github.com/cosinekitty/astronomy">astronomy-engine</a>, de Don Cross (MIT).
      </li>
      <li><a href="https://threejs.org">three.js</a> (MIT) y Angular (MIT).</li>
      <li>Tipografías Newsreader y Public Sans (SIL Open Font License 1.1).</li>
    </ul>

    <p>La NASA no respalda este proyecto ni participa en él.</p>
  `,
})
export class CreditsPage {}
