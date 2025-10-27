const playButton = document.getElementById('play-btn');
const instructionsButton = document.getElementById('instructions-btn');
const playerNameInput = document.getElementById('player-name');

function startGame() {
    const playerName = playerNameInput.value.trim();
    if (playerName) {
        localStorage.setItem('playerName', playerName); 
        window.location.href = 'game.html'; 
    } else {
        alert('Please enter your name!');
    }
}

function showInstructions() {
    window.location.href = 'instructions.html'; 
}

playButton.addEventListener('click', startGame);
instructionsButton.addEventListener('click', showInstructions);
