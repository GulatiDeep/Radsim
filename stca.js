// Enable or disable STCA globally
let stcaEnabled = true;

// Sets to track current conflict pairs
const predictedConflicts = new Set();
const actualConflicts = new Set();

// Separation criteria (STCA thresholds)
let horizontalSeparationNM = 8;      // in nautical miles
let verticalSeparationFT = 1000;     // in feet
let lookaheadSeconds = 120;          // seconds into the future for conflict prediction


/**
 * Predicts the future position and altitude of an aircraft blip after a given number of seconds.
 * This is used for STCA predicted conflict detection.
 *
 * @param {Object} blip - The aircraft blip object containing position, speed, heading, altitude etc.
 * @param {number} seconds - How many seconds into the future to predict the position for.
 * @returns {Object} Predicted position and altitude at the given future time.
 */
function predictPosition(blip, seconds) {
    // Convert aircraft's speed from knots to nautical miles per second
    const speedNMps = blip.speed / 3600;

    // Convert vertical climb/descent rate from feet per minute to feet per second
    const verticalRateFps = (blip.verticalClimbDescendRate || 0) / 60;

    // Convert heading from degrees to radians (for trigonometric calculations)
    const headingRad = blip.heading * Math.PI / 180;

    // Determine climb direction:
    // +1 if climbing towards targetAltitude
    // -1 if descending towards targetAltitude
    // 0 if already at targetAltitude
    const climbDir = (blip.targetAltitude > blip.altitude) ? 1 : (blip.targetAltitude < blip.altitude ? -1 : 0);

    // Calculate predicted altitude after 'seconds' seconds based on climbDir and vertical rate
    const predictedAltitude = blip.altitude + climbDir * verticalRateFps * seconds;

    // Calculate predicted X and Y positions based on heading and speed
    return {
        x: blip.position.x + Math.sin(headingRad) * speedNMps * seconds, // displacement along X-axis
        y: blip.position.y + Math.cos(headingRad) * speedNMps * seconds, // displacement along Y-axis
        altitude: predictedAltitude  // predicted altitude at the future time
    };
}



/**
 * Checks for predicted conflicts between every unique pair of aircraft at a specific future time 't'.
 *
 * Uses precomputed predicted positions from the positionCache.
 *
 * @param {number} t - The future time (in seconds) at which to check for conflicts.
 * @param {Object} positionCache - A nested object mapping callsigns to predicted positions by time.
 * @returns {Array} An array of conflict pairs (objects containing { a, b }).
 */
function checkPredictedConflictsAtTime(t, positionCache) {
    const conflictsAtTime = []; // List to store detected conflict pairs at this time

    // Loop through every unique aircraft pair (no repeats)
    for (let i = 0; i < aircraftBlips.length; i++) {
        for (let j = i + 1; j < aircraftBlips.length; j++) {
            const a = aircraftBlips[i];
            const b = aircraftBlips[j];

            // Get cached predicted positions at time 't' for both aircraft
            const posA = positionCache[a.callsign][t];
            const posB = positionCache[b.callsign][t];

            // Calculate horizontal distance between the two positions (Pythagoras)
            const dx = posA.x - posB.x;
            const dy = posA.y - posB.y;
            const horizontalDistance = Math.sqrt(dx * dx + dy * dy);

            // Calculate vertical distance (altitude difference)
            const verticalDistance = Math.abs(posA.altitude - posB.altitude);

            // Check if both horizontal and vertical separation minima are breached
            if (horizontalDistance < horizontalSeparationNM && verticalDistance < verticalSeparationFT) {
                // If conflict detected, store this pair in the result array
                conflictsAtTime.push({ a, b });
            }
        }
    }

    // Return the list of conflict pairs for this prediction time
    return conflictsAtTime;
}


/**
 * Checks whether two aircraft are currently in actual conflict (right now).
 *
 * Uses current live positions and altitudes to determine if separation minima are violated.
 *
 * @param {Object} a - First aircraft blip.
 * @param {Object} b - Second aircraft blip.
 * @returns {boolean} True if actual conflict exists, false otherwise.
 */
