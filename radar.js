//radar.js script file starts here


// Update status bar
function updateStatusBar(message) {
    document.getElementById('statusBar').innerText = message;
}

//defining constructors
const radarScope = document.getElementById('radarScope');
const rangeRingsContainer = document.getElementById('rangeRingsContainer');
const zoomSlider = document.getElementById('zoomSlider');
const zoomInButton = document.getElementById('zoomIn');
const zoomOutButton = document.getElementById('zoomOut');
const homeButton = document.getElementById('home');
const runwaySelector = document.getElementById('runwaySelector');
const changeRunwayButton = document.getElementById('changeRunway');
const SRAdistanceMarkersButton = document.getElementById('SRAdistanceMarkers');
const directionLine = document.getElementById('directionLine');
const panContainer = document.getElementById('panContainer');


let zoomLevel = parseFloat(zoomSlider.value);
let panX = 0;
let panY = 0;
let startX, startY, isDragging = false;
let isDirectionReversed = false; // Tracks if the direction is reversed
let areMarkersVisible = false; // Tracks the visibility of the distance markers

// Define global variable for runway designation
let runwayDesignation = '';

// Store initial values
const initialZoomLevel = 6;
const initialPanX = 0;
const initialPanY = 0;
let distanceBetweenRings = 10; // nautical miles
const numRings = 20;


function createRangeRings() {
    rangeRingsContainer.innerHTML = '';
    const initialRadius = 10; // nautical miles for the innermost ring

    for (let i = 0; i < numRings; i++) {
        const ring = document.createElement('div');
        ring.className = 'ring';
        const ringRadius = (initialRadius + (distanceBetweenRings * i)) * zoomLevel; // Adjust radius based on zoom level
        const ringDiameter = ringRadius * 2; // Diameter of the ring
        ring.style.width = `${ringDiameter}px`;
        ring.style.height = `${ringDiameter}px`;
        ring.style.top = `${(radarScope.offsetHeight / 2) - ringRadius}px`;
        ring.style.left = `${(radarScope.offsetWidth / 2) - ringRadius}px`;
        rangeRingsContainer.appendChild(ring);
    }

    // Create and position the runway and direction line
    drawRunway();
}



function drawRunway() {

    const runway = document.getElementById('runway');
    const initialRadius = 10; // nautical miles for the innermost ring
    const radiusOfInnermostRing = initialRadius * zoomLevel;
    const runwayLength = radiusOfInnermostRing * 0.15; // 15% of the radius

    runway.style.width = `${runwayLength}px`;
    runway.style.height = `4px`; // Thickness of the runway

    // Set position to center of radar scope
    runway.style.position = 'absolute';
    runway.style.left = `${(radarScope.offsetWidth / 2) - (runwayLength / 2)}px`;
    runway.style.top = `${(radarScope.offsetHeight / 2) - 2}px`; // Adjust for thickness

    // Calculate rotation angle based on dropdown selection
    let selectedValue = parseInt(runwaySelector.value.substring(0, 2)); // Get the runway value as a number
    let angle = (selectedValue * 10) - 90; // Adjusting for correct alignment

    if (isDirectionReversed) {
        // Reverse the direction by 180 degrees
        angle = (angle + 180) % 360;
        selectedValue = (selectedValue + 18) % 36;
        if (selectedValue === 0) {
            selectedValue = 36; // Special case for runway 18 reversed to runway 36
        }
    }

    // Log the updated runway
    const oppositeRunway = (selectedValue + 18) % 36 || 36;
    runwayDesignation = oppositeRunway.toString().padStart(2, '0');
    //console.log(`Runway selected: Runway ${runwayDesignation}`);
    updateStatusBar('Runway: ' + runwayDesignation);

    // Update the button text with the current runway designation
    changeRunwayButton.textContent = `Runway ${runwayDesignation}`;


    runway.style.transform = `rotate(${angle}deg)`;
    runway.style.transformOrigin = 'center center';

    // Calculate the end position of the runway
    const runwayEndX = (radarScope.offsetWidth / 2) + (runwayLength / 2) * Math.cos(angle * Math.PI / 180);
    const runwayEndY = (radarScope.offsetHeight / 2) + (runwayLength / 2) * Math.sin(angle * Math.PI / 180);

    // Set the white direction line properties
    const directionLineLength = radiusOfInnermostRing * 2.5; // 250% of the radius
    directionLine.style.width = `${directionLineLength}px`;
    directionLine.style.height = `1px`; // Thickness of the white line

    // Position the white direction line
    directionLine.style.position = 'absolute';
    directionLine.style.left = `${runwayEndX}px`;
    directionLine.style.top = `${runwayEndY - 1}px`; // Adjust for thickness
    directionLine.style.transform = `rotate(${angle}deg)`;
    directionLine.style.transformOrigin = '0 50%'; // Start from the end of the runway

    // Append the direction line to the panContainer
    panContainer.appendChild(directionLine);

    // Create and position permanent markers
    createPermanentMarkers(runwayEndX, runwayEndY, angle);

    // Create distance markers
    createDistanceMarkers(runwayEndX, runwayEndY, angle);
}



