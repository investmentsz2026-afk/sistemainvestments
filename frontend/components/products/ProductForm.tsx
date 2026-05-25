// frontend/components/products/ProductForm.tsx
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductBarcode } from './Barcode';
import { Plus, Trash2, Save, Package, DollarSign, Layers, Tag, Palette, Ruler, Hash, Info, TrendingUp, AlertCircle, ChevronRight, Barcode, ClipboardCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';

const getProductSchema = (isEditing: boolean) => z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  category: z.string().min(1, 'La categoría es requerida'),
  inventoryType: z.string().min(1, 'El tipo de inventario es requerido'),
  description: z.string().optional(),
  sku: z.string().optional(),
  op: z.string().optional(),
  purchasePrice: z.number().min(0, 'El precio de compra debe ser mayor o igual a 0').optional().default(0.1),
  sellingPrice: z.number().min(0, 'El precio de venta debe ser mayor o igual a 0').optional().default(0.1),
  minStock: z.number().min(0, 'El stock mínimo debe ser mayor o igual a 0').default(5),
  sizes: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  purchaseItemId: z.string().optional(),
  opVariants: z.record(z.array(z.string())).optional(),
  importedStockQuantities: z.record(z.record(z.number())).optional(),
  variants: z.array(z.object({
    id: z.string().optional(),
    size: z.string(),
    color: z.string(),
    stock: z.number().optional(),
    initialStock: z.number().optional(),
    variantSku: z.string().optional(),
  })).optional(),
}).superRefine((data, ctx) => {
  const isMaterialOrMachinery = ['MATERIALES', 'MAQUINARIA', 'AVIOS'].includes(data.inventoryType);
  const showPrices = isMaterialOrMachinery || !!data.op || !!data.purchaseItemId;

  // Validar precio de venta solo si NO es material/maquinaria y showPrices es true
  if (showPrices && !isMaterialOrMachinery && (!data.sellingPrice || data.sellingPrice <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El precio de venta es requerido para este tipo de producto',
      path: ['sellingPrice'],
    });
  }

  // Validar precio de compra solo si showPrices es true
  if (showPrices && (!data.purchasePrice || data.purchasePrice < 0.01)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El precio de compra debe ser mayor a 0',
      path: ['purchasePrice'],
    });
  }

  // Validar tallas y colores solo si NO es material/maquinaria
  if (!isMaterialOrMachinery) {
    if (!data.sizes || data.sizes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe seleccionar al menos una talla',
        path: ['sizes'],
      });
    }
    if (!data.colors || data.colors.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe ingresar al menos un color',
        path: ['colors'],
      });
    }
    if (data.op && data.opVariants && Object.keys(data.opVariants).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe configurar las combinaciones de la OP',
        path: ['opVariants'],
      });
    }
  }
});

