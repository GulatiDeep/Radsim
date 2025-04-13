//********aircraft.js script file starts here**********/

//*****All variables and constants regarding aircraft handling and movmement of aircraft */


const updateInterval = 4000; // Update interval in milliseconds
const headingUpdateInterval = 1000;  // Heading update interval set to 1 second (1000 milliseconds)
const radarContextMenu = document.getElementById('radarContextMenu');

let selectedPosition = { x: 0, y: 0 }; // Initialize selectedPosition
let aircraftBlips = []; // To store all created aircraft blips
let radarCenter = { x: radarScope.offsetWidth / 2, y: radarScope.offsetHeight / 2 }; // Track radar center
let isPaused = false; // to initialise the exercise pause and resume button
let clickedPosition = { x: 0, y: 0 };
//let historyDotsVisible = true; // Initialize the flag to track the visibility state of the history dots
let labelsVisible = true; // //Initialize the flag to track the visibility state of the labels

let speedVectorMinutes = 0; // default value; can be set by user (0-5)

let allAircraftCallsigns = []; //to initialise the list of callsigns array

// A list to store previously generated positions
let previousPositions = [];

// Initialize counters for number of aircraft
let totalAircraftCount = 0;  // Count of all aircraft, including individual, transport, and formation members

let aircraftCountDisplay = null;

//To add the dragging functionality to labels
let isLabelDragging = false; // Global flag to track label dragging

let formationCallsigns = [
    "Limca", //1
    "Rhino", //2
    "Spider", //3
    "Thunder", //4
    "Maza", //5
    "Cobra", //6
    "Cola", //7
    "Khanjar", //8
    "Mica", //9
    "Loki", //10
    "Tusker" //11
];


// Set the initial state of the History button
//document.getElementById('historyDots').classList.add(historyDotsVisible ? 'active' : 'inactive');

// Set the initial state of the Label button
document.getElementById('label').classList.add(labelsVisible ? 'active' : 'inactive');

// Start the heading update loop
updateHeadingPeriodically();

// Start the movement update loop
moveAircraftBlips();


//********aircraft.js script file ends here**********/

//********aircraftBlipClass.js script file starts here**********/