function checkActualConflict(a, b) {
    // Calculate horizontal distance (Pythagoras)
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    const horizontalDistance = Math.sqrt(dx * dx + dy * dy);

    // Calculate vertical distance (altitude difference)
    const dz = a.altitude - b.altitude;
    const verticalDistance = Math.abs(dz);

    // Return true if both horizontal and vertical separation minima are violated
    return horizontalDistance < horizontalSeparationNM && verticalDistance < verticalSeparationFT;
}



/**
 * Calculates conflict details between two aircraft:
 * - Current range (distance)
 * - Bearing from one to the other
 * - Time to Closest Point of Approach (CPA)
 * 
 * @param {Object} a - First aircraft blip.
 * @param {Object} b - Second aircraft blip.
 * @returns {Object} Conflict metrics: range (NM), bearing (degrees), CPA time (seconds)
 */
function calculateConflictDetails(a, b) {
    // Convert headings from degrees to radians for trigonometric calculations
    const radA = a.heading * Math.PI / 180;
    const radB = b.heading * Math.PI / 180;

    // Calculate position difference (in nautical miles)
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;

    // Calculate velocity components (in NM/sec) for both aircraft
    const vxA = (a.speed / 3600) * Math.sin(radA);
    const vyA = (a.speed / 3600) * Math.cos(radA);
    const vxB = (b.speed / 3600) * Math.sin(radB);
    const vyB = (b.speed / 3600) * Math.cos(radB);

    // Calculate relative velocity components
    const dvx = vxB - vxA;
    const dvy = vyB - vyA;

    // Compute current horizontal distance (range) between aircraft (Pythagoras)
    const range = Math.sqrt(dx * dx + dy * dy);

    // Compute bearing from aircraft A to B (0-360°)
    const bearing = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;

    // Compute relative speed squared
    const relativeSpeedSq = dvx * dvx + dvy * dvy;

    // Initialize time to CPA (seconds)
    let cpaTime = 0;

    // If aircraft are moving relative to each other, calculate CPA time
    if (relativeSpeedSq > 0) {
        // Compute dot product of position difference and relative velocity
        const dot = dx * dvx + dy * dvy;

        // Calculate time to CPA
        cpaTime = -dot / relativeSpeedSq;

        // If CPA is in the past, set it to 0 (meaning now)
        if (cpaTime < 0) cpaTime = 0;
    }

    // Predict positions of both aircraft at CPA time
    const axCPA = a.position.x + vxA * cpaTime;
    const ayCPA = a.position.y + vyA * cpaTime;
    const bxCPA = b.position.x + vxB * cpaTime;
    const byCPA = b.position.y + vyB * cpaTime;

    // Calculate distance between them at CPA
    const cpaDistance = Math.hypot(axCPA - bxCPA, ayCPA - byCPA);

    // Return conflict details: current range, bearing, and time to CPA
    return {
        range: range.toFixed(1),                 // 1 decimal precision
        bearing: Math.round(bearing),            // Rounded bearing in degrees
        cpaTime: `${Math.round(cpaTime)} seconds` // Time to CPA, rounded to nearest second
    };
}


/**
 * Activates a predicted STCA (Short Term Conflict Alert) for a pair of aircraft.
 * 
 * Displays a yellow halo around both blips if not already showing an actual conflict.
 * Updates the blip’s label info to reflect the STCA state.
 * 
 * @param {Object} a - First aircraft blip.
 * @param {Object} b - Second aircraft blip.
 */
function triggerPredictedSTCA(a, b) {
    [a, b].forEach(blip => {
        // Only trigger predicted STCA if it isn't already flagged as an actual conflict
        if (blip.currentSTCA !== 'actual' && blip.stcaHalo) {
            blip.stcaHalo.style.display = 'block';
            blip.stcaHalo.style.backgroundColor = 'rgba(255, 255, 0, 0.3)'; // Yellow halo for predicted conflict
            blip.currentSTCA = 'predicted'; // Update state
            blip.updateLabelInfo();         // Refresh label with STCA status
        }
    });
}


/**
 * Activates an actual STCA (Short Term Conflict Alert) for a pair of aircraft.
 * 
 * Displays a red halo around both blips, giving it precedence over any predicted conflicts.
 * Updates the blip’s label info to reflect the STCA state.
 * 
 * @param {Object} a - First aircraft blip.
 * @param {Object} b - Second aircraft blip.
 */
