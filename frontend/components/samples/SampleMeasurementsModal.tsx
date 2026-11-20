'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Ruler, Printer, Loader2, Sparkles, Tag, Layers, CheckCircle2 } from 'lucide-react';
import api from '../../lib/axios';
import { getImageUrl } from '../../lib/imageUrl';
import { cleanDirtyEntallePrefix } from '../../lib/entalleUtils';

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
  { id: 'ENTALLE_ENLAZADO', label: 'Medidas de Entalle Enlazado', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
];

export function SampleMeasurementsModal({ sample, onClose }: SampleMeasurementsModalProps) {
  const [activeStage, setActiveStage] = useState('OFICIAL');
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [officialEntalles, setOfficialEntalles] = useState<any[]>([]);

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

    const fetchEntalles = async () => {
      try {
        const resp = await api.get('/products-measurements/official-entalles');
        setOfficialEntalles(resp.data || []);
      } catch (err) {
        console.warn('Error fetching official entalles in modal:', err);
      }
    };

    if (sample?.id) {
      fetchMeasurements();
      fetchEntalles();
    }
  }, [sample?.id]);

  const linkedEntalle = useMemo(() => {
    if (!sample) return null;

    // 1. Direct entalleMeasurements if available
    if (sample.entalleMeasurements && typeof sample.entalleMeasurements === 'object') {
      return sample.entalleMeasurements;
    }
    if (Array.isArray(sample.productionSizeData) && sample.productionSizeData[0]?.entalleData) {
      return sample.productionSizeData[0].entalleData;
    }

    // 2. Identify target entalle name and code
    let targetName = sample.entalle || '';
    let targetCode = '';
    if (Array.isArray(sample.productionSizeData) && sample.productionSizeData[0]) {
      if (!targetName && sample.productionSizeData[0].entalle) {
        targetName = sample.productionSizeData[0].entalle;
      }
      if (sample.productionSizeData[0].entalleCode) {
        targetCode = sample.productionSizeData[0].entalleCode;
      }
    }

    // 3. Extract from characteristics text
    const charText = sample.characteristics || '';
    if (!targetName) {
      const matchName = charText.match(/•?\s*Entalle Oficial:\s*(?:\[([^\]]*)\]\s*)?([^\(•\n]+)/i);
      if (matchName) {
        if (matchName[1]) targetCode = matchName[1].trim();
        if (matchName[2]) targetName = matchName[2].trim();
      }
    }
    if (!targetCode) {
      const matchCode = charText.match(/\[(ENT-\d+)\]/i);
      if (matchCode) targetCode = matchCode[1].trim();
    }

    // 4. Look up in officialEntalles
    let matchedEnt: any = null;
    if (officialEntalles.length > 0) {
      if (targetName) {
        matchedEnt = officialEntalles.find(e => 
          (e.name || '').trim().toUpperCase() === targetName.trim().toUpperCase()
        );
      }
      if (!matchedEnt && targetCode) {
        matchedEnt = officialEntalles.find(e => 
          (e.code || '').trim().toUpperCase() === targetCode.trim().toUpperCase()
        );
      }
    }

    const extractField = (pattern: RegExp) => {
      const m = charText.match(pattern);
      return m ? m[1].trim() : '';
    };

    const parsedCintura = extractField(/(?:-\s*|\b)Cintura:\s*([^\n•]+)/i);
    const parsedCadera = extractField(/(?:-\s*|\b)Cadera:\s*([^\n•]+)/i);
    const parsedMuslo = extractField(/(?:-\s*|\b)Muslo:\s*([^\n•]+)/i);
    const parsedRodilla = extractField(/(?:-\s*|\b)Rodilla:\s*([^\n•]+)/i);
    const parsedBotaPie = extractField(/(?:-\s*|\b)Bota\s*Pie:\s*([^\n•]+)/i);
    const parsedTiroDel = extractField(/(?:-\s*|\b)Tiro\s*Del(?:antero|\.):\s*([^\n•]+)/i);
    const parsedTiroPos = extractField(/(?:-\s*|\b)Tiro\s*Pos(?:terior|\.):\s*([^\n•]+)/i);
    const parsedLargo = extractField(/(?:-\s*|\b)Largo(?:\s*Total)?:\s*([^\n•]+)/i);
    const parsedBase = extractField(/(?:•\s*Talla\s*Base:\s*|Base:\s*Talla\s*)([^\n•]+)/i);
    const parsedCinturaType = extractField(/Entalle Oficial:[^(]*\(([^)]+)\)/i);

    if (matchedEnt) {
      return {
        ...matchedEnt,
        code: targetCode || matchedEnt.code,
        name: matchedEnt.name || targetName,
        baseSize: matchedEnt.baseSize || parsedBase || '32',
        cintura: matchedEnt.cintura || parsedCintura,
        cadera: matchedEnt.cadera || parsedCadera,
        muslo: matchedEnt.muslo || parsedMuslo,
        rodilla: matchedEnt.rodilla || parsedRodilla,
        botaPie: matchedEnt.botaPie || parsedBotaPie,
        tiroDel: matchedEnt.tiroDel || parsedTiroDel,
        tiroPos: matchedEnt.tiroPos || parsedTiroPos,
        largoTotal: matchedEnt.largoTotal || parsedLargo,
        cinturaType: matchedEnt.cinturaType || parsedCinturaType || 'CINTURA STANDARD',
      };
    }

    if (targetName || parsedCintura || parsedCadera) {
      return {
        name: targetName || 'ENTALLE SELECCIONADO',
        code: targetCode || 'ENT-OFICIAL',
        cinturaType: parsedCinturaType || 'CINTURA STANDARD',
        baseSize: parsedBase || '32',
        cintura: parsedCintura || '-',
        cadera: parsedCadera || '-',
        muslo: parsedMuslo || '-',
        rodilla: parsedRodilla || '-',
        botaPie: parsedBotaPie || '-',
        tiroDel: parsedTiroDel || '-',
        tiroPos: parsedTiroPos || '-',
        largoTotal: parsedLargo || '-',
      };
    }

    return null;
  }, [sample, officialEntalles]);

  const filteredMeasurements = measurements.filter((m: any) => m.stage === activeStage);

  // Group by size for stages with measurements
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
            const countForStage = stage.id === 'ENTALLE_ENLAZADO'
              ? (linkedEntalle ? 1 : 0)
              : measurements.filter(m => m.stage === stage.id).length;
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
                    {stage.id === 'ENTALLE_ENLAZADO' ? (linkedEntalle ? `Talla ${linkedEntalle.baseSize || '32'}` : '1 entalle') : `${countForStage} tallas`}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* CONTENT BODY */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
          {activeStage === 'ENTALLE_ENLAZADO' ? (
            /* VISTA DE MEDIDAS DE ENTALLE ENLAZADO */
            !linkedEntalle ? (
              <div className="py-16 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 p-8 flex flex-col items-center justify-center">
                <Ruler className="w-12 h-12 text-gray-300 mb-3" />
                <h3 className="text-lg font-black text-gray-700 uppercase">Sin entalle oficial enlazado</h3>
                <p className="text-xs text-gray-400 font-bold max-w-sm mt-1">
                  Esta muestra no cuenta con un entalle oficial enlazado. Puedes enlazar un entalle editando la muestra desde el botón &quot;Editar Muestra (UDP)&quot;.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* BANNER INFORMATIVO DEL ENTALLE ENLAZADO */}
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50/60 to-white border border-purple-200/80 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-200">
                      <Ruler className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider border border-purple-200">
                          {linkedEntalle.code || 'ENT-OFICIAL'}
                        </span>
                        <span className="text-[11px] font-black text-purple-600 uppercase tracking-wider">
                          {linkedEntalle.cinturaType || 'CINTURA STANDARD'}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mt-0.5">
                        Entalle Oficial: {linkedEntalle.name}
                      </h3>
                      <p className="text-[11px] text-gray-500 font-bold mt-0.5">
                        Medidas base de patronaje referenciales enlazadas a esta muestra
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <div className="px-4 py-2 bg-white rounded-2xl border border-purple-200 shadow-sm text-center">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Talla Base</span>
                      <span className="text-xs font-black text-purple-900 uppercase">Talla {linkedEntalle.baseSize || '32'}</span>
                    </div>
                    {linkedEntalle.tela && (
                      <div className="px-4 py-2 bg-white rounded-2xl border border-gray-200 shadow-sm text-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Tela / Tipo</span>
                        <span className="text-xs font-black text-gray-700 uppercase">
                          {linkedEntalle.tela}{linkedEntalle.tipoTela ? ` (${linkedEntalle.tipoTela})` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* TABLA DE MEDIDAS DEL ENTALLE ENLAZADO */}
                <div className="overflow-x-auto border border-gray-200 rounded-3xl shadow-sm bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-900 text-white">
                        <th className="px-5 py-4 text-xs font-black uppercase tracking-wider border-r border-gray-800">
                          Punto de Medida
                        </th>
                        <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-center border-r border-gray-800 last:border-r-0 bg-purple-900/70">
                          Talla Base ({linkedEntalle.baseSize || '32'})
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-bold text-sm">
                      {MEASUREMENT_KEYS.map((keyObj, idx) => {
                        const val = linkedEntalle[keyObj.key] || '-';
                        return (
                          <tr key={keyObj.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <td className="px-5 py-3.5 text-xs font-black text-gray-900 uppercase border-r border-gray-100 flex items-center justify-between">
                              <span>{keyObj.label}</span>
                            </td>
                            <td className="px-5 py-3.5 text-center text-xs font-black text-purple-950 border-r border-gray-100 last:border-r-0">
                              {val && val !== '-' ? (
                                <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-200 font-mono inline-block">
                                  {val}
                                </span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : isLoading ? (
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
                <span className="text-gray-800 line-clamp-1">{cleanDirtyEntallePrefix(sample.characteristics)}</span>
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
