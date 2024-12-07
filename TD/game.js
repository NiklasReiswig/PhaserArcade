// game.js

// Tower spots and cost
const towerSpots = [
    { x: 0.2, y: 0.3 }, 
    { x: 0.4, y: 0.48 },
    { x: 0.85, y: 0.13 },
    { x: 0.7, y: 0.5 },
    { x: 0.4, y: 0.22 },
    { x: 0.09, y: 0.5 },
    { x: 0.23, y: 0.7 },
    { x: 0.21, y: 0.52 },
    { x: 0.56, y: 0.8 },
    { x: 0.45, y: 0.73 },
    { x: 0.79, y: 0.3 },
    { x: 0.6, y: 0.3 },
    { x: 0.8, y: 0.83 },
    { x: 0.1, y: 0.73 },
    { x: 0.33, y: 0.84 },
    { x: 0.54, y: 0.52 },
    // Add more spots as needed
];

const TOWER_COST = 150; // Cost to build a tower
const helperCost = 30;  // Cost to hire help

// Player stats
let playerHealth;
let playerGold = 700;
let currentRound = 0; // Start at 0, will increment in startNextWave

// Mob types
const mobTypes = [
    { sides: 3, health: 30, speed: 110, color: 0xFF0000 }, // Triangle
    { sides: 4, health: 40, speed: 100, color: 0xFFA500 }, // Square
    { sides: 5, health: 50, speed: 90, color: 0xFFFF00 }, // Pentagon
    { sides: 6, health: 60, speed: 80, color: 0x008000 }, // Hexagon
    { sides: 7, health: 70, speed: 70, color: 0x0000FF }, // Heptagon
    { sides: 8, health: 80, speed: 60, color: 0x800080 }  // Octagon
];

// Function to calculate mob counts per round
function calculateMobCounts(round) {
    const mobCounts = [];

    mobTypes.forEach(mobType => {
        let count = 0;

        switch (mobType.sides) {
            case 3: // Triangle
                count = Math.ceil(round * 1.5);
                break;
            case 4: // Square
                count = Math.ceil(round * 1.2);
                break;
            case 5: // Pentagon
                count = Math.ceil(round * 1.0);
                break;
            case 6: // Hexagon
                count = Math.ceil(round * 0.8);
                break;
            case 7: // Heptagon
                count = Math.ceil(round * 0.6);
                break;
            case 8: // Octagon
                count = Math.ceil(round * 0.4);
                break;
            default:
                count = 0;
        }

        mobCounts.push({
            mobType: mobType,
            count: count
        });
    });

    return mobCounts;
}

