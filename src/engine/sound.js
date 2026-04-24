import { Howl } from 'howler';

export class Sound {
  constructor() {
    this.bgms_playing = {};
    this.bgms         = {};

    this.supported_events().forEach(event_name => {
      this.bgms_playing[event_name] = false;
      this.bgms[event_name] = new Howl({
        src    : [`data/sound/${event_name}.mp3`],
        loop   : false,
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
