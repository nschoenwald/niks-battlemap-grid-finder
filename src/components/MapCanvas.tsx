import { useRef } from 'react';

interface MapCanvasProps {
    imageUrl: string;
    gridSize: number;
    offsetX: number;
    offsetY: number;
}

export function MapCanvas({ imageUrl, gridSize, offsetX, offsetY }: MapCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={containerRef}
            className="relative overflow-auto border border-neutral-700 bg-neutral-900 shadow-xl"
            style={{ maxHeight: '80vh', maxWidth: '100%' }}
        >
            <div className="relative inline-block">
                <img src={imageUrl} alt="Battlemap" className="block max-w-none" />
                {/* Grid Overlay will go here */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `
                    linear-gradient(to right, rgba(255, 0, 0, 0.5) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255, 0, 0, 0.5) 1px, transparent 1px)
                `,
                        backgroundSize: `${gridSize}px ${gridSize}px`,
                        backgroundPosition: `${offsetX}px ${offsetY}px`
                    }}
                />
            </div>
        </div>
    );
}
