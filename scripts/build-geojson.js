// import as a ES module
import geojsonVt from 'geojson-vt';
import vtPbf from 'vt-pbf';
import fs from 'fs';
import path from 'path';

const INPUR_FILE = '../thaielectshp2019_v4.geojson';
const OUTPUT_PATH = path.join(__dirname, '../build/vectortile');
const MAX_ZOOM = 14;

const data = JSON.parse(fs.readFileSync(path.join(__dirname, INPUR_FILE)));

console.log('converting .geojson to vector tiles...')
// Generation options
// this.$options@see https://github.com/mapbox/geojson-vt
const tileIndex = geojsonVt(data, {
  maxZoom: MAX_ZOOM, // max zoom to preserve detail on; can't be higher than 24
  tolerance: 3, // simplification tolerance (higher means simpler)
  extent: 4096, // tile extent (both width and height)
  buffer: 64, // tile buffer on each side
  debug: 0, // logging level (0 to disable, 1 or 2)
  lineMetrics: false, // whether to enable line metrics tracking for LineString/MultiLineString features
  promoteId: null, // name of a feature property to promote to feature.id. Cannot be used with `generateId`
  generateId: false, // whether to generate feature ids. Cannot be used with `promoteId`
  indexMaxZoom: MAX_ZOOM, // max zoom in the initial tile index
  indexMaxPoints: 0 // max number of points per tile in the index
});
console.log(`${tileIndex.tileCoords.length} tiles created`);

// write each Vector Tile in ProtoBuf format
console.log('writing to files...')
tileIndex.tileCoords.forEach(coord => {
  const tile = tileIndex.getTile(coord.z, coord.x, coord.y);
  const buff = vtPbf.fromGeojsonVt({ 'geojsonLayer': tile });
  const tileDir = path.join(OUTPUT_PATH, `/${coord.z}`);
  const tilePath = path.join(tileDir, `${coord.x}-${coord.y}.pbf`);
  fs.existsSync(tileDir) || fs.mkdirSync(tileDir);
  fs.writeFileSync(tilePath, buff);
});
console.log('done');
