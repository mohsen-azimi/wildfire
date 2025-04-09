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

let addedItems = [];

function updateDataTab() {
    const output = document.getElementById('data-output');
    if (output) {
        output.textContent = JSON.stringify(addedItems, null, 2);
    }
}

// Handle left-panel tools (record click, do not show any icons)
document.querySelectorAll('#tool-list .tool').forEach(tool => {
    tool.addEventListener('click', function () {
        const toolType = tool.dataset.tool;
        const handler = function (e) {
            const item = {
                type: toolType,
                latlng: e.latlng
            };
            addedItems.push(item);
            updateDataTab();
            map.off('click', handler); // ensure one-time use
        };
        map.on('click', handler);
    });
});

// Track drawn shapes
map.on('draw:created', function (e) {
    const layer = e.layer;
    const type = e.layerType;
    const geojson = layer.toGeoJSON();
    addedItems.push({
        type: type,
        geojson: geojson
    });
    drawnItems.addLayer(layer);  // show drawn shape
    updateDataTab();
});


// --- Export/Import Enhancements ---

function exportData() {
    const blob = new Blob([JSON.stringify(addedItems, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map_data.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                data.forEach(item => {
                    addedItems.push(item);
                    if (item.latlng) {
                        // Don't place any icons, just register
                        return;
                    }
                    if (item.geojson) {
                        const layer = L.geoJSON(item.geojson).getLayers()[0];
                        drawnItems.addLayer(layer);
                    }
                });
                updateDataTab();
            } else {
                alert("Invalid JSON format.");
            }
        } catch (err) {
            alert("Error reading file.");
        }
    };
    reader.readAsText(file);
}
