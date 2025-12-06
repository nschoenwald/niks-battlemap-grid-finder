
export interface ControlsProps {
    gridSizeX: number;
    gridSizeY: number;
    setGridSize: (newSize: number, axis?: 'x' | 'y') => void;
    isAspectLocked: boolean;
    setIsAspectLocked: (locked: boolean) => void;

    offsetX: number;
    setOffsetX: (x: number) => void;
    offsetY: number;
    setOffsetY: (y: number) => void;
    onReset: () => void;
    onExport: () => void;
    isProcessing: boolean;
    onAutoDetect: (method: 'projection' | 'autocorrelation') => void;
    gridColor: string;
    setGridColor: (color: string) => void;
    isGridVisible: boolean;
    setIsGridVisible: (v: boolean) => void;

    isMeasuring: boolean;
    setIsMeasuring: (measuring: boolean) => void;
    exportGridSize: number;
    setExportGridSize: (size: number) => void;
    onOpenHelp: () => void;
}

export function Controls({
    gridSizeX, gridSizeY, setGridSize, isAspectLocked, setIsAspectLocked,
    offsetX, setOffsetX, offsetY, setOffsetY,
    onReset,
    onExport,
    isProcessing,
    onAutoDetect,
    gridColor,
    setGridColor,
    isGridVisible,
    setIsGridVisible,

    isMeasuring,
    setIsMeasuring,
    exportGridSize,
    setExportGridSize,
    onOpenHelp
}: ControlsProps) {
    return (
        <div className="w-80 flex-shrink-0 bg-neutral-800 p-6 flex flex-col gap-6 border-l border-neutral-700 shadow-2xl z-10 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-white">Adjust Grid</h2>
                <button
                    onClick={onOpenHelp}
                    className="w-8 h-8 rounded-full bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
                    title="How to use"
                >
                    ?
                </button>
            </div>

            {/* Tools Section (Moved to Top) */}
            <div className="flex flex-col gap-3 p-4 bg-neutral-900 rounded-lg border border-neutral-700">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Calibration Tools</h3>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase">Detection Mode</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onAutoDetect('projection')}
                            disabled={isProcessing}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-indigo-500/20"
                            title="Best for clean, high-contrast maps"
                        >
                            <span className="text-lg">⚡</span>
                            <span className="text-xs">Fast Detect</span>
                        </button>

                        <button
                            onClick={() => onAutoDetect('autocorrelation')}
                            disabled={isProcessing}
                            className="flex-1 py-3 bg-violet-700 hover:bg-violet-600 text-white font-bold rounded flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-violet-500/20"
                            title="Best for tiles, textures, or broken lines"
                        >
                            <span className="text-lg">🧠</span>
                            <span className="text-xs">Robust Detect</span>
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => setIsMeasuring(!isMeasuring)}
                    className={`w-full py-3 font-bold rounded flex items-center justify-center gap-2 transition-all shadow-lg ${isMeasuring
                        ? 'bg-green-500 text-white ring-2 ring-green-400 ring-offset-2 ring-offset-neutral-900'
                        : 'bg-neutral-700 hover:bg-neutral-600 text-white hover:shadow-neutral-500/20'
                        }`}
                >
                    <span>📏</span> {isMeasuring ? 'Measuring... (Click & Drag)' : '3x3 Grid Matcher'}
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
                        max={gridSizeX}
                        value={offsetX % gridSizeX}
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
                        max={gridSizeY}
                        value={offsetY % gridSizeY}
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
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-neutral-400 uppercase">Grid Dimensions (px)</label>
                        <button
                            onClick={() => setIsAspectLocked(!isAspectLocked)}
                            title={isAspectLocked ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"}
                            className={`p-1 rounded ${isAspectLocked ? 'text-indigo-400 bg-indigo-900/30' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            {isAspectLocked ? '🔒 Linked' : '🔓 Unlinked'}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-[10px] text-neutral-500 uppercase block mb-1">Width</label>
                            <input
                                type="number"
                                value={gridSizeX}
                                onChange={(e) => setGridSize(parseInt(e.target.value) || 0, 'x')}
                                className="w-full bg-neutral-800 border-neutral-700 text-neutral-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] text-neutral-500 uppercase block mb-1">Height</label>
                            <input
                                type="number"
                                value={gridSizeY}
                                onChange={(e) => setGridSize(parseInt(e.target.value) || 0, 'y')}
                                className="w-full bg-neutral-800 border-neutral-700 text-neutral-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1 mb-2">
                    <label className="text-sm text-neutral-400">Target Grid Size (px)</label>
                    <input
                        type="number"
                        value={exportGridSize}
                        onChange={(e) => setExportGridSize(Number(e.target.value))}
                        className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white"
                    />
                </div>


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

