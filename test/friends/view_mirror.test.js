import { describe, it, expect, vi } from 'vitest';
import { mirror_views, apply_view_call } from '../../src/friends/view_mirror.js';

function game_with(views) {
  return { scenes: Object.fromEntries(Object.entries(views).map(([name, view]) => [name, { view }])) };
}

describe('mirror_views', () => {
  it("passes the host's view calls on, and still makes them", () => {
    const update_stage = vi.fn(() => 'drawn');
    const game = game_with({ stage: { update_stage } });
    const send = vi.fn();
    mirror_views(game, send);

    expect(game.scenes.stage.view.update_stage(7)).toBe('drawn');

    expect(update_stage).toHaveBeenCalledWith(7);
    expect(send).toHaveBeenCalledWith('view', { view: 'stage', method: 'update_stage', args: [7] });
  });

  it('sends a map unit as just the area it covers', () => {
    const game = game_with({ battle_field: { draw_point_label: vi.fn() } });
    const send = vi.fn();
    mirror_views(game, send);
    const tank = { area: { x1: 0, y1: 40, x2: 40, y2: 80, collide() {} }, map: {} };

    game.scenes.battle_field.view.draw_point_label(tank, 300);

    expect(send.mock.calls[0][1].args).toEqual([{ area: { x1: 0, y1: 40, x2: 40, y2: 80 } }, 300]);
  });

  it('leaves the other views and methods alone', () => {
    const show = vi.fn();
    const welcome_update = vi.fn();
    const game = game_with({ stage: { show, update_stage: vi.fn() }, welcome: { update_scores: welcome_update } });
    const send = vi.fn();
    mirror_views(game, send);

    game.scenes.stage.view.show();
    game.scenes.welcome.view.update_scores(1, 2, 3);

    expect(send).not.toHaveBeenCalled();
  });
});

describe('apply_view_call', () => {
  it("makes the host's call on the guest's own view", () => {
    const update_p1_lives = vi.fn();
    const game = game_with({ battle_field: { update_p1_lives } });

    apply_view_call(game, { view: 'battle_field', method: 'update_p1_lives', args: [2] });

    expect(update_p1_lives).toHaveBeenCalledWith(2);
  });

  // The call comes off the network: only a mirrored method may be reached.
  it('refuses any method that is not mirrored', () => {
    const hide = vi.fn();
    const game = game_with({ stage: { hide } });

    apply_view_call(game, { view: 'stage', method: 'hide', args: [] });
    apply_view_call(game, { view: 'constructor', method: 'update_stage', args: [] });
    apply_view_call(game, { view: 'stage', method: 'update_stage', args: 'not a list' });

    expect(hide).not.toHaveBeenCalled();
  });
});