// Menu Scene
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        // Load any assets needed for the menu (optional)
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Title text
        const titleText = this.add.text(width / 2, height * 0.2, 'Select Difficulty', {
            fontFamily: 'Arial',
            fontSize: '48px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Difficulty options
        const difficulties = [
            { label: 'Easy', health: 200 },
            { label: 'Medium', health: 100 },
            { label: 'Hard', health: 50 }
        ];

        difficulties.forEach((difficulty, index) => {
            const optionText = this.add.text(width / 2, height * (0.4 + index * 0.15), difficulty.label, {
                fontFamily: 'Arial',
                fontSize: '36px',
                color: '#FFFF00',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5).setInteractive();

            // Highlight on hover
            optionText.on('pointerover', () => {
                optionText.setStyle({ color: '#FFD700' }); // Gold color
            });

            optionText.on('pointerout', () => {
                optionText.setStyle({ color: '#FFFF00' }); // Yellow color
            });

            // Handle click
            optionText.on('pointerdown', () => {
                // Store the selected health value
                this.registry.set('playerHealth', difficulty.health);

                // Start the GameScene
                this.scene.start('GameScene');
            });
        });

        // Add the Back button
        this.backButton = this.add.text(width - 80, 10, 'Back', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#FF0000',
            stroke: '#000000',
            strokeThickness: 2,
            backgroundColor: '#000000'
        }).setInteractive().setOrigin(0, 0).setDepth(1000);

        // Handle button click
        this.backButton.on('pointerdown', () => {
            this.goBackToIndex();
        });

        // Adjust button position on resize
        this.scale.on('resize', () => {
            this.backButton.setPosition(this.scale.width - 80, 10);
        });
    }

    goBackToIndex() {
        // Option 1: Use window.location.href to redirect
        window.location.href = '../index.html';

        // Option 2: Stop the scene and destroy the game
        this.scene.stop('MenuScene');
        this.sys.game.destroy(true);
    }

}

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // No assets to load
    }

    create() {
        // Retrieve playerHealth from the registry
        playerHealth = this.registry.get('playerHealth') || 100; // Default to 100 if not set

        this.graphics = this.add.graphics();

        // Initial drawing of the path
        drawPath.call(this);

        // Draw tower spots
        drawTowerSpots.call(this);

        // Create overlays for health, gold, and rounds
        createOverlays.call(this);

        // Listen for resize events
        this.scale.on('resize', resize, this);

        // Enable input events
        this.input.on('pointerdown', onPointerDown, this);

        // Initialize game over flag
        this.isGameOver = false;

        // Group to hold all mobs
        this.mobs = [];

        // Variables for wave management
        this.mobsSpawned = 0;
        this.waveDelay = 5000; // Time between waves in milliseconds

        // Start the first wave
        this.startNextWave();
    }

    update(time, delta) {
        // Do not update the game if it is over
        if (this.isGameOver) {
            return;
        }
    
        // Manually adjust delta based on timeScale
        const adjustedDelta = delta * this.time.timeScale;
    
        // Update the overlays if values have changed
        this.healthText.setText(`Health: ${playerHealth}`);
        this.goldText.setText(`Gold: ${playerGold}`);
        this.roundText.setText(`Round: ${currentRound}`);
    
        // Optional: Display mobs remaining
        if (this.mobsInWave !== undefined) {
            const mobsRemaining = this.mobsInWave - this.mobsSpawned + this.mobs.length;
            this.roundText.setText(`Round: ${currentRound} | Mobs Left: ${mobsRemaining}`);
        }
    
        // Update each mob's position
        this.mobs.forEach(mob => {
            mob.updatePosition(adjustedDelta);
        });
    
        // Update each helper's position and attacks
        if (this.helpers) {
            this.helpers.forEach(helper => {
                helper.updatePosition(adjustedDelta);
                helper.attackMobs(this.mobs, adjustedDelta);
            });
        }
    
        // Handle tower attacks
        this.handleTowerAttacks(adjustedDelta);
    }

    startNextWave() {
        // Do not start a new wave if the game is over
        if (this.isGameOver) {
            return;
        }
    
        this.mobsSpawned = 0;
        currentRound++;
    
        // Calculate mob counts for this wave
        this.mobSpawnQueue = []; // Queue of mobs to spawn
    
        const mobCounts = calculateMobCounts(currentRound);
    
        // Build the spawn queue
        mobCounts.forEach(mobCount => {
            for (let i = 0; i < mobCount.count; i++) {
                // Clone the mobType to prevent shared references
                const clonedMobType = { ...mobCount.mobType };
                this.mobSpawnQueue.push(clonedMobType);
            }
        });
    
        // Check if current round is a boss round (multiple of 5)
        if (currentRound % 5 === 0) {
            // Calculate the number of bosses to spawn
            const numberOfBosses = currentRound / 5;
    
            // Add bosses to the spawn queue
            for (let i = 0; i < numberOfBosses; i++) {
                // Clone the bossMobType to ensure each boss is a separate instance
                const clonedBossType = { ...bossMobType };
                this.mobSpawnQueue.push(clonedBossType);
            }
    
            // **Display Boss Wave Message with Longer Duration**
            displayMessage.call(this, `Boss Wave: ${numberOfBosses} Boss${numberOfBosses > 1 ? 'es' : ''} Incoming!`, 4000);
        }
    
        // Shuffle the spawn queue for randomness
        Phaser.Utils.Array.Shuffle(this.mobSpawnQueue);
    
        // Set the total number of mobs in the wave (including bosses)
        this.mobsInWave = this.mobSpawnQueue.length;
    
        // **Calculate the spawn delay based on the current round**
        const spawnDelay = this.calculateSpawnDelay(currentRound);
    
        // Start spawning mobs
        this.spawnTimer = this.time.addEvent({
            delay: spawnDelay, // Use the dynamic spawn delay
            callback: this.spawnMob,
            callbackScope: this,
            repeat: this.mobsInWave - 1 // Number of times to repeat (mobsInWave - 1)
        });
    }

    calculateSpawnDelay(round) {
        // Calculate spawn delay with a formula
        const minDelay = 500; // Minimum delay of 500ms
        const maxDelay = 1500; // Maximum delay of 1500ms
        const delayDecreasePerRound = 50; // Decrease delay by 50ms per round
    
        let spawnDelay = maxDelay - (round * delayDecreasePerRound);
    
        // Ensure the spawn delay doesn't go below the minimum
        spawnDelay = Math.max(spawnDelay, minDelay);
    
        return spawnDelay;
    }

    spawnMob() {
        // Do not spawn mobs if the game is over
        if (this.isGameOver) {
            return;
        }

        // Get the next mob type from the queue
        if (this.mobSpawnQueue.length > 0) {
            const mobType = this.mobSpawnQueue.shift();

            // Create a new mob
            const mob = new Mob(this, this.pathCurve, mobType);

            // Add mob to the array
            this.mobs.push(mob);

            this.mobsSpawned++;
        }
    }

    mobReachedEnd(mob) {
        // Reduce player health
        playerHealth -= 10; // Adjust as needed

        // Remove mob from the array
        Phaser.Utils.Array.Remove(this.mobs, mob);

        // Check for game over
        if (playerHealth <= 0) {
            this.gameOver();
        }

        // Check if wave is complete and game is not over
        if (this.mobs.length === 0 && this.mobSpawnQueue.length === 0 && !this.isGameOver) {
            // Wait before starting the next wave
            this.time.delayedCall(this.waveDelay, this.startNextWave, [], this);
        }
    }

    mobDestroyed(mob) {
        // Increase player gold
        playerGold += 2; // Adjust as needed

        // Remove mob from the array
        Phaser.Utils.Array.Remove(this.mobs, mob);

        // Check if wave is complete and game is not over
        if (this.mobs.length === 0 && this.mobSpawnQueue.length === 0 && !this.isGameOver) {
            // Wait before starting the next wave
            this.time.delayedCall(this.waveDelay, this.startNextWave, [], this);
        }
    }

    goBackToIndex() {
        // Option 1: Use window.location.href to redirect
        window.location.href = '../index.html';

        // Option 2: If you want to stop the game and clear resources
        this.scene.stop('GameScene');
        this.scene.stop('MenuScene');
        this.sys.game.destroy(true);
    }

    gameOver() {
        // Stop spawning mobs
        this.time.removeAllEvents();
    
        // Display game over message
        displayMessage.call(this, 'Game Over');
    
        // Set game over flag
        this.isGameOver = true;
    
        // Wait for 3 seconds before returning to the menu
        this.time.delayedCall(3000, () => {
            // Reset game variables
            playerGold = 500;
            currentRound = 0;
    
            // Remove remaining mobs from the game
            this.mobs.forEach(mob => {
                mob.graphics.destroy();
            });
            this.mobs = [];
    
            // Remove helpers
            if (this.helpers) {
                this.helpers.forEach(helper => {
                    helper.graphics.destroy();
                });
                this.helpers = [];
            }
    
            // Reset tower spots
            resetTowerSpots.call(this);
    
            // Transition back to the menu scene
            this.scene.start('MenuScene');
        }, [], this);
    }

    handleTowerAttacks(deltaTime) {
        // Check if there are any towers placed
        if (!this.placedTowers || this.placedTowers.length === 0) {
            return;
        }
    
        // For each tower, update attack timer and check if it can attack
        this.placedTowers.forEach(tower => {
            // Update attack timer
            tower.attackTimer += deltaTime; // deltaTime is adjusted for timeScale
    
            // Check if the tower can attack (based on cooldown)
            if (tower.attackTimer >= tower.attackCooldown) {
                // Find the closest mob within range
                let closestMob = null;
                let closestDistance = Infinity;
    
                this.mobs.forEach(mob => {
                    const width = this.scale.width;
                    const height = this.scale.height;
    
                    const towerX = tower.x * width;
                    const towerY = tower.y * height;
    
                    const mobX = mob.graphics.x;
                    const mobY = mob.graphics.y;
    
                    const distance = Phaser.Math.Distance.Between(towerX, towerY, mobX, mobY);
    
                    if (distance <= tower.range && distance < closestDistance) {
                        closestMob = mob;
                        closestDistance = distance;
                    }
                });
    
                // If a mob is within range, attack it
                if (closestMob) {
                    // Deal damage to the mob
                    closestMob.takeDamage(tower.damage);
    
                    // Reset the attack timer
                    tower.attackTimer = 0;
    
                    // Draw the attack line
                    this.drawAttackLine(tower, closestMob);
                }
            }
        });
    }

    drawAttackLine(tower, mob) {
        const width = this.scale.width;
        const height = this.scale.height;

        const towerX = tower.x * width;
        const towerY = tower.y * height;

        const mobX = mob.graphics.x;
        const mobY = mob.graphics.y;

        // Create a graphics object for the line
        const line = this.add.graphics();

        // Draw the line
        line.lineStyle(2, 0xFF0000, 1);
        line.beginPath();
        line.moveTo(towerX, towerY);
        line.lineTo(mobX, mobY);
        line.strokePath();

        // Remove the line after a short duration
        this.time.delayedCall(100, () => {
            line.destroy();
        });
    }
}

