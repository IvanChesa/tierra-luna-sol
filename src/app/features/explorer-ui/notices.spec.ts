import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from './explorer-session';
import { Notices } from './notices';

function render(search: string) {
  window.history.replaceState({}, '', `/${search}`);
  TestBed.configureTestingModule({
    imports: [Notices],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      SimulationStore,
      ExplorerStore,
      SystemPositions,
      ExplorerSession,
    ],
  });
  TestBed.inject(ExplorerStore).connectView(signal('system'));
  const fixture = TestBed.createComponent(Notices);
  fixture.detectChanges();
  return {
    fixture,
    root: fixture.nativeElement as HTMLElement,
    sim: TestBed.inject(SimulationStore),
  };
}

describe('Notices: avisos del explorador', () => {
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('los parámetros que no valen van en una sola caja y se cierran a la vez', () => {
    const { fixture, root } = render('?fecha=hola&cuerpo=pluton');
    const notices = root.querySelectorAll('.notice');
    expect(notices).toHaveLength(1);
    const lines = [...root.querySelectorAll('.notice li')].map((li) => li.textContent?.trim());
    expect(lines).toEqual([
      expect.stringContaining('La fecha «hola» no vale y se muestra el momento actual.'),
      'El cuerpo «pluton» no está en el explorador y se ha ignorado.',
    ]);
    root.querySelector<HTMLButtonElement>('.notice__close')?.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.notice')).toHaveLength(0);
  });

  it('el límite de 2100 se dice en UTC (y en tu hora local si es otra) con lo que puedes hacer', () => {
    const { fixture, root, sim } = render('?fecha=2100-12-31T23:59:59Z');
    sim.setSpeed(86_400);
    sim.play();
    fixture.detectChanges();
    const text = root.querySelector('.notice__text')?.textContent?.trim() ?? '';
    expect(text.replace(/\s/g, ' ')).toMatch(
      /^La simulación se ha parado en el límite del explorador: 31 dic 2100, 23:59 UTC( \(.+ en tu hora local\))?\. Elige una fecha anterior o vuelve a «Ahora»\.$/,
    );
  });
});
