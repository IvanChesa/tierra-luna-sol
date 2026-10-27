import { expect, test } from '@playwright/test';
import { openExplorer, openIndex, trackProblems } from './support';

test.describe('Parámetros de la URL', () => {
  test('un parámetro no válido se ignora, se avisa y no rompe nada', async ({ page }) => {
    const problems = trackProblems(page);
    await openExplorer(
      page,
      '/?fecha=2030-02-31T00:00Z&cuerpo=pluton&escala=gigante&calidad=maxima',
    );

    // Una sola caja, con una línea por parámetro: qué no vale y qué ha hecho el explorador.
    const notices = page.locator('tls-notices .notice');
    await expect(notices).toHaveCount(1);
    const lines = notices.locator('li');
    await expect(lines).toHaveCount(4);
    await expect(lines.nth(0)).toContainText(
      'La fecha «2030-02-31T00:00Z» no vale y se muestra el momento actual.',
    );
    await expect(lines.nth(1)).toContainText('El cuerpo «pluton» no está en el explorador');
    await expect(lines.nth(2)).toContainText(
      'La escala «gigante» no existe y se usa la ilustrativa.',
    );
    await expect(lines.nth(3)).toContainText('La calidad «maxima» no existe y se ha ignorado.');
    // Sin fecha válida, el explorador abre en «ahora», reproduciendo (D31); sin ficha.
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Pausar/);
    await expect(page.locator('.panel')).toBeHidden();
    // Los parámetros que no valen salen de la URL (y `calidad`, aunque valga: es del dispositivo).
    await expect(page).not.toHaveURL(/pluton|gigante|2030-02-31|calidad/);

    await notices.getByRole('button', { name: 'Cerrar el aviso' }).click();
    await expect(notices).toHaveCount(0);
    // Lo demás sigue funcionando.
    await openIndex(page);
    await page.locator('#tree-saturno > .row').click();
    await expect(page.locator('#card-title')).toHaveText('Saturno');
    expect(problems).toEqual([]);
  });

  test('una ruta de vista con cuerpo de otra vista abre la vista sin romperse', async ({
    page,
  }) => {
    const problems = trackProblems(page);
    await openExplorer(page, '/explorar/luna?fecha=2030-06-01T12:00Z&cuerpo=saturno');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('La Luna');
    await expect(page.locator('#tree-luna')).toHaveAttribute('aria-selected', 'true');
    expect(problems).toEqual([]);
  });
});
