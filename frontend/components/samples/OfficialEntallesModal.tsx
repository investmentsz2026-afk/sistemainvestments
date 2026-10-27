'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Ruler, 
  Save, 
  FileSpreadsheet, 
  FileText, 
  Plus, 
  Trash2, 
  Search, 
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface OfficialEntalle {
  id?: string;
  name: string;
  code?: string;
  isCustomCode?: boolean;
  cinturaType: string;
  cintura: string;
  cadera: string;
  muslo: string;
  rodilla: string;
  botaPie: string;
  tiroDel: string;
  tiroPos: string;
  largoTotal: string;
  tela: string;
  tipoTela: string;
  baseSize?: string;
}

export const INITIAL_DEFAULT_ENTALLES: OfficialEntalle[] = [
  {
    name: 'RELAX',
    code: 'ENT-001',
    isCustomCode: false,
    cinturaType: 'CINTURA STRAIGHT',
    cintura: '17 "',
    cadera: '20 3/4 "',
    muslo: '12 3/4 "',
    rodilla: '9 1/2 "',
    botaPie: '7 5/8" (19,5 Cm)',
    tiroDel: '12 "',
    tiroPos: '15 1/2 "',
    largoTotal: '31 1/2 "',
    tela: 'DENIM',
    tipoTela: 'RIGIDO',
    baseSize: '32',
  },
  {
    name: 'BULL DENIM',
    code: 'ENT-002',
    isCustomCode: false,
    cinturaType: 'CINTURA STRAIGHT',
    cintura: '17 "',
    cadera: '20 3/4 "',
    muslo: '12 3/4 "',
    rodilla: '9 1/2 "',
    botaPie: '7 1/2 "',
    tiroDel: '12 "',
    tiroPos: '15 1/2 "',
    largoTotal: '31 1/2 "',
    tela: 'DENIM PPT',
    tipoTela: 'RIGIDO',
    baseSize: '32',
  },
  {
    name: 'CONFORT',
    code: 'ENT-003',
    isCustomCode: false,
    cinturaType: 'CINTURA STRAIGHT',
    cintura: '16 3/4 "',
    cadera: '20 1/2 "',
    muslo: '12 3/8 "',
    rodilla: '9 1/4 "',
    botaPie: '7 5/8" (19,5 Cm)',
    tiroDel: '11 1/2"',
    tiroPos: '15 1/4 "',
    largoTotal: '31 1/2 "',
    tela: 'DENIM',
    tipoTela: 'CONFORT',
    baseSize: '32',
  },
  {
    name: 'PARKER',
    code: 'ENT-004',
    isCustomCode: false,
    cinturaType: 'CINTURA SLIM',
    cintura: '16 3/4 "',
    cadera: '20 1/4 "',
    muslo: '12 1/4 "',
    rodilla: '8 1/2 "',
    botaPie: '7 1/8" (18cm)',
    tiroDel: '11 "',
    tiroPos: '15 "',
    largoTotal: '31 "',
    tela: 'DRILL',
    tipoTela: 'CONFORT',
    baseSize: '32',
  },
  {
    name: 'SONNY',
    code: 'ENT-005',
    isCustomCode: false,
    cinturaType: 'CINTURA SLIM',
    cintura: '16 3/4 "',
    cadera: '20 1/4 "',
    muslo: '12 1/4 "',
    rodilla: '8 1/2 "',
    botaPie: '7 1/4" (18.5 Cm)',
    tiroDel: '11 "',
    tiroPos: '15 "',
    largoTotal: '31 "',
    tela: 'DENIM',
    tipoTela: 'CONFORT',
    baseSize: '32',
  },
  {
    name: 'SCOOTTER',
    code: 'ENT-006',
    isCustomCode: false,
    cinturaType: 'CINTURA SKINNY',
    cintura: '16 3/4',
    cadera: '20 1/4 "',
    muslo: '11 3/4"',
    rodilla: '8 "',
    botaPie: '6 "',
    tiroDel: '11 "',
    tiroPos: '15 "',
    largoTotal: '30 "',
    tela: 'DENIM',
    tipoTela: 'CONFORT',
    baseSize: '32',
  },
  {
    name: 'ROLEX',
    code: 'ENT-007',
    isCustomCode: false,
    cinturaType: 'CINTURA RECTO',
    cintura: '16 3/4 "',
    cadera: '20 3/8 "',
    muslo: '12 1/4 "',
    rodilla: '9 "',
    botaPie: '7 5/8" (19,5 Cm)',
    tiroDel: '11 "',
    tiroPos: '15 "',
    largoTotal: '31 1/2 "',
    tela: 'DRILL',
    tipoTela: 'CONF. PPT',
    baseSize: '32',
  },
  {
    name: 'MORRISON',
    code: 'ENT-008',
    isCustomCode: false,
    cinturaType: 'CINTURA SLIM',
    cintura: '16 3/4 "',
    cadera: '20 3/8 "',
    muslo: '11 7/8"',
    rodilla: '8 1/2"',
    botaPie: '7 "',
    tiroDel: '11 "',
    tiroPos: '15 "',
    largoTotal: '31',
    tela: 'DRILL',
    tipoTela: 'CONF. PPT',
    baseSize: '32',
  },
  {
    name: 'KING',
    code: 'ENT-009',
    isCustomCode: false,
    cinturaType: 'CINTURA SKINNY',
    cintura: '16 1/2 "',
    cadera: '20 "',
    muslo: '11 5/8"',
    rodilla: '7 3/4"',
    botaPie: '6 " (15.2 cm)',
    tiroDel: '11 "',
    tiroPos: '15 "',
    largoTotal: '29 1/2 "',
    tela: 'DRILL',
    tipoTela: 'CONFORT',
    baseSize: '32',
  },
];

