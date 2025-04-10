
//to open or close the settings dialog box
function toggleSettingsDialog() {
    const dialog = document.getElementById("settingsDialog");
    dialog.style.display = dialog.style.display === "none" ? "block" : "none";
}

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

    toggleSettingsDialog();
}

