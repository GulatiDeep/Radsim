//File containing all the functions


//Functions related to radar scope
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



//***********Functions related to aircraft**************//

// Open create aircraft dialog box
function openAircraftDialog() {
    const dialog = document.getElementById('aircraftDialog');
    dialog.style.display = 'block';
    dialog.style.top = `50%`;  // Center the dialog
    dialog.style.left = `50%`;
    dialog.style.transform = `translate(-50%, -50%)`;
    document.getElementById('callsignInput').focus();
}

// Close create aircraft dialog box
function closeAircraftDialog() {
    const dialog = document.getElementById('aircraftDialog');
    dialog.style.display = 'none';
    resetDialogFields();
}

// Reset form fields to their default values
function resetDialogFields() {
    const callsignInput = document.getElementById('callsignInput');
    const ssrInput = document.getElementById('ssrInput');
    const headingInput = document.getElementById('headingInput');
    const speedInput = document.getElementById('speedInput');
    const altitudeInput = document.getElementById('altitudeInput');
    const singleSSRInput = document.getElementById('singleSSRInput');
    const formationSSRInputs = document.getElementById('formationSSRInputs');
    const ssrFormationContainer = document.getElementById('ssrFormationContainer');
    
    // Reset callsign input
    callsignInput.value = '';
    callsignInput.style.backgroundColor = '';

    // Reset single SSR input
    ssrInput.value = '0000';
    ssrInput.style.backgroundColor = '';

    // Reset heading, speed, and altitude inputs
    headingInput.value = '001';
    speedInput.value = '300';
    altitudeInput.value = '100';

    // Hide formation SSR inputs and clear container
    singleSSRInput.style.display = 'block';
    formationSSRInputs.style.display = 'none';
    ssrFormationContainer.innerHTML = '';

    // Reset formation size to default
    document.querySelector('input[name="formationSize"][value="1"]').checked = true;
}

//Functions to validate various inputs
// Function to remove trailing numbers from a callsign
function getBaseCallsign(callsign) {
    return callsign.replace(/\d+$/, ''); // Remove trailing digits
}

// Validate the callsign based on whether it's an individual or formation
function validateCallsign(formationSize) {
    const callsignInput = document.getElementById('callsignInput');
    const callsign = callsignInput.value.trim();

    // Check if the callsign is valid based on formation size
    if (formationSize == 1) {
        // For single aircraft, the callsign should be a 3-digit number, excluding 000
        const isValidNumber = /^[0-9]{3}$/.test(callsign) && callsign !== '000';
        if (!isValidNumber) {
            callsignInput.style.backgroundColor = '#f8d7da';  // Light red color
            return false;
        }
    } else {
        // For formations, callsign should contain only alphabetic characters
        const isValidFormationCallsign = /^[A-Za-z]+$/.test(callsign);
        if (!isValidFormationCallsign) {
            callsignInput.style.backgroundColor = '#f8d7da';  // Light red color
            return false;
        }
    }

    // Get the base callsign by removing any trailing numbers
    const baseCallsign = getBaseCallsign(callsign);

    // Check for existing blips to avoid duplicate callsigns
    const existingBlips = aircraftBlips.filter(blip => getBaseCallsign(blip.callsign) === baseCallsign);

    if (formationSize == 1) {
        // For single aircraft, ensure the exact callsign does not exist
        const existingBlip = existingBlips.find(blip => blip.callsign === callsign);
        if (existingBlip) {
            callsignInput.style.backgroundColor = '#f8d7da';  // Light red color
            return false;
        }
    } else {
        // For formations, ensure the base callsign is not already in use
        const baseCallsignExists = existingBlips.some(blip => blip.callsign !== callsign);
        if (baseCallsignExists) {
            callsignInput.style.backgroundColor = '#f8d7da';  // Light red color
            return false;
        }
    }

    callsignInput.style.backgroundColor = '';  // Reset to default
    return true;
}
// Validate SSR code(s) for single or formation aircraft
function validateSsrCode(formationSize) {
    if (formationSize == 1) {
        const ssrInput = document.getElementById('ssrInput');
        let ssrCode = ssrInput.value.trim();

        // Set default SSR code if none is entered
        if (ssrCode === '') {
            ssrCode = '0000';
            ssrInput.value = ssrCode;  // Update the input field with the default value
        }

        if (validateSingleSsrCode(ssrCode)) {
            ssrInput.style.backgroundColor = ''; // Reset to default
            return true;
        }
        ssrInput.style.backgroundColor = '#f8d7da'; // Light red color for invalid SSR
        return false;
    } else {
        const ssrInputs = document.querySelectorAll('.formation-ssr-input');
        const ssrCodes = new Set();  // To track unique SSR codes except '0000'
        let isValid = true;

        ssrInputs.forEach(input => {
            let ssrCode = input.value.trim();

            // Set default SSR code if none is entered
            if (ssrCode === '') {
                ssrCode = '0000';
                input.value = ssrCode;  // Update the input field with the default value
            }

            if (!validateSingleSsrCode(ssrCode) || (ssrCode !== '0000' && ssrCodes.has(ssrCode))) {
                input.style.backgroundColor = '#f8d7da';  // Highlight invalid field
                isValid = false;
            } else {
                input.style.backgroundColor = '';  // Reset to default
                if (ssrCode !== '0000') {
                    ssrCodes.add(ssrCode);  // Add to the set if not '0000'
                }
            }
        });

        return isValid;
    }
}

