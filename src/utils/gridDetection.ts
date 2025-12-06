export interface GridDetectionResult {
    gridSize: number;
    offsetX: number;
    offsetY: number;
    confidence: number;
}

export async function detectGrid(image: HTMLImageElement): Promise<GridDetectionResult | null> {
    // 1. Create a canvas for processing (downsampled)
    const MAX_DIM = 2000;
    let width = image.naturalWidth;
    let height = image.naturalHeight;

    if (width > MAX_DIM || height > MAX_DIM) {
        const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(image, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // 2. Grayscale & Edge Detection (Simple difference or Sobel)
    // We'll compute separate vertical and horizontal energy profiles.

    const colSums = new Float32Array(width).fill(0);
    const rowSums = new Float32Array(height).fill(0);

    // We iterate pixels and compute "edginess".
    // A vertical line has high horizontal contrast.
    // A horizontal line has high vertical contrast.

    // Stride = 4 (RGBA)
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {


            // Grayscale value approx - unused
            // const val = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

            // Vertical Edge (detects vertical lines): |Left - Right|
            const leftIdx = (y * width + (x - 1)) * 4;
            const rightIdx = (y * width + (x + 1)) * 4;
            const valLeft = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
            const valRight = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
            const vEdge = Math.abs(valLeft - valRight);
            colSums[x] += vEdge;

            // Horizontal Edge (detects horizontal lines): |Top - Bottom|
            const topIdx = ((y - 1) * width + x) * 4;
            const bottomIdx = ((y + 1) * width + x) * 4;
            const valTop = (data[topIdx] + data[topIdx + 1] + data[topIdx + 2]) / 3;
            const valBottom = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3;
            const hEdge = Math.abs(valTop - valBottom);
            rowSums[y] += hEdge;
        }
    }

    // 3. Peak Finding & Autocorrelation
    // We look for regular intervals in the projection sums.

    const findDominantPeriod = (sums: Float32Array): { period: number, offset: number, confidence: number } => {
        // Smoothen sums
        // Simple moving average
        const smoothed = new Float32Array(sums.length);
        const window = 3;
        for (let i = window; i < sums.length - window; i++) {
            let s = 0;
            for (let j = -window; j <= window; j++) s += sums[i + j];
            smoothed[i] = s / (2 * window + 1);
        }

        // Find local maxima (peaks)
        const peaks: number[] = [];
        const threshold = smoothed.reduce((a, b) => a + b, 0) / smoothed.length * 1.5; // > 1.5x average

        for (let i = 1; i < smoothed.length - 1; i++) {
            if (smoothed[i] > threshold && smoothed[i] > smoothed[i - 1] && smoothed[i] > smoothed[i + 1]) {
                peaks.push(i);
            }
        }

        if (peaks.length < 5) return { period: 0, offset: 0, confidence: 0 };

        // Calculate distances between adjacent peaks
        const diffs: number[] = [];
        for (let i = 0; i < peaks.length - 1; i++) {
            diffs.push(peaks[i + 1] - peaks[i]);
        }

        // Find the mode (most frequent difference) with some tolerance
        const counts: { [key: number]: number } = {};
        let maxCount = 0;
        let mode = 0;

        diffs.forEach(diff => {
            // Round to nearest multiple of 5 to group similar values roughly
            // Ideally we do K-means or clustering, but histogram bucketing is faster.
            // Let's bucket by 2 pixels.
            const bucket = Math.round(diff);
            // We only care about grids likely > 20px and < 300px (scaled)
            if (bucket < 10 || bucket > 500) return;

            counts[bucket] = (counts[bucket] || 0) + 1;
            if (counts[bucket] > maxCount) {
                maxCount = counts[bucket];
                mode = bucket;
            }
        });

        // Refine mode: average all diffs close to the mode
        let total = 0;
        let count = 0;
        diffs.forEach(diff => {
            if (Math.abs(diff - mode) < 2) {
                total += diff;
                count++;
            }
        });

        const finalPeriod = count > 0 ? total / count : 0;

        // Find offset: first peak that fits the pattern? 
        // Or just the first strong peak modulo period?
        // Let's try to align with the sequence of peaks.
        // If grid starts at `offset`, peaks should be at `offset + k * period`.
        // We want to minimize error.

        // Simple heuristic: The first valid peak is likely an intersection.
        const firstPeak = peaks[0];

        return {
            period: finalPeriod,
            offset: firstPeak,
            confidence: maxCount / diffs.length
        };
    };

    const xRes = findDominantPeriod(colSums);
    const yRes = findDominantPeriod(rowSums);

    // Combine results
    // If one confidence is bad, maybe use the other?
    // We assume square grids -> Average period if similar.

    let size = 0;
    if (Math.abs(xRes.period - yRes.period) < 2) {
        size = (xRes.period + yRes.period) / 2;
    } else {
        // Pick the one with higher confidence
        size = xRes.confidence > yRes.confidence ? xRes.period : yRes.period;
    }

    // Scale back up to original image dimensions
    const scaleFactor = image.naturalWidth / width;

    if (size === 0) return null;

    return {
        gridSize: Math.round(size * scaleFactor),
        offsetX: Math.round(xRes.offset * scaleFactor),
        offsetY: Math.round(yRes.offset * scaleFactor),
        confidence: (xRes.confidence + yRes.confidence) / 2
    };
}
