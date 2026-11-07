import { expect, test, type Page } from '@playwright/test';
import { openExplorer } from './support';

const planets = (page: Page) => page.getByRole('toolbar', { name: 'Sol y planetas' });
/** «Lunas de Saturno», «Lunas de Júpiter»…: así se llama la fila de las lunas de cada planeta. */
const moonsOf = (name: string) => `Lunas de ${name}`;
const chip = (page: Page, id: string) => page.locator(`tls-body-chips button[data-body="${id}"]`);
const focusedBody = (page: Page) =>
  page.evaluate(() => window.__tlsViewer?.engine?.focusedBody ?? null);

/** Los cuerpos del explorador: el Sol y los planetas, cada uno con sus lunas (del índice ligero). */
const SYSTEMS: readonly (readonly [string, string, readonly [string, string][]])[] = [
  ['sol', 'Sol', []],
  ['mercurio', 'Mercurio', []],
  ['venus', 'Venus', []],
  ['tierra', 'Tierra', [['luna', 'Luna']]],
  [
    'marte',
    'Marte',
    [
      ['fobos', 'Fobos'],
      ['deimos', 'Deimos'],
    ],
  ],
  [
    'jupiter',
    'Júpiter',
    [
      ['io', 'Ío'],
      ['europa', 'Europa'],
      ['ganimedes', 'Ganímedes'],
      ['calisto', 'Calisto'],
    ],
  ],
  [
    'saturno',
    'Saturno',
    [
      ['mimas', 'Mimas'],
      ['encelado', 'Encélado'],
      ['tetis', 'Tetis'],
      ['dione', 'Dione'],
      ['rea', 'Rea'],
      ['titan', 'Titán'],
      ['japeto', 'Jápeto'],
    ],
  ],
  [
    'urano',
    'Urano',
    [
      ['miranda', 'Miranda'],
      ['ariel', 'Ariel'],
      ['umbriel', 'Umbriel'],
      ['titania', 'Titania'],
      ['oberon', 'Oberón'],
    ],
  ],
  [
    'neptuno',
    'Neptuno',
    [
      ['triton', 'Tritón'],
      ['proteo', 'Proteo'],
    ],
  ],
];

test.describe('Fichas de cuerpos', () => {
  test('eligen los 30 cuerpos: los planetas abajo y, encima, las lunas de su sistema (07-11)', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    const card = page.locator('#card-title');
    let count = 0;
    for (const [id, name, moons] of SYSTEMS) {
      await planets(page).getByRole('button', { name, exact: true }).click();
      await expect(card).toHaveText(name);
      await expect(chip(page, id)).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(() => focusedBody(page)).toBe(id);
      count++;
      // La fila de los planetas sigue entera (decisión de Iván del 07-11).
      await expect(planets(page).getByRole('button')).toHaveCount(9);
      if (moons.length === 0) {
        await expect(page.locator('tls-body-chips .moons')).toBeHidden();
        continue;
      }
      const label = id === 'tierra' ? 'Satélite de la Tierra' : moonsOf(name);
      const row = page.getByRole('toolbar', { name: label });
      await expect(row).toBeVisible();
      await expect(row.getByRole('button')).toHaveCount(moons.length);
      for (const [moonId, moonName] of moons) {
        await row.getByRole('button', { name: moonName, exact: true }).click();
        await expect(card).toHaveText(moonName);
        await expect(chip(page, moonId)).toHaveAttribute('aria-pressed', 'true');
        await expect.poll(() => focusedBody(page)).toBe(moonId);
        count++;
      }
    }
    expect(count).toBe(30);
  });

  test('los planetas, redondos con el nombre debajo; las lunas, pastillas con el nombre al lado', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1&cuerpo=saturno');
    const planet = await chip(page, 'saturno').boundingBox();
    const planetThumb = await chip(page, 'saturno').locator('img').boundingBox();
    const planetName = await chip(page, 'saturno').locator('.chip__name').boundingBox();
    const moonThumb = await chip(page, 'titan').locator('img').boundingBox();
    const moon = await chip(page, 'titan').boundingBox();
    if (!planet || !planetThumb || !planetName || !moonThumb || !moon) throw new Error('Sin cajas');
    // El nombre del planeta, debajo de su miniatura; el de la luna, a su lado (en la misma línea).
    expect(planetName.y).toBeGreaterThanOrEqual(planetThumb.y + planetThumb.height - 1);
    expect(moon.width).toBeGreaterThan(moonThumb.width * 2);
    expect(moon.height).toBeLessThan(planet.height);
    // Las lunas, encima de los planetas.
    expect(moon.y + moon.height).toBeLessThanOrEqual(planet.y);
    // La pastilla tiene su fondo; la ficha del planeta, no (sin caja).
    const background = (id: string) =>
      chip(page, id).evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(await background('saturno')).toBe('rgba(0, 0, 0, 0)');
    expect(await background('titan')).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('en las vistas Tierra y Luna (PC), los planetas y, encima, la Luna', async ({ page }) => {
    for (const path of ['/explorar/tierra?captura=1', '/explorar/luna?captura=1']) {
      await openExplorer(page, path);
      await expect(planets(page).getByRole('button'), path).toHaveCount(9);
      const satellite = page.getByRole('toolbar', { name: 'Satélite de la Tierra' });
      await expect(satellite.getByRole('button'), path).toHaveText(['Luna']);
    }
    // Un planeta lleva a la vista del sistema solar, con él elegido.
    await planets(page).getByRole('button', { name: 'Marte', exact: true }).click();
    await expect(page).toHaveURL(/\/(\?.*)?$/);
    await expect(page.locator('h1')).toHaveText('Marte');
  });

  test('con el teclado: una parada por fila; las flechas mueven el foco e Intro elige', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    await chip(page, 'sol').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(chip(page, 'venus')).toBeFocused();
    // Recorrer la fila no elige nada (ni lanza vuelos de cámara).
    await expect(page.locator('.panel')).toBeHidden();
    expect(await focusedBody(page)).toBeNull();
    await page.keyboard.press('End');
    await expect(chip(page, 'neptuno')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await expect(page.locator('#card-title')).toHaveText('Saturno');
    await expect(chip(page, 'saturno')).toHaveAttribute('aria-pressed', 'true');
    // El tabulador sale de la fila de planetas (la de lunas va antes en el DOM, encima).
    await chip(page, 'saturno').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('tls-body-chips button:focus')).toHaveCount(0);
    // La fila de lunas es otra parada: Mayús+Tab desde los planetas llega a su primera luna.
    await chip(page, 'saturno').focus();
    await page.keyboard.press('Shift+Tab');
    await expect(chip(page, 'mimas')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('#card-title')).toHaveText('Mimas');
  });

  test('la distancia de cada ficha se anuncia como descripción', async ({ page }) => {
    await openExplorer(page, '/?captura=1');
    await expect(chip(page, 'saturno')).toHaveAccessibleName('Saturno');
    await expect(chip(page, 'saturno')).toHaveAccessibleDescription(/^A \d+,\d\d\sUA del Sol$/);
  });
});
