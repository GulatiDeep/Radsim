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

            if (!callsign) return;

            // ✅ Case 1: Both SSR & Callsign provided → map normally (secondary)
            if (ssr && isValidSquawkCode(ssr)) {
                addMappingToTable(ssr, callsign);
                return;
            }

            // ✅ Case 2: Only Callsign provided, and primary aircraft is hooked
            if (!ssr && hookedBlip && hookedBlip.ssrCode === '0000') {
                addPrimaryMapping(hookedBlip, callsign);
                return;
            }

            // ❌ Else, show message
            alert("Please provide a valid SSR code or hook a primary aircraft to map.");
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

        //updateMappingInputsBasedOnHookedAircraft(); // 🟢 Call the new function to auto-prepare inputs

    } else {
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




// Add at the top
const primarySSRMapping = {}; // Key: aircraft.id, Value: callsign

function addPrimaryMapping(blip, callsign) {
    if (!blip || blip.ssrCode !== '0000') {
        alert("You can only map aircraft with SSR code 0000.");
        return;
    }

    if (primarySSRMapping[blip.id]) {
        alert("This aircraft is already mapped.");
        return;
    }

    primarySSRMapping[blip.id] = callsign;
    updatePrimaryMappingTable();

    blip.updateLabelInfo();
    blip.updateColorBasedOnSSR();
}

function deletePrimaryMapping(id) {
    delete primarySSRMapping[id];
    updatePrimaryMappingTable();

    // Update visuals
    aircraftBlips.forEach(blip => {
        if (blip.id === id) {
            blip.updateLabelInfo();
            blip.updateColorBasedOnSSR();
        }
    });
}

function updatePrimaryMappingTable() {
    const container = document.getElementById("mappingTableBody");

    // Remove existing rows with 'primary-' prefix
    [...container.querySelectorAll("tr[data-primary-id]")].forEach(row => row.remove());

    for (let id in primarySSRMapping) {
        const row = document.createElement("tr");
        row.setAttribute("data-primary-id", id);
        row.innerHTML = `
            <td class="squawk-cell">0000</td>
            <td>${primarySSRMapping[id]}</td>
            <td><span class="delete-mapping-button" title="Delete">X</span></td>
        `;
        row.querySelector(".delete-mapping-button").addEventListener("click", () => {
            deletePrimaryMapping(id);
        });

        container.appendChild(row);
    }
}

function updateMappingInputsBasedOnHookedAircraft() {
    if (!hookedBlip) {
        ssrInput.disabled = false;
        ssrInput.value = "";
        callsignInput.value = "";
        callsignInput.focus();
        return;
    }

    const isPrimary = hookedBlip.ssrCode === "0000";

    if (isPrimary) {
        ssrInput.disabled = true;
        ssrInput.value = "0000";
        callsignInput.value = "";
        callsignInput.focus();
    } else {
        ssrInput.disabled = false;
        ssrInput.value = hookedBlip.ssrCode;
        callsignInput.value = "";
        callsignInput.focus();
    }
}




