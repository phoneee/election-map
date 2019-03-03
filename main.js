const bounds = [
  [20.464607239, 97.343635559], // Southwest coordinates
  [-73.91058699000139, 105.636978149]  // Northeast coordinates
];
const map = L.map('map');

/**
 * Load JSON data from URL
 * @param {String} url
 * @return {Object} requested data
 */
function fetchAsync(url) {
  return fetch(url)
    .then(response => response.json())
    .then(json => {
      return json;
    })
    .catch(e => {
      return e
    });
}

/**
 * Crate a unique ID for each election district (province + zone)
 * @param {Object} feature GeoJSON feature object
 * @return {String} Unique feature ID
 */
function getFeatureId(feature) {
  return `${feature.properties.province}-${feature.properties.zone_num}`;
}

/**
 * Clear styles from all features
 */
const clearHighlight = function () {
  // clear highlight from all features
  Object.keys(featureList).forEach(featureId => {
    customPbfLayer.resetFeatureStyle(featureId);
  });
};

/**
 * Highlight districts by party name
 * @param {String} partyName
 */
async function highlightByParty(partyName) {
  const data = await fetchAsync(`./data/parties/${partyName}.json`);
  data.forEach(district => {
    // highlight by feature ID
    const featureId = `${district.province_name}-${district.zone_number}`;
    customPbfLayer.setFeatureStyle(featureId, HILIGHT_STYLE);
  });
}

// Keep tracks of all features on vector tile
const featureList = {};

// Currently selected district feature ID
let highlight;

const showparty = {
  'color': '#781f2e',
  'weight': 2,
  'opacity': 1
};

function highlightLayer(layerID) {
  map._layers['name' + LayerID].setStyle(showparty);
}


function style(feature) {
  return {
    fillColor: function (p, z) {
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
  color: 'blue',
  opacity: 1,
  fillColor: 'blue',
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
    // add this feature to tracking list
    featureList[id] = true;
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
// let controlLayers = L.control.layers( null, null, {
//   position: "topright",
//   collapsed: false // false = open by default
// }).addTo(map);


// base tile layer
const cartodbAttribution = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>';
const positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
  attribution: cartodbAttribution,
  opacity: 1,
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

customPbfLayer.on('click', function (e) { // The .on method attaches an event handler
  L.popup()
    .setContent(getFeatureId(e.layer))
    .setLatLng(e.latlng)
    .openOn(map);
  clearHighlight();
  highlight = getFeatureId(e.layer);
  customPbfLayer.setFeatureStyle(highlight, HILIGHT_STYLE);
  var info = document.getElementById('info');
  if (e.layer) {
    info.innerHTML = "heyyy";
  } else {
    info.innerHTML = '&nbsp;';
  }
  L.DomEvent.stop(e);
});
customPbfLayer.addTo(map);

// config map
map.options.minZoom = 6;
map.fitBounds(bounds)
map.setView({
  lat: 13.640182144806664,
  lng: 100.677968750000002
}, 6);
map.on('zoomend', function () {
  console.log('map zoom: ' + map.getZoom());
});
map.on('click', function (e) {
  console.log('map click:', e);
});

// UI interactions
const select = document.getElementById("select-party");
select.onchange = async function () {
  const partyName = select.value;
  clearHighlight();
  await highlightByParty(partyName);
};
