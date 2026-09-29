import { describe, it, expect, vi, afterEach } from 'vitest';
import { StageScene } from '../../src/scenes/stage_scene.js';

function makeStage() {
  const statuses = { current_stage: 3, stage_autostart: true };
  const scene = Object.create(StageScene.prototype);
  scene.keyboard = { on_key_down: vi.fn(), reset() {} };
  scene.game = {
    get_status: key => statuses[key],
    update_status: (key, value) => { statuses[key] = value; },
    switch_scene: vi.fn()
  };
  scene.view = { update_stage: vi.fn() };
  return { scene };
}

describe('StageScene', () => {
  afterEach(() => vi.useRealTimers());

  it('rolls on into the battle when the stage starts itself', () => {
    vi.useFakeTimers();
    const { scene } = makeStage();
    scene.start();
    vi.advanceTimersByTime(1500);

    expect(scene.game.switch_scene).toHaveBeenCalledWith('battle_field');
  });

  // The set switched off on the stage screen stays off.
  it('rolls on into nothing once stopped', () => {
    vi.useFakeTimers();
    const { scene } = makeStage();
    scene.start();
    scene.stop();
    vi.advanceTimersByTime(1500);

    expect(scene.game.switch_scene).not.toHaveBeenCalled();
  });
});
