'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Building2, 
  Save, 
  FileSpreadsheet, 
  FileText, 
  Plus, 
  Trash2, 
  Search, 
  RotateCcw,
  Sparkles,
  Tag,
  DollarSign,
  FileEdit,
  Store,
  Layers,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface CompetitionMeasurement {
  id?: string;
  competitor: string; // Empresa / Tienda / Marca (e.g. ZARA, H&M, PIONIER, TOPITOP)
  name: string;       // Nombre del modelo / prenda
  code?: string;      // Código o referencia (e.g. CMP-001)
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
  notes?: string;
  priceRef?: string;
}

export const INITIAL_DEFAULT_COMPETITION: CompetitionMeasurement[] = [
  {
    competitor: 'ZARA',
    name: 'SLIM FIT DENIM',
    code: 'CMP-001',
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
    notes: 'Prenda referencial Zara Mall del Sur, 98% algodón 2% elastano',
    priceRef: '149.00',
  },
  {
    competitor: 'H&M',
    name: 'REGULAR JEANS',
    code: 'CMP-002',
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
    notes: 'Denim rígido 100% algodón',
    priceRef: '119.00',
  },
  {
    competitor: 'PIONIER',
    name: 'ROLEX CONFORT',
    code: 'CMP-003',
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
    tipoTela: 'CONFORT',
    baseSize: '32',
    notes: 'Tiro medio clásico, pretina anatómica',
    priceRef: '139.00',
  },
  {
    competitor: 'TOPITOP',
    name: 'BASIC STRAIGHT',
    code: 'CMP-004',
    isCustomCode: false,
    cinturaType: 'CINTURA STRAIGHT',
    cintura: '16 3/4 "',
    cadera: '20 1/2 "',
    muslo: '12 3/8 "',
    rodilla: '9 1/4 "',
    botaPie: '7 1/2 "',
    tiroDel: '11 1/2"',
    tiroPos: '15 1/4 "',
    largoTotal: '31 "',
    tela: 'DENIM',
    tipoTela: 'CONFORT',
    baseSize: '32',
    notes: 'Prenda clásica comercial',
    priceRef: '99.00',
  },
];

const PRESET_COMPETITORS = ['ZARA', 'H&M', 'PIONIER', 'TOPITOP', "LEVI'S", 'RIPLEY', 'SAGA FALABELLA', 'MANGO', 'GAP', 'PULL&BEAR'];
const PRESET_WAIST_TYPES = ['CINTURA SLIM', 'CINTURA STRAIGHT', 'CINTURA SKINNY', 'CINTURA RECTO', 'REGULAR FIT', 'RELAXED FIT', 'OVERSIZED', 'CARGO'];

interface CompetitionMeasurementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (items: CompetitionMeasurement[]) => void;
}

