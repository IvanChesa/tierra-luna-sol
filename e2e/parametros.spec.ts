import { expect, test } from '@playwright/test';
import { openExplorer, trackProblems } from './support';

test.describe('Parámetros de la URL', () => {
  test('un parámetro no válido se ignora, se avisa y no rompe nada', async ({ page }) => {
    const problems = trackProblems(page);
    await openExplorer(page, '/?fecha=2030-02-31T00:00Z&cuerpo=pluton&escala=gigante');

    const notices = page.locator('tls-notices .notice');
    await expect(notices).toHaveCount(3);
    await expect(notices.nth(0)).toContainText('La fecha «2030-02-31T00:00Z» no vale');
    await expect(notices.nth(1)).toContainText('El cuerpo «pluton» no está en el explorador.');
    await expect(notices.nth(2)).toContainText('La escala «gigante» no existe');
    // Sin fecha válida, el explorador abre en «ahora» y en tiempo real; sin ficha.
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Pausar/);
    await expect(page.locator('.panel')).toBeHidden();
    // Los parámetros que no valen salen de la URL.
    await expect(page).not.toHaveURL(/pluton|gigante|2030-02-31/);

    await notices.nth(1).getByRole('button', { name: 'Cerrar el aviso' }).click();
    await expect(notices).toHaveCount(2);
    // Lo demás sigue funcionando.
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
