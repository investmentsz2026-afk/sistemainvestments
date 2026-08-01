'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../../components/common/Layout';
import api from '../../../lib/axios';
import { Ruler, Search, Save, Plus, Trash2, Tag, Layers, Settings } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

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

export default function MeasurementsPage() {
  const [inventoryType, setInventoryType] = useState('TERMINADOS'); // TERMINADOS, SEGUNDA, TALLAS ESPECIALES, MUESTRAS
  const [products, setProducts] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [selectedSize, setSelectedSize] = useState('32');
  const [activeStage, setActiveStage] = useState('OFICIAL');
  
  // Columns/Colors listed in the table
  const [columns, setColumns] = useState<string[]>(['PRELAVADO']);
  const [customColor, setCustomColor] = useState('');
  
  // Matrix data structure: { [column]: { [measurementKey]: value } }
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
      if (inventoryType === 'MUESTRAS') {
        const resp = await api.get('/samples');
        setSamples(resp.data || []);
      } else {
        const resp = await api.get('/products');
        // Filter by inventoryType
        const filtered = (resp.data || []).filter((p: any) => p.inventoryType === inventoryType);
        setProducts(filtered);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar items');
    }
  };

  // Initialize columns and load measurements when selected item or size changes
  useEffect(() => {
    if (!selectedItem) return;
    
    // Set initial columns: PRELAVADO + colors of the item
    const baseCols = ['PRELAVADO'];
    const itemColors = selectedItem.colors || [];
    setColumns([...baseCols, ...itemColors]);
    
    loadMeasurements();
  }, [selectedItem, selectedSize, activeStage]);

  const loadMeasurements = async () => {
    if (!selectedItem) return;
    setIsLoading(true);
    try {
      const params: any = {
        size: selectedSize,
      };
      if (inventoryType === 'MUESTRAS') {
        params.sampleId = selectedItem.id;
      } else {
        params.productId = selectedItem.id;
      }
      
      const resp = await api.get('/products-measurements', { params });
      
      // Filter measurements by stage
      const stageMeasurements = (resp.data || []).filter((m: any) => m.stage === activeStage);
      
      // Build matrix
      const newMatrix: Record<string, Record<string, string>> = {};
      
      // Prefill columns list from measurements if they have custom colors
      const existingColors = Array.from(new Set(stageMeasurements.map((m: any) => m.color || 'PRELAVADO')));
      setColumns(prev => {
        const merged = Array.from(new Set([...prev, ...existingColors]));
        return merged.length > 0 ? (merged as string[]) : ['PRELAVADO'];
      });

      stageMeasurements.forEach((m: any) => {
        const col = m.color || 'PRELAVADO';
        if (!newMatrix[col]) newMatrix[col] = {};
        
        MEASUREMENT_KEYS.forEach(({ key }) => {
          newMatrix[col][key] = m[key] || '';
        });
      });
      
      setMatrix(newMatrix);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar medidas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellChange = (column: string, key: string, value: string) => {
    setMatrix(prev => ({
      ...prev,
      [column]: {
        ...(prev[column] || {}),
        [key]: value
      }
    }));
  };

  const addColumn = () => {
    const colName = customColor.trim();
    if (!colName) return;
    if (columns.includes(colName)) {
      toast.error('El color ya existe en la tabla');
      return;
    }
    setColumns([...columns, colName]);
    setCustomColor('');
  };

  const removeColumn = (colName: string) => {
    if (colName === 'PRELAVADO') return;
    setColumns(columns.filter(c => c !== colName));
    setMatrix(prev => {
      const copy = { ...prev };
      delete copy[colName];
      return copy;
    });
  };

  const saveAll = async () => {
    if (!selectedItem) return;
    try {
      const promises = columns.map(col => {
        const measurements = matrix[col] || {};
        const payload: any = {
          size: selectedSize,
          color: col === 'PRELAVADO' ? null : col,
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
          payload.op = selectedItem.op || null;
        } else {
          payload.productId = selectedItem.id;
          payload.op = selectedItem.op || null;
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

  // Autocomplete suggestions
  const itemsList = inventoryType === 'MUESTRAS' ? samples : products;
  const filteredSuggestions = itemsList.filter((item: any) => {
    const nameMatch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const skuMatch = (item.sku || '').toLowerCase().includes(searchQuery.toLowerCase());
    const opMatch = (item.op || '').toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || skuMatch || opMatch;
  });

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
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/20 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
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
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Buscar Modelo / OP / SKU</label>
            <div className="relative">
              <input
                type="text"
                placeholder={selectedItem ? `${selectedItem.name} (${selectedItem.op || 'Sin OP'})` : "Escribe nombre, OP o SKU..."}
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
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map((item: any) => (
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
                      {item.op && (
                        <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full uppercase border border-indigo-100">
                          OP: {item.op}
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="p-4 text-sm text-gray-400 italic">No se encontraron resultados</p>
                )}
              </div>
            )}
          </div>

          {/* Size Select */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Seleccionar Talla</label>
            <select
              className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
            >
              {['28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50', '52'].map(sz => (
                <option key={sz} value={sz}>Talla {sz}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Measurements Matrix Table */}
        {selectedItem ? (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-8 space-y-8">
            {/* Upper selector & stage tabs */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pb-6 border-b border-gray-100">
              {/* Product Info */}
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase">{selectedItem.name}</h2>
                  <p className="text-sm font-bold text-gray-400 mt-0.5">
                    TALLA SELECCIONADA: {selectedSize} | OP: {selectedItem.op || 'Sin OP'}
                  </p>
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

            {/* Custom Column / Color adder */}
            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Añadir Variante/Color:</span>
              <input
                type="text"
                placeholder="Ej: Camello, Azul M."
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="bg-white px-4 py-2 rounded-xl outline-none border border-gray-200 focus:ring-2 focus:ring-indigo-500 font-semibold text-sm"
              />
              <button
                onClick={addColumn}
                className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Matrix table container */}
            <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-inner">
              <table className={`w-full text-left border-collapse border-b-4 ${getStageBorderClass()}`}>
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="p-4 font-black uppercase text-[10px] tracking-widest text-center border border-gray-800 min-w-[140px]">Medida</th>
                    {columns.map(col => (
                      <th key={col} className="p-4 font-black uppercase text-[10px] tracking-widest text-center border border-gray-800 relative group min-w-[140px]">
                        <div className="flex items-center justify-center gap-2">
                          <span>{col}</span>
                          {col !== 'PRELAVADO' && (
                            <button
                              onClick={() => removeColumn(col)}
                              className="text-red-400 hover:text-red-600 transition"
                              title="Remover columna"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MEASUREMENT_KEYS.map(({ key, label }) => (
                    <tr key={key} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 font-black text-gray-500 text-xs border border-gray-100 bg-gray-50/40 text-center uppercase tracking-wider">
                        {label}
                      </td>
                      {columns.map(col => (
                        <td key={col} className="p-2 border border-gray-100">
                          <input
                            type="text"
                            placeholder='16 3/4"'
                            value={matrix[col]?.[key] || ''}
                            onChange={(e) => handleCellChange(col, key, e.target.value)}
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl font-bold text-center text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
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
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-12 text-center text-gray-400 flex flex-col items-center justify-center">
            <Ruler className="w-16 h-16 text-gray-200 mb-4" />
            <h3 className="text-lg font-black text-gray-700 uppercase">Ningún modelo seleccionado</h3>
            <p className="text-sm mt-1 max-w-md">Escribe el nombre del modelo, SKU o número de OP en la barra superior para comenzar a registrar las medidas.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