export function CompetitionMeasurementsModal({
  isOpen,
  onClose,
  onSaved
}: CompetitionMeasurementsModalProps) {
  const [items, setItems] = useState<CompetitionMeasurement[]>(INITIAL_DEFAULT_COMPETITION);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Search and Filter
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCompetitorFilter, setSelectedCompetitorFilter] = useState('TODOS');

  // New item form visibility & state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCinturaType, setNewCinturaType] = useState('CINTURA SLIM');
  const [newTela, setNewTela] = useState('DENIM');
  const [newTipoTela, setNewTipoTela] = useState('CONFORT');
  const [newBaseSize, setNewBaseSize] = useState('32');
  const [newPriceRef, setNewPriceRef] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Default measurements for new item
  const [newCintura, setNewCintura] = useState('16 3/4 "');
  const [newCadera, setNewCadera] = useState('20 1/4 "');
  const [newMuslo, setNewMuslo] = useState('12 1/4 "');
  const [newRodilla, setNewRodilla] = useState('8 1/2 "');
  const [newBotaPie, setNewBotaPie] = useState('7 1/4"');
  const [newTiroDel, setNewTiroDel] = useState('11 "');
  const [newTiroPos, setNewTiroPos] = useState('15 "');
  const [newLargoTotal, setNewLargoTotal] = useState('31 "');

  // Load from backend on modal open
  useEffect(() => {
    if (isOpen) {
      loadMeasurements();
    }
  }, [isOpen]);

  const loadMeasurements = async () => {
    setIsLoading(true);
    try {
      const resp = await api.get('/products-measurements/competition-measurements');
      if (Array.isArray(resp.data) && resp.data.length > 0) {
        setItems(resp.data.map((item: any, idx: number) => ({
          ...item,
          competitor: item.competitor || 'COMPETENCIA',
          code: item.code || `CMP-${String(idx + 1).padStart(3, '0')}`,
          isCustomCode: item.isCustomCode === true,
        })));
      } else {
        setItems(INITIAL_DEFAULT_COMPETITION);
      }
    } catch (err) {
      console.warn('Error loading competition measurements:', err);
      setItems(INITIAL_DEFAULT_COMPETITION);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellChange = (index: number, field: keyof CompetitionMeasurement, value: string) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value
      };
      return copy;
    });
  };

  const handleCodeChange = (index: number, newCodeValue: string) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        code: newCodeValue.toUpperCase(),
        isCustomCode: true,
      };
      return copy;
    });
  };

  const handleAddNewItem = () => {
    const comp = newCompetitor.trim().toUpperCase();
    const name = newModelName.trim().toUpperCase();

    if (!comp) {
      toast.error('Ingresa o selecciona la empresa / tienda / marca de la competencia');
      return;
    }
    if (!name) {
      toast.error('Ingresa el nombre del modelo de la competencia');
      return;
    }

    const defaultCode = `CMP-${String(items.length + 1).padStart(3, '0')}`;
    const customCodeProvided = newCode.trim().toUpperCase();
    const finalCode = customCodeProvided || defaultCode;
    const isCustom = !!customCodeProvided;

    const newItem: CompetitionMeasurement = {
      competitor: comp,
      name,
      code: finalCode,
      isCustomCode: isCustom,
      cinturaType: newCinturaType,
      cintura: newCintura,
      cadera: newCadera,
      muslo: newMuslo,
      rodilla: newRodilla,
      botaPie: newBotaPie,
      tiroDel: newTiroDel,
      tiroPos: newTiroPos,
      largoTotal: newLargoTotal,
      tela: newTela.toUpperCase(),
      tipoTela: newTipoTela.toUpperCase(),
      baseSize: newBaseSize,
      notes: newNotes,
      priceRef: newPriceRef,
    };

    setItems(prev => [...prev, newItem]);
    // Reset form
    setNewCompetitor('');
    setNewModelName('');
    setNewCode('');
    setNewPriceRef('');
    setNewNotes('');
    setShowAddForm(false);
    toast.success(`Prenda "${name}" de ${comp} agregada a la matriz.`);
  };

  const handleDeleteItem = (index: number) => {
    const target = items[index];
    if (!target) return;
    if (confirm(`¿Deseas eliminar las medidas de "${target.name}" (${target.competitor})?`)) {
      setItems(prev => prev.filter((_, i) => i !== index));
      if (target.id || target.name) {
        const idToDelete = target.id || target.name;
        api.delete(`/products-measurements/competition-measurements/${encodeURIComponent(idToDelete)}`).catch(() => {});
      }
      toast.success(`Modelo "${target.name}" eliminado`);
    }
  };

  const handleRestoreDefaults = () => {
    if (confirm('¿Deseas restaurar la lista de prendas de competencia predeterminadas?')) {
      setItems(INITIAL_DEFAULT_COMPETITION);
      toast.success('Prendas de competencia restauradas');
    }
  };

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error('No hay medidas de la competencia para guardar');
      return;
    }

    setIsSaving(true);
    try {
      await api.post('/products-measurements/competition-measurements', items);
      toast.success('¡Medidas de la competencia guardadas correctamente!');
      if (onSaved) onSaved(items);
    } catch (err: any) {
      console.error('Error saving competition measurements:', err);
      toast.error(err.response?.data?.message || 'Error al guardar medidas de la competencia');
    } finally {
      setIsSaving(false);
    }
  };

  // ── EXPORT TO EXCEL ──
  const handleExportExcel = () => {
    try {
      const aoa: any[][] = [];

      aoa.push(['BENCHMARKING DE MEDIDAS - COMPETENCIA Y MERCADO (TALLA BASE 32)']);
      aoa.push([`Generado por el Área UDP - Sistema American Colt | Fecha: ${new Date().toLocaleDateString('es-PE')}`]);
      aoa.push([]);

      // Row 4: Competitor
      aoa.push(['TIENDA / EMPRESA', ...items.map(e => e.competitor)]);

      // Row 5: Model
      aoa.push(['MODELO', ...items.map(e => e.name)]);

      // Row 6: Code
      aoa.push(['CÓDIGO REFERENCIAL', ...items.map((e, idx) => e.code || `CMP-${String(idx + 1).padStart(3, '0')}`)]);

      // Row 7: Cintura Type
      aoa.push(['CORTE / PRETINA', ...items.map(e => e.cinturaType)]);

      // Measurements
      aoa.push(['CINTURA', ...items.map(e => e.cintura)]);
      aoa.push(['CADERA', ...items.map(e => e.cadera)]);
      aoa.push(['MUSLO', ...items.map(e => e.muslo)]);
      aoa.push(['RODILLA', ...items.map(e => e.rodilla)]);
      aoa.push(['BOTAPIE', ...items.map(e => e.botaPie)]);
      aoa.push(['T.DELT.', ...items.map(e => e.tiroDel)]);
      aoa.push(['T.ESPD.', ...items.map(e => e.tiroPos)]);
      aoa.push(['LARGO', ...items.map(e => e.largoTotal)]);
      aoa.push(['TELA', ...items.map(e => e.tela)]);
      aoa.push(['TIPO / FIT', ...items.map(e => e.tipoTela)]);
      aoa.push(['PRECIO REF. TIENDA', ...items.map(e => e.priceRef ? `S/ ${e.priceRef}` : '-')]);
      aoa.push(['NOTAS / DETALLES', ...items.map(e => e.notes || '-')]);

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const colWidths = [{ wch: 24 }, ...items.map(() => ({ wch: 22 }))];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'COMPETENCIA');
      XLSX.writeFile(wb, `MEDIDAS_COMPETENCIA_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast.success('Ficha de medidas de la competencia exportada a Excel');
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

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 27, 75);
      doc.text('MEDIDAS DE LA COMPETENCIA - BENCHMARKING DE MERCADO', 14, 15);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('COMPARATIVA TÉCNICA DE MODELOS Y SILUETAS DE OTRAS MARCAS / TIENDAS', 14, 21);

      doc.setFontSize(8);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`, 280, 15, { align: 'right' });

      const head = [
        ['MEDIDA / DATO', ...items.map(e => `${e.competitor}\n${e.name}`)],
        ['CÓDIGO REF.', ...items.map((e, idx) => e.code || `CMP-${String(idx + 1).padStart(3, '0')}`)],
        ['CORTE / PRETINA', ...items.map(e => e.cinturaType)]
      ];

      const body = [
        ['CINTURA', ...items.map(e => e.cintura)],
        ['CADERA', ...items.map(e => e.cadera)],
        ['MUSLO', ...items.map(e => e.muslo)],
        ['RODILLA', ...items.map(e => e.rodilla)],
        ['BOTAPIE', ...items.map(e => e.botaPie)],
        ['T.DELT.', ...items.map(e => e.tiroDel)],
        ['T.ESPD.', ...items.map(e => e.tiroPos)],
        ['LARGO', ...items.map(e => e.largoTotal)],
        ['TELA', ...items.map(e => e.tela)],
        ['TIPO / FIT', ...items.map(e => e.tipoTela)],
        ['PRECIO REF.', ...items.map(e => e.priceRef ? `S/ ${e.priceRef}` : '-')],
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
          fillColor: [79, 70, 229], // Indigo 600
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: {
            halign: 'left',
            fontStyle: 'bold',
            fillColor: [243, 244, 246],
            textColor: [67, 56, 202]
          }
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        }
      });

      doc.save(`MEDIDAS_COMPETENCIA_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Ficha de medidas de la competencia exportada a PDF');
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      toast.error('Error al exportar a PDF');
    }
  };

  // Distinct competitors list for filter
  const distinctCompetitors = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.competitor) set.add(i.competitor.toUpperCase());
    });
    return Array.from(set);
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchComp = selectedCompetitorFilter === 'TODOS' || item.competitor.toUpperCase() === selectedCompetitorFilter;
      const q = searchFilter.trim().toLowerCase();
      if (!q) return matchComp;
      const matchSearch =
        item.competitor.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        item.cinturaType.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q));
      return matchComp && matchSearch;
    });
  }, [items, selectedCompetitorFilter, searchFilter]);

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
          <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-violet-50/70 via-white to-indigo-50/50">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    MEDIDAS DE LA COMPETENCIA
                  </h2>
                  <span className="px-3 py-1 bg-violet-100 text-violet-800 rounded-full font-black text-[10px] uppercase tracking-wider">
                    Benchmarking & Siluetas
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Registro y comparativa de modelos, tiendas (Zara, H&M, Pionier, etc.) y medidas para el área UDP.
                </p>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto justify-end">
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                title="Restaurar ejemplos de competencia"
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
                <Save className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Guardar Medidas'}
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

          {/* Subheader Filters & Add Action */}
          <div className="px-6 py-4 bg-gray-50/70 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Buscar por tienda, modelo o código..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Filter by Competitor */}
              <div className="w-full sm:w-auto">
                <select
                  value={selectedCompetitorFilter}
                  onChange={e => setSelectedCompetitorFilter(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                >
                  <option value="TODOS">🏢 Todas las Tiendas / Marcas ({items.length})</option>
                  {distinctCompetitors.map((c, i) => (
                    <option key={i} value={c}>🏪 {c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Button to toggle add new */}
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="w-full md:w-auto px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition active:scale-95"
            >
              <Plus className="w-4 h-4" /> {showAddForm ? 'Cerrar Formulario' : 'Agregar Prenda de Competencia'}
            </button>
          </div>

          {/* Collapsible Add Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden bg-gradient-to-b from-indigo-50/50 to-white border-b border-indigo-100 p-6"
              >
                <div className="max-w-6xl mx-auto space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                      <Store className="w-4 h-4 text-indigo-600" /> Nueva Ficha de Medida de la Competencia
                    </h3>
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                      Talla Base 32
                    </span>
                  </div>

                  {/* Garment Identification */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                        Tienda / Empresa / Marca *
                      </label>
                      <input
                        type="text"
                        list="presetCompetitors"
                        placeholder="Ej: ZARA, H&M, PIONIER..."
                        value={newCompetitor}
                        onChange={e => setNewCompetitor(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <datalist id="presetCompetitors">
                        {PRESET_COMPETITORS.map((c, i) => (
                          <option key={i} value={c} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                        Nombre del Modelo *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: SLIM FIT DENIM"
                        value={newModelName}
                        onChange={e => setNewModelName(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                        Código / Ref. Competencia
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: CMP-005 o ref. tienda"
                        value={newCode}
                        onChange={e => setNewCode(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                        Corte / Pretina
                      </label>
                      <select
                        value={newCinturaType}
                        onChange={e => setNewCinturaType(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {PRESET_WAIST_TYPES.map((t, i) => (
                          <option key={i} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Fabrics & Extra Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                        Tela
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: DENIM, DRILL"
                        value={newTela}
                        onChange={e => setNewTela(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                        Tipo Tela / Elasticidad
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: CONFORT, RIGIDO, STRETCH"
                        value={newTipoTela}
                        onChange={e => setNewTipoTela(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                        Precio Ref. Tienda (S/)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: 149.00"
                        value={newPriceRef}
                        onChange={e => setNewPriceRef(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                        Notas / Observaciones
                      </label>
                      <input
                        type="text"
                        placeholder="Detalles de lavado, costura, etc."
                        value={newNotes}
                        onChange={e => setNewNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* 8 Garment Measurements */}
                  <div>
                    <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest block mb-2">
                      Medidas Oficiales de la Prenda (Pulgadas o Cm)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm">
                      <div>
                        <span className="text-[9px] font-black text-gray-400 block uppercase">Cintura</span>
                        <input
                          type="text"
                          value={newCintura}
                          onChange={e => setNewCintura(e.target.value)}
                          className="w-full p-1.5 text-xs font-bold text-center bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-gray-400 block uppercase">Cadera</span>
                        <input
                          type="text"
                          value={newCadera}
                          onChange={e => setNewCadera(e.target.value)}
                          className="w-full p-1.5 text-xs font-bold text-center bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-gray-400 block uppercase">Muslo</span>
                        <input
                          type="text"
                          value={newMuslo}
                          onChange={e => setNewMuslo(e.target.value)}
                          className="w-full p-1.5 text-xs font-bold text-center bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-gray-400 block uppercase">Rodilla</span>
                        <input
                          type="text"
                          value={newRodilla}
                          onChange={e => setNewRodilla(e.target.value)}
                          className="w-full p-1.5 text-xs font-bold text-center bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-gray-400 block uppercase">Botapie</span>
                        <input
                          type="text"
                          value={newBotaPie}
                          onChange={e => setNewBotaPie(e.target.value)}
                          className="w-full p-1.5 text-xs font-bold text-center bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-gray-400 block uppercase">T. Delt.</span>
                        <input
                          type="text"
                          value={newTiroDel}
                          onChange={e => setNewTiroDel(e.target.value)}
                          className="w-full p-1.5 text-xs font-bold text-center bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-gray-400 block uppercase">T. Espd.</span>
                        <input
                          type="text"
                          value={newTiroPos}
                          onChange={e => setNewTiroPos(e.target.value)}
                          className="w-full p-1.5 text-xs font-bold text-center bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-gray-400 block uppercase">Largo</span>
                        <input
                          type="text"
                          value={newLargoTotal}
                          onChange={e => setNewLargoTotal(e.target.value)}
                          className="w-full p-1.5 text-xs font-bold text-center bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddNewItem}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase shadow-md shadow-indigo-200 flex items-center gap-1.5 active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> Agregar a la Matriz
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Matrix Table Area */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50/60">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100">
                <Building2 className="w-16 h-16 text-gray-200 mb-3" />
                <h4 className="text-base font-black text-gray-700 uppercase">No hay prendas registradas para el filtro seleccionado</h4>
                <p className="text-xs text-gray-400 mt-1">Haz clic en &quot;Agregar Prenda de Competencia&quot; o cambia los términos de búsqueda.</p>
              </div>
            ) : (
              <div className="inline-block min-w-full align-middle">
                <div className="border border-indigo-100 rounded-3xl overflow-hidden shadow-lg bg-white">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead>
                      {/* Row 1: Competitor / Store Brand */}
                      <tr className="bg-gradient-to-r from-violet-600 to-indigo-700 text-white font-black">
                        <th className="sticky left-0 z-20 bg-indigo-900 text-white p-3.5 text-left uppercase tracking-wider text-[11px] font-black w-44 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                          TIENDA / EMPRESA
                        </th>
                        {filteredItems.map((item, i) => {
                          const origIndex = items.indexOf(item);
                          return (
                            <th key={i} className="p-2.5 text-center min-w-[200px] border-l border-indigo-500/40">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-xs font-black tracking-wider uppercase">
                                  {item.competitor}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(origIndex)}
                                  className="text-white/60 hover:text-white hover:bg-rose-500/60 p-1 rounded-md transition"
                                  title="Eliminar prenda"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </th>
                          );
                        })}
                      </tr>

                      {/* Row 2: Model Name */}
                      <tr className="bg-indigo-50/80 text-indigo-950 font-black">
                        <th className="sticky left-0 z-20 bg-indigo-100 text-indigo-900 p-3 text-left uppercase tracking-wider text-[10px] font-black shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                          MODELO
                        </th>
                        {filteredItems.map((item, i) => {
                          const origIndex = items.indexOf(item);
                          return (
                            <th key={i} className="p-2 text-center min-w-[200px] border-l border-indigo-100">
                              <input
                                type="text"
                                value={item.name}
                                onChange={e => handleCellChange(origIndex, 'name', e.target.value.toUpperCase())}
                                className="w-full text-center font-black text-xs text-indigo-900 bg-white/80 hover:bg-white focus:bg-white border border-transparent focus:border-indigo-400 rounded-lg p-1 uppercase outline-none"
                              />
                            </th>
                          );
                        })}
                      </tr>

                      {/* Row 3: Code */}
                      <tr className="bg-white text-gray-700">
                        <th className="sticky left-0 z-20 bg-slate-100 text-gray-700 p-2.5 text-left uppercase tracking-wider text-[10px] font-black shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                          CÓDIGO COMPETENCIA
                        </th>
                        {filteredItems.map((item, i) => {
                          const origIndex = items.indexOf(item);
                          return (
                            <th key={i} className="p-1.5 text-center min-w-[200px] border-l border-gray-100">
                              <div className="flex flex-col items-center">
                                <input
                                  type="text"
                                  value={item.code || `CMP-${String(origIndex + 1).padStart(3, '0')}`}
                                  onChange={e => handleCodeChange(origIndex, e.target.value)}
                                  className="w-full text-center font-extrabold text-[11px] text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-200/50 rounded-md py-0.5 outline-none uppercase"
                                />
                                <span className={`text-[9px] font-bold mt-0.5 ${item.isCustomCode ? 'text-indigo-600' : 'text-gray-400'}`}>
                                  {item.isCustomCode ? '• Editado por UDP' : '• Código por defecto'}
                                </span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>

                      {/* Row 4: Fit / Waist Type */}
                      <tr className="bg-slate-50 text-indigo-900">
                        <th className="sticky left-0 z-20 bg-slate-100 text-indigo-900 p-2.5 text-left uppercase tracking-wider text-[10px] font-black shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                          CORTE / PRETINA
                        </th>
                        {filteredItems.map((item, i) => {
                          const origIndex = items.indexOf(item);
                          return (
                            <th key={i} className="p-1.5 text-center min-w-[200px] border-l border-gray-100">
                              <select
                                value={item.cinturaType}
                                onChange={e => handleCellChange(origIndex, 'cinturaType', e.target.value)}
                                className="w-full text-center font-bold text-[11px] bg-white border border-gray-200 rounded-lg p-1 outline-none text-gray-700 cursor-pointer"
                              >
                                {PRESET_WAIST_TYPES.map((t, idx) => (
                                  <option key={idx} value={t}>{t}</option>
                                ))}
                              </select>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 bg-white">
                      {/* Measurements Rows */}
                      {[
                        { label: 'CINTURA', field: 'cintura' as const },
                        { label: 'CADERA', field: 'cadera' as const },
                        { label: 'MUSLO', field: 'muslo' as const },
                        { label: 'RODILLA', field: 'rodilla' as const },
                        { label: 'BOTAPIE', field: 'botaPie' as const },
                        { label: 'T.DELT.', field: 'tiroDel' as const },
                        { label: 'T.ESPD.', field: 'tiroPos' as const },
                        { label: 'LARGO', field: 'largoTotal' as const },
                      ].map(({ label, field }, rowIdx) => (
                        <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                          <td className="sticky left-0 z-10 bg-slate-100 text-gray-800 font-black p-2.5 text-[11px] uppercase tracking-wider shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                            {label}
                          </td>
                          {filteredItems.map((item, colIdx) => {
                            const origIndex = items.indexOf(item);
                            return (
                              <td key={colIdx} className="p-1.5 text-center border-l border-gray-100">
                                <input
                                  type="text"
                                  value={item[field] || ''}
                                  onChange={e => handleCellChange(origIndex, field, e.target.value)}
                                  className="w-full text-center font-extrabold text-xs text-gray-800 bg-transparent hover:bg-indigo-50/50 focus:bg-indigo-50 border border-transparent focus:border-indigo-400 rounded-md p-1 outline-none transition"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {/* Fabric and Fit */}
                      <tr className="bg-slate-50/80">
                        <td className="sticky left-0 z-10 bg-slate-100 text-gray-800 font-black p-2.5 text-[11px] uppercase tracking-wider shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                          TELA
                        </td>
                        {filteredItems.map((item, colIdx) => {
                          const origIndex = items.indexOf(item);
                          return (
                            <td key={colIdx} className="p-1.5 text-center border-l border-gray-100">
                              <input
                                type="text"
                                value={item.tela || ''}
                                onChange={e => handleCellChange(origIndex, 'tela', e.target.value.toUpperCase())}
                                className="w-full text-center font-bold text-[11px] text-gray-700 bg-white border border-gray-200 rounded-md p-1 outline-none uppercase"
                              />
                            </td>
                          );
                        })}
                      </tr>

                      <tr className="bg-white">
                        <td className="sticky left-0 z-10 bg-slate-100 text-gray-800 font-black p-2.5 text-[11px] uppercase tracking-wider shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                          TIPO / FIT
                        </td>
                        {filteredItems.map((item, colIdx) => {
                          const origIndex = items.indexOf(item);
                          return (
                            <td key={colIdx} className="p-1.5 text-center border-l border-gray-100">
                              <input
                                type="text"
                                value={item.tipoTela || ''}
                                onChange={e => handleCellChange(origIndex, 'tipoTela', e.target.value.toUpperCase())}
                                className="w-full text-center font-bold text-[11px] text-gray-700 bg-white border border-gray-200 rounded-md p-1 outline-none uppercase"
                              />
                            </td>
                          );
                        })}
                      </tr>

                      <tr className="bg-slate-50/80">
                        <td className="sticky left-0 z-10 bg-slate-100 text-gray-800 font-black p-2.5 text-[11px] uppercase tracking-wider shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                          PRECIO REF. TIENDA
                        </td>
                        {filteredItems.map((item, colIdx) => {
                          const origIndex = items.indexOf(item);
                          return (
                            <td key={colIdx} className="p-1.5 text-center border-l border-gray-100">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-[10px] font-bold text-gray-400">S/</span>
                                <input
                                  type="text"
                                  placeholder="0.00"
                                  value={item.priceRef || ''}
                                  onChange={e => handleCellChange(origIndex, 'priceRef', e.target.value)}
                                  className="w-24 text-center font-bold text-[11px] text-emerald-700 bg-white border border-gray-200 rounded-md p-1 outline-none"
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      <tr className="bg-white">
                        <td className="sticky left-0 z-10 bg-slate-100 text-gray-800 font-black p-2.5 text-[11px] uppercase tracking-wider shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                          OBSERVACIONES
                        </td>
                        {filteredItems.map((item, colIdx) => {
                          const origIndex = items.indexOf(item);
                          return (
                            <td key={colIdx} className="p-1.5 text-center border-l border-gray-100">
                              <input
                                type="text"
                                placeholder="Notas o detalles..."
                                value={item.notes || ''}
                                onChange={e => handleCellChange(origIndex, 'notes', e.target.value)}
                                className="w-full text-center font-medium text-[11px] text-gray-600 bg-slate-50 border border-transparent hover:border-gray-200 rounded-md p-1 outline-none"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>
                <b>{filteredItems.length}</b> prendas de la competencia en visualización ({distinctCompetitors.length} tiendas/marcas)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-gray-400">Los cambios se guardan localmente y en el servidor al presionar &quot;Guardar Medidas&quot;.</span>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-200 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Guardar Todo'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

