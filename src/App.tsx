
import { useState, useEffect } from 'react';
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

  // Visual Aids State
  const [gridColor, setGridColor] = useState('#ff0000');
  const [isGridVisible, setIsGridVisible] = useState(true);

  // Measure Tool State
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureStart, setMeasureStart] = useState<{ x: number, y: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number, y: number } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [exportGridSize, setExportGridSize] = useState(100);

  // Keyboard Nudging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!imageUrl) return;
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const shift = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case 'ArrowLeft':
          setOffsetX(prev => prev - shift);
          break;
        case 'ArrowRight':
          setOffsetX(prev => prev + shift);
          break;
        case 'ArrowUp':
          setOffsetY(prev => prev - shift);
          break;
        case 'ArrowDown':
          setOffsetY(prev => prev + shift);
          break;
        case '=':
        case '+':
          setGridSize(prev => prev + 1);
          break;
        case '-':
          setGridSize(prev => Math.max(10, prev - 1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageUrl]);

  const handleImageUpload = (file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    // Reset grid on new image? Maybe keep it? Let's reset for now.
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleReset = () => {
    setGridSize(50);
    setOffsetX(0);
    setOffsetY(0);
  };

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

      const result = await detectGrid(img);
      if (result && result.gridSize > 0) {
        setGridSize(result.gridSize);
        setOffsetX(result.offsetX % result.gridSize);
        setOffsetY(result.offsetY % result.gridSize);
        // Also set export grid size match detected size? Or keep 100 default?
        // Let's keep export default at 100 for now, but maybe nice to set it.
        // setExportGridSize(100); 
      } else {
        // Silent failure on auto-detect? Or toast?
        // Let's console log for now to depend less on intrusive alerts on load
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
      const link = document.createElement('a');
      link.download = `resized_map_${Date.now()}.webp`;
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
      {imageUrl && (
        <Controls
          gridSize={gridSize}
          setGridSize={setGridSize}
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
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}

export default App;