// Mob Class
class Mob {
    constructor(scene, path, mobType) {
        this.scene = scene;
        this.path = path;
        this.mobType = mobType;

        // Create graphics object for the mob
        this.graphics = scene.add.graphics();

        // Health
        this.maxHealth = mobType.health; // Store maximum health
        this.health = mobType.health;

        // Movement variables
        this.speed = mobType.speed; // Speed in pixels per second
        this.distanceTravelled = 0; // Distance travelled along the path

        // Total length of the path
        this.pathLength = scene.pathLength;

        // Initial position
        this.updatePosition(0);

        // Draw the shape with initial color
        this.updateAppearance();
    }

    drawShape(x, y, color = this.mobType.color) {
        const sides = this.mobType.sides;
        const radius = 15; // Adjust as needed

        this.graphics.clear();

        this.graphics.fillStyle(color, 1);
        this.graphics.lineStyle(1, 0x000000, 1); // Optional: Outline

        // Draw polygon centered at (x, y)
        this.graphics.beginPath();
        for (let i = 0; i <= sides; i++) {
            const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
            const px = radius * Math.cos(angle);
            const py = radius * Math.sin(angle);
            if (i === 0) {
                this.graphics.moveTo(px, py);
            } else {
                this.graphics.lineTo(px, py);
            }
        }
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();

        // Set position
        this.graphics.setPosition(x, y);
    }

