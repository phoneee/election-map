const defaultBounds = [
  [94.306641, 4.828260], // Southwest
  [108.457031, 21.616579] // Northeast
];
const maxBounds = [
  [90.087891, 2.021065], // Southwest
  [112.236328, 23.966176] // Northeast
];
const mapFullPageCenter = {
  lat: 13.640182,
  lng: 100.677968
};
const mapHalfPageCenter = {
  lat: 13.640182,
  lng: 105.220468
};

mapboxgl.accessToken = 'pk.eyJ1IjoibGJ1ZCIsImEiOiJCVTZFMlRRIn0.0ZQ4d9-WZrekVy7ML89P4A';

// Map object
let map;

function isMobile() {
  const width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
  return width < 764;
}

// Lighten
// const NewColor = LightenDarkenColor("#F06D06", 20);
// Darken
// const NewColor = LightenDarkenColor("#F06D06", -20);
function lightenDarkenColor(col, amt) {
  let usePound = false;
  if (col[0] == "#") {
      col = col.slice(1);
      usePound = true;
  }

  const num = parseInt(col,16);

  let r = (num >> 16) + amt;
  if (r > 255) r = 255;
  else if  (r < 0) r = 0;

  let b = ((num >> 8) & 0x00FF) + amt;
  if (b > 255) b = 255;
  else if  (b < 0) b = 0;

  let g = (num & 0x0000FF) + amt;
  if (g > 255) g = 255;
  else if (g < 0) g = 0;

  return (usePound ? '#': '') + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}

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
 * Hilight districts by party name
 * @param {String} partyName
 * @return {Array<String>} List of feature ID belongs to the party
 */
async function hilightByParty(partyName) {
  const candidates = await fetchAsync(`./data/parties/${partyName}.json`);
  let partyInfo = partyList.filter(p => p.name === partyName);
  if (partyInfo) partyInfo = partyInfo[0];
  // const featureList = candidates.map(candidate => {
  //   // hilight by feature ID
  //   const featureId = `${candidate.province_name}-${candidate.zone_number}`;
  //   // customPbfLayer.setFeatureStyle(featureId, {
  //   //   ...PARTY_STYLE,
  //   //   color: partyInfo.color || PARTY_STYLE.color,
  //   //   fillColor: partyInfo.color || PARTY_STYLE.fillColor
  //   // });
  //   return featureId;
  // });
  // const featureList = candidates.map(d => d.fid);

  if (candidates && candidates.length > 0) {
    map.setPaintProperty('election-district-party', 'fill-color', partyInfo.color);
    map.setPaintProperty('election-district-party', 'fill-outline-color', lightenDarkenColor(partyInfo.color, -20));
    // map.setPaintProperty('election-district', 'line-color', lightenDarkenColor(partyInfo.color, -20));
    map.setFilter('election-district-party', [
      'any',
      ...candidates.map(c => ([
        'all',
        ['==', 'province', c.province_name],
        ['==', 'zone_num', c.zone_number],
      ]))
    ]);
  }

  return candidates;
}

function zoomFullPage() {
  map.fitBounds(defaultBounds);
}

function zoomHalfPage() {
  map.flyTo({
    center: mapHalfPageCenter,
    zoom: 4.8
  });
}

