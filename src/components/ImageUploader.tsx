import React, { useCallback } from 'react';

interface ImageUploaderProps {
    onImageUpload: (file: File) => void;
}

export function ImageUploader({ onImageUpload }: ImageUploaderProps) {
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onImageUpload(e.dataTransfer.files[0]);
        }
    }, [onImageUpload]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImageUpload(e.target.files[0]);
        }
    }, [onImageUpload]);

    return (
        <div
            className="border-2 border-dashed border-neutral-600 rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer hover:border-neutral-400 hover:bg-neutral-800 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById('file-upload')?.click()}
        >
            <input
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/*"
                onChange={handleChange}
            />
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-xl font-bold mb-2">Drop your Battlemap here</h3>
            <p className="text-neutral-400">or click to browse</p>
        </div>
    );
}
