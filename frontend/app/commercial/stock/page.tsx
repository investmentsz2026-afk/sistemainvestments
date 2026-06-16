'use client';

import { useState, useMemo } from 'react';
import { Layout } from '../../../components/common/Layout';
import { useProducts } from '../../../hooks/useProducts';
import { Search, Package, MapPin, Eye, Filter, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StockQueryPage() {
    const { products, isLoading, error } = useProducts();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');

    // Standard size sort order helper
    const sizeSortOrder = ['28', 'S', '30', 'M', '32', 'L', '34', 'XL', '36', 'XXL', '38', '40', '42', '44', '46'];
    
    const sortSizes = (sizes: string[]) => {
        return [...sizes].sort((a, b) => {
            const indexA = sizeSortOrder.indexOf(a.trim().toUpperCase());
            const indexB = sizeSortOrder.indexOf(b.trim().toUpperCase());
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    };

    // Extract categories
    const categories = useMemo(() => {
        if (!products) return [];
        const cats = products
            .filter(p => p.inventoryType === 'TERMINADOS' && p.isActive)
            .map(p => p.category);
        return Array.from(new Set(cats));
    }, [products]);

    // Filter products
    const filteredProducts = useMemo(() => {
        if (!products) return [];
        return products.filter(p => {
            const matchesSearch = 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (p.op && p.op.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesCategory = 
                selectedCategory === 'ALL' || p.category === selectedCategory;

            return p.inventoryType === 'TERMINADOS' && p.isActive && matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, selectedCategory]);

    const cardClass = "bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden";

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 md:px-0">
                {/* HEADER */}
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Consulta de Stock Comercial</h1>
                    <p className="text-gray-500 font-medium text-lg mt-1">
                        Consulta rápida de inventario por modelo, color y talla en tiempo real.
                    </p>
                </div>

                {/* FILTERS PANEL */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/10 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative group w-full md:max-w-xl">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition" />
                        <input
                            type="text"
                            placeholder="Buscar modelo o SKU..."
                            className="w-full pl-16 pr-6 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:bg-white focus:border-indigo-500 transition font-semibold text-gray-900"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <select
                                className="w-full pl-11 pr-8 py-4 bg-gray-50 border border-transparent rounded-2xl font-bold text-gray-700 outline-none focus:ring-4 focus:ring-indigo-50 focus:bg-white transition cursor-pointer appearance-none"
                                value={selectedCategory}
                                onChange={e => setSelectedCategory(e.target.value)}
                            >
                                <option value="ALL">Todas las Categorías</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* PRODUCTS STOCK LIST */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-4">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                        <p className="text-indigo-600 font-black uppercase tracking-widest text-xs">Cargando inventario comercial...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20 bg-red-50 rounded-[2rem] border border-red-200 text-red-600 font-bold">
                        Error al cargar la información del inventario. Por favor, intente de nuevo.
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200 text-gray-400 font-black uppercase tracking-widest text-xs">
                        No se encontraron modelos con los filtros seleccionados
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-8">
                        {filteredProducts.map(product => {
                            // Extract unique sizes and colors from variants
                            const uniqueColors = Array.from(new Set(product.variants.map(v => v.color)));
                            const uniqueSizes = sortSizes(Array.from(new Set(product.variants.map(v => v.size))));
                            const totalProductStock = product.variants.reduce((acc, v) => acc + v.stock, 0);

                            return (
                                <motion.div
                                    key={product.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cardClass}
                                >
                                    {/* Product Header */}
                                    <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100">
                                                <Package className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{product.name}</h3>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-black text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                        SKU: {product.sku || 'N/A'}
                                                    </span>
                                                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                        {product.category}
                                                    </span>
                                                    {product.op && (
                                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                            OP: {product.op}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Total Disponible</p>
                                            <p className={`text-3xl font-black mt-0.5 ${totalProductStock > product.minStock ? 'text-emerald-600' : totalProductStock > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                                                {totalProductStock} <span className="text-sm font-bold text-gray-500">unidades</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Product Variants Matrix */}
                                    <div className="p-8 overflow-x-auto">
                                        {product.variants.length === 0 ? (
                                            <div className="py-10 text-center text-xs text-gray-400 font-bold uppercase tracking-widest italic">
                                                No hay variantes o tallas registradas para este producto
                                            </div>
                                        ) : (
                                            <table className="w-full text-left min-w-[600px]">
                                                <thead>
                                                    <tr className="border-b border-gray-100">
                                                        <th className="pb-4 font-black text-[10px] text-gray-400 uppercase tracking-widest w-1/4">Color</th>
                                                        {uniqueSizes.map(size => (
                                                            <th key={size} className="pb-4 text-center font-black text-[10px] text-gray-400 uppercase tracking-widest">
                                                                {size}
                                                            </th>
                                                        ))}
                                                        <th className="pb-4 text-right font-black text-[10px] text-gray-400 uppercase tracking-widest w-24">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {uniqueColors.map(color => {
                                                        const colorVariants = product.variants.filter(v => v.color === color);
                                                        const colorTotalStock = colorVariants.reduce((acc, v) => acc + v.stock, 0);

                                                        return (
                                                            <tr key={color} className="hover:bg-gray-50/30 transition-colors">
                                                                <td className="py-4 font-black text-gray-800 uppercase tracking-wider text-xs">
                                                                    {color}
                                                                </td>
                                                                {uniqueSizes.map(size => {
                                                                    const variant = colorVariants.find(v => v.size === size);
                                                                    const stock = variant ? variant.stock : null;

                                                                    return (
                                                                        <td key={size} className="py-4 text-center font-semibold text-sm">
                                                                            {stock === null ? (
                                                                                <span className="text-gray-300">-</span>
                                                                            ) : stock === 0 ? (
                                                                                <span className="text-red-400 font-bold">0</span>
                                                                            ) : (
                                                                                <span className="text-emerald-600 font-black">{stock}</span>
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="py-4 text-right font-black text-xs text-indigo-600">
                                                                    {colorTotalStock}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
}

// Simple loader helper since we don't have it imported from a file
function Loader2({ className }: { className?: string }) {
    return (
        <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    );
}
