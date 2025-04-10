
//to open or close the settings dialog box
function toggleSettingsDialog() {
    const dialog = document.getElementById("settingsDialog");
    dialog.style.display = dialog.style.display === "none" ? "block" : "none";
}

document.getElementById("speedVectorSelect").addEventListener("change", e => {
    speedVectorMinutes = parseInt(e.target.value, 10);
  });

  
//Function to apply all the settings
function applySettings() {
    const newDotCount = parseInt(document.getElementById("historyDotCountSelect").value, 10);
    if (isNaN(newDotCount)) return;

    currentHistoryDotCount = newDotCount;

    aircraftBlips.forEach(blip => {
        // Remove old dots
        blip.historyDots.forEach(dot => dot.remove());
        blip.historyDots = [];

        // Recreate and immediately update their position
        blip.createHistoryDots();
        blip.updateHistoryDots(); // ✅ fix: show them instantly
    });

    stcaEnabled = document.getElementById("stcaToggle").checked;

    // Optional: hide all alerts immediately if disabled
    if (!stcaEnabled) {
        aircraftBlips.forEach(blip => {
            if (blip.stcaHalo) blip.stcaHalo.style.display = 'none';
        });

        predictedConflicts.clear();
        actualConflicts.clear();

        const canvas = document.getElementById("stcaCanvas");
        if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    }

    toggleSettingsDialog(); // optional close
}

