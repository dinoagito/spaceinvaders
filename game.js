const ASSETS = {
    bgMusic: "audios/bg-music.mp3",
    shootSound: "audios/shoot.mp3",
    playerImg: "images/ship.gif",
    enemyImg: "images/enemy.png",
    explosion: "images/explosion.gif",
    playerBulletImg: "images/missile-unscreen.gif",
    enemyBulletImg: "images/enemy-missile-unscreen.gif",
    mothershipImg: "images/mothership.png",
    bgImage: "images/bg.gif"
};

const CONFIG = {
    fpsInterval: 1000 / 60,   
    BASE_WIDTH: 800, // Reference width for scaling
    playerSpeed: 8,
    playerWidth: 64,
    playerHeight: 48,
    playerStartLives: 3,
    bulletSpeed: 12,
    enemyBulletSpeed: 3,
    enemyCols: 7,
    enemyRowsPerLevel: [2, 3, 4], 
    enemyWidth: 50,
    enemyHeight: 40,
    enemySpacingX: 90,
    enemySpacingY: 60,
    enemyStartX: 70,
    enemyStartY: 80,
    enemyMoveSpeedBase: 0.6,  
    enemyDropOnEdge: 18,
    enemyShootIntervalMs: 1200,
    mothershipHP: 18, 
    mothershipSizeFactor: 3.5, // BIG MOTHERSHIP!
    mothershipShootIntervalMs: 200, 
    mothershipBurstCount: 4, 
    mothershipBurstGapMs: 1000,  
    maxPlayerBullets: 4,
    bombCount: 1,
    bombKillPercentage: 0.7 
};

const State = {
    gameArea: null,
    hudInfo: null,
    width: window.innerWidth,
    height: window.innerHeight,
    player: null,     
    bullets: [],        
    enemies: [],       
    enemyBullets: [],     
    mothership: null,
    lastMothershipShootTime: 0,
    mothershipShotsFired: 0, 
    mothershipInCooldown: false,     
    score: 0,
    lives: CONFIG.playerStartLives,
    level: 1,
    running: false, 
    paused: false,
    lastEnemyShootTime: 0,
    bombsLeft: CONFIG.bombCount,
    keys: {}
};

document.getElementById("menu-btn").addEventListener("click", () => {
    const bgMusic = document.getElementById("bg-music");
    if (bgMusic && !bgMusic.paused) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
   }

   window.location.href = "index.html"; 
});


let bgMusic;
let shootSound;
let scaleFactor = 1;

const existingBgAudio = document.getElementById('bg-music');
if (existingBgAudio && typeof existingBgAudio.play === 'function') {
  bgMusic = existingBgAudio;
  try { bgMusic.loop = true; } catch (e) {}
  try { bgMusic.volume = 0.5; } catch (e) {}
} else {
  try {
    bgMusic = new Audio(ASSETS.bgMusic);
    bgMusic.loop = true;
    bgMusic.volume = 0.5;
  } catch (e) { bgMusic = null; }
}
try {
  shootSound = new Audio(ASSETS.shootSound);
  shootSound.volume = 0.7;
} catch (e) { shootSound = null; }