function triggerActualSTCA(a, b) {
    [a, b].forEach(blip => {
        if (blip.stcaHalo) {
            blip.stcaHalo.style.display = 'block';
            blip.stcaHalo.style.backgroundColor = 'rgba(255, 0, 0, 0.5)'; // Red halo for actual conflict
            blip.currentSTCA = 'actual'; // Update state (takes precedence)
            blip.updateLabelInfo();      // Refresh label with STCA status
        }
    });
}


/**
 * Draws visual conflict lines on the STCA radar canvas.
 * 
 * - Yellow solid lines for predicted conflicts.
 * - Red solid lines for actual conflicts.
 */
function drawSTCALines() {
    // Get the canvas element used for drawing STCA lines
    const canvas = document.getElementById("stcaCanvas");
    if (!canvas) return; // Exit if canvas is not found

    const ctx = canvas.getContext("2d");

    // Clear the entire canvas before redrawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ======================
    // Draw predicted conflicts
    // ======================
    predictedConflicts.forEach(key => {
        // Split the conflict key into two callsigns
        const [c1, c2] = key.split("|");

        // Find the two blips (aircraft) by their callsigns
        const blip1 = aircraftBlips.find(b => b.callsign === c1);
        const blip2 = aircraftBlips.find(b => b.callsign === c2);
        if (!blip1 || !blip2) return; // Skip if either blip is missing

        // Convert blip positions to canvas coordinates
        const x1 = radarCenter.x + blip1.position.x * zoomLevel;
        const y1 = radarCenter.y - blip1.position.y * zoomLevel;
        const x2 = radarCenter.x + blip2.position.x * zoomLevel;
        const y2 = radarCenter.y - blip2.position.y * zoomLevel;

        // Draw yellow line between the two aircraft
        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([]); // solid line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });

    // ===================
    // Draw actual conflicts
    // ===================
    actualConflicts.forEach(key => {
        // Split the conflict key into two callsigns
        const [c1, c2] = key.split("|");

        // Find the two blips (aircraft) by their callsigns
        const blip1 = aircraftBlips.find(b => b.callsign === c1);
        const blip2 = aircraftBlips.find(b => b.callsign === c2);
        if (!blip1 || !blip2) return; // Skip if either blip is missing

        // Convert blip positions to canvas coordinates
        const x1 = radarCenter.x + blip1.position.x * zoomLevel;
        const y1 = radarCenter.y - blip1.position.y * zoomLevel;
        const x2 = radarCenter.x + blip2.position.x * zoomLevel;
        const y2 = radarCenter.y - blip2.position.y * zoomLevel;

        // Draw red line between the two aircraft
        ctx.strokeStyle = "red";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]); // solid line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });
}


/**
 * Updates or creates an entry in the STCA Roaster display for a conflict pair.
 * 
 * Displays conflict type (predicted/actual), callsigns involved, current range, bearing, and CPA time.
 *
 * @param {string} key - Unique conflict key in the form "CALLSIGN1|CALLSIGN2"
 * @param {string} type - 'predicted' or 'actual'
 * @param {Object} a - First aircraft blip
 * @param {Object} b - Second aircraft blip
 */
function updateRoaster(key, type, a, b) {
    // Get the container element for the STCA roaster display
    const box = document.getElementById("stcaRoasterBox");

    // Try to find an existing entry for this conflict pair
    let entry = document.getElementById(`roaster-${key.replace("|", "-")}`);

    // Calculate conflict details (range, bearing, CPA time) between the two aircraft
    const { range, bearing, cpaTime } = calculateConflictDetails(a, b);

    // Determine the color class based on conflict type (red for actual, yellow for predicted)
    const colorClass = type === "actual" ? "roaster-red" : "roaster-yellow";

    // Construct the text label to display in the roaster
    const label = `${type === "actual" ? "Actual STCA" : "Predicted STCA"}: ${a.callsign} ↔ ${b.callsign} | ${range} NM / ${bearing}° | CPA in ${cpaTime}`;

    // If no existing entry for this conflict, create a new one
    if (!entry) {
        entry = document.createElement("div"); // Create a new div element
        entry.id = `roaster-${key.replace("|", "-")}`; // Unique ID based on conflict key
        entry.className = `roaster-entry ${colorClass}`; // Apply appropriate color class
        box.appendChild(entry); // Add it to the roaster box
    }

    // Update the text content and style class for the entry (for both new and existing)
    entry.textContent = label;
    entry.className = `roaster-entry ${colorClass}`;
}



/**
 * Main Short Term Conflict Alert (STCA) check loop.
 * 
 * Runs once every second via setInterval — detects both actual and predicted conflicts,
 * manages conflict sets, updates visuals (halos, roaster), and draws conflict lines.
 */
function runSTCACheck() {
    // Exit early if STCA system is currently disabled
    if (!stcaEnabled) return;

    // Reset each blip’s STCA state to 'none' before processing this cycle
    aircraftBlips.forEach(blip => {
        blip.currentSTCA = "none";
    });

    // Temporary sets to track new conflicts detected this cycle
    const newPredicted = new Set();
    const newActual = new Set();

    // Cache predicted positions for each aircraft at multiple future time intervals
    // Structure: { callsign: { t: { x, y, altitude } } }
    const positionCache = {};
    aircraftBlips.forEach(blip => {
        positionCache[blip.callsign] = {};
        for (let t = 0; t <= lookaheadSeconds; t += 10) {
            positionCache[blip.callsign][t] = predictPosition(blip, t);
        }
    });

    // ========================================
    // Check for actual conflicts (current state)
    // ========================================
    for (let i = 0; i < aircraftBlips.length; i++) {
        for (let j = i + 1; j < aircraftBlips.length; j++) {
            const a = aircraftBlips[i];
            const b = aircraftBlips[j];
            const key = `${a.callsign}|${b.callsign}`;

            // Skip if both aircraft are in the same formation (same base callsign)
            if (getFormationCallsign(a.callsign) === getFormationCallsign(b.callsign)) {
                continue; // Both aircraft are in the same formation, skip conflict check
            }

            // If actual conflict detected — add to actual set and trigger visual + roaster update
            if (checkActualConflict(a, b)) {
                newActual.add(key);
                triggerActualSTCA(a, b);
                updateRoaster(key, 'actual', a, b);
            }
        }
    }

    // =============================================
    // Check for predicted conflicts using cache
    // =============================================
    for (let t = 0; t <= lookaheadSeconds; t += 10) {
        const conflictsAtTime = checkPredictedConflictsAtTime(t, positionCache);

        // For every predicted conflict pair at time 't'
        conflictsAtTime.forEach(({ a, b }) => {
            const key = `${a.callsign}|${b.callsign}`;

            // Skip if both aircraft are in the same formation (same base callsign)
            if (getFormationCallsign(a.callsign) === getFormationCallsign(b.callsign)) {
                return; // Both aircraft are in the same formation, skip conflict check
            }

            // Only add to predicted conflicts if it wasn't already flagged as an actual conflict
            if (!newActual.has(key)) {
                newPredicted.add(key);
                triggerPredictedSTCA(a, b);
                updateRoaster(key, 'predicted', a, b);
            }
        });
    }

    // =============================================
    // Update global conflict sets for this cycle
    // =============================================
    predictedConflicts.clear();
    newPredicted.forEach(key => predictedConflicts.add(key));

    actualConflicts.clear();
    newActual.forEach(key => actualConflicts.add(key));

    // ====================================================
    // Clear halos and roaster entries for resolved conflicts
    // ====================================================
    for (let i = 0; i < aircraftBlips.length; i++) {
        for (let j = i + 1; j < aircraftBlips.length; j++) {
            const a = aircraftBlips[i];
            const b = aircraftBlips[j];
            const key = `${a.callsign}|${b.callsign}`;

            // If pair is not in actual or predicted conflict sets — clear its visuals
            if (!newActual.has(key) && !newPredicted.has(key)) {
                clearSTCA(a, b);
                removeRoaster(key);
            }
        }
    }

    // ========================================
    // Show or hide the STCA Roaster box as needed
    // ========================================
    const roasterBox = document.getElementById("stcaRoasterBox");
    if (newActual.size + newPredicted.size > 0) {
        roasterBox.style.display = "block"; // Show if any conflicts exist
    } else {
        roasterBox.style.display = "none";  // Hide if no conflicts
    }

    // =============================
    // Draw updated STCA conflict lines
    // =============================
    drawSTCALines();
}

/**
 * Clears STCA status and visuals for a pair of aircraft if no conflicts remain.
 * 
 * If a blip is still in a predicted conflict, it falls back to predicted state (yellow).
 * Otherwise, its halo is hidden and STCA state reset.
 *
 * @param {Object} a - First aircraft blip
 * @param {Object} b - Second aircraft blip
 */
function clearSTCA(a, b) {
    [a, b].forEach(blip => {
        // Check if this blip is still involved in any predicted conflicts
        const stillInPredicted = [...predictedConflicts].some(key => key.includes(blip.callsign));

        // Check if this blip is still involved in any actual conflicts
        const stillInActual = [...actualConflicts].some(key => key.includes(blip.callsign));

        // If no conflicts remain, hide the halo and reset status
        if (!stillInActual && !stillInPredicted && blip.stcaHalo) {
            blip.stcaHalo.style.display = 'none';
            blip.currentSTCA = 'none';
            blip.updateLabelInfo();
        }
        // If only predicted conflicts remain, fall back to predicted halo (yellow)
        else if (!stillInActual && stillInPredicted && blip.stcaHalo) {
            blip.stcaHalo.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
            blip.currentSTCA = 'predicted';
            blip.updateLabelInfo();
        }
    });
}


/**
 * Removes a conflict entry from the STCA Roaster UI based on conflict key.
 *
 * @param {string} key - The conflict pair key in the form "CALLSIGN1|CALLSIGN2"
 */
function removeRoaster(key) {
    // Find the existing roaster entry div by its unique ID
    const entry = document.getElementById(`roaster-${key.replace("|", "-")}`);
    
    // If it exists, remove it from the DOM
    if (entry) entry.remove();
}


/**
 * Cleans up all conflict data, visuals, and roaster entries related to a deleted aircraft.
 * 
 * Removes its associated conflicts from both predicted and actual sets,
 * clears any related roaster entries, and updates remaining blips accordingly.
 *
 * @param {string} deletedCallsign - The callsign of the aircraft being removed
 */
function cleanUpConflictsForDeletedBlip(deletedCallsign) {
    const affectedBlips = new Set(); // Keep track of other blips involved in conflicts with this one

    // Remove predicted conflicts involving the deleted callsign
    [...predictedConflicts].forEach(key => {
        if (key.includes(deletedCallsign)) {
            const [c1, c2] = key.split("|");
            const otherCallsign = (c1 === deletedCallsign) ? c2 : c1;
            affectedBlips.add(otherCallsign); // Record affected partner blip
            predictedConflicts.delete(key);   // Remove the conflict pair
            removeRoaster(key);               // Remove from roaster UI
        }
    });

    // Remove actual conflicts involving the deleted callsign
    [...actualConflicts].forEach(key => {
        if (key.includes(deletedCallsign)) {
            const [c1, c2] = key.split("|");
            const otherCallsign = (c1 === deletedCallsign) ? c2 : c1;
            affectedBlips.add(otherCallsign); // Record affected partner blip
            actualConflicts.delete(key);      // Remove the conflict pair
            removeRoaster(key);               // Remove from roaster UI
        }
    });

    // For every affected blip previously in conflict with the deleted blip
    affectedBlips.forEach(callsign => {
        const blip = aircraftBlips.find(b => b.callsign === callsign);
        if (blip) {
            // Check if this blip is still in any conflicts
            const stillInPredicted = [...predictedConflicts].some(key => key.includes(callsign));
            const stillInActual = [...actualConflicts].some(key => key.includes(callsign));

            // If no conflicts remain, hide halo and reset state
            if (!stillInPredicted && !stillInActual && blip.stcaHalo) {
                blip.stcaHalo.style.display = 'none';
                blip.currentSTCA = 'none';
                blip.updateLabelInfo();
            }
        }
    });
}


/**
 * Schedules the runSTCACheck function to run continuously at a regular interval.
 *
 * In this case, it triggers once every 1000 milliseconds (1 second),
 * continuously checking for actual and predicted conflicts,
 * updating visuals, STCA roaster entries, and radar lines.
 */
setInterval(runSTCACheck, 1000);




