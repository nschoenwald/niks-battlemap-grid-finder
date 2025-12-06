export interface GridDetectionResult {
    gridSizeX: number;
    gridSizeY: number;
    offsetX: number;
    offsetY: number;
    confidence: number;
}

export type DetectionMethod = 'auto' | 'projection' | 'autocorrelation';

export async function detectGrid(image: HTMLImageElement, method: DetectionMethod = 'auto'): Promise<GridDetectionResult | null> {
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

    // Scale back up to original image dimensions
    const scaleFactor = image.naturalWidth / width;

    let result: GridDetectionResult | null = null;

    if (method === 'auto') {
        const pResult = detectGridProjection(imageData, width, height);
        const aResult = detectGridAutocorrelation(imageData, width, height);

        // Simple competition: higher confidence wins
        // Bias slightly towards projection as it's usually more precise on clean maps
        if (pResult && aResult) {
            console.log(`Projection Confidence: ${pResult.confidence}, AutoCorr Confidence: ${aResult.confidence}`);
            result = pResult.confidence >= aResult.confidence ? pResult : aResult;
        } else {
            result = pResult || aResult;
        }
    } else if (method === 'projection') {
        result = detectGridProjection(imageData, width, height);
    } else if (method === 'autocorrelation') {
        result = detectGridAutocorrelation(imageData, width, height);
    }

    if (!result) return null;

    return {
        ...result,
        gridSizeX: Math.round(result.gridSizeX * scaleFactor),
        gridSizeY: Math.round(result.gridSizeY * scaleFactor),
        offsetX: Math.round(result.offsetX * scaleFactor),
        offsetY: Math.round(result.offsetY * scaleFactor),
    };
}

function detectGridProjection(imageData: ImageData, width: number, height: number): GridDetectionResult | null {
    const data = imageData.data;
    const colSums = new Float32Array(width).fill(0);
    const rowSums = new Float32Array(height).fill(0);

    // Edge Detection Loop
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            // Vertical Edge: |Left - Right|
            const leftIdx = (y * width + (x - 1)) * 4;
            const rightIdx = (y * width + (x + 1)) * 4;
            const valLeft = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]); // Sum (faster than avg)
            const valRight = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]);
            const vEdge = Math.abs(valLeft - valRight);
            colSums[x] += vEdge;

            // Horizontal Edge: |Top - Bottom|
            const topIdx = ((y - 1) * width + x) * 4;
            const bottomIdx = ((y + 1) * width + x) * 4;
            const valTop = (data[topIdx] + data[topIdx + 1] + data[topIdx + 2]);
            const valBottom = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]);
            const hEdge = Math.abs(valTop - valBottom);
            rowSums[y] += hEdge;
        }
    }

    // Peak Finding Helper
    const findDominantPeriod = (sums: Float32Array): { period: number, offset: number, confidence: number } => {
        // Smoothen
        const smoothed = new Float32Array(sums.length);
        const window = 3;
        for (let i = window; i < sums.length - window; i++) {
            let s = 0;
            for (let j = -window; j <= window; j++) s += sums[i + j];
            smoothed[i] = s / (2 * window + 1);
        }

        const peaks: number[] = [];
        const avg = smoothed.reduce((a, b) => a + b, 0) / smoothed.length;
        const threshold = avg * 1.5;

        for (let i = 2; i < smoothed.length - 2; i++) {
            if (smoothed[i] > threshold &&
                smoothed[i] > smoothed[i - 1] &&
                smoothed[i] > smoothed[i + 1]) {
                peaks.push(i);
            }
        }

        if (peaks.length < 5) return { period: 0, offset: 0, confidence: 0 };

        const diffs: number[] = [];
        for (let i = 0; i < peaks.length - 1; i++) {
            diffs.push(peaks[i + 1] - peaks[i]);
        }

        const counts: { [key: number]: number } = {};
        let maxCount = 0;
        let mode = 0;

        diffs.forEach(diff => {
            const bucket = Math.round(diff);
            if (bucket < 15 || bucket > 400) return; // Adjusted limits
            counts[bucket] = (counts[bucket] || 0) + 1;
            if (counts[bucket] > maxCount) {
                maxCount = counts[bucket];
                mode = bucket;
            }
        });

        // Calculate weighted average around mode
        let total = 0;
        let count = 0;
        diffs.forEach(diff => {
            if (Math.abs(diff - mode) <= 2) {
                total += diff;
                count++;
            }
        });

        const finalPeriod = count > 0 ? total / count : 0;

        // Find Offset: first peak consistent with period
        let bestOffset = 0;
        if (finalPeriod > 0) {
            // Check first few peaks
            for (const p of peaks) {
                // heuristic: usually the first valid peak is a grid line
                bestOffset = p;
                break;
            }
        }

        return {
            period: finalPeriod,
            offset: bestOffset,
            confidence: maxCount / diffs.length
        };
    };

    const xRes = findDominantPeriod(colSums);
    const yRes = findDominantPeriod(rowSums);

    if (xRes.period === 0 && yRes.period === 0) return null;

    // Use found periods directly, fall back to the other one if zero (rare)
    const sizeX = xRes.period > 0 ? xRes.period : yRes.period;
    const sizeY = yRes.period > 0 ? yRes.period : xRes.period;

    return {
        gridSizeX: sizeX,
        gridSizeY: sizeY,
        offsetX: xRes.offset,
        offsetY: yRes.offset,
        confidence: (xRes.confidence + yRes.confidence) / 2
    };
}

