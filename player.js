export const ENERGY_DURATION_MS = 3600 * 1000; // 1 hour (3600 seconds)
const N_BAR_SEGMENTS = 8;
const FILLED_BLOCK = '█'; // Full Block
const EMPTY_BLOCK = '▒'; // Medium Shade
const FILLED_COLOR = 'rgb(173, 216, 230)'; // Light Blue
const EMPTY_COLOR_ALPHA = 'rgba(173, 216, 230, 0.4)'; // Semi-transparent Light Blue

export class Player {
    constructor(id, username, color) {
        this.id = id;
        this.username = username;
        this.color = color;
        // this.energy = 1; // Start with 1 hour of energy
        this.energyTimestamps = []; // Use timestamps for cell tracking

        // Position in grid coordinates
        this.x = Math.floor(Math.random() * 640);
        this.y = Math.floor(Math.random() * 480);

        // For smooth movement
        this.pixelX = this.x;
        this.pixelY = this.y;
        this.targetX = this.x;
        this.targetY = this.y;

        this.speed = 1; // tiles per second
        this.moveCooldown = 2 + Math.random() * 5; // time to wait before picking new target
        this.lastEnergyLogTime = 0; // Initialize log throttle
        this.currentCellDrainRatio = 0; // 0 (full) to 1 (empty)
        this.flashState = 0; // For subtle flashing effect
    }

    addEnergy() {
        // Add current timestamp for a new energy cell
        this.energyTimestamps.push(Date.now());
    }

    isPowered() {
        return this.energyTimestamps.length > 0;
    }

    getState() {
        return {
            id: this.id,
            username: this.username,
            color: this.color,
            energyTimestamps: this.energyTimestamps, // Store timestamps
            pixelX: this.pixelX,
            pixelY: this.pixelY
        };
    }

    loadState(state) {
        if (state.pixelX !== undefined && state.pixelY !== undefined) {
            this.pixelX = state.pixelX;
            this.pixelY = state.pixelY;
            // Set target position to the loaded smooth position so movement continues from there
            this.targetX = state.pixelX;
            this.targetY = state.pixelY;
            
            this.x = Math.round(state.pixelX);
            this.y = Math.round(state.pixelY);
        }
        
        // Load energyTimestamps
        if (state.energyTimestamps && Array.isArray(state.energyTimestamps)) {
            this.energyTimestamps = state.energyTimestamps;
            // Ensure oldest is first for draining
            this.energyTimestamps.sort((a, b) => a - b);
        } else if (state.energy !== undefined && state.energy > 0) {
            // Handle conversion from legacy 'energy' count to timestamps.
            this.energyTimestamps = [];
            for (let i = 0; i < state.energy; i++) {
                // Assume legacy energy starts draining immediately upon load
                this.energyTimestamps.push(Date.now());
            }
        }
        
        this.username = state.username || this.username;
        this.color = state.color || this.color;
    }

