let stcaEnabled = true;

const predictedConflicts = new Set();
const horizontalSeparationNM = 8;
const verticalSeparationFT = 1000;
const lookaheadSeconds = 120;
const actualConflicts = new Set();


function predictPosition(blip, seconds) {
    const speedNMps = blip.speed / 3600; // knots to NM/s
    const verticalRateFps = (blip.verticalClimbDescendRate || 0) / 60; // ft/s
    const headingRad = blip.heading * Math.PI / 180;

    // Estimate climb/descent based on current trend
    const climbDir = (blip.targetAltitude > blip.altitude) ? 1 : (blip.targetAltitude < blip.altitude ? -1 : 0);
    const predictedAltitude = blip.altitude + climbDir * verticalRateFps * seconds;

    return {
        x: blip.position.x + Math.sin(headingRad) * speedNMps * seconds,
        y: blip.position.y + Math.cos(headingRad) * speedNMps * seconds,
        altitude: predictedAltitude
    };
}

function checkPredictedConflict(a, b) {
    const step = 10; // check every 10 seconds
    const verticalRateA = (a.verticalClimbDescendRate || 0) / 60; // ft/sec
    const verticalRateB = (b.verticalClimbDescendRate || 0) / 60;

    const climbDirA = a.targetAltitude > a.altitude ? 1 : a.targetAltitude < a.altitude ? -1 : 0;
    const climbDirB = b.targetAltitude > b.altitude ? 1 : b.targetAltitude < b.altitude ? -1 : 0;

    for (let t = 0; t <= lookaheadSeconds; t += step) {
        const posA = predictPosition(a, t);
        const posB = predictPosition(b, t);

        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const horizontalDistance = Math.sqrt(dx * dx + dy * dy);

        const altA = a.altitude + climbDirA * verticalRateA * t;
        const altB = b.altitude + climbDirB * verticalRateB * t;
        const verticalDistance = Math.abs(altA - altB);

        if (horizontalDistance < horizontalSeparationNM && verticalDistance < verticalSeparationFT) {
            return true; // conflict predicted
        }
    }
    return false;
}

function checkActualConflict(a, b) {
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    const dz = a.altitude - b.altitude;

    const horizontalDistance = Math.sqrt(dx * dx + dy * dy);
    const verticalDistance = Math.abs(dz);

    return horizontalDistance < horizontalSeparationNM && verticalDistance < verticalSeparationFT;
}



function triggerPredictedSTCA(a, b) {
    if (a.stcaHalo) {
        a.stcaHalo.style.display = 'block';
        a.stcaHalo.style.backgroundColor = 'rgba(255, 255, 0, 0.5)'; // yellow
    }
    if (b.stcaHalo) {
        b.stcaHalo.style.display = 'block';
        b.stcaHalo.style.backgroundColor = 'rgba(255, 255, 0, 0.5)'; // yellow
    }
}

function triggerActualSTCA(a, b) {
    if (a.stcaHalo) {
        a.stcaHalo.style.display = 'block';
        a.stcaHalo.style.backgroundColor = 'rgba(255, 0, 0, 0.5)'; // red
    }
    if (b.stcaHalo) {
        b.stcaHalo.style.display = 'block';
        b.stcaHalo.style.backgroundColor = 'rgba(255, 0, 0, 0.5)'; // red
    }
}


function clearSTCA(a, b) {
    if (a.stcaHalo) a.stcaHalo.style.display = 'none';
    if (b.stcaHalo) b.stcaHalo.style.display = 'none';
}



function runSTCACheck() {
    if (!stcaEnabled) return;
    
    const newPredicted = new Set();
    const newActual = new Set();

    for (let i = 0; i < aircraftBlips.length; i++) {
        for (let j = i + 1; j < aircraftBlips.length; j++) {
            const a = aircraftBlips[i];
            const b = aircraftBlips[j];
            const key = `${a.callsign}|${b.callsign}`;

            if (checkActualConflict(a, b)) {
                newActual.add(key);
                triggerActualSTCA(a, b);
            } else if (checkPredictedConflict(a, b)) {
                newPredicted.add(key);
                triggerPredictedSTCA(a, b);
            } else {
                clearSTCA(a, b);
            }
        }
    }

    predictedConflicts.clear();
    newPredicted.forEach(key => predictedConflicts.add(key));
    actualConflicts.clear();
    newActual.forEach(key => actualConflicts.add(key));

    drawSTCALines(); // now includes both red and yellow
}




function drawSTCALines() {
    const canvas = document.getElementById("stcaCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Yellow lines for predicted
    predictedConflicts.forEach(key => {
        const [c1, c2] = key.split("|");
        const blip1 = aircraftBlips.find(b => b.callsign === c1);
        const blip2 = aircraftBlips.find(b => b.callsign === c2);
        if (!blip1 || !blip2) return;

        const x1 = radarCenter.x + blip1.position.x * zoomLevel;
        const y1 = radarCenter.y - blip1.position.y * zoomLevel;
        const x2 = radarCenter.x + blip2.position.x * zoomLevel;
        const y2 = radarCenter.y - blip2.position.y * zoomLevel;

        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });

    // Red lines for actual
    actualConflicts.forEach(key => {
        const [c1, c2] = key.split("|");
        const blip1 = aircraftBlips.find(b => b.callsign === c1);
        const blip2 = aircraftBlips.find(b => b.callsign === c2);
        if (!blip1 || !blip2) return;

        const x1 = radarCenter.x + blip1.position.x * zoomLevel;
        const y1 = radarCenter.y - blip1.position.y * zoomLevel;
        const x2 = radarCenter.x + blip2.position.x * zoomLevel;
        const y2 = radarCenter.y - blip2.position.y * zoomLevel;

        ctx.strokeStyle = "red";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });
}


setInterval(runSTCACheck, 1000);

