// Aircraft Commands
function processCommand(formationSize, blip) {
    const input = document.getElementById(`commandInput_${blip.callsign}`);
    const command = input.value.trim().toUpperCase();
    const headingMatch = command.match(/^([LR])(\d{3})$/);
    const speedMatch = command.match(/^S(\d+)$/);
    const altitudeMatch = command.match(/^H(\d{1,2})$/);
    const verticalRateMatch = command.match(/^V(\d+)$/);
    const ssrMatch = command.match(/^SSR([0-7]{4})$/);

    const isFirstInFormation = formationSize > 1 && blip.callsign.endsWith("1");

    let shouldPropagateCommands = true;

    // Check if the checkbox is unchecked, meaning commands should be propagated

    if (isFirstInFormation) {
        const checkbox = document.getElementById(`formationCheckbox_${blip.callsign}`);
        if (checkbox) {
            shouldPropagateCommands = !checkbox.checked;
        }
    }

    // Handle heading command
    if (headingMatch) {
        const direction = headingMatch[1];
        const targetHeading = parseInt(headingMatch[2], 10);

        // Stop any ongoing orbit when a specific heading is given
        blip.orbitLeft = false;
        blip.orbitRight = false;

        let turnDirection = null;

        if (direction === 'L') {
            blip.turnRight = false;  // Turn left (counterclockwise)
            blip.setTargetHeading(targetHeading);
            turnDirection = `Left`;
        } else if (direction === 'R') {
            blip.turnRight = true;  // Turn right (clockwise)
            blip.setTargetHeading(targetHeading);
            turnDirection = `Right`;
        }

        updateStatusBar(`Aircraft ${blip.callsign} turning ${turnDirection} heading ${blip.targetHeading}°`);
    }

    // Handle speed command
    else if (speedMatch) {
        const speed = parseInt(speedMatch[1], 10);
        blip.setTargetSpeed(speed);  // Set target speed for gradual change
        updateStatusBar(`Aircraft ${blip.callsign} speed set to ${speed} knots.`);

        const speedElement = document.getElementById(`speed_${blip.callsign}`);
        //if (speedElement) {
        // speedElement.textContent = `N${blip.speed}`;  // Update speed in control box
        //}

        //blip.updateLabelInfo();  // Update label with new speed
    }

    // Handle altitude command
    else if (altitudeMatch) {
        const altitude = parseInt(altitudeMatch[1], 10) * 100;
        blip.targetAltitude = altitude;  // Set target altitude for gradual change
        updateStatusBar(`Aircraft ${blip.callsign} target altitude set to ${altitude} feet.`);

        const altitudeElement = document.getElementById(`altitude_${blip.callsign}`);
        //if (altitudeElement) {
        // altitudeElement.textContent = `${blip.targetAltitude / 100}`;  // Update altitude in control box
        //}
    }

    // Handle vertical climb/descent rate command
    else if (verticalRateMatch) {
        const rate = parseInt(verticalRateMatch[1], 10);
        blip.verticalClimbDescendRate = rate;  // Set vertical climb/descent rate
        updateStatusBar(`Aircraft ${blip.callsign} vertical rate set to ${rate} feet per minute.`);
    }

    //Handle SSR code changes commands
    else if (ssrMatch) {
        const newSSRCode = ssrMatch[1];  // Get the SSR code from the command

        // Allow duplication for 7500, 7600, and 7700
        if (newSSRCode !== '7500' && newSSRCode !== '7600' && newSSRCode !== '7700') {
            const existingSSR = aircraftBlips.find(blip => blip.ssrCode === newSSRCode);

            if (existingSSR && newSSRCode !== '0000') {
                updateStatusBar(`Duplicate SSR code. Aircraft ${existingSSR.callsign} already squawking ${existingSSR.ssrCode}`);
                return;
            }
        }

        // Update the aircraft's SSR code if it's not a duplicate or is an emergency code
        blip.setSSRCode(newSSRCode);
        updateStatusBar(`Aircraft ${blip.callsign} SSR code set to 3-${newSSRCode}`);
    }


    // Handle Report Heading command
    else if (command === "RH") {
        updateStatusBar(`Aircraft ${blip.callsign} heading: ${blip.heading}°`);
    }

    // Handle aircraft Delete command
    else if (command === "DEL") {
        deleteAircraft(blip);
        updateStatusBar(`Aircraft ${blip.callsign} deleted.`);
    }

    // Handle orbit left (OL) command
    else if (command === "OL") {
        blip.startOrbitLeft();
        updateStatusBar(`Aircraft ${blip.callsign} orbiting left.`);
    }

    // Handle orbit right (OR) command
    else if (command === "OR") {
        blip.startOrbitRight();
        updateStatusBar(`Aircraft ${blip.callsign} orbiting right.`);
    }

    // Handle stop turn (ST) command
    else if (command === "ST") {
        blip.stopTurn();
        updateStatusBar(`Aircraft ${blip.callsign} stopping turn.`);
    }

    //Handle invalid command
    else {
        updateStatusBar(`Invalid command: ${command}.`);
    }

    // Update last command display
    const lastCommandDisplay = document.getElementById(`lastCommand_${blip.callsign}`);
    if (lastCommandDisplay) {
        lastCommandDisplay.textContent = `${command}`;
    }

    // Command propagation to other aircraft in the formation
    if (isFirstInFormation && shouldPropagateCommands) {
        propagateCommandToFormation(blip, command);
    }

    input.value = '';  // Clear input after processing
}

