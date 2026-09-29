import { describe, it, expect, vi } from 'vitest';

const howls = {};
vi.mock('howler', () => ({
  Howl: vi.fn(function (options) {
    howls[options.src[0]] = options;
    this.play = vi.fn();
  })
}));

const { Sound } = await import('../../src/engine/sound.js');

describe('Sound', () => {
  it('keeps the enemy engine rumble well under the player tank so the two can be told apart', () => {
    new Sound();
    const volume = name => howls[`data/sound/${name}.mp3`].volume ?? 1;

    expect(volume('enemy_move')).toBeLessThanOrEqual(0.5 * volume('user_move'));
  });

  it('plays the power-up sounds a bit quieter than the rest', () => {
    new Sound();
    const volume = name => howls[`data/sound/${name}.mp3`].volume ?? 1;

    for (const name of ['gift', 'gift_bomb', 'gift_life']) {
      expect(volume(name)).toBeLessThan(volume('fire'));
    }
  });
});
