import { MapArea2D } from "./map_area_2d.js";
import {
  BrickTerrain,
  IronTerrain,
  WaterTerrain,
  GrassTerrain,
  HomeTerrain,
  IceTerrain
} from "./terrains.js";

function typeToClass(type) {
  if (type === "BrickTerrain") {
    return BrickTerrain;
  } else if (type === "IronTerrain") {
    return IronTerrain;
  } else if (type === "WaterTerrain") {
    return WaterTerrain;
  } else if (type === "GrassTerrain") {
    return GrassTerrain;
  } else if (type === "HomeTerrain") {
    return HomeTerrain;
  } else if (type === "IceTerrain") {
    return IceTerrain;
  } else {
    return BrickTerrain;
  }
}

export class TiledMapBuilder {
  constructor(map, json) {
    this.map = map;
    this.json = json;
    this.tile_width = parseInt(this.json.tilewidth);
    this.tile_height = parseInt(this.json.tileheight);
    this.map_width = parseInt(this.json.width);
    this.map_height = parseInt(this.json.height);
    this.tile_properties = {};
    _.each(this.json.tilesets, tileset => {
      return (() => {
        const result = [];
        for (let gid in tileset.tileproperties) {
          const props = tileset.tileproperties[gid];
          result.push(
            (this.tile_properties[tileset.firstgid + parseInt(gid)] = props)
          );
        }
        return result;
      })();
    });
  }
  setup_stage(stage) {
    const home_layer = _.detect(
      this.json.layers,
      layer => layer.name === "Home"
    );
    const stage_layer = _.detect(
      this.json.layers,
      layer => layer.name === `Stage ${stage}`
    );
    return _.each([home_layer, stage_layer], layer => {
      let h = 0;
      return (() => {
        const result = [];
        while (h < this.map_height) {
          let w = 0;
          while (w < this.map_width) {
            const tile_id = layer.data[h * this.map_width + w];
            if (tile_id !== 0) {
              const properties = this.tile_properties[tile_id];
              const [x1, y1] = Array.from([
                w * this.tile_width + parseInt(properties.x_offset),
                h * this.tile_height + parseInt(properties.y_offset)
              ]);
              const area = new MapArea2D(
                x1,
                y1,
                x1 + parseInt(properties.width),
                y1 + parseInt(properties.height)
              );
              this.map.add_terrain(typeToClass(properties.type), area);
            }
            w += 1;
          }
          result.push((h += 1));
        }
        return result;
      })();
    });
  }
}
