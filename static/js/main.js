let map = L.map('map').setView([20, 0], 2);

const baseLayers = {
    'osm': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
    'google': L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { subdomains: ['mt0','mt1','mt2','mt3'] }),
    'satellite': L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { subdomains: ['mt0','mt1','mt2','mt3'] }),
    'terrain': L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', { subdomains: ['mt0','mt1','mt2','mt3'] })
};

baseLayers['osm'].addTo(map);

document.getElementById('basemap-select').addEventListener('change', function(e) {
    let selected = e.target.value;
    map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });
    baseLayers[selected].addTo(map);
});

// Leaflet.draw
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

const drawControl = new L.Control.Draw({
    draw: {
        polygon: { allowIntersection: false, showArea: true },
        polyline: true,
        rectangle: { shapeOptions: { color: '#f00' }},
        circle: true,
        marker: true,
        circlemarker: false
    },
    edit: { featureGroup: drawnItems }
});
map.addControl(drawControl);

map.on('draw:created', function (e) {
    drawnItems.addLayer(e.layer);
});

// Tool switching

let activeTool = null;


document.querySelectorAll('.tool').forEach(item => {
    item.addEventListener('click', function () {
        const isActive = item.classList.contains('active');
        document.querySelectorAll('.tool').forEach(tool => tool.classList.remove('active'));
        if (!isActive) {
            item.classList.add('active');
            activeTool = item.getAttribute('data-tool');
        } else {
            activeTool = null;
        }
    });
});
    

map.on('click', function (e) {
    const emojiMap = {
        firespot: '🔥',
        firebreaker: '🔷',
        waterbucket: '💧'
    };

    if (emojiMap[activeTool]) {
        const emojiIcon = L.divIcon({
            className: 'emoji-icon',
            html: emojiMap[activeTool],
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        L.marker(e.latlng, { icon: emojiIcon }).addTo(map);
    }
});

// Full panel collapse
const leftPanel = document.getElementById('left-panel');
const toggleBtn = document.getElementById('toggle-left');
toggleBtn.addEventListener('click', () => {
    leftPanel.classList.toggle('collapsed');
});

// Layer toggling
const layers = {
    Layer1: L.geoJSON(null, { style: { color: 'red' } }).addTo(map),
    Layer2: L.geoJSON(null, { style: { color: 'blue' } }),
    Layer3: L.geoJSON(null, { style: { color: 'green' } })
};

document.querySelectorAll('.layer-check').forEach(input => {
    input.addEventListener('change', function () {
        const layerName = this.value;
        if (this.checked) {
            map.addLayer(layers[layerName]);
        } else {
            map.removeLayer(layers[layerName]);
        }
    });
});

// --- Dynamic Data Tab Update ---

let mapState = {
    fireSpots: [],
    fireBreakers: [],
    waterBuckets: [],
    drawnShapes: []
};

const toolTypeMap = {
    firespot: "fireSpots",
    firebreaker: "fireBreakers",
    waterbucket: "waterBuckets"
};

let mapToolItems = [];
let activeTool = null;

// Update the output JSON
function updateDataTab() {
    const output = document.getElementById('data-output');
    if (output) {
        output.textContent = JSON.stringify(mapState, null, 2);
    }
}

// Rescan map items (drawings + tool clicks)
function rescanMap() {
    mapState.fireSpots = [];
    mapState.fireBreakers = [];
    mapState.waterBuckets = [];
    mapState.drawnShapes = [];

    drawnItems.eachLayer(layer => {
        const geojson = layer.toGeoJSON();
        mapState.drawnShapes.push({
            type: geojson.geometry.type,
            geojson: geojson
        });
    });

    mapToolItems.forEach(item => {
        if (toolTypeMap[item.type]) {
            mapState[toolTypeMap[item.type]].push({ latlng: item.latlng });
        }
    });

    updateDataTab();
}

// Activate continuous tool
document.querySelectorAll('#tool-list .tool').forEach(tool => {
    tool.addEventListener('click', function () {
        activeTool = tool.dataset.tool;
    });
});

// Capture map clicks for active tool
map.on('click', function (e) {
    if (activeTool) {
        mapToolItems.push({ type: activeTool, latlng: e.latlng });
    }
});

// Hook Leaflet draw events
map.on('draw:created', function (e) {
    drawnItems.addLayer(e.layer);
});
map.on('draw:deleted', function () {});
map.on('draw:edited', function () {});

// Re-scan map every second
setInterval(rescanMap, 1000);
