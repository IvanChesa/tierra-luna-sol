import { expect, test } from '@playwright/test';
import { countUrlChanges, openExplorer, simTime, trackProblems, urlChanges } from './support';

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
    await page.locator('#time-date').fill('2031-03-15');
    // 14:00 en Madrid el 15 de marzo (invierno: UTC+1) son las 13:00 UTC.
    await expect.poll(() => simTime(page)).toBe(Date.parse('2031-03-15T13:00:00Z'));
    await expect(page).toHaveURL(/fecha=2031-03-15T13:00Z/);

    // Una fecha fuera del rango no se aplica y se explica.
    await page.locator('#time-date').fill('1850-01-01');
    await expect(page.getByRole('alert')).toContainText('entre 1900 y 2100');
    expect(await simTime(page)).toBe(Date.parse('2031-03-15T13:00:00Z'));
  });

  test('a tiempo real el tiempo avanza y la URL no cambia mientras corre', async ({ page }) => {
    await openExplorer(page, '/?fecha=2030-06-01T12:00Z&cuerpo=marte');
    await page.locator('.time__play').click();
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Pausar/);
    // Al reproducir, la fecha sale de la URL (una sola vez) y el cuerpo se queda.
    await expect(page).not.toHaveURL(/fecha=/);
    await expect(page).toHaveURL(/cuerpo=marte/);
    await countUrlChanges(page);
    const start = await simTime(page);
    await page.waitForTimeout(3000);
    const elapsed = (await simTime(page)) - start;
    expect(elapsed).toBeGreaterThan(1500);
    expect(elapsed).toBeLessThan(4500);
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
    const start = await simTime(page);
    await page.waitForTimeout(2000);
    const elapsed = (await simTime(page)) - start;
    // Hacia atrás, hasta unas dos horas simuladas en dos segundos. Con SwiftShader cada frame tarda
    // más de lo que el motor deja avanzar el reloj de una vez (400 ms), así que corre algo menos.
    expect(elapsed).toBeLessThan(-10 * 60_000);
    expect(elapsed).toBeGreaterThan(-3 * 3600_000);
    await page.keyboard.press('k');
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
    await page.locator('.time__play').click();
    await page.waitForTimeout(3000);
    const changes = await page.evaluate(() => window.__e2eTimeChanges ?? 0);
    expect(changes).toBeGreaterThan(3);
    expect(changes).toBeLessThanOrEqual(16);
    await page.keyboard.press('k');
  });

  test('al llegar a 2100 la simulación se para y lo avisa', async ({ page }) => {
    await openExplorer(page, '/?fecha=2100-12-31T23:00Z');
    await page.locator('#time-speed').selectOption('day');
    await page.locator('.time__play').click();
    await expect(page.locator('tls-notices')).toContainText('al final de 2100 (UTC)');
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Reproducir/);
    expect(await simTime(page)).toBe(Date.parse('2100-12-31T23:59:59Z'));
    await page.getByRole('button', { name: 'Cerrar el aviso' }).click();
    await expect(page.locator('.notice')).toHaveCount(0);
  });
});