function createPermanentMarkers(startX, startY, angle) {
    const initialRadius = 10; // nautical miles for the innermost ring
    const radiusOfInnermostRing = initialRadius * zoomLevel;
    const markerDistance = radiusOfInnermostRing * 0.50; // 50% of the radius
    const numMarkers = 5;

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.permanent-marker');
    existingMarkers.forEach(marker => marker.remove());

    for (let i = 0; i < numMarkers; i++) {
        const marker = document.createElement('div');
        marker.className = 'permanent-marker';

        marker.style.height = '10px'; // Height of the permanent markers
        marker.style.width = '1px';  // Width of the permanent markers


        // Calculate marker position
        const markerPosition = markerDistance * (i + 1); // Increment by 50% of radius
        const x = startX + (markerPosition * Math.cos(angle * Math.PI / 180));
        const y = startY + (markerPosition * Math.sin(angle * Math.PI / 180));

        // Center align by adjusting left and top positions
        const markerOffsetX = (parseFloat(marker.style.width) / 2);
        const markerOffsetY = (parseFloat(marker.style.height) / 2);

        marker.style.left = `${x - markerOffsetX}px`;
        marker.style.top = `${y - markerOffsetY}px`;


        // Rotate to be perpendicular to the direction line
        marker.style.transform = `rotate(${angle}deg)`;

        panContainer.appendChild(marker);
    }
}


function createDistanceMarkers(startX, startY, angle) {
    const initialRadius = 10; // nautical miles for the innermost ring
    const radiusOfInnermostRing = initialRadius * zoomLevel;
    const markerDistance = radiusOfInnermostRing * 0.10; // 10% of the radius
    const numMarkers = 15;

    // Remove existing markers and labels
    const existingMarkers = document.querySelectorAll('.distance-marker, .distance-label');
    existingMarkers.forEach(marker => marker.remove());

    for (let i = 0; i < numMarkers; i++) {
        // Create the marker
        const marker = document.createElement('div');
        marker.className = 'distance-marker';

        if (i === 4 || i === 9 || i === 14) { // 0-based index for 5th, 10th, and 15th markers
            marker.style.height = '12px'; // Double the height for these specific markers
            marker.style.width = '2px';  // Increase the width to 2px for these specific markers
        } else {
            marker.style.height = '6px'; // Normal height for other markers
            marker.style.width = '1px';  // Normal width for other markers
        }

        // Calculate marker position
        const markerPosition = markerDistance * (i + 1); // Increment by 10% of radius
        const x = startX + (markerPosition * Math.cos(angle * Math.PI / 180));
        const y = startY + (markerPosition * Math.sin(angle * Math.PI / 180));

        // Center align by adjusting left and top positions
        const markerOffsetX = (parseFloat(marker.style.width) / 2);
        const markerOffsetY = (parseFloat(marker.style.height) / 2);

        marker.style.left = `${x - markerOffsetX}px`;
        marker.style.top = `${y - markerOffsetY}px`;

        // Rotate to be perpendicular to the direction line
        marker.style.transform = `rotate(${angle}deg)`;

        // Set visibility based on the current toggle state
        marker.style.display = areMarkersVisible ? 'block' : 'none';

        panContainer.appendChild(marker);

        // Create the label
        const label = document.createElement('div');
        label.className = 'distance-label';
        label.textContent = `${i + 1}`; // Numbering starts from 1

        // Offset the label slightly to avoid overlapping with the marker
        const labelOffset = 20; // Adjust this value as needed
        const labelX = x + labelOffset * Math.cos((angle - 90) * Math.PI / 180);
        const labelY = y + labelOffset * Math.sin((angle - 90) * Math.PI / 180);

        label.style.left = `${labelX}px`;
        label.style.top = `${labelY}px`;

        // Ensure the label is displayed consistently with the markers
        label.style.display = areMarkersVisible ? 'block' : 'none';

        panContainer.appendChild(label);
    }
}



function updateTransform() {
    panContainer.style.transform = `translate(${panX}px, ${panY}px) `;
}

function resetToInitial() {
    zoomLevel = initialZoomLevel;
    panX = initialPanX;
    panY = initialPanY;
    isDirectionReversed = false; // Reset the direction toggle
    zoomSlider.value = zoomLevel;
    createRangeRings();
    updateTransform();
    updateStatusBar('Reset to Center of Screen');
}

