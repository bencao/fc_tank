import { MapArea2D } from "./map_area_2d.js";
import {
  BrickTerrain,
  IronTerrain,
  WaterTerrain,
  GrassTerrain,
  HomeTerrain,
  IceTerrain
} from "./terrains.js";

const typeMap = {
  BrickTerrain,
  IronTerrain,
  WaterTerrain,
  GrassTerrain,
  HomeTerrain,
  IceTerrain
};

export function typeToClass(type) {
  return typeMap[type] || BrickTerrain;
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
    this.json.tilesets.forEach(tileset => {
      for (let gid in tileset.tileproperties) {
        const props = tileset.tileproperties[gid];
        this.tile_properties[tileset.firstgid + parseInt(gid)] = props;
      }
    });
  }
  setup_stage(stage) {
    const home_layer = this.json.layers.find(
      layer => layer.name === "Home"
    );
    const stage_layer = this.json.layers.find(
      layer => layer.name === `Stage ${stage}`
    );
    [home_layer, stage_layer].forEach(layer => {
      let h = 0;
      while (h < this.map_height) {
        let w = 0;
        while (w < this.map_width) {
          const tile_id = layer.data[h * this.map_width + w];
          if (tile_id !== 0) {
            const properties = this.tile_properties[tile_id];
            const x1 = w * this.tile_width + parseInt(properties.x_offset);
            const y1 = h * this.tile_height + parseInt(properties.y_offset);
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
        h += 1;
      }
    });
  }
}