function calculateScaleFactor() {
    // Calculate scale relative to the base width (800px)
    scaleFactor = State.width / CONFIG.BASE_WIDTH; 
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rectsOverlap(a, b) {
  return !(a.left > b.right || a.right < b.left || a.top > b.bottom || a.bottom < b.top);
}
function playShootSound() {
    if (!shootSound) return;
    try {
        shootSound.currentTime = 0;
        shootSound.play();
    } catch (e) {}
}

function setupUI() {
    // remove any previous area
    const prev = document.getElementById("si-game-area");
    if (prev) prev.remove();

    const gameArea = document.createElement("div");
    gameArea.id = "si-game-area";
    // full viewport
    gameArea.style.position = "fixed";
    gameArea.style.overflow = "hidden";
    gameArea.style.zIndex = "999";
    
    document.body.appendChild(gameArea); // Append before reading size
    State.gameArea = gameArea;
    State.width = gameArea.clientWidth; 
    State.height = gameArea.clientHeight;
    calculateScaleFactor(); // Calculate scale based on new dimensions
    document.body.appendChild(gameArea);

    // Add level transition wipe element
    const wipeEl = document.createElement("div");
    wipeEl.id = "level-transition-wipe";
    gameArea.appendChild(wipeEl);


    const hud = document.getElementById("hud");
    if (hud) {
        State.hudInfo = hud;
        updateHUD();
    } else {
        // create small HUD at top-left
        const smallHud = document.createElement("div");
        smallHud.id = "hud";
        smallHud.style.position = "absolute";
        smallHud.style.left = "10px";
        smallHud.style.top = "10px";
        smallHud.style.color = "white";
        smallHud.style.fontSize = "16px";
        smallHud.style.zIndex = "1000";
        smallHud.style.fontFamily = "'Press Start 2P', monospace";
        smallHud.innerHTML = `<div id="score">Score: 0</div><div id="level">Level: 1</div><div id="lives">Lives: ${State.lives}</div><div id="power">Bomb: Ready (${State.bombsLeft})</div>`;
        document.body.appendChild(smallHud);
        State.hudInfo = smallHud;
  }
    
    State.gameArea = gameArea;
    State.width = gameArea.clientWidth; 
    State.height = gameArea.clientHeight;
    
    // Initial overlay text update
    showOverlay("Press ENTER / Z / SPACE to start! \n\nCONTROLS:\n • Move: ← →  \n\• Fire: ENTER/Z/Space\n • Bomb: B");

}

let overlayEl = null;
function showOverlay(text) {
    // Always ensure overlay exists
    let overlay = document.getElementById("game-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "game-overlay";
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100vw";
        overlay.style.height = "100vh";
        overlay.style.background = "rgba(0, 0, 0, 0.7)";
        overlay.style.display = "flex";
        overlay.style.flexDirection = "column";
        overlay.style.justifyContent = "center";
        overlay.style.alignItems = "center";
        overlay.style.color = "#00ffff";
        overlay.style.fontFamily = "'Consolas', 'Courier New', monospace";
        overlay.style.fontSize = "22px";
        overlay.style.textAlign = "center";
        overlay.style.lineHeight = "1.6";
        overlay.style.textShadow = "0 0 10px rgba(0,255,255,0.8)";
        overlay.style.zIndex = "99999";
        overlay.style.padding = "20px";
        document.body.appendChild(overlay);
    }

    // Support \n line breaks
    overlay.innerHTML = text.replace(/\n/g, "<br>");
    overlay.style.opacity = "1";
    overlay.style.display = "flex";
}

function hideOverlay() {
    const overlay = document.getElementById("game-overlay");
    if (overlay) {
        // Just hide, not remove — so showOverlay always works later
        overlay.style.display = "none";
        overlay.style.opacity = "0";
    }
}

function createPlayer() {
    const pW = CONFIG.playerWidth * scaleFactor;
    const pH = CONFIG.playerHeight * scaleFactor;
    const startYOffset = 30 * scaleFactor;

    // remove old player
    if (State.player && State.player.el) State.player.el.remove();

    const el = document.createElement("img");
    el.src = ASSETS.playerImg;
    el.style.position = "absolute";
    el.style.width = pW + "px";
    el.style.height = pH + "px";
    // start bottom center
    const startX = (State.width - pW) / 2;
    const startY = State.height - pH - startYOffset;
    el.style.left = startX + "px";
    el.style.top = startY + "px";
    State.gameArea.appendChild(el);

    State.player = { el, x: startX, y: startY, w: pW, h: pH };
}

function createEnemiesForLevel(level) {
    // remove previous enemies
    State.enemies.forEach(e => e.el.remove());
    State.enemies = [];
    // remove previous mothership
    if (State.mothership && State.mothership.el) State.mothership.el.remove();
    if (State.mothership && State.mothership.hpEl) State.mothership.hpEl.remove();
    State.mothership = null;
    enemyDirection = 1;

    const rows = CONFIG.enemyRowsPerLevel[level - 1] || CONFIG.enemyRowsPerLevel[CONFIG.enemyRowsPerLevel.length - 1];
    const cols = CONFIG.enemyCols;
    const eW = CONFIG.enemyWidth * scaleFactor;
    const eH = CONFIG.enemyHeight * scaleFactor;
    const startX = CONFIG.enemyStartX * scaleFactor;
    const startY = CONFIG.enemyStartY * scaleFactor;
    const spacingX = CONFIG.enemySpacingX * scaleFactor;
    const spacingY = CONFIG.enemySpacingY * scaleFactor;


    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
        const el = document.createElement("img");
        el.src = ASSETS.enemyImg;
        el.style.position = "absolute";
        el.style.width = eW + "px";
        el.style.height = eH + "px";
        const x = startX + c * spacingX;
        const y = startY + r * spacingY;
        el.style.left = x + "px";
        el.style.top = y + "px";
        State.gameArea.appendChild(el);
        State.enemies.push({ el, x, y, w: eW, h: eH, alive: true });
        }
    }

    // if level 3 then spawn large mothership (hp > 1)
    if (level === 3) {
        // Mothership size calculation (scaled)
        const msW = Math.floor(CONFIG.playerWidth * CONFIG.mothershipSizeFactor * scaleFactor);
        const msH = Math.floor(CONFIG.playerHeight * CONFIG.mothershipSizeFactor * 0.7 * scaleFactor);
        const el = document.createElement("img");
        el.src = ASSETS.mothershipImg;
        el.style.position = "absolute";
        el.style.width = msW + "px";
        el.style.height = msH + "px";
        const startX = (State.width - msW) / 2;
        const startY = 30 * scaleFactor;
        el.style.left = startX + "px";
        el.style.top = startY + "px";
        State.gameArea.appendChild(el);

        // Mothership HP Bar setup (scaled position)
        const hpContainer = document.createElement('div');
        hpContainer.className = 'mothership-hp-container';
        hpContainer.style.width = msW + "px";
        hpContainer.style.left = startX + "px";
        hpContainer.style.top = (startY - (15 * scaleFactor)) + "px"; // 15px above mothership
        
        const hpBar = document.createElement('div');
        hpBar.className = 'mothership-hp-bar';
        hpBar.style.width = '100%';
        hpContainer.appendChild(hpBar);
        State.gameArea.appendChild(hpContainer);


        State.mothership = { 
            el, hpEl: hpContainer, hpBar, 
            x: startX, y: startY, w: msW, h: msH, 
            hp: CONFIG.mothershipHP, maxHp: CONFIG.mothershipHP 
        };
    }
}

