'use client';

import React from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

interface DeleteSampleModalProps {
  sampleName: string;
  sampleCode?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteSampleModal({
  sampleName,
  sampleCode,
  isDeleting = false,
  onConfirm,
  onClose,
}: DeleteSampleModalProps) {
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden p-6 md:p-8 relative my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close icon button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-5 shadow-sm">
          <Trash2 className="w-8 h-8" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-black text-gray-900 text-center tracking-tight mb-2">
          ¿Eliminar Muestra Definitivamente?
        </h3>

        {sampleCode && (
          <div className="flex justify-center mb-3">
            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-[10px] font-black uppercase rounded-lg tracking-wider">
              CÓD: {sampleCode}
            </span>
          </div>
        )}

        {/* Explanation text */}
        <p className="text-center text-xs font-medium text-gray-600 leading-relaxed mb-6 px-2">
          Estás a punto de eliminar la muestra <strong className="text-gray-900 font-black uppercase">"{sampleName}"</strong>.
          Esta acción borrará permanentemente sus medidas, materiales y OP asociada para poder registrarla nuevamente si lo deseas.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-2xl text-xs uppercase tracking-wider transition active:scale-95 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shadow-rose-600/25 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Sí, Eliminar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