    updatePosition(deltaTime) {
        // Increment distance based on speed and deltaTime
        this.distanceTravelled += (this.speed * deltaTime) / 1000; // deltaTime is in milliseconds

        // Check if the mob has reached the end
        if (this.distanceTravelled >= this.pathLength) {
            this.reachEnd();
        } else {
            // Calculate t based on distance
            const t = this.path.getUtoTmapping(this.distanceTravelled / this.pathLength);

            // Get the current point along the path
            const point = this.path.getPoint(t);

            // Set the position of the graphics object
            this.graphics.setPosition(point.x, point.y);
        }
    }

    takeDamage(damage) {
        this.health -= damage;

        if (this.health <= 0) {
            // Mob is destroyed
            this.graphics.destroy();
            this.scene.mobDestroyed(this); // Increase player's gold, etc.
        } else {
            // Mob is still alive, update its appearance
            this.updateAppearance();
        }
    }

    updateAppearance() {
        // Calculate health percentage
        const healthPercentage = this.health / this.maxHealth;

        // Interpolate between original color and red
        const originalColor = Phaser.Display.Color.IntegerToColor(this.mobType.color);
        const blackColor = Phaser.Display.Color.IntegerToColor(0x000000);

        // Create a new color by interpolating
        const newColor = Phaser.Display.Color.Interpolate.ColorWithColor(
            blackColor,
            originalColor,
            100,
            healthPercentage * 100 // Scale to 0-100
        );

        // Convert the new color to integer format
        const tint = Phaser.Display.Color.GetColor(newColor.r, newColor.g, newColor.b);

        // Redraw the shape with the new color
        this.drawShape(this.graphics.x, this.graphics.y, tint);
    }