function updateMothershipHPBar() {
    if (!State.mothership) return;
    const ms = State.mothership;
    const percentage = (ms.hp / ms.maxHp) * 100;
    ms.hpBar.style.width = `${percentage}%`;
}


function spawnPlayerBullet() {
    // limit concurrent bullets
    if (State.bullets.length >= CONFIG.maxPlayerBullets) return;
    if (!State.player) return;
    
    const bW = 10 * scaleFactor;
    const bH = 18 * scaleFactor;
    const bOffset = 5 * scaleFactor;

    const el = document.createElement("img");
    el.src = ASSETS.playerBulletImg;
    el.style.position = "absolute";
    // Scale bullet image
    el.style.width = (40 * scaleFactor) + "px"; 
    el.style.height = (50 * scaleFactor) + "px";
    // position at nose of player (scaled)
    const x = State.player.x + State.player.w / 2 - bOffset;
    const y = State.player.y - (10 * scaleFactor);
    el.style.left = x + "px";
    el.style.top = y + "px";
    State.gameArea.appendChild(el);
    // Store actual collision box size (scaled)
    State.bullets.push({ el, x, y, w: bW, h: bH });
    playShootSound();
}

function spawnEnemyBullet(fromX, fromY) {
    const bW = 10 * scaleFactor;
    const bH = 18 * scaleFactor;

    const el = document.createElement("img");
    el.src = ASSETS.enemyBulletImg;
    el.style.position = "absolute";
    // Scale bullet image
    el.style.width = (10 * scaleFactor) + "px";
    el.style.height = (30 * scaleFactor) + "px";
    el.style.left = fromX + "px";
    el.style.top = fromY + "px";
    State.gameArea.appendChild(el);
    State.enemyBullets.push({ el, x: fromX, y: fromY, w: bW, h: bH });
    playShootSound();
}