function propagateCommandToFormation(firstBlip, command) {
    const baseCallsign = getBaseCallsign(firstBlip.callsign);

    // Loop through all aircraft in the formation except the first
    for (let i = 2; i <= formationSize; i++) {
        const currentCallsign = `${baseCallsign}${i}`;
        const currentBlip = aircraftBlips.find(blip => blip.callsign === currentCallsign);

        if (currentBlip) {
            // Update each blip with the same command as the first
            processCommandForBlip(currentBlip, command);
        }
    }
}

// Function to process command for a specific blip
function processCommandForBlip(blip, command) {
    const headingMatch = command.match(/^([LR])(\d{3})$/);
    const speedMatch = command.match(/^S(\d+)$/);
    const altitudeMatch = command.match(/^H(\d{1,2})$/);
    const verticalRateMatch = command.match(/^V(\d+)$/);
    const ssrMatch = command.match(/^SSR([0-7]{4})$/);

    // Apply the same logic for heading, speed, altitude, etc.
    // Handle heading command
    if (headingMatch) {
        const direction = headingMatch[1];
        const targetHeading = parseInt(headingMatch[2], 10);

        // Stop any ongoing orbit when a specific heading is given
        blip.orbitLeft = false;
        blip.orbitRight = false;

        let turnDirection = null;

        if (direction === 'L') {
            blip.turnRight = false;  // Turn left (counterclockwise)
            blip.setTargetHeading(targetHeading);
            turnDirection = `Left`;
        } else if (direction === 'R') {
            blip.turnRight = true;  // Turn right (clockwise)
            blip.setTargetHeading(targetHeading);
            turnDirection = `Right`;
        }

        updateStatusBar(`Aircraft ${blip.callsign} turning ${turnDirection} heading ${blip.targetHeading}°`);
    }

    // Handle speed command
    else if (speedMatch) {
        const speed = parseInt(speedMatch[1], 10);
        blip.setTargetSpeed(speed);  // Set target speed for gradual change
        updateStatusBar(`Aircraft ${blip.callsign} speed set to ${speed} knots.`);

        const speedElement = document.getElementById(`speed_${blip.callsign}`);
        //if (speedElement) {
        // speedElement.textContent = `N${blip.speed}`;  // Update speed in control box
        //}

        //blip.updateLabelInfo();  // Update label with new speed
    }

    // Handle altitude command
    else if (altitudeMatch) {
        const altitude = parseInt(altitudeMatch[1], 10) * 100;
        blip.targetAltitude = altitude;  // Set target altitude for gradual change
        updateStatusBar(`Aircraft ${blip.callsign} target altitude set to ${altitude} feet.`);

        const altitudeElement = document.getElementById(`altitude_${blip.callsign}`);
        //if (altitudeElement) {
        // altitudeElement.textContent = `${blip.targetAltitude / 100}`;  // Update altitude in control box
        //}
    }

    // Handle vertical climb/descent rate command
    else if (verticalRateMatch) {
        const rate = parseInt(verticalRateMatch[1], 10);
        blip.verticalClimbDescendRate = rate;  // Set vertical climb/descent rate
        updateStatusBar(`Aircraft ${blip.callsign} vertical rate set to ${rate} feet per minute.`);
    }

    //Handle SSR code changes commands
    else if (ssrMatch) {
        const newSSRCode = ssrMatch[1];  // Get the SSR code from the command

        // Allow duplication for 7500, 7600, and 7700
        if (newSSRCode !== '7500' && newSSRCode !== '7600' && newSSRCode !== '7700') {
            const existingSSR = aircraftBlips.find(blip => blip.ssrCode === newSSRCode);

            if (existingSSR && newSSRCode !== '0000') {
                updateStatusBar(`Duplicate SSR code. Aircraft ${existingSSR.callsign} already squawking ${existingSSR.ssrCode}`);
                return;
            }
        }

        // Update the aircraft's SSR code if it's not a duplicate or is an emergency code
        blip.setSSRCode(newSSRCode);
        updateStatusBar(`Aircraft ${blip.callsign} SSR code set to 3-${newSSRCode}`);
    }


    // Handle Report Heading command
    else if (command === "RH") {
        updateStatusBar(`Aircraft ${blip.callsign} heading: ${blip.heading}°`);
    }

    // Handle aircraft Delete command
    else if (command === "DEL") {
        deleteAircraft(blip);
        updateStatusBar(`Aircraft ${blip.callsign} deleted.`);
    }

    // Handle orbit left (OL) command
    else if (command === "OL") {
        blip.startOrbitLeft();
        updateStatusBar(`Aircraft ${blip.callsign} orbiting left.`);
    }

    // Handle orbit right (OR) command
    else if (command === "OR") {
        blip.startOrbitRight();
        updateStatusBar(`Aircraft ${blip.callsign} orbiting right.`);
    }

    // Handle stop turn (ST) command
    else if (command === "ST") {
        blip.stopTurn();
        updateStatusBar(`Aircraft ${blip.callsign} stopping turn.`);
    }

    //Handle invalid command
    else {
        updateStatusBar(`Invalid command: ${command}.`);
    }

    // Update last command display
    const lastCommandDisplay = document.getElementById(`lastCommand_${blip.callsign}`);
    if (lastCommandDisplay) {
        lastCommandDisplay.textContent = `${command}`;
    }
}
