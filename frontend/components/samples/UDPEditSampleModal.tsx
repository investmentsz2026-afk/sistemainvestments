'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  Camera,
  Trash2,
  Plus,
  Box,
  Search,
  DollarSign,
  Loader2,
  FileText,
  Settings,
  Beaker,
  Upload,
  Ruler,
  Sparkles,
  Check
} from 'lucide-react';
import api from '../../lib/axios';
import { getImageUrl } from '../../lib/imageUrl';
import toast from 'react-hot-toast';
import { SelectVariantModal } from './SelectVariantModal';

interface UDPEditSampleModalProps {
  sample: any;
  onClose: () => void;
  onUpdated: () => void;
}

export function UDPEditSampleModal({ sample, onClose, onUpdated }: UDPEditSampleModalProps) {
  const [name, setName] = useState(sample.name || '');
  const [code, setCode] = useState(sample.code || '');
  const [description, setDescription] = useState(sample.description || '');
  const [characteristics, setCharacteristics] = useState(sample.characteristics || '');
  const [images, setImages] = useState<string[]>(sample.images || []);
  const [materials, setMaterials] = useState<any[]>(
    (sample.materials || []).map((m: any) => ({
      productId: m.productId,
      name: m.product?.name || m.customMaterial || 'Material',
      imageUrl: m.product?.imageUrl,
      sku: m.product?.sku,
      quantity: m.quantity || 1,
      unitPriceAtTime: m.unitPriceAtTime || m.product?.purchasePrice || 0,
      customMaterial: m.customMaterial
    }))
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [customMatName, setCustomMatName] = useState('');

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Official Entalles State
  const [officialEntalles, setOfficialEntalles] = useState<any[]>([]);
  const [selectedEntalleName, setSelectedEntalleName] = useState<string>(() => {
    if (sample.entalle) return sample.entalle;
    if (Array.isArray(sample.productionSizeData) && sample.productionSizeData[0]?.entalle) {
      return sample.productionSizeData[0].entalle;
    }
    const match = (sample.characteristics || '').match(/Entalle Oficial:\s*(?:\[[^\]]*\]\s*)?([^\(•\n]+)/i);
    if (match) return match[1].trim();
    return '';
  });
  const [entalleSearch, setEntalleSearch] = useState<string>('');
  const [isEntalleDropdownOpen, setIsEntalleDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchOfficialEntalles = async () => {
      try {
        const resp = await api.get('/products-measurements/official-entalles');
        const list = resp.data || [];
        setOfficialEntalles(list);

        const currentName = selectedEntalleName || 
          sample.entalle || 
          (Array.isArray(sample.productionSizeData) && sample.productionSizeData[0]?.entalle);

        if (currentName) {
          const found = list.find((e: any) => 
            e.name.toUpperCase() === currentName.toUpperCase() ||
            (e.code && e.code.toUpperCase() === currentName.toUpperCase())
          );
          if (found) {
            setSelectedEntalleName(found.name);
          }
        } else if (Array.isArray(sample.productionSizeData) && sample.productionSizeData[0]?.entalleCode) {
          const code = sample.productionSizeData[0].entalleCode;
          const found = list.find((e: any) => e.code && e.code.toUpperCase() === code.toUpperCase());
          if (found) {
            setSelectedEntalleName(found.name);
          }
        }
      } catch (err) {
        console.warn('Error fetching official entalles in edit modal:', err);
      }
    };
    fetchOfficialEntalles();
  }, []);

  const selectedEntalleObj = useMemo(() => {
    if (!selectedEntalleName) return null;
    return officialEntalles.find(e => 
      e.name.toUpperCase() === selectedEntalleName.toUpperCase() ||
      (e.code && e.code.toUpperCase() === selectedEntalleName.toUpperCase())
    ) || null;
  }, [selectedEntalleName, officialEntalles]);

  const filteredEntalles = useMemo(() => {
    const q = entalleSearch.trim().toLowerCase();
    if (!q) return officialEntalles;
    return officialEntalles.filter(ent => {
      const nameMatch = (ent.name || '').toLowerCase().includes(q);
      const codeMatch = (ent.code || '').toLowerCase().includes(q);
      const cinturaMatch = (ent.cinturaType || '').toLowerCase().includes(q);
      return nameMatch || codeMatch || cinturaMatch;
    });
  }, [officialEntalles, entalleSearch]);

  const handleSelectEntalle = (entalleName: string) => {
    setSelectedEntalleName(entalleName);
    setIsEntalleDropdownOpen(false);
    setEntalleSearch('');
    const found = officialEntalles.find(e => e.name.toUpperCase() === entalleName.toUpperCase());
    if (found) {
      const codeText = found.code ? `[${found.code}] ` : '';
      const entalleText = `Entalle Oficial: ${codeText}${found.name} (${found.cinturaType}) • Base: Talla ${found.baseSize || '32'} • Cintura: ${found.cintura || '-'} • Cadera: ${found.cadera || '-'} • Muslo: ${found.muslo || '-'} • Rodilla: ${found.rodilla || '-'} • Botapie: ${found.botaPie || '-'} • Largo: ${found.largoTotal || '-'}`;
      setCharacteristics(prev => {
        let currentChars = prev || '';
        if (currentChars.includes('Entalle Oficial:')) {
          currentChars = currentChars.replace(/Entalle Oficial:.*?(•|$)/g, '').trim();
        }
        const updated = currentChars ? `${currentChars} • ${entalleText}` : entalleText;
        return updated;
      });
    }
  };

  const handleClearEntalle = () => {
    setSelectedEntalleName('');
    setEntalleSearch('');
    setIsEntalleDropdownOpen(false);
    setCharacteristics(prev => {
      let currentChars = prev || '';
      if (currentChars.includes('Entalle Oficial:')) {
        currentChars = currentChars.replace(/Entalle Oficial:.*?(•|$)/g, '').trim();
      }
      return currentChars;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        const resp = await api.post('/uploads', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (resp.data?.url) {
          uploadedUrls.push(resp.data.url);
        }
      }

      if (uploadedUrls.length > 0) {
        setImages(prev => [...prev, ...uploadedUrls]);
        toast.success(uploadedUrls.length === 1 ? 'Foto subida correctamente' : `${uploadedUrls.length} fotos subidas`);
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      toast.error('Error al subir la(s) foto(s)');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    toast.error('Foto eliminada');
  };

  const handleSearchMaterials = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const resp = await api.get(`/products/search?q=${q}`);
      setSearchResults(resp.data || []);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const [pendingVariantProduct, setPendingVariantProduct] = useState<any | null>(null);

  const handleSelectMaterialProduct = (prod: any) => {
    const variants = prod.variants || [];
    const hasMultipleVariants = variants.length > 1 || variants.some((v: any) => v.color && v.color !== 'ÚNICO');

    if (hasMultipleVariants && variants.length > 1) {
      setPendingVariantProduct(prod);
    } else if (variants.length === 1) {
      applyAddMaterial(prod, variants[0]);
    } else {
      applyAddMaterial(prod, null);
    }
  };

  const applyAddMaterial = (prod: any, variant: any) => {
    const variantColor = variant && variant.color !== 'ÚNICO' ? variant.color : null;
    const displayName = variantColor ? `${prod.name} (${variantColor})` : prod.name;
    const skuToUse = variant?.variantSku || prod.sku;

    if (materials.some(m => (m.variantId && m.variantId === variant?.id) || (!m.variantId && m.productId === prod.id && !variantColor))) {
      toast.error('Este material / variante ya está en la lista');
      return;
    }

    setMaterials(prev => [
      ...prev,
      {
        productId: prod.id,
        variantId: variant?.id || null,
        name: displayName,
        imageUrl: prod.imageUrl,
        sku: skuToUse,
        quantity: 1,
        unitPriceAtTime: prod.purchasePrice || 0,
        customMaterial: null
      }
    ]);
    setSearchQuery('');
    setSearchResults([]);
    setPendingVariantProduct(null);
    toast.success(`${displayName} añadido`);
  };

  const addCustomMaterial = () => {
    if (!customMatName.trim()) return;
    setMaterials(prev => [
      ...prev,
      {
        productId: null,
        name: customMatName.trim(),
        customMaterial: customMatName.trim(),
        quantity: 1,
        unitPriceAtTime: 0
      }
    ]);
    setCustomMatName('');
    toast.success('Material personalizado añadido');
  };

  const removeMaterial = (index: number) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const updateMaterialQty = (index: number, qty: number) => {
    const newMats = [...materials];
    newMats[index].quantity = qty;
    setMaterials(newMats);
  };

  const updateMaterialPrice = (index: number, price: number) => {
    const newMats = [...materials];
    newMats[index].unitPriceAtTime = price;
    setMaterials(newMats);
  };

  const handleSaveAndResubmit = async () => {
    if (!name.trim()) {
      toast.error('El nombre de la muestra es obligatorio');
      return;
    }

    setIsSaving(true);
    try {
      await api.put(`/samples/${sample.id}`, {
        name,
        code,
        description,
        characteristics,
        images,
        entalle: selectedEntalleName || undefined,
        entalleCode: selectedEntalleObj?.code || undefined,
        entalleMeasurements: selectedEntalleObj || undefined,
        materials: materials.map(m => ({
          productId: m.productId,
          customMaterial: m.customMaterial,
          quantity: m.quantity,
          unitPriceAtTime: m.unitPriceAtTime
        }))
      });

      toast.success('Muestra actualizada y reenviada a Comercial');
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al actualizar la muestra');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* HEADER */}
        <div className="bg-gray-900 p-6 md:p-8 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Beaker className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] text-indigo-400 font-mono font-black uppercase tracking-widest block">
                Edición UDP
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5">
                Editar Muestra y Reenviar
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white/10 hover:bg-rose-500 text-white rounded-2xl transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
          
          {/* NAME & CODE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Nombre del Prototipo
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Camisa Slim Fit Algodón Pima"
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Código Muestra
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="Ej: SMP-2024-001"
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-black text-gray-900 uppercase outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* ── SELECTOR DE ENTALLE OBJETIVO (OFICIAL) ── */}
          <div className="bg-amber-50/60 p-5 md:p-6 rounded-2xl border border-amber-200/90 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="flex items-center gap-2 text-xs font-black uppercase text-amber-900 tracking-wider">
                  <Ruler className="w-4 h-4 text-amber-600" />
                  Entalle al que se quiere llegar (Medidas Oficiales)
                </label>
                <p className="text-[11px] text-amber-800/80 font-medium mt-0.5">
                  Busca y selecciona por <b>Código de Entalle</b> (ej: ENT-001) o <b>Nombre de Modelo</b> (ej: PARKER):
                </p>
              </div>
              {selectedEntalleObj && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-indigo-900 bg-indigo-100 border border-indigo-300 px-3 py-1 rounded-full uppercase">
                    {selectedEntalleObj.code || 'ENT-000'}
                  </span>
                  {selectedEntalleObj.isCustomCode ? (
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full uppercase">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Código puesto x área UDP
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-slate-700 bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-full uppercase">
                      Código puesto x defecto
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleClearEntalle}
                    className="text-[10px] font-bold text-red-600 hover:text-red-700 hover:underline px-1 py-0.5"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>

            {/* Buscador Rápido por Código o Nombre */}
            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 text-amber-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="🔍 Buscar entalle por Código (ej: ENT-004) o Modelo (ej: PARKER, RELAX)..."
                  value={entalleSearch}
                  onChange={e => {
                    setEntalleSearch(e.target.value);
                    setIsEntalleDropdownOpen(true);
                  }}
                  onFocus={() => setIsEntalleDropdownOpen(true)}
                  className="w-full bg-white border border-amber-300 rounded-xl pl-10 pr-10 py-3 font-bold text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition text-xs shadow-sm placeholder:text-amber-800/40"
                />
                {entalleSearch && (
                  <button
                    type="button"
                    onClick={() => setEntalleSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown con resultados de búsqueda de entalles */}
              {isEntalleDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsEntalleDropdownOpen(false)}
                  />
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-amber-200 rounded-2xl shadow-2xl z-40 max-h-72 overflow-y-auto divide-y divide-gray-100">
                    {filteredEntalles.length > 0 ? (
                      filteredEntalles.map(ent => (
                        <button
                          key={ent.id || ent.name}
                          type="button"
                          onClick={() => handleSelectEntalle(ent.name)}
                          className={`w-full text-left px-4 py-3 hover:bg-amber-50/80 transition flex items-center justify-between gap-3 group ${
                            selectedEntalleName.toUpperCase() === ent.name.toUpperCase() ? 'bg-amber-100/50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-900 border border-indigo-200 shrink-0">
                              {ent.code || 'ENT-000'}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 uppercase group-hover:text-amber-900">
                                  {ent.name}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {ent.cinturaType}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                Tela: {ent.tela || 'DENIM'} • Tipo: {ent.tipoTela || 'CONFORT'} • Cintura: {ent.cintura || '-'} • Cadera: {ent.cadera || '-'}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {ent.isCustomCode ? (
                              <span className="text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                                UDP
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                                Defecto
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500 font-medium">
                        No se encontró ningún entalle oficial con el código o nombre "{entalleSearch}".
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Selector Directo desplegable alternativo */}
            <div className="relative">
              <select
                value={selectedEntalleName}
                onChange={e => handleSelectEntalle(e.target.value)}
                className="w-full bg-white border border-amber-200 rounded-xl px-4 py-2.5 font-bold text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition text-xs shadow-sm cursor-pointer"
              >
                <option value="">-- O selecciona directamente de la lista de entalles oficiales --</option>
                {officialEntalles.map(ent => (
                  <option key={ent.id || ent.name} value={ent.name}>
                    [{ent.code || 'ENT-000'}] {ent.name} • {ent.cinturaType} ({ent.isCustomCode ? 'Puesto x área UDP' : 'Puesto x defecto'})
                  </option>
                ))}
              </select>
            </div>

            {/* Preview Card of Measurements */}
            {selectedEntalleObj && (
              <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-black text-gray-900 uppercase">
                      {selectedEntalleObj.name}
                    </span>
                    <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {selectedEntalleObj.code || 'ENT-000'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700">
                      ({selectedEntalleObj.cinturaType})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedEntalleObj.isCustomCode ? (
                      <span className="text-[9.5px] font-black text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                        Código de entalle puesto x el área UDP
                      </span>
                    ) : (
                      <span className="text-[9.5px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        Código de entalle puesto x defecto
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-gray-400 font-mono">
                      Base: Talla {selectedEntalleObj.baseSize || '32'} • {selectedEntalleObj.tela} ({selectedEntalleObj.tipoTela})
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Cintura</p>
                    <p className="text-xs font-black text-slate-900 mt-0.5">{selectedEntalleObj.cintura || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Cadera</p>
                    <p className="text-xs font-black text-slate-900 mt-0.5">{selectedEntalleObj.cadera || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Muslo</p>
                    <p className="text-xs font-black text-slate-900 mt-0.5">{selectedEntalleObj.muslo || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Rodilla</p>
                    <p className="text-xs font-black text-slate-900 mt-0.5">{selectedEntalleObj.rodilla || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Botapie</p>
                    <p className="text-xs font-black text-slate-900 mt-0.5">{selectedEntalleObj.botaPie || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase">T.Delt.</p>
                    <p className="text-xs font-black text-slate-900 mt-0.5">{selectedEntalleObj.tiroDel || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase">T.Espd.</p>
                    <p className="text-xs font-black text-slate-900 mt-0.5">{selectedEntalleObj.tiroPos || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Largo</p>
                    <p className="text-xs font-black text-slate-900 mt-0.5">{selectedEntalleObj.largoTotal || '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FICHA TÉCNICA */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Ficha Técnica / Características
            </label>
            <textarea
              rows={3}
              value={characteristics}
              onChange={e => setCharacteristics(e.target.value)}
              placeholder="Detalles de tela, avíos, puntadas, medidas críticas..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* DESCRIPCIÓN */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Descripción / Notas Generales
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Notas generales o contexto..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* FOTOS Y EVIDENCIAS CON SUBIDA DESDE CELULAR / PC */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Fotos y Evidencias
              </label>
              <p className="text-xs text-gray-400 font-bold mt-0.5">
                Sube fotos directamente desde la cámara o galería de tu celular o desde tu PC
              </p>
            </div>

            <input
              type="file"
              id="edit-sample-file-upload"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
              disabled={isUploadingImage}
            />

            <label
              htmlFor="edit-sample-file-upload"
              className={`w-full border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                isUploadingImage
                  ? 'bg-indigo-50/60 border-indigo-300 cursor-wait'
                  : 'bg-gray-50/60 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/30'
              }`}
            >
              {isUploadingImage ? (
                <>
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-xs font-black text-indigo-600 uppercase tracking-wider">Subiendo foto(s)...</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-black text-gray-900 uppercase">
                    📷 Seleccionar / Tomar Foto (Celular o PC)
                  </p>
                </>
              )}
            </label>

            {/* PREVIEWS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              {images.map((img, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-2xl relative group overflow-hidden border border-gray-200 shadow-sm">
                  <img src={getImageUrl(img)} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg transition active:scale-90"
                    title="Eliminar foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* MATERIALES / REQUERIMIENTOS */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Requerimientos de Materiales / Insumos
              </label>
              <p className="text-xs text-gray-400 font-bold mt-0.5">
                Busca en inventario con fotos o agrega insumos manuales
              </p>
            </div>

            {/* BUSCADOR */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                <input
                  type="text"
                  placeholder="Buscar insumos en inventario (nombre o SKU)..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3 font-bold text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={searchQuery}
                  onChange={e => handleSearchMaterials(e.target.value)}
                />
              </div>

              {searchResults.length > 0 && (
                <div className="absolute z-20 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto p-2 space-y-1">
                  {searchResults.map(prod => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleSelectMaterialProduct(prod)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition text-left group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 overflow-hidden border border-gray-100 shrink-0">
                          {prod.imageUrl ? (
                            <img src={getImageUrl(prod.imageUrl)} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <Box className="w-5 h-5 text-indigo-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-gray-900 text-xs uppercase truncate">{prod.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 font-mono tracking-tighter uppercase">{prod.sku} • S/ {prod.purchasePrice}</p>
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* MANUAL MATERIAL */}
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Otro insumo manual..."
                className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
                value={customMatName}
                onChange={e => setCustomMatName(e.target.value)}
              />
              <button
                type="button"
                onClick={addCustomMaterial}
                className="px-4 py-2.5 rounded-xl text-xs font-black bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                + Manual
              </button>
            </div>

            {/* LIST OF MATERIALS */}
            {materials.length > 0 && (
              <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Material</th>
                      <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center w-24">Cantidad</th>
                      <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center w-28">Precio Unit.</th>
                      <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right w-24">Total</th>
                      <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/20">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100 shrink-0">
                              {m.imageUrl ? (
                                <img src={getImageUrl(m.imageUrl)} alt={m.name} className="w-full h-full object-cover" />
                              ) : (
                                <Box className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 text-[11px] uppercase truncate">{m.name}</p>
                              <p className="text-[8.5px] font-bold text-indigo-500 uppercase">
                                {m.productId ? 'Inventario' : 'Manual'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={m.quantity}
                            onChange={e => updateMaterialQty(i, parseFloat(e.target.value) || 1)}
                            className="w-16 bg-gray-50 border border-gray-100 rounded-lg py-1 px-1.5 font-black text-[11px] text-center outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center justify-center bg-gray-50 border border-gray-100 rounded-lg py-1 px-1.5 w-20 mx-auto">
                            <span className="text-[9px] font-black text-emerald-600 mr-1">S/</span>
                            <input
                              type="number"
                              step="0.01"
                              value={m.unitPriceAtTime}
                              onChange={e => updateMaterialPrice(i, parseFloat(e.target.value) || 0)}
                              className="w-12 bg-transparent font-black text-center outline-none text-emerald-600 text-[11px]"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-gray-900 text-[11px]">
                          S/ {(m.quantity * m.unitPriceAtTime).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeMaterial(i)}
                            className="p-1 text-rose-400 hover:text-rose-600 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* FOOTER */}
        <div className="p-4 md:px-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3.5 bg-gray-200 text-gray-700 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-gray-300 transition"
          >
            Cancelar
          </button>

          <button
            onClick={handleSaveAndResubmit}
            disabled={isSaving}
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-200 transition active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar y Reenviar a Comercial
              </>
            )}
          </button>
        </div>

      </div>

      {pendingVariantProduct && (
        <SelectVariantModal
          product={pendingVariantProduct}
          onSelectVariant={(variant) => applyAddMaterial(pendingVariantProduct, variant)}
          onClose={() => setPendingVariantProduct(null)}
        />
      )}
    </div>
  );
}
