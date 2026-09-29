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
