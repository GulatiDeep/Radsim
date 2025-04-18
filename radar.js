//********radar.js script file starts here**********/




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

let currentHistoryDotCount = 20; // Default value (can be updated via settings)

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
    rangeRingsContainer.innerHTML = ''; // Clear old rings

    const rect = radarScope.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const initialRadius = 10; // Starting radius in NM

    for (let i = 0; i < numRings; i++) {
        const ring = document.createElement('div');
        ring.className = 'ring';

        const ringRadius = (initialRadius + distanceBetweenRings * i) * zoomLevel;
        const diameter = ringRadius * 2;

        ring.style.width = `${diameter}px`;
        ring.style.height = `${diameter}px`;
        ring.style.left = `${centerX - ringRadius}px`;
        ring.style.top = `${centerY - ringRadius}px`;

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
    updateStatusBar('→ Runway: ' + runwayDesignation);

    // Update the button text with the current runway designation
    changeRunwayButton.textContent = `RW ${runwayDesignation}`;


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

    updateRadarCenter(); // Ensure radar center is recalculated
    createRangeRings();
    updateTransform();

    aircraftBlips.forEach(blip => blip.updateBlipPosition()); // Correct blip positions

}


// Toggle the direction of the line
changeRunwayButton.addEventListener('click', () => {
    isDirectionReversed = !isDirectionReversed; // Toggle the direction
    drawRunway();

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
        updateStatusBar('→ SRA Distance Markers On');
    } else {
        SRAdistanceMarkersButton.classList.add('inactive');
        SRAdistanceMarkersButton.classList.remove('active');
        updateStatusBar('→ SRA Distance Markers Off');
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
    if (isLabelDragging) return;  // Prevent panning if a label is being dragged

    isDragging = true;
    startX = event.clientX - panX;
    startY = event.clientY - panY;
});