// Toggle the direction of the line
changeRunwayButton.addEventListener('click', () => {
    isDirectionReversed = !isDirectionReversed; // Toggle the direction
    drawRunway();
    //updateStatusBar('Runway changed to Runway: ' + runwayDesignation);
});

// Set the initial state of the button (optional)
document.getElementById('SRAdistanceMarkers').classList.add(areMarkersVisible ? 'active' : 'inactive');

// Toggle the visibility of distance markers and their labels
SRAdistanceMarkersButton.addEventListener('click', () => {
    areMarkersVisible = !areMarkersVisible;

    // Update the button's appearance based on the state
    const SRAdistanceMarkersButton = document.getElementById('SRAdistanceMarkers');
    if (areMarkersVisible) {
        SRAdistanceMarkersButton.classList.add('active');
        SRAdistanceMarkersButton.classList.remove('inactive');
        updateStatusBar('SRA Distance Markers On');
    } else {
        SRAdistanceMarkersButton.classList.add('inactive');
        SRAdistanceMarkersButton.classList.remove('active');
        updateStatusBar('SRA Distance Markers Off');
    }

    const markers = document.querySelectorAll('.distance-marker');
    const labels = document.querySelectorAll('.distance-label'); // Add this line to select labels
    markers.forEach(marker => {
        marker.style.display = areMarkersVisible ? 'block' : 'none';
    });
    labels.forEach(label => {  // Add this block to handle label visibility
        label.style.display = areMarkersVisible ? 'block' : 'none';
    });
});



// Set initial zoom level and create range rings
zoomSlider.value = initialZoomLevel; // Default zoom value
zoomLevel = initialZoomLevel;
createRangeRings();
updateTransform();


// Zoom functionality
zoomSlider.addEventListener('input', () => {
    zoomLevel = parseFloat(zoomSlider.value);
    createRangeRings();
    drawRunway();
    aircraftBlips.forEach(blip => blip.updateBlipPosition()); // Update blip positions after zooming

    if (areMarkersVisible) {
        const markers = document.querySelectorAll('.distance-marker');
        const labels = document.querySelectorAll('.distance-label'); 
        markers.forEach(marker => marker.style.display = 'block');
        labels.forEach(label => label.style.display = 'block');
    }
});

zoomInButton.addEventListener('click', () => {
    zoomLevel = Math.min(zoomLevel + 1, 80);
    zoomSlider.value = zoomLevel;
    createRangeRings();
    drawRunway();
    aircraftBlips.forEach(blip => blip.updateBlipPosition()); // Update blip positions after zooming

    if (areMarkersVisible) {
        const markers = document.querySelectorAll('.distance-marker');
        const labels = document.querySelectorAll('.distance-label'); 
        markers.forEach(marker => marker.style.display = 'block');
        labels.forEach(label => label.style.display = 'block');
    }
});

zoomOutButton.addEventListener('click', () => {
    zoomLevel = Math.max(zoomLevel - 1, 1);
    zoomSlider.value = zoomLevel;
    createRangeRings();
    drawRunway();
    aircraftBlips.forEach(blip => blip.updateBlipPosition()); // Update blip positions after zooming

    if (areMarkersVisible) {
        const markers = document.querySelectorAll('.distance-marker');
        const labels = document.querySelectorAll('.distance-label'); 
        markers.forEach(marker => marker.style.display = 'block');
        labels.forEach(label => label.style.display = 'block');
    }
});



homeButton.addEventListener('click', resetToInitial);

// Update runway direction based on dropdown selection
runwaySelector.addEventListener('change', drawRunway);

// Mouse drag to pan
radarScope.addEventListener('mousedown', (event) => {
    isDragging = true;
    startX = event.clientX - panX;
    startY = event.clientY - panY;
});