// 2. Autocorrelation Implementation
function detectGridAutocorrelation(imageData: ImageData, width: number, height: number): GridDetectionResult | null {
    // We will use 1D autocorrelation on row/col sums of "energy"
    // However, basic pixel sums might be influenced by image content luminosity.
    // Better to use Edge Energy sums (calculated above but re-doing for isolation).

    // Compute Edge Energy Sums (Simplified)
    const data = imageData.data;
    const colEnergy = new Float32Array(width).fill(0);
    const rowEnergy = new Float32Array(height).fill(0);

    for (let y = 0; y < height; y += 2) { // Skip lines for speed
        for (let x = 0; x < width; x += 2) {
            const idx = (y * width + x) * 4;
            // Simple Laplacian-ish or Gradient magnitude
            // Try horizontal diff
            if (x < width - 1) {
                const diff = Math.abs(data[idx] - data[idx + 4]) +
                    Math.abs(data[idx + 1] - data[idx + 5]) +
                    Math.abs(data[idx + 2] - data[idx + 6]);
                colEnergy[x] += diff; // Vertical edges sum into columns
            }
            // Vertical diff
            if (y < height - 1) {
                const diff = Math.abs(data[idx] - data[idx + width * 4]) +
                    Math.abs(data[idx + 1] - data[idx + width * 4 + 1]) +
                    Math.abs(data[idx + 2] - data[idx + width * 4 + 2]);
                rowEnergy[y] += diff; // Horizontal edges sum into rows
            }
        }
    }

    const autocorrelate = (signal: Float32Array): { period: number, confidence: number, offset: number } => {
        const n = signal.length;
        // Normalize signal (subtract mean)
        let mean = 0;
        for (let i = 0; i < n; i++) mean += signal[i];
        mean /= n;

        const normSignal = new Float32Array(n);
        for (let i = 0; i < n; i++) normSignal[i] = signal[i] - mean;

        // Compute Autocorrelation for lags 15..400
        let maxCorr = -Infinity;
        let bestLag = 0;


        // Optimization: don't compute full correlation, just check candidate lags?
        // No, we need to find the peak.
        const minLag = 20;
        const maxLag = 300;

        for (let lag = minLag; lag < maxLag; lag++) {
            let sum = 0;
            // Only sum overlapping parts
            for (let i = 0; i < n - lag; i += 2) { // Skip step for speed
                sum += normSignal[i] * normSignal[i + lag];
            }
            // Normalize by number of terms to be fair to larger lags?
            // Actually standard autocorrelation definition:
            // r_k = sum((x_i - mu)(x_{i+k} - mu)) / sum((x_i - mu)^2)
            // But raw product sum is okay if we care about magnitude of match

            if (sum > maxCorr) {
                maxCorr = sum;
                bestLag = lag;
            }
        }

        // Offset Finding: Maximize cross-correlation with a periodic impulse train?
        // Or simply find the first strong peak in the original signal now that we know the period.
        let bestOffset = 0;
        let maxOffsetEnergy = -1;

        if (bestLag > 0) {
            // Check offset within first period
            for (let o = 0; o < bestLag; o++) {
                // Sum energy at o, o+period, o+2*period...
                let energy = 0;
                let k = 0;
                while (o + k * bestLag < n) {
                    energy += signal[o + k * bestLag];
                    k++;
                }
                if (energy > maxOffsetEnergy) {
                    maxOffsetEnergy = energy;
                    bestOffset = o;
                }
            }
        }

        // Confidence heuristic
        return {
            period: bestLag,
            confidence: maxCorr, // Raw score, not normalized 0-1 but useful for comparison
            offset: bestOffset
        };
    };

    const xRes = autocorrelate(colEnergy);
    const yRes = autocorrelate(rowEnergy);

    if (xRes.period === 0 && yRes.period === 0) return null;

    const sizeX = xRes.period > 0 ? xRes.period : yRes.period;
    const sizeY = yRes.period > 0 ? yRes.period : xRes.period;

    return {
        gridSizeX: sizeX,
        gridSizeY: sizeY,
        offsetX: xRes.offset,
        offsetY: yRes.offset,
        confidence: 0.8
    };
}
