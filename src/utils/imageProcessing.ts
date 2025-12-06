
export interface ProcessImageOptions {
    image: HTMLImageElement;
    currentGridSizeX: number;
    currentGridSizeY: number;
    offsetX: number;
    offsetY: number;
    targetGridSize: number;
}

export async function processImage({
    image,
    currentGridSizeX,
    currentGridSizeY,
    offsetX,
    offsetY,
    targetGridSize,
}: ProcessImageOptions): Promise<string> {
    // 1. Calculate Scale (Non-uniform)
    const scaleX = targetGridSize / currentGridSizeX;
    const scaleY = targetGridSize / currentGridSizeY;

    const scaledWidth = image.naturalWidth * scaleX;
    const scaledHeight = image.naturalHeight * scaleY;

    // 2. Calculate Padding
    // We want the grid intersection (offsetX * scale, offsetY * scale) to land on a multiple of targetGridSize.
    // scaledOffset moves the same way.

    const scaledOffsetX = offsetX * scaleX;
    const scaledOffsetY = offsetY * scaleY;

    // Calculate how far we are from the next grid line to the left/top (or previous)
    // intersection is at scaledOffsetX. current grid line is at scaledOffsetX.
    // We want scaledOffsetX + paddingLeft = Multiple of targetGridSize.
    // => paddingLeft = (targetGridSize - (scaledOffsetX % targetGridSize)) % targetGridSize

    const paddingLeft = (targetGridSize - (scaledOffsetX % targetGridSize)) % targetGridSize;
    const paddingTop = (targetGridSize - (scaledOffsetY % targetGridSize)) % targetGridSize;

    // 3. Final Canvas Dimensions
    // We might also want to pad right/bottom to ensure full grid cells
    const contentWidth = paddingLeft + scaledWidth;
    const contentHeight = paddingTop + scaledHeight;

    const paddingRight = (targetGridSize - (contentWidth % targetGridSize)) % targetGridSize;
    const paddingBottom = (targetGridSize - (contentHeight % targetGridSize)) % targetGridSize;

    const finalWidth = contentWidth + paddingRight;
    const finalHeight = contentHeight + paddingBottom;

    // 4. Draw to Canvas
    const canvas = document.createElement('canvas');
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error("Could not get canvas context");
    }

    // Clear (transparent)
    ctx.clearRect(0, 0, finalWidth, finalHeight);

    // Draw scaled image at padding position
    // We use filter for better quality if needed, but default is usually okay.
    // For pixel art maps we might want pixelated? usually maps are painted.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(image, paddingLeft, paddingTop, scaledWidth, scaledHeight);

    // Return Data URL
    return canvas.toDataURL('image/webp');
}