function enemyShooting(now) {
    if (now - State.lastEnemyShootTime < CONFIG.enemyShootIntervalMs) return;
    State.lastEnemyShootTime = now;

    const alive = State.enemies.filter(e => e.alive);
    if (alive.length === 0) return;

    const bOffset = 5 * scaleFactor;
    const yOffset = 6 * scaleFactor;

    // pick a random alive enemy
    const shooter = alive[Math.floor(Math.random() * alive.length)];
    const sx = shooter.x + shooter.w / 2 - bOffset;
    const sy = shooter.y + shooter.h + yOffset;
    spawnEnemyBullet(sx, sy);
}

function mothershipShooting(now) {
    if (!State.mothership) return;

    // --- 1. Check for Cooldown/Gap between Bursts ---
    if (State.mothershipInCooldown) {
        // If 1 second has passed since the last burst ended, reset for a new burst.
        if (now - State.lastMothershipShootTime >= CONFIG.mothershipBurstGapMs) {
            State.mothershipInCooldown = false;
            State.mothershipShotsFired = 0; // Reset shot counter
        } else {
            return; // Still waiting for the gap to finish
        }
    }

    if (now - State.lastMothershipShootTime < CONFIG.mothershipShootIntervalMs) {
        return; // Wait for the next shot interval
    }
    
    // Check if the current burst is complete
    if (State.mothershipShotsFired >= CONFIG.mothershipBurstCount) {
        State.mothershipInCooldown = true;
        State.lastMothershipShootTime = now; // Start the cooldown timer now
        return; 
    }

    State.lastMothershipShootTime = now;
    
    const ms = State.mothership;
    const bOffset = 5 * scaleFactor;
    const yOffset = 6 * scaleFactor;

    const sx1 = ms.x + ms.w * 0.25 - bOffset; // Quarter-point
    const sx2 = ms.x + ms.w * 0.75 - bOffset; // Three-quarter point
    const sy = ms.y + ms.h + yOffset;

    spawnEnemyBullet(sx1, sy);
    spawnEnemyBullet(sx2, sy);

    // Increase the shot counter (since it fires two bullets at once, this counts as 1 firing sequence)
    State.mothershipShotsFired++; 
}


function spawnExplosionAt(x, y, baseSize = 60) {
    const size = baseSize * scaleFactor; // Scale explosion size
    const e = document.createElement("img");
    e.src = ASSETS.explosion;
    e.style.position = "absolute";
    e.style.left = (x - size / 2) + "px";
    e.style.top = (y - size / 2) + "px";
    e.style.width = size + "px";
    e.style.height = size + "px";
    e.style.pointerEvents = "none";
    e.style.zIndex = "9999";
    State.gameArea.appendChild(e);

    // remove explosion after it finishes
    setTimeout(() => {
        e.remove();
    }, 500); // adjust this (in ms) to match your gif duration
}


