import { useRef, useEffect, useState } from 'react';

interface MapCanvasProps {
    imageUrl: string;
    gridSize: number;
    offsetX: number;
    offsetY: number;
    gridColor: string;
    isGridVisible: boolean;
    isMeasuring?: boolean;
    measureStart?: { x: number, y: number } | null;
    setMeasureStart?: (pt: { x: number, y: number } | null) => void;
    measureEnd?: { x: number, y: number } | null;
    setMeasureEnd?: (pt: { x: number, y: number } | null) => void;
    onMeasureComplete?: (start: { x: number, y: number }, end: { x: number, y: number }) => void;
}

export function MapCanvas({
    imageUrl, gridSize, offsetX, offsetY, gridColor, isGridVisible,
    isMeasuring, measureStart, setMeasureStart, measureEnd, setMeasureEnd, onMeasureComplete
}: MapCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Combined Drawing Effect
    useEffect(() => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img || !img.complete) return;

        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Grid
        // Hide grid if we are actively dragging a measurement (user request)
        const isDragging = isMeasuring && measureStart && measureEnd;

        if (isGridVisible && !isDragging) {
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            ctx.beginPath();

            for (let x = offsetX; x < canvas.width; x += gridSize) {
                ctx.moveTo(x + 0.5, 0);
                ctx.lineTo(x + 0.5, canvas.height);
            }
            for (let y = offsetY; y < canvas.height; y += gridSize) {
                ctx.moveTo(0, y + 0.5);
                ctx.lineTo(canvas.width, y + 0.5);
            }
            ctx.stroke();
        }

        // 2. Draw Measurement Box with 3x3 Grid
        if (isMeasuring && measureStart && measureEnd) {
            ctx.strokeStyle = '#00ff00'; // Green for measure
            ctx.lineWidth = 2;

            const x = Math.min(measureStart.x, measureEnd.x);
            const y = Math.min(measureStart.y, measureEnd.y);
            const w = Math.abs(measureEnd.x - measureStart.x);
            const h = Math.abs(measureEnd.y - measureStart.y);

            // 1. Fill (Background)
            ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
            ctx.fillRect(x, y, w, h);

            // 2. Internal 3x3 Grid
            // DEBUG: Ensuring this runs
            // console.log("Drawing 3x3 Grid", { x, y, w, h });

            ctx.strokeStyle = '#FFFF00'; // Yellow for high contrast
            ctx.lineWidth = 2; // Thicker lines
            ctx.beginPath();

            // Validate coordinates
            if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
                // Verticals
                ctx.moveTo(x + w / 3, y);
                ctx.lineTo(x + w / 3, y + h);
                ctx.moveTo(x + (2 * w) / 3, y);
                ctx.lineTo(x + (2 * w) / 3, y + h);
                // Horizontals
                ctx.moveTo(x, y + h / 3);
                ctx.lineTo(x + w, y + h / 3);
                ctx.moveTo(x, y + (2 * h) / 3);
                ctx.lineTo(x + w, y + (2 * h) / 3);
                ctx.stroke();
            }

            // 3. Box Border (on top)
            ctx.strokeStyle = '#00FF00'; // Green Border
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, h);
        }

    }, [imageUrl, gridSize, offsetX, offsetY, gridColor, isGridVisible, isMeasuring, measureStart, measureEnd]);

    // Mouse Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isMeasuring || !setMeasureStart || !imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const scaleX = imageRef.current.width / rect.width;
        const scaleY = imageRef.current.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        setMeasureStart({ x, y });
        setMeasureEnd?.({ x, y });
    };

    // Magnifier Logic
    const [magnifierPos, setMagnifierPos] = useState<{ x: number, y: number } | null>(null);
    const magnifierRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!magnifierPos || !magnifierRef.current || !imageRef.current) return;

        const canvas = magnifierRef.current;
        const ctx = canvas.getContext('2d');
        const img = imageRef.current;
        if (!ctx) return;

        // Configuration
        const zoom = 2;
        const size = 150; // diameter
        const radius = size / 2;

        canvas.width = size;
        canvas.height = size;

        // Calculate source rectangle
        // magnifierPos is relative to the viewport/container, we need it relative to the image natural dimensions?
        // Actually, let's pass the image-relative coordinates to the state for simplicity
        // But handleMouseMove calculates image-relative coords already.

        // Let's assume magnifierPos is image-relative coordinates
        const { x, y } = magnifierPos;

        // Draw the zoomed image
        // Source x, y needs to be centered on the cursor
        const sX = x - (radius / zoom);
        const sY = y - (radius / zoom);
        const sW = size / zoom;
        const sH = size / zoom;

        ctx.clearRect(0, 0, size, size);

        // Save context for circular clipping
        ctx.save();
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, Math.PI * 2);
        ctx.clip();

        // Draw Image
        ctx.drawImage(img, sX, sY, sW, sH, 0, 0, size, size);

        // Draw Grid Overlay on Magnifier (Optional but helpful)
        if (isGridVisible) {
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1; // Thicker lines on zoom? Maybe keep 1 for precision.

            // Adjust grid drawing for the zoomed view
            // We need to map grid lines from world space to magnifier space

            ctx.beginPath();
            // Vertical lines
            // Find first grid line to the left of the view
            const startX = Math.floor(sX / gridSize) * gridSize;
            const endX = sX + sW;

            for (let gx = startX; gx < endX + gridSize; gx += gridSize) {
                // World x = gx. 
                // Magnifier x = (gx - sX) * zoom
                const drawX = (gx - sX) * zoom;
                ctx.moveTo(drawX + 0.5, 0);
                ctx.lineTo(drawX + 0.5, size);
            }

            // Horizontal lines
            const startY = Math.floor(sY / gridSize) * gridSize;
            const endY = sY + sH;

            for (let gy = startY; gy < endY + gridSize; gy += gridSize) {
                const drawY = (gy - sY) * zoom;
                ctx.moveTo(0, drawY + 0.5);
                ctx.lineTo(size, drawY + 0.5);
            }
            ctx.stroke();
        }

        // Draw Measurement Box on Magnifier
        if (isMeasuring && measureStart && measureEnd) {
            const mx1 = Math.min(measureStart.x, measureEnd.x);
            const my1 = Math.min(measureStart.y, measureEnd.y);
            const mx2 = Math.max(measureStart.x, measureEnd.x);
            const my2 = Math.max(measureStart.y, measureEnd.y);

            // Transform to magnifier space
            // drawX = (worldX - sX) * zoom
            const drawX = (mx1 - sX) * zoom;
            const drawY = (my1 - sY) * zoom;
            const drawW = (mx2 - mx1) * zoom;
            const drawH = (my2 - my1) * zoom;

            // 1. Fill
            ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
            ctx.fillRect(drawX, drawY, drawW, drawH);

            // 2. Internal 3x3 Grid
            ctx.strokeStyle = '#FFFF00'; // Yellow
            ctx.lineWidth = 2;
            ctx.beginPath();

            if (drawW > 0 && drawH > 0) {
                // Verticals
                ctx.moveTo(drawX + drawW / 3, drawY);
                ctx.lineTo(drawX + drawW / 3, drawY + drawH);
                ctx.moveTo(drawX + (2 * drawW) / 3, drawY);
                ctx.lineTo(drawX + (2 * drawW) / 3, drawY + drawH);
                // Horizontals
                ctx.moveTo(drawX, drawY + drawH / 3);
                ctx.lineTo(drawX + drawW, drawY + drawH / 3);
                ctx.moveTo(drawX, drawY + (2 * drawH) / 3);
                ctx.lineTo(drawX + drawW, drawY + (2 * drawH) / 3);
                ctx.stroke();
            }

            // 3. Border
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 3;
            ctx.strokeRect(drawX, drawY, drawW, drawH);
        }

        // Draw Crosshair in center
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(radius - 10, radius);
        ctx.lineTo(radius + 10, radius);
        ctx.moveTo(radius, radius - 10);
        ctx.lineTo(radius, radius + 10);
        ctx.stroke();

        // Rim
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

    }, [magnifierPos, imageUrl, gridSize, offsetX, offsetY, isGridVisible, gridColor]);


    // Update mouse move to track position for magnifier
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const scaleX = imageRef.current.width / rect.width;
        const scaleY = imageRef.current.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Update Measuring End
        if (isMeasuring && measureStart && setMeasureEnd) {
            setMeasureEnd({ x, y });
        }

        // Update Magnifier Pos (only if measuring for now, or always?)
        // Let's show it when measuring to help precision.
        if (isMeasuring) {
            setMagnifierPos({ x, y });
        } else {
            setMagnifierPos(null);
        }
    };

    // Also clear magnifier on mouse leave
    const handleMouseLeave = () => {
        setMagnifierPos(null);
    }

    const handleMouseUp = () => {
        if (!isMeasuring || !measureStart || !measureEnd || !onMeasureComplete) return;
        onMeasureComplete(measureStart, measureEnd);
    };

    const handleImageLoad = () => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (canvas && img) {
            canvas.width = img.width;
            canvas.height = img.height;
        }
    };

    return (
        <div
            ref={containerRef}
            className={`relative overflow-auto border border-neutral-700 bg-neutral-900 shadow-xl ${isMeasuring ? 'cursor-crosshair' : ''}`}
            onMouseDown={(e) => {
                // Prevent browser drag behavior
                e.preventDefault();
                handleMouseDown(e);
            }}
            onMouseMove={(e) => {
                e.preventDefault();
                handleMouseMove(e);
            }}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            // Add styles to prevent selection
            style={{ maxHeight: '80vh', maxWidth: '100%', userSelect: 'none', WebkitUserSelect: 'none' }}
        >
            <div className="relative inline-block">
                <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Battlemap"
                    className="block max-w-none select-none"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    onLoad={handleImageLoad}
                />
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 pointer-events-none"
                    style={{ width: '100%', height: '100%' }}
                />
                {/* Magnifier Canvas */}
                {magnifierPos && (
                    <canvas
                        ref={magnifierRef}
                        className="absolute pointer-events-none z-50 rounded-full shadow-2xl border-2 border-white"
                        style={{
                            left: (magnifierPos.x / (imageRef.current?.width || 1)) * 100 + '%',
                            top: (magnifierPos.y / (imageRef.current?.height || 1)) * 100 + '%',
                            width: '150px',
                            height: '150px',
                            transform: 'translate(-50%, -50%)', // Center on cursor
                            // Actually, positioning might be tricky relative to the zoomed/scrolled container.
                            // But since the parent is `relative inline-block` wrapping the img, % should be relative to image size.
                            // Yes, left/top % works relative to the container size which matches image size.
                        }}
                    />
                )}
            </div>
        </div>
    );
}
