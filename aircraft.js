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