function selectDistrict(feature) {
  if (!feature) {
    document.getElementById('party-howto').innerHTML = 'เลือกเขตเพื่อดูข้อมูลผู้สมัคร';
    document.getElementById('app').classList.remove('show-district');
    return;
  }
  ;

  let partyInfo = partyList.filter(p => p.name === selectedPartyName);
  if (partyInfo) partyInfo = partyInfo[0];

  hilight = feature;
  const hilightId = getFeatureId(feature);

  // map.setPaintProperty('election-district-hilight', 'fill-color', partyInfo && partyInfo.hilightColor || HILIGHT_STYLE.fillColor);
  map.setPaintProperty('election-district-hilight', 'fill-color', HILIGHT_STYLE.fillColor);
  map.setFilter('election-district-hilight', ['==', 'fid', feature.properties.fid]);

  document.getElementById('app').classList.add('show-district');
  document.getElementById('district-name').innerHTML = `${feature.properties.province} เขตเลือกตั้งที่${feature.properties.zone_num}`;
  document.getElementById('district-link').href = `https://elect.in.th/candidates/z/${feature.properties.province}-${feature.properties.zone_num}.html`;

  const selectedCandidate = partyFeatureList.filter(f => `${f.province_name}-${f.zone_number}` === hilightId)[0];
  if (selectedCandidate) {
    document.getElementById('district-candidate').innerHTML = `${selectedCandidate.Title} ${selectedCandidate.FirstName} ${selectedCandidate.LastName}`;
  } else {
    document.getElementById('district-candidate').innerHTML = 'ไม่มีผู้สมัครลงในเขตเลือกตั้งนี้';
  }
}

// List of all parties and its color
let partyList = [];

// Keep tracks of all features on vector tile
const featureList = {};
// List of district feature ID of currently selected party
let partyFeatureList = [];

// Currently selected party name
let selectedPartyName;
// Currently selected district feature ID
let hilight;

const showparty = {
  'color': '#781f2e',
  'weight': 2,
  'opacity': 1
};

function hilightLayer(layerID) {
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

const DEFAULT_STYLE = {
  weight: 1,
  fill: true,
  fillOpacity: 0.0,
  color: '#999999',
  // color: '#ffffff',
  opacity: 0.4,
};

const ACTIVE_DEFAULT_STYLE = {
  weight: 1,
  fill: false,
  fillOpacity: 0.0,
  color: '#ffffff',
  opacity: 0.9,
};

const PARTY_STYLE = {
  weight: 0.5,
  color: 'blue',
  opacity: 1,
  fill: true,
  fillColor: 'blue',
  fillOpacity: 0.5,
  radius: 6
};

const HILIGHT_STYLE = {
  weight: 1,
  color: '#F0324B',
  opacity: 1,
  fill: true,
  fillColor: '#F0324B',
  fillOpacity: 0.5,
  radius: 6
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
    return DEFAULT_STYLE;
  }
};

