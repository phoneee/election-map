const map = L.map('map');

function getFeatureId(feat) {
  return `${feat.properties.province}เขต${feat.properties.zone_num}`;
}

const HILIGHT_STYLE = {
  weight: 2,
  color: 'red',
  opacity: 1,
  fillColor: 'red',
  fill: true,
  radius: 6,
  fillOpacity: 0.5
};

// Custom styling
// @see http://leaflet.github.io/Leaflet.VectorGrid/vectorgrid-api-docs.html
const vectorTileStyling = {
  geojsonLayer: function (properties, zoom) {
    const id = getFeatureId({
      properties
    });
    return {
      weight: 2,
      fill: true,
      fillColor: '#06cccc',
      color: '#06cccc',
      fillOpacity: 0.0,
      opacity: 0.4,
    };
  }
};

// base tile layer
const cartodbAttribution = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>';
const positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
  attribution: cartodbAttribution,
  opacity: 1
}).addTo(map);

// overlay vector later
const vectorTileUrl = 'build/vectortile/{z}/{x}-{y}.pbf';
const vectorTileOptions = {
  // rendererFactory: L.canvas.tile,
  rendererFactory: L.svg.tile,
  vectorTileLayerStyles: vectorTileStyling,
  interactive: true,
  maxZoom: 18,
  maxNativeZoom: 14,
  getFeatureId: getFeatureId
};

const customPbfLayer = L.vectorGrid.protobuf(vectorTileUrl, vectorTileOptions).addTo(map);
let highlight;
const clearHighlight = function () {
  if (highlight) {
    customPbfLayer.resetFeatureStyle(highlight);
  }
  highlight = null;
};
customPbfLayer.on('click', function (e) { // The .on method attaches an event handler
  L.popup()
    .setContent(getFeatureId(e.layer))
    .setLatLng(e.latlng)
    .openOn(map);
  clearHighlight();
  highlight = getFeatureId(e.layer);
  customPbfLayer.setFeatureStyle(highlight, HILIGHT_STYLE);

  L.DomEvent.stop(e);
});
customPbfLayer.addTo(map);

// config map
map.setView({
  lat: 13.040182144806664,
  lng: 100.667968750000002
}, 10);
map.on('zoomend', function () {
  console.log('map zoom: ' + map.getZoom());
});
map.on('click', function (e) {
  console.log('map click:', e);
});