//Commands

// Initialize the SpeechRecognition API
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true; // Keep recognizing as long as the user is speaking
recognition.interimResults = false; // Don't show intermediate results

// Start recognition when the page loads
recognition.start();

// Event handler for when speech recognition starts
recognition.onstart = () => {
    console.log('Speech recognition started');
};

// Event handler for when speech is recognized
recognition.onresult = (event) => {
    const results = event.results;
    const command = results[results.length - 1][0].transcript.toLowerCase().trim();
    console.log('Controller: ' + command);
    updateStatusBar('Radar: ' + command);

    // Handle the recognized command
    handleVoiceCommand(command);
};

// Event handler for errors
recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    restartRecognition(); // Restart recognition on error
};

// Event handler for when speech recognition ends
recognition.onend = () => {
    console.log('Speech recognition ended');
    restartRecognition(); // Restart recognition when it ends
};

// Function to restart speech recognition
function restartRecognition() {
    // Stop and then start recognition
    recognition.stop();
    setTimeout(() => {
        recognition.start();
    }, 1000); // Wait for 1 second before restarting
}

// Flag to track if speech synthesis has been activated
let speechActivated = true;

// Function to activate speech synthesis
document.getElementById('activateSpeech').addEventListener('click', () => {
    speechActivated = true;
    document.getElementById('activateSpeech').style.display = 'none'; // Hide the button after activation
});

// Function to speak out a message
function speak(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'en-US';
    speechSynthesis.speak(speech);
}

// Function to handle voice command
function handleVoiceCommand(command) {
    if (!speechActivated) {
        console.log('Speech synthesis not activated');
        return;
    }

    // Normalize command and trim spaces
    const normalizedCommand = command.toLowerCase().trim();
    console.log('Normalized command:', normalizedCommand);

    // Extract heading if present
    const headingMatch = normalizedCommand.match(/(\d{3})/);
    const heading = headingMatch ? headingMatch[1] : null;

    if (normalizedCommand.includes('report heading')) {
        // No heading is needed for this command
        const currentHeading = aircraftDirection ? aircraftDirection.toFixed(0).padStart(3, '0') : '000'; // Get the current heading of the aircraft
        const message = `Heading ${currentHeading}`;
        speak(message);
        updateStatusBar('Pilot: ' + message); // Update status bar with the spoken message
    } else if (normalizedCommand.includes('turn right heading') && heading) {
        const message = `Roger, Turning Right Heading ${heading}`;
        speak(message);
        updateStatusBar('Pilot: ' + message);
        turnAircraft('right', heading); // Function to turn aircraft to the specified heading
    } else if (normalizedCommand.includes('turn left heading') && heading) {
        const message = `Roger, Turning Left Heading ${heading}`;
        speak(message);
        updateStatusBar('Pilot: ' + message);
        turnAircraft('left', heading); // Function to turn aircraft to the specified heading
    } else if (normalizedCommand.includes('make heading') && heading) {
        const message = `Roger, Heading ${heading}`;
        speak(message);
        updateStatusBar('Pilot: ' + message);
        setAircraftHeading(heading); // Function to set aircraft to the specified heading
    } else {
        speak('Say again');
        updateStatusBar('Pilot: Say Again');
    }
}