function processCollisions() {
  // player bullets vs enemies
  for (let i = State.bullets.length - 1; i >= 0; i--) {
    const b = State.bullets[i];
    // Update coordinates for bounding box check (since bullet el size is fixed but logical x/y move)
    b.x = parseFloat(b.el.style.left); 
    b.y = parseFloat(b.el.style.top);

    // Construct a scaled bounding box for the bullet 
    const bRect = { 
      left: b.x, top: b.y, 
      right: b.x + b.w, bottom: b.y + b.h 
    };

    // mothership first (if present)
    if (State.mothership) {
      const ms = State.mothership;
      const msRect = { 
        left: ms.x, top: ms.y, 
        right: ms.x + ms.w, bottom: ms.y + ms.h 
      };
      if (rectsOverlap(bRect, msRect)) {
        // hit mothership
        State.mothership.hp -= 1;
        
        spawnExplosionAt(b.x + b.w / 2, b.y + b.h / 2, 50);
        try { b.el.remove(); } catch (e) {}
        State.bullets.splice(i, 1);
        updateMothershipHPBar(); 

        if (State.mothership.hp <= 0) {
          spawnExplosionAt(State.mothership.x + State.mothership.w / 2, State.mothership.y + State.mothership.h / 2, 100);
          State.mothership.el.remove();
          State.mothership.hpEl.remove(); // Remove HP bar container
          State.mothership = null;
          State.score += 100;
          updateHUD();
        }
        continue;
      }
    }

    // check enemies
    for (let j = 0; j < State.enemies.length; j++) {
      const en = State.enemies[j];
      if (!en.alive) continue;
      const enRect = { 
        left: en.x, top: en.y, 
        right: en.x + en.w, bottom: en.y + en.h 
      };
      if (rectsOverlap(bRect, enRect)) {
        // enemy killed
        en.alive = false;
        try { en.el.remove(); } catch (e) {}
        spawnExplosionAt(en.x + en.w / 2, en.y + en.h / 2, 36);
        try { b.el.remove(); } catch (e) {}
        State.bullets.splice(i, 1);
        State.score += 10;
        updateHUD();
        break; // break enemy loop (bullet consumed)
      }
    }
  }

  // enemy bullets vs player
  for (let i = State.enemyBullets.length - 1; i >= 0; i--) {
    const eb = State.enemyBullets[i];
    // Update coordinates
    eb.x = parseFloat(eb.el.style.left); 
    eb.y = parseFloat(eb.el.style.top);

    const ebRect = { 
      left: eb.x, top: eb.y, 
      right: eb.x + eb.w, bottom: eb.y + eb.h 
    };
    if (!State.player) continue;
    
    const p = State.player;
    const pRect = { 
      left: p.x, top: p.y, 
      right: p.x + p.w, bottom: p.y + p.h 
    };

    if (rectsOverlap(ebRect, pRect)) {
      // player hit
      spawnExplosionAt(State.player.x + State.player.w / 2, State.player.y + State.player.h / 2, 50);
      try { eb.el.remove(); } catch (e) {}
      State.enemyBullets.splice(i, 1);
      handlePlayerHit();
    }
  }

  // enemies reaching bottom or hitting player area -> treat as player hit
  for (const en of State.enemies) {
    if (!en.alive) continue;
    if (en.y + en.h >= State.player.y) {
      // an enemy reached player zone
      handlePlayerHit(true);
      break;
    }
  }
}

function handlePlayerHit(enemyReached = false) {
    // remove a life and update HUD
    State.lives -= 1;
    updateHUD();
    // hide player briefly and respawn or end game
    if (State.player && State.player.el) State.player.el.style.visibility = "hidden";
    // clear bullets on hit
    State.bullets.forEach(b => { try { b.el.remove(); } catch (e) {} });
    State.enemyBullets.forEach(b => { try { b.el.remove(); } catch (e) {} });
    State.bullets = [];
    State.enemyBullets = [];

    if (State.lives <= 0) {
        // game over
        showOverlay("GAME OVER — Press ENTER or Z to play again"); 
        State.running = false;
        return;
  }

  // respawn after short delay
    State.paused = true;
    showOverlay("You were hit! Respawning...");
    setTimeout(() => {
        // respawn player in center-bottom
        if (State.player && State.player.el) {
        const startYOffset = 30 * scaleFactor;
        State.player.x = (State.width - State.player.w) / 2;
        State.player.y = State.height - State.player.h - startYOffset;
        State.player.el.style.left = State.player.x + "px";
        State.player.el.style.top = State.player.y + "px";
        State.player.el.style.visibility = "visible";
        }
        State.paused = false;
        hideOverlay();
    }, 900);
}

function updateHUD() {
    if (!State.hudInfo) return;
    let scoreEl = document.getElementById("score");
    let levelEl = document.getElementById("level");
    let livesEl = document.getElementById("lives");
    let powerEl = document.getElementById("power");
    if (!scoreEl || !levelEl || !livesEl || !powerEl) {
        // fallback: replace hud inner HTML
        State.hudInfo.innerHTML = `<div id="score">Score: ${State.score}</div><div id="level">Level: ${State.level}</div><div id="lives">Lives: ${State.lives}</div><div id="power">Bombs: ${State.bombsLeft}</div>`;
        return;
    }
    scoreEl.textContent = `Score: ${State.score}`;
    levelEl.textContent = `Level: ${State.level}`;
    livesEl.textContent = `Lives: ${State.lives}`;
    powerEl.textContent = `Bomb: ${State.bombsLeft > 0 ? 'Ready (' + State.bombsLeft + ')' : 'Used'}`;
}

