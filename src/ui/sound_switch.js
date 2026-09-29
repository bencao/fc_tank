// One switch for every sound in the game. Each scene owns its own Sound, so
// muting happens on the shared mixer (Howler's global mute) rather than per
// sound. The choice is kept in browser storage for the next visit.

const STORAGE_KEY = "fc_tank:sound";

export class SoundSwitch {
  // mixer: anything with mute(boolean) - Howler in the browser.
  constructor(mixer, storage) {
    this.mixer = mixer;
    this.storage = storage;
    this.listeners = [];
    this.on = this.read() !== "off";
    this.mixer.mute(!this.on);
  }

  on_change(listener) {
    this.listeners.push(listener);
  }

  toggle() {
    this.on = !this.on;
    this.mixer.mute(!this.on);
    this.write(this.on ? "on" : "off");
    this.listeners.forEach(listener => listener(this.on));
    return this.on;
  }

  // Private windows and blocked site data make storage throw; the switch then
  // lasts for this visit only.
  read() {
    try {
      return this.storage?.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  write(value) {
    try {
      this.storage?.setItem(STORAGE_KEY, value);
    } catch {
      // Remembered for this visit only.
    }
  }
}

// Shows the switch on the page (root's data-sound, for styling) and on each of
// its buttons, and flips it on a button press or the M key.
export function install_sound_switch(root, buttons, sound, doc = document) {
  const show = on => {
    root.dataset.sound = on ? "on" : "off";
    buttons.forEach(button => {
      button.setAttribute("aria-pressed", String(on));
      button.textContent = on ? "SOUND ON" : "SOUND OFF";
    });
  };
  sound.on_change(show);
  show(sound.on);

  buttons.forEach(button => button.addEventListener("click", () => sound.toggle()));
  doc.addEventListener("keydown", event => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) { return; }
    if (event.key === "m" || event.key === "M") {
      sound.toggle();
      event.preventDefault();
    }
  });
  return sound;
}
