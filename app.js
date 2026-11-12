const socket = io();

const playerName = document.getElementById("playerName");
const roomCode = document.getElementById("roomCode");

const createBtn = document.getElementById("createRoomBtn");
const showJoinBtn = document.getElementById("showJoinBtn");
const joinBtn = document.getElementById("joinRoomBtn");

const joinSection = document.getElementById("joinSection");
const menuCard = document.querySelector(".menu-card");
const lobbySection = document.getElementById("lobbySection");

const statusMessage = document.getElementById("statusMessage");

let currentRoom = null;
let myRole = null;
let policePlayers = [];
let isRoomHost = false;
let gameEnded = false;


// PLAYER AVATARS

const avatars = ["👨", "🧑", "👦", "🕵️"];


// ROLE DETAILS

const roles = {
    RAJA: {
        name: "RAJA",
        emoji: "👑",
        className: "role-raja"
    },

    MANTRI: {
        name: "MANTRI",
        emoji: "👔",
        className: "role-mantri"
    },

    POLICE: {
        name: "POLICE",
        emoji: "🚔",
        className: "role-police"
    },

    CHOR: {
        name: "CHOR",
        emoji: "🥷",
        className: "role-chor"
    }
};


// SAFE HTML TEXT

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


// SHOW JOIN ROOM

showJoinBtn.addEventListener("click", () => {
    joinSection.classList.toggle("hidden");
});


// CREATE ROOM

createBtn.addEventListener("click", () => {

    const name = playerName.value.trim();

    if (!name) {
        statusMessage.textContent = "Please enter your name.";
        return;
    }

    statusMessage.textContent = "Creating room...";

    socket.emit("create-room", name, (response) => {

        if (!response.success) {
            statusMessage.textContent = response.message;
            return;
        }

        currentRoom = response.roomCode;

        openLobby(response.roomCode);
    });
});


// JOIN ROOM

joinBtn.addEventListener("click", () => {

    const name = playerName.value.trim();
    const code = roomCode.value.trim();

    if (!name || !code) {
        statusMessage.textContent = "Enter your name and room code.";
        return;
    }

    socket.emit("join-room", {
        playerName: name,
        roomCode: code
    }, (response) => {

        if (!response.success) {
            statusMessage.textContent = response.message;
            return;
        }

        currentRoom = response.roomCode;

        openLobby(response.roomCode);
    });
});


// OPEN LOBBY

function openLobby(code) {

    menuCard.classList.add("hidden");
    lobbySection.classList.remove("hidden");

    document.getElementById("displayRoomCode").textContent = code;
}


// START GAME BUTTON

lobbySection.addEventListener("click", (event) => {

    if (event.target.id !== "startGameBtn") return;

    if (!currentRoom || gameEnded) return;

    const button = event.target;

    button.disabled = true;

    socket.emit("start-game", currentRoom, (response) => {

        if (!response.success) {

            alert(response.message);

            button.disabled = false;

            return;
        }

        console.log("Game started!");
    });
});


// CREATE PLAYER CARD

function createPlayerCard(player, index) {

    const avatar = avatars[index % avatars.length];

    return `
        <div class="player-card lobby-player">

            <div class="player-avatar">
                ${avatar}
            </div>

            <div class="player-info">

                <h3>${escapeHTML(player.name)}</h3>

                <p>
                    ${player.isHost ? "👑 ROOM HOST" : "🎮 PLAYER"}
                </p>

                <p>
                    🏆 ${player.score || 0} Points
                </p>

            </div>

        </div>
    `;
}


// UPDATE PLAYER LIST

socket.on("room-update", (room) => {

    gameEnded = Boolean(room.gameEnded);

    const playerList = document.getElementById("playerList");

    if (playerList) {

        playerList.innerHTML = "";

        room.players.forEach((player, index) => {

            playerList.innerHTML += createPlayerCard(player, index);

        });
    }

    const message = document.getElementById("lobbyMessage");

    if (message) {
        message.textContent =
            `${room.players.length}/4 players joined`;
    }

    isRoomHost = room.players.some(player =>
        player.isHost &&
        player.name === playerName.value.trim()
    );

    const startGameBtn = document.getElementById("startGameBtn");

    if (startGameBtn) {

        startGameBtn.classList.toggle("hidden", !isRoomHost);

        startGameBtn.disabled =
            room.players.length !== 4 ||
            room.gameStarted ||
            gameEnded;
    }

});


// RECEIVE SECRET ROLE

