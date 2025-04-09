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
document.querySelectorAll('.tool').forEach(item => {
    item.addEventListener('click', function () {
        document.querySelectorAll('.tool').forEach(tool => tool.classList.remove('active'));
        item.classList.add('active');
    });
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



let fireSpotMode = false;

document.getElementById('add-firespot-btn').addEventListener('click', () => {
    fireSpotMode = !fireSpotMode;
    document.getElementById('add-firespot-btn').classList.toggle('active', fireSpotMode);
});

map.on('click', function(e) {
    if (fireSpotMode) {
        const fireIcon = L.divIcon({
            className: 'custom-fire-icon',
            html: '🔥',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        L.marker(e.latlng, { icon: fireIcon }).addTo(map);
    }
});
