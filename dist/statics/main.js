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

// Require for Mapbox GL JS
// mapboxgl.accessToken = 'your mapbox access token';

// Map object
let map;

function isMobile() {
  const width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
  return width < 764;
}

function isTouchDevice() {
  return 'ontouchstart' in window        // works on most browsers
    || navigator.maxTouchPoints;       // works on IE10/11 and Surface
};

function loadQueryString() {
  const search = location.search.substring(1);
  if (!search) return {};
  return JSON.parse('{"' + decodeURIComponent(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
}

function createQueryString(obj) {
  const pairs = Object.keys(obj).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`);
  pairs.sort((a, b) => a.indexOf('party=') === 0 ? -1 : 0);
  return pairs.join('&');
}

function setHistoryState(params = {}) {
  // set page state
  if (history) {
    const state = Object.assign(loadQueryString(), params);
    history.pushState (state, selectedPartyName, '?' + createQueryString(state));
  }
}

function loadShareURL(partyName) {
  if (partyName) {
    return `${hostname}/p/${partyName}.html${location.search}`;
  }
  return document.URL;
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
  if (candidates && candidates.length > 0) {
    map.setPaintProperty('election-district-party', 'fill-color', partyInfo.color);
    map.setPaintProperty('election-district-party', 'fill-outline-color', lightenDarkenColor(partyInfo.color, -20));
    // map.setPaintProperty('election-district', 'line-color', lightenDarkenColor(partyInfo.color, -20));
    const filter = ['in', 'fid'].concat(candidates.map(c => `${c.province_name}-${c.zone_number}`));
    map.setFilter('election-district-party', filter);
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

  map.setPaintProperty('election-district-hilight', 'fill-color', partyInfo && partyInfo.hilightColor || HILIGHT_STYLE.fillColor);
  // map.setPaintProperty('election-district-hilight', 'fill-color', HILIGHT_STYLE.fillColor);
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

  const otherParties = zone2Parties[feature.properties.fid].filter( p => p != partyInfo.name)
  const countOtherParties = otherParties.length

  document.getElementById('district-other-parties-list').innerHTML = otherParties.map(a => {
    const code = `selectPartyChoice.setChoiceByValue(['${a}']);`
    console.log
    return `<a class="logo" href="javascript: ${code}" title="${a}"><img src="${hostname}/statics/party-logos/${a}.png"/></a>`
  }).join('');

  document.getElementById('count-other-parties').innerHTML = countOtherParties;
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

const selectParty = document.getElementById('party-select');
let selectPartyChoice;


let zone2Parties;

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
    // source data: thaielection2562
    map.addSource('thaielection2562', {
      type: 'vector',
      tiles: [
        `${map_hostname}/build/vt/thaielection2562/{z}/{x}/{y}.pbf`
      ],
      maxzoom: 14
    });
    // source data: province
    map.addSource('province', {
      type: 'vector',
      tiles: [
        `${map_hostname}/build/vt/province/{z}/{x}/{y}.pbf`
      ],
      maxzoom: 14
    });
    // interactive layer
    map.addLayer({
      id: 'election-district-ui',
      type: 'fill',
      source: 'thaielection2562',
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
      source: 'thaielection2562',
      'source-layer': 'thaielection2562',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#76e0c4',
        // 'line-color': '#ff69b4',
        'line-opacity': 0.4,
        'line-width': [
          'interpolate',
          ['exponential', 0.5],
          ['zoom'],
          1, 0.3,
          5, 0.5,
          10, 2,
          22, 4
        ]
      }
    });
    // party
    map.addLayer({
      id: 'election-district-party',
      type: 'fill',
      source: 'thaielection2562',
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
      source: 'thaielection2562',
      'source-layer': 'thaielection2562',
      paint: {
        'fill-outline-color': '#484896',
        'fill-color': '#6e599f',
        'fill-opacity': 0.7
      },
      filter: ['==', 'fid', '']
    });

    // province
    map.addLayer({
      id: 'thailand-province',
      type: 'line',
      source: 'province',
      'source-layer': 'Province',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#5fb49d',
        // 'line-color': '#76e0c4',
        // 'line-color': '#ff69b4',
        'line-width': [
          'interpolate',
          ['exponential', 0.5],
          ['zoom'],
          1, 0.6,
          5, 1,
          10, 5,
          22, 20
        ],
        'line-opacity': [
          'interpolate',
          ['exponential', 0.5],
          ['zoom'],
          1, 0.8,
          5, 0.6,
          10, 0.4,
          22, 0.3
        ]
      }
    });

    resumeState();
  });

  // config map
  const qs = loadQueryString();
  if (qs.c || qs.z) {
    const center = qs.c && qs.c.split(',');
    const viewOptions = {};
    if (center) viewOptions.center = center;
    if (qs.z) viewOptions.zoom = qs.z;
    map.jumpTo(viewOptions);
  } else {
    map.fitBounds(defaultBounds);
  }

  // Add zoom and rotation controls to the map.
  map.addControl(new mapboxgl.NavigationControl());

  // disable map rotation using touch rotation gesture
  map.touchZoomRotate.disableRotation();

  map.on('zoomend', function () {
    setHistoryState({
      c: map.getCenter().toArray().map(num => +num.toFixed(6)),
      z: map.getZoom()
    });
  });

  map.on('moveend', function (e) {
    setHistoryState({
      c: map.getCenter().toArray().map(num => +num.toFixed(6)),
      z: map.getZoom()
    });
  });

  function tapEvent(e) {
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
  }

  // handle click or touch device
  if (isTouchDevice()) {
    map.on('touchend', function(e) {
      tapEvent(e);
    });
  } else {
    map.on('click', function(e) {
      tapEvent(e);
    });
  }

  // Create a popup, but don't add it to the map yet.
  const popup = new mapboxgl.Popup({
    offset: 20,
    closeButton: false,
    closeOnClick: false
  });

  map.on('mousemove', 'election-district-ui', function(e) {
    // Change the cursor style as a UI indicator.
    map.getCanvas().style.cursor = 'pointer';

    const coordinates = e.lngLat;
    // const coordinates = e.features[0]._geometry.coordinates.slice();
    const district = e.features[0].properties;
    const description = `<h4>${district.province}</h4>`
      + `<div class="name">เขตเลือกตั้งที่ ${district.zone_num}</div>`
      + `<div class="detail">พื้นที่ ${district.detail}</div>`;
    // Populate the popup and set its coordinates
    // based on the feature found.
    popup.setLngLat(coordinates)
      .setHTML(description)
      .addTo(map);
  });

  map.on('mouseleave', 'election-district-ui', function() {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });

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
      let share_url = loadShareURL(selectedPartyName);

      FB.ui({
        method: 'feed',
        display: 'popup',
        link: share_url,
      }, function (response) {
        // track event
        gtag('event', 'share', {
          event_category: 'engagement',
          event_label: selectedPartyName,
          value: 1
        });
        fbq('track', 'Share', {
          content_name: selectedPartyName,
          content_type: 'party',
          value: 1
        });
      });
    }
  }

  share_buttons = document.getElementsByClassName("share-twitter");
  for (let i = 0; i < share_buttons.length; i++) {
    let button = share_buttons[i];
    button.onclick = function () {
      var share_url = loadShareURL(selectedPartyName);
      var text = document.querySelector("meta[property='og:title']").getAttribute("content");
      var retext = encodeURIComponent(text);
      createPopup("https://twitter.com/share?text=" + retext + "&url=" + share_url, 550, 420);

      // track event
      gtag('event', 'share', {
        event_category: 'engagement',
        event_label: selectedPartyName,
        value: 1
      });
      fbq('track', 'Share', {
        content_name: selectedPartyName,
        content_type: 'party',
        value: 1
      });
    }
  }

  share_buttons = document.getElementsByClassName("share-line");
  for (let i = 0; i < share_buttons.length; i++) {
    let button = share_buttons[i];
    button.onclick = function () {
      var share_url = loadShareURL(selectedPartyName);
      createPopup("https://social-plugins.line.me/lineit/share?url=" + share_url, 550, 600);

      // track event
      gtag('event', 'share', {
        event_category: 'engagement',
        event_label: selectedPartyName,
        value: 1
      });
      fbq('track', 'Share', {
        content_name: selectedPartyName,
        content_type: 'party',
        value: 1
      });
    }
  }
}

async function setupParty() {
  let options = [
    '<option disabled selected value="">เลือกพรรค</option>'
  ];
  const partyResult = await fetchAsync(`./data/party.json`);
  partyList = partyResult || [];
  partyList.forEach(p => {
    options.push(`<option class="op" value="${p.name}">${p.name} (${p.count} เขต)</option>`);
  });
  selectParty.innerHTML = options.join('\n');

  zone2Parties = await fetchAsync(`./data/zone-to-parties.json`);

  // setup searchable dropdown
  selectPartyChoice = new Choices(selectParty, {
    searchResultLimit: 500,
    itemSelectText: '',
    noChoicesText: 'ไม่พบตัวเลือก',
    noResultsText: 'ไม่พบข้อมูล',
    sortFn: function(a, b) {
      // sort by Thai dictionary order
      return a.value.localeCompare(b.value, 'th', {sensitivity: 'base'});
    },
    callbackOnCreateTemplates: function(strToEl) {
      var classNames = this.config.classNames;
      var itemSelectText = this.config.itemSelectText;
      return {
        item: function(classNames, data) {
          return strToEl('\
            <div\
              class="'+ String(classNames.item) + ' ' + String(data.highlighted ? classNames.highlightedState : classNames.itemSelectable) + '"\
              data-item\
              data-id="'+ String(data.id) + '"\
              data-value="'+ String(data.value) + '"\
              '+ String(data.active ? 'aria-selected="true"' : '') + '\
              '+ String(data.disabled ? 'aria-disabled="true"' : '') + '\
              >' + (data.value ? '<img src="' + hostname + '/statics/party-logos/' + data.value + '.png" style="margin-right:10px;" />' : '') + '\
              ' + String(data.value || 'เลือกพรรค') + '\
            </div>\
          ');
        },
        choice: function(classNames, data) {
          return strToEl('\
            <div\
              class="'+ String(classNames.item) + ' ' + String(classNames.itemChoice) + ' ' + String(data.disabled ? classNames.itemDisabled : classNames.itemSelectable) + '"\
              data-select-text="'+ String(itemSelectText) + '"\
              data-choice \
              '+ String(data.disabled ? 'data-choice-disabled aria-disabled="true"' : 'data-choice-selectable') + '\
              data-id="'+ String(data.id) + '"\
              data-value="'+ String(data.value) + '"\
              '+ String(data.groupId > 0 ? 'role="treeitem"' : 'role="option"') + '\
              >' + (data.value ? '<img src="' + hostname + '/statics/party-logos/' + data.value + '.png" style="margin-right:10px;" />' : '') + '\
              ' + String(data.label) + '\
            </div>\
          ');
        },
      };
    }
  });

  // UI interactions
  // selectParty.onchange = async function () {s
  selectParty.addEventListener('addItem', async function(e) {
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

    selectedPartyName = selectParty.value;

    partyFeatureList = await hilightByParty(selectedPartyName);
    document.getElementById('party-summary').innerHTML = `รวม ${partyFeatureList.length} เขต`;

    selectDistrict(hilight);

    setHistoryState({ party: selectedPartyName });

    // track event
    gtag('event', 'select_party', {
      event_category: 'engagement',
      event_label: selectedPartyName,
      value: 1
    });
    fbq('track', 'ViewContent', {
      content_name: selectedPartyName,
      content_type: 'party',
      value: 1
    });
  });
}

function resumeState() {
  const qs = loadQueryString();
  if (qs.party) {
    selectPartyChoice.setChoiceByValue([qs.party]);
  }
}

createMap();

setupShare();

setupParty();
