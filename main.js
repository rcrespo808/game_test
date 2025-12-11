class RunnerScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RunnerScene' });
    }

    preload() {
        // ASSET MANAGEMENT: Generate Texture
        // 40x40 Red solid square for maximum visibility reliability
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xff4444);
        graphics.fillRect(0, 0, 40, 40);
        graphics.generateTexture('hazard_texture', 40, 40);
        console.log(">> Texture 'hazard_texture' generated");
    }

    create() {
        console.log(">> SCENE START - v8 (Manual Physics Refactor)");
        const width = this.game.config.width;
        const height = this.game.config.height;

        this.width = width;
        this.height = height;

        // 1. Grid Definitions
        this.lanes = [height * 0.3, height * 0.5, height * 0.7];
        this.columns = [width / 2 - 120, width / 2, width / 2 + 120];

        this.currentLaneIndex = 1;
        this.currentColumnIndex = 1;

        // Lane visuals
        for (let y of this.lanes) {
            this.add.line(0, 0, 0, y, width, y, 0xffffff, 0.1).setOrigin(0, 0).setDepth(0);
        }

        // 2. Player Setup (Keep Arcade for Player Tweening convenience, or just visual)
        // We can keep specific arcade body for debug, but we will rely on manual distance check
        const startX = this.columns[this.currentColumnIndex];
        const startY = this.lanes[this.currentLaneIndex];

        this.player = this.add.circle(startX, startY, 16, 0x00ffff);
        this.player.setDepth(10);

        // 3. Hazard Container (Regular Array for Manual Management)
        this.activeHazards = [];

        // Hotspot State
        this.greenHotspot = null;
        this.redHotspots = [];
        this.greenScore = 0;
        this.greenActive = false;
        this.greenCircle = null;
        this.greenActivationTween = null;
        this.greenPulseTween = null;
        this.greenTimer = null;
        this.redTimer = null;
        this.hazardSpawnCount = 0;

        // 4. Input
        this.cursors = this.input.keyboard.createCursorKeys();

        // 5. Game State
        this.isDead = false;
        this.isRunning = false;

        // 6. UI
        this.startText = this.add.text(width / 2, height / 2, "Click to Start", { fontSize: "24px", color: "#ffffff" })
            .setOrigin(0.5)
            .setDepth(100)
            .setInteractive({ useHandCursor: true });

        this.startText.on("pointerdown", () => {
            if (this.isRunning || this.isDead) return;
            this.startGame();
        });

        this.scoreText = this.add.text(16, 16, "Score: 0", {
            fontSize: "20px",
            color: "#ffffff"
        }).setDepth(20);

        // Timers for hotspots
        this.greenTimer = this.time.addEvent({
            delay: 10000,
            loop: true,
            callback: this.spawnGreenHotspot,
            callbackScope: this
        });

        this.redTimer = this.time.addEvent({
            delay: 3000,
            loop: true,
            callback: this.spawnRedHotspot,
            callbackScope: this
        });

        // Debug Text
        this.debugText = this.add.text(10, 10, "Debug v8", { fontSize: '12px', fill: '#0f0' });
    }

    startGame() {
        this.isRunning = true;
        this.isDead = false;
        this.startText.setVisible(false);
        this.hazardSpawnCount = 0;

        // Clear existing
        this.activeHazards.forEach(h => h.destroy());
        this.activeHazards = [];

        // Reset hotspots
        this.clearGreenHotspot();
        this.clearRedHotspots();
        this.greenScore = 0;
        this.scoreText.setText("Score: 0");

        // START SPAWN LOOP
        this.spawnTimer = this.time.addEvent({
            delay: 750,
            loop: true,
            callback: this.spawnHazard,
            callbackScope: this
        });
    }

    spawnHazard() {
        if (this.isDead || !this.isRunning) return;

        this.hazardSpawnCount += 1;

        const randomLane = Phaser.Math.Between(0, this.lanes.length - 1);
        const forcedLane = (this.currentLaneIndex + 2) % this.lanes.length;
        const laneIndex = this.hazardSpawnCount % 4 === 0 ? forcedLane : randomLane;
        const baseY = this.lanes[laneIndex];
        const offset = Phaser.Math.Between(-18, 18);
        const y = baseY + offset;

        const fromLeft = Phaser.Math.Between(0, 1) === 0;
        const spawnX = fromLeft ? -60 : this.width + 60;
        // Velocity in pixels per second
        const velocityX = fromLeft ? 420 : -420;

        // Create Sprite (NOT Physics Image)
        const hazard = this.add.image(spawnX, y, 'hazard_texture');
        hazard.setDepth(5);

        // Attach custom data for manual update
        hazard.vx = velocityX;
        hazard.isHazard = true; // flag

        // Add to our manual list
        this.activeHazards.push(hazard);

        console.log(`>> Spawned Hazard at ${spawnX}, ${y}`);
    }

    update(time, delta) {
        // Debug update
        this.debugText.setText(`Hazards: ${this.activeHazards.length} | FPS: ${(1000 / delta).toFixed(0)}`);

        if (this.isDead || !this.isRunning) return;

        // 1. Player Input
        this.handleInput();

        // 1.5. Grid hotspot checks
        this.checkGridHotspots();

        // 2. Manual Hazard Update (Motion + Cleanup + Collision)
        // Delta is in ms, so divide by 1000 for seconds
        const dt = delta / 1000;

        for (let i = this.activeHazards.length - 1; i >= 0; i--) {
            const h = this.activeHazards[i];

            // Motion
            h.x += h.vx * dt;

            // Rotation (Visual flair)
            h.rotation += 2 * dt;

            // Cleanup
            if ((h.vx > 0 && h.x > this.width + 100) || (h.vx < 0 && h.x < -100)) {
                h.destroy();
                this.activeHazards.splice(i, 1);
                continue;
            }

            // Collision: Simple Distance Check
            // Player radius ~16, Hazard radius ~20 -> Threshold ~36
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, h.x, h.y);
            if (dist < 36) {
                this.handlePlayerHit();
            }
        }
    }

    handleInput() {
        let moved = false;
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.currentLaneIndex = Math.max(0, this.currentLaneIndex - 1);
            moved = true;
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            this.currentLaneIndex = Math.min(2, this.currentLaneIndex + 1);
            moved = true;
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
            this.currentColumnIndex = Math.max(0, this.currentColumnIndex - 1);
            moved = true;
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
            this.currentColumnIndex = Math.min(2, this.currentColumnIndex + 1);
            moved = true;
        }

        if (moved) {
            this.movePlayerToGrid();
        }
    }

    getGridPosition(row, col) {
        const x = this.columns[col];
        const y = this.lanes[row];
        return { x, y };
    }

    isPlayerAt(row, col) {
        return row === this.currentLaneIndex && col === this.currentColumnIndex;
    }

    movePlayerToGrid() {
        const targetX = this.columns[this.currentColumnIndex];
        const targetY = this.lanes[this.currentLaneIndex];

        this.tweens.add({
            targets: this.player,
            x: targetX,
            y: targetY,
            duration: 100,
            ease: "Sine.easeOut"
        });
    }

    spawnGreenHotspot() {
        if (this.isDead || !this.isRunning) return;

        this.clearGreenHotspot();
        this.greenActive = false;

        const candidates = [];
        for (let row = 0; row < this.lanes.length; row++) {
            for (let col = 0; col < this.columns.length; col++) {
                const isRed = this.redHotspots.some(h => h.row === row && h.col === col);
                if (!isRed) {
                    candidates.push({ row, col });
                }
            }
        }

        if (candidates.length === 0) {
            return;
        }

        const choice = Phaser.Utils.Array.GetRandom(candidates);
        this.greenHotspot = { row: choice.row, col: choice.col };

        const pos = this.getGridPosition(choice.row, choice.col);
        this.greenCircle = this.add.circle(pos.x, pos.y, 18, 0x00ff00, 0.9).setOrigin(0.5);
        this.greenCircle.setScale(1.4);

        if (this.greenActivationTween) {
            this.greenActivationTween.stop();
        }
        this.greenActivationTween = this.tweens.add({
            targets: this.greenCircle,
            scale: 1,
            alpha: 0.7,
            duration: 500,
            ease: "Sine.easeOut",
            onComplete: () => {
                this.greenActive = true;
                this.greenPulseTween = this.tweens.add({
                    targets: this.greenCircle,
                    scale: 1.2,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut"
                });
            }
        });
    }

    clearGreenHotspot() {
        if (this.greenPulseTween) {
            this.greenPulseTween.stop();
            this.greenPulseTween = null;
        }
        if (this.greenActivationTween) {
            this.greenActivationTween.stop();
            this.greenActivationTween = null;
        }
        if (this.greenCircle) {
            this.greenCircle.destroy();
            this.greenCircle = null;
        }
        this.greenHotspot = null;
        this.greenActive = false;
    }

    spawnRedHotspot() {
        if (this.isDead || !this.isRunning) return;

        if (this.redHotspots.length >= 3) {
            return;
        }

        const candidates = [];
        for (let row = 0; row < this.lanes.length; row++) {
            for (let col = 0; col < this.columns.length; col++) {
                const isGreen =
                    this.greenHotspot &&
                    this.greenHotspot.row === row &&
                    this.greenHotspot.col === col;

                const isRed = this.redHotspots.some(h => h.row === row && h.col === col);

                if (!isGreen && !isRed) {
                    candidates.push({ row, col });
                }
            }
        }

        if (candidates.length === 0) {
            return;
        }

        const choice = Phaser.Utils.Array.GetRandom(candidates);
        const pos = this.getGridPosition(choice.row, choice.col);

        const redCircle = this.add.circle(pos.x, pos.y, 18, 0xff0000, 1).setOrigin(0.5);
        redCircle.setScale(1.4);

        const hotspot = {
            row: choice.row,
            col: choice.col,
            circle: redCircle,
            active: false,
            expireEvent: null,
            activationEvent: null,
            pulseTween: null
        };

        hotspot.activationEvent = this.tweens.add({
            targets: redCircle,
            scale: 1,
            alpha: 0.6,
            duration: 500,
            ease: "Sine.easeOut",
            onComplete: () => {
                hotspot.active = true;
                hotspot.pulseTween = this.tweens.add({
                    targets: redCircle,
                    scale: 1.2,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut"
                });
            }
        });

        hotspot.expireEvent = this.time.delayedCall(10000, () => {
            this.removeRedHotspot(hotspot);
        });

        this.redHotspots.push(hotspot);
    }

    clearRedHotspots() {
        this.redHotspots.forEach(h => {
            if (h.pulseTween) {
                h.pulseTween.stop();
            }
            if (h.circle) {
                h.circle.destroy();
            }
            if (h.expireEvent) {
                h.expireEvent.remove(false);
            }
            if (h.activationEvent) {
                h.activationEvent.stop();
            }
        });
        this.redHotspots = [];
    }

    removeRedHotspot(hotspot) {
        const index = this.redHotspots.indexOf(hotspot);
        if (index !== -1) {
            if (hotspot.pulseTween) {
                hotspot.pulseTween.stop();
            }
            if (hotspot.circle) {
                hotspot.circle.destroy();
            }
            if (hotspot.expireEvent) {
                hotspot.expireEvent.remove(false);
            }
            if (hotspot.activationEvent) {
                hotspot.activationEvent.stop();
            }
            this.redHotspots.splice(index, 1);
        }
    }

    checkGridHotspots() {
        if (this.isDead || !this.isRunning) return;

        const row = this.currentLaneIndex;
        const col = this.currentColumnIndex;

        if (this.greenHotspot && this.greenActive && this.greenHotspot.row === row && this.greenHotspot.col === col) {
            this.greenScore += 1;
            this.scoreText.setText("Score: " + this.greenScore);
            this.clearGreenHotspot();
        }

        const isOnRed = this.redHotspots.some(h => h.active && h.row === row && h.col === col);
        if (isOnRed) {
            this.triggerGridDeath();
        }
    }

    triggerGridDeath() {
        if (this.isDead) return;
        this.handlePlayerHit();
    }

    handlePlayerHit() {
        if (this.isDead) return;
        this.isDead = true;
        this.isRunning = false;

        if (this.spawnTimer) this.spawnTimer.remove(false);
        if (this.greenTimer) this.greenTimer.remove(false);
        if (this.redTimer) this.redTimer.remove(false);

        // Pop Animation
        this.tweens.add({
            targets: this.player,
            scale: 1.6,
            alpha: 0,
            duration: 250,
            ease: "Back.easeOut",
            onComplete: () => {
                this.showRestartButton();
            }
        });
    }

    showRestartButton() {
        this.restartText = this.add.text(
            this.width / 2,
            this.height / 2,
            "Restart",
            { fontSize: "24px", color: "#ffffff" }
        ).setOrigin(0.5).setDepth(100).setInteractive({ useHandCursor: true });

        this.restartText.on("pointerdown", () => {
            this.scene.restart();
        });
    }
}

// Export for testing (Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RunnerScene };
}

// Initialize game in browser environment
if (typeof window !== 'undefined' && typeof Phaser !== 'undefined') {
    const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        backgroundColor: "#111111",
        scene: [RunnerScene]
    };

    const game = new Phaser.Game(config);
}
