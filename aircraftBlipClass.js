const updateInterval = 4000; // Update interval in milliseconds
const headingUpdateInterval = 1000;  // Heading update interval set to 1 second (1000 milliseconds)
const radarContextMenu = document.getElementById('radarContextMenu');

let selectedPosition = { x: 0, y: 0 }; // Initialize selectedPosition
let aircraftBlips = []; // To store all created aircraft blips
let radarCenter = { x: radarScope.offsetWidth / 2, y: radarScope.offsetHeight / 2 }; // Track radar center
let isPaused = false; // to initialise the exercise pause and resume button
let clickedPosition = { x: 0, y: 0 };
let historyDotsVisible = true; // Initialize the flag to track the visibility state of the history dots
let labelsVisible = true; // //Initialize the flag to track the visibility state of the labels


// Set the initial state of the History button
document.getElementById('historyDots').classList.add(historyDotsVisible ? 'active' : 'inactive');

// Set the initial state of the Label button
document.getElementById('label').classList.add(labelsVisible ? 'active' : 'inactive');

// Start the heading update loop
updateHeadingPeriodically();

// Start the movement update loop
moveAircraftBlips();








// AircraftBlip class with all attributes
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
        this.labelOffset = { x: 10, y: -10 }; // Initial offset from blip
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

        this.history.push({ x: this.position.x, y: this.position.y });

        if (this.history.length > 12) {
            this.history.shift();
        }

        this.updateHistoryDots();
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
    
        // Calculate the center of the blip
        const blipCenterX = blipRect.left + blipRect.width / 2;
        const blipCenterY = blipRect.top + blipRect.height / 2;
    
        // Calculate the top-left corner of the label
        const labelX = labelRect.left;
        const labelY = labelRect.top;
    
        // Get pan offsets (in case the radar is panned)
        const panMatrix = new WebKitCSSMatrix(window.getComputedStyle(panContainer).transform);
        const panX = panMatrix.m41;
        const panY = panMatrix.m42;
    
        // Adjust positions based on pan offsets
        const adjustedBlipCenterX = blipCenterX - panX;
        const adjustedBlipCenterY = blipCenterY - panY;
        const adjustedLabelX = labelX - panX;
        const adjustedLabelY = labelY - panY;
    
        // Calculate the line's new position and dimensions
        const lineWidth = adjustedLabelX - adjustedBlipCenterX;
        const lineHeight = adjustedLabelY - adjustedBlipCenterY;
    
        // Update the line's position and size
        this.line.style.left = `${adjustedBlipCenterX}px`;
        this.line.style.top = `${adjustedBlipCenterY}px`;
        this.line.style.width = `${Math.sqrt(lineWidth * lineWidth + lineHeight * lineHeight)}px`;
    
        // Calculate the angle of the line and apply rotation
        const angle = Math.atan2(lineHeight, lineWidth) * (180 / Math.PI);
        this.line.style.transform = `rotate(${angle}deg)`;
    }
    
    updateLinePosition1() {
        const blipRect = this.element.getBoundingClientRect();
        const blipCenterX = blipRect.left + blipRect.width / 2;
        const blipCenterY = blipRect.top + blipRect.height / 2;
        const labelRect = this.label.getBoundingClientRect();
        const labelTopLeftX = labelRect.left;
        const labelTopLeftY = labelRect.top;

        // Get current pan offsets (dx, dy) from the panContainer
        const panMatrix = new WebKitCSSMatrix(window.getComputedStyle(panContainer).transform);
        const panX = panMatrix.m41;
        const panY = panMatrix.m42;

        // Adjust blip and label positions based on pan offsets
        const adjustedBlipCenterX = blipCenterX - panX;
        const adjustedBlipCenterY = blipCenterY - panY;
        const adjustedLabelTopLeftX = labelTopLeftX - panX;
        const adjustedLabelTopLeftY = labelTopLeftY - panY;

        // Calculate the width and height of the line
        const lineWidth = adjustedLabelTopLeftX - adjustedBlipCenterX;
        const lineHeight = adjustedLabelTopLeftY - adjustedBlipCenterY;

        // Update line position and size
        this.line.style.left = `${adjustedBlipCenterX}px`;
        this.line.style.top = `${adjustedBlipCenterY}px`;
        this.line.style.width = `${Math.sqrt(lineWidth * lineWidth + lineHeight * lineHeight)}px`;
        this.line.style.height = '1px'; // Assuming line height is 1px
        this.line.style.backgroundColor = 'grey';
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
    move(headingOnly = false) {
        const speedMetersPerSecond = (this.speed / zoomLevel) * 0.514444;
        const distancePerUpdateMeters = speedMetersPerSecond * (updateInterval / 1000);
        const distancePerUpdateNauticalMiles = distancePerUpdateMeters / 1852;

        // Handle orbit left
        if (this.orbitLeft) {
            this.heading = (this.heading - this.headingChangeRate * (headingUpdateInterval / 1000) + 360) % 360;
        }

        // Handle orbit right
        if (this.orbitRight) {
            this.heading = (this.heading + this.headingChangeRate * (headingUpdateInterval / 1000)) % 360;
        }

        // Handle gradual heading change if not orbiting
        if (!this.orbitLeft && !this.orbitRight && this.heading !== this.targetHeading) {
            let headingDiff = (this.targetHeading - this.heading + 360) % 360;
            const turnRate = this.headingChangeRate * (headingUpdateInterval / 1000);

            if (this.turnRight === true) {
                if (headingDiff > 180) {
                    headingDiff = 360 - headingDiff;
                    this.heading = (this.heading + turnRate) % 360;
                } else {
                    this.heading = (this.heading + turnRate) % 360;
                }
            } else if (this.turnRight === false) {
                if (headingDiff <= 180) {
                    headingDiff = 360 - headingDiff;
                    this.heading = (this.heading - turnRate + 360) % 360;
                } else {
                    this.heading = (this.heading - turnRate + 360) % 360;
                }
            }

            this.heading = (this.heading + 360) % 360;

            if (Math.abs(this.heading - this.targetHeading) <= turnRate) {
                this.heading = this.targetHeading;  // Snap to the target heading
            }
        }

        // Update heading in control box every 1 second
        updateControlBox(this);

        // If headingOnly is true, don't update the position on the radar
        if (headingOnly) {
            return;
        }

        // Update position based on the current heading (every 4 seconds)
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



//To add the dragging functionality to labels
let isLabelDragging = false; // Global flag to track label dragging

function dragElement(elmnt, blip) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    elmnt.onmousedown = (e) => {
        e.stopPropagation();  // Prevent panning on label click
        isLabelDragging = true;  // Set the flag to indicate label dragging
        dragMouseDown(e);
    };

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        isLabelDragging = false;  // Reset the flag when dragging ends

        // Update the label offset relative to the blip
        const blipRect = blip.element.getBoundingClientRect();
        const labelRect = elmnt.getBoundingClientRect();
        blip.labelOffset = {
            x: labelRect.left - blipRect.left,
            y: labelRect.top - blipRect.top
        };

        // Update the line to reflect the new label position
        blip.updateLinePosition();
    }
}