interface OfficialEntallesModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableProducts?: any[];
  onSaved?: (entalles: OfficialEntalle[]) => void;
}

export function OfficialEntallesModal({
  isOpen,
  onClose,
  availableProducts = [],
  onSaved
}: OfficialEntallesModalProps) {
  const [entalles, setEntalles] = useState<OfficialEntalle[]>(INITIAL_DEFAULT_ENTALLES);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Search / add new model state
  const [searchModel, setSearchModel] = useState('');
  const [newModelCode, setNewModelCode] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Load official entalles from backend on open
  useEffect(() => {
    if (isOpen) {
      loadOfficialEntalles();
    }
  }, [isOpen]);

  const loadOfficialEntalles = async () => {
    setIsLoading(true);
    try {
      const resp = await api.get('/products-measurements/official-entalles');
      if (Array.isArray(resp.data) && resp.data.length > 0) {
        setEntalles(resp.data.map((item: any, idx: number) => ({
          ...item,
          code: item.code || `ENT-${String(idx + 1).padStart(3, '0')}`,
          isCustomCode: item.isCustomCode === true,
        })));
      } else {
        setEntalles(INITIAL_DEFAULT_ENTALLES);
      }
    } catch (err) {
      console.warn('Error loading official entalles:', err);
      setEntalles(INITIAL_DEFAULT_ENTALLES);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellChange = (index: number, field: keyof OfficialEntalle, value: string) => {
    setEntalles(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value
      };
      return copy;
    });
  };

  const handleCodeChange = (index: number, newCode: string) => {
    setEntalles(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        code: newCode.toUpperCase(),
        isCustomCode: true, // Marcado como puesto/editado por el área UDP
      };
      return copy;
    });
  };

  const handleAddNewEntalle = (nameToAdd?: string) => {
    const rawName = (nameToAdd || searchModel).trim().toUpperCase();
    if (!rawName) {
      toast.error('Ingresa o selecciona el nombre del modelo');
      return;
    }

    if (entalles.some(e => e.name.toUpperCase() === rawName)) {
      toast.error(`El modelo o entalle "${rawName}" ya existe en la tabla.`);
      return;
    }

    const defaultCode = `ENT-${String(entalles.length + 1).padStart(3, '0')}`;
    const customCodeProvided = newModelCode.trim().toUpperCase();
    const finalCode = customCodeProvided || defaultCode;
    const isCustom = !!customCodeProvided;

    const newEntalle: OfficialEntalle = {
      name: rawName,
      code: finalCode,
      isCustomCode: isCustom,
      cinturaType: 'CINTURA SLIM',
      cintura: '16 3/4 "',
      cadera: '20 1/4 "',
      muslo: '12 1/4 "',
      rodilla: '8 1/2 "',
      botaPie: '7 1/8" (18cm)',
      tiroDel: '11 "',
      tiroPos: '15 "',
      largoTotal: '31 "',
      tela: 'DENIM',
      tipoTela: 'CONFORT',
      baseSize: '32',
    };

    setEntalles(prev => [...prev, newEntalle]);
    setSearchModel('');
    setNewModelCode('');
    setShowModelDropdown(false);
    toast.success(`Modelo "${rawName}" (${finalCode}) agregado al cuadro de entalles.`);
  };

  const handleDeleteColumn = (index: number) => {
    const target = entalles[index];
    if (!target) return;
    if (confirm(`¿Deseas eliminar el entalle "${target.name}"?`)) {
      setEntalles(prev => prev.filter((_, i) => i !== index));
      if (target.name) {
        api.delete(`/products-measurements/official-entalles/${encodeURIComponent(target.name)}`).catch(() => {});
      }
      toast.success(`Entalle "${target.name}" eliminado`);
    }
  };

  const handleRestoreDefaults = () => {
    if (confirm('¿Deseas restaurar la lista de entalles predeterminados de la ficha SPEC AMERICAN COLT?')) {
      setEntalles(INITIAL_DEFAULT_ENTALLES);
      toast.success('Entalles predeterminados restaurados');
    }
  };

  const handleSave = async () => {
    if (entalles.length === 0) {
      toast.error('No hay entalles para guardar');
      return;
    }

    setIsSaving(true);
    try {
      await api.post('/products-measurements/official-entalles', entalles);
      toast.success('¡Entalles oficiales guardados correctamente!');
      if (onSaved) onSaved(entalles);
    } catch (err: any) {
      console.error('Error saving official entalles:', err);
      toast.error(err.response?.data?.message || 'Error al guardar entalles');
    } finally {
      setIsSaving(false);
    }
  };

  // ── EXPORT TO EXCEL ──
  const handleExportExcel = () => {
    try {
      // Build AoA (Array of Arrays)
      const aoa: any[][] = [];

      // Row 1: Title
      aoa.push(['SPEC AMERICAN COLT - MATRIZ DE ENTALLES OFICIALES (TALLA 32)']);
      aoa.push([]); // blank

      // Row 3: Model Names
      aoa.push(['MODELO', ...entalles.map(e => e.name)]);

      // Row 4: Código de Entalle
      aoa.push(['CÓDIGO ENTALLE', ...entalles.map((e, idx) => e.code || `ENT-${String(idx + 1).padStart(3, '0')}`)]);

      // Row 5: Estado de Código
      aoa.push(['ESTADO CÓDIGO', ...entalles.map(e => e.isCustomCode ? 'Código puesto por el área UDP' : 'Código puesto por defecto')]);

      // Row 6: Cintura Type (Subheader)
      aoa.push(['CORTE / PRETINA', ...entalles.map(e => e.cinturaType)]);

      // Rows for measurements
      aoa.push(['CINTURA', ...entalles.map(e => e.cintura)]);
      aoa.push(['CADERA', ...entalles.map(e => e.cadera)]);
      aoa.push(['MUSLO', ...entalles.map(e => e.muslo)]);
      aoa.push(['RODILLA', ...entalles.map(e => e.rodilla)]);
      aoa.push(['BOTAPIE', ...entalles.map(e => e.botaPie)]);
      aoa.push(['T.DELT.', ...entalles.map(e => e.tiroDel)]);
      aoa.push(['T.ESPD.', ...entalles.map(e => e.tiroPos)]);
      aoa.push(['LARGO', ...entalles.map(e => e.largoTotal)]);
      aoa.push(['TELA', ...entalles.map(e => e.tela)]);
      aoa.push(['TIPO / FIT', ...entalles.map(e => e.tipoTela)]);

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Auto width for columns
      const colWidths = [{ wch: 22 }, ...entalles.map(() => ({ wch: 18 }))];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'SPEC AMERICAN COLT');
      XLSX.writeFile(wb, `SPEC_AMERICAN_COLT_ENTALLES_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast.success('Ficha de entalles exportada a Excel');
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      toast.error('Error al exportar a Excel');
    }
  };

  // ── EXPORT TO PDF ──
  const handleExportPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Header Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SPEC AMERICAN COLT', 14, 15);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('FICHA TÉCNICA Y MATRIZ DE ENTALLES OFICIALES (TALLA BASE 32)', 14, 21);

      doc.setFontSize(8);
      doc.text(`Fecha de exportación: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`, 280, 15, { align: 'right' });

      // Table columns & rows
      const head = [
        ['MEDIDA / ESPEC.', ...entalles.map(e => e.name)],
        ['CÓDIGO ENTALLE', ...entalles.map((e, idx) => `${e.code || `ENT-${String(idx + 1).padStart(3, '0')}`}\n(${e.isCustomCode ? 'UDP' : 'Defecto'})`)],
        ['CORTE / PRETINA', ...entalles.map(e => e.cinturaType)]
      ];

      const body = [
        ['CINTURA', ...entalles.map(e => e.cintura)],
        ['CADERA', ...entalles.map(e => e.cadera)],
        ['MUSLO', ...entalles.map(e => e.muslo)],
        ['RODILLA', ...entalles.map(e => e.rodilla)],
        ['BOTAPIE', ...entalles.map(e => e.botaPie)],
        ['T.DELT.', ...entalles.map(e => e.tiroDel)],
        ['T.ESPD.', ...entalles.map(e => e.tiroPos)],
        ['LARGO', ...entalles.map(e => e.largoTotal)],
        ['TELA', ...entalles.map(e => e.tela)],
        ['TIPO / FIT', ...entalles.map(e => e.tipoTela)],
      ];

      autoTable(doc, {
        head,
        body,
        startY: 26,
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          halign: 'center',
          valign: 'middle',
          textColor: [30, 30, 30],
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [249, 115, 22], // Orange
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: {
            halign: 'left',
            fontStyle: 'bold',
            fillColor: [245, 247, 250],
            textColor: [14, 116, 144]
          }
        },
        alternateRowStyles: {
          fillColor: [252, 252, 253]
        }
      });

      doc.save(`SPEC_AMERICAN_COLT_ENTALLES_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Ficha de entalles exportada a PDF');
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      toast.error('Error al exportar a PDF');
    }
  };

  // Product suggestions for search
  const filteredProductSuggestions = useMemo(() => {
    const q = searchModel.trim().toLowerCase();
    if (!q) return [];
    const setNames = new Set<string>();
    availableProducts.forEach(p => {
      if (p.name && p.name.toLowerCase().includes(q)) {
        setNames.add(p.name.trim().toUpperCase());
      }
    });
    return Array.from(setNames).slice(0, 8);
  }, [searchModel, availableProducts]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white w-full max-w-[96vw] max-h-[94vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white"
        >
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-amber-50/60 via-white to-orange-50/40">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-200">
                <Ruler className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    SPEC AMERICAN COLT
                  </h2>
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-black text-[10px] uppercase tracking-wider">
                    Entalles Oficiales Talla 32
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Ficha matriz de medidas predeterminadas por modelo para producción y muestras.
                </p>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto justify-end">
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                title="Restaurar valores de fábrica"
              >
                <RotateCcw className="w-4 h-4 text-gray-500" /> Restaurar
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-200 transition flex items-center gap-1.5 active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-200 transition flex items-center gap-1.5 active:scale-95"
              >
                <FileText className="w-4 h-4" /> Exportar PDF
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-200 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Guardar Entalles'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2.5 bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-xl transition shadow-sm border border-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search / Add Model Bar */}
          <div className="px-6 py-4 bg-gray-50/70 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <input
                type="text"
                placeholder="Buscar o escribir nombre de modelo para agregar..."
                value={searchModel}
                onChange={e => {
                  setSearchModel(e.target.value);
                  setShowModelDropdown(true);
                }}
                onFocus={() => setShowModelDropdown(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNewEntalle();
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />

              {/* Suggestions Dropdown */}
              {showModelDropdown && searchModel && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 max-h-48 overflow-y-auto">
                  {filteredProductSuggestions.length > 0 ? (
                    filteredProductSuggestions.map((name, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleAddNewEntalle(name)}
                        className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-amber-50 text-gray-800 flex items-center justify-between border-b border-gray-50 last:border-none"
                      >
                        <span>{name}</span>
                        <span className="text-[10px] text-amber-700 font-extrabold uppercase">+ Agregar</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-gray-500 flex items-center justify-between">
                      <span>Agregar nuevo modelo: <b>{searchModel.toUpperCase()}</b></span>
                      <button
                        type="button"
                        onClick={() => handleAddNewEntalle()}
                        className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase"
                      >
                        Crear
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <input
                type="text"
                placeholder="Código de entalle (opcional)"
                value={newModelCode}
                onChange={e => setNewModelCode(e.target.value.toUpperCase())}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNewEntalle();
                  }
                }}
                className="w-48 bg-white border border-gray-200 rounded-xl px-3 py-2.5 font-bold text-xs text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition shadow-sm uppercase placeholder:normal-case"
              />
              <button
                type="button"
                onClick={() => handleAddNewEntalle()}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Agregar Modelo / Columna
              </button>
            </div>
          </div>

          {/* Excel / Spec Table Container */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50/40">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-x-auto rounded-2xl border-2 border-gray-200 bg-white shadow-sm">
                <table className="min-w-full border-collapse text-center">
                  <thead>
                    {/* Header Row: Model Names */}
                    <tr className="border-b-2 border-gray-300">
                      <th className="sticky left-0 z-20 bg-slate-100 px-4 py-3 text-left font-black text-xs uppercase tracking-wider text-slate-700 border-r-2 border-gray-300 min-w-[170px] shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                        MODELO
                      </th>
                      {entalles.map((ent, idx) => {
                        // Alternate between orange/yellow tone like the user's Excel
                        const isYellow = idx >= 4 && idx <= 8;
                        const bgClass = isYellow ? 'bg-yellow-300 text-gray-900' : 'bg-orange-200 text-red-900';

                        return (
                          <th
                            key={idx}
                            className={`px-3 py-2.5 font-black text-xs uppercase border-r border-gray-300 min-w-[170px] relative group ${bgClass}`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="text"
                                value={ent.name}
                                onChange={e => handleCellChange(idx, 'name', e.target.value.toUpperCase())}
                                className="w-full text-center bg-transparent font-black text-xs outline-none focus:bg-white/80 rounded px-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteColumn(idx)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-100 rounded transition absolute right-1 top-1"
                                title="Eliminar este entalle"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </th>
                        );
                      })}
                    </tr>

                    {/* Header Row: Código de Entalle */}
                    <tr className="border-b-2 border-indigo-200 bg-indigo-50/30">
                      <th className="sticky left-0 z-20 bg-slate-100 px-4 py-2.5 text-left font-black text-[11px] uppercase tracking-wider text-indigo-900 border-r-2 border-gray-300 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                          CÓDIGO DE ENTALLE
                        </div>
                      </th>
                      {entalles.map((ent, idx) => {
                        const currentCode = ent.code || `ENT-${String(idx + 1).padStart(3, '0')}`;
                        const isCustom = ent.isCustomCode === true;

                        return (
                          <th key={idx} className="px-2.5 py-2.5 border-r border-gray-300 bg-white align-top">
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="relative w-full">
                                <input
                                  type="text"
                                  value={currentCode}
                                  onChange={e => handleCodeChange(idx, e.target.value)}
                                  placeholder={`ENT-${String(idx + 1).padStart(3, '0')}`}
                                  className="w-full text-center font-black text-xs text-indigo-950 bg-indigo-50/60 hover:bg-indigo-100/70 focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-lg py-1.5 px-2 outline-none transition uppercase tracking-wider border border-indigo-200/80 shadow-xs"
                                />
                              </div>

                              {isCustom ? (
                                <div
                                  title="Código de entalle puesto por el área UDP"
                                  className="w-full py-1 px-1 rounded-md bg-emerald-50 border border-emerald-300 text-[9.5px] font-black text-emerald-800 flex items-center justify-center gap-1 shadow-2xs text-center"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span className="leading-tight">Código de entalle puesto x el área UDP</span>
                                </div>
                              ) : (
                                <div
                                  title="Código de entalle puesto por defecto. Puedes editarlo para personalizarlo."
                                  className="w-full py-1 px-1 rounded-md bg-slate-100 border border-slate-300 text-[9.5px] font-bold text-slate-600 flex items-center justify-center gap-1 shadow-2xs text-center"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                                  <span className="leading-tight">Código de entalle puesto x defecto</span>
                                </div>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>

                    {/* Subheader: Corte / Cintura */}
                    <tr className="border-b-2 border-gray-300 bg-white">
                      <th className="sticky left-0 z-20 bg-slate-100 px-4 py-2.5 text-left font-black text-[11px] uppercase tracking-wider text-emerald-800 border-r-2 border-gray-300 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                        CORTE / PRETINA
                      </th>
                      {entalles.map((ent, idx) => (
                        <th key={idx} className="px-2 py-2 border-r border-gray-300">
                          <input
                            type="text"
                            value={ent.cinturaType}
                            onChange={e => handleCellChange(idx, 'cinturaType', e.target.value.toUpperCase())}
                            className="w-full text-center font-black text-[11px] text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/60 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded py-1 outline-none transition uppercase"
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 text-xs">
                    {/* Measurement Rows */}
                    {[
                      { key: 'cintura', label: 'CINTURA' },
                      { key: 'cadera', label: 'CADERA' },
                      { key: 'muslo', label: 'MUSLO' },
                      { key: 'rodilla', label: 'RODILLA' },
                      { key: 'botaPie', label: 'BOTAPIE' },
                      { key: 'tiroDel', label: 'T.DELT.' },
                      { key: 'tiroPos', label: 'T.ESPD.' },
                      { key: 'largoTotal', label: 'LARGO' },
                    ].map(row => (
                      <tr key={row.key} className="hover:bg-blue-50/30 transition">
                        <td className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-left font-black text-xs text-blue-900 border-r-2 border-gray-300 shadow-[2px_0_5px_rgba(0,0,0,0.05)] whitespace-nowrap">
                          {row.label}
                        </td>
                        {entalles.map((ent, idx) => (
                          <td key={idx} className="p-1.5 border-r border-gray-200">
                            <input
                              type="text"
                              value={(ent as any)[row.key] || ''}
                              onChange={e => handleCellChange(idx, row.key as keyof OfficialEntalle, e.target.value)}
                              className="w-full text-center py-1.5 px-1 font-bold text-gray-900 hover:bg-gray-50 focus:bg-blue-50/60 focus:ring-1 focus:ring-blue-500 rounded outline-none transition text-xs"
                              placeholder='-'
                            />
                          </td>
                        ))}
                      </tr>
                    ))}

                    {/* Bottom Attributes: TELA & TIPO / FIT */}
                    <tr className="border-t-2 border-gray-300 bg-amber-50/20">
                      <td className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-left font-black text-xs text-orange-950 border-r-2 border-gray-300 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                        TELA
                      </td>
                      {entalles.map((ent, idx) => (
                        <td key={idx} className="p-1.5 border-r border-gray-200">
                          <input
                            type="text"
                            value={ent.tela || ''}
                            onChange={e => handleCellChange(idx, 'tela', e.target.value.toUpperCase())}
                            className="w-full text-center py-1.5 px-1 font-bold text-amber-900 hover:bg-amber-50 focus:bg-white focus:ring-1 focus:ring-amber-500 rounded outline-none transition text-xs uppercase"
                            placeholder="DENIM / DRILL"
                          />
                        </td>
                      ))}
                    </tr>

                    <tr className="bg-amber-50/30">
                      <td className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-left font-black text-xs text-orange-950 border-r-2 border-gray-300 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                        TIPO / ELASTICIDAD
                      </td>
                      {entalles.map((ent, idx) => (
                        <td key={idx} className="p-1.5 border-r border-gray-200">
                          <input
                            type="text"
                            value={ent.tipoTela || ''}
                            onChange={e => handleCellChange(idx, 'tipoTela', e.target.value.toUpperCase())}
                            className="w-full text-center py-1.5 px-1 font-bold text-amber-900 hover:bg-amber-50 focus:bg-white focus:ring-1 focus:ring-amber-500 rounded outline-none transition text-xs uppercase"
                            placeholder="RIGIDO / CONFORT"
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <b>Total de modelos configurados:</b> {entalles.length} entalles oficiales. Cada celda es editable directamente.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-md transition active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4 inline-block mr-1.5" />
                {isSaving ? 'Guardando...' : 'Guardar Ficha de Entalles'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