socket.on("game-started", (data) => {

    myRole = data.role;

    const role = roles[data.role];

    lobbySection.innerHTML = `

        <div class="game-screen role-reveal">

            <div class="reveal-icon">🎭</div>

            <h1>GAME STARTED!</h1>

            <p class="reveal-subtitle">
                YOUR SECRET IDENTITY
            </p>

            <div class="secret-role-card ${role.className}">

                <div class="secret-role-icon">
                    ${role.emoji}
                </div>

                <h1 class="secret-role">
                    ${role.name}
                </h1>

            </div>

            <p class="secret-warning">
                🔒 Keep your identity secret!
            </p>

            <div id="timerBox" class="timer-card">

                <h2>⏱️ TIME LEFT</h2>

                <h1 id="countdown">30</h1>

                <p>SECONDS</p>

            </div>

            ${isRoomHost ? `
                <button id="endGameBtn" class="main-btn">
                    🛑 END GAME
                </button>
            ` : ""}

            <div id="policeArea"></div>

        </div>
    `;

    if (myRole === "POLICE") {

        document.getElementById("policeArea").innerHTML = `

            <div class="mission-card">

                <h2>🚔 POLICE MISSION</h2>

                <p>Identify the CHOR among the other players.</p>

                <p>Waiting for player list...</p>

            </div>

        `;

    } else {

        document.getElementById("policeArea").innerHTML = `

            <div class="mission-card">

                <h2>🎮 YOUR MISSION</h2>

                <p>Wait for the Police to identify the CHOR.</p>

            </div>

        `;
    }

});


// RECEIVE TIMER UPDATES

socket.on("timer-update", (timeLeft) => {

    const countdown = document.getElementById("countdown");

    const timerBox = document.getElementById("timerBox");

    if (!countdown || !timerBox) return;

    countdown.textContent = timeLeft;

    if (timeLeft <= 10) {

        timerBox.classList.add("timer-danger");

    } else {

        timerBox.classList.remove("timer-danger");

    }

});


// RECEIVE PLAYER LIST - POLICE ONLY

socket.on("police-player-list", (data) => {

    if (myRole !== "POLICE") return;

    policePlayers = data.players;

    const policeArea = document.getElementById("policeArea");

    if (!policeArea) return;

    policeArea.innerHTML = `

        <div class="mission-card">

            <h2>🚔 IDENTIFY THE CHOR</h2>

            <p>Select the player you think is the CHOR.</p>

            <div id="policePlayerButtons"></div>

            <p id="policeMessage"></p>

        </div>

    `;

    const buttons = document.getElementById("policePlayerButtons");

    policePlayers.forEach((player, index) => {

        const button = document.createElement("button");

        button.className = "secondary-btn police-player-btn";

        button.textContent =
            `${avatars[index % avatars.length]} ${player.name}`;

        button.addEventListener("click", () => {

            const confirmGuess = confirm(
                `Are you sure ${player.name} is the CHOR?`
            );

            if (!confirmGuess) return;

            submitPoliceGuess(player.id);
        });

        buttons.appendChild(button);
    });

});


// POLICE SUBMITS GUESS

function submitPoliceGuess(targetPlayerId) {

    const buttons = document.querySelectorAll(
        "#policePlayerButtons button"
    );

    buttons.forEach(button => {
        button.disabled = true;
    });

    socket.emit("police-guess", targetPlayerId, (response) => {

        const message = document.getElementById("policeMessage");

        if (!response.success) {

            if (message) {
                message.textContent = response.message;
            }

            buttons.forEach(button => {
                button.disabled = false;
            });

            return;
        }

        if (message) {
            message.textContent = "✅ Your decision has been submitted!";
        }

    });

}


// RECEIVE FINAL RESULT - ALL PLAYERS

