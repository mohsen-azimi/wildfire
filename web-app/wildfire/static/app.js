let thermalData = [];
let currentColormap = 'Hot';
let currentScaling = 'Linear';
let originalMin = null;
let originalMax = null;

document.getElementById('upload-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const thermalFile = document.getElementById('thermal-file').files[0];
    const rgbFile = document.getElementById('rgb-file').files[0];

    if (!thermalFile || !rgbFile) {
        alert('Please upload both thermal and RGB files.');
        return;
    }

    const formData = new FormData();
    formData.append('thermal-file', thermalFile);
    formData.append('rgb-file', rgbFile);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(`Error: ${data.error}`);
            } else {
                document.getElementById('filename').textContent = data.filename;
                document.getElementById('min-temp').textContent = data.min_temp;
                document.getElementById('max-temp').textContent = data.max_temp;
                document.getElementById('avg-temp').textContent = data.avg_temp;
                document.getElementById('result-section').style.display = 'block';

                // Update images
                document.getElementById('thermal-image').src = data.thermal_image_path;
                document.getElementById('rgb-image').src = data.rgb_image_path;

                thermalData = data.thermal_data;
                renderHeatmap(thermalData, currentColormap, data.min_temp, data.max_temp);
                populateMetadata(data.metadata);

                enableImageZoom('thermal-image');
                enableImageZoom('rgb-image');
            }
        })
        .catch(err => console.error('Error uploading file:', err));
});

function enableImageZoom(imageId) {
    const img = document.getElementById(imageId);
    let scale = 1; // Initialize the zoom scale

    img.style.transformOrigin = 'center center'; // Set the transform origin

    img.addEventListener('wheel', function (e) {
        e.preventDefault();

        // Adjust the scale factor based on scroll direction
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        scale = Math.min(Math.max(scale * zoomFactor, 0.5), 5); // Clamp scale between 0.5 and 5

        // Apply the scale transformation
        img.style.transform = `scale(${scale})`;
    });
}



document.getElementById('colormap-selector').addEventListener('change', function (e) {
    currentColormap = e.target.value;
    renderHeatmap(thermalData, currentColormap, currentScaling, originalMin, originalMax);
});

function renderHeatmap(data, colormap, minTemp, maxTemp) {
    // Flip the data matrix
    const flippedData = data.slice().reverse();

    const heatmapData = [{
        z: flippedData,
        type: 'heatmap',
        colorscale: colormap, // Apply the selected colormap
        hoverinfo: 'z', // Display temperature on hover
        zmin: minTemp,
        zmax: maxTemp
    }];

    const layout = {
        title: 'Thermal Heatmap',
        xaxis: { title: 'X Axis' },
        yaxis: { title: 'Y Axis', scaleanchor: 'x' }, // No reversed autorange
        margin: { t: 40, r: 0, l: 40, b: 40 }
    };

    Plotly.newPlot('heatmap', heatmapData, layout);
}

function populateMetadata(metadata) {
    const metadataTableBody = document.getElementById('metadata-table-body');
    metadataTableBody.innerHTML = '';

    for (const [key, value] of Object.entries(metadata)) {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${key}</td><td>${value}</td>`;
        metadataTableBody.appendChild(row);
    }

    document.getElementById('metadata-section').style.display = 'block';
}
