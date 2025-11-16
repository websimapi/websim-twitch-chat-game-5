export class Map {
    constructor(width, height, tileSize) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        this.grassTile = null;
        this.viewportWidth = 0;
        this.viewportHeight = 0;
    }

    setViewport(width, height) {
        this.viewportWidth = width;
        this.viewportHeight = height;
    }

    setTileSize(size) {
        this.tileSize = size;
    }

    async loadAssets() {
        return new Promise((resolve) => {
            this.grassTile = new Image();
            this.grassTile.src = './grass_tile.png';
            this.grassTile.onload = () => {
                resolve();
            };
        });
    }

    render(ctx, cameraX, cameraY) {
        if (!this.grassTile || !this.grassTile.complete) return;

        ctx.save();
        
        // Calculate the drawing offset based on camera position
        // This translation effectively shifts the world according to the camera view
        ctx.translate(-cameraX, -cameraY);

        const ts = this.tileSize;
        
        // Calculate visible tile range in grid coordinates
        // cameraX/Y can be negative if the map is centered and smaller than viewport
        const startTileX = Math.floor(cameraX / ts);
        const endTileX = Math.ceil((cameraX + this.viewportWidth) / ts);
        const startTileY = Math.floor(cameraY / ts);
        const endTileY = Math.ceil((cameraY + this.viewportHeight) / ts);

        // Clamp tile indices to map boundaries (0 to width/height)
        const drawStartX = Math.max(0, startTileX);
        const drawEndX = Math.min(this.width, endTileX);
        const drawStartY = Math.max(0, startTileY);
        const drawEndY = Math.min(this.height, endTileY);

        // Iterate and draw grass tiles only for visible grid spots
        for (let i = drawStartX; i < drawEndX; i++) {
            for (let j = drawStartY; j < drawEndY; j++) {
                ctx.drawImage(
                    this.grassTile,
                    i * ts,
                    j * ts,
                    ts,
                    ts
                );
            }
        }

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // Subtle grid lines
        ctx.lineWidth = 1;

        // Draw visible vertical lines
        for (let i = drawStartX; i <= drawEndX; i++) {
            if (i > this.width) continue; 
            const x = i * ts;
            ctx.beginPath();
            ctx.moveTo(x, drawStartY * ts);
            ctx.lineTo(x, drawEndY * ts);
            ctx.stroke();
        }

        // Draw visible horizontal lines
        for (let j = drawStartY; j <= drawEndY; j++) {
            if (j > this.height) continue;
            const y = j * ts;
            ctx.beginPath();
            ctx.moveTo(drawStartX * ts, y);
            ctx.lineTo(drawEndX * ts, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}