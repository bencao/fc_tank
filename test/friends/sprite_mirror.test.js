import { describe, it, expect, beforeEach } from 'vitest';
import { stubKinetic } from '../helpers/kinetic_mock.js';

stubKinetic();

const { Map2D } = await import('../../src/map/map_2d.js');
const { Direction } = await import('../../src/constants.js');
const { SpriteMirror } = await import('../../src/friends/sprite_mirror.js');

const sprites_made = () => Kinetic.Sprite.mock.calls.map(([config], i) => ({ config, sprite: Kinetic.Sprite.mock.results[i].value }));

function mirror() {
  const layer = { add: () => {}, batchDraw: () => {} };
  const map = new Map2D(layer);
  return { map, mirror: new SpriteMirror(map, layer) };
}

describe('SpriteMirror', () => {
  beforeEach(() => Kinetic.Sprite.mockClear());

  it('lays the terrain it is sent, and takes away what goes', () => {
    const { map, mirror: m } = mirror();

    m.apply({ units: [], terrain: { add: [[1, 'brick', 0, 200, 40, 240], [2, 'grass', 40, 200, 80, 240]], remove: [] } });
    expect(map.terrains.map(t => [t.type(), t.area.x1, t.area.y1])).toEqual([['brick', 0, 200], ['grass', 40, 200]]);

    m.apply({ units: [], terrain: { add: [], remove: [1] } });
    expect(map.terrains.map(t => t.type())).toEqual(['grass']);
  });

  it('shows a fallen home', () => {
    const { map, mirror: m } = mirror();

    m.apply({ units: [], terrain: { add: [[5, 'home_destroyed', 240, 480, 280, 520]], remove: [] } });

    expect(map.home().display_object.setAnimation).toHaveBeenCalledWith('destroyed');
  });

  it('draws a tank centred where the host has it, and moves it along', () => {
    const { mirror: m } = mirror();

    m.apply({ units: [[7, 't', 'user_p2_lv1', 340, 500, Direction.UP]] });
    const [{ config, sprite }] = sprites_made();
    expect(config).toMatchObject({ x: 340, y: 500, animation: 'user_p2_lv1', offset: { x: 20, y: 20 }, rotationDeg: Direction.UP });
    expect(sprite.start).toHaveBeenCalled();

    m.apply({ units: [[7, 't', 'user_p2_lv1', 340, 490, Direction.UP]] });
    expect(sprites_made()).toHaveLength(1);
    expect(sprite.setAbsolutePosition).toHaveBeenLastCalledWith(340, 490);
    expect(sprite.setAnimation).not.toHaveBeenCalled();
  });

  // Setting a sprite's animation rewinds it; do it only when it changes.
  it('changes a sprite\'s animation only when the host\'s did', () => {
    const { mirror: m } = mirror();
    m.apply({ units: [[7, 't', 'tank_born', 340, 500, 0]] });
    const [{ sprite }] = sprites_made();

    m.apply({ units: [[7, 't', 'user_p2_lv1_with_guard', 340, 500, 0]] });
    m.apply({ units: [[7, 't', 'user_p2_lv1_with_guard', 340, 500, 0]] });

    expect(sprite.setAnimation).toHaveBeenCalledTimes(1);
    expect(sprite.setAnimation).toHaveBeenCalledWith('user_p2_lv1_with_guard');
  });

  it('draws missiles by their centre and gifts by their corner', () => {
    const { mirror: m } = mirror();

    m.apply({ units: [[8, 'm', 'missile', 100, 100, Direction.LEFT], [9, 'g', 'star', 120, 240, 0]] });

    const [missile, gift] = sprites_made();
    expect(missile.config).toMatchObject({ x: 100, y: 100, offset: { x: 10, y: 10 } });
    expect(gift.config).toMatchObject({ x: 120, y: 240, animation: 'star' });
    expect(gift.config.offset).toBeUndefined();
  });

  it('draws nothing for an animation it does not know', () => {
    const { mirror: m } = mirror();

    m.apply({ units: [[7, 't', 'no_such_tank', 0, 0, 0], [8, 'g', 'toString', 0, 0, 0]] });

    expect(sprites_made()).toHaveLength(0);
  });

  // A started sprite keeps its own timer and animation running until it is
  // stopped - destroyed alone, every missile ever fired would go on ticking.
  it('stops and takes away the sprite of a unit the host no longer has', () => {
    const { mirror: m } = mirror();
    m.apply({ units: [[7, 't', 'user_p2_lv1', 340, 500, 0]] });
    const [{ sprite }] = sprites_made();

    m.apply({ units: [] });

    expect(sprite.stop).toHaveBeenCalled();
    expect(sprite.destroy).toHaveBeenCalled();
  });

  it('sets off an explosion where the host had one', () => {
    const { mirror: m } = mirror();

    m.apply({ units: [], booms: [[60, 80]] });

    const [{ config, sprite }] = sprites_made();
    expect(config).toMatchObject({ x: 60, y: 80, animation: 'bom', offset: { x: 20, y: 20 } });
    expect(sprite.afterFrame).toHaveBeenCalledWith(3, expect.any(Function));
  });

  it('clears the field for the next battle', () => {
    const { map, mirror: m } = mirror();
    m.apply({ units: [[7, 't', 'user_p2_lv1', 340, 500, 0]], terrain: { add: [[1, 'brick', 0, 200, 40, 240]], remove: [] } });
    const [{ sprite }] = sprites_made();

    m.clear();

    expect(sprite.stop).toHaveBeenCalled();
    expect(sprite.destroy).toHaveBeenCalled();
    expect(map.terrains).toHaveLength(0);
  });
});
