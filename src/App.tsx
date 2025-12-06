
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

  const [showHelp, setShowHelp] = useState(false);

  // Grid State
  const [gridSize, setGridSize] = useState(50);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  // Refs for Event Listeners to avoid stale closures
  const stateRef = useRef({ gridSize, offsetX, offsetY });
  useEffect(() => {
    stateRef.current = { gridSize, offsetX, offsetY };
  }, [gridSize, offsetX, offsetY]);

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
  const handleGridSizeChange = (newSize: number) => {
    if (newSize < 1) return;
    const oldSize = gridSize;
    const ratio = newSize / oldSize;

    setGridSize(newSize);
    setOffsetX(Math.round(offsetX * ratio));
    setOffsetY(Math.round(offsetY * ratio));
  };

  // Keyboard Nudging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!imageUrl) return;
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const { gridSize: currentSize, offsetX: currentX, offsetY: currentY } = stateRef.current;
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
          const newSize = currentSize + 1;
          const ratio = newSize / currentSize;
          setGridSize(newSize);
          setOffsetX(Math.round(currentX * ratio));
          setOffsetY(Math.round(currentY * ratio));
          break;
        }
        case '-': {
          if (currentSize <= 10) return;
          const newSize = currentSize - 1;
          const ratio = newSize / currentSize;
          setGridSize(newSize);
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
    setGridSize(50);
  };

  const handleReset = () => {
    setGridSize(50);
    setOffsetX(0);
    setOffsetY(0);
  };

  // Detection State
  const [detectionMethod, setDetectionMethod] = useState<'auto' | 'projection' | 'autocorrelation'>('auto');

  // Auto-Detect on Load
  useEffect(() => {
    if (imageUrl) {
      handleAutoDetect();
    }
  }, [imageUrl]);

  const handleAutoDetect = async () => {
    if (!imageUrl) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.src = imageUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      // Artificial delay to let UI render loading state if it's too fast? No.
      // But autocorrelation might freeze UI if not in worker.
      // For now we just run it async (it's sync blocking though).
      // A 0ms timeout allows the react render cycle to update "Processing" state.
      await new Promise(r => setTimeout(r, 50));

      const result = await detectGrid(img, detectionMethod);
      if (result && result.gridSize > 0) {
        setGridSize(result.gridSize);
        setOffsetX(result.offsetX % result.gridSize);
        setOffsetY(result.offsetY % result.gridSize);
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
        currentGridSize: gridSize,
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
    // const height = Math.abs(end.y - start.y);

    if (width < 10) return; // Ignore small drags

    // Fixed 3x3 Logic
    const count = 3;

    const newGridSize = width / count;

    // Calculate Offset
    const left = Math.min(start.x, end.x);
    const top = Math.min(start.y, end.y);

    setGridSize(Math.round(newGridSize));
    setOffsetX(Math.round(left % newGridSize));
    setOffsetY(Math.round(top % newGridSize));
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 overflow-hidden font-sans">

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        <header className="h-14 border-b border-neutral-800 flex items-center px-6 bg-neutral-900 z-10">
          <h1 className="text-lg font-bold tracking-brand">Battlemap Resizer</h1>
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

        <main className="flex-1 overflow-hidden flex items-center justify-center p-8 bg-neutral-950">
          {!imageUrl ? (
            <ImageUploader onImageUpload={handleImageUpload} />
          ) : (
            <MapCanvas
              imageUrl={imageUrl}
              gridSize={gridSize}
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
            />
          )}
        </main>
      </div>

      {/* Sidebar Controls */}
      <div className="relative">
        <Controls
          gridSize={gridSize}
          setGridSize={handleGridSizeChange}
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
          detectionMethod={detectionMethod}
          setDetectionMethod={setDetectionMethod}
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
