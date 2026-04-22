// frontend/components/products/ProductForm.tsx
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductBarcode } from './Barcode';
import { Plus, Trash2, Save, Package, DollarSign, Layers, Tag, Palette, Ruler, Hash, Info, TrendingUp, AlertCircle, ChevronRight, Barcode, ClipboardCheck } from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  category: z.string().min(1, 'La categoría es requerida'),
  inventoryType: z.string().min(1, 'El tipo de inventario es requerido'),
  description: z.string().optional(),
  sku: z.string().optional(),
  op: z.string().optional(),
  purchasePrice: z.number().min(0.01, 'El precio de compra debe ser mayor a 0'),
  sellingPrice: z.number().min(0, 'El precio de venta debe ser mayor o igual a 0'),
  minStock: z.number().min(0, 'El stock mínimo debe ser mayor o igual a 0').default(5),
  variants: z.array(z.object({
    id: z.string().optional(),
    size: z.string().optional(),
    color: z.string().min(1, 'El color es requerido'),
    initialStock: z.number().min(0, 'El stock inicial debe ser mayor o igual a 0').default(0),
    variantSku: z.string().optional(),
  })).min(1, 'Debe agregar al menos una variante'),
  purchaseItemId: z.string().optional(),
}).superRefine((data, ctx) => {
  const isMaterialOrMachinery = ['MATERIALES', 'MAQUINARIA', 'AVIOS'].includes(data.inventoryType);

  // Validar precio de venta solo si NO es material/maquinaria
  if (!isMaterialOrMachinery && data.sellingPrice <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El precio de venta es requerido para este tipo de producto',
      path: ['sellingPrice'],
    });
  }

  // Validar talla solo si NO es material/maquinaria
  if (!isMaterialOrMachinery) {
    data.variants.forEach((variant, index) => {
      if (!variant.size || variant.size.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La talla es requerida',
          path: ['variants', index, 'size'],
        });
      }
    });
  }
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  onSubmit: (data: ProductFormData) => void;
  initialData?: any;
  isLoading?: boolean;
  isEditing?: boolean;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  onSubmit,
  initialData,
  isLoading,
  isEditing = false,
}) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || {
      name: '',
      category: '',
      inventoryType: 'TERMINADOS',
      description: '',
      sku: '',
      op: '',
      purchasePrice: 0,
      sellingPrice: 0,
      minStock: 5,
      variants: [{ size: '', color: '', initialStock: 0 }],
    },
  });

  // Reset form when initialData changes (e.g., when importing from purchases)
  React.useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  });

  const watchPurchasePrice = watch('purchasePrice');
  const watchSellingPrice = watch('sellingPrice');
  const watchInventoryType = watch('inventoryType');
  const watchSku = watch('sku');

  const isMaterialOrMachinery = ['MATERIALES', 'MAQUINARIA', 'AVIOS'].includes(watchInventoryType);

  const margin = watchPurchasePrice > 0 && watchSellingPrice > 0
    ? ((watchSellingPrice - watchPurchasePrice) / watchPurchasePrice * 100)
    : 0;

  // Si cambia a material/maquinaria, limpiar campos que se ocultan
  React.useEffect(() => {
    if (isMaterialOrMachinery) {
      setValue('sellingPrice', 0);
      const currentVariants = watch('variants');
      currentVariants.forEach((_, idx) => {
        setValue(`variants.${idx}.size`, 'N/A');
      });
    } else {
      // Si vuelve a ser producto, quitar el N/A si estaba antes
      const currentVariants = watch('variants');
      currentVariants.forEach((v, idx) => {
        if (v.size === 'N/A') setValue(`variants.${idx}.size`, '');
      });
    }
  }, [isMaterialOrMachinery, setValue]);

  const inputBase = "w-full px-4 py-3 border rounded-xl text-sm font-medium text-gray-800 placeholder-gray-300 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all duration-200 bg-white hover:border-gray-400";
  const inputError = "border-red-300 focus:ring-red-500/40 focus:border-red-400 bg-red-50/30";
  const inputNormal = "border-gray-200";
  const labelClass = "flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ── Información Básica ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Información Básica</h2>
              <p className="text-[10px] text-gray-400">Datos principales del producto</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nombre */}
            <div className="md:col-span-2">
              <label className={labelClass}>
                <Tag className="w-3.5 h-3.5" />
                Nombre del Producto <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                className={`${inputBase} ${errors.name ? inputError : inputNormal}`}
                placeholder="Ej: Jeans Skinny Fit Premium"
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.name.message}
                </p>
              )}
            </div>

            {/* Categoría */}
            <div>
              <label className={labelClass}>
                <Layers className="w-3.5 h-3.5" />
                Categoría <span className="text-red-400">*</span>
              </label>
              <select
                {...register('category')}
                className={`${inputBase} cursor-pointer appearance-none ${errors.category ? inputError : inputNormal}`}
              >
                <option value="">Seleccionar categoría</option>
                <option value="Jeans">👖 Jeans</option>
                <option value="Pantalones">👔 Pantalones</option>
                <option value="Camisas">👕 Camisas</option>
                <option value="Camisetas">🎽 Camisetas</option>
                <option value="Chaquetas">🧥 Chaquetas</option>
                <option value="Vestidos">👗 Vestidos</option>
                <option value="Faldas">🩳 Faldas</option>
                <option value="Shorts">🩳 Shorts</option>
                <option value="Deportivo">🏃 Deportivo</option>
                <option value="Formal">🤵 Formal</option>
              </select>
              {errors.category && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.category.message}
                </p>
              )}
            </div>

            {/* Tipo de Inventario */}
            <div>
              <label className={labelClass}>
                <Package className="w-3.5 h-3.5" />
                Tipo de Inventario <span className="text-red-400">*</span>
              </label>
              <select
                {...register('inventoryType')}
                className={`${inputBase} cursor-pointer appearance-none ${errors.inventoryType ? inputError : inputNormal}`}
              >
                <option value="TERMINADOS">📦 Productos Terminados</option>
                <option value="PROCESO">⏳ Productos en Proceso</option>
                <option value="SEGUNDA">♻️ Productos de Segunda</option>
                <option value="MATERIALES">🧱 Materiales</option>
                <option value="MAQUINARIA">⚙️ Maquinaria</option>
                <option value="AVIOS">🧷 Avíos</option>
                <option value="OTROS">📋 Otros</option>
              </select>
              {errors.inventoryType && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.inventoryType.message}
                </p>
              )}
            </div>

            {/* Stock Mínimo */}
            <div>
              <label className={labelClass}>
                <Hash className="w-3.5 h-3.5" />
                Stock Mínimo
              </label>
              <input
                type="number"
                {...register('minStock', { valueAsNumber: true })}
                className={`${inputBase} ${inputNormal}`}
                placeholder="5"
                min="0"
              />
              <p className="mt-1.5 text-[10px] text-gray-400 flex items-center gap-1">
                <Info className="w-3 h-3" /> Alerta cuando el stock baje de este número
              </p>
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label className={labelClass}>
                <Info className="w-3.5 h-3.5" />
                Descripción
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className={`${inputBase} ${inputNormal} resize-none`}
                placeholder="Descripción detallada del producto (opcional)"
              />
            </div>

            {/* SKU */}
            <div>
              <label className={labelClass}>
                <Tag className="w-3.5 h-3.5" />
                SKU (Manual / Auto)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  {...register('sku')}
                  className={`${inputBase} ${inputNormal} font-mono`}
                  placeholder="Ej: ABC-123 (Opcional)"
                />
                {watchSku && watchSku.length > 2 && (
                  <div className="flex flex-col items-center p-2 bg-white rounded-xl border border-gray-100 shadow-sm max-w-[150px]">
                    <ProductBarcode value={watchSku} displayValue={false} height={25} width={1} />
                    <span className="text-[8px] font-black text-gray-400 mt-1 uppercase truncate w-full text-center">{watchSku}</span>
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-[10px] text-gray-400 flex items-center gap-1 font-bold uppercase tracking-widest">
                <Info className="w-3 h-3" /> Dejar vacío para generarlo automáticamente
              </p>
            </div>

            {/* Orden de Producción (OP) - Condicional */}
            {['TERMINADOS', 'PROCESO', 'SEGUNDA'].includes(watchInventoryType) && (
              <div>
                <label className={labelClass}>
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Orden de Producción (OP)
                </label>
                <input
                  type="text"
                  {...register('op')}
                  className={`${inputBase} ${inputNormal} font-mono uppercase`}
                  placeholder="Ej: OP-2024-001"
                />
                <p className="mt-1.5 text-[10px] text-indigo-500 flex items-center gap-1 font-bold uppercase tracking-widest">
                  <Info className="w-3 h-3" /> Referencia obligatoria para trazabilidad de lote
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Precios ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 to-green-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Precios</h2>
              <p className="text-[10px] text-gray-400">Define los precios de compra y venta</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Precio de Compra */}
            <div>
              <label className={labelClass}>
                <DollarSign className="w-3.5 h-3.5" />
                {['TERMINADOS', 'PROCESO', 'SEGUNDA'].includes(watchInventoryType) ? 'Costo de Producción' : 'Precio de Compra'} <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">S/</span>
                <input
                  type="number"
                  step="0.01"
                  {...register('purchasePrice', { valueAsNumber: true })}
                  className={`${inputBase} pl-10 ${errors.purchasePrice ? inputError : inputNormal}`}
                  placeholder="0.00"
                  min="0"
                />
              </div>
              {errors.purchasePrice && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.purchasePrice.message}
                </p>
              )}
            </div>

            {/* Precio de Venta */}
            {!isMaterialOrMachinery && (
              <div>
                <label className={labelClass}>
                  <DollarSign className="w-3.5 h-3.5" />
                  Precio de Venta <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    {...register('sellingPrice', { valueAsNumber: true })}
                    className={`${inputBase} pl-10 ${errors.sellingPrice ? inputError : inputNormal}`}
                    placeholder="0.00"
                    min="0"
                  />
                </div>
                {errors.sellingPrice && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.sellingPrice.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Margen de Ganancia - Solo si no es material/maquinaria */}
      {!isMaterialOrMachinery && watchPurchasePrice > 0 && watchSellingPrice > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 -mt-3">
          <div className={`flex items-center justify-between p-4 rounded-xl border ${margin > 0
            ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200'
            : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
            }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${margin > 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                <TrendingUp className={`w-4 h-4 ${margin > 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Margen de ganancia estimado</p>
                <p className={`text-lg font-black ${margin > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  S/ {(watchSellingPrice - watchPurchasePrice).toFixed(2)}
                </p>
              </div>
            </div>
            <div className={`text-right px-4 py-2 rounded-xl ${margin > 0 ? 'bg-emerald-100/80' : 'bg-red-100/80'}`}>
              <p className={`text-xl font-black ${margin > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {margin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Variantes ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50/50 to-purple-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Layers className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Variantes</h2>
                <p className="text-[10px] text-gray-400">Tallas, colores y stock por cada variante</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => append({ size: isMaterialOrMachinery ? 'N/A' : '', color: '', initialStock: 0 })}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/30 hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              Agregar Variante
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="group relative bg-gradient-to-br from-gray-50/80 to-slate-50/50 p-5 rounded-xl border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-black text-violet-600">{index + 1}</span>
                  </div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Variante #{index + 1}
                  </h3>
                  {isEditing && (field as any).id && (
                    <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                      Existente
                    </span>
                  )}
                  {isEditing && !(field as any).id && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                      Nueva
                    </span>
                  )}
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title={isEditing && (field as any).id ? 'Eliminar esta variante' : 'Remover variante'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ID de variante (oculto) */}
                {isEditing && (field as any).id && (
                  <input
                    type="hidden"
                    {...register(`variants.${index}.id`)}
                  />
                )}

                {/* Talla */}
                {!isMaterialOrMachinery && (
                  <div>
                    <label className={labelClass}>
                      <Ruler className="w-3.5 h-3.5" />
                      Talla <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      {...register(`variants.${index}.size`)}
                      className={`${inputBase} ${errors.variants?.[index]?.size ? inputError : inputNormal}`}
                      placeholder="S, M, L, XL, 28..."
                    />
                    {errors.variants?.[index]?.size && (
                      <p className="mt-1 text-[10px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.variants[index]?.size?.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Color */}
                <div>
                  <label className={labelClass}>
                    <Palette className="w-3.5 h-3.5" />
                    Color <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    {...register(`variants.${index}.color`)}
                    className={`${inputBase} ${errors.variants?.[index]?.color ? inputError : inputNormal}`}
                    placeholder="Negro, Azul, Rojo..."
                  />
                  {errors.variants?.[index]?.color && (
                    <p className="mt-1 text-[10px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.variants[index]?.color?.message}
                    </p>
                  )}
                </div>

                {/* Stock Inicial / Stock Actual */}
                <div>
                  <label className={labelClass}>
                    <Hash className="w-3.5 h-3.5" />
                    {isEditing ? 'Stock Actual' : 'Stock Inicial'}
                  </label>
                  <input
                    type="number"
                    {...register(`variants.${index}.initialStock`, { valueAsNumber: true })}
                    className={`${inputBase} ${inputNormal}`}
                    placeholder="0"
                    min="0"
                  />
                </div>

                {/* SKU de variante */}
                <div className="md:col-span-3 pb-2 pt-2 border-t border-dashed border-gray-100 mt-2">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <label className={labelClass}>
                        <Tag className="w-3.5 h-3.5" />
                        SKU Específico de Variante
                      </label>
                      <input
                        type="text"
                        {...register(`variants.${index}.variantSku`)}
                        className={`${inputBase} ${inputNormal} font-mono text-xs`}
                        placeholder="Ej: ABC-123-S (Dejar vacío para auto)"
                      />
                    </div>
                    {(() => {
                      const vSku = watch(`variants.${index}.variantSku`);
                      return vSku && vSku.length > 2 ? (
                        <div className="flex flex-col items-center p-2 bg-white rounded-xl border border-gray-100 shadow-sm min-w-[120px]">
                          <ProductBarcode value={vSku} displayValue={false} height={20} width={0.9} />
                          <span className="text-[7px] font-black text-gray-400 mt-0.5 uppercase tracking-tighter">{vSku}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {errors.variants && !Array.isArray(errors.variants) && (
          <div className="px-6 pb-4">
            <p className="text-sm text-red-500 flex items-center gap-1.5 bg-red-50 p-3 rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4" /> {errors.variants.message}
            </p>
          </div>
        )}
      </div>

      {/* ── Botones de Acción ── */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {isEditing ? 'Actualizando...' : 'Guardando...'}
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {isEditing ? 'Actualizar Producto' : 'Guardar Producto'}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};