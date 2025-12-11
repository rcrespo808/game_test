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

        // Debug Text
        this.debugText = this.add.text(10, 10, "Debug v8", { fontSize: '12px', fill: '#0f0' });
    }

    startGame() {
        this.isRunning = true;
        this.isDead = false;
        this.startText.setVisible(false);

        // Clear existing
        this.activeHazards.forEach(h => h.destroy());
        this.activeHazards = [];

        // START SPAWN LOOP
        this.spawnTimer = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: this.spawnHazard,
            callbackScope: this
        });
    }

    spawnHazard() {
        if (this.isDead || !this.isRunning) return;

        const laneIndex = Phaser.Math.Between(0, this.lanes.length - 1);
        const baseY = this.lanes[laneIndex];
        const offset = Phaser.Math.Between(-18, 18);
        const y = baseY + offset;

        const fromLeft = Phaser.Math.Between(0, 1) === 0;
        const spawnX = fromLeft ? -60 : this.width + 60;
        // Velocity in pixels per second
        const velocityX = fromLeft ? 250 : -250;

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

    handlePlayerHit() {
        if (this.isDead) return;
        this.isDead = true;
        this.isRunning = false;

        if (this.spawnTimer) this.spawnTimer.remove(false);

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

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: "#111111",
    scene: [RunnerScene]
};

const game = new Phaser.Game(config);
