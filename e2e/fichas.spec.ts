import { expect, test, type Page } from '@playwright/test';
import { openExplorer } from './support';

const planets = (page: Page) => page.getByRole('toolbar', { name: 'Sol y planetas' });
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
  test('eligen los 30 cuerpos: los planetas en la primera fila y sus lunas en la segunda', async ({
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
      const row = page.locator('tls-body-chips [role="toolbar"]').first();
      if (moons.length === 0) {
        await expect(page.locator('tls-body-chips .moons')).toBeHidden();
        continue;
      }
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
