// frontend/components/common/ImageZoomModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, ExternalLink } from 'lucide-react';
import { getImageUrl } from '../../lib/imageUrl';

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  title?: string;
  category?: string;
  sku?: string;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  category,
  sku,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const fullUrl = getImageUrl(imageUrl);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.3, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.max(prev - 0.3, 0.5));
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 select-none transition-all duration-300"
      onClick={onClose}
    >
      {/* Top Header Controls */}
      <div
        className="w-full max-w-4xl flex items-center justify-between gap-3 mb-3 text-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30">
              {category || 'Avío'}
            </span>
            {sku && (
              <span className="text-xs text-gray-300 font-mono bg-white/10 px-2 py-0.5 rounded">
                SKU: {sku}
              </span>
            )}
          </div>
          {title && (
            <h3 className="text-sm sm:text-base md:text-lg font-bold text-white truncate mt-1">
              {title}
            </h3>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition border border-white/10"
            title="Acercar (+)"
          >
            <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition border border-white/10"
            title="Alejar (-)"
          >
            <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="button"
            onClick={handleRotate}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition border border-white/10"
            title="Rotar 90°"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition border border-white/10"
            title="Abrir imagen original"
          >
            <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition shadow-lg border border-red-500/30 ml-1 sm:ml-2"
            title="Cerrar (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="relative max-w-4xl w-full max-h-[75vh] flex-1 flex items-center justify-center overflow-hidden rounded-2xl p-2 cursor-zoom-in"
        onClick={(e) => {
          e.stopPropagation();
          setScale((prev) => (prev > 1 ? 1 : 1.6));
        }}
      >
        <img
          src={fullUrl}
          alt={title || 'Avío'}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
          }}
          className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-2xl drop-shadow-2xl select-none"
          draggable={false}
        />
      </div>

      {/* Bottom helper hint */}
      <div
        className="mt-2 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 sm:gap-3 backdrop-blur-sm text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <span>Toca para alternar zoom</span>
        <span>•</span>
        <span>Esc o click fuera para cerrar</span>
      </div>
    </div>
  );
};