document.addEventListener('mousemove', (event) => {
    if (isDragging) {
        panX = event.clientX - startX;
        panY = event.clientY - startY;
        updateTransform();
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});


function smoothZoom(targetZoomLevel) {
    const step = (targetZoomLevel - zoomLevel) / 10; // Adjust for smoothness

    function animateZoom() {
        zoomLevel += step;
        //updateZoomLevel(zoomLevel);
        //updateBlipPosition(); // Update the blip's position
        createRangeRings(); // Recreate elements based on new zoom
        drawRunway(); // Recalculate and redraw the runway

        if (Math.abs(targetZoomLevel - zoomLevel) > Math.abs(step)) {
            requestAnimationFrame(animateZoom);
        }
    }

    animateZoom();
}


// Calculate distance and bearing of the mouse pointer from center of the radar scope
function getDistanceAndBearing(x, y) {
    // Center of the radar scope (before panning)
    const centerX = radarScope.offsetWidth / 2;
    const centerY = radarScope.offsetHeight / 2;

    // Convert to radar scope coordinates (account for panning)
    const deltaX = x - (centerX + panX);
    const deltaY = y - (centerY + panY);

    // Calculate the distance in pixels
    const distancePixels = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Calculate the distance in nautical miles (adjust for zoom level)
    const distanceNM = distancePixels / (zoomLevel * 1.0); // 1.0 is a placeholder for the conversion factor

    // Calculate the bearing in degrees (adjusted for the offset)
    let bearing = Math.atan2(deltaX, deltaY) * 180 / Math.PI; // Convert radians to degrees
    bearing = Math.abs((bearing - 180) % 360); // Normalize to 0-360 degrees

    // Format bearing to always be three digits
    const formattedBearing = bearing.toFixed(0).padStart(3, '0');

    return {
        distanceNM: distanceNM.toFixed(1), // Round to 1 decimal place
        bearing: formattedBearing // Ensure bearing is always 3 digits
    };
}




let displayElement = null;

// Function to create the display element if it doesn't exist
function createDisplayElement() {
    if (!displayElement) {
        displayElement = document.createElement('div');
        displayElement.style.position = 'fixed'; // Fixed position to stay at the top left corner
        displayElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        displayElement.style.color = 'white';
        displayElement.style.padding = '5px';
        displayElement.style.borderRadius = '3px';
        displayElement.style.fontSize = '12px';
        displayElement.style.zIndex = '1000'; // Ensure it's above other elements
        document.body.appendChild(displayElement);
    }
}

// Function to update the display element with distance and bearing
function updateDisplay(x, y) {
    createDisplayElement(); // Ensure the display element is created

    const rect = radarScope.getBoundingClientRect();
    const result = getDistanceAndBearing(x - rect.left, y - rect.top);

    displayElement.style.left = '10px'; // Position at top left corner
    displayElement.style.top = '10px';
    displayElement.textContent = `${result.bearing}° / ${result.distanceNM} NM`;
}

// Event listener for mouse move to update the display
radarScope.addEventListener('mousemove', (event) => {
    const rect = radarScope.getBoundingClientRect();
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    updateDisplay(mouseX, mouseY);
});

// Initialize the display element on page load
createDisplayElement();



//******************Functions related to radar scope******************//
// Update the radar center on pan or zoom
function updateRadarCenter() {
    radarCenter.x = radarScope.offsetWidth / 2;
    radarCenter.y = radarScope.offsetHeight / 2;
}

// Handle radar panning
function panRadar(dx, dy) {
    // Code to pan the radar
    panContainer.style.transform = `translate(${dx}px, ${dy}px)`;
    updateRadarCenter(); // Update center after panning
}

// Function to pause or resume the exercise
function togglePause() {
    const pauseButton = document.getElementById('pauseButton');
    const rangeRingsContainer = document.querySelector('.range-rings');
    isPaused = !isPaused;

    if (isPaused) {
        pauseButton.textContent = 'Resume';
        updateStatusBar('Exercise paused.');
        disableControlPanel();

        rangeRingsContainer.style.animationPlayState = 'paused'; // Stop radar rings rotation
    } else {
        pauseButton.textContent = 'Pause';
        updateStatusBar('Exercise resumed.');
        enableControlPanel();

        rangeRingsContainer.style.animationPlayState = 'running'; // Resume radar rings rotation

        moveAircraftBlips(); // Resume aircraft movements
    }
}

// Function to disable the control panel inputs while paused
function disableControlPanel() {
    const controlPanel = document.getElementById('controlPanel');
    controlPanel.classList.add('disabled-panel');  // Disable interactions
}

// Function to enable the control panel inputs while resumed
function enableControlPanel() {
    const controlPanel = document.getElementById('controlPanel');
    controlPanel.classList.remove('disabled-panel');  // Enable interactions
}


// Calculate mouse position based on radar's original center and panned position
function calculatePosition(clientX, clientY) {
    const rect = radarScope.getBoundingClientRect();

    // Get current pan offsets (dx, dy) from the panContainer
    const panMatrix = new WebKitCSSMatrix(window.getComputedStyle(panContainer).transform);
    const panX = panMatrix.m41;
    const panY = panMatrix.m42;

    // Calculate relative positions considering the panning
    const relativeX = (clientX - rect.left - radarCenter.x - panX) / zoomLevel;
    const relativeY = (radarCenter.y - (clientY - rect.top - panY)) / zoomLevel;

    return { x: relativeX, y: relativeY };
}


//radar.js script file ends here


