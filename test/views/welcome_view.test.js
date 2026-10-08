import { describe, it, expect, beforeEach } from 'vitest';
import { stubKinetic } from '../helpers/kinetic_mock.js';
import { DIFFICULTIES } from '../../src/difficulty.js';

stubKinetic();
const { WelcomeView } = await import('../../src/views/welcome_view.js');

describe('WelcomeView difficulty row', () => {
  let view;

  beforeEach(() => {
    stubKinetic();
    view = new WelcomeView(new Kinetic.Stage());
  });

  const texts = () => Kinetic.Text.mock.calls.map(([config]) => config.text);
  const fill_of = label => label.setFill.mock.lastCall[0];

  it('lays out every difficulty at once, easiest first', () => {
    const names = DIFFICULTIES.map(difficulty => difficulty.name);
    expect(view.difficulty_labels).toHaveLength(names.length);
    const shown = texts().filter(text => names.includes(text));
    expect(shown).toEqual(names);
  });

  it('lights up the chosen difficulty and dims the rest', () => {
    view.update_difficulty('HARD');
    const [easy, normal, hard, nightmare] = view.difficulty_labels;
    expect(fill_of(easy)).toBe(fill_of(normal));
    expect(fill_of(easy)).toBe(fill_of(nightmare));
    expect(fill_of(hard)).not.toBe(fill_of(easy));
  });

  it('underlines the chosen difficulty', () => {
    view.update_difficulty('EASY');
    const easy_x = view.difficulty_marker.setX.mock.lastCall[0];
    view.update_difficulty('NIGHTMARE');
    const nightmare_x = view.difficulty_marker.setX.mock.lastCall[0];
    expect(nightmare_x).toBeGreaterThan(easy_x);
  });
});

describe('WelcomeView credits', () => {
  it('leaves the copyright credit to the page footer', () => {
    stubKinetic();
    new WelcomeView(new Kinetic.Stage());
    const texts = Kinetic.Text.mock.calls.map(([config]) => config.text);
    expect(texts.some(text => /BEN|FENG|©/.test(text))).toBe(false);
  });
});
