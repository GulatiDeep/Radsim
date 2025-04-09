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
        aircraftBlips.forEach(blip => blip.updateLabelInfo());
    });

    //mappingTableBody.appendChild(row);
    mappingTableBody.insertBefore(row, mappingTableBody.firstChild);


    // Reset fields
    ssrInput.value = "";
    callsignInput.value = "";
    ssrInput.focus();

    // Update all aircraft labels
    aircraftBlips.forEach(blip => blip.updateLabelInfo());
}

// Listen to Enter key
[callsignInput, ssrInput].forEach(input => {
    input.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            const ssr = ssrInput.value.trim();
            const callsign = callsignInput.value.trim().toUpperCase();

            if (!ssr || !callsign) return;

            // ✅ Use octal validation function
            if (!isValidSquawkCode(ssr)) {
                alert("Invalid Squawk Code.\nIt must be a 4-digit octal number (digits 0–7).");
                return;
            }

            addMappingToTable(ssr, callsign);
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
    } else {
        // Hide the dialog
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
