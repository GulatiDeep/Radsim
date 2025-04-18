// ===============================
// Settings Dialog Handling
// ===============================

// Function to open or close the settings dialog box
function toggleSettingsDialog() {
    const dialog = document.getElementById("settingsDialog");
    dialog.style.display = dialog.style.display === "none" ? "block" : "none";
}

// Update Speed Vector Minutes immediately when selection changes
document.getElementById("speedVectorSelect").addEventListener("change", (e) => {
    speedVectorMinutes = parseInt(e.target.value, 10);
});


// ===============================
// Apply Settings Function
// ===============================

function applySettings() {
    // --- Update History Dots Count ---
    const newDotCount = parseInt(document.getElementById("historyDotCountSelect").value, 10);
    if (!isNaN(newDotCount)) {
        currentHistoryDotCount = newDotCount;

        // Clear old dots and recreate with new count
        aircraftBlips.forEach(blip => {
            blip.historyDots.forEach(dot => dot.remove());
            blip.historyDots = [];
            blip.createHistoryDots();
            blip.updateHistoryDots();
        });
    }

    // --- Update STCA Toggle ---
    stcaEnabled = document.getElementById("stcaToggle").checked;

    // --- Update STCA Parameters ---
    const horizontalInput = parseFloat(document.getElementById("horizontalSeparationInput").value);
    if (!isNaN(horizontalInput)) horizontalSeparationNM = horizontalInput;

    const verticalInput = parseFloat(document.getElementById("verticalSeparationInput").value);
    if (!isNaN(verticalInput)) verticalSeparationFT = verticalInput;

    const lookaheadSTCAInput = parseFloat(document.getElementById("lookaheadSTCAInput").value);
    if (!isNaN(lookaheadSTCAInput)) lookaheadSecondsSTCA = lookaheadSTCAInput;

    // --- MSAW Settings ---
    msawEnabled = document.getElementById("msawToggle").checked;
    const msaInput = parseFloat(document.getElementById("minimumAltitudeInput").value);
    if (!isNaN(msaInput)) minimumSafeAltitudeFT = msaInput;

    const lookaheadMSAWInputValue = parseFloat(document.getElementById("lookaheadMSAWInput").value);
    if (!isNaN(lookaheadMSAWInputValue)) lookaheadSecondsMSAW = lookaheadMSAWInputValue;


    // --- Clear STCA alerts if disabled ---
    if (!stcaEnabled) {
        aircraftBlips.forEach(blip => {
            if (blip.stcaHalo) blip.stcaHalo.style.display = 'none';
        });

        predictedConflicts.clear();
        actualConflicts.clear();

        const canvas = document.getElementById("stcaCanvas");
        if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    }

    // Clear MSAW alerts if disabled
    if (!msawEnabled) {
        aircraftBlips.forEach(blip => {
            if (blip.msawHalo) blip.msawHalo.style.display = 'none';
        });
        predictedMSAWConflicts.clear();
        actualMSAWConflicts.clear();
    }

    // --- Update Status Bar ---
    updateStatusBar(`✅  Settings successfully applied`);

    // --- Show Toast Notification ---
    showToast("✅ Settings successfully applied!");

    // --- Close the settings dialog ---
    toggleSettingsDialog();
}

// ===============================
// Simple Toast Notification Handler
// ===============================

function showToast(message) {
    const panContainer = document.getElementById("panContainer");
    if (!panContainer) return; // safety check if panContainer doesn't exist

    // Create toast container if it doesn't exist
    let toast = document.getElementById("toastNotification");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toastNotification";
        panContainer.appendChild(toast);  // ← append inside panContainer now

        // Style the toast
        toast.style.position = "absolute";
        toast.style.bottom = "30px";
        toast.style.right = "20px";
        toast.style.background = "rgba(0,0,0,0.85)";
        toast.style.color = "#fff";
        toast.style.padding = "10px 20px";
        toast.style.borderRadius = "6px";
        toast.style.fontSize = "14px";
        toast.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
        toast.style.zIndex = "500";  // high but within radar container
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s ease";
        toast.style.pointerEvents = "none"; // make sure it doesn't block clicks
    }

    // Update message and show
    toast.textContent = message;
    toast.style.opacity = "1";

    // Hide after 2.5 seconds
    setTimeout(() => {
        toast.style.opacity = "0";
    }, 2500);
}

