//********aircraftBlipClass.js script file starts here**********/




    // AircraftBlip class with all attributes regarding aircraft blip, label and leading line
    class AircraftBlip {
        constructor(callsign, heading, speed, altitude, x, y, ssrCode) {
            this.callsign = callsign;
            this.ssrCode = ssrCode;
            this.heading = heading;
            this.speed = speed;
            this.targetSpeed = speed;
            this.altitude = altitude || 10000;
            this.targetAltitude = this.altitude;
            this.verticalClimbDescendRate = 3000;
            this.speedChangeRate = 10;
            this.position = { x, y };
            this.targetHeading = heading;
            this.headingChangeRate = 2;
            this.turning = false;
            this.orbitLeft = false;  // New property for orbiting left
            this.orbitRight = false; // New property for orbiting right
            this.formationSize = 1;
            this.role = 'Individual';

            // Create elements (blip, label, line)
            this.element = this.createBlipElement();
            this.label = this.createLabelElement();
            this.labelOffset = { x: 40, y: -40 }; // Initial offset from blip
            this.line = this.createLineElement();
            this.history = [];
            this.historyDots = [];

            // Create history dots
            this.createHistoryDots();

            // Update positions
            this.updateBlipPosition();

            // Ensure the color is updated based on SSR
            this.updateColorBasedOnSSR(); // Call after elements are created
        }

        // Create the blip element for the aircraft
        createBlipElement() {
            const blip = document.createElement('div');
            blip.className = 'aircraft-blip';

            // Apply additional class for plus sign if SSR code is '0000'
            if (this.ssrCode === '0000') {
                blip.classList.remove('aircraft-blip'); // Remove the default box class
                blip.classList.add('plus-sign'); // Add the plus sign class

            } else {
                blip.classList.remove('plus-sign'); // Remove the plus sign class if it was previously added
                blip.classList.add('aircraft-blip'); // Ensure the default box style is applied

            }

            blip.style.position = 'absolute';
            blip.style.zIndex = '2';

            panContainer.appendChild(blip);
            return blip;
        }

        // Update label to show callsign, speed, and altitude in the desired format
        createLabelElement() {
            const label = document.createElement('div');
            label.className = 'aircraft-label';
            label.innerHTML = `${this.callsign}<br>3-${this.ssrCode}<br>A${Math.round(this.altitude / 100)}<br>N${this.speed}`;
            label.style.position = 'absolute';
            label.style.color = 'yellow';
            label.style.zIndex = '3';

            // Check the global labelsVisible flag and hide the label if it's false
            if (!labelsVisible) {
                label.style.display = 'none';
            }

            panContainer.appendChild(label);

            this.label = label;  // Store the label element

            // Make the label draggable
            dragElement(label, this);

            // Update the label info based on the initial SSR code
            this.updateLabelInfo(this);

            return label;
        }

        // Create the line element connecting the blip and the label
        createLineElement() {
            const line = document.createElement('div');
            line.className = 'aircraft-line';
            line.style.position = 'absolute';
            line.style.height = '1px';
            line.style.backgroundColor = 'grey';
            line.style.zIndex = '1';

            // Check the global labelsVisible flag and hide the line if it's false
            if (!labelsVisible) {
                line.style.display = 'none';
            }

            panContainer.appendChild(line);
            return line;
        }

        // Create history dot elements and append to the radar
        createHistoryDots() {
            for (let i = 0; i < 12; i++) {
                const dot = document.createElement('div');
                dot.className = 'history-dot';
                dot.style.opacity = 0; // Initially set opacity to 0
                dot.style.position = 'absolute';
                dot.style.width = '1px';
                dot.style.height = '1px';
                dot.style.backgroundColor = 'yellow';
                dot.style.zIndex = '1';
                panContainer.appendChild(dot);
                this.historyDots.push(dot);
            }
        }

        // Update the blip's position and label position
        updateBlipPosition() {
            const blipSize = 6;
            const scopeCenterX = radarCenter.x;
            const scopeCenterY = radarCenter.y;

            // Update the blip's position
            this.element.style.left = `${scopeCenterX + this.position.x * zoomLevel - blipSize / 2}px`;
            this.element.style.top = `${scopeCenterY - this.position.y * zoomLevel - blipSize / 2}px`;

            // Apply the updated offset to the label
            this.label.style.left = `${this.element.offsetLeft + this.labelOffset.x}px`;
            this.label.style.top = `${this.element.offsetTop + this.labelOffset.y}px`;

            // Update the line to connect the blip and the label
            this.updateLinePosition();

            // Calculate and log bearing and distance
            const { bearing, distanceNM } = this.getBearingAndDistanceFromRadarCenter();
            //console.log(`C/S ${this.callsign}: Bearing: ${bearing}°, Distance: ${distanceNM} NM`);

            this.history.push({ x: this.position.x, y: this.position.y });

            if (this.history.length > 12) {
                this.history.shift();
            }

            this.updateHistoryDots();
        }

        getBearingAndDistanceFromRadarCenter() {
            const deltaX = this.position.x * zoomLevel;
            const deltaY = this.position.y * zoomLevel;

            const distancePixels = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const distanceNM = distancePixels / (zoomLevel * 1.0); // 1.0 as conversion placeholder

            // Corrected bearing calculation (same logic as mouse pointer calculation)
            let bearing = Math.atan2(deltaX, deltaY) * (180 / Math.PI);
            bearing = (bearing + 360) % 360; // Normalize bearing to 0-360 degrees

            return {
                bearing: bearing.toFixed(0).padStart(3, '0'), // Ensure 3-digit format
                distanceNM: distanceNM.toFixed(0)
            };
        }

        // Update label to show callsign and speed with a 90-degree perpendicular offset to the heading
        updateLabelPosition(blip) {

            // Calculate the offset angle to be perpendicular to the heading
            const angleRad = (this.heading - 180) * Math.PI / 180;
            const labelXOffset = 90 * Math.cos(angleRad); // Distance from the blip to the label in x-direction
            const labelYOffset = 90 * Math.sin(angleRad); // Distance from the blip to the label in y-direction

            // Calculate label position with the perpendicular offset applied
            const labelX = radarCenter.x + this.position.x * zoomLevel + labelXOffset;
            const labelY = radarCenter.y - this.position.y * zoomLevel - labelYOffset;

            // Set label position
            this.label.style.left = `${labelX}px`;
            this.label.style.top = `${labelY}px`;

            //Update Label Info
            this.updateLabelInfo(this);

        }

        //To update the informatioin on label based on primary or secondary pickup
        updateLabelInfo(blip) {
            // Only display label info if SSR code is not 0000
            if (this.ssrCode !== '0000') {
                this.label.innerHTML = `${this.callsign}<br>3-${this.ssrCode}<br>A${Math.round(this.altitude / 100)}<br>N${this.speed}`;
            } else {
                this.label.innerHTML = `N${this.speed}`; // Display only speed if SSR code is 0000
            }
        }

        //Set the SSR code based on input
        setSSRCode(newSSRCode) {
            this.ssrCode = newSSRCode;
            // Remove the existing blip
            this.element.remove();
            // Create a new blip based on the new SSR code
            this.element = this.createBlipElement();
            this.updateBlipPosition();  // Ensure the new blip is positioned correctly
            this.updateLabelInfo();  // Update label info as well
            this.updateColorBasedOnSSR(); // Apply the color change
            updateControlBox(this);  // Update the control box to reflect the SSR code change

        }

        //Update the colour of label and blip based on SSR code like emergency codes
        updateColorBasedOnSSR() {
            // Check for emergency codes and set colors
            if (this.ssrCode === '7500' || this.ssrCode === '7600' || this.ssrCode === '7700') {
                // Change to red for emergencies
                this.label.style.color = 'red';
                this.line.style.backgroundColor = 'red';
                this.element.style.backgroundColor = 'red';

                // Change history dots to red
                this.historyDots.forEach(dot => {
                    dot.style.backgroundColor = 'red';
                });
            } else {
                // Revert back to default colors
                this.label.style.color = 'yellow';
                this.line.style.backgroundColor = 'grey';
                this.element.style.backgroundColor = 'yellow';

                // Revert history dots to yellow
                this.historyDots.forEach(dot => {
                    dot.style.backgroundColor = 'yellow';
                });
            }
        }

        // Update the line position and draw it between the blip and the label
        updateLinePosition() {
            const blipRect = this.element.getBoundingClientRect();
            const labelRect = this.label.getBoundingClientRect();

            // Get current pan offsets (dx, dy) from the panContainer
            const panMatrix = new WebKitCSSMatrix(window.getComputedStyle(panContainer).transform);
            const panX = panMatrix.m41;
            const panY = panMatrix.m42;

            // Calculate the center of the blip relative to the pan offsets
            const blipCenterX = blipRect.left + blipRect.width / 2 - panX;
            const blipCenterY = blipRect.top + blipRect.height / 2 - panY;

            // Calculate corners of the label
            const labelCorners = [
                { x: labelRect.left - panX, y: labelRect.top - panY },                // Top left
                { x: labelRect.right - panX, y: labelRect.top - panY },               // Top right
                { x: labelRect.left - panX, y: labelRect.bottom - panY },             // Bottom left
                { x: labelRect.right - panX, y: labelRect.bottom - panY }             // Bottom right
            ];

            // Calculate the midpoints of each edge of the label
            const labelEdges = [
                { x: (labelRect.left + labelRect.right) / 2 - panX, y: labelRect.top - panY },       // Top edge
                { x: (labelRect.left + labelRect.right) / 2 - panX, y: labelRect.bottom - panY },    // Bottom edge
                { x: labelRect.left - panX, y: (labelRect.top + labelRect.bottom) / 2 - panY },      // Left edge
                { x: labelRect.right - panX, y: (labelRect.top + labelRect.bottom) / 2 - panY }      // Right edge
            ];

            // Combine corners and edges into one array
            const labelPoints = [...labelCorners, ...labelEdges];

            // Find the nearest point (corner or edge)
            let nearestPoint = labelPoints[0];
            let minDistance = Infinity;

            for (const point of labelPoints) {
                const distance = Math.sqrt(
                    Math.pow(point.x - blipCenterX, 2) +
                    Math.pow(point.y - blipCenterY, 2)
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestPoint = point;
                }
            }

            // Calculate the line's length and angle to the nearest point
            const deltaX = nearestPoint.x - blipCenterX;
            const deltaY = nearestPoint.y - blipCenterY;
            const lineLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

            // Update the line's position, length, and rotation
            this.line.style.width = `${lineLength}px`;
            this.line.style.left = `${blipCenterX}px`;
            this.line.style.top = `${blipCenterY}px`;
            this.line.style.transform = `rotate(${angle}deg)`;

            // Ensure the line stays behind the label
            this.line.style.zIndex = '1';  // Lower z-index than the label
            this.label.style.zIndex = '3';  // Ensure the label stays above the line
        }


        // Update the history dots' positions based on the aircraft's history
        updateHistoryDots() {
            // Respect the historyDotsVisible flag
            if (!historyDotsVisible) {
                this.historyDots.forEach(dot => {
                    dot.style.opacity = 0;
                });
                return;
            }

            const scopeCenterX = radarCenter.x;
            const scopeCenterY = radarCenter.y;

            // Reverse the opacity calculation: oldest dot fades the most
            for (let i = 0; i < this.historyDots.length; i++) {
                const historyPos = this.history[this.history.length - this.historyDots.length + i];
                const dot = this.historyDots[i];

                if (dot && historyPos) {
                    const dotSize = 1;
                    dot.style.left = `${scopeCenterX + historyPos.x * zoomLevel - dotSize / 2}px`;
                    dot.style.top = `${scopeCenterY - historyPos.y * zoomLevel - dotSize / 2}px`;

                    // Oldest dot gets the lowest opacity, newest the highest
                    dot.style.opacity = (i + 1) / this.historyDots.length;
                }
            }
        }

        
        
        
// Update the blip's position and handle turning gradually
move(currentTime) {
    const speedMetersPerSecond = (this.speed / zoomLevel) * 0.514444;
    const distancePerUpdateMeters = speedMetersPerSecond * (updateInterval / 1000);
    const distancePerUpdateNauticalMiles = distancePerUpdateMeters / 1852;

    if (isPaused) return;  // Stop any movement or state updates if paused

    // Update heading every second
    if (currentTime - lastHeadingUpdateTime >= headingUpdateInterval) {
        lastHeadingUpdateTime = currentTime;

        // Handle orbit left
        if (this.orbitLeft) {
            this.heading = (this.heading - 2 + 360) % 360; // 2 degrees per second
            //console.log(`Orbiting Left: New Heading = ${this.heading}`);
        }

        // Handle orbit right
        if (this.orbitRight) {
            this.heading = (this.heading + 2) % 360; // 2 degrees per second
            //console.log(`Orbiting Right: New Heading = ${this.heading}`);
        }

        // Handle gradual heading change if not orbiting
        if (!this.orbitLeft && !this.orbitRight && this.heading !== this.targetHeading) {
            let headingDiff = (this.targetHeading - this.heading + 360) % 360;

            // Normalize headingDiff to find the shortest turn direction
            if (headingDiff > 180) {
                headingDiff -= 360; // Turn left
            }

            // Update heading based on the direction to the target heading
            this.heading += Math.sign(headingDiff) * Math.min(Math.abs(headingDiff), 2); // 2 degrees max turn
            this.heading = (this.heading + 360) % 360; // Normalize to [0, 360)

            //console.log(`Adjusting Heading: New Heading = ${this.heading}`);
        }

        // Update heading in control box
        updateControlBox(this);
    }

    // Update position every 4 seconds (or as per your logic)
    if (currentTime - lastPositionUpdateTime >= 4000) { // 4000 milliseconds = 4 seconds
        lastPositionUpdateTime = currentTime;

        // Update position based on the current heading
        const angleRad = (this.heading - 90) * Math.PI / 180;
        const deltaX = distancePerUpdateNauticalMiles * Math.cos(angleRad);
        const deltaY = distancePerUpdateNauticalMiles * Math.sin(angleRad);

        this.position.x += deltaX * zoomLevel;
        this.position.y -= deltaY * zoomLevel;

        // Adjust altitude gradually towards the targetAltitude
        const verticalChangePerSecond = this.verticalClimbDescendRate / 60;  // Feet per second
        const verticalChangePerUpdate = verticalChangePerSecond * (updateInterval / 1000);  // Change per update

        if (this.altitude !== this.targetAltitude) {
            const altitudeDiff = this.targetAltitude - this.altitude;
            if (Math.abs(altitudeDiff) <= verticalChangePerUpdate) {
                this.altitude = this.targetAltitude;  // Snap to target altitude if close enough
            } else {
                this.altitude += Math.sign(altitudeDiff) * verticalChangePerUpdate;  // Gradual altitude change
            }

            // Update control box and label
            updateControlBox(this);
            this.updateLabelPosition();
        }

        // Adjust speed gradually towards the targetSpeed
        const speedChangePerUpdate = this.speedChangeRate * (updateInterval / 1000);  // Change per update

        if (this.speed !== this.targetSpeed) {
            const speedDiff = this.targetSpeed - this.speed;
            if (Math.abs(speedDiff) <= speedChangePerUpdate) {
                this.speed = this.targetSpeed;  // Snap to target speed if close enough
            } else {
                this.speed += Math.sign(speedDiff) * speedChangePerUpdate;  // Gradual speed change
            }

            // Update control box and label
            updateControlBox(this);
            this.updateLabelPosition();
        }

        // Update the blip's position on the radar
        this.updateBlipPosition();
    }
}

        // Function to start orbiting left
        startOrbitLeft() {
            this.orbitLeft = true;
            this.orbitRight = false; // Stop orbiting right if already orbiting right
            this.turnRight = null; // Disable turning logic
        }

        // Function to start orbiting right
        startOrbitRight() {
            this.orbitLeft = false;
            this.orbitRight = true; // Stop orbiting left if already orbiting left
            this.turnRight = null; // Disable turning logic
        }

        // Function to stop turning (stopping the orbit)
        stopTurn() {
            this.orbitLeft = false;
            this.orbitRight = false;
            this.turnRight = null; // Also stop any heading change logic
        }

        setTargetHeading(newHeading) {
            this.targetHeading = newHeading;
        }

        setTargetSpeed(newSpeed) {
            this.targetSpeed = newSpeed;
        }
    }









    //********aircraftBlipClass.js script file ends here**********/