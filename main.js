const bounds = [
  [20.464607, 97.343635], // Southwest coordinates
  [-73.910586, 105.636978]  // Northeast coordinates
];
const mapFullPageCenter = {
  lat: 13.640182,
  lng: 100.677968
};
const mapHalfPageCenter = {
  lat: 13.640182,
  lng: 105.220468
};
const map = L.map('map', {
  zoomDelta: 1,
  zoomSnap: 0
});

function isMobile() {
  const width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
  return width < 764;
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
 * Clear styles from all features
 */
const clearStyle = function () {
  // clear hilight from all features
  Object.keys(featureList).forEach(featureId => {
    customPbfLayer.resetFeatureStyle(featureId);
  });
};

/**
 * Hilight districts by party name
 * @param {String} partyName
 * @return {Array<String>} List of feature ID belongs to the party
 */
async function hilightByParty(partyName) {
  const data = await fetchAsync(`./data/parties/${partyName}.json`);
  let partyInfo = partyList.filter(p => p.name === partyName);
  if (partyInfo) partyInfo = partyInfo[0];
  const featureList = data.map(district => {
    // hilight by feature ID
    const featureId = `${district.province_name}-${district.zone_number}`;
    customPbfLayer.setFeatureStyle(featureId, {
      ...PARTY_STYLE,
      color: partyInfo.color || PARTY_STYLE.color,
      fillColor: partyInfo.color || PARTY_STYLE.fillColor
    });
    return featureId;
  });
  return featureList;
}

function zoomFullPage() {
  map.setView(mapFullPageCenter, 6);
}

function zoomHalfPage() {
  map.flyTo(mapHalfPageCenter, 6);
}

function selectDistrict(feature) {
  if (!feature) {
    document.getElementById('party-howto').innerHTML = 'เลือกเขตเพื่อดูข้อมูลผู้สมัคร';
    return;
  };

  let partyInfo = partyList.filter(p => p.name === selectedPartyName);
  if (partyInfo) partyInfo = partyInfo[0];

  hilight = feature;
  const hilightId = getFeatureId(feature);
  customPbfLayer.setFeatureStyle(hilightId, {
    ...HILIGHT_STYLE,
    color: partyInfo.hilightColor || HILIGHT_STYLE.color,
    fillColor: partyInfo.hilightColor || HILIGHT_STYLE.fillColor
  });

  document.getElementById('app').classList.add('show-district');
  document.getElementById('district-name').innerHTML = `${feature.properties.province} เขตเลือกตั้งที่${feature.properties.zone_num}`;
  document.getElementById('district-link').href = `https://elect.in.th/candidates/z/${feature.properties.province}-${feature.properties.zone_num}.html`;
  if (partyFeatureList.includes(hilightId)) {
    document.getElementById('district-candidate').innerHTML = `คุณ xxx yyy ${Math.random() * 1000 | 0}`;
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
// event.currentTarget

// add legend control layers - global variable with (null, null) allows indiv basemaps and overlays to be added inside functions below
// let controlLayers = L.control.layers( null, null, {
//   position: "topright",
//   collapsed: false // false = open by default
// }).addTo(map);


// // base tile layer
// const cartodbAttribution = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>';
// const positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
//   attribution: cartodbAttribution,
//   opacity: 1,
// }).addTo(map);

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

customPbfLayer.on('click', async function (e) {
  clearStyle();
  if (selectedPartyName) {
    await hilightByParty(selectedPartyName);
  }

  selectDistrict(e.layer);

  L.DomEvent.stop(e);
});
customPbfLayer.addTo(map);

// config map
map.options.minZoom = 6;
map.fitBounds(bounds)
map.setView(mapFullPageCenter, 6);
map.on('zoomend', function () {
  console.log('map zoom: ' + map.getZoom());
});
map.on('click', function (e) {
  console.log('map click:', e);
});

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
  clearStyle();
  partyFeatureList = await hilightByParty(selectedPartyName);
  document.getElementById('party-summary').innerHTML = `รวม ${partyFeatureList.length} เขต`;

  selectDistrict(hilight);
};


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
          }, function (response) {});
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
    '<option disabled selected>เลือกเพรรค</option>'
  ];
  const partyResult = await fetchAsync(`./data/party.json`);
  partyList = partyResult.data || [];
  partyList.forEach(p => {
    options.push(`<option class="op" value="${p.name}">${p.name}</option>`);
  });
  select.innerHTML = options.join('\n');
}

setupShare();

setupParty();
