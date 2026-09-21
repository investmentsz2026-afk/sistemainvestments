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
  Trophy, 
  CheckCircle2, 
  Loader2,
  Printer,
  Copy,
  Sparkles,
  ArrowRight,
  Package,
  Layers,
  Sliders,
  Scissors
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { getImageUrl } from '../../../lib/imageUrl';

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
  { id: 'OFICIAL', label: 'Medidas Oficiales', color: 'indigo', desc: 'Patrón y especificación oficial de la prenda' },
  { id: 'ANTES_LAVAR', label: 'Antes de Lavar (Crudo)', color: 'amber', desc: 'Medidas en tela cruda antes de lavandería' },
  { id: 'DESPUES_LAVAR', label: 'Después de Lavar (Acabado)', color: 'emerald', desc: 'Medidas finales tras encogimiento y acabado' },
];

const CATEGORY_TABS = [
  { id: 'TERMINADOS', label: 'Prendas 1ra Calidad', icon: Package, color: 'indigo' },
  { id: 'SEGUNDA', label: 'Prendas de Segunda', icon: Layers, color: 'rose' },
  { id: 'TALLAS_ESPECIALES', label: 'Tallas Especiales', icon: Scissors, color: 'purple' },
  { id: 'MUESTRAS', label: 'Muestras UDP', icon: Beaker, color: 'blue' },
  { id: 'COMPETENCIA', label: 'Competencia', icon: Trophy, color: 'amber' },
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
  if (eighths === 0) {
    return `${whole}"`;
  }
  if (eighths === 8) {
    return `${whole + 1}"`;
  }
  
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
  const [activeTab, setActiveTab] = useState<'TERMINADOS' | 'SEGUNDA' | 'TALLAS_ESPECIALES' | 'MUESTRAS' | 'COMPETENCIA'>('TERMINADOS');
  
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [allMeasurements, setAllMeasurements] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRegisteredText, setSearchRegisteredText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [selectedSize, setSelectedSize] = useState('32');
  const [customNewSize, setCustomNewSize] = useState('');
  const [activeStage, setActiveStage] = useState('OFICIAL');
  
  const [itemMeasurements, setItemMeasurements] = useState<any[]>([]);
  const [currentForm, setCurrentForm] = useState<Record<string, string>>({
    cintura: '',
    cadera: '',
    muslo: '',
    rodilla: '',
    botaPie: '',
    tiroDel: '',
    tiroPos: '',
    largoTotal: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Competitor state
  const [compBrand, setCompBrand] = useState('');
  const [compGarment, setCompGarment] = useState('');
  const [compSize, setCompSize] = useState('32');
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
    setSelectedItem(null);
    setSearchQuery('');
    setSearchRegisteredText('');
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'COMPETENCIA') {
        const resp = await api.get('/products-measurements', { params: { stage: 'COMPETENCIA' } });
        setCompetitorList(resp.data || []);
        return;
      }

      if (activeTab === 'MUESTRAS') {
        const [samplesResp, measurementsResp] = await Promise.all([
          api.get('/samples'),
          api.get('/products-measurements')
        ]);
        setItemsList(samplesResp.data || []);
        setAllMeasurements(measurementsResp.data || []);
      } else {
        const invType = activeTab === 'TALLAS_ESPECIALES' ? 'TALLAS ESPECIALES' : activeTab;
        const [productsResp, measurementsResp] = await Promise.all([
          api.get('/products'),
          api.get('/products-measurements')
        ]);
        const filtered = (productsResp.data || []).filter((p: any) => p.inventoryType === invType);
        setItemsList(filtered);
        setAllMeasurements(measurementsResp.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  // Load measurements whenever selected item changes
  useEffect(() => {
    if (!selectedItem) {
      setItemMeasurements([]);
      return;
    }
    loadItemMeasurements();
  }, [selectedItem]);

  const loadItemMeasurements = async () => {
    if (!selectedItem) return;
    setIsLoading(true);
    try {
      const isSample = activeTab === 'MUESTRAS';
      const resp = await api.get('/products-measurements', { 
        params: isSample ? { sampleId: selectedItem.id } : { productId: selectedItem.id }
      });
      setItemMeasurements(resp.data || []);
    } catch (err) {
      console.error('Error fetching measurements:', err);
      toast.error('Error al cargar medidas');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync form values when activeStage or selectedSize or itemMeasurements change
  useEffect(() => {
    if (!selectedItem) return;

    const currentRecord = itemMeasurements.find(
      (m: any) => m.stage === activeStage && m.size === selectedSize
    );

    if (currentRecord) {
      setCurrentForm({
        cintura: currentRecord.cintura || '',
        cadera: currentRecord.cadera || '',
        muslo: currentRecord.muslo || '',
        rodilla: currentRecord.rodilla || '',
        botaPie: currentRecord.botaPie || '',
        tiroDel: currentRecord.tiroDel || '',
        tiroPos: currentRecord.tiroPos || '',
        largoTotal: currentRecord.largoTotal || ''
      });
    } else {
      setCurrentForm({
        cintura: '',
        cadera: '',
        muslo: '',
        rodilla: '',
        botaPie: '',
        tiroDel: '',
        tiroPos: '',
        largoTotal: ''
      });
    }
  }, [selectedItem, activeStage, selectedSize, itemMeasurements]);

  const handleFormChange = (key: string, value: string) => {
    let finalVal = value;
    if (key === 'botaPie') {
      finalVal = formatBotaPieCell(value);
    }
    setCurrentForm(prev => ({
      ...prev,
      [key]: finalVal
    }));
  };

  const handleSaveMeasurement = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      const isSample = activeTab === 'MUESTRAS';
      const payload = {
        productId: isSample ? null : selectedItem.id,
        sampleId: isSample ? selectedItem.id : null,
        stage: activeStage,
        size: selectedSize,
        op: selectedItem.op || null,
        color: selectedItem.productionColor || null,
        cintura: currentForm.cintura || null,
        cadera: currentForm.cadera || null,
        muslo: currentForm.muslo || null,
        rodilla: currentForm.rodilla || null,
        botaPie: currentForm.botaPie || null,
        tiroDel: currentForm.tiroDel || null,
        tiroPos: currentForm.tiroPos || null,
        largoTotal: currentForm.largoTotal || null,
      };

      await api.post('/products-measurements', payload);
      toast.success(`Medidas de talla ${selectedSize} (${STAGES.find(s => s.id === activeStage)?.label}) guardadas`);
      loadItemMeasurements();
      // Also refresh all measurements in background
      api.get('/products-measurements').then(res => setAllMeasurements(res.data || []));
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al guardar medidas');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyFromStage = (sourceStage: string) => {
    const sourceRecord = itemMeasurements.find(
      (m: any) => m.stage === sourceStage && m.size === selectedSize
    );

    if (!sourceRecord) {
      toast.error(`No hay medidas en "${STAGES.find(s => s.id === sourceStage)?.label}" para la talla ${selectedSize}`);
      return;
    }

    setCurrentForm({
      cintura: sourceRecord.cintura || '',
      cadera: sourceRecord.cadera || '',
      muslo: sourceRecord.muslo || '',
      rodilla: sourceRecord.rodilla || '',
      botaPie: sourceRecord.botaPie || '',
      tiroDel: sourceRecord.tiroDel || '',
      tiroPos: sourceRecord.tiroPos || '',
      largoTotal: sourceRecord.largoTotal || ''
    });

    toast.success(`Medidas copiadas desde "${STAGES.find(s => s.id === sourceStage)?.label}"`);
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
      fetchInitialData();
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
      fetchInitialData();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar');
    }
  };

  const filteredSuggestions = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return [];
    return itemsList.filter(item => 
      (item.name || '').toLowerCase().includes(term) ||
      (item.code || '').toLowerCase().includes(term) ||
      (item.sku || '').toLowerCase().includes(term) ||
      (item.op || '').toLowerCase().includes(term)
    ).slice(0, 10);
  }, [itemsList, searchQuery]);

  // Registered models list for the active category
  const registeredItems = useMemo(() => {
    const isSample = activeTab === 'MUESTRAS';
    return itemsList.filter(item => 
      allMeasurements.some(m => isSample ? m.sampleId === item.id : m.productId === item.id)
    );
  }, [itemsList, allMeasurements, activeTab]);

  const filteredRegistered = useMemo(() => {
    const term = searchRegisteredText.toLowerCase().trim();
    if (!term) return registeredItems;
    return registeredItems.filter(item => 
      (item.name || '').toLowerCase().includes(term) ||
      (item.code || '').toLowerCase().includes(term) ||
      (item.sku || '').toLowerCase().includes(term) ||
      (item.op || '').toLowerCase().includes(term)
    );
  }, [registeredItems, searchRegisteredText]);

  const standardSizes = useMemo(() => {
    if (activeTab === 'TALLAS_ESPECIALES') {
      return ['48', '50', '52', '44', '46'];
    }
    if (selectedItem?.sizes && selectedItem.sizes.length > 0) {
      return selectedItem.sizes;
    }
    return ['28', '30', '32', '34', '36', '38', '40', '42', '44', '46', 'S', 'M', 'L', 'XL', 'XXL'];
  }, [activeTab, selectedItem]);

  // All sizes for the active stage
  const registeredSizesInActiveStage = useMemo(() => {
    return itemMeasurements
      .filter((m: any) => m.stage === activeStage)
      .map((m: any) => m.size);
  }, [itemMeasurements, activeStage]);

  // Curve sizes ordered
  const tableCurveSizes = useMemo(() => {
    const activeStageSizes = itemMeasurements
      .filter((m: any) => m.stage === activeStage)
      .map((m: any) => m.size);
    
    const unique = Array.from(new Set(activeStageSizes));
    return unique.sort((a: any, b: any) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a).localeCompare(String(b));
    });
  }, [itemMeasurements, activeStage]);

  const handlePrint = () => {
    window.print();
  };

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
                Ficha técnica y control de medidas oficiales, antes de lavar y después de lavado para todas las prendas y prototipos.
              </p>
            </div>
          </div>
        </div>

        {/* MAIN CATEGORY TABS (TERMINADOS, SEGUNDA, TALLAS ESPECIALES, MUESTRAS, COMPETENCIA) */}
        <div className="bg-white rounded-3xl p-2 border border-gray-100 shadow-sm flex flex-wrap gap-2 print:hidden">
          {CATEGORY_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[170px] py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-102'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
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
                    Prenda / Modelo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Jean Slim Fit, Cargo, Oversize..."
                    value={compGarment}
                    onChange={e => setCompGarment(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-black text-sm uppercase text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Talla Medida
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 28, 30, 32, M, L..."
                    value={compSize}
                    onChange={e => setCompSize(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-black text-sm uppercase text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* MEASUREMENTS INPUTS */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Medidas Tomadas
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {MEASUREMENT_KEYS.map(k => (
                    <div key={k.key} className="space-y-1.5 bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block truncate">
                        {k.label}
                      </span>
                      <input
                        type="text"
                        placeholder="-"
                        value={compForm[k.key] || ''}
                        onChange={e => {
                          let val = e.target.value;
                          if (k.key === 'botaPie') val = formatBotaPieCell(val);
                          setCompForm(prev => ({ ...prev, [k.key]: val }));
                        }}
                        className="w-full bg-white border border-gray-200 rounded-xl py-2 px-1 text-center font-black text-sm text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-amber-200 transition active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Guardar Medida de Competencia
                </button>
              </div>
            </form>

            {/* COMPETITOR MEASUREMENTS HISTORY TABLE */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase">Historial de Medidas de Competencia</h3>
                  <p className="text-xs font-bold text-gray-400">Prendas externas evaluadas para referencias de patronaje</p>
                </div>

                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar por marca o modelo..."
                    value={searchCompText}
                    onChange={e => setSearchCompText(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl font-bold text-sm outline-none ring-2 ring-transparent focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
                      <th className="p-4 border border-gray-800">Marca</th>
                      <th className="p-4 border border-gray-800">Prenda / Modelo</th>
                      <th className="p-4 border border-gray-800 text-center">Talla</th>
                      {MEASUREMENT_KEYS.map(k => (
                        <th key={k.key} className="p-4 border border-gray-800 text-center">{k.label}</th>
                      ))}
                      <th className="p-4 border border-gray-800 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-bold text-xs">
                    {competitorList
                      .filter(item => {
                        const term = searchCompText.toLowerCase();
                        return (
                          (item.color || '').toLowerCase().includes(term) ||
                          (item.op || '').toLowerCase().includes(term)
                        );
                      })
                      .map((item: any) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition">
                          <td className="p-4 font-black uppercase text-amber-700 bg-amber-50/30">
                            {item.color || 'DESCONOCIDO'}
                          </td>
                          <td className="p-4 uppercase text-gray-900 font-black">
                            {item.op || '-'}
                          </td>
                          <td className="p-4 text-center font-mono font-black text-indigo-700">
                            {item.size}
                          </td>
                          {MEASUREMENT_KEYS.map(k => (
                            <td key={k.key} className="p-4 text-center font-mono text-gray-700">
                              {item[k.key] || '-'}
                            </td>
                          ))}
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleDeleteCompetitor(item.id)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          /* ========================================================================= */
          /* CASE 2: CLOTHING / SAMPLES MEASUREMENTS WORKFLOW */
          /* ========================================================================= */
          <div className="space-y-8">
            
            {/* SEARCH & SELECTION BAR */}
            <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-xl shadow-gray-200/20 space-y-4 print:hidden">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 uppercase">
                    1. Buscar y Seleccionar {CATEGORY_TABS.find(t => t.id === activeTab)?.label}
                  </h3>
                  <p className="text-xs font-bold text-gray-400">
                    Escribe el nombre del modelo, SKU o código para abrir su ficha de medidas
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="w-5 h-5 text-gray-400 absolute left-5" />
                  <input
                    type="text"
                    placeholder={`Buscar en ${CATEGORY_TABS.find(t => t.id === activeTab)?.label}... (ej. Modelo, SKU)`}
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-14 pr-12 py-4 font-black text-sm uppercase text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setShowDropdown(false);
                      }}
                      className="absolute right-4 p-1.5 text-gray-400 hover:text-gray-700 bg-gray-200 rounded-full text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* AUTOCOMPLETE DROPDOWN */}
                {showDropdown && filteredSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden divide-y divide-gray-50 max-h-80 overflow-y-auto">
                    {filteredSuggestions.map((item: any) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedItem(item);
                          setShowDropdown(false);
                          setSearchQuery('');
                        }}
                        className="w-full px-5 py-3.5 text-left hover:bg-indigo-50/50 transition flex items-center justify-between gap-4 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center shrink-0">
                            {item.images && item.images.length > 0 ? (
                              <img src={getImageUrl(item.images[0])} alt={item.name} className="w-full h-full object-cover" />
                            ) : item.imageUrl ? (
                              <img src={getImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-indigo-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-gray-900 text-sm uppercase truncate">{item.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 font-mono mt-0.5">
                              {item.sku || item.code || 'SIN SKU'} • {item.category || item.inventoryType || 'PRENDA'}
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
            {selectedItem ? (
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-6 md:p-8 space-y-8">
                
                {/* HERO INFO */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 overflow-hidden border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                      {selectedItem.images && selectedItem.images.length > 0 ? (
                        <img src={getImageUrl(selectedItem.images[0])} alt={selectedItem.name} className="w-full h-full object-cover" />
                      ) : selectedItem.imageUrl ? (
                        <img src={getImageUrl(selectedItem.imageUrl)} alt={selectedItem.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-8 h-8 text-indigo-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono text-[10px] font-black uppercase border border-indigo-100">
                          {selectedItem.sku || selectedItem.code || 'PRENDA'}
                        </span>
                        {selectedItem.category && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase">
                            {selectedItem.category}
                          </span>
                        )}
                        {selectedItem.op && (
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-black uppercase">
                            OP: {selectedItem.op}
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-black text-gray-900 uppercase mt-1">
                        {selectedItem.name}
                      </h2>
                    </div>
                  </div>

                  {/* STAGE BUTTONS (OFICIALES, ANTES DE LAVAR, DESPUÉS DE LAVAR) */}
                  <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 rounded-2xl w-full lg:w-auto print:hidden">
                    {STAGES.map(s => {
                      const isActive = activeStage === s.id;
                      const count = itemMeasurements.filter((m: any) => m.stage === s.id).length;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setActiveStage(s.id)}
                          className={`flex-1 lg:flex-initial px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-102'
                              : 'bg-transparent text-gray-600 hover:bg-white'
                          }`}
                        >
                          <span>{s.label}</span>
                          {count > 0 && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STAGE DESCRIPTION BANNER */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Info className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-indigo-900 uppercase">
                        Etapa Activa: {STAGES.find(s => s.id === activeStage)?.label}
                      </h4>
                      <p className="text-[11px] font-bold text-indigo-600/80">
                        {STAGES.find(s => s.id === activeStage)?.desc}
                      </p>
                    </div>
                  </div>

                  {/* QUICK COPY BUTTONS */}
                  <div className="flex items-center gap-2 print:hidden">
                    {activeStage !== 'OFICIAL' && (
                      <button
                        type="button"
                        onClick={() => handleCopyFromStage('OFICIAL')}
                        className="px-3 py-2 bg-white border border-indigo-200 rounded-xl text-[10px] font-black uppercase text-indigo-700 hover:bg-indigo-600 hover:text-white transition shadow-sm flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar de Oficiales
                      </button>
                    )}
                    {activeStage === 'DESPUES_LAVAR' && (
                      <button
                        type="button"
                        onClick={() => handleCopyFromStage('ANTES_LAVAR')}
                        className="px-3 py-2 bg-white border border-amber-200 rounded-xl text-[10px] font-black uppercase text-amber-700 hover:bg-amber-600 hover:text-white transition shadow-sm flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar de Antes Lavar
                      </button>
                    )}
                  </div>
                </div>

                {/* SIZE CURVE SELECTOR PILLS */}
                <div className="space-y-3 print:hidden">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      2. Selecciona la Talla a Registrar / Modificar
                    </label>
                    <span className="text-xs font-bold text-indigo-600">
                      Talla editando: <strong className="font-black text-sm">{selectedSize}</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {standardSizes.map((sz: string) => {
                      const isSelected = selectedSize === sz;
                      const hasRegistered = registeredSizesInActiveStage.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all relative ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                              : hasRegistered
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
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

                {/* MEASUREMENT INPUTS FOR SELECTED SIZE & STAGE */}
                <div className="space-y-4 print:hidden">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h4 className="text-xs font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-indigo-500" />
                      3. Medidas de Talla {selectedSize} en {STAGES.find(s => s.id === activeStage)?.label}
                    </h4>
                    <span className="text-[11px] font-bold text-gray-400">
                      Valores en pulgadas o cm (conversión automática)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    {MEASUREMENT_KEYS.map(k => (
                      <div key={k.key} className="space-y-1.5 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 text-center hover:border-indigo-200 transition">
                        <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider block truncate">
                          {k.label}
                        </span>
                        <input
                          type="text"
                          placeholder="-"
                          value={currentForm[k.key] || ''}
                          onChange={e => handleFormChange(k.key, e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-1.5 text-center font-black text-sm text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveMeasurement}
                      disabled={isSaving}
                      className="px-8 py-4 bg-indigo-600 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-200 transition active:scale-95 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Medidas de Talla {selectedSize}
                    </button>
                  </div>
                </div>

                {/* COMPLETE CURVE COMPARISON TABLE */}
                <div className="pt-6 border-t border-gray-100 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 uppercase flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        Curva de Medidas Registradas ({STAGES.find(s => s.id === activeStage)?.label})
                      </h3>
                      <p className="text-xs font-bold text-gray-400">
                        Visualización completa de todas las tallas registradas en esta etapa
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handlePrint}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition active:scale-95 self-start sm:self-auto print:hidden"
                    >
                      <Printer className="w-4 h-4" /> Imprimir Ficha
                    </button>
                  </div>

                  {tableCurveSizes.length === 0 ? (
                    <div className="py-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                      <Ruler className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
                        Aún no se han guardado tallas en {STAGES.find(s => s.id === activeStage)?.label}
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
                            {tableCurveSizes.map(size => (
                              <th 
                                key={size} 
                                onClick={() => setSelectedSize(size)}
                                className={`px-5 py-4 text-xs font-black uppercase tracking-wider text-center border-r border-gray-800 last:border-r-0 cursor-pointer transition ${
                                  selectedSize === size ? 'bg-indigo-600 text-white' : 'bg-indigo-950/60 hover:bg-indigo-900/80'
                                }`}
                                title="Click para editar esta talla"
                              >
                                Talla {size}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-bold text-sm">
                          {MEASUREMENT_KEYS.map((keyObj, idx) => (
                            <tr key={keyObj.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                              <td className="px-5 py-3.5 text-xs font-black text-gray-900 uppercase border-r border-gray-100">
                                {keyObj.label}
                              </td>
                              {tableCurveSizes.map(size => {
                                const mObj = itemMeasurements.find(
                                  (m: any) => m.stage === activeStage && m.size === size
                                );
                                const val = mObj ? (mObj[keyObj.key] || '-') : '-';
                                return (
                                  <td 
                                    key={size} 
                                    onClick={() => setSelectedSize(size)}
                                    className={`px-5 py-3.5 text-center text-xs font-black text-indigo-950 border-r border-gray-100 last:border-r-0 cursor-pointer ${
                                      selectedSize === size ? 'bg-indigo-50/40' : ''
                                    }`}
                                  >
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
                </div>

              </div>
            ) : (
              /* REGISTERED MODELS TABLE (WHEN NO ITEM IS SELECTED) */
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase">
                      Modelos Registrados ({CATEGORY_TABS.find(t => t.id === activeTab)?.label})
                    </h3>
                    <p className="text-xs font-bold text-gray-400 mt-0.5">
                      Listado de prendas en esta categoría que ya cuentan con control de medidas
                    </p>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar modelo registrado..."
                      value={searchRegisteredText}
                      onChange={(e) => setSearchRegisteredText(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl font-bold text-sm outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
                        <th className="p-4 border border-gray-800">Modelo / Prenda</th>
                        <th className="p-4 border border-gray-800">SKU / Código</th>
                        <th className="p-4 border border-gray-800">Etapas Registradas</th>
                        <th className="p-4 border border-gray-800 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-bold text-gray-700 text-sm">
                      {filteredRegistered.length > 0 ? (
                        filteredRegistered.map((item: any) => {
                          const isSample = activeTab === 'MUESTRAS';
                          const itemMeas = allMeasurements.filter(m => isSample ? m.sampleId === item.id : m.productId === item.id);
                          const stagesCount = Array.from(new Set(itemMeas.map(m => m.stage)));
                          return (
                            <tr key={item.id} className="hover:bg-gray-50/50 transition">
                              <td className="p-4 uppercase text-gray-900 font-black flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 shrink-0 flex items-center justify-center">
                                  {item.images && item.images.length > 0 ? (
                                    <img src={getImageUrl(item.images[0])} alt={item.name} className="w-full h-full object-cover" />
                                  ) : item.imageUrl ? (
                                    <img src={getImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package className="w-4 h-4 text-indigo-400" />
                                  )}
                                </div>
                                <span>{item.name}</span>
                              </td>
                              <td className="p-4 uppercase text-gray-500 font-mono text-xs">
                                {item.sku || item.code || 'SIN SKU'}
                              </td>
                              <td className="p-4">
                                <div className="flex gap-1.5 flex-wrap">
                                  {stagesCount.map(st => (
                                    <span key={st} className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase border border-indigo-100">
                                      {STAGES.find(s => s.id === st)?.label.split('(')[0] || st}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => setSelectedItem(item)}
                                  className="bg-indigo-600 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase transition active:scale-95 shadow-md shadow-indigo-100 flex items-center gap-1.5 ml-auto"
                                >
                                  Ver / Editar Medidas <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-gray-400 italic">
                            No hay modelos con medidas registradas en esta categoría aún. Utiliza el buscador superior para seleccionar un producto y registrar sus medidas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </Layout>
  );
}
