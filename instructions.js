(function() {
    if (!window.globalMusic) {
        const audio = new Audio("audios/bg-music.mp3");
        audio.loop = true;
        audio.volume = 0.5;

        const resumeMusic = () => {
            audio.play().catch(() => {});
            document.removeEventListener("click", resumeMusic);
        };

        document.addEventListener("click", resumeMusic);
        audio.play().catch(() => {});
        window.globalMusic = audio;
    } else {
        if (window.globalMusic.paused) {
            window.globalMusic.play().catch(() => {});
        }
    }
})();

document.getElementById('back-btn').addEventListener('click', function() {
    window.location.href = 'index.html'; // Go back to the lobby
});
