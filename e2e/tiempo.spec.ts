import { expect, test } from '@playwright/test';
import {
  countUrlChanges,
  coveredFocus,
  openControls,
  openExplorer,
  simTime,
  trackProblems,
  typedDate,
  urlChanges,
} from './support';

test.describe('Tiempo y URL', () => {
  test('un enlace con fecha y cuerpo abre ese estado exacto, en pausa', async ({ page }) => {
    const problems = trackProblems(page);
    await openExplorer(page, '/?fecha=2030-06-01T12:00Z&cuerpo=jupiter');

    expect(await simTime(page)).toBe(Date.parse('2030-06-01T12:00:00Z'));
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Reproducir/);
    // Hora local de Madrid (verano: UTC+2).
    await expect(page.locator('#time-date')).toHaveValue('2030-06-01');
    await expect(page.locator('#time-clock')).toHaveValue('14:00:00');
    await expect(page.locator('#card-title')).toHaveText('Júpiter');
    await expect(page.locator('#tree-jupiter')).toHaveAttribute('aria-selected', 'true');
    // La URL se queda como estaba: ya describe el estado.
    await page.waitForTimeout(500);
    expect(new URL(page.url()).search).toBe('?fecha=2030-06-01T12:00Z&cuerpo=jupiter');
    expect(problems).toEqual([]);
  });

  test('cambiar la fecha en el campo salta a ese día y lo lleva a la URL', async ({ page }) => {
    await openExplorer(page, '/?fecha=2030-06-01T12:00Z');
    await openControls(page);
    await page.locator('#time-date').fill('2031-03-15');
    // 14:00 en Madrid el 15 de marzo (invierno: UTC+1) son las 13:00 UTC.
    await expect.poll(() => simTime(page)).toBe(Date.parse('2031-03-15T13:00:00Z'));
    await expect(page).toHaveURL(/fecha=2031-03-15T13:00Z/);

    // Una fecha fuera del rango no se aplica y, al confirmarla (Intro o al salir), se explica.
    await page.locator('#time-date').fill('1850-01-01');
    await page.locator('#time-date').press('Enter');
    await expect(page.getByRole('alert')).toContainText('entre 1900 y 2100');
    expect(await simTime(page)).toBe(Date.parse('2031-03-15T13:00:00Z'));
  });

  test('a tiempo real el tiempo avanza y la URL no cambia mientras corre', async ({ page }) => {
    await openExplorer(page, '/?fecha=2030-06-01T12:00Z&cuerpo=marte');
    await page.locator('#time-speed').selectOption('real');
    await page.locator('.time__play').click();
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Pausar/);
    // Al reproducir, la fecha sale de la URL (una sola vez) y el cuerpo se queda.
    await expect(page).not.toHaveURL(/fecha=/);
    await expect(page).toHaveURL(/cuerpo=marte/);
    await countUrlChanges(page);
    // Con SwiftShader y la máquina cargada (el CI), los frames llegan tarde y el reloj avanza menos
    // (el motor no lo deja avanzar más de 400 ms de una vez): se espera a que corra dos segundos, y
    // nunca más deprisa que el reloj de pared.
    const wallStart = Date.now();
    const start = await simTime(page);
    await expect
      .poll(async () => (await simTime(page)) - start, { timeout: 30_000 })
      .toBeGreaterThan(2000);
    const elapsed = (await simTime(page)) - start;
    expect(elapsed).toBeLessThan(Date.now() - wallStart + 1000);
    expect(await urlChanges(page)).toBe(0);

    // Al pausar, la fecha vuelve a la URL con el instante en que se ha parado.
    await page.keyboard.press('k');
    await expect(page).toHaveURL(/fecha=2030-06-01T12:00:\d\dZ/);
  });

  test('hacia atrás el tiempo retrocede, también a 1 hora por segundo', async ({ page }) => {
    await openExplorer(page, '/?fecha=2030-06-01T12:00Z');
    await page.getByRole('button', { name: 'Hacia atrás' }).click();
    await expect(page.getByRole('button', { name: 'Hacia atrás' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.locator('#time-speed').selectOption('hour');
    await page.locator('.time__play').click();
    await expect(page.locator('#time-speed')).toHaveValue('hour');
    // Hacia atrás: se espera a que retroceda diez minutos simulados y después se mide la velocidad en
    // una ventana de 3 s. Con SwiftShader cada frame tarda más de lo que el motor deja avanzar el reloj
    // de una vez (400 ms), así que corre algo menos que a 1 hora por segundo, pero nunca más deprisa:
    // la cota (1,25 h/s, con el margen de las lecturas de la barra, 5 por segundo) separa 1 h/s de los
    // 3 h/s de la entrada (D31).
    const start = await simTime(page);
    await expect
      .poll(async () => (await simTime(page)) - start, { timeout: 30_000 })
      .toBeLessThan(-10 * 60_000);
    const from = await simTime(page);
    const wallFrom = Date.now();
    await page.waitForTimeout(3000);
    const rate = (from - (await simTime(page))) / (Date.now() - wallFrom);
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThan(1.25 * 3600);
    await page.keyboard.press('k');
  });

  test('al escribir una fecha a mano no pasa por fechas intermedias ni avisa a medio escribir', async ({
    page,
  }) => {
    await openExplorer(page, '/?fecha=2030-06-01T12:00Z');
    await countUrlChanges(page);
    await page.evaluate(() => {
      const time = document.querySelector('.time__readout time');
      window.__e2eTimeChanges = 0;
      new MutationObserver((records) => {
        window.__e2eTimeChanges = (window.__e2eTimeChanges ?? 0) + records.length;
      }).observe(time as Node, { attributes: true, attributeFilter: ['datetime'] });
      new MutationObserver(() => {
        if (document.querySelector('#time-error')) document.body.dataset['e2eAlert'] = 'sí';
      }).observe(document.body, { childList: true, subtree: true });
    });
    // El campo empieza en el día (o en el mes, según el idioma del sistema); a medio escribir, el año
    // pasa por 0002, 0020 y 0203.
    const keys = await typedDate(page, '15', '03', '2031');
    await openControls(page);
    const date = page.locator('#time-date');
    await date.focus();
    await page.keyboard.type(keys);
    await page.waitForTimeout(1500);
    // Las 14:00 de Madrid del 15 de marzo de 2031 (UTC+1): un solo salto y una sola URL.
    expect(await simTime(page)).toBe(Date.parse('2031-03-15T13:00:00Z'));
    expect(await page.evaluate(() => window.__e2eTimeChanges ?? 0)).toBe(1);
    expect(await urlChanges(page)).toBe(1);
    expect(await page.evaluate(() => document.body.dataset['e2eAlert'] ?? 'no')).toBe('no');
    await expect(page).toHaveURL(/fecha=2031-03-15T13:00Z/);
  });

  test('la barra de tiempo cambia como mucho 5 veces por segundo a 1 año por segundo', async ({
    page,
  }) => {
    await openExplorer(page, '/?fecha=2030-06-01T12:00Z');
    await page.locator('#time-speed').selectOption('year');
    await page.evaluate(() => {
      const time = document.querySelector('.time__readout time');
      window.__e2eTimeChanges = 0;
      new MutationObserver((records) => {
        window.__e2eTimeChanges = (window.__e2eTimeChanges ?? 0) + records.length;
      }).observe(time as Node, { attributes: true, attributeFilter: ['datetime'] });
    });
    const changes = () => page.evaluate(() => window.__e2eTimeChanges ?? 0);
    const start = Date.now();
    await page.locator('.time__play').click();
    // El criterio es el máximo (§4.5): como mucho 5 por segundo (más el del clic). Primero, que el
    // tiempo corra: con varias instancias de SwiftShader en paralelo, un frame puede tardar más de
    // un segundo, así que se espera a unos cuantos cambios en vez de fijar un mínimo por segundo.
    await expect.poll(changes, { timeout: 30_000 }).toBeGreaterThanOrEqual(4);
    await page.waitForTimeout(2000);
    const counted = await changes();
    const seconds = (Date.now() - start) / 1000;
    expect(counted).toBeLessThanOrEqual(Math.ceil(5 * seconds) + 1);
    await page.keyboard.press('k');
  });

  test('la línea de tiempo: el año de la fecha, con el teclado y el ratón, y anuncia la fecha', async ({
    page,
  }) => {
    await openExplorer(page, '/?fecha=2031-03-15T13:00Z');
    const line = page.getByRole('slider', { name: 'Línea de tiempo' });
    await expect(line).toHaveAttribute('aria-valuetext', '15 de marzo de 2031');
    await expect(line).toHaveAttribute('max', '364');
    await expect(line).toHaveValue('73');
    await expect(page.locator('tls-timeline .year__label')).toHaveText('2031');
    // Flechas, un día (a la misma hora); RePág, un mes; Inicio y Fin, el año.
    await line.focus();
    await page.keyboard.press('ArrowRight');
    await expect(line).toHaveAttribute('aria-valuetext', '16 de marzo de 2031');
    expect(await simTime(page)).toBe(Date.parse('2031-03-16T13:00:00Z'));
    await page.keyboard.press('PageUp');
    await expect(line).toHaveAttribute('aria-valuetext', '16 de abril de 2031');
    await page.keyboard.press('End');
    await expect(line).toHaveAttribute('aria-valuetext', '31 de diciembre de 2031');
    // En el extremo, al año siguiente.
    await page.keyboard.press('ArrowRight');
    await expect(line).toHaveAttribute('aria-valuetext', '1 de enero de 2032');
    await expect(page.locator('tls-timeline .year__label')).toHaveText('2032');
    await expect(line).toHaveAttribute('max', '365');
    await page.keyboard.press('Home');
    await expect(line).toHaveValue('0');
    await expect(page).toHaveURL(/fecha=2032-01-01T/);
    // Con el ratón: un clic hacia la mitad de la pista lleva a mediados de año.
    const box = await line.boundingBox();
    if (!box) throw new Error('Sin línea de tiempo');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect
      .poll(async () => new Date(await simTime(page)).getUTCMonth())
      .toBeGreaterThanOrEqual(5);
    expect(new Date(await simTime(page)).getUTCMonth()).toBeLessThanOrEqual(6);
    // Y los botones del año.
    await page.getByRole('button', { name: 'Año siguiente' }).click();
    await expect(page.locator('tls-timeline .year__label')).toHaveText('2033');
  });

  test('con el tiempo en marcha, la línea sigue a la fecha tras un clic y el teclado parte de lo anunciado', async ({
    page,
  }) => {
    // Sin fecha en el enlace: reproduciendo (D31). A 1 mes por segundo, para que se note.
    await openExplorer(page, '/');
    await page.locator('#time-speed').selectOption('month');
    const line = page.getByRole('slider', { name: 'Línea de tiempo' });
    const box = await line.boundingBox();
    if (!box) throw new Error('Sin línea de tiempo');
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height / 2);
    const first = Number(await line.inputValue());
    // Con el foco del ratón, la línea sigue a la fecha (no se queda en el día del clic).
    await expect
      .poll(async () => Number(await line.inputValue()), { timeout: 20_000 })
      .not.toBe(first);
    // Con el teclado, lo anunciado se queda quieto y → es el día siguiente al anunciado (la
    // interfaz se repinta un instante después de cada tecla).
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);
    const announced = (await line.getAttribute('aria-valuetext')) ?? '';
    const before = Number(await line.inputValue());
    await page.waitForTimeout(1500);
    await expect(line).toHaveAttribute('aria-valuetext', announced);
    await expect(line).toHaveValue(String(before));
    await page.keyboard.press('ArrowRight');
    await expect(line).toHaveValue(String(before + 1));
    await page.keyboard.press('k');
  });

  test('en el límite de 2100, con la hora de Madrid, la línea no pasa del rango', async ({
    page,
  }) => {
    await openExplorer(page, '/?fecha=2100-12-31T23:59Z');
    const line = page.getByRole('slider', { name: 'Línea de tiempo' });
    // En Madrid ya es el 1 de enero de 2101 (de 0:00 a 0:59): un solo día en la pista.
    await expect(page.locator('tls-timeline .year__label')).toHaveText('2101');
    await expect(line).toHaveAttribute('min', '0');
    await expect(line).toHaveAttribute('max', '0');
    await expect(line).toHaveAttribute('aria-valuetext', '1 de enero de 2101');
    await expect(page.getByRole('button', { name: 'Año siguiente' })).toBeDisabled();
    const box = await line.boundingBox();
    if (!box) throw new Error('Sin línea de tiempo');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(line).toHaveValue('0');
    expect(await simTime(page)).toBe(Date.parse('2100-12-31T23:59:00Z'));
  });

  test('«Controles +» se abre con el foco dentro y se cierra con Esc, que no cierra la ficha', async ({
    page,
  }) => {
    await openExplorer(page, '/?fecha=2030-06-01T12:00Z&cuerpo=marte');
    const button = page.getByRole('button', { name: 'Controles', exact: true });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#time-date')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#time-date')).toBeHidden();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toBeFocused();
    // La ficha sigue abierta: ese Esc era del panel.
    await expect(page.locator('#card-title')).toHaveText('Marte');
    // Con su botón de cerrar, también vuelve el foco a «Controles».
    await openControls(page);
    await page.getByRole('button', { name: 'Cerrar los controles' }).click();
    await expect(page.locator('#time-date')).toBeHidden();
    await expect(button).toBeFocused();
    // Si el foco sale del panel, se cierra: nunca se para en lo que tapa (la tarjeta, la cámara). Desde
    // dentro del panel: el foco entra en él un instante después de abrirse.
    await openControls(page);
    await expect(page.locator('#time-date')).toBeFocused();
    for (let k = 0; k < 10; k++) {
      await page.keyboard.press('Shift+Tab');
      expect(await coveredFocus(page)).toBeNull();
    }
    await expect(page.locator('#time-date')).toBeHidden();
    // «Ahora», dentro del panel: el instante actual, en tiempo real.
    await openControls(page);
    await page.getByRole('button', { name: 'Ahora', exact: true }).click();
    await expect(page.locator('#time-speed')).toHaveValue('real');
    expect(Math.abs((await simTime(page)) - Date.now())).toBeLessThan(60_000);
  });

  test('al llegar a 2100 la simulación se para y lo avisa', async ({ page }) => {
    await openExplorer(page, '/?fecha=2100-12-31T23:00Z');
    await page.locator('#time-speed').selectOption('day');
    await page.locator('.time__play').click();
    // En UTC y en la hora de Madrid (que ya es 2101), con el nombre de la zona y lo que puedes hacer.
    await expect(page.locator('tls-notices')).toContainText(
      'en el límite del explorador: el 31 de diciembre de 2100 a las 23:59 UTC, que en tu hora local (Europe/Madrid, UTC+1) es el 1 de enero de 2101 a las 0:59. Elige una fecha anterior o vuelve a «Ahora».',
    );
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Reproducir/);
    expect(await simTime(page)).toBe(Date.parse('2100-12-31T23:59:59Z'));
    await page.getByRole('button', { name: 'Cerrar el aviso' }).click();
    await expect(page.locator('.notice')).toHaveCount(0);
  });
});
