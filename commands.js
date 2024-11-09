
//********commands.js script file starts here**********/

// Aircraft Commands
function processCommand(formationSize, blip) {
    const input = document.getElementById(`commandInput_${blip.callsign}`);
    const command = input.value.trim().toUpperCase();

    // Check if the aircraft is a leader and whether the checkbox is checked
    if (blip.role === "Leader") {
        const checkbox = document.getElementById(`formationCheckbox_${blip.callsign}`);

        if (checkbox && checkbox.checked) {  // Propagate if checked
            console.log(`Command received by C/S ${blip.callsign} for formation. Propagating "${command}" to formation members.`);
            propagateCommandToFormation(blip, command);
        } else {
            processCommandForBlip(blip, command);  // Execute only for the leader
        }
    }
    else {
        // Execute the command for the current aircraft (individual, leader, or member)
        //console.log(`Command "${command}" received by C/S ${blip.callsign}.`);
        processCommandForBlip(blip, command);
    }

    input.value = ''; // Clear input after processing
}

// Function to propagate commands to formation members in reverse order (last to first)
function propagateCommandToFormation(leaderBlip, command) {
    const baseCallsign = getBaseCallsign(leaderBlip.callsign);
    const formationSize = leaderBlip.formationSize;  // Get the formation size from the leader

    //console.log(`Base Callsign: ${baseCallsign}, Formation Size: ${formationSize}`);

    // Loop backwards from the last aircraft in the formation to the first (including the leader)
    for (let i = 1; i <= 4; i++) {
        const currentCallsign = `${baseCallsign}-${i}`;
        const currentBlip = aircraftBlips.find(blip => blip.callsign === currentCallsign);

        if (currentBlip) {
            processCommandForBlip(currentBlip, command); // Execute the command for each aircraft
        }
    }
}

// Function to process a specific command for an individual aircraft or formation member
function processCommandForBlip(blip, command) {
    const headingMatch = command.match(/^([LR])(\d{3})$/);
    const speedMatch = command.match(/^S(\d+)$/);
    const altitudeMatch = command.match(/^H(\d{1,2})$/);
    const verticalRateMatch = command.match(/^V(\d+)$/);
    const ssrMatch = command.match(/^SSR([0-7]{4})$/);

    let isValidCommand = false; // Track whether the command is valid

    console.log(`Command "${command}" received by C/S ${blip.callsign}.`);

    // Handle heading command
    if (headingMatch) {
        const direction = headingMatch[1];
        const targetHeading = parseInt(headingMatch[2], 10);

        blip.orbitLeft = false;
        blip.orbitRight = false;

        blip.turnRight = direction === 'R'; // Set turning direction
        blip.setTargetHeading(targetHeading);

        const turnDirection = direction === 'L' ? 'Left' : 'Right';
        updateStatusBar(`Aircraft ${blip.callsign} turning ${turnDirection} heading ${blip.targetHeading}°`);
        isValidCommand = true;
    }

    // Handle speed command
    else if (speedMatch) {
        const speed = parseInt(speedMatch[1], 10);
        blip.setTargetSpeed(speed);
        updateStatusBar(`Aircraft ${blip.callsign} speed set to ${speed} knots.`);
        isValidCommand = true;
    }

    // Handle altitude command
    else if (altitudeMatch) {
        const altitude = parseInt(altitudeMatch[1], 10) * 100;
        blip.targetAltitude = altitude;
        updateStatusBar(`Aircraft ${blip.callsign} target altitude set to ${altitude} feet.`);
        isValidCommand = true;
    }

    // Handle vertical rate command
    else if (verticalRateMatch) {
        const rate = parseInt(verticalRateMatch[1], 10);
        blip.verticalClimbDescendRate = rate;
        updateStatusBar(`Aircraft ${blip.callsign} vertical rate set to ${rate} feet per minute.`);
        isValidCommand = true;
    }

    // Handle SSR code command
    else if (ssrMatch) {
        const newSSRCode = ssrMatch[1];

        if (!['7500', '7600', '7700'].includes(newSSRCode)) {
            const existingSSR = aircraftBlips.find(b => b.ssrCode === newSSRCode);
            if (existingSSR && newSSRCode !== '0000') {
                updateStatusBar(`Duplicate SSR code. Aircraft ${existingSSR.callsign} already squawking ${existingSSR.ssrCode}`);
                return;
            }
        }

        blip.setSSRCode(newSSRCode);
        updateStatusBar(`Aircraft ${blip.callsign} SSR code set to 3-${newSSRCode}`);
        isValidCommand = true;
    }

    // Handle report heading command
    else if (command === "RH") {
        const formattedHeading = String(Math.round(blip.heading) % 360).padStart(3, '0');
        updateStatusBar(`Aircraft ${blip.callsign} heading: ${formattedHeading}°`);
        isValidCommand = true;
    }

    // Handle delete command
    else if (command === "DEL") {
        deleteAircraft(blip);
        updateStatusBar(`Aircraft ${blip.callsign} deleted.`);
        isValidCommand = true;
        
    }

    // Handle orbit left command
    else if (command === "OL") {
        blip.startOrbitLeft();
        updateStatusBar(`Aircraft ${blip.callsign} orbiting left.`);
        isValidCommand = true;
    }

    // Handle orbit right command
    else if (command === "OR") {
        blip.startOrbitRight();
        updateStatusBar(`Aircraft ${blip.callsign} orbiting right.`);
        isValidCommand = true;
    }

    // Handle stop turn command
    else if (command === "ST") {
        blip.stopTurn();
        updateStatusBar(`Aircraft ${blip.callsign} stopping turn.`);
        isValidCommand = true;
    }

    // Handle invalid command
    else {
        updateStatusBar(`Invalid command: ${command}.`);
    }

    // Update the last command display
    const lastCommandDisplay = document.getElementById(`lastCommand_${blip.callsign}`);
    if (lastCommandDisplay) {
        lastCommandDisplay.textContent = `${command}`;
        lastCommandDisplay.style.backgroundColor = isValidCommand ? 'lightgreen' : 'lightcoral'; // Green for valid, red for invalid
    }
    
}


//********commands.js script file ends here**********/
