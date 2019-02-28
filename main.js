const map = L.map('map');

function getFeatureId(feature) {
  return `${feature.properties.province}<br>เขต ${feature.properties.zone_num}`;
}
var showparty = {
  'color': '#781f2e',
  'weight': 2,
  'opacity': 1
};
function highlightLayer(layerID) {
  map._layers['name'+LayerID].setStyle(showparty);
}



function style(feature) {
  return {
    fillColor: function (p,z) {
      getColor(feature.properties.province, feature.properties.zone_num)
},
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.7
  };

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
// event.currentTarget

// add legend control layers - global variable with (null, null) allows indiv basemaps and overlays to be added inside functions below
var controlLayers = L.control.layers( null, null, {
  position: "topright",
  collapsed: false // false = open by default
}).addTo(map);


// base tile layer
const cartodbAttribution = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>';
const positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
  attribution: cartodbAttribution,
  opacity: 1
}).addTo(map);

// overlay vector later
const vectorTileUrl = '/build/vectortile/{z}/{x}-{y}.pbf';
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

function HighlightParty(data, PartyName, e) {data.filter(function (el) {
  return el.PartyName == PartyName ;
}).forEach(
    // TODO เอาไปจอยกับ e.layer ยังไง
);
}
console.log(newArray);


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
  lng: 100.677968750000002
}, 10);
map.on('zoomend', function () {
  console.log('map zoom: ' + map.getZoom());
});
map.on('click', function (e) {
  console.log('map click:', e);
});