import { Howl } from 'howler';

// Mix levels (0-1) for sounds that shouldn't play at full volume. The enemy
// rumble plays nonstop during a battle and at the same loudness as the
// player's own engine, so it is pushed well back; power-ups are eased down.
const VOLUMES = {
  enemy_move: 0.35,
  gift: 0.6,
  gift_bomb: 0.6,
  gift_life: 0.6
};

export class Sound {
  constructor() {
    this.bgms_playing = {};
    this.bgms         = {};

    this.supported_events().forEach(event_name => {
      this.bgms_playing[event_name] = false;
      this.bgms[event_name] = new Howl({
        src    : [`data/sound/${event_name}.mp3`],
        loop   : false,
        volume : VOLUMES[event_name] ?? 1,
        onplay : () => { this.bgms_playing[event_name] = true; },
        onend  : () => { this.bgms_playing[event_name] = false; }
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

  play(event_name) {
    if (event_name in this.bgms && !this.bgms_playing[event_name]) {
      return this.bgms[event_name].play();
    }
  }
}