    update(deltaTime, mapWidth, mapHeight) {
        
        if (this.isPowered()) {
            // 1. Energy Draining Logic
            const now = Date.now();
            const oldestTimestamp = this.energyTimestamps[0];
            
            // Calculate drain status
            const timeElapsed = now - oldestTimestamp;
            this.currentCellDrainRatio = Math.min(1, timeElapsed / ENERGY_DURATION_MS);
            
            const expirationTime = oldestTimestamp + ENERGY_DURATION_MS;
            
            const remainingMS = expirationTime - now;

            // Update flash state for visualization
            // Use a quick oscillation based on time
            this.flashState = (Math.sin(now / 100) + 1) / 2; // Value between 0 and 1

            // Console log remaining time for the current draining energy cell (as requested)
            if (remainingMS > 0) {
                // Throttle logging to once per minute (60,000 ms)
                const LOG_INTERVAL = 60000;
                
                if (now - this.lastEnergyLogTime > LOG_INTERVAL) {
                    const remainingSeconds = Math.ceil(remainingMS / 1000);
                    // Logging energy info with timer info
                    console.log(`[Energy Drain Status] Player ${this.username}: Time left on current cell: ${remainingSeconds}s. Total cells: ${this.energyTimestamps.length}`);
                    this.lastEnergyLogTime = now;
                }
            }

            if (remainingMS <= 0) {
                // Energy cell expired
                this.energyTimestamps.shift();
                console.log(`[Energy Drain] Player ${this.username} consumed one energy cell. Remaining cells: ${this.energyTimestamps.length}`);
                
                // If this was the last cell, stop movement logic execution for this frame
                if (!this.isPowered()) {
                    this.currentCellDrainRatio = 0; // Reset ratio if no power
                    this.flashState = 0;
                    return; 
                }
            }

            // 2. Movement Logic (Only continues if powered)
            this.moveCooldown -= deltaTime;
            if (this.moveCooldown <= 0) {
                this.pickNewTarget(mapWidth, mapHeight);
                this.moveCooldown = 2 + Math.random() * 5; // reset cooldown
            }

            // Move towards target
            const dx = this.targetX - this.pixelX;
            const dy = this.targetY - this.pixelY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0.01) {
                const moveAmount = this.speed * deltaTime;
                this.pixelX += (dx / dist) * moveAmount;
                this.pixelY += (dy / dist) * moveAmount;
            } else {
                this.pixelX = this.targetX;
                this.pixelY = this.targetY;
            }
        }
    }

    pickNewTarget(mapWidth, mapHeight) {
        const dir = Math.floor(Math.random() * 4);
        let newX = this.targetX;
        let newY = this.targetY;

        switch (dir) {
            case 0: newY--; break; // Up
            case 1: newY++; break; // Down
            case 2: newX--; break; // Left
            case 3: newX++; break; // Right
        }

        // Clamp to map bounds
        this.targetX = Math.max(0, Math.min(mapWidth - 1, newX));
        this.targetY = Math.max(0, Math.min(mapHeight - 1, newY));
    }

    render(ctx, tileSize, cameraX, cameraY) {
        const radius = tileSize / 2.5;
        // Apply camera offset
        const screenX = (this.pixelX * tileSize + tileSize / 2) - cameraX;
        const screenY = (this.pixelY * tileSize + tileSize / 2) - cameraY;

        ctx.save();
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fill();

        // 1. Flashing Outline for currently draining cell
        if (this.isPowered()) {
            const maxOutlineWidth = 4;
            // Flashing effect: width varies between 1 and maxOutlineWidth based on flashState
            const outlineWidth = 1 + this.flashState * (maxOutlineWidth - 1);
            
            // Color fading effect: using white/light color for emphasis
            const alpha = 0.5 + this.flashState * 0.5; // Alpha between 0.5 and 1.0
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = outlineWidth;
            
            ctx.beginPath();
            ctx.arc(screenX, screenY, radius + outlineWidth / 2, 0, Math.PI * 2);
            ctx.stroke();
        }


        // Default player stroke
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Nametag Label
        // Use a minimum font size of 12px for readability, scaling up with tileSize
        const fontSize = Math.max(12, tileSize * 0.6); 
        ctx.font = `${fontSize}px Arial, sans-serif`;
        
        // Setup for text rendering
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        // Text color and stroke for visibility against any background
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 3; // Thicker stroke for visibility

        const tagY = screenY - radius - 5; // Position slightly above the player circle
        
        // Draw Username
        ctx.strokeText(this.username, screenX, tagY);
        ctx.fillText(this.username, screenX, tagY);
        
        // Draw Energy Bar
        if (this.isPowered()) {
            this.drawEnergyBar(ctx, screenX, tagY, fontSize);
        }
        
        ctx.restore();
    }
    
    drawEnergyBar(ctx, screenX, usernameTagY, usernameFontSize) {
        // Calculate remaining segments
        const remainingRatio = 1 - this.currentCellDrainRatio;
        // Use floor to determine how many full segments remain
        const filledSegments = Math.floor(remainingRatio * N_BAR_SEGMENTS);
        
        // Determine Y position for the energy bar (below the username tag)
        const barY = usernameTagY + usernameFontSize * 1.1; // Offset below username

        // Energy Bar Specific Font Setup
        const barFontSize = usernameFontSize * 0.7; 
        ctx.font = `${barFontSize}px monospace`; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle'; 

        // Measure the width of a single block character consistently
        const blockWidth = ctx.measureText(FILLED_BLOCK).width;
        const totalBarWidth = blockWidth * N_BAR_SEGMENTS;
        const startX = screenX - totalBarWidth / 2;

        // Draw the bar segment by segment
        for (let i = 0; i < N_BAR_SEGMENTS; i++) {
            const block = (i < filledSegments) ? FILLED_BLOCK : EMPTY_BLOCK;
            
            // Calculate current block's center X position
            const currentBlockCenterX = startX + (i * blockWidth) + (blockWidth / 2);

            // Set color based on fill status
            if (i < filledSegments) {
                // Filled block (Light Blue)
                ctx.fillStyle = FILLED_COLOR;
            } else {
                // Empty block (Semi-transparent Light Blue)
                ctx.fillStyle = EMPTY_COLOR_ALPHA;
            }
            
            ctx.fillText(block, currentBlockCenterX, barY);
        }
    }
}