socket.on("round-result", (data) => {

    let resultMessage;

    if (data.timedOut) {

        resultMessage = "⏰ TIME'S UP! POLICE FAILED TO IDENTIFY THE CHOR!";

    } else if (data.correct) {

        resultMessage = "🎉 CORRECT! POLICE IDENTIFIED THE CHOR!";

    } else {

        resultMessage = "❌ WRONG! POLICE FAILED TO IDENTIFY THE CHOR!";

    }

    let resultHTML = `

        <div class="game-screen result-screen">

            <div class="result-icon">🏁</div>

            <h1>ROUND FINISHED</h1>

            <h2 class="result-message">
                ${resultMessage}
            </h2>

            <div class="result-details">

                <p>
                    🚔 Police:
                    <strong>${escapeHTML(data.policeName)}</strong>
                </p>

                <p>
                    🎯 Selected Player:
                    <strong>${escapeHTML(data.targetName)}</strong>
                </p>

            </div>

            <h2>🎭 FINAL ROLE REVEAL</h2>

            <div class="final-players">

    `;

    data.players.forEach((player, index) => {

        const role = roles[player.role];

        resultHTML += `

            <div class="player-card final-player-card ${role.className}">

                <div class="player-avatar">
                    ${avatars[index % avatars.length]}
                </div>

                <h3>${escapeHTML(player.name)}</h3>

                <h2>${role.emoji} ${role.name}</h2>

                <p>⭐ Round Points: +${player.roundPoints}</p>

                <h3>🏆 Total Score: ${player.score}</h3>

            </div>

        `;
    });

    resultHTML += `

            </div>

            <h2>🏆 LEADERBOARD</h2>

            <div class="leaderboard">

    `;

    const sortedPlayers = [...data.players].sort(
        (a, b) => b.score - a.score
    );

    sortedPlayers.forEach((player, index) => {

        const medal = ["🥇", "🥈", "🥉", "🏅"][index];

        resultHTML += `

            <div class="leaderboard-item">

                <h3>
                    ${medal} ${index + 1}. ${escapeHTML(player.name)}
                </h3>

                <h2>🏆 ${player.score} Points</h2>

            </div>

        `;
    });

    resultHTML += `

            </div>

            <div class="play-again-area">

                ${
                    isRoomHost
                    ? `

                        <button id="playAgainBtn" class="main-btn">
                            🔄 PLAY AGAIN
                        </button>

                        <button id="endGameBtn" class="secondary-btn">
                            🛑 END GAME
                        </button>

                    `
                    : `
                        <p>
                            Waiting for the host to choose the next action...
                        </p>
                    `
                }

                <p id="playAgainMessage"></p>

            </div>

        </div>

    `;

    lobbySection.innerHTML = resultHTML;

});


// PLAY AGAIN AND END GAME BUTTONS

lobbySection.addEventListener("click", (event) => {

    // PLAY AGAIN

    if (event.target.id === "playAgainBtn") {

        const button = event.target;

        button.disabled = true;

        socket.emit("play-again", (response) => {

            const message = document.getElementById("playAgainMessage");

            if (!response.success) {

                if (message) {
                    message.textContent = response.message;
                }

                button.disabled = false;

                return;
            }

            console.log("Starting another round...");

        });

        return;
    }


    // END GAME

    if (event.target.id === "endGameBtn") {

        const confirmEnd = confirm(
            "Are you sure you want to end the game? This cannot be undone."
        );

        if (!confirmEnd) return;

        const button = event.target;

        button.disabled = true;

        socket.emit("end-game", (response) => {

            if (!response.success) {

                alert(response.message);

                button.disabled = false;

                return;
            }

            console.log("Game ended!");

        });

    }

});


// GAME RESET FOR ALL PLAYERS

socket.on("game-reset", () => {

    myRole = null;
    policePlayers = [];

    lobbySection.innerHTML = `

        <div class="game-screen">

            <h1>🎮 CHOR CHITTI</h1>

            <h2>
                ROOM:
                <span id="displayRoomCode">${escapeHTML(currentRoom)}</span>
            </h2>

            <h2>LOBBY</h2>

            <div id="playerList"></div>

            <p id="lobbyMessage">Waiting for players...</p>

            <button id="startGameBtn" class="main-btn hidden">
                START GAME
            </button>

        </div>

    `;

    console.log("Game reset. Scores preserved!");

});


// FINAL GAME ENDED SCREEN

socket.on("game-ended", (data) => {

    gameEnded = true;

    let championText;

    if (data.champions.length === 1) {

        championText = `

            <div class="champion-card">

                <div class="champion-crown">👑</div>

                <p>FINAL CHAMPION</p>

                <h1>${escapeHTML(data.champions[0])}</h1>

            </div>

        `;

    } else {

        championText = `

            <div class="champion-card">

                <div class="champion-crown">🏆</div>

                <p>JOINT CHAMPIONS</p>

                <h1>
                    ${data.champions.map(escapeHTML).join(" & ")}
                </h1>

            </div>

        `;

    }

    let finalHTML = `

        <div class="game-screen final-screen">

            <h1>🏁 CHOR CHITTI</h1>

            <h2>GAME OVER</h2>

            ${championText}

            <h2>🏆 FINAL LEADERBOARD</h2>

            <div class="leaderboard">

    `;

    data.leaderboard.forEach((player, index) => {

        const medal = ["🥇", "🥈", "🥉", "🏅"][index];

        finalHTML += `

            <div class="leaderboard-item">

                <h3>
                    ${medal} ${index + 1}. ${escapeHTML(player.name)}
                </h3>

                <h2>🏆 ${player.score} Points</h2>

            </div>

        `;

    });

    finalHTML += `

            </div>

            <h2 class="thank-you">
                🎉 THANK YOU FOR PLAYING!
            </h2>

        </div>

    `;

    lobbySection.innerHTML = finalHTML;

});
// ==========================================
// CHOR CHITTI SOUND SYSTEM
// ==========================================

