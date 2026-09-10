'use client';

import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../../components/common/Layout';
import api from '../../../lib/axios';
import { 
  Ruler, 
  Search, 
  Save, 
  Plus, 
  Trash2, 
  Tag, 
  Info, 
  Beaker, 
  Layers, 
  Trophy, 
  Package, 
  CheckCircle2, 
  Loader2,
  Building2,
  Calendar
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { getImageUrl } from '../../../lib/imageUrl';

interface ColumnType {
  id: string; // unique, e.g. "OP-02|Camello"
  op: string; // e.g. "OP-02"
  color: string; // e.g. "Camello"
}

const MEASUREMENT_KEYS = [
  { key: 'cintura', label: 'CINTURA' },
  { key: 'cadera', label: 'CADERA' },
  { key: 'muslo', label: 'MUSLO' },
  { key: 'rodilla', label: 'RODILLA' },
  { key: 'botaPie', label: 'BOTA PIE' },
  { key: 'tiroDel', label: 'TIRO DEL.' },
  { key: 'tiroPos', label: 'TIRO POS.' },
  { key: 'largoTotal', label: 'LARGO TOTAL' },
];

const STAGES = [
  { id: 'OFICIAL', label: 'Medidas Oficiales (Ficha UDP)', color: 'indigo' },
  { id: 'ANTES_LAVAR', label: 'Antes de Lavar (Crudo)', color: 'amber' },
  { id: 'DESPUES_LAVAR', label: 'Después de Lavar (Acabado)', color: 'emerald' },
];

function parseInches(text: string): number | null {
  const clean = text.replace(/"/g, '').trim();
  if (!clean) return null;

  const fractionParts = clean.split(/[\s-]+/);
  if (fractionParts.length === 2) {
    const whole = parseFloat(fractionParts[0]);
    const fraction = fractionParts[1];
    const slashIndex = fraction.indexOf('/');
    if (slashIndex > 0) {
      const num = parseFloat(fraction.substring(0, slashIndex));
      const den = parseFloat(fraction.substring(slashIndex + 1));
      if (!isNaN(whole) && !isNaN(num) && !isNaN(den) && den !== 0) {
        return whole + (num / den);
      }
    }
  }

  const slashIndex = clean.indexOf('/');
  if (slashIndex > 0 && fractionParts.length === 1) {
    const num = parseFloat(clean.substring(0, slashIndex));
    const den = parseFloat(clean.substring(slashIndex + 1));
    if (!isNaN(num) && !isNaN(den) && den !== 0) {
      return num / den;
    }
  }

  const num = parseFloat(clean);
  if (!isNaN(num)) {
    return num;
  }

  return null;
}

function parseCm(text: string): number | null {
  const clean = text.replace(/cm/gi, '').replace(/,/g, '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

function decToFractionInches(inches: number): string {
  const whole = Math.floor(inches);
  const remainder = inches - whole;
  
  const eighths = Math.round(remainder * 8);
  if (eighths === 0) return `${whole}"`;
  if (eighths === 8) return `${whole + 1}"`;
  
  let num = eighths;
  let den = 8;
  if (num % 4 === 0) {
    num /= 4;
    den /= 4;
  } else if (num % 2 === 0) {
    num /= 2;
    den /= 2;
  }
  return whole > 0 ? `${whole} ${num}/${den}"` : `${num}/${den}"`;
}

function formatSingleBotaPieValue(val: string): string {
  if (val.includes('"') || val.includes('/')) {
    const inches = parseInches(val);
    if (inches !== null) {
      const cm = inches * 2.54;
      const cleanInches = val.includes('"') ? val : `${val}"`;
      return `${cleanInches} (${parseFloat(cm.toFixed(1)).toString().replace('.', ',')} cm)`;
    }
  }

  const cm = parseCm(val);
  if (cm !== null) {
    const inches = cm / 2.54;
    const fraction = decToFractionInches(inches);
    const cleanCm = val.toLowerCase().includes('cm') ? val : `${val} cm`;
    return `${cleanCm} (${fraction})`;
  }

  return val;
}

function formatBotaPieCell(value: string): string {
  const cleanVal = value.trim();
  if (!cleanVal) return '';

  if (cleanVal.includes('(') && cleanVal.includes(')')) {
    const firstPart = cleanVal.split('(')[0].trim();
    return formatSingleBotaPieValue(firstPart);
  }

  return formatSingleBotaPieValue(cleanVal);
}

export default function MeasurementsPage() {
  const [activeTab, setActiveTab] = useState<'MUESTRAS' | 'COMPETENCIA' | 'TERMINADOS' | 'SEGUNDA' | 'TALLAS ESPECIALES'>('MUESTRAS');
  
  const [products, setProducts] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [selectedSize, setSelectedSize] = useState('32');
  const [customNewSize, setCustomNewSize] = useState('');
  const [activeStage, setActiveStage] = useState('OFICIAL');
  
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [customOp, setCustomOp] = useState('');
  const [customColor, setCustomColor] = useState('');
  
  const [registeredMeasurements, setRegisteredMeasurements] = useState<any[]>([]);
  const [searchRegisteredText, setSearchRegisteredText] = useState('');

  const [matrix, setMatrix] = useState<Record<string, Record<string, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Competitor form state
  const [compBrand, setCompBrand] = useState('');
  const [compGarment, setCompGarment] = useState('');
  const [compSize, setCompSize] = useState('32');
  const [compNotes, setCompNotes] = useState('');
  const [compForm, setCompForm] = useState<Record<string, string>>({
    cintura: '',
    cadera: '',
    muslo: '',
    rodilla: '',
    botaPie: '',
    tiroDel: '',
    tiroPos: '',
    largoTotal: ''
  });
  const [competitorList, setCompetitorList] = useState<any[]>([]);
  const [searchCompText, setSearchCompText] = useState('');

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    try {
      setSelectedItem(null);
      setSearchQuery('');
      setSearchRegisteredText('');
      
      if (activeTab === 'COMPETENCIA') {
        const resp = await api.get('/products-measurements', { params: { stage: 'COMPETENCIA' } });
        setCompetitorList(resp.data || []);
        return;
      }

      const [itemsResp, measurementsResp] = await Promise.all([
        activeTab === 'MUESTRAS' ? api.get('/samples') : api.get('/products'),
        api.get('/products-measurements')
      ]);

      if (activeTab === 'MUESTRAS') {
        setSamples(itemsResp.data || []);
      } else {
        const filtered = (itemsResp.data || []).filter((p: any) => p.inventoryType === activeTab);
        setProducts(filtered);
      }

      setRegisteredMeasurements(measurementsResp.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos');
    }
  };

  // Initialize columns and load measurements when selected item or size changes
  useEffect(() => {
    if (!selectedItem) return;
    
    const baseCols: ColumnType[] = [];
    
    if (activeStage === 'OFICIAL') {
      baseCols.push({
        id: 'OFFICIAL_COLUMN',
        op: '',
        color: ''
      });
    } else {
      if (activeTab === 'MUESTRAS') {
        if (selectedItem.productionColor) {
          baseCols.push({
            id: `${selectedItem.op || ''}|${selectedItem.productionColor}`,
            op: selectedItem.op || '',
            color: selectedItem.productionColor
          });
        }
      } else {
        const variants = selectedItem.variants || [];
        variants.forEach((v: any) => {
          const id = `${v.op || ''}|${v.color}`;
          if (!baseCols.some(c => c.id === id)) {
            baseCols.push({
              id,
              op: v.op || '',
              color: v.color
            });
          }
        });
      }
    }

    setColumns(baseCols);
    loadMeasurements();
  }, [selectedItem, selectedSize, activeStage]);

  const loadMeasurements = async () => {
    if (!selectedItem) return;
    setIsLoading(true);
    try {
      let stageMeasurements: any[] = [];
      if (activeTab === 'MUESTRAS') {
        const resp = await api.get('/products-measurements', { params: { sampleId: selectedItem.id, size: selectedSize } });
        stageMeasurements = (resp.data || []).filter((m: any) => m.stage === activeStage);
      } else {
        const ids = selectedItem.siblingIds || [selectedItem.id];
        const promises = ids.map((id: string) => api.get('/products-measurements', { params: { productId: id, size: selectedSize } }));
        const responses = await Promise.all(promises);
        stageMeasurements = responses.flatMap((resp: any) => resp.data || []).filter((m: any) => m.stage === activeStage);
      }

      const newMatrix: Record<string, Record<string, string>> = {};
      
      if (activeStage === 'OFICIAL') {
        let officialMeasure = stageMeasurements.find((m: any) => !m.color || m.color === '');
        if (!officialMeasure && stageMeasurements.length > 0) {
          officialMeasure = stageMeasurements[0];
        }
        newMatrix['OFFICIAL_COLUMN'] = {};
        MEASUREMENT_KEYS.forEach(({ key }) => {
          newMatrix['OFFICIAL_COLUMN'][key] = officialMeasure ? (officialMeasure[key] || '') : '';
        });
      } else {
        setColumns(prev => {
          const existingCols = stageMeasurements
            .filter((m: any) => m.color)
            .map((m: any) => ({
              id: `${m.op || ''}|${m.color}`,
              op: m.op || '',
              color: m.color
            }));
          
          const map = new Map<string, ColumnType>();
          prev.forEach(c => map.set(c.id, c));
          existingCols.forEach(c => map.set(c.id, c));
          
          return Array.from(map.values());
        });

        stageMeasurements.forEach((m: any) => {
          if (!m.color) return;
          const colId = `${m.op || ''}|${m.color}`;
          if (!newMatrix[colId]) newMatrix[colId] = {};
          
          MEASUREMENT_KEYS.forEach(({ key }) => {
            newMatrix[colId][key] = m[key] || '';
          });
        });
      }
      
      setMatrix(newMatrix);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar medidas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellChange = (columnId: string, key: string, value: string) => {
    setMatrix(prev => ({
      ...prev,
      [columnId]: {
        ...(prev[columnId] || {}),
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      const promises: Promise<any>[] = [];

      if (activeStage === 'OFICIAL') {
        const measurements = matrix['OFFICIAL_COLUMN'] || {};
        const payload: any = {
          size: selectedSize,
          stage: 'OFICIAL',
          cintura: measurements.cintura || null,
          cadera: measurements.cadera || null,
          muslo: measurements.muslo || null,
          rodilla: measurements.rodilla || null,
          botaPie: measurements.botaPie || null,
          tiroDel: measurements.tiroDel || null,
          tiroPos: measurements.tiroPos || null,
          largoTotal: measurements.largoTotal || null,
        };

        if (activeTab === 'MUESTRAS') {
          payload.sampleId = selectedItem.id;
          payload.op = selectedItem.op || null;
        } else {
          payload.productId = selectedItem.id;
          payload.op = selectedItem.op || null;
        }

        promises.push(api.post('/products-measurements', payload));
      } else {
        columns.forEach(col => {
          const measurements = matrix[col.id] || {};
          const payload: any = {
            size: selectedSize,
            color: col.color,
            op: col.op,
            stage: activeStage,
            cintura: measurements.cintura || null,
            cadera: measurements.cadera || null,
            muslo: measurements.muslo || null,
            rodilla: measurements.rodilla || null,
            botaPie: measurements.botaPie || null,
            tiroDel: measurements.tiroDel || null,
            tiroPos: measurements.tiroPos || null,
            largoTotal: measurements.largoTotal || null,
          };

          if (activeTab === 'MUESTRAS') {
            payload.sampleId = selectedItem.id;
          } else {
            payload.productId = selectedItem.id;
          }

          promises.push(api.post('/products-measurements', payload));
        });
      }

      await Promise.all(promises);
      toast.success('Medidas guardadas correctamente');
      fetchItems();
      loadMeasurements();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar medidas');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compBrand.trim() || !compGarment.trim() || !compSize.trim()) {
      toast.error('Completa la marca, prenda y talla');
      return;
    }

    setIsSaving(true);
    try {
      await api.post('/products-measurements', {
        stage: 'COMPETENCIA',
        color: compBrand.trim().toUpperCase(),
        op: compGarment.trim(),
        size: compSize.trim().toUpperCase(),
        cintura: compForm.cintura || null,
        cadera: compForm.cadera || null,
        muslo: compForm.muslo || null,
        rodilla: compForm.rodilla || null,
        botaPie: compForm.botaPie || null,
        tiroDel: compForm.tiroDel || null,
        tiroPos: compForm.tiroPos || null,
        largoTotal: compForm.largoTotal || null,
      });

      toast.success('Medida de competencia registrada');
      setCompForm({
        cintura: '',
        cadera: '',
        muslo: '',
        rodilla: '',
        botaPie: '',
        tiroDel: '',
        tiroPos: '',
        largoTotal: ''
      });
      fetchItems();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar medida de competencia');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    if (!confirm('¿Eliminar este registro de medidas?')) return;
    try {
      await api.delete(`/products-measurements/${id}`);
      toast.success('Registro eliminado');
      fetchItems();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar');
    }
  };

  const addColumn = () => {
    if (!customColor.trim()) {
      toast.error('Por favor ingresa un color');
      return;
    }
    const id = `${customOp.trim()}|${customColor.trim()}`;
    if (columns.some(c => c.id === id)) {
      toast.error('Esta variante ya está en la tabla');
      return;
    }
    setColumns([...columns, { id, op: customOp.trim(), color: customColor.trim() }]);
    setCustomOp('');
    setCustomColor('');
  };

  const removeColumn = (colId: string) => {
    setColumns(columns.filter(c => c.id !== colId));
  };

  // Group items suggestions for search
  const currentItemsList = activeTab === 'MUESTRAS' ? samples : products;
  const filteredSuggestions = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return [];
    return currentItemsList.filter(item => 
      (item.name || '').toLowerCase().includes(term) ||
      (item.code || '').toLowerCase().includes(term) ||
      (item.sku || '').toLowerCase().includes(term)
    ).slice(0, 10);
  }, [currentItemsList, searchQuery]);

  // Sizes for sample/product
  const standardSizes = ['26', '28', '30', '32', '34', '36', '38', '40', '42', 'S', 'M', 'L', 'XL', 'XXL'];

  // All sizes that already have measurements for the selected item
  const existingSampleSizes = useMemo(() => {
    if (!selectedItem) return [];
    const itemMeasurements = registeredMeasurements.filter((m: any) => 
      (activeTab === 'MUESTRAS' && m.sampleId === selectedItem.id) ||
      (activeTab !== 'MUESTRAS' && (m.productId === selectedItem.id || selectedItem.siblingIds?.includes(m.productId)))
    );
    return Array.from(new Set(itemMeasurements.map((m: any) => m.size)));
  }, [selectedItem, registeredMeasurements, activeTab]);

  return (
    <Layout>
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto space-y-8 pb-20">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-200 flex items-center justify-center text-white">
              <Ruler className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight uppercase">
                Control de Medidas
              </h1>
              <p className="text-gray-500 font-medium text-sm md:text-base mt-0.5">
                Ficha técnica de medidas para prototipos UDP, producción y benchmarking de la competencia.
              </p>
            </div>
          </div>
        </div>

        {/* MAIN CATEGORY TABS */}
        <div className="bg-white rounded-3xl p-2 border border-gray-100 shadow-sm flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('MUESTRAS')}
            className={`flex-1 min-w-[180px] py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'MUESTRAS'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-102'
                : 'bg-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Beaker className="w-4 h-4" /> 🔬 Muestras UDP (Nuevas y Existentes)
          </button>

          <button
            onClick={() => setActiveTab('COMPETENCIA')}
            className={`flex-1 min-w-[180px] py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'COMPETENCIA'
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 scale-102'
                : 'bg-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Trophy className="w-4 h-4" /> 🏆 Medidas de la Competencia
          </button>

          <button
            onClick={() => setActiveTab('TERMINADOS')}
            className={`py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'TERMINADOS'
                ? 'bg-gray-900 text-white shadow-lg scale-102'
                : 'bg-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Package className="w-4 h-4" /> Terminados
          </button>

          <button
            onClick={() => setActiveTab('SEGUNDA')}
            className={`py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'SEGUNDA'
                ? 'bg-gray-900 text-white shadow-lg scale-102'
                : 'bg-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            Segunda
          </button>

          <button
            onClick={() => setActiveTab('TALLAS ESPECIALES')}
            className={`py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'TALLAS ESPECIALES'
                ? 'bg-gray-900 text-white shadow-lg scale-102'
                : 'bg-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            Especiales
          </button>
        </div>

        {/* ========================================================================= */}
        {/* CASE 1: COMPETITOR MEASUREMENTS TAB */}
        {/* ========================================================================= */}
        {activeTab === 'COMPETENCIA' ? (
          <div className="space-y-8">
            
            {/* COMPETITOR REGISTRATION FORM */}
            <form onSubmit={handleSaveCompetitor} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/20 space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase">Registrar Prenda de la Competencia</h3>
                  <p className="text-xs font-bold text-gray-400">Ingresa las medidas tomadas a marcas externas para comparativas de calce</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Marca / Competidor
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Zara, Levi's, Pionier, Tommy..."
                    value={compBrand}
                    onChange={e => setCompBrand(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-black text-sm uppercase text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Nombre de la Prenda / Modelo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Jeans Skinny Stretch Cargo"
                    value={compGarment}
                    onChange={e => setCompGarment(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-bold text-sm text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Talla de la Muestra
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 32, M, 30..."
                    value={compSize}
                    onChange={e => setCompSize(e.target.value.toUpperCase())}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-black text-sm uppercase text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* MEASUREMENT POINTS INPUTS */}
              <div className="pt-4 border-t border-gray-100">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-3">
                  Puntos de Medida (cm o pulgadas ej: 7 1/2" ó 19 cm)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {MEASUREMENT_KEYS.map(k => (
                    <div key={k.key} className="space-y-1 bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider block truncate">
                        {k.label}
                      </span>
                      <input
                        type="text"
                        placeholder="-"
                        value={compForm[k.key] || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setCompForm(prev => ({
                            ...prev,
                            [k.key]: k.key === 'botaPie' ? formatBotaPieCell(val) : val
                          }));
                        }}
                        className="w-full bg-white border border-gray-200 rounded-xl py-2 px-1 text-center font-black text-xs text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-200 transition active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Medida de Competencia
                </button>
              </div>
            </form>

            {/* COMPETITOR MEASUREMENTS HISTORY TABLE */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase">Prendas de Competencia Registradas</h3>
                  <p className="text-xs font-bold text-gray-400">Base de datos de medidas externas para benchmarking</p>
                </div>

                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar por marca o prenda..."
                    value={searchCompText}
                    onChange={e => setSearchCompText(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {competitorList.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-black uppercase tracking-widest">No hay medidas de competencia registradas aún</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-3xl shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
                        <th className="px-4 py-3.5">Marca</th>
                        <th className="px-4 py-3.5">Prenda / Modelo</th>
                        <th className="px-4 py-3.5 text-center">Talla</th>
                        {MEASUREMENT_KEYS.map(k => (
                          <th key={k.key} className="px-3 py-3.5 text-center">{k.label}</th>
                        ))}
                        <th className="px-4 py-3.5 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-bold">
                      {competitorList
                        .filter(item => {
                          const term = searchCompText.toLowerCase();
                          return (item.color || '').toLowerCase().includes(term) || (item.op || '').toLowerCase().includes(term);
                        })
                        .map(item => (
                          <tr key={item.id} className="hover:bg-amber-50/30 transition">
                            <td className="px-4 py-3 font-black text-amber-700 uppercase">
                              {item.color || 'COMPETENCIA'}
                            </td>
                            <td className="px-4 py-3 text-gray-900 font-black uppercase">
                              {item.op || '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-900 font-black text-[11px]">
                                {item.size}
                              </span>
                            </td>
                            {MEASUREMENT_KEYS.map(k => (
                              <td key={k.key} className="px-3 py-3 text-center font-mono font-black text-gray-700 text-[11px]">
                                {item[k.key] || '-'}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDeleteCompetitor(item.id)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                                title="Eliminar medida"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* ========================================================================= */
          /* CASE 2: SYSTEM SAMPLES & INVENTORY PRODUCTS */
          /* ========================================================================= */
          <div className="space-y-8">
            
            {/* SEARCH & SELECTOR CARD */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/20 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase">
                    {activeTab === 'MUESTRAS' ? '1. Selecciona la Muestra de Desarrollo' : '1. Selecciona el Producto del Inventario'}
                  </h3>
                  <p className="text-xs font-bold text-gray-400">
                    Busca por nombre o código para autocompletar su información e ingresar medidas
                  </p>
                </div>
              </div>

              {/* SEARCH INPUT */}
              <div className="relative">
                <div className="relative">
                  <Search className="w-5 h-5 text-indigo-400 absolute left-5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={selectedItem ? `${selectedItem.name}` : `Escribe para buscar ${activeTab === 'MUESTRAS' ? 'muestra (ej: Camisa, SMP...)' : 'producto'}...`}
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-14 pr-6 py-4 font-bold text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  />
                </div>

                {showDropdown && filteredSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-72 overflow-y-auto p-2 space-y-1">
                    {filteredSuggestions.map((item: any) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedItem(item);
                          setSearchQuery('');
                          setShowDropdown(false);
                        }}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-indigo-50/50 rounded-xl transition text-left group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 bg-indigo-50 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center shrink-0">
                            {item.images && item.images.length > 0 ? (
                              <img src={getImageUrl(item.images[0])} alt={item.name} className="w-full h-full object-cover" />
                            ) : item.imageUrl ? (
                              <img src={getImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <Beaker className="w-6 h-6 text-indigo-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-gray-900 text-sm uppercase truncate">{item.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 font-mono mt-0.5">
                              {item.code || item.sku || 'SMP'} • {item.udp?.name || item.category || 'Muestra'}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-xl uppercase border border-indigo-100 shrink-0 ml-2">
                          Seleccionar
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SELECTED ITEM DETAILS & MEASUREMENTS MATRIX */}
            {selectedItem && (
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-6 md:p-8 space-y-8">
                
                {/* SAMPLE HERO INFO */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 overflow-hidden border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                      {selectedItem.images && selectedItem.images.length > 0 ? (
                        <img src={getImageUrl(selectedItem.images[0])} alt={selectedItem.name} className="w-full h-full object-cover" />
                      ) : selectedItem.imageUrl ? (
                        <img src={getImageUrl(selectedItem.imageUrl)} alt={selectedItem.name} className="w-full h-full object-cover" />
                      ) : (
                        <Beaker className="w-8 h-8 text-indigo-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono text-[10px] font-black uppercase border border-indigo-100">
                          {selectedItem.code || selectedItem.sku || 'MUESTRA'}
                        </span>
                        {selectedItem.status && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase">
                            {selectedItem.status}
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-black text-gray-900 uppercase mt-1">
                        {selectedItem.name}
                      </h2>
                    </div>
                  </div>

                  {/* STAGE BUTTONS */}
                  <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 rounded-2xl w-full lg:w-auto">
                    {STAGES.map(s => {
                      const isActive = activeStage === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setActiveStage(s.id)}
                          className={`flex-1 lg:flex-initial px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                              : 'bg-transparent text-gray-600 hover:bg-white'
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SIZE CURVE SELECTOR PILLS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      2. Selecciona la Talla a Editar / Registrar
                    </label>
                    <span className="text-xs font-bold text-indigo-600">
                      Talla activa: <strong className="font-black text-sm">{selectedSize}</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {standardSizes.map(sz => {
                      const isSelected = selectedSize === sz;
                      const hasRegistered = existingSampleSizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all relative ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                              : hasRegistered
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                              : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          Talla {sz}
                          {hasRegistered && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-1 -right-1 ring-2 ring-white" />
                          )}
                        </button>
                      );
                    })}

                    {/* CUSTOM SIZE INPUT */}
                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-2xl border border-gray-200">
                      <input
                        type="text"
                        placeholder="+ Talla..."
                        value={customNewSize}
                        onChange={e => setCustomNewSize(e.target.value.toUpperCase())}
                        className="w-20 px-2.5 py-1.5 bg-transparent font-black text-xs outline-none uppercase text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!customNewSize.trim()) return;
                          setSelectedSize(customNewSize.trim());
                          setCustomNewSize('');
                        }}
                        className="p-1.5 bg-indigo-600 text-white rounded-xl hover:bg-black transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* MEASUREMENT MATRIX INPUTS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      3. Medidas de Talla {selectedSize} ({STAGES.find(s => s.id === activeStage)?.label})
                    </h4>
                    <span className="text-[11px] font-bold text-gray-400">
                      Valores en pulgadas o cm (conversión automática)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    {MEASUREMENT_KEYS.map(k => {
                      const val = (matrix['OFFICIAL_COLUMN'] || {})[k.key] || '';
                      return (
                        <div key={k.key} className="space-y-1.5 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 text-center">
                          <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider block truncate">
                            {k.label}
                          </span>
                          <input
                            type="text"
                            placeholder="-"
                            value={val}
                            onChange={e => {
                              const text = e.target.value;
                              handleCellChange('OFFICIAL_COLUMN', k.key, k.key === 'botaPie' ? formatBotaPieCell(text) : text);
                            }}
                            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-1.5 text-center font-black text-sm text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-8 py-4 bg-indigo-600 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-200 transition active:scale-95 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Medidas de Talla {selectedSize}
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </Layout>
  );
}