document.addEventListener('mousemove', (event) => {
    if (isDragging && !isLabelDragging) {  // Allow panning only if a label is not being dragged
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
    const distanceNM = distancePixels / (zoomLevel * 1.0); // 1.0 is a placeholder for the conversion factor for NM

    // Calculate the bearing in degrees (adjusted for the offset)
    let bearing = Math.atan2(deltaX, deltaY) * 180 / Math.PI; // Convert radians to degrees
    bearing = Math.abs((bearing - 180) % 360); // Normalize to 0-360 degrees

    return {
        distanceNM: distanceNM.toFixed(1), // Round to 1 decimal place
        bearing: bearing.toFixed(0).padStart(3, '0') // Ensure bearing is always 3 digits
    };
}

// Reference the display element in the HTML
const displayElement = document.getElementById('radarDisplay');

// Function to update the display element with distance and bearing
function updateDisplay(x, y) {
    if (!displayElement) return; // Ensure the display element exists

    const rect = radarScope.getBoundingClientRect();
    const result = getDistanceAndBearing(x - rect.left, y - rect.top);

    // Update the content of the display element
    displayElement.textContent = `${result.bearing}° / ${result.distanceNM} NM`;
}

// Event listener for mouse move to update the display
radarScope.addEventListener('mousemove', (event) => {
    const rect = radarScope.getBoundingClientRect();
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    updateDisplay(mouseX, mouseY);
});


//******************Functions related to radar scope******************//
// Update the radar center on pan or zoom
function updateRadarCenter() {
    const rect = radarScope.getBoundingClientRect();
    radarCenter = {
        x: rect.width / 2,
        y: rect.height / 2
    };
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
        updateStatusBar('→ Exercise paused.');
        disableControlPanel();

        rangeRingsContainer.style.animationPlayState = 'paused'; // Stop radar rings rotation
    } else {
        pauseButton.textContent = 'Pause';
        updateStatusBar('→ Exercise resumed.');
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

// Function to request fullscreen
function openFullscreen() {
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) { // Firefox
        document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) { // Chrome, Safari and Opera
        document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) { // IE/Edge
        document.documentElement.msRequestFullscreen();
    }
}



//radar.js script file ends here


//********All event listeners w.r.t. radar scope placed here**********/

// Attach event listener to the pause button
document.getElementById('pauseButton').addEventListener('click', togglePause);

//Event listener to Toggle the visibility of labels and update the button's appearance
document.getElementById('label').addEventListener('click', () => {
    labelsVisible = !labelsVisible;

    // Get the label button element
    const labelButton = document.getElementById('label');

    // Update the button's appearance based on the current state
    if (labelsVisible) {
        labelButton.classList.add('active');
        labelButton.classList.remove('inactive');
        updateStatusBar('→ Labels Visible');
    } else {
        labelButton.classList.add('inactive');
        labelButton.classList.remove('active');
        updateStatusBar('→ Labels Hidden');
    }

    // Update visibility for all aircraft labels and lines
    aircraftBlips.forEach(blip => {
        if (blip.label) {
            blip.label.style.display = labelsVisible ? 'block' : 'none';
        }
        if (blip.line) {
            blip.line.style.display = labelsVisible ? 'block' : 'none';
        }
    });
});

//To display current time on the radar scope
// function updateRunningTime() {
//     const now = new Date();
//     const timeString = now.toLocaleTimeString();
//     document.getElementById("runningTime").textContent = `Time: ${timeString}`;
// }

// // Call it immediately to display time right away
// updateRunningTime();

// // Then update every second
// setInterval(updateRunningTime, 1000);
const startTime = Date.now();

function updateTimeDisplays() {
    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString();
    document.getElementById("currentTime").textContent = `${currentTimeStr}`;

    const elapsedMs = Date.now() - startTime;
    const totalSeconds = Math.floor(elapsedMs / 1000);

    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');

    document.getElementById("runningTime").textContent = `[${hours}:${minutes}:${seconds}]`;
}

// Call immediately so it's visible at start
updateTimeDisplays();

// Then update both every second
setInterval(updateTimeDisplays, 1000);


function initializeRadarAudio() {
    if (!radarAudioContext) {
        radarAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}


// Attach event listeners to track window resizing or zooming
window.addEventListener('resize', () => {
    updateRadarCenter();
    createRangeRings();  // Reposition range rings correctly
    aircraftBlips.forEach(blip => blip.updateBlipPosition());
});

//Function to Open the Log Tab for tabbed browsing
function openLogTab(evt, cityName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(cityName).style.display = "block";
    evt.currentTarget.className += " active";
}

// Functions to make the dialog boxes draggable (with clamping)
function makeDraggable(dialogId, handleId) {
    const dialog = document.getElementById(dialogId);
    const handle = document.getElementById(handleId);

    let offsetX = 0, offsetY = 0;
    let isDragging = false;
    let dragStart = false;

    handle.addEventListener('mousedown', (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;

        const rect = dialog.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        dragStart = true;

        dialog.style.left = `${rect.left}px`;
        dialog.style.top = `${rect.top}px`;
        dialog.style.bottom = 'auto';           // override bottom if set
        dialog.style.transform = 'none';        // cancel center transform

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!dragStart) return;

        // Start dragging only if the mouse moves enough
        if (!isDragging && (Math.abs(e.movementX) > 2 || Math.abs(e.movementY) > 2)) {
            isDragging = true;
        }

        if (isDragging) {
            // Clamp within viewport
            const x = Math.max(0, Math.min(e.clientX - offsetX, window.innerWidth - dialog.offsetWidth));
            const y = Math.max(0, Math.min(e.clientY - offsetY, window.innerHeight - dialog.offsetHeight));

            dialog.style.left = `${x}px`;
            dialog.style.top = `${y}px`;
        }
    }

    function onMouseUp() {
        isDragging = false;
        dragStart = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}


makeDraggable('initialAircraftDialog', 'initialAircraftDialog');
makeDraggable('aircraftDialog', 'aircraftDialog');
makeDraggable("mappingDialog", "mappingDialog");
makeDraggable("settingsDialog", "settingsDialog");


const ssrInput = document.getElementById("ssrInput");
const callsignInput = document.getElementById("callsignInput");
const mappingTableBody = document.getElementById("mappingTableBody");

const ssrToCallsignMap = {}; // Map storage

// ✅ New: Validates 4-digit octal SSR code
function isValidSquawkCode(code) {
    return /^[0-7]{4}$/.test(code);  // Only allow 4 digits using 0–7
}

function addMappingToTable(ssr, callsign) {
    if (ssrToCallsignMap[ssr]) {
        alert(`Squawk ${ssr} already mapped to ${ssrToCallsignMap[ssr]}`);
        return;
    }

    for (let code in ssrToCallsignMap) {
        if (ssrToCallsignMap[code].toUpperCase() === callsign.toUpperCase()) {
            alert(`Callsign ${callsign} already mapped to Squawk ${code}`);
            return;
        }
    }

    // Add to map
    ssrToCallsignMap[ssr] = callsign;

    // Create new row
    const row = document.createElement("tr");
    row.setAttribute("data-ssr", ssr);
    row.innerHTML = `
        <td style="width: 30%;" class="squawk-cell">${ssr}</td>
        <td style="width: 55%;">${callsign}</td>
        <td style="width: 15%;"><span class="delete-mapping-button" title="Delete">X</span></td>
    `;

    // Delete logic
    row.querySelector(".delete-mapping-button").addEventListener("click", () => {
        delete ssrToCallsignMap[ssr];
        row.remove();
        aircraftBlips.forEach(blip => {
            blip.updateLabelInfo();
            blip.updateColorBasedOnSSR();
        });
    });

    // Insert new row at top
    mappingTableBody.insertBefore(row, mappingTableBody.firstChild);

    // Reset fields
    ssrInput.value = "";
    callsignInput.value = "";
    ssrInput.focus();

    // ✅ Update aircraft visuals
    aircraftBlips.forEach(blip => {
        blip.updateLabelInfo();
        blip.updateColorBasedOnSSR();
    });
}


// Listen to Enter key
[callsignInput, ssrInput].forEach(input => {
    input.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            const ssr = ssrInput.value.trim();
            const callsign = callsignInput.value.trim().toUpperCase();

            if (!ssr || !callsign) return;

            // ✅ Use octal validation function
            if (!isValidSquawkCode(ssr)) {
                alert("Invalid Squawk Code.\nIt must be a 4-digit octal number (digits 0–7).");
                return;
            }

            addMappingToTable(ssr, callsign);
        }
    });
});

function toggleMappingDialog() {
    const dialog = document.getElementById("mappingDialog");

    if (dialog.style.display === "none" || dialog.style.display === "") {
        // Show the dialog at bottom-left
        dialog.style.display = "block";
        dialog.style.left = "0px";
        dialog.style.bottom = "50px";
        dialog.style.top = "auto";
        dialog.style.transform = "none";
    } else {
        // Hide the dialog
        dialog.style.display = "none";
    }
}


// Listen for F6 key to toggle mapping dialog
document.addEventListener("keydown", function (e) {
    if (e.key === "F6") {
        e.preventDefault();  // prevent browser default if any
        toggleMappingDialog();
    }
});






