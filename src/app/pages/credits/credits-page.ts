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
        <a href="https://epic.gsfc.nasa.gov/">EPIC (DSCOVR), del NASA EPIC Team</a>. De la textura
        de los anillos solo queda el detalle de su brillo.
      </li>
      <li>
        Anillos de Saturno: su opacidad, de la ocultación de β Centauri de Cassini UVIS (Colwell et
        al., 2020, en el
        <a href="https://pds-rings.seti.org/holdings/volumes/COUVIS_8xxx/COUVIS_8001/"
          >PDS Ring-Moon Systems Node</a
        >); su color y su brillo, de las medidas del Hubble de
        <a href="https://arxiv.org/abs/1007.0349">Salo y French (2010)</a> y de Cuzzi, French y
        Dones (2002), con la ficha de los anillos de la NASA; y los radios de sus divisiones, de la
        <a href="https://pds-rings.seti.org/saturn/saturn_tables.html">tabla del PDS</a>.
      </li>
      <li>
        Luna: CGI Moon Kit del
        <a href="https://svs.gsfc.nasa.gov/4720">Scientific Visualization Studio de la NASA</a>, con
        datos de LRO/LROC (el color) y LRO/LOLA (el relieve). Junto a los polos, el relieve sale de
        los
        <a href="https://pds-geosciences.wustl.edu/missions/lro/lola.htm"
          >modelos polares del LOLA</a
        >
        (NASA/GSFC, en el PDS de la NASA). Los lugares con nombre de sus vistas y su recorrido, del
        <a href="https://planetarynames.wr.usgs.gov/">Gazetteer of Planetary Nomenclature</a> (IAU y
        USGS).
      </li>
      <li>
        Eclipses de Luna:
        <a href="https://eclipse.gsfc.nasa.gov/LEcat5/LEcatalog.html"
          >catálogo de cinco milenios de la NASA</a
        >
        (Fred Espenak y Jean Meeus, NASA/GSFC), con el que se comprueba la sombra de la Tierra.
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
        Lunas: mosaicos globales del
        <a href="https://astrogeology.usgs.gov/search">USGS Astrogeology</a> (dominio público), con
        imágenes de Viking (Fobos), Voyager y Galileo (las de Júpiter), Cassini (las de Saturno) y
        Voyager 2 (Tritón, del Lunar and Planetary Institute, P. Schenk); los de Tetis y Rea, del
        DLR (T. Roatsch et al.). Mimas: mapa del DLR (Roatsch et al., 2018) en el
        <a href="https://pds-rings.seti.org/holdings/volumes/COISS_3xxx/COISS_3006/"
          >PDS de la NASA</a
        >. Se han reducido y convertido a WebP. Los que son en gris se muestran con un tinte; el de
        Ío es en color (Galileo y Voyager), con su color medio llevado al de una foto de la NASA en
        color real (PIA02308), y el color de Titán está medido en otra (PIA06230). En Tritón, el
        norte que no vio Voyager 2 (el 38 % del mapa) se rellena con un gris liso, sin inventar
        relieve. Sus rasgos con nombre, del Gazetteer of Planetary Nomenclature (IAU y USGS).
      </li>
      <li>
        Vía Láctea: «The Milky Way panorama», de
        <a href="https://www.eso.org/public/images/eso0932a/">ESO/S. Brunier</a>, con licencia
        <a href="https://creativecommons.org/licenses/by/4.0/deed.es">CC BY 4.0</a>. Modificada: se
        le han quitado las estrellas (un filtro de mediana; las pone el catálogo de estrellas), se
        ha reducido, suavizado y convertido a WebP.
      </li>
    </ul>
    <p>
      Los pósters del explorador y las miniaturas de las fichas de cuerpos son capturas del propio
      motor con estas texturas: mantienen sus licencias y sus atribuciones.
    </p>

    <h2>Estrellas</h2>
    <p>
      HYG Database v4.1, de David Nash (<a href="https://github.com/astronexus/HYG-Database"
        >Astronomy Nexus</a
      >), con licencia
      <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es">CC BY-SA 4.0</a>. El catálogo
      derivado que usa el explorador (las estrellas hasta la magnitud 6,5) mantiene esa licencia.
    </p>

    <h2>Constelaciones</h2>
    <p>
      Las líneas de las constelaciones del cielo desde España son las figuras de las
      <a href="https://www.iau.org/IAU/IAU/Astronomy-FAQs/Constellations.aspx"
        >cartas de las constelaciones de la IAU</a
      >
      (IAU y Sky &amp; Telescope: Roger Sinnott y Rick Fienberg; las figuras, de Alan MacRobert),
      con licencia <a href="https://creativecommons.org/licenses/by/4.0/deed.es">CC BY 4.0</a>, tal
      como las prepara <a href="https://github.com/ofrohn/d3-celestial">d3-celestial</a>, de Olaf
      Frohn (licencia BSD de 3 cláusulas: © 2015, Olaf Frohn; su texto y la atribución, junto al
      fichero). Sus nombres oficiales de la IAU, de astronomy-engine; en español, los del
      <a href="https://www.ign.es/web/resources/acercaDe/libDigPub/Anuario2019.pdf"
        >Anuario del Real Observatorio de Madrid</a
      >
      (© Instituto Geográfico Nacional).
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
      <li>
        Lugares del cielo desde España: Fraga, Lleida, el Observatori Fabra y la Puerta del Sol, ©
        <a href="https://www.ign.es/web/politica-datos">Instituto Geográfico Nacional</a>; el Roque
        de los Muchachos y el Teide, del
        <a href="https://www.iac.es/en/observatorios-de-canarias"
          >Instituto de Astrofísica de Canarias</a
        >; Calar Alto, del <a href="https://www.caha.es/">Observatorio de Calar Alto</a>; el
        Montsec, del <a href="https://parcastronomic.cat/">Parc Astronòmic Montsec</a>; la altitud
        del Observatori Fabra, del
        <a href="https://www.meteo.cat/">Servei Meteorològic de Catalunya</a>, y la del Montsec y la
        de la Puerta del Sol, del modelo digital del terreno del IGN (MDT02, ©
        <a href="https://www.ign.es/web/politica-datos">Instituto Geográfico Nacional</a>).
      </li>
      <li>
        Comprobación de las salidas, las puestas y los crepúsculos: el
        <a href="https://aa.usno.navy.mil/">USNO</a> en el Montsec y el Teide. Y de los eclipses:
        los catálogos de cinco milenios de la NASA, de
        <a href="https://eclipse.gsfc.nasa.gov/">Fred Espenak y Jean Meeus (NASA/GSFC)</a>.
      </li>
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

    <h2>El código del explorador</h2>
    <p>
      El código propio tiene licencia MIT (© 2026 Iván Chesa Lapena). Las texturas, los datos y los
      catálogos de terceros conservan sus propias licencias, las de esta página: en particular, el
      catálogo de estrellas, CC BY-SA 4.0.
    </p>

    <p>La NASA no respalda este proyecto ni participa en él.</p>
  `,
})
export class CreditsPage {}
