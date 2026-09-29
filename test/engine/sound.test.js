import { describe, it, expect, vi, afterEach } from 'vitest';

const howls = {};
vi.mock('howler', () => ({
  Howl: vi.fn(function (options) {
    howls[options.src[0]] = options;
    this.play = vi.fn();
    // Howler only reports a sound as playing once it has actually started,
    // and hears about the start asynchronously.
    this.playing = vi.fn(() => false);
    this.duration = vi.fn(() => 0.3);
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

  describe('asked for a sound every frame', () => {
    afterEach(() => { vi.useRealTimers(); });

    // Engines and held fire ask for their sound on every frame. Starting a new
    // copy each time stacks them up into a roar.
    it('starts one copy at a time, even before the first has reported starting', () => {
      vi.useFakeTimers();
      const sound = new Sound();

      for (let frame = 0; frame < 10; frame++) {
        sound.play('enemy_move');
        vi.advanceTimersByTime(16);
      }

      expect(sound.bgms.enemy_move.play).toHaveBeenCalledTimes(1);
    });

    // Waiting on Howler to say a sound ended left it silent for good whenever
    // that word never came.
    it('plays it again once the last copy has had time to finish', () => {
      vi.useFakeTimers();
      const sound = new Sound();

      sound.play('enemy_move');
      vi.advanceTimersByTime(300);
      sound.play('enemy_move');

      expect(sound.bgms.enemy_move.play).toHaveBeenCalledTimes(2);
    });

    // Howler can miss a sound's end and report it playing forever.
    it('plays it again on time even when Howler never notices the last copy ended', () => {
      vi.useFakeTimers();
      const sound = new Sound();
      sound.bgms.start_stage.playing.mockReturnValue(true);

      sound.play('start_stage');
      vi.advanceTimersByTime(300);
      sound.play('start_stage');

      expect(sound.bgms.start_stage.play).toHaveBeenCalledTimes(2);
    });
  });

  // Friends play: the friend hears what the host hears - once, not once a frame.
  it('tells its listener about each sound it actually plays', () => {
    vi.useFakeTimers();
    const sound = new Sound();
    const heard = [];
    sound.on_play = name => heard.push(name);

    sound.play('fire');
    sound.play('fire');
    sound.play('no_such_sound');

    expect(heard).toEqual(['fire']);
    vi.useRealTimers();
  });
});

const { keep_audio_awake } = await import('../../src/engine/sound.js');

describe('keep_audio_awake', () => {
  function setup(state) {
    const howler = { ctx: { state }, autoSuspend: true, _autoResume: vi.fn() };
    const page = new EventTarget();
    keep_audio_awake(howler, page);
    return { howler, page };
  }

  // Suspended after a quiet spell, iOS won't start it again without a touch -
  // and the next thing to play is the stage's opening music.
  it('never lets the mixer doze off between sounds', () => {
    const { howler } = setup('running');

    expect(howler.autoSuspend).toBe(false);
  });

  // A locked iPhone leaves the audio "interrupted", which Howler never wakes.
  for (const state of ['suspended', 'interrupted']) {
    it(`wakes the mixer from "${state}" on the next touch or key`, () => {
      const { howler, page } = setup(state);

      page.dispatchEvent(new Event('pointerdown'));

      expect(howler._autoResume).toHaveBeenCalled();
    });
  }

  it('leaves a running mixer alone', () => {
    const { howler, page } = setup('running');

    page.dispatchEvent(new Event('keydown'));

    expect(howler._autoResume).not.toHaveBeenCalled();
  });
});