    reachEnd() {
        // Handle what happens when the mob reaches the end of the path
        this.graphics.destroy(); // Remove the mob from the game
        this.scene.mobReachedEnd(this); // Decrease player health
    }
}

const bossMobType = {
    sides: 10,
    health: 450, // High health
    speed: 50,   // Slower speed
    color: 0xFF00FF // Magenta color
};

// Phaser Game Configuration
const config = {
    type: Phaser.AUTO,
    backgroundColor: '#00992D', // Green background
    width: window.innerWidth,
    height: window.innerHeight,
    scene: [MenuScene, GameScene],
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// Instantiate the game
const game = new Phaser.Game(config);

// Helper functions

function drawPath() {
    // Clear previous graphics
    this.graphics.clear();

    const width = this.scale.width;
    const height = this.scale.height;

    // Adjust line width relative to game size
    const lineWidth = Math.max(width, height) * 0.05;
    this.graphics.lineStyle(lineWidth, 0x8B4513, 1); // Brown path

    // Define points as percentages of width and height
    const points = [
        { x: width * -0.01, y: height * 0.07 },
        { x: width * 0.8, y: height * 0.2 },
        { x: width * 0.8, y: height * 0.4 },
        { x: width * 0.2, y: height * 0.4 },
        { x: width * 0.2, y: height * 0.8 },
        { x: width * 0.5, y: height * 0.6 },
        { x: width * 0.5, y: height * 0.8 },
        { x: width * 0.5, y: height * 0.9 },
        { x: width * 1.01, y: height * 0.93 }
    ];

    // Create a spline curve from the points
    this.pathCurve = new Phaser.Curves.Spline(points);

    // Draw the curve onto the graphics object
    this.pathCurve.draw(this.graphics);

    // Calculate and store the total length of the path
    this.pathLength = this.pathCurve.getLength();
}

function drawTowerSpots() {
    // Clear previous tower spots
    if (this.towerSpotGraphics) {
        this.towerSpotGraphics.clear();
    } else {
        this.towerSpotGraphics = this.add.graphics();
    }

    const width = this.scale.width;
    const height = this.scale.height;

    // Style for tower spots
    const spotRadius = Math.max(width, height) * 0.025; // Radius relative to game size
    this.towerSpotGraphics.fillStyle(0xD2A087, 0.85); // Semi-transparent color

    // Draw each tower spot
    towerSpots.forEach(spot => {
        const x = spot.x * width;
        const y = spot.y * height;

        this.towerSpotGraphics.fillCircle(x, y, spotRadius);
    });
}

function createOverlays() {
    const width = this.scale.width;
    const height = this.scale.height;

    // Text style
    const textStyle = {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 2
    };
    // Smaller text style for item costs
    const costTextStyle = {
        fontFamily: 'Arial',
        fontSize: '18px', // Smaller font size
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 1
    };

    // Create text objects and set their depth
    this.healthText = this.add.text(10, 10, `Health: ${playerHealth}`, textStyle)
        .setOrigin(0, 0)
        .setDepth(1000); // High depth value

    this.goldText = this.add.text(10, 40, `Gold: ${playerGold}`, textStyle)
        .setOrigin(0, 0)
        .setDepth(1000);

    this.roundText = this.add.text(10, 70, `Round: ${currentRound}`, textStyle)
        .setOrigin(0, 0)
        .setDepth(1000);

    // Display item costs
    this.towerCostText = this.add.text(10, 100, `Tower Cost: ${TOWER_COST}`, costTextStyle)
        .setOrigin(0, 0)
        .setDepth(1000);

    this.helperCostText = this.add.text(10, 125, `Helper Cost: ${helperCost}`, costTextStyle)
        .setOrigin(0, 0)
        .setDepth(1000);

    // Add the "Hire Help" button
    this.hireHelpButton = this.add.text(10, height - 40, 'Hire Help', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#00FF00',
        stroke: '#000000',
        strokeThickness: 2,
        backgroundColor: '#000000'
    }).setInteractive().setOrigin(0, 0).setDepth(1000);

    // Handle button click
    this.hireHelpButton.on('pointerdown', () => {
        hireHelp.call(this);
    });

    // Adjust button position on resize
    this.scale.on('resize', () => {
        this.hireHelpButton.setPosition(10, this.scale.height - 40);
    });

    // Add the Speed Toggle button
    this.speedToggleButton = this.add.text(width - 60, 10, 'x1', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#FFFF00',
        stroke: '#000000',
        strokeThickness: 2,
        backgroundColor: '#000000'
    }).setInteractive().setOrigin(0, 0).setDepth(1000);

    // Handle button click
    this.speedToggleButton.on('pointerdown', () => {
        toggleGameSpeed.call(this);
    });

    // Adjust button position on resize
    this.scale.on('resize', () => {
        this.speedToggleButton.setPosition(this.scale.width - 60, 10);
    });

    // Add the Back button
    this.backButton = this.add.text(width - 120, 10, 'Back', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#FF0000',
        stroke: '#000000',
        strokeThickness: 2,
        backgroundColor: '#000000'
    }).setInteractive().setOrigin(0, 0).setDepth(1000);

    // Handle button click
    this.backButton.on('pointerdown', () => {
        this.goBackToIndex();
    });

    // Adjust button position on resize
    this.scale.on('resize', () => {
        this.backButton.setPosition(this.scale.width - 120, 10);
    });
}

