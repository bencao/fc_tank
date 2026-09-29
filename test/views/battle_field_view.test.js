import { describe, it, expect, beforeEach } from 'vitest';
import { stubKinetic } from '../helpers/kinetic_mock.js';

stubKinetic();
const { BattleFieldView } = await import('../../src/views/battle_field_view.js');

describe('BattleFieldView difficulty', () => {
  let view;

  beforeEach(() => {
    stubKinetic();
    view = new BattleFieldView(new Kinetic.Stage());
  });

  it('shows the difficulty in the side status bar', () => {
    view.update_difficulty('NIGHTMARE');
    expect(view.difficulty_label.setText).toHaveBeenLastCalledWith('NIGHTMARE');
  });

  it('paints NIGHTMARE red so it stands out from the rest', () => {
    view.update_difficulty('NORMAL');
    const normal = view.difficulty_label.setFill.mock.lastCall[0];
    view.update_difficulty('NIGHTMARE');
    const nightmare = view.difficulty_label.setFill.mock.lastCall[0];
    expect(nightmare).not.toBe(normal);
  });
});

describe('BattleFieldView enemy counter', () => {
  // Kinetic's destroy() leaves a started sprite's timer and animation running
  // for good, and the counter is redrawn every time an enemy arrives.
  it('leaves nothing running behind the symbols it throws away', () => {
    stubKinetic();
    const view = new BattleFieldView(new Kinetic.Stage());
    view.update_enemy_statuses(20);
    const old_symbols = view.enemy_symbols;

    view.update_enemy_statuses(19);

    const still_running = old_symbols.filter(symbol =>
      symbol.start.mock.calls.length > symbol.stop.mock.calls.length);
    expect(still_running).toHaveLength(0);
  });
});