// *** UPDATED: Bomb logic to kill a percentage of enemies but not the mothership ***
function useBomb() {
    if (State.bombsLeft <= 0) return;
    State.bombsLeft--;
    updateHUD();

    const aliveEnemies = State.enemies.filter(e => e.alive);
    const numToKill = Math.ceil(aliveEnemies.length * CONFIG.bombKillPercentage);

    // Shuffle and select enemies to kill
    const shuffled = aliveEnemies.sort(() => 0.5 - Math.random());
    const enemiesToDie = shuffled.slice(0, numToKill);

    enemiesToDie.forEach(en => {
        en.alive = false;
        try { en.el.remove(); } catch (e) {}
        // Spawn a larger explosion for the bomb effect
        spawnExplosionAt(en.x + en.w / 2, en.y + en.h / 2, 70); 
        State.score += 10;
    });
    
    // Mothership is NOT affected by the bomb now
    if (State.mothership) {
        // Give visual feedback for bomb use near mothership without killing it
        spawnExplosionAt(State.mothership.x + State.mothership.w / 2, State.mothership.y + State.mothership.h / 2, 100);
    }
    
    // Filter out the dead enemies
    State.enemies = State.enemies.filter(e => e.alive);
}

let enemyDirection = 1; // 1 = right, -1 = left
const GAME_AREA_PADDING = 10; // For boundary checks
function moveEnemiesTick() {
    const alive = State.enemies.filter(e => e.alive);
    if (alive.length === 0) return;

    // Speed and drop distance are scaled
    const speed = (CONFIG.enemyMoveSpeedBase + 0.15 * (State.level - 1)) * scaleFactor;
    const dropDistance = CONFIG.enemyDropOnEdge * scaleFactor;

    // compute bounds of alive enemies
    let minX = Infinity, maxX = -Infinity;
    alive.forEach(e => {
        minX = Math.min(minX, e.x);
        maxX = Math.max(maxX, e.x + e.w);
    });

    // if edge reached, flip direction and drop
    if (enemyDirection === 1 && maxX + speed >= State.width - GAME_AREA_PADDING) {
        enemyDirection = -1;
        alive.forEach(e => { e.y += dropDistance; e.el.style.top = e.y + "px"; });
    } else if (enemyDirection === -1 && minX - speed <= GAME_AREA_PADDING) {
        enemyDirection = 1;
        alive.forEach(e => { e.y += dropDistance; e.el.style.top = e.y + "px"; });
    } else {
        // move horizontally
        alive.forEach(e => {
        e.x += speed * enemyDirection;
        e.el.style.left = e.x + "px";
        });
    }

    // mothership can slowly move left-right on level 3
    if (State.mothership) {
        const ms = State.mothership;
        if (!ms.vx) ms.vx = 0.9 * enemyDirection * scaleFactor; // Scaled velocity
        ms.x += ms.vx;
        // reverse if near edges
        if (ms.x <= GAME_AREA_PADDING || ms.x + ms.w >= State.width - GAME_AREA_PADDING) {
          ms.vx *= -1;
          // ensure it doesn't get stuck out of bounds
          ms.x = clamp(ms.x, GAME_AREA_PADDING, State.width - ms.w - GAME_AREA_PADDING);
        }
        ms.el.style.left = ms.x + "px";

        // Update HP bar position to match mothership
        ms.hpEl.style.left = ms.x + "px";
    }
}