function toggleGameSpeed() {
    if (this.time.timeScale === 1) {
        // Set to double speed
        this.time.timeScale = 2;
        this.speedToggleButton.setText('x2');
    } else {
        // Set to normal speed
        this.time.timeScale = 1;
        this.speedToggleButton.setText('x1');
    }
}

function onPointerDown(pointer) {
    const width = this.scale.width;
    const height = this.scale.height;

    const pointerX = pointer.x;
    const pointerY = pointer.y;

    // Check if the pointer is over any tower spot
    for (let i = 0; i < towerSpots.length; i++) {
        const spot = towerSpots[i];
        const spotX = spot.x * width;
        const spotY = spot.y * height;
        const spotRadius = Math.max(width, height) * 0.025;

        // Calculate distance between pointer and spot
        const distance = Phaser.Math.Distance.Between(pointerX, pointerY, spotX, spotY);

        if (distance <= spotRadius) {
            // Place tower at this spot
            placeTower.call(this, spot, i);
            break;
        }
    }
}

function placeTower(spot, index) {
    const width = this.scale.width;
    const height = this.scale.height;

    // Check if the player has enough gold
    if (playerGold >= TOWER_COST) {
        const x = spot.x * width;
        const y = spot.y * height;

        // Deduct gold cost for placing a tower
        playerGold -= TOWER_COST;

        // Remove the spot from the array to prevent placing multiple towers on the same spot
        towerSpots.splice(index, 1);

        // Redraw tower spots without the occupied one
        drawTowerSpots.call(this);

        // Draw the tower
        if (!this.towers) {
            this.towers = this.add.graphics();
            this.placedTowers = [];
        }

        const towerRadius = Math.max(width, height) * 0.03; // Slightly larger radius for tower
        this.towers.fillStyle(0x8C8C8C, 1); // Gray color for the tower
        this.towers.fillCircle(x, y, towerRadius);

        // Store tower data for future use
        const tower = {
        x: spot.x,
        y: spot.y,
        range: 150, // Range in pixels (adjust as needed)
        damage: 10, // Damage per attack (adjust as needed)
        attackCooldown: 1300, // Time between attacks in milliseconds
        attackTimer: 0 // Time since last attack
        };
        this.placedTowers.push(tower);
    } else {
        // Not enough gold to place a tower
        displayMessage.call(this, 'Not enough gold to place a tower.');
    }
}

