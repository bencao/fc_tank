import { describe, it, expect, vi } from 'vitest';
import { SoundSwitch, install_sound_switch } from '../../src/ui/sound_switch.js';

function memoryStorage(values = {}) {
  return {
    getItem: key => values[key] ?? null,
    setItem: (key, value) => { values[key] = String(value); },
    values
  };
}

describe('SoundSwitch', () => {
  it('starts with the sound on and the mixer unmuted', () => {
    const mixer = { mute: vi.fn() };
    const sound = new SoundSwitch(mixer, memoryStorage());

    expect(sound.on).toBe(true);
    expect(mixer.mute).toHaveBeenLastCalledWith(false);
  });

  it('mutes every sound when turned off, and unmutes when turned back on', () => {
    const mixer = { mute: vi.fn() };
    const sound = new SoundSwitch(mixer, memoryStorage());

    sound.toggle();
    expect(sound.on).toBe(false);
    expect(mixer.mute).toHaveBeenLastCalledWith(true);

    sound.toggle();
    expect(sound.on).toBe(true);
    expect(mixer.mute).toHaveBeenLastCalledWith(false);
  });

  it('remembers the choice for the next visit', () => {
    const storage = memoryStorage();
    new SoundSwitch({ mute() {} }, storage).toggle();

    const mixer = { mute: vi.fn() };
    const next_visit = new SoundSwitch(mixer, storage);

    expect(next_visit.on).toBe(false);
    expect(mixer.mute).toHaveBeenLastCalledWith(true);
  });

  // Private windows and blocked site data make storage throw; the switch
  // must still work for this visit.
  it('still switches when storage is unavailable', () => {
    const broken = {
      getItem() { throw new Error('denied'); },
      setItem() { throw new Error('denied'); }
    };
    const sound = new SoundSwitch({ mute() {} }, broken);

    expect(sound.on).toBe(true);
    sound.toggle();
    expect(sound.on).toBe(false);
  });

  it('tells its listeners whenever it flips', () => {
    const sound = new SoundSwitch({ mute() {} }, memoryStorage());
    const heard = [];
    sound.on_change(on => heard.push(on));

    sound.toggle();
    sound.toggle();

    expect(heard).toEqual([false, true]);
  });
});

describe('install_sound_switch', () => {
  function fakeButton() {
    const handlers = {};
    return {
      attributes: {},
      textContent: '',
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(type, handler) { handlers[type] = handler; },
      click() { handlers.click?.({ preventDefault() {} }); }
    };
  }
  function fakeDocument() {
    const handlers = [];
    return {
      addEventListener(type, handler) { if (type === 'keydown') handlers.push(handler); },
      press(key, extra = {}) {
        const event = { key, repeat: false, preventDefault: vi.fn(), ...extra };
        handlers.forEach(handler => handler(event));
        return event;
      }
    };
  }

  it('shows the switch on the page and on every button', () => {
    const root = { dataset: {} };
    const buttons = [fakeButton(), fakeButton()];
    install_sound_switch(root, buttons, new SoundSwitch({ mute() {} }, memoryStorage()), fakeDocument());

    expect(root.dataset.sound).toBe('on');
    buttons.forEach(button => {
      expect(button.attributes['aria-pressed']).toBe('true');
      expect(button.textContent).toBe('SOUND ON');
    });
  });

  it('flips with a click on any of its buttons', () => {
    const root = { dataset: {} };
    const buttons = [fakeButton(), fakeButton()];
    const sound = new SoundSwitch({ mute() {} }, memoryStorage());
    install_sound_switch(root, buttons, sound, fakeDocument());

    buttons[1].click();

    expect(sound.on).toBe(false);
    expect(root.dataset.sound).toBe('off');
    expect(buttons[0].attributes['aria-pressed']).toBe('false');
    expect(buttons[0].textContent).toBe('SOUND OFF');
  });

  it('flips with the M key, but not while a modifier is held or the key repeats', () => {
    const sound = new SoundSwitch({ mute() {} }, memoryStorage());
    const doc = fakeDocument();
    install_sound_switch({ dataset: {} }, [], sound, doc);

    doc.press('m');
    expect(sound.on).toBe(false);
    doc.press('M');
    expect(sound.on).toBe(true);

    doc.press('m', { metaKey: true });
    doc.press('m', { ctrlKey: true });
    doc.press('m', { repeat: true });
    expect(sound.on).toBe(true);
  });
});