function startNextLevelTransition() {
    State.level++;
    if (State.level > 3) {
        // player wins
        showOverlay("YOU WON! Press ENTER or Z to play again"); 
        State.running = false;
        return;
    }
    
    // 1. Start transition animation
    State.paused = true;
    showOverlay(`Level ${State.level} - Get ready!`);
    const wipeEl = document.getElementById("level-transition-wipe");
    if (wipeEl) wipeEl.classList.add('active');

    // 2. Wait for animation to mostly finish, then spawn next level
    setTimeout(() => {
        // clear any leftover bullets
        State.bullets.forEach(b => { try { b.el.remove(); } catch (e) {} });
        State.enemyBullets.forEach(b => { try { b.el.remove(); } catch (e) {} });
        State.bullets = [];
        State.enemyBullets = [];
        
        // spawn new wave
        createEnemiesForLevel(State.level);
        updateHUD();

        // 3. Remove pause and animation after a slight delay
        setTimeout(() => {
            if (wipeEl) wipeEl.classList.remove('active');
            State.paused = false;
            hideOverlay();
        }, 200); // Small delay for the wipe to clear
    }, 1000); // Total animation duration is 1.2s, start spawning at 1s
}

function checkLevelProgress() {
    const anyAliveEnemies = State.enemies.some(e => e.alive);
    const mothershipAlive = !!State.mothership;
    
    if (!anyAliveEnemies && !mothershipAlive) {
        // Level cleared, start transition
        startNextLevelTransition();
    }
}

let lastTime = performance.now();
function gameLoop(now) {
    if (!State.running) return;
    requestAnimationFrame(gameLoop);

    // timing
    const elapsed = now - lastTime;
    if (elapsed < CONFIG.fpsInterval) return;
    lastTime = now;

    if (State.paused) return;

  // Player movement from keys (speed is scaled)
const playerSpeedScaled = CONFIG.playerSpeed * scaleFactor;
if (State.player) {
    const maxWidth = State.width - State.player.w;
    if (State.keys["arrowleft"] || State.keys["a"]) {
      State.player.x = clamp(State.player.x - playerSpeedScaled, 0, maxWidth);
      State.player.el.style.left = State.player.x + "px";
    }
    if (State.keys["arrowright"] || State.keys["d"]) {
      State.player.x = clamp(State.player.x + playerSpeedScaled, 0, maxWidth);
      State.player.el.style.left = State.player.x + "px";
    }
}

  // Move player bullets up (speed is scaled)
const bulletSpeedScaled = CONFIG.bulletSpeed * scaleFactor;
for (let i = State.bullets.length - 1; i >= 0; i--) {
    const b = State.bullets[i];
    b.y -= bulletSpeedScaled;
    if (b.y + b.h < 0) {
      try { b.el.remove(); } catch (e) {}
      State.bullets.splice(i, 1);
      continue;
    }
    b.el.style.top = b.y + "px";
    b.x = parseFloat(b.el.style.left);
}

  // Move enemy bullets down (speed is scaled)
const enemyBulletSpeedScaled = CONFIG.enemyBulletSpeed * scaleFactor;
for (let i = State.enemyBullets.length - 1; i >= 0; i--) {
    const eb = State.enemyBullets[i];
    eb.y += enemyBulletSpeedScaled;
    if (eb.y > State.height + 20) {
        try { eb.el.remove(); } catch (e) {}
        State.enemyBullets.splice(i, 1);
        continue;
        }
    eb.el.style.top = eb.y + "px";
    eb.x = parseFloat(eb.el.style.left);
  }

  moveEnemiesTick();

  enemyShooting(now);

  if (State.level === 3) mothershipShooting(now);

  processCollisions();

  checkLevelProgress();

  updateHUD();
}

document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    // Prevent rapid-fire if the key is already pressed, EXCEPT for movement keys
    if (State.keys[k] && !['arrowleft', 'arrowright', 'a', 'd'].includes(k)) return;
    
    State.keys[k] = true;

    // single-press controls
    if (k === " " || k === "enter" || k === "z") {
        // Shoot or START/RESTART game
        if (!State.running) {
          startGame(); // Will initialize/reset the game and start the loop
          return;
        }
        if (State.paused) return;
        spawnPlayerBullet();
    } else if (k === "b") {
        // bomb
        if (!State.running || State.paused) return;
        useBomb();
    } 
});

document.addEventListener("keyup", (e) => {
  State.keys[e.key.toLowerCase()] = false;
});