// Helper function to validate a single SSR code
function validateSingleSsrCode(ssrCode) {
    // Skip duplication check for emergency SSR codes (7500, 7600, 7700)
    if (ssrCode === '7500' || ssrCode === '7600' || ssrCode === '7700') {
        return true;  // Valid emergency codes
    }

    // Validate SSR code format (octal) and allow '0000' to be duplicate
    const existingSSR = aircraftBlips.find(blip => blip.ssrCode === ssrCode && ssrCode !== '0000');
    return /^[0-7]{4}$/.test(ssrCode) && !existingSSR;
}

function validateHeading() {
    const headingInput = document.getElementById('headingInput');
    const heading = parseInt(headingInput.value, 10);

    if (isNaN(heading) || heading < 1 || heading > 360) {
        headingInput.style.backgroundColor = '#f8d7da'; // Light red color
        return false;
    }

    headingInput.style.backgroundColor = ''; // Reset to default
    return true;
}

function validateSpeed() {
    const speedInput = document.getElementById('speedInput');
    const speed = parseInt(speedInput.value, 10);

    if (isNaN(speed)) {
        speedInput.style.backgroundColor = '#f8d7da'; // Light red color
        return false;
    }

    speedInput.style.backgroundColor = ''; // Reset to default
    return true;
}

function validateAltitude() {
    const altitudeInput = document.getElementById('altitudeInput');
    const altitude = parseInt(altitudeInput.value * 100, 10); // Convert to feet

    if (isNaN(altitude)) {
        altitudeInput.style.backgroundColor = '#f8d7da'; // Light red color
        return false;
    }

    altitudeInput.style.backgroundColor = ''; // Reset to default
    return true;
}


// Function to Create Aircraft blip(s) after validating inputs from Dialog Box
function createAircraftBlip() {
    const formationSize = parseInt(document.querySelector('input[name="formationSize"]:checked').value, 10);
    
    // Validate all input fields including SSR codes
    const isCallsignValid = validateCallsign(formationSize);
    const isSsrCodeValid = validateSsrCode(formationSize);
    const isHeadingValid = validateHeading();
    const isSpeedValid = validateSpeed();
    const isAltitudeValid = validateAltitude();

    if (!isCallsignValid || !isSsrCodeValid || !isHeadingValid || !isSpeedValid || !isAltitudeValid) {
        return false;
    }

    // Get the input values
    const callsignInput = document.getElementById('callsignInput').value.trim();
    const headingInput = parseInt(document.getElementById('headingInput').value, 10);
    const speedInput = parseInt(document.getElementById('speedInput').value, 10);
    const altitudeInput = parseInt(document.getElementById('altitudeInput').value * 100, 10);  // Convert to feet

    // Create aircraft based on the formation size
    for (let i = 1; i <= formationSize; i++) {
        let callsign = formationSize === 1 ? callsignInput : `${callsignInput}${i}`;
        let ssrCode = formationSize === 1 ? document.getElementById('ssrInput').value.trim() :
            document.getElementById(`formationSSRInput_${i}`).value.trim();  // Get SSR code for each formation aircraft

        const blip = new AircraftBlip(callsign, headingInput, speedInput, altitudeInput, selectedPosition.x, selectedPosition.y, ssrCode);
        aircraftBlips.push(blip);
        this.formationSize = formationSize; 
        // Pass formation size and the current index (i) to control box creation
        createControlBox(blip, this.formationSize, i);
    }

    return true;  // Return true to indicate successful creation
}



// Function to update aircraft blips' positions every 4 seconds
function moveAircraftBlips() {
    if (!isPaused) {
        aircraftBlips.forEach(blip => blip.move(false));  // Update both heading and position
        setTimeout(moveAircraftBlips, updateInterval);  // Schedule next movement update
    }
}

