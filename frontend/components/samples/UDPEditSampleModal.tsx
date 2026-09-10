'use client';

import React, { useState } from 'react';
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
  Upload
} from 'lucide-react';
import api from '../../lib/axios';
import { getImageUrl } from '../../lib/imageUrl';
import toast from 'react-hot-toast';

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

  const addMaterial = (prod: any) => {
    if (materials.some(m => m.productId === prod.id)) {
      toast.error('Este material ya está en la lista');
      return;
    }
    setMaterials(prev => [
      ...prev,
      {
        productId: prod.id,
        name: prod.name,
        imageUrl: prod.imageUrl,
        sku: prod.sku,
        quantity: 1,
        unitPriceAtTime: prod.purchasePrice || 0,
        customMaterial: null
      }
    ]);
    setSearchQuery('');
    setSearchResults([]);
    toast.success(`${prod.name} añadido`);
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
                      onClick={() => addMaterial(prod)}
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
    </div>
  );
}