// NEW FUNCTION: Handles starting or restarting the game
function startGame() {
  if (State.running) return; // Only run if the game is stopped
  
  // If this is a restart (not the initial load where level is 1 and lives > 0)
  if (State.level > 1 || State.lives <= 0) {
    restartGame(false); // Clean up and reset state without re-running setupUI
    setupUI(); // Re-run setupUI after a restart to clear and rebuild game area/HUD
  } else {
    // Initial start on level 1, no cleanup needed
    updateHUD();
  }

  hideOverlay();
  createPlayer();
  createEnemiesForLevel(State.level);
  State.running = true;

  // Start music
  if (bgMusic && typeof bgMusic.play === 'function') {
    try { bgMusic.currentTime = 0; bgMusic.play(); } catch (e) { /* play may be blocked */ }
  }

  // Start game loop
  requestAnimationFrame(gameLoop);
}


// REFACTORED RESTART: For cleanup only
function restartGame() {
  // Stop the game loop
  State.running = false; 

  // remove all DOM sprites and reset arrays
  State.bullets.forEach(b => { try { b.el.remove(); } catch (e) {} });
  State.enemyBullets.forEach(b => { try { b.el.remove(); } catch (e) {} });
  State.enemies.forEach(en => { try { en.el.remove(); } catch (e) {} });
  if (State.mothership && State.mothership.el) try { State.mothership.el.remove(); } catch(e){}
  if (State.mothership && State.mothership.hpEl) try { State.mothership.hpEl.remove(); } catch(e){} 
  if (State.player && State.player.el) try { State.player.el.remove(); } catch(e){}
  State.bullets = [];
  State.enemyBullets = [];
  State.enemies = [];
  State.mothership = null;
  State.player = null;

  // reset values
  State.score = 0;
  State.lives = CONFIG.playerStartLives;
  State.level = 1;
  State.paused = false;
  State.bombsLeft = CONFIG.bombCount;
  enemyDirection = 1;
  State.lastEnemyShootTime = 0;
  State.lastMothershipShootTime = 0;
  updateHUD();
}

function initializeGame() {
  setupUI();
  updateHUD();
  // Game loop will start once a key is pressed and startGame() is called
}


window.addEventListener("resize", () => {
    State.gameArea = document.getElementById("si-game-area");
    if (State.gameArea) {
      State.width = State.gameArea.clientWidth;
      State.height = State.gameArea.clientHeight;
    } else {
      // Fallback if game area is somehow not there, although CSS should place it
      State.width = window.innerWidth * 0.9;
      State.height = window.innerHeight * 0.9;
    }

    calculateScaleFactor(); // Important: Recalculate scale on resize!
    
    // Update Player dimensions and reposition
    if (State.player && State.player.el) {
        const pW = CONFIG.playerWidth * scaleFactor;
        const pH = CONFIG.playerHeight * scaleFactor;
        const startYOffset = 30 * scaleFactor;
        
        State.player.w = pW;
        State.player.h = pH;
        State.player.el.style.width = pW + "px";
        State.player.el.style.height = pH + "px";

        // Reposition player for new height/width
        State.player.y = State.height - State.player.h - startYOffset;
        State.player.x = clamp(State.player.x, 0, State.width - State.player.w);

        State.player.el.style.top = State.player.y + "px";
        State.player.el.style.left = State.player.x + "px";
    }

    // Update Mothership dimensions and reposition (if alive)
    if (State.mothership) {
        const msW = Math.floor(CONFIG.playerWidth * CONFIG.mothershipSizeFactor * scaleFactor);
        const msH = Math.floor(CONFIG.playerHeight * CONFIG.mothershipSizeFactor * 0.7 * scaleFactor);
        const startY = 30 * scaleFactor;

        // Update object size properties
        State.mothership.w = msW;
        State.mothership.h = msH;
        State.mothership.y = startY;

        // Update element styles
        State.mothership.el.style.width = msW + "px";
        State.mothership.el.style.height = msH + "px";
        State.mothership.el.style.top = startY + "px";

        // Update HP bar
        State.mothership.hpEl.style.width = msW + "px";
        State.mothership.hpEl.style.top = (startY - (15 * scaleFactor)) + "px";
    }

    // Note: Enemies and bullets positions/sizes will be slightly off until next level or collision update, 
    // but their movement will be corrected by the next gameLoop frame using the new scaleFactor.
});

initializeGame();