function createMap() {
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v9',
    center: mapFullPageCenter,
    maxZoom: 16,
    // maxBounds: maxBounds
  });

  map.on('load', function() {
    // source data
    map.addSource('thaielection2562', {
      type: 'vector',
      tiles: [
        `${location.origin}/build/vt/thaielection2562/{z}/{x}/{y}.pbf`,
      ],
      maxzoom: 14
    });
    // interactive layer
    map.addLayer({
      id: 'election-district-ui',
      type: 'fill',
      'source': 'thaielection2562',
      'source-layer': 'thaielection2562',
      paint: {
        'fill-opacity': 0
        // visibility: 'visible'
      }
    });
    // boundary
    map.addLayer({
      id: 'election-district',
      type: 'line',
      'source': 'thaielection2562',
      'source-layer': 'thaielection2562',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-width': 1,
        'line-color': '#ff69b4',
        'line-width': 1
      }
    });
    // party
    map.addLayer({
      id: 'election-district-party',
      type: 'fill',
      'source': 'thaielection2562',
      'source-layer': 'thaielection2562',
      paint: {
        'fill-outline-color': '#484896',
        'fill-color': '#6e599f',
        'fill-opacity': 0.7
      },
      filter: ['==', 'fid', '']
    });
    // hilight
    map.addLayer({
      id: 'election-district-hilight',
      type: 'fill',
      'source': 'thaielection2562',
      'source-layer': 'thaielection2562',
      paint: {
        'fill-outline-color': '#484896',
        'fill-color': '#6e599f',
        'fill-opacity': 0.7
      },
      filter: ['==', 'fid', '']
    });

    // // province
    // map.addLayer({
    //   id: 'thailand-province',
    //   type: 'line',
    //   source: {
    //     type: 'vector',
    //     tiles: [
    //       `${location.origin}/build/vt/thailand_province/{z}/{x}/{y}.pbf`,
    //     ],
    //     maxzoom: 14
    //   },
    //   'source-layer': 'thailand_province',
    //   layout: {
    //     'line-join': 'round',
    //     'line-cap': 'round'
    //   },
    //   paint: {
    //     'line-color': '#69b4ff',
    //     'line-width': 2
    //   }
    // });
  });

  // config map
  map.fitBounds(defaultBounds);
  map.on('zoomend', function () {
    console.log('map zoom: ' + map.getZoom());
  });

  map.on('click', function(e) {
    const point = [e.point.x, e.point.y];
    const features = map.queryRenderedFeatures(point, { layers: ['election-district-ui'] });

    // Run through the selected features and set a filter
    // to match features with matching Feature ID
    // the `election-district-hilight` layer.
    if (features && features.length > 0) {
      const fid = features[0].properties.fid;
      map.setFilter('election-district-hilight', ['==', 'fid', fid]);
      selectDistrict(features[0]);
    } else {
      // deselect
      map.setFilter('election-district-hilight', ['==', 'fid', '']);
      selectDistrict(false);
    }
  })

  // UI interactions
  const select = document.getElementById("party-select");
  select.onchange = async function () {
    // First time user select a party
    if (!selectedPartyName) {
      document.getElementById('app').classList.add('show-party');

      if (isMobile()) {
        zoomFullPage();
      } else {
        const currentZoom = map.getZoom();
        if (currentZoom < 8) {
          zoomHalfPage();
        }
      }
    }

    selectedPartyName = select.value;

    partyFeatureList = await hilightByParty(selectedPartyName);
    document.getElementById('party-summary').innerHTML = `รวม ${partyFeatureList.length} เขต`;

    selectDistrict(hilight);
  };

  return map;
}


function setupShare() {
  function createPopup(url, width, height) {
    var newwindow = window.open(url, "", "width=" + width + ",height=" + height + ",scrollbars=true");
    if (window.focus) {
      newwindow.focus()
    }
    return false;
  }

  let share_buttons;
  share_buttons = document.getElementsByClassName("share-facebook");
  for (let i = 0; i < share_buttons.length; i++) {
    let button = share_buttons[i];
    button.onclick = function () {
      let share_url = document.URL;

      FB.ui({
        method: 'feed',
        display: 'popup',
        link: share_url,
      }, function (response) {
      });
    }
  }

  share_buttons = document.getElementsByClassName("share-twitter");
  for (let i = 0; i < share_buttons.length; i++) {
    let button = share_buttons[i];
    button.onclick = function () {
      var share_url = document.URL;
      var text = document.querySelector("meta[property='og:title']").getAttribute("content");
      var retext = encodeURIComponent(text);
      createPopup("https://twitter.com/share?text=" + retext + "&url=" + share_url, 550, 420);
    }
  }

  share_buttons = document.getElementsByClassName("share-line");
  for (let i = 0; i < share_buttons.length; i++) {
    let button = share_buttons[i];
    button.onclick = function () {
      var share_url = document.URL;
      createPopup("https://social-plugins.line.me/lineit/share?url=" + share_url, 550, 600);
    }
  }
}

async function setupParty() {
  const select = document.getElementById('party-select');
  let options = [
    '<option disabled selected>เลือกพรรค</option>'
  ];
  const partyResult = await fetchAsync(`./data/party.json`);
  partyList = partyResult.data || [];
  partyList.forEach(p => {
    options.push(`<option class="op" value="${p.name}">${p.name}</option>`);
  });
  select.innerHTML = options.join('\n');
}

createMap();

setupShare();

setupParty();
