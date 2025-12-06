

interface ControlsProps {
    gridSize: number;
    setGridSize: (size: number) => void;
    offsetX: number;
    setOffsetX: (offset: number) => void;
    offsetY: number;
    setOffsetY: (offset: number) => void;
    onReset: () => void;
    onExport: () => void;
    isProcessing: boolean;
    onAutoDetect: () => void;
    gridColor: string;
    setGridColor: (color: string) => void;
    isGridVisible: boolean;
    setIsGridVisible: (visible: boolean) => void;
    isMeasuring: boolean;
    setIsMeasuring: (measuring: boolean) => void;
}

export function Controls({
    gridSize,
    setGridSize,
    offsetX,
    setOffsetX,
    offsetY,
    setOffsetY,
    onReset,
    onExport,
    isProcessing,
    onAutoDetect,
    gridColor,
    setGridColor,
    isGridVisible,
    setIsGridVisible,
    isMeasuring,
    setIsMeasuring
}: ControlsProps) {
    return (
        <div className="w-80 flex-shrink-0 bg-neutral-800 p-6 flex flex-col gap-6 border-l border-neutral-700 shadow-2xl z-10">
            <h2 className="text-2xl font-bold text-white mb-2">Adjust Grid</h2>

            <div className="flex flex-col gap-2">
                <label className="text-sm text-neutral-400">Grid Size (px)</label>
                <div className="flex gap-2">
                    <input
                        type="range"
                        min="10"
                        max="200"
                        value={gridSize}
                        onChange={(e) => setGridSize(Number(e.target.value))}
                        className="flex-1 accent-indigo-500"
                    />
                    <input
                        type="number"
                        value={gridSize}
                        onChange={(e) => setGridSize(Number(e.target.value))}
                        className="w-16 bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-right"
                    />
                </div>
                <button
                    onClick={onAutoDetect}
                    className="text-xs text-indigo-400 hover:text-indigo-300 self-end mt-1 focus:outline-none"
                    disabled={isProcessing}
                >
                    ✨ Auto-Detect
                </button>
                <button
                    onClick={() => setIsMeasuring(!isMeasuring)}
                    className={`text-xs self-end mt-1 focus:outline-none ${isMeasuring ? 'text-green-400 font-bold' : 'text-indigo-400 hover:text-indigo-300'}`}
                    disabled={isProcessing}
                >
                    {isMeasuring ? 'Cancel Measure' : '📏 Measure Tool'}
                </button>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm text-neutral-400">Visual Aids</label>
                <div className="flex gap-4 items-center">
                    <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isGridVisible}
                            onChange={(e) => setIsGridVisible(e.target.checked)}
                            className="rounded bg-neutral-700 border-neutral-600 text-indigo-500 focus:ring-indigo-500"
                        />
                        Show Grid
                    </label>

                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={gridColor}
                            onChange={(e) => setGridColor(e.target.value)}
                            className="h-8 w-8 rounded cursor-pointer bg-transparent border-none"
                            title="Grid Color"
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm text-neutral-400">Offset X</label>
                <div className="flex gap-2">
                    <input
                        type="range"
                        min="0"
                        max={gridSize}
                        value={offsetX % gridSize}
                        onChange={(e) => setOffsetX(Number(e.target.value))}
                        className="flex-1 accent-indigo-500"
                    />
                    <input
                        type="number"
                        value={offsetX}
                        onChange={(e) => setOffsetX(Number(e.target.value))}
                        className="w-16 bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-right"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm text-neutral-400">Offset Y</label>
                <div className="flex gap-2">
                    <input
                        type="range"
                        min="0"
                        max={gridSize}
                        value={offsetY % gridSize}
                        onChange={(e) => setOffsetY(Number(e.target.value))}
                        className="flex-1 accent-indigo-500"
                    />
                    <input
                        type="number"
                        value={offsetY}
                        onChange={(e) => setOffsetY(Number(e.target.value))}
                        className="w-16 bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-right"
                    />
                </div>
            </div>

            <div className="mt-auto flex flex-col gap-2">
                <button
                    onClick={onExport}
                    disabled={isProcessing}
                    className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? 'Processing...' : 'Export Resized Map'}
                </button>

                <button
                    onClick={onReset}
                    className="py-2 px-4 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded transition-colors text-sm"
                >
                    Reset Grid
                </button>
            </div>
        </div>
    );
}

