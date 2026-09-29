import { Howl } from 'howler';

// iOS only lets audio start again from inside a touch or key press. Howler
// tries to wake its mixer when a sound plays - which is rarely inside one -
// so on an iPhone a mixer that dozed off after a quiet spell, or was
// "interrupted" by the phone locking, would stay silent: first to go missing
// is each stage's opening music. So the mixer never dozes, and any touch or
// key wakes it if it has stopped.
export function keep_audio_awake(howler, page = document) {
  howler.autoSuspend = false;
  const wake = () => {
    if (howler.ctx && howler.ctx.state !== 'running') {
      howler._autoResume();
    }
  };
  for (const type of ['pointerdown', 'touchend', 'keydown']) {
    page.addEventListener(type, wake, true);
  }
}

// Mix levels (0-1) for sounds that shouldn't play at full volume. The enemy
// rumble plays nonstop during a battle and at the same loudness as the
// player's own engine, so it is pushed well back; power-ups are eased down.
const VOLUMES = {
  enemy_move: 0.35,
  gift: 0.6,
  gift_bomb: 0.6,
  gift_life: 0.6
};

// How long to treat a sound as busy when its length isn't known yet, in ms.
const UNKNOWN_DURATION = 300;

export class Sound {
  constructor() {
    this.bgms       = {};
    this.busy_until = {};
    // Told the name of every sound as it starts - friends play passes them on.
    this.on_play    = null;

    this.supported_events().forEach(event_name => {
      this.bgms[event_name] = new Howl({
        src    : [`data/sound/${event_name}.mp3`],
        loop   : false,
        volume : VOLUMES[event_name] ?? 1
      });
    });
  }

  supported_events() {
    return [
      'start_stage',
      'enemy_move',
      'user_move',
      'fire',
      'fire_reach_wall',
      'gift',
      'gift_bomb',
      'gift_life',
      'lose'
    ];
  }

  // Engines and held fire ask for their sound on every frame; only one copy
  // of a sound plays at a time. A sound counts as busy from the moment it is
  // asked for until it has had time to finish. Howler's own word can't be
  // used: it reports a start asynchronously - every frame in between would
  // stack another copy - and it can miss an end, leaving a sound "playing",
  // and so silent, for good.
  play(event_name) {
    const howl = this.bgms[event_name];
    if (!howl) { return; }
    const now = Date.now();
    if (now < (this.busy_until[event_name] ?? 0)) { return; }
    this.busy_until[event_name] = now + (howl.duration() * 1000 || UNKNOWN_DURATION);
    this.on_play?.(event_name);
    return howl.play();
  }
}