// Function to Create control box for aircraft
function createControlBox(blip, formationSize, aircraftIndex) {
    const controlPanel = document.getElementById('controlPanel');
    const controlBox = document.createElement('div');
    controlBox.className = 'control-box';
    controlBox.id = `controlBox_${blip.callsign}`;  // Unique ID based on callsign

    // Format heading to always be 3 digits
    const formattedHeading = String(blip.heading).padStart(3, '0');

    // Create the HTML for the control box
    controlBox.innerHTML = `
        <div>
            <span class="info-box callsign-box">${blip.callsign}</span>
            <span class="info-box ssr-box">3-${blip.ssrCode}</span>
            <span class="info-box heading-box"><span id="heading_${blip.callsign}">${formattedHeading}°</span></span>
            <span class="info-box altitude-box">A<span id="altitude_${blip.callsign}">${Math.round(blip.altitude / 100)}</span></span>
            <span class="info-box speed-box">N<span id="speed_${blip.callsign}">${blip.speed}</span></span>
        </div>
        <div class="command-input-container">
            <input type="text" id="commandInput_${blip.callsign}">
            <span id="lastCommand_${blip.callsign}" class="last-command"></span>
            ${formationSize > 1 && aircraftIndex === 1 ? `<input type="checkbox" id="formationCheckbox_${blip.callsign}"> ` : ''}
        </div>
    `;

    controlPanel.appendChild(controlBox);

    // Disable the control box if it's not the first aircraft in the formation
    if (formationSize > 1 && aircraftIndex > 1) {
        disableControlBox(blip.callsign);
    }

    // Add event listener for the checkbox in the first aircraft's control box
    if (formationSize > 1 && aircraftIndex === 1) {
        const checkbox = document.getElementById(`formationCheckbox_${blip.callsign}`);
        checkbox.addEventListener('change', function () {
            toggleFormationControlBoxes(checkbox.checked, formationSize, blip.callsign);
            
            if (checkbox.checked) {
                //checkbox.style.display = 'none';  // Hide the checkbox once it's checked
            }
        });
    }

    // Event listener for Enter key to handle commands for each aircraft
    controlBox.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            processCommand(this.formationSize, blip);
        }
    });
}



// Function to disable the control box
function disableControlBox(callsign) {
    const commandInput = document.getElementById(`commandInput_${callsign}`);
    commandInput.disabled = true;
}

// Function to enable the control box
function enableControlBox(callsign) {
    const commandInput = document.getElementById(`commandInput_${callsign}`);
    commandInput.disabled = false;
}

// Function to toggle the control boxes for formation aircraft based on checkbox status
function toggleFormationControlBoxes(enable, formationSize, firstAircraftCallsign) {
    for (let i = 2; i <= formationSize; i++) {
        const currentCallsign = `${firstAircraftCallsign.slice(0, -1)}${i}`;  // Construct the callsign for the rest of the formation
        if (enable) {
            enableControlBox(currentCallsign);
        } else {
            disableControlBox(currentCallsign);
        }
    }
}


// Function to update the speed and heading in the control box
function updateControlBox(blip) {
    const headingElement = document.getElementById(`heading_${blip.callsign}`);
    const speedElement = document.getElementById(`speed_${blip.callsign}`);
    const altitudeElement = document.getElementById(`altitude_${blip.callsign}`);
    const callsignElement = document.querySelector(`#controlBox_${blip.callsign} .callsign-box`);
    const ssrElement = document.querySelector(`#controlBox_${blip.callsign} .ssr-box`);

    // Format heading to always be 3 digits
    const formattedHeading = String(blip.heading).padStart(3, '0');

    // Update heading, speed, and altitude
    if (headingElement) headingElement.innerHTML = `${formattedHeading}°`;
    if (speedElement) speedElement.innerHTML = `${blip.speed}`;
    if (altitudeElement) altitudeElement.innerHTML = `${Math.round(blip.altitude / 100)}`;

    // Update callsign and SSR code
    if (callsignElement) callsignElement.innerHTML = blip.callsign;
    if (ssrElement) ssrElement.innerHTML = `3-${blip.ssrCode}`;
}

// Function to update the heading and control box every 1 second
function updateHeadingPeriodically() {
    aircraftBlips.forEach(blip => {
        blip.move(true);  // Only update the heading, not the position on the radar
    });

    setTimeout(updateHeadingPeriodically, headingUpdateInterval);  // Schedule next update
}



// To delete the aircraft
function deleteAircraft(blip) {
    // Remove the aircraft blip from the aircraftBlips array
    aircraftBlips = aircraftBlips.filter(b => b !== blip);

    // Remove the blip element from the DOM
    panContainer.removeChild(blip.element);

    // Remove the label element from the DOM
    panContainer.removeChild(blip.label);

    // Remove the line element from the DOM
    panContainer.removeChild(blip.line);

    // Remove the history dots
    blip.historyDots.forEach(dot => panContainer.removeChild(dot));

    // Remove the control box from the control panel
    const controlBox = document.getElementById(`controlBox_${blip.callsign}`);
    if (controlBox) {
        document.getElementById('controlPanel').removeChild(controlBox);
    }
}