type ProductFormData = z.infer<ReturnType<typeof getProductSchema>>;

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
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(getProductSchema(isEditing)),
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
      sizes: [],
      colors: [],
    },
  });

  // Reset form when initialData changes (e.g., when importing from purchases)
  React.useEffect(() => {
    if (initialData) {
      const dataToReset = { ...initialData };
      if (initialData.variants && (!initialData.sizes || !initialData.colors)) {
        dataToReset.sizes = Array.from(new Set(initialData.variants.map((v: any) => v.size).filter(Boolean))) as string[];
        dataToReset.colors = Array.from(new Set(initialData.variants.map((v: any) => v.color).filter(Boolean))) as string[];
      }
      if (initialData.variants && !initialData.opVariants) {
        const opVariants: Record<string, string[]> = {};
        initialData.variants.forEach((v: any) => {
          if (v.size && v.color) {
            if (!opVariants[v.size]) {
              opVariants[v.size] = [];
            }
            if (!opVariants[v.size].includes(v.color)) {
              opVariants[v.size].push(v.color);
            }
          }
        });
        dataToReset.opVariants = opVariants;
      }
      reset(dataToReset);
    }
  }, [initialData, reset]);

  const watchPurchasePrice = watch('purchasePrice');
  const watchSellingPrice = watch('sellingPrice');
  const watchInventoryType = watch('inventoryType');

  const isMaterialOrMachinery = ['MATERIALES', 'MAQUINARIA', 'AVIOS'].includes(watchInventoryType);

  const margin = watchPurchasePrice > 0 && watchSellingPrice > 0
    ? ((watchSellingPrice - watchPurchasePrice) / watchPurchasePrice * 100)
    : 0;

  const AVAILABLE_SIZES = ['28', '30', '32', '34', '36', '38', '40', '42', '44', '46'];

  const watchSizes = watch('sizes') || [];
  const watchColors = watch('colors') || [];
  const watchOp = watch('op');
  const watchOpVariants = watch('opVariants') || {};
  const watchImportedStockQuantities = watch('importedStockQuantities') || {};
  const showPrices = isMaterialOrMachinery || !!watchOp || !!watch('purchaseItemId');

  const [colorInput, setColorInput] = React.useState('');
  const [showOpConfigModal, setShowOpConfigModal] = React.useState(false);
  const [localOpVariants, setLocalOpVariants] = React.useState<Record<string, string[]>>({});
  const [localImportedStockQuantities, setLocalImportedStockQuantities] = React.useState<Record<string, Record<string, number>>>({});

  const [importedMetadata, setImportedMetadata] = React.useState<{
    quality: string;
    items: Array<{ size: string; quantity: number }>;
  } | null>(null);

  React.useEffect(() => {
    if (initialData?.importedItems) {
      setImportedMetadata({
        quality: initialData.importedQuality || '',
        items: initialData.importedItems
      });

      // Automatically set form sizes to the imported sizes
      const importedSizes = initialData.importedItems.map((item: any) => item.size);
      setValue('sizes', importedSizes);

      // Set default quantities if colors are available
      if (initialData.colors && initialData.colors.length > 0 && !watch('importedStockQuantities')) {
        const defaultQuantities: Record<string, Record<string, number>> = {};
        initialData.importedItems.forEach((item: any) => {
          defaultQuantities[item.size] = { [initialData.colors[0]]: item.quantity };
        });
        setValue('importedStockQuantities', defaultQuantities);
      }
    } else {
      setImportedMetadata(null);
    }
  }, [initialData]);

  const openOpConfig = () => {
    // Sync current checked sizes and colors to local state
    const currentOpVariants = { ...watchOpVariants };
    
    // Ensure all checked sizes exist in localOpVariants
    watchSizes.forEach(size => {
      if (!currentOpVariants[size]) {
        currentOpVariants[size] = [];
      }
      // Filter out any colors that are no longer in watchColors
      currentOpVariants[size] = currentOpVariants[size].filter(c => watchColors.includes(c));
    });
    
    // Remove sizes that are no longer checked
    Object.keys(currentOpVariants).forEach(size => {
      if (!watchSizes.includes(size)) {
        delete currentOpVariants[size];
      }
    });

    setLocalOpVariants(currentOpVariants);
    
    // Sync localImportedStockQuantities
    const initialQuantities: Record<string, Record<string, number>> = {};
    if (importedMetadata) {
      importedMetadata.items.forEach(item => {
        const sizeColors = currentOpVariants[item.size] || [];
        initialQuantities[item.size] = {};
        
        sizeColors.forEach(color => {
          const prevVal = (watchImportedStockQuantities[item.size] || {})[color];
          if (prevVal !== undefined) {
            initialQuantities[item.size][color] = prevVal;
          } else {
            initialQuantities[item.size][color] = 0;
          }
        });

        // Default the first color to the total quantity if all are 0
        const totalAssigned = Object.values(initialQuantities[item.size]).reduce((a, b) => a + b, 0);
        if (totalAssigned === 0 && sizeColors.length > 0) {
          initialQuantities[item.size][sizeColors[0]] = item.quantity;
        }
      });
    }
    setLocalImportedStockQuantities(initialQuantities);
    setShowOpConfigModal(true);
  };

  const handleSaveOpConfig = () => {
    const variantsPayload = Object.entries(localOpVariants)
      .map(([size, colors]) => ({ size, colors }))
      .filter(v => v.colors.length > 0);

    if (variantsPayload.length === 0) {
      toast.error('Debe seleccionar al menos una combinación de talla y color');
      return;
    }

    let finalOpVariants = { ...localOpVariants };

    if (importedMetadata) {
      for (const item of importedMetadata.items) {
        const sizeColors = finalOpVariants[item.size] || [];

        if (sizeColors.length === 0) {
          toast.error(`Debe seleccionar al menos un color para la talla importada (${item.size})`);
          return;
        }

        const sizeQuantities = localImportedStockQuantities[item.size] || {};
        const totalAssigned = sizeColors.reduce((sum, color) => sum + (sizeQuantities[color] || 0), 0);

        if (totalAssigned !== item.quantity) {
          toast.error(`La suma de cantidades para la Talla ${item.size} (${totalAssigned}) debe ser igual a la cantidad importada (${item.quantity})`);
          return;
        }
      }

      // Filter localImportedStockQuantities to only selected colors/sizes
      const filteredQuantities: Record<string, Record<string, number>> = {};
      importedMetadata.items.forEach(item => {
        const sizeColors = finalOpVariants[item.size] || [];
        filteredQuantities[item.size] = {};
        sizeColors.forEach(color => {
          filteredQuantities[item.size][color] = (localImportedStockQuantities[item.size] || {})[color] || 0;
        });
      });

      setValue('importedStockQuantities', filteredQuantities);
    }

    setValue('opVariants', finalOpVariants);
    setShowOpConfigModal(false);
    toast.success('Configuración de OP guardada');
  };

  const inputBase = "w-full px-4 py-3 border rounded-xl text-sm font-medium text-gray-800 placeholder-gray-300 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all duration-200 bg-white hover:border-gray-400";
  const inputError = "border-red-300 focus:ring-red-500/40 focus:border-red-400 bg-red-50/30";
  const inputNormal = "border-gray-200";
  const labelClass = "flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2";

  const handleSizeToggle = (size: string) => {
    const currentSizes = [...watchSizes];
    const idx = currentSizes.indexOf(size);
    if (idx > -1) {
      currentSizes.splice(idx, 1);
    } else {
      currentSizes.push(size);
    }
    setValue('sizes', currentSizes);
  };

  const handleColorAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = colorInput.trim();
      if (val && !watchColors.includes(val)) {
        setValue('colors', [...watchColors, val]);
        setColorInput('');
      }
    }
  };

  const handleColorRemove = (color: string) => {
    setValue('colors', watchColors.filter(c => c !== color));
  };

  const handleFormSubmit = (data: ProductFormData) => {
    const isMat = ['MATERIALES', 'MAQUINARIA', 'AVIOS'].includes(data.inventoryType);
    if (isMat) {
      data.sizes = ['ESTÁNDAR'];
      data.colors = ['ÚNICO'];
    }

    if (data.op && data.opVariants) {
      const existingVariants = data.variants || [];
      const nextVariants: any[] = [];

      Object.entries(data.opVariants).forEach(([size, colors]: [string, any]) => {
        colors.forEach((color: string) => {
          // Buscamos si ya existe esta combinación talla/color en las variantes originales
          const existing = existingVariants.find((v: any) => v.size === size && v.color === color);
          const importedQty = data.importedStockQuantities?.[size]?.[color] || 0;

          if (existing) {
            nextVariants.push({
              id: existing.id,
              size,
              color,
              stock: existing.stock !== undefined ? existing.stock : existing.initialStock,
              variantSku: existing.variantSku,
            });
          } else {
            nextVariants.push({
              size,
              color,
              initialStock: importedQty,
              stock: importedQty,
            });
          }
        });
      });

      data.variants = nextVariants;
    }

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
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

            {/* SKU Base (solo lectura en edición) */}
            {isEditing && watch('sku') && (
              <div>
                <label className={labelClass}>
                  <Barcode className="w-3.5 h-3.5 text-blue-500" />
                  SKU Base
                </label>
                <input
                  type="text"
                  value={watch('sku') || ''}
                  readOnly
                  className={`${inputBase} bg-gray-50 border-gray-200 cursor-not-allowed`}
                />
              </div>
            )}

            {/* Orden de Producción (solo lectura en edición) */}
            {isEditing && watch('op') && (
              <div>
                <label className={labelClass}>
                  <ClipboardCheck className="w-3.5 h-3.5 text-blue-500" />
                  Orden de Producción (OP)
                </label>
                <input
                  type="text"
                  value={watch('op') || ''}
                  readOnly
                  className={`${inputBase} bg-gray-50 border-gray-200 cursor-not-allowed`}
                />
              </div>
            )}

            {/* SKU and OP inputs removed because SKU is created through OP */}
          </div>
        </div>
      </div>

      {/* ── Precios ── */}
      {showPrices && (
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
                    <AlertCircle className="w-3 h-3" /> {(errors.purchasePrice as any).message}
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
                      <AlertCircle className="w-3 h-3" /> {(errors.sellingPrice as any).message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Margen de Ganancia - Solo si no es material/maquinaria */}
      {showPrices && !isMaterialOrMachinery && watchPurchasePrice > 0 && watchSellingPrice > 0 && (
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

      {/* ── Tallas y Colores ── */}
      {!isMaterialOrMachinery && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50/50 to-purple-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Layers className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Variantes Disponibles</h2>
                <p className="text-[10px] text-gray-400">Selecciona las tallas y colores que tendrá este producto</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Tallas Grid */}
            <div>
              <label className={labelClass}>
                <Ruler className="w-3.5 h-3.5" />
                Tallas Disponibles (Del 28 al 46) <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                {AVAILABLE_SIZES.map((size) => {
                  const isChecked = watchSizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleSizeToggle(size)}
                      className={`py-2 px-3 text-sm font-bold rounded-xl border transition-all ${
                        isChecked
                          ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              {errors.sizes && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.sizes.message}
                </p>
              )}
            </div>

            {/* Colores Tags */}
            <div>
              <label className={labelClass}>
                <Palette className="w-3.5 h-3.5" />
                Colores del Producto <span className="text-red-400">*</span>
              </label>
              
              {/* Tags Container */}
              {watchColors.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {watchColors.map((color) => (
                    <span
                      key={color}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 rounded-full text-xs font-bold transition-all"
                    >
                      {color}
                      <button
                        type="button"
                        onClick={() => handleColorRemove(color)}
                        className="w-4 h-4 rounded-full bg-gray-300 hover:bg-red-500 hover:text-white flex items-center justify-center text-[10px] transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <input
                type="text"
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                onKeyDown={handleColorAdd}
                className={inputBase}
                placeholder="Escribe un color y presiona Enter para agregarlo..."
              />
              <p className="mt-1.5 text-[10px] text-gray-400">
                Escribe un color (ej. Negro, Azul Marino, Celeste) y presiona **Enter**
              </p>
              {errors.colors && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.colors.message}
                </p>
              )}
            </div>

            {/* OP Configuration Section (Visible only when importing from OP) */}
            {watchOp && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 rounded-3xl p-6 space-y-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><ClipboardCheck className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Vincular a Orden de Producción (OP: {watchOp})</h4>
                      <p className="text-xs text-gray-500 font-medium">Asigna y autogenera SKUs únicos de 12 dígitos basados en la OP</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openOpConfig}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20"
                  >
                    <Plus className="w-4 h-4" /> Configurar OP
                  </button>
                </div>

                {/* Summary of current OP configuration */}
                {Object.keys(watchOpVariants).length > 0 ? (
                  <div className="bg-white/80 border border-blue-100 rounded-2xl p-4 text-xs space-y-2">
                    <p className="font-bold text-blue-800 uppercase tracking-wider text-[10px]">Configuración Guardada:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(watchOpVariants).map(([size, colors]: [string, any]) => {
                        if (colors.length === 0) return null;
                        return (
                          <div key={size} className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="font-black text-gray-700">Talla {size}:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {colors.map((c: string) => {
                                const sizeQuantities = watchImportedStockQuantities[size] || {};
                                const assignedQty = sizeQuantities[c] || 0;
                                return (
                                  <span key={c} className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    assignedQty > 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-100'
                                  }`}>
                                    {c} {assignedQty > 0 ? `(${assignedQty} uds)` : '(0 stock)'}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Debe hacer clic en <strong>Configurar OP</strong> para definir qué tallas y colores se generarán para esta OP.</span>
                  </div>
                )}
                {errors.opVariants && (
                  <p className="text-xs text-red-500 flex items-center gap-1 font-bold">
                    <AlertCircle className="w-3.5 h-3.5" /> {(errors.opVariants as any).message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Detalle de Variantes y SKUs (Solo Edición) ── */}
      {isEditing && watch('variants') && watch('variants')!.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Barcode className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Variantes y SKUs Registrados</h2>
                <p className="text-[10px] text-gray-400">Listado de combinaciones, códigos de barras y stock actual</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold text-gray-500">Talla</th>
                    <th className="pb-3 font-semibold text-gray-500">Color</th>
                    <th className="pb-3 font-semibold text-gray-500">SKU de Variante</th>
                    <th className="pb-3 font-semibold text-right text-gray-500">Stock Actual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {watch('variants')?.map((variant: any, idx: number) => {
                    const stock = variant.stock !== undefined ? variant.stock : variant.initialStock;
                    return (
                      <tr key={variant.id || idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 text-sm font-bold text-gray-800">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg text-xs font-black">
                            {variant.size}
                          </span>
                        </td>
                        <td className="py-3 text-sm font-bold text-gray-800 capitalize">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shrink-0" />
                            {variant.color}
                          </span>
                        </td>
                        <td className="py-3 text-sm font-mono font-bold text-blue-600">
                          <div className="flex items-center gap-1.5">
                            <Barcode className="w-4 h-4 text-gray-400" />
                            {variant.variantSku}
                          </div>
                        </td>
                        <td className="py-3 text-sm font-bold text-gray-800 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {stock || 0} uds
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* OP CONFIGURATION MODAL */}
      <AnimatePresence>
        {showOpConfigModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
              onClick={() => setShowOpConfigModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-white z-10 text-left"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Configurar OP: {watchOp}</h2>
                  <p className="text-xs font-bold text-blue-600 mt-1 uppercase tracking-widest">
                    Vincular Tallas, Colores y Autogenerar SKUs
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOpConfigModal(false)}
                  className="p-3 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition shadow-xl shadow-gray-200/30"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {/* Imported stock assignment banner */}
                {importedMetadata && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-left flex gap-4 text-xs text-amber-800 w-full">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-4">
                      <div>
                        <p className="font-black uppercase tracking-wider mb-1 text-sm text-amber-900">Distribución de Stock Importado</p>
                        <p className="font-medium text-amber-800/90 leading-relaxed">
                          Distribuye las unidades importadas de cada talla entre sus respectivos colores a producir:
                        </p>
                      </div>
                      
                      <div className="space-y-4 divide-y divide-amber-200/50">
                        {importedMetadata.items.map((item) => {
                          const sizeColors = localOpVariants[item.size] || [];
                          const sizeQuantities = localImportedStockQuantities[item.size] || {};

                          // Calculate sum of currently assigned quantities for this size
                          const sumAssigned = sizeColors.reduce((sum, color) => sum + (sizeQuantities[color] || 0), 0);
                          const isMatch = sumAssigned === item.quantity;

                          return (
                            <div key={item.size} className="pt-4 first:pt-0 space-y-2">
                              <p className="font-black text-amber-950 text-xs uppercase tracking-wider">
                                Talla {item.size} <span className="font-medium text-amber-800">({item.quantity} uds. importadas)</span>
                              </p>

                              {sizeColors.length === 0 ? (
                                <p className="text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200 mt-2">
                                  ⚠️ Selecciona al menos un color para la Talla {item.size} en la lista de abajo para asignarle stock.
                                </p>
                              ) : (
                                <div className="space-y-2 bg-white/70 p-3 rounded-2xl border border-amber-200/60 shadow-sm max-w-md">
                                  {sizeColors.map(color => (
                                    <div key={color} className="flex items-center justify-between gap-3 py-0.5">
                                      <span className="font-bold text-gray-700 capitalize flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-violet-500" />
                                        {color}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min="0"
                                          max={item.quantity}
                                          value={sizeQuantities[color] ?? 0}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            setLocalImportedStockQuantities(prev => {
                                              const sizeData = prev[item.size] || {};
                                              return {
                                                ...prev,
                                                [item.size]: {
                                                  ...sizeData,
                                                  [color]: isNaN(val) ? 0 : Math.max(0, val)
                                                }
                                              };
                                            });
                                          }}
                                          className="w-20 px-2 py-1.5 border border-gray-200 rounded-xl text-center font-bold text-gray-800 outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
                                          placeholder="0"
                                        />
                                        <span className="text-[10px] text-gray-400 font-bold">uds</span>
                                      </div>
                                    </div>
                                  ))}
                                  
                                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold mt-2">
                                    <span className="text-gray-500">Asignado:</span>
                                    <span className={isMatch ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                                      {sumAssigned} / {item.quantity} uds
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sizes and Colors Mapping grid */}
                <div className="space-y-4 divide-y divide-gray-100 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                  <h4 className="font-bold text-gray-900 text-sm">Combinaciones a Producir</h4>
                  {watchSizes.length > 0 ? (
                    watchSizes.map((size: string) => {
                      const sizeColors = localOpVariants[size] || [];
                      const allProductColors = watchColors || [];

                      return (
                        <div key={size} className="pt-4 first:pt-0 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-gray-700 bg-gray-100 px-3 py-1 rounded-xl">Talla {size}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const currentColors = localOpVariants[size] || [];
                                const nextColors = currentColors.length === allProductColors.length ? [] : [...allProductColors];
                                
                                setLocalOpVariants(prev => ({
                                  ...prev,
                                  [size]: nextColors
                                }));

                                // Sync imported quantities if it is an imported size
                                if (importedMetadata && importedMetadata.items.some(i => i.size === size)) {
                                  const targetItem = importedMetadata.items.find(i => i.size === size)!;
                                  setLocalImportedStockQuantities(prevQuantities => {
                                    const nextQuantities = { ...prevQuantities };
                                    const sizeData: Record<string, number> = {};
                                    nextColors.forEach(color => {
                                      sizeData[color] = (prevQuantities[size] || {})[color] || 0;
                                    });
                                    if (nextColors.length === 1) {
                                      sizeData[nextColors[0]] = targetItem.quantity;
                                    }
                                    nextQuantities[size] = sizeData;
                                    return nextQuantities;
                                  });
                                }
                              }}
                              className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                            >
                              {sizeColors.length === allProductColors.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {allProductColors.map((color: string) => {
                              const isChecked = sizeColors.includes(color);
                              return (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => {
                                    const currentColors = localOpVariants[size] || [];
                                    const updatedColors = currentColors.includes(color)
                                      ? currentColors.filter(c => c !== color)
                                      : [...currentColors, color];

                                    setLocalOpVariants(prev => ({
                                      ...prev,
                                      [size]: updatedColors
                                    }));

                                    // Sync imported quantities if it is an imported size
                                    if (importedMetadata && importedMetadata.items.some(i => i.size === size)) {
                                      const targetItem = importedMetadata.items.find(i => i.size === size)!;
                                      setLocalImportedStockQuantities(prevQuantities => {
                                        const nextQuantities = { ...prevQuantities };
                                        const sizeData = { ...(prevQuantities[size] || {}) };
                                        if (currentColors.includes(color)) {
                                          delete sizeData[color];
                                        } else {
                                          sizeData[color] = 0;
                                        }
                                        if (updatedColors.length === 1) {
                                          sizeData[updatedColors[0]] = targetItem.quantity;
                                        }
                                        nextQuantities[size] = sizeData;
                                        return nextQuantities;
                                      });
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                    isChecked
                                      ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  {color}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-gray-400 font-bold">Selecciona al menos una talla en el formulario principal.</p>
                  )}
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowOpConfigModal(false)}
                  className="px-6 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveOpConfig}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/25"
                >
                  Guardar Configuración
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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