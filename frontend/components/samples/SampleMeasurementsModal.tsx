'use client';

import React, { useState, useEffect } from 'react';
import { X, Ruler, Printer, Loader2, Sparkles, Tag, Layers, CheckCircle2 } from 'lucide-react';
import api from '../../lib/axios';
import { getImageUrl } from '../../lib/imageUrl';

interface SampleMeasurementsModalProps {
  sample: any;
  onClose: () => void;
}

const MEASUREMENT_KEYS = [
  { key: 'cintura', label: 'Cintura' },
  { key: 'cadera', label: 'Cadera' },
  { key: 'muslo', label: 'Muslo' },
  { key: 'rodilla', label: 'Rodilla' },
  { key: 'botaPie', label: 'Bota Pie' },
  { key: 'tiroDel', label: 'Tiro Del.' },
  { key: 'tiroPos', label: 'Tiro Pos.' },
  { key: 'largoTotal', label: 'Largo Total' },
];

const STAGES = [
  { id: 'OFICIAL', label: 'Medidas Oficiales (Ficha UDP)', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'ANTES_LAVAR', label: 'Antes de Lavar (Crudo)', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'DESPUES_LAVAR', label: 'Después de Lavar (Acabado)', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export function SampleMeasurementsModal({ sample, onClose }: SampleMeasurementsModalProps) {
  const [activeStage, setActiveStage] = useState('OFICIAL');
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMeasurements = async () => {
      setIsLoading(true);
      try {
        const resp = await api.get('/products-measurements', {
          params: { sampleId: sample.id }
        });
        setMeasurements(resp.data || []);
      } catch (err) {
        console.error('Error fetching sample measurements:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (sample?.id) {
      fetchMeasurements();
    }
  }, [sample?.id]);

  const filteredMeasurements = measurements.filter((m: any) => m.stage === activeStage);

  // Group by size
  const sizes = Array.from(new Set(filteredMeasurements.map((m: any) => m.size))).sort((a: any, b: any) => {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(a).localeCompare(String(b));
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col my-auto max-h-[90vh] print:max-h-none print:shadow-none print:border-0 print:rounded-none">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-indigo-950 p-6 md:p-8 text-white flex items-center justify-between relative print:bg-white print:text-black print:p-4 print:border-b">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 print:text-black print:bg-gray-100">
              <Ruler className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-black uppercase tracking-wider print:border print:border-black print:text-black">
                  {sample.code || 'MUESTRA UDP'}
                </span>
                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                  Ficha de Medidas
                </span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5 print:text-black">
                {sample.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition active:scale-95 flex items-center gap-2 text-xs font-bold"
              title="Imprimir tabla de medidas"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-3 bg-white/10 hover:bg-rose-500 text-white rounded-2xl transition active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STAGE SELECTOR TABS */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex gap-2 overflow-x-auto print:hidden">
          {STAGES.map(stage => {
            const countForStage = measurements.filter(m => m.stage === stage.id).length;
            const isActive = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/60'
                }`}
              >
                <span>{stage.label}</span>
                {countForStage > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {countForStage} tallas
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* CONTENT BODY */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
              <p className="text-xs font-black uppercase tracking-widest">Cargando tabla de medidas...</p>
            </div>
          ) : sizes.length === 0 ? (
            <div className="py-16 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 p-8 flex flex-col items-center justify-center">
              <Ruler className="w-12 h-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-black text-gray-700 uppercase">Sin medidas registradas en esta etapa</h3>
              <p className="text-xs text-gray-400 font-bold max-w-sm mt-1">
                UDP aún no ha ingresado las medidas de {STAGES.find(s => s.id === activeStage)?.label} para esta muestra.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-3xl shadow-sm bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider border-r border-gray-800">
                      Punto de Medida
                    </th>
                    {sizes.map(size => (
                      <th key={size} className="px-5 py-4 text-xs font-black uppercase tracking-wider text-center border-r border-gray-800 last:border-r-0 bg-indigo-900/60">
                        Talla {size}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-bold text-sm">
                  {MEASUREMENT_KEYS.map((keyObj, idx) => (
                    <tr key={keyObj.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-5 py-3.5 text-xs font-black text-gray-900 uppercase border-r border-gray-100 flex items-center justify-between">
                        <span>{keyObj.label}</span>
                      </td>
                      {sizes.map(size => {
                        const mObj = filteredMeasurements.find((m: any) => m.size === size);
                        const val = mObj ? (mObj[keyObj.key] || '-') : '-';
                        return (
                          <td key={size} className="px-5 py-3.5 text-center text-xs font-black text-indigo-950 border-r border-gray-100 last:border-r-0">
                            {val !== '-' ? (
                              <span className="px-2.5 py-1 bg-indigo-50/70 text-indigo-700 rounded-lg border border-indigo-100/80 inline-block font-mono">
                                {val}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SAMPLE INFO STRIP */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-gray-600">
            <div>
              <span className="text-gray-400 uppercase text-[10px] font-black block">Desarrollado por</span>
              <span className="text-gray-900 uppercase">{sample.udp?.name || 'Área UDP'}</span>
            </div>
            {sample.characteristics && (
              <div className="max-w-md">
                <span className="text-gray-400 uppercase text-[10px] font-black block">Ficha Técnica / Características</span>
                <span className="text-gray-800 line-clamp-1">{sample.characteristics}</span>
              </div>
            )}
            <div>
              <span className="text-gray-400 uppercase text-[10px] font-black block">Estado de Muestra</span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                {sample.status}
              </span>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 md:px-8 bg-gray-50 border-t border-gray-100 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition shadow-sm"
          >
            Cerrar Ficha
          </button>
        </div>

      </div>
    </div>
  );
}
