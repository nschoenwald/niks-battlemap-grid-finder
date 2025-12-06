
import { useState, useEffect, useRef } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { MapCanvas } from './components/MapCanvas';
import { Controls } from './components/Controls';
import { HelpModal } from './components/HelpModal';

import { processImage } from './utils/imageProcessing';
import { detectGrid } from './utils/gridDetection';

function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const [showHelp, setShowHelp] = useState(false);

  // Grid State
  // Grid State
  const [gridSizeX, setGridSizeX] = useState(50);
  const [gridSizeY, setGridSizeY] = useState(50);
  const [isAspectLocked, setIsAspectLocked] = useState(true);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  // Refs for Event Listeners to avoid stale closures
  const stateRef = useRef({ gridSizeX, gridSizeY, offsetX, offsetY });
  useEffect(() => {
    stateRef.current = { gridSizeX, gridSizeY, offsetX, offsetY };
  }, [gridSizeX, gridSizeY, offsetX, offsetY]);

  // Visual Aids State
  const [gridColor, setGridColor] = useState('#ff0000');
  const [isGridVisible, setIsGridVisible] = useState(true);

  // Measure Tool State
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureStart, setMeasureStart] = useState<{ x: number, y: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number, y: number } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [exportGridSize, setExportGridSize] = useState(100);

  // Proportional Scaling Handler
  const handleGridSizeChange = (newSize: number, axis: 'x' | 'y' = 'x') => {
    if (newSize < 1) return;

    if (isAspectLocked) {
      // Find ratio based on whichever axis triggered the change? 
      // Or simpler: just sync them if locked.
      // Wait, if Aspect is locked, it implies "maintain square" OR "maintain current ratio"?
      // Usually grid tools mean "maintain square". Let's assume Square Lock for now.
      // Actually "Link" icon usually means "maintain ratio", but default is Square.

      // Let's implement strict Square Lock if enabled for simplicity first, or ratio if different?
      // User asked for "skewed grids", so they might want 50x60.
      // If they lock, should it become 100x120? Yes.

      const oldSizeX = gridSizeX;
      const oldSizeY = gridSizeY;

      if (axis === 'x') {
        const ratio = newSize / oldSizeX;
        setGridSizeX(newSize);
        setGridSizeY(Math.round(oldSizeY * ratio));
        setOffsetX(Math.round(offsetX * ratio));
        setOffsetY(Math.round(offsetY * ratio));
      } else {
        const ratio = newSize / oldSizeY;
        setGridSizeY(newSize);
        setGridSizeX(Math.round(oldSizeX * ratio));
        setOffsetX(Math.round(offsetX * ratio));
        setOffsetY(Math.round(offsetY * ratio));
      }
    } else {
      // Unlock mode: Change only one axis. 
      // Only scale offset matching axis?
      if (axis === 'x') {
        const ratio = newSize / gridSizeX;
        setGridSizeX(newSize);
        setOffsetX(Math.round(offsetX * ratio));
      } else {
        const ratio = newSize / gridSizeY;
        setGridSizeY(newSize);
        setOffsetY(Math.round(offsetY * ratio));
      }
    }
  };

  // Keyboard Nudging (Affects Both Symmetrically or just active?)
  // For simplicity, keyboard +/- affects X and ratio-scales Y.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!imageUrl) return;
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const { gridSizeX: currentXVal, gridSizeY: currentYVal, offsetX: currentX, offsetY: currentY } = stateRef.current;
      const shift = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case 'ArrowLeft':
          setOffsetX(currentX - shift);
          break;
        case 'ArrowRight':
          setOffsetX(currentX + shift);
          break;
        case 'ArrowUp':
          setOffsetY(currentY - shift);
          break;
        case 'ArrowDown':
          setOffsetY(currentY + shift);
          break;
        case '=':
        case '+': {
          const newSizeX = currentXVal + 1;
          const ratio = newSizeX / currentXVal;
          setGridSizeX(newSizeX);
          setGridSizeY(Math.round(currentYVal * ratio));
          setOffsetX(Math.round(currentX * ratio));
          setOffsetY(Math.round(currentY * ratio));
          break;
        }
        case '-': {
          if (currentXVal <= 1) return;
          const newSizeX = currentXVal - 1;
          const ratio = newSizeX / currentXVal;
          setGridSizeX(newSizeX);
          setGridSizeY(Math.round(currentYVal * ratio));
          setOffsetX(Math.round(currentX * ratio));
          setOffsetY(Math.round(currentY * ratio));
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageUrl]);

  const handleImageUpload = (file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    // Reset grid on new image
    setOffsetX(0);
    setOffsetY(0);
    setGridSizeX(50);
    setGridSizeY(50);
    setZoom(1);
    setIsAspectLocked(true);
  };

  const handleReset = () => {
    setGridSizeX(50);
    setGridSizeY(50);
    setOffsetX(0);
    setOffsetY(0);
  };



  // Auto-Detect on Load
  useEffect(() => {
    if (imageUrl) {
      handleAutoDetect();
    }
  }, [imageUrl]);

  const handleAutoDetect = async (method: 'auto' | 'projection' | 'autocorrelation' = 'auto') => {
    if (!imageUrl) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.src = imageUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      // Artificial delay to let UI render
      await new Promise(r => setTimeout(r, 50));

      const result = await detectGrid(img, method);
      if (result && result.gridSizeX > 0 && result.gridSizeY > 0) {
        setGridSizeX(result.gridSizeX);
        setGridSizeY(result.gridSizeY);
        setOffsetX(result.offsetX % result.gridSizeX);
        setOffsetY(result.offsetY % result.gridSizeY);

        // Auto-disable aspect lock if detected grid is very non-square?
        if (Math.abs(result.gridSizeX - result.gridSizeY) > 1) {
          setIsAspectLocked(false);
        } else {
          setIsAspectLocked(true);
        }
      } else {
        console.warn("Could not automatically detect grid.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    if (!imageUrl) return;
    setIsProcessing(true);

    try {
      // Create image element to get dimensions
      const img = new Image();
      img.src = imageUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      const dataUrl = await processImage({
        image: img,
        currentGridSizeX: gridSizeX,
        currentGridSizeY: gridSizeY,
        offsetX,
        offsetY,
        targetGridSize: exportGridSize
      });

      // Trigger Download
      const originalName = imageFile?.name.split('.')[0] || 'map';
      const link = document.createElement('a');
      link.download = `${originalName}-resized-${exportGridSize}px.webp`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. See console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMeasureComplete = (start: { x: number, y: number }, end: { x: number, y: number }) => {
    setIsMeasuring(false);
    setMeasureStart(null);
    setMeasureEnd(null);

    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);

    // Fixed 3x3 Logic
    const count = 3;

    const newGridSizeX = width / count;
    const newGridSizeY = height / count;

    setGridSizeX(Math.round(newGridSizeX));
    setGridSizeY(Math.round(newGridSizeY));

    // Auto-unlock aspect ratio if significantly different
    if (Math.abs(newGridSizeX - newGridSizeY) > 1) {
      setIsAspectLocked(false);
    }

    setOffsetX(Math.round(start.x % newGridSizeX));
    setOffsetY(Math.round(start.y % newGridSizeY));
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 overflow-hidden font-sans">

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        <header className="relative h-14 border-b border-neutral-800 flex items-center px-6 bg-neutral-900 z-10">
          <h1 className="text-lg font-bold tracking-brand">Nik's Battlemap Grid finder</h1>

          {/* Centered Zoom Controls */}
          {imageUrl && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
                className="w-8 h-8 flex items-center justify-center rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors border border-neutral-700"
              >
                -
              </button>
              <span className="text-sm font-mono w-12 text-center text-neutral-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(Math.min(5, zoom + 0.1))}
                className="w-8 h-8 flex items-center justify-center rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors border border-neutral-700"
              >
                +
              </button>
              <button
                onClick={() => setZoom(1)}
                className="ml-1 px-2 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-neutral-400 hover:text-white transition-colors uppercase tracking-wider font-bold"
              >
                Reset
              </button>
            </div>
          )}

          <div className="ml-auto">
            {imageFile && (
              <button
                onClick={() => { setImageUrl(null); setImageFile(null); }}
                className="text-sm text-neutral-400 hover:text-white"
              >
                Close Image
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex items-center justify-center p-8 bg-neutral-950 relative">
          {!imageUrl ? (
            <ImageUploader onImageUpload={handleImageUpload} />
          ) : (
            <>
              {/* Top-Center Zoom Controls */}


              <MapCanvas
                imageUrl={imageUrl}
                gridSizeX={gridSizeX}
                gridSizeY={gridSizeY}
                offsetX={offsetX}
                offsetY={offsetY}
                gridColor={gridColor}
                isGridVisible={isGridVisible}
                isMeasuring={isMeasuring}
                measureStart={measureStart}
                setMeasureStart={setMeasureStart}
                measureEnd={measureEnd}
                setMeasureEnd={setMeasureEnd}
                onMeasureComplete={handleMeasureComplete}
                scale={zoom}
              />
            </>
          )}
        </main>
      </div>

      {/* Sidebar Controls */}
      <div className="relative">
        <Controls
          gridSizeX={gridSizeX}
          gridSizeY={gridSizeY}
          setGridSize={handleGridSizeChange}
          isAspectLocked={isAspectLocked}
          setIsAspectLocked={setIsAspectLocked}
          offsetX={offsetX}
          setOffsetX={setOffsetX}
          offsetY={offsetY}
          setOffsetY={setOffsetY}
          onReset={handleReset}
          onExport={handleExport}
          isProcessing={isProcessing}
          onAutoDetect={handleAutoDetect}
          isMeasuring={isMeasuring}
          setIsMeasuring={setIsMeasuring}
          gridColor={gridColor}
          setGridColor={setGridColor}
          isGridVisible={isGridVisible}
          setIsGridVisible={setIsGridVisible}
          exportGridSize={exportGridSize}
          setExportGridSize={setExportGridSize}
          onOpenHelp={() => setShowHelp(true)}
        />

        {/* Empty State Overlay */}
        {!imageUrl && (
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 text-center border-l border-neutral-800">
            <span className="text-4xl mb-4">👈</span>
            <p className="text-neutral-300 font-bold text-lg mb-2">Controls Locked</p>
            <p className="text-neutral-400 text-sm">Upload a battlemap to unlock grid adjustments.</p>
          </div>
        )}
      </div>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}

export default App;