function displayMessage(text) {
    const width = this.scale.width;
    const height = this.scale.height;

    // Create the message text
    const message = this.add.text(width / 2, height * 0.1, text, {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#ff0000',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5).setDepth(1);

    // Fade out and destroy the message after 2 seconds
    this.tweens.add({
        targets: message,
        alpha: 0,
        duration: 2000,
        onComplete: function() {
            message.destroy();
        }
    });
}

function resize(gameSize, baseSize, displaySize, resolution) {
    // Redraw the path with updated dimensions
    drawPath.call(this);

    // Redraw tower spots
    drawTowerSpots.call(this);

    // Redraw towers if any
    redrawTowers.call(this);

    // Adjust overlay positions if necessary
    if (this.healthText) {
        this.healthText.setPosition(10, 10);
        this.goldText.setPosition(10, 40);
        this.roundText.setPosition(10, 70);
        this.towerCostText.setPosition(10, 100);
        this.helperCostText.setPosition(10, 125);
        this.hireHelpButton.setPosition(10, this.scale.height - 40);
        this.speedToggleButton.setPosition(this.scale.width - 60, 10);
    }
}

function resetTowerSpots() {
    // Restore the original tower spots
    towerSpots.length = 0; // Clear the array
    towerSpots.push(
        { x: 0.2, y: 0.3 }, 
        { x: 0.4, y: 0.48 },
        { x: 0.85, y: 0.13 },
        { x: 0.7, y: 0.5 },
        { x: 0.4, y: 0.22 },
        { x: 0.09, y: 0.5 },
        { x: 0.23, y: 0.7 },
        { x: 0.21, y: 0.52 },
        { x: 0.56, y: 0.8 },
        { x: 0.45, y: 0.73 },
        { x: 0.79, y: 0.3 },
        { x: 0.6, y: 0.3 },
        { x: 0.8, y: 0.83 },
        { x: 0.1, y: 0.73 },
        { x: 0.33, y: 0.84 },
        { x: 0.54, y: 0.52 }
        // Add more spots as needed
    );

    // Clear placed towers
    if (this.towers) {
        this.towers.clear();
        this.placedTowers = [];
    }

    // Redraw tower spots
    drawTowerSpots.call(this);
}

function redrawTowers() {
    if (this.towers) {
        // Clear existing towers
        this.towers.clear();

        const width = this.scale.width;
        const height = this.scale.height;

        const towerRadius = Math.max(width, height) * 0.03;
        this.towers.fillStyle(0x8C8C8C, 1);

        // Redraw placed towers
        this.placedTowers.forEach(spot => {
            const x = spot.x * width;
            const y = spot.y * height;
            this.towers.fillCircle(x, y, towerRadius);
        });
    }
    
}

function hireHelp() {
    // Check if the player has enough gold
    if (playerGold >= helperCost) {
        // Deduct gold
        playerGold -= helperCost;

        // Create the helper
        const helper = new Helper(this, this.pathCurve);

        // Add the helper to a helpers array
        if (!this.helpers) {
            this.helpers = [];
        }
        this.helpers.push(helper);
    } else {
        // Not enough gold to hire help
        displayMessage.call(this, 'Not enough gold to hire help.');
    }
}

class Helper {
    constructor(scene, path) {
        this.scene = scene;
        this.path = path;

        // Create graphics object for the helper
        this.graphics = scene.add.graphics();

        // Damage capacity
        this.maxDamageCapacity = 150; // Helper can deal X damage before dying
        this.damageDealt = 0; // Total damage dealt by the helper

        // Damage per attack
        this.damage = 20; // Damage dealt to mobs per attack

        // Movement variables
        this.speed = 100; // Speed in pixels per second
        this.distanceTravelled = scene.pathLength; // Start at the end of the path

        // Total length of the path
        this.pathLength = scene.pathLength;

        // Initial position
        this.updatePosition(0);

        // Draw the helper with initial color
        this.updateAppearance();
    }

    drawHelper(x, y, color = 0x00FFFF) {
        const radius = 15; // Adjust as needed

        this.graphics.clear();
        this.graphics.fillStyle(color, 1);
        this.graphics.lineStyle(1, 0x000000, 1); // Optional: Outline
        this.graphics.fillCircle(0, 0, radius);
        this.graphics.strokeCircle(0, 0, radius);

        // Set position
        this.graphics.setPosition(x, y);
    }

    updatePosition(deltaTime) {
        // Decrement distance based on speed and deltaTime
        this.distanceTravelled -= (this.speed * deltaTime) / 1000; // deltaTime is in milliseconds


        // Check if the helper has reached the start
        if (this.distanceTravelled <= 0) {
            this.reachEnd();
        } else {
            // Calculate t based on distance
            const t = this.path.getUtoTmapping(this.distanceTravelled / this.pathLength);

            // Get the current point along the path
            const point = this.path.getPoint(t);

            // Set the position of the graphics object
            this.graphics.setPosition(point.x, point.y);
        }
    }

    reachEnd() {
        this.destroyHelper();
    }

    attackMobs(mobs) {
        mobs.forEach(mob => {
            const distance = Phaser.Math.Distance.Between(
                this.graphics.x,
                this.graphics.y,
                mob.graphics.x,
                mob.graphics.y
            );

            if (distance <= 50) { // Attack range, adjust as needed
                // Calculate actual damage to be dealt
                const damageToDeal = Math.min(this.damage, this.maxDamageCapacity - this.damageDealt);

                // Deal damage to the mob
                mob.takeDamage(damageToDeal);

                // Update damage dealt
                this.damageDealt += damageToDeal;

                // Update appearance
                this.updateAppearance();

                // Check if helper has reached max damage capacity
                if (this.damageDealt >= this.maxDamageCapacity) {
                    this.destroyHelper();
                }
            }
        });
    }

    updateAppearance() {
        // Calculate damage percentage
        const damagePercentage = this.damageDealt / this.maxDamageCapacity;

        // Interpolate between original color and black
        const originalColor = Phaser.Display.Color.IntegerToColor(0x00FFFF); // Cyan color
        const blackColor = Phaser.Display.Color.IntegerToColor(0x000000);

        // Create a new color by interpolating
        const newColor = Phaser.Display.Color.Interpolate.ColorWithColor(
            originalColor,
            blackColor,
            100,
            damagePercentage * 100 // Scale to 0-100
        );

        // Convert the new color to integer format
        const tint = Phaser.Display.Color.GetColor(newColor.r, newColor.g, newColor.b);

        // Redraw the helper with the new color
        this.drawHelper(this.graphics.x, this.graphics.y, tint);
    }

    destroyHelper() {
        // Remove the helper from the game
        this.graphics.destroy();
        Phaser.Utils.Array.Remove(this.scene.helpers, this);
    }
}

