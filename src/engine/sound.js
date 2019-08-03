export class Sound {
  constructor() {
    this.bgms_playing = {};
    this.bgms         = {};

    _.each(this.supported_events(), event_name => {
      this.bgms_playing[event_name] = false;
      return this.bgms[event_name]         = new Howl({
        urls   : [`data/sound/${event_name}.mp3`],
        loop   : false,
        onplay : (() => { return this.bgms_playing[event_name] = true; }),
        onend  : (() => { return this.bgms_playing[event_name] = false; })
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
    if (_.has(this.bgms, event_name) && !this.bgms_playing[event_name]) {
      return this.bgms[event_name].play();
    }
  }
}
