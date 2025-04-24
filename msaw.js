// ===========================
// MSAW CONFIGURATION & SETUP
// ===========================

// Enable or disable MSAW globally
let msawEnabled = true;

// Default minimum safe altitude (in feet)
let minimumSafeAltitudeFT = 2000;

// Sets to track current MSAW conflicts
const predictedMSAWConflicts = new Set();
const actualMSAWConflicts = new Set();

// How far ahead to predict (in seconds)
let lookaheadSecondsMSAW = 120;

//Initialise radar Audio context to play the beep sound through browser
let radarAudioContext = null;


/**
 * Main MSAW conflict check — detects actual and predicted infringements.
 * Runs periodically via setInterval.
 */
function runMSAWCheck() {
    if (!msawEnabled) return;

    // Reset MSAW state for this cycle
    aircraftBlips.forEach(blip => {
        blip.currentMSAW = "none";
    });

    const newActual = new Set();
    const newPredicted = new Set();

    // Predict positions ahead
    const positionCache = {};
    aircraftBlips.forEach(blip => {
        positionCache[blip.callsign] = {};
        for (let t = 0; t <= lookaheadSecondsMSAW; t += 10) {
            positionCache[blip.callsign][t] = predictPosition(blip, t);
        }
    });

    // Actual infringement check — below MSA by 200 ft or more
    aircraftBlips.forEach(blip => {
        const key = `MSAW|${blip.callsign}`;
        if (inhibitedAlerts.has(key)) return; // skip processing but still show blue msg

        if (blip.altitude <= (minimumSafeAltitudeFT - 200)) {
            newActual.add(blip.callsign);
            triggerActualMSAW(blip);
            updateMSAWRoaster(blip.callsign, "actual");
        }
    });


    // Predicted infringement check within lookahead time
    for (let t = 0; t <= lookaheadSecondsMSAW; t += 10) {
        aircraftBlips.forEach(blip => {
            const predictedAlt = positionCache[blip.callsign][t].altitude;
            if (isInhibited(`MSAW|${blip.callsign}`)) return;


            if (predictedAlt <= (minimumSafeAltitudeFT - 200)) {
                if (!newActual.has(blip.callsign)) {
                    const key = `MSAW|${blip.callsign}`;
                    if (!inhibitedAlerts.has(key)) {
                        newPredicted.add(blip.callsign);
                        triggerPredictedMSAW(blip);
                    }
                    updateMSAWRoaster(blip.callsign, "predicted"); // show roaster in yellow or blue
                }

            }
        });
    }

    // Update conflict sets
    predictedMSAWConflicts.clear();
    newPredicted.forEach(c => predictedMSAWConflicts.add(c));

    actualMSAWConflicts.clear();
    newActual.forEach(c => actualMSAWConflicts.add(c));

    // Clear halos for resolved conflicts
    aircraftBlips.forEach(blip => {
        // If not in actual or predicted conflict
        if (!newActual.has(blip.callsign) && !newPredicted.has(blip.callsign)) {
            // Clear only if the aircraft has climbed back to the MSA
            const key = `MSAW|${blip.callsign}`;
            if (blip.altitude >= minimumSafeAltitudeFT) {
                clearMSAW(blip);
                if (!inhibitedAlerts.has(key)) {
                    removeMSAWRoaster(blip.callsign);
                }
            }

        }
    });

    const roasterBox = document.getElementById("alertRoasterBox");
    roasterBox.style.display = roasterBox.children.length > 0 ? "block" : "none";


}



/**
 * Triggers a predicted MSAW alert — yellow halo.
 */
function triggerPredictedMSAW(blip) {
    if (blip.msawHalo) {
        blip.msawHalo.style.display = 'block';
        blip.msawHalo.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
    }
    blip.currentMSAW = "predicted";
    blip.updateLabelInfo();
    playBeepSound();
}


/**
 * Triggers an actual MSAW alert — red halo + sound.
 */
function triggerActualMSAW(blip) {
    if (blip.msawHalo) {
        blip.msawHalo.style.display = 'block';
        blip.msawHalo.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
    }
    blip.currentMSAW = "actual";
    blip.updateLabelInfo();
    playBeepSound();
}


/**
 * Clears MSAW visual and status if no conflict.
 */
function clearMSAW(blip) {
    if (blip.msawHalo) {
        blip.msawHalo.style.display = 'none';
    }
    blip.currentMSAW = "none";
    blip.updateLabelInfo();
}


/**
 * Plays an MSAW warning sound.
 */
function playBeepSound() {
    if (!radarAudioContext) return; // if not initialized, skip

    const oscillator = radarAudioContext.createOscillator();
    const gainNode = radarAudioContext.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(600, radarAudioContext.currentTime);
    gainNode.gain.setValueAtTime(0.2, radarAudioContext.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(radarAudioContext.destination);

    oscillator.start();
    oscillator.stop(radarAudioContext.currentTime + 0.2);
}


setInterval(runMSAWCheck, 1000);

const lastMSAWTypeMap = new Map();

function updateMSAWRoaster(callsign, type) {
    const box = document.getElementById("alertRoasterBox");
    const key = `MSAW|${callsign}`;
    const id = `roaster-${key.replace("|", "-")}`;
    let entry = document.getElementById(id);

    const prevType = lastMSAWTypeMap.get(key);
    if (prevType === "actual" || type === "actual") {
        lastMSAWTypeMap.set(key, "actual");
        type = "actual";
    }

    const isInhibitedNow = isInhibited(key);
    const newText = `${type === "actual" ? "Actual MSAW" : "Predicted MSAW"}: ${callsign}`;
    const newClass = `roaster-entry ${isInhibitedNow ? "roaster-blue" : (type === "actual" ? "roaster-red" : "roaster-yellow")}`;

    if (!entry) {
        entry = document.createElement("div");
        entry.id = id;
        entry.textContent = newText;
        entry.className = newClass;
        entry.ondblclick = () => {
            if (!isInhibited(key)) {
                inhibitedAlerts.set(key, Date.now() + 60000);
                clearMSAWByCallsign(callsign);
                updateMSAWRoaster(callsign, lastMSAWTypeMap.get(key) || type);
            }
        };
        box.appendChild(entry);
    } else if (entry.textContent !== newText || entry.className !== newClass) {
    entry.textContent = newText;
    entry.className = newClass;
    //console.log("Updated MSAW Roaster", key);
}

}






function removeMSAWRoaster(callsign) {
    const key = `MSAW|${callsign}`;
    const entry = document.getElementById(`roaster-${key.replace("|", "-")}`);
    if (entry) entry.remove();
}

function clearMSAWByCallsign(callsign) {
    const blip = aircraftBlips.find(b => b.callsign === callsign);
    if (blip) clearMSAW(blip);
}



