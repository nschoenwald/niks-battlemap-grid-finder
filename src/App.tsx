
import { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { MapCanvas } from './components/MapCanvas';
import { Controls } from './components/Controls';

import { processImage } from './utils/imageProcessing';
import { detectGrid } from './utils/gridDetection';

function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Grid State
  const [gridSize, setGridSize] = useState(50);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);

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
      } else {
        alert("Could not detect a clear grid.");
      }
    } catch (e) {
      console.error(e);
      alert("Detection failed.");
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
        targetGridSize: 100
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

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 overflow-hidden font-sans">

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col relative">
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
        />
      )}
    </div>
  );
}

export default App;