const soundToggleBtn = document.getElementById("soundToggleBtn");

let soundEnabled = localStorage.getItem("chorChittiSound") !== "off";
let audioContext = null;
let musicInterval = null;
let musicNoteIndex = 0;

// Create audio system
function getAudioContext() {
    if (!audioContext) {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return null;

        audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    return audioContext;
}

// Play sound
function playTone(frequency, duration = 0.15, type = "sine", volume = 0.08) {
    if (!soundEnabled) return;

    const context = getAudioContext();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + duration);
}

// Button click sound
function playClickSound() {
    playTone(650, 0.07, "sine", 0.035);
}

// Secret role reveal sound
function playRoleRevealSound() {
    playTone(392, 0.18, "triangle", 0.07);

    setTimeout(() => playTone(523, 0.2, "triangle", 0.07), 150);
    setTimeout(() => playTone(659, 0.3, "triangle", 0.07), 300);
}

// Correct guess sound
function playSuccessSound() {
    playTone(523, 0.15);

    setTimeout(() => playTone(659, 0.15), 140);
    setTimeout(() => playTone(784, 0.3), 280);
}

// Wrong guess sound
function playFailureSound() {
    playTone(260, 0.25, "sawtooth", 0.045);

    setTimeout(() => {
        playTone(190, 0.35, "sawtooth", 0.045);
    }, 220);
}

// Time's up sound
function playTimeoutSound() {
    playTone(330, 0.25, "square", 0.04);

    setTimeout(() => {
        playTone(220, 0.45, "square", 0.04);
    }, 250);
}

// Champion sound
function playChampionSound() {
    playTone(523, 0.18, "triangle");

    setTimeout(() => playTone(659, 0.18, "triangle"), 180);
    setTimeout(() => playTone(784, 0.18, "triangle"), 360);
    setTimeout(() => playTone(1046, 0.5, "triangle"), 540);
}

// Background music
function startBackgroundMusic() {
    if (!soundEnabled || musicInterval) return;

    const notes = [
        130.81, 164.81, 196, 164.81,
        146.83, 174.61, 220, 174.61
    ];

    function playMusicNote() {
        if (!soundEnabled) return;

        const context = getAudioContext();
        if (!context) return;

        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value =
            notes[musicNoteIndex % notes.length];

        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.linearRampToValueAtTime(
            0.018,
            context.currentTime + 0.15
        );

        gain.gain.linearRampToValueAtTime(
            0.0001,
            context.currentTime + 0.65
        );

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start();
        oscillator.stop(context.currentTime + 0.7);

        musicNoteIndex++;
    }

    playMusicNote();

    musicInterval = setInterval(playMusicNote, 750);
}

// Stop music
function stopBackgroundMusic() {
    if (musicInterval) {
        clearInterval(musicInterval);
        musicInterval = null;
    }
}

// Update sound button
function updateSoundButton() {
    if (!soundToggleBtn) return;

    soundToggleBtn.textContent =
        soundEnabled ? "🔊 SOUND ON" : "🔇 SOUND OFF";
}

// Sound ON/OFF button
if (soundToggleBtn) {

    updateSoundButton();

    soundToggleBtn.addEventListener("click", () => {

        soundEnabled = !soundEnabled;

        localStorage.setItem(
            "chorChittiSound",
            soundEnabled ? "on" : "off"
        );

        updateSoundButton();

        if (soundEnabled) {
            getAudioContext();
            startBackgroundMusic();
            playSuccessSound();
        } else {
            stopBackgroundMusic();
        }
    });
}

// Start music after first user interaction
document.addEventListener("click", () => {

    if (soundEnabled) {
        getAudioContext();
        startBackgroundMusic();
    }

});

// Button click effects
document.addEventListener("click", (event) => {

    if (
        soundEnabled &&
        event.target.closest("button") &&
        event.target.id !== "soundToggleBtn"
    ) {
        playClickSound();
    }

});

// Role reveal sound
socket.on("game-started", () => {
    playRoleRevealSound();
});

// Final 10-second countdown beeps
socket.on("timer-update", (timeLeft) => {

    if (timeLeft <= 10 && timeLeft > 0) {
        playTone(880, 0.08, "sine", 0.035);
    }

});

// Round result sounds
socket.on("round-result", (data) => {

    if (data.timedOut) {
        playTimeoutSound();

    } else if (data.correct) {
        playSuccessSound();

    } else {
        playFailureSound();
    }

});

// Champion celebration
socket.on("game-ended", () => {
    playChampionSound();
});

// Initial button state
updateSoundButton();

// ==========================================
// END OF SOUND SYSTEM
// ==========================================