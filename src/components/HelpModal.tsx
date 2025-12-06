import { useEffect } from 'react';

interface HelpModalProps {
    onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-neutral-800 text-neutral-100 max-w-2xl w-full rounded-xl shadow-2xl border border-neutral-700 overflow-hidden"
                onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
            >
                <div className="flex items-center justify-between p-6 border-b border-neutral-700 bg-neutral-900/50">
                    <h2 className="text-xl font-bold text-white">How to use Battlemap Resizer</h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

                    <section className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold">1</div>
                        <div>
                            <h3 className="font-bold text-lg mb-1 text-indigo-300">Upload & Auto-Detect</h3>
                            <p className="text-neutral-300 leading-relaxed">
                                Drag and drop your battlemap image. The app will automatically try to detect the existing grid and align the red overlay.
                            </p>
                        </div>
                    </section>

                    <section className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold">2</div>
                        <div>
                            <h3 className="font-bold text-lg mb-1 text-indigo-300">Fine-Tune Alignment</h3>
                            <p className="text-neutral-300 leading-relaxed mb-2">
                                If the auto-detection isn't perfect, use the <strong>Sidebar Controls</strong> to adjust the <strong>Grid Size</strong> (px) and <strong>Offsets</strong>.
                            </p>
                            <div className="bg-neutral-900 p-3 rounded border border-neutral-700 text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                                <span className="text-neutral-400 font-mono">Arrow Keys</span>
                                <span>Nudge the grid alignment by <strong>1px</strong></span>

                                <span className="text-neutral-400 font-mono">Shift + Arrows</span>
                                <span>Nudge by <strong>10px</strong></span>

                                <span className="text-neutral-400 font-mono">+ / -</span>
                                <span>Increase/Decrease grid size</span>
                            </div>
                        </div>
                    </section>

                    <section className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold">3</div>
                        <div>
                            <h3 className="font-bold text-lg mb-1 text-indigo-300">Use the 3x3 Matcher</h3>
                            <p className="text-neutral-300 leading-relaxed">
                                For the fastest manual calibration:
                            </p>
                            <ul className="list-disc list-inside mt-2 space-y-1 text-neutral-300 ml-1">
                                <li>Click the <span className="text-green-400 font-bold">📏 Measure Tool</span> button.</li>
                                <li>Drag a box on the map. You will see a <strong>3x3 grid</strong> inside it.</li>
                                <li>Align this 3x3 grid to match any <strong>3x3 block of squares</strong> on your map.</li>
                                <li><strong>Release</strong> to instantly snap the grid settings.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold">4</div>
                        <div>
                            <h3 className="font-bold text-lg mb-1 text-indigo-300">Export</h3>
                            <p className="text-neutral-300 leading-relaxed">
                                Enter your desired <strong>Target Grid Size</strong> (default is 100px) and click <strong>Export</strong>.
                                The map will be resized and padded so the grid aligns perfectly.
                            </p>
                        </div>
                    </section>
                </div>

                <div className="p-6 border-t border-neutral-700 bg-neutral-900/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-neutral-100 hover:bg-white text-neutral-900 font-bold rounded transition-colors"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
}
