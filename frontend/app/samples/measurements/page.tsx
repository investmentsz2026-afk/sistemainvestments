'use client';

import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../../components/common/Layout';
import api from '../../../lib/axios';
import { Ruler, Search, Save, Plus, Trash2, Tag, Info } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

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
  { id: 'OFICIAL', label: 'Medidas Oficiales', color: 'indigo' },
  { id: 'ANTES_LAVAR', label: 'Antes de Lavar', color: 'amber' },
  { id: 'DESPUES_LAVAR', label: 'Después de Lavar', color: 'emerald' },
];

function parseInches(text: string): number | null {
  const clean = text.replace(/"/g, '').trim();
  if (!clean) return null;

  // Pattern 1: "7 1/8" or "7-1/8"
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

  // Pattern 2: "1/8"
  const slashIndex = clean.indexOf('/');
  if (slashIndex > 0 && fractionParts.length === 1) {
    const num = parseFloat(clean.substring(0, slashIndex));
    const den = parseFloat(clean.substring(slashIndex + 1));
    if (!isNaN(num) && !isNaN(den) && den !== 0) {
      return num / den;
    }
  }

  // Pattern 3: "7.125" or "7"
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
  
  // Round to nearest 1/8
  const eighths = Math.round(remainder * 8);
  if (eighths === 0) {
    return `${whole}"`;
  }
  if (eighths === 8) {
    return `${whole + 1}"`;
  }
  
  // Simplify fraction
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
  // If it has " or has a fraction (contains /), it's in inches
  if (val.includes('"') || val.includes('/')) {
    const inches = parseInches(val);
    if (inches !== null) {
      const cm = inches * 2.54;
      const cleanInches = val.includes('"') ? val : `${val}"`;
      return `${cleanInches} (${parseFloat(cm.toFixed(1)).toString().replace('.', ',')} cm)`;
    }
  }

  // Otherwise, check if it's a valid cm
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
  const [inventoryType, setInventoryType] = useState('TERMINADOS'); // TERMINADOS, SEGUNDA, TALLAS ESPECIALES, MUESTRAS
  const [products, setProducts] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [selectedSize, setSelectedSize] = useState('32');
  const [activeStage, setActiveStage] = useState('OFICIAL');
  
  // Columns/Colors listed in the table (no prelavado column as input anymore)
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [customOp, setCustomOp] = useState('');
  const [customColor, setCustomColor] = useState('');
  
  // Registered measurements list for pre-filled models table
  const [registeredMeasurements, setRegisteredMeasurements] = useState<any[]>([]);
  const [searchRegisteredText, setSearchRegisteredText] = useState('');

  // Matrix data structure: { [columnId]: { [measurementKey]: value } }
  const [matrix, setMatrix] = useState<Record<string, Record<string, string>>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Load items
  useEffect(() => {
    fetchItems();
  }, [inventoryType]);

  const fetchItems = async () => {
    try {
      setSelectedItem(null);
      setSearchQuery('');
      setSearchRegisteredText('');
      
      const [itemsResp, measurementsResp] = await Promise.all([
        inventoryType === 'MUESTRAS' ? api.get('/samples') : api.get('/products'),
        api.get('/products-measurements')
      ]);

      if (inventoryType === 'MUESTRAS') {
        setSamples(itemsResp.data || []);
      } else {
        const filtered = (itemsResp.data || []).filter((p: any) => p.inventoryType === inventoryType);
        setProducts(filtered);
      }

      setRegisteredMeasurements(measurementsResp.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar items');
    }
  };

  // Initialize columns and load measurements when selected item or size changes
  useEffect(() => {
    if (!selectedItem) return;
    
    // Auto-select first available size if current selectedSize is not in the item's sizes
    const availableSizes = selectedItem.sizes || [];
    if (availableSizes.length > 0 && !availableSizes.includes(selectedSize)) {
      setSelectedSize(availableSizes[0]);
    }

    const baseCols: ColumnType[] = [];
    
    if (activeStage === 'OFICIAL') {
      baseCols.push({
        id: 'OFFICIAL_COLUMN',
        op: '',
        color: ''
      });
    } else {
      if (inventoryType === 'MUESTRAS') {
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
      if (inventoryType === 'MUESTRAS') {
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
        // Only 1 column
        const officialMeasure = stageMeasurements.find((m: any) => !m.color || m.color === '');
        newMatrix['OFFICIAL_COLUMN'] = {};
        if (officialMeasure) {
          MEASUREMENT_KEYS.forEach(({ key }) => {
            newMatrix['OFFICIAL_COLUMN'][key] = officialMeasure[key] || '';
          });
        } else {
          MEASUREMENT_KEYS.forEach(({ key }) => {
            newMatrix['OFFICIAL_COLUMN'][key] = '';
          });
        }
      } else {
        // Prefill columns list from measurements if they have custom values
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

  const addColumn = () => {
    const colName = customColor.trim();
    const opName = customOp.trim();
    if (!colName) {
      toast.error('El color es obligatorio');
      return;
    }
    
    const id = `${opName}|${colName}`;
    if (columns.some(c => c.id === id)) {
      toast.error('Esta combinación de OP y Color ya existe en la tabla');
      return;
    }

    setColumns([...columns, { id, op: opName, color: colName }]);
    setCustomColor('');
    setCustomOp('');
  };

  const removeColumn = (columnId: string) => {
    setColumns(columns.filter(c => c.id !== columnId));
    setMatrix(prev => {
      const copy = { ...prev };
      delete copy[columnId];
      return copy;
    });
  };

  const saveAll = async () => {
    if (!selectedItem) return;
    try {
      const promises = columns.map(col => {
        const measurements = matrix[col.id] || {};
        const payload: any = {
          size: selectedSize,
          color: activeStage === 'OFICIAL' ? null : (col.color || null),
          op: activeStage === 'OFICIAL' ? null : (col.op || null),
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

        if (inventoryType === 'MUESTRAS') {
          payload.sampleId = selectedItem.id;
        } else {
          // Route to specific sibling product containing this variant if applicable
          let targetProductId = selectedItem.id;
          if (activeStage !== 'OFICIAL' && selectedItem.siblingIds) {
            const matchingSibling = products.find((p: any) => 
              selectedItem.siblingIds.includes(p.id) && 
              (p.variants || []).some((v: any) => (v.op || '') === col.op && v.color === col.color)
            );
            if (matchingSibling) {
              targetProductId = matchingSibling.id;
            }
          }
          payload.productId = targetProductId;
        }

        return api.post('/products-measurements', payload);
      });

      await Promise.all(promises);
      toast.success('Medidas guardadas correctamente');
      loadMeasurements();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar medidas');
    }
  };

  // Group autocomplete suggestions by name to select unique models
  const itemsList = inventoryType === 'MUESTRAS' ? samples : products;
  const matched = itemsList.filter((item: any) => {
    const nameMatch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const skuMatch = (item.sku || '').toLowerCase().includes(searchQuery.toLowerCase());
    const opMatch = (item.op || '').toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || skuMatch || opMatch;
  });

  const groupedSuggestions: any[] = [];
  const seenNames = new Set<string>();

  matched.forEach((item: any) => {
    const nameKey = (item.name || '').trim().toLowerCase();
    if (!seenNames.has(nameKey)) {
      seenNames.add(nameKey);
      
      const siblings = itemsList.filter((x: any) => (x.name || '').trim().toLowerCase() === nameKey);
      const allVariants: any[] = [];
      siblings.forEach((sib: any) => {
        if (sib.variants) allVariants.push(...sib.variants);
      });
      const allSizes = Array.from(new Set(siblings.flatMap((x: any) => x.sizes || [])));
      const allColors = Array.from(new Set(siblings.flatMap((x: any) => x.colors || [])));

      groupedSuggestions.push({
        ...item,
        variants: allVariants,
        sizes: allSizes,
        colors: allColors,
        siblingIds: siblings.map((x: any) => x.id)
      });
    }
  });

  const registeredItems = useMemo(() => {
    const uniqueIds = new Set<string>();
    const list: any[] = [];
    
    registeredMeasurements.forEach((m: any) => {
      if (inventoryType === 'MUESTRAS') {
        if (m.sampleId && !uniqueIds.has(m.sampleId)) {
          uniqueIds.add(m.sampleId);
          const sample = samples.find(s => s.id === m.sampleId);
          if (sample) {
            list.push({ ...sample, type: 'MUESTRA' });
          }
        }
      } else {
        if (m.productId && !uniqueIds.has(m.productId)) {
          uniqueIds.add(m.productId);
          const prod = products.find(p => p.id === m.productId);
          if (prod) {
            list.push({ ...prod, type: 'PRODUCTO' });
          }
        }
      }
    });

    const grouped: any[] = [];
    const seenNames = new Set<string>();

    list.forEach((item: any) => {
      const nameKey = (item.name || '').trim().toLowerCase();
      if (!seenNames.has(nameKey)) {
        seenNames.add(nameKey);
        
        const itemsList = inventoryType === 'MUESTRAS' ? samples : products;
        const siblings = itemsList.filter((x: any) => (x.name || '').trim().toLowerCase() === nameKey);
        const allVariants = siblings.flatMap((x: any) => x.variants || []);
        const allSizes = Array.from(new Set(siblings.flatMap((x: any) => x.sizes || [])));
        const allColors = Array.from(new Set(siblings.flatMap((x: any) => x.colors || [])));

        grouped.push({
          ...item,
          variants: allVariants,
          sizes: allSizes,
          colors: allColors,
          siblingIds: siblings.map((x: any) => x.id)
        });
      }
    });

    return grouped;
  }, [registeredMeasurements, products, samples, inventoryType]);

  const filteredRegistered = useMemo(() => {
    const term = searchRegisteredText.toLowerCase();
    return registeredItems.filter((item: any) => {
      return (
        (item.name || '').toLowerCase().includes(term) ||
        (item.sku || '').toLowerCase().includes(term) ||
        (item.op || '').toLowerCase().includes(term)
      );
    });
  }, [registeredItems, searchRegisteredText]);

  const getStageColorClass = (stageId: string) => {
    const current = STAGES.find(s => s.id === stageId);
    if (activeStage === stageId) {
      if (current?.color === 'indigo') return 'bg-indigo-600 text-white';
      if (current?.color === 'amber') return 'bg-amber-600 text-white';
      if (current?.color === 'emerald') return 'bg-emerald-600 text-white';
    }
    return 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200';
  };

  const getStageBorderClass = () => {
    if (activeStage === 'OFICIAL') return 'border-indigo-500';
    if (activeStage === 'ANTES_LAVAR') return 'border-amber-500';
    return 'border-emerald-500';
  };

  return (
    <Layout>
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto space-y-8 pb-20">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-200">
            <Ruler className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Control de Medidas</h1>
            <p className="text-gray-500 font-medium text-lg mt-1">Medidas oficiales, prelavado y postlavado por OP.</p>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/20 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          {/* Inventory Type Select */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Inventario</label>
            <select
              className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
              value={inventoryType}
              onChange={(e) => setInventoryType(e.target.value)}
            >
              <option value="TERMINADOS">📦 Productos Terminados</option>
              <option value="SEGUNDA">♻️ Productos de Segunda</option>
              <option value="TALLAS ESPECIALES">🌟 Tallas Especiales</option>
              <option value="MUESTRAS">🧪 Muestras de Desarrollo</option>
            </select>
          </div>

          {/* Search autocomplete */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Buscar Modelo / SKU</label>
            <div className="relative">
              <input
                type="text"
                placeholder={selectedItem ? `${selectedItem.name}` : "Escribe el nombre del modelo o SKU..."}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm pr-12"
              />
              <Search className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
            </div>

            {showDropdown && searchQuery && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto">
                {groupedSuggestions.length > 0 ? (
                  groupedSuggestions.map((item: any) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedItem(item);
                        setSearchQuery('');
                        setShowDropdown(false);
                      }}
                      className="w-full text-left p-4 hover:bg-indigo-50/50 transition font-semibold text-gray-800 border-b border-gray-50 last:border-none flex justify-between items-center"
                    >
                      <div>
                        <p>{item.name}</p>
                        <p className="text-xs text-gray-400">SKU: {item.sku || 'N/A'}</p>
                      </div>
                      <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full uppercase border border-indigo-100">
                        MODELO ÚNICO
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="p-4 text-sm text-gray-400 italic">No se encontraron resultados</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Measurements Matrix Table */}
        {selectedItem ? (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-8 space-y-8 animate-scale-in">
            {/* Upper selector & stage tabs */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pb-6 border-b border-gray-100">
              {/* Product Info */}
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase">{selectedItem.name}</h2>
                  <div className="flex items-center gap-4 mt-2">
                    {/* Size Select next to model details - only shows sizes this product has */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TALLA:</span>
                      <select
                        className="bg-gray-100 px-3 py-1.5 rounded-xl font-bold text-sm outline-none border border-gray-200 focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                      >
                        {(selectedItem.sizes && selectedItem.sizes.length > 0
                          ? selectedItem.sizes
                          : ['28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50', '52']
                        ).map(sz => (
                          <option key={sz} value={sz}>{sz}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage buttons */}
              <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl self-stretch lg:self-auto">
                {STAGES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveStage(s.id)}
                    className={`flex-1 lg:flex-initial px-6 py-3 rounded-xl font-bold text-sm transition active:scale-95 ${getStageColorClass(s.id)}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stage Info Banner (Replacing prelavado column) */}
            <div className="flex items-center gap-3 bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl">
              <Info className="w-5 h-5 text-indigo-600 shrink-0" />
              <p className="text-sm font-semibold text-indigo-900">
                Estás visualizando/editando las medidas de tipo:{' '}
                <span className="font-black uppercase">{STAGES.find(s => s.id === activeStage)?.label}</span>
              </p>
            </div>

            {/* Custom Column / Color adder */}
            {activeStage !== 'OFICIAL' && (
              <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Añadir Variante:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="OP (Ej: OP-02)"
                    value={customOp}
                    onChange={(e) => setCustomOp(e.target.value)}
                    className="bg-white px-4 py-2 rounded-xl outline-none border border-gray-200 focus:ring-2 focus:ring-indigo-500 font-semibold text-sm w-36"
                  />
                  <input
                    type="text"
                    placeholder="Color (Ej: Camello)"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="bg-white px-4 py-2 rounded-xl outline-none border border-gray-200 focus:ring-2 focus:ring-indigo-500 font-semibold text-sm w-44"
                  />
                  <button
                    onClick={addColumn}
                    className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Matrix table container */}
            <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-inner">
              <table className={`w-full text-left border-collapse border-b-4 ${getStageBorderClass()}`}>
                <thead>
                  <tr className="bg-gray-900 text-white">
                    {/* Double-row mapping header */}
                    <th className="p-4 font-black uppercase text-[10px] tracking-widest text-center border border-gray-800 min-w-[140px] bg-gray-950 sticky left-0 z-20 border-r-2 border-r-gray-800">
                      OP / COLOR
                    </th>
                    {columns.map(col => {
                      const isOfficial = activeStage === 'OFICIAL';
                      return (
                        <th key={col.id} className="p-2 font-black uppercase text-[10px] tracking-widest text-center border border-gray-800 relative group min-w-[140px]">
                          {isOfficial ? (
                            <div className="flex items-center justify-center min-h-[44px] text-xs font-black text-indigo-400">
                              MEDIDA OFICIAL
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center min-h-[44px]">
                              {/* OP on first row */}
                              <span className="text-[9px] text-gray-400 font-bold block leading-none mb-1">
                                {col.op ? col.op : 'Sin OP'}
                              </span>
                              
                              {/* Color and delete action on second row */}
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="text-xs truncate max-w-[110px]">{col.color}</span>
                                <button
                                  onClick={() => removeColumn(col.id)}
                                  className="text-red-400 hover:text-red-600 transition"
                                  title="Remover columna"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {MEASUREMENT_KEYS.map(({ key, label }) => {
                    const isBotaPie = key === 'botaPie';
                    return (
                      <tr key={key} className="hover:bg-gray-50/50 transition">
                        <td className="p-4 border border-gray-100 bg-gray-50 text-center uppercase tracking-wider min-w-[150px] sticky left-0 z-10 border-r-2 border-r-gray-200">
                          <span className="font-black text-gray-500 text-xs">{label}</span>
                        </td>
                        {columns.map(col => (
                          <td key={col.id} className="p-2 border border-gray-100">
                            <input
                              type="text"
                              placeholder={isBotaPie ? '18.1 cm (7 1/8")' : '16 3/4"'}
                              value={matrix[col.id]?.[key] || ''}
                              onChange={(e) => handleCellChange(col.id, key, e.target.value)}
                              onBlur={(e) => {
                                if (isBotaPie) {
                                  const formatted = formatBotaPieCell(e.target.value);
                                  handleCellChange(col.id, key, formatted);
                                }
                              }}
                              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl font-bold text-center text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Save bar */}
            <div className="flex justify-end pt-4">
              <button
                onClick={saveAll}
                disabled={isLoading}
                className="flex items-center gap-2 bg-gray-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-black transition active:scale-95 shadow-lg shadow-gray-200"
              >
                <Save className="w-4 h-4" /> Guardar Medidas ({STAGES.find(s => s.id === activeStage)?.label})
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {registeredItems.length > 0 ? (
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase">Modelos Registrados</h3>
                    <p className="text-xs font-bold text-gray-400 mt-0.5">
                      Listado de prendas que ya cuentan con control de medidas registrado.
                    </p>
                  </div>
                  {/* Local Search input for registered models */}
                  <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar en lista..."
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
                        <th className="p-4 border border-gray-800">Modelo / Nombre</th>
                        <th className="p-4 border border-gray-800">SKU</th>
                        <th className="p-4 border border-gray-800">OPs / Variantes</th>
                        <th className="p-4 border border-gray-800 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-bold text-gray-700 text-sm">
                      {filteredRegistered.length > 0 ? (
                        filteredRegistered.map((item: any) => (
                          <tr key={item.id} className="hover:bg-gray-50/50 transition">
                            <td className="p-4 uppercase text-gray-900 font-black">{item.name}</td>
                            <td className="p-4 uppercase text-gray-500">{item.sku || 'Sin SKU'}</td>
                            <td className="p-4 max-w-xs truncate text-gray-500 uppercase">
                              {inventoryType === 'MUESTRAS' 
                                ? (item.op || 'Sin OP') 
                                : Array.from(new Set((item.variants || []).map((v: any) => v.op).filter(Boolean))).join(', ') || 'Sin OP'
                              }
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => setSelectedItem(item)}
                                className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase transition active:scale-95 shadow-md shadow-gray-200"
                              >
                                Ver Detalles / Editar
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-gray-400 italic">
                            No se encontraron modelos con ese término de búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-12 text-center text-gray-400 flex flex-col items-center justify-center">
                <Ruler className="w-16 h-16 text-gray-200 mb-4" />
                <h3 className="text-lg font-black text-gray-700 uppercase">Ningún modelo seleccionado</h3>
                <p className="text-sm mt-1 max-w-md">Escribe el nombre del modelo o SKU en la barra superior para comenzar a registrar las medidas.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