// AircraftBlip class with all attributes regarding aircraft blip, label and leading line
class AircraftBlip {
    constructor(callsign, heading, speed, altitude, x, y, ssrCode) {
        this.callsign = callsign;
        this.ssrCode = ssrCode;
        this.originalSSRCode = (['7500', '7600', '7700'].includes(ssrCode)) ? '0000' : ssrCode; //to retain original ssr code
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

        //Speed Vectors
        this.speedVectorLine = document.createElement('div');
        this.speedVectorLine.className = 'speed-vector-line';
        this.speedVectorLine.style.position = 'absolute';
        this.speedVectorLine.style.zIndex = '1';
        this.speedVectorLine.style.borderTop = '1px solid white';
        this.speedVectorLine.style.transformOrigin = '0% 50%';
        this.speedVectorDots = []; // store dot references

        panContainer.appendChild(this.speedVectorLine);


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

        // Create blinking emergency circle
        this.emergencyCircle = document.createElement('div');
        this.emergencyCircle.className = 'emergency-circle';
        this.emergencyCircle.style.display = 'none'; // Hidden by default
        // ✅ Append to blip directly
        blip.appendChild(this.emergencyCircle);

        //Create STCA circle
        blip.currentSTCA = "none" | "predicted" | "actual"; //storing state of stca

        this.stcaHalo = document.createElement('div');
        this.stcaHalo.className = 'stca-halo'; // generic blinking circle
        this.stcaHalo.style.display = 'none';
        // ✅ Append to blip directly
        panContainer.appendChild(this.stcaHalo);


        // SSR-based styling
        if (this.ssrCode === '0000') {
            blip.classList.remove('aircraft-blip');
            blip.classList.add('plus-sign');
        } else {
            blip.classList.remove('plus-sign');
            blip.classList.add('aircraft-blip');
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
        line.style.backgroundColor = 'yellow';
        line.style.zIndex = '1';

        // Check the global labelsVisible flag and hide the line if it's false
        if (!labelsVisible) {
            line.style.display = 'none';
        }

        panContainer.appendChild(line);
        return line;
    }

    // Create history dot elements and append to the radar
    createHistoryDots1() {
        for (let i = 0; i < 20; i++) {
            const dot = document.createElement('div');
            dot.className = 'history-dot';
            panContainer.appendChild(dot);
            this.historyDots.push(dot);
        }
    }

    createHistoryDots() {
        for (let i = 0; i < currentHistoryDotCount; i++) {
            const dot = document.createElement('div');
            dot.className = 'history-dot';
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

        this.history.push({ x: this.position.x, y: this.position.y });

        if (this.history.length > currentHistoryDotCount) {
            this.history.shift();
        }

        this.updateHistoryDots();
        this.updateSpeedVector();
        this.updateSTCA();
    }

    updateSTCA() {
        if (this.stcaHalo) {
            this.stcaHalo.style.left = `${radarCenter.x + this.position.x * zoomLevel}px`;
            this.stcaHalo.style.top = `${radarCenter.y - this.position.y * zoomLevel}px`;
        }
    }


    updateSpeedVector() {
        // Remove old dots if any
        this.speedVectorDots.forEach(dot => dot.remove());
        this.speedVectorDots = [];

        if (!this.speedVectorLine || speedVectorMinutes === 0) {
            this.speedVectorLine.style.display = 'none';
            return;
        }

        const speedNMps = this.speed / 3600;
        const headingRad = this.heading * Math.PI / 180;

        const startX = this.position.x;
        const startY = this.position.y;
        const x1 = radarCenter.x + startX * zoomLevel;
        const y1 = radarCenter.y - startY * zoomLevel;

        // Line
        const finalX = startX + Math.sin(headingRad) * speedNMps * speedVectorMinutes * 60;
        const finalY = startY + Math.cos(headingRad) * speedNMps * speedVectorMinutes * 60;
        const x2 = radarCenter.x + finalX * zoomLevel;
        const y2 = radarCenter.y - finalY * zoomLevel;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        this.speedVectorLine.style.display = 'block';
        this.speedVectorLine.style.width = `${length}px`;
        this.speedVectorLine.style.left = `${x1}px`;
        this.speedVectorLine.style.top = `${y1}px`;
        this.speedVectorLine.style.height = '1px';
        this.speedVectorLine.style.borderTop = '0.8px solid white'; // thinner
        this.speedVectorLine.style.transform = `rotate(${angle}deg)`;

        // Dots at every minute
        for (let i = 1; i <= speedVectorMinutes; i++) {
            const t = i * 60; // seconds
            const dotX = startX + Math.sin(headingRad) * speedNMps * t;
            const dotY = startY + Math.cos(headingRad) * speedNMps * t;
            const screenX = radarCenter.x + dotX * zoomLevel;
            const screenY = radarCenter.y - dotY * zoomLevel;

            const dot = document.createElement('div');
            dot.className = 'speed-vector-dot';
            dot.style.position = 'absolute';
            dot.style.width = '4px';
            dot.style.height = '4px';
            dot.style.borderRadius = '50%';
            dot.style.backgroundColor = 'lime';
            dot.style.left = `${screenX - 2}px`; // center the dot
            dot.style.top = `${screenY - 2}px`;
            dot.style.zIndex = '1';

            panContainer.appendChild(dot);
            this.speedVectorDots.push(dot);
        }
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


    updateLabelInfo() {
        const level = Math.round(this.altitude / 100);
        const speed = this.speed;

        let arrow = '';

        if (this.altitude < this.targetAltitude) {
            arrow = '↑';  // Climbing
        } else if (this.altitude > this.targetAltitude) {
            arrow = '↓';  // Descending
        }

        const isEmergency = ['7500', '7600', '7700'].includes(this.ssrCode);
        const codeForMapping = isEmergency ? this.originalSSRCode : this.ssrCode;
        const mappedCallsign = ssrToCallsignMap[codeForMapping];

        let labelContent = '';

        // If it's a normal blip (not SSR 0000)
        if (this.ssrCode !== '0000') {
            if (mappedCallsign) {
                labelContent += `<strong>${mappedCallsign}</strong><br>`;
            }
            labelContent += `3-${this.ssrCode}<br>A${level} ${arrow}<br>N${speed}`;
        } else {
            // For unassigned SSR
            labelContent += `N${speed}`;
        }

        // Add STCA status line if applicable
        if (this.currentSTCA === 'predicted') {
            labelContent += `<br><span style="color: yellow;">PRED STCA</span>`;
        } else if (this.currentSTCA === 'actual') {
            labelContent += `<br><span style="color: red;">ACT STCA</span>`;
        }

        this.label.innerHTML = labelContent;
    }


    //Show Ident Effect on Squawking IDENT
    showIdentEffect() {
        // If already active, clear and remove
        if (this.identElements) {
            this.identElements.forEach(el => el.remove());
            this.identElements = null;
        }

        const offset = 4;   // Distance from blip
        const size = 6;     // Length of the diagonal lines
        const parent = this.element;

        const lines = [];

        const positions = [
            { x1: -offset, y1: -offset, x2: -offset - size, y2: -offset - size }, // Top-left
            { x1: offset, y1: -offset, x2: offset + size, y2: -offset - size },   // Top-right
            { x1: -offset, y1: offset, x2: -offset - size, y2: offset + size },   // Bottom-left
            { x1: offset, y1: offset, x2: offset + size, y2: offset + size }      // Bottom-right
        ];

        positions.forEach(pos => {
            const line = document.createElement('div');
            line.className = 'ident-line';
            line.style.transform = `translate(${pos.x1}px, ${pos.y1}px) rotate(${Math.atan2(pos.y2 - pos.y1, pos.x2 - pos.x1) * 180 / Math.PI}deg) scaleX(${Math.hypot(pos.x2 - pos.x1, pos.y2 - pos.y1)})`;
            parent.appendChild(line);
            lines.push(line);
        });

        this.identElements = lines;

        setTimeout(() => {
            lines.forEach(line => line.remove());
            this.identElements = null;
        }, 15000); // 15 seconds timeout
    }


    //Set the SSR code based on input
    setSSRCode(newSSRCode) {
        if (!['7500', '7600', '7700'].includes(newSSRCode)) {
            this.originalSSRCode = newSSRCode;
        }

        this.ssrCode = newSSRCode;
        this.element.remove();
        this.element = this.createBlipElement();
        this.updateBlipPosition();
        this.updateLabelInfo();
        this.updateColorBasedOnSSR();
        updateControlBox(this);
    }


    //Update the colour of label and blip based on SSR code like emergency codes
    updateColorBasedOnSSR() {
        const isEmergencySSR = ['7500', '7600', '7700'].includes(this.ssrCode);
        const isMappedSSR = ssrToCallsignMap[this.originalSSRCode] !== undefined;

        if (isEmergencySSR) {
            this.label.style.color = 'red';
            this.line.style.backgroundColor = 'red';
            this.element.style.backgroundColor = 'red';
            this.historyDots.forEach(dot => dot.style.backgroundColor = 'red');
            this.emergencyCircle.style.display = 'block'; // 🔴 show ring
        } else if (isMappedSSR) {
            this.label.style.color = 'hotpink';
            this.line.style.backgroundColor = 'hotpink';
            this.element.style.backgroundColor = 'hotpink';
            this.historyDots.forEach(dot => dot.style.backgroundColor = 'hotpink');
            this.emergencyCircle.style.display = 'none';
        } else {
            this.label.style.color = 'yellow';
            this.line.style.backgroundColor = 'yellow';
            this.line.style.opacity = '25%';
            this.element.style.backgroundColor = 'yellow';
            this.historyDots.forEach(dot => dot.style.backgroundColor = 'yellow');
            this.emergencyCircle.style.display = 'none';
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
        this.historyDots.forEach(dot => {
            dot.style.display = 'block'; // or whatever is your default display
        });

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

        const now = performance.now(); // High-resolution timestamp in milliseconds
        if (!this.lastUpdate) this.lastUpdate = now; // Initialize timestamp on first call

        const elapsedSeconds = (now - this.lastUpdate) / 1000; // Calculate elapsed time in seconds
        this.lastUpdate = now; // Update the last timestamp

        if (isPaused) return;  // Stop any movement or state updates if paused

        // Handle orbit left
        if (this.orbitLeft) {
            this.heading = (this.heading - this.headingChangeRate * (elapsedSeconds) + 360) % 360;
        }

        // Handle orbit right
        if (this.orbitRight) {
            this.heading = (this.heading + this.headingChangeRate * (elapsedSeconds)) % 360;
        }

        // Handle gradual heading change if not orbiting
        if (!this.orbitLeft && !this.orbitRight && this.heading !== this.targetHeading) {
            let headingDiff = (this.targetHeading - this.heading + 360) % 360;
            const turnRate = this.headingChangeRate * (elapsedSeconds);

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


        //for shifting the focus on associated input box for command to clicked aircraft blip
        this.element.addEventListener('click', () => {
            focusControlBoxInput(this.callsign);
        });
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
