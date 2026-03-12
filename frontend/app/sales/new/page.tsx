'use client';

import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../../components/common/Layout';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/axios';
import {
    ArrowLeft,
    Search,
    Plus,
    X,
    User,
    CreditCard,
    DollarSign,
    ShoppingBag,
    Trash2,
    Save,
    ChevronDown,
    Zap,
    Box,
    LayoutGrid,
    CheckCircle2,
    AlertCircle,
    ArrowUpRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function NewSalePage() {
    const { user } = useAuth();
    const router = useRouter();

    // Data from API
    const [products, setProducts] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [cart, setCart] = useState<any[]>([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [notes, setNotes] = useState('');

    // Search/UI States
    const [productSearch, setProductSearch] = useState('');
    const [showClientSearch, setShowClientSearch] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [pResp, cResp] = await Promise.all([
                api.get('/products'),
                api.get('/sales/clients')
            ]);
            setProducts(pResp.data.data || []);
            setClients(cResp.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredProducts = useMemo(() => {
        if (!productSearch) return products.slice(0, 8);
        return products.filter(p => 
            p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
            p.sku.toLowerCase().includes(productSearch.toLowerCase())
        ).slice(0, 8);
    }, [products, productSearch]);

    const addToCart = (product: any, variant: any) => {
        const existing = cart.find(item => item.variantId === variant.id);
        
        if (existing) {
            if (existing.quantity + 1 > variant.stock) {
                alert('Stock insuficiente');
                return;
            }
            setCart(cart.map(item => 
                item.variantId === variant.id 
                    ? { ...item, quantity: item.quantity + 1 } 
                    : item
            ));
        } else {
            if (variant.stock < 1) {
                alert('Producto sin stock');
                return;
            }
            setCart([...cart, {
                productId: product.id,
                variantId: variant.id,
                name: product.name,
                sku: product.sku,
                variantLabel: `${variant.size} / ${variant.color}`,
                unitPrice: product.sellingPrice,
                quantity: 1,
                maxStock: variant.stock
            }]);
        }
    };

    const removeFromCart = (variantId: string) => {
        setCart(cart.filter(item => item.variantId !== variantId));
    };

    const updateQuantity = (variantId: string, q: number) => {
        if (q < 1) return;
        setCart(cart.map(item => {
            if (item.variantId === variantId) {
                if (q > item.maxStock) return item;
                return { ...item, quantity: q };
            }
            return item;
        }));
    };

    const total = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

    const handleSubmit = async () => {
        if (cart.length === 0) {
            alert('El carrito está vacío');
            return;
        }

        setIsSaving(true);
        try {
            await api.post('/sales', {
                clientId: selectedClientId || null,
                items: cart,
                paymentMethod,
                invoiceNumber,
                notes
            });
            setShowSuccess(true);
            setTimeout(() => {
                router.push('/sales');
            }, 2000);
        } catch (error) {
            console.error('Error saving sale:', error);
            alert('Hubo un error al guardar la venta');
        } finally {
            setIsSaving(false);
        }
    };

    const selectedClient = clients.find(c => c.id === selectedClientId);

    if (showSuccess) {
        return (
            <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8">
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-8 shadow-2xl shadow-emerald-200"
                >
                    <CheckCircle2 className="w-12 h-12" />
                </motion.div>
                <h2 className="text-4xl font-black text-gray-900 uppercase mb-2">¡Venta Exitosa!</h2>
                <p className="text-gray-500 font-bold mb-8">El comprobante ha sido generado correctamente.</p>
                <div className="flex items-center gap-4">
                     <button className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold shadow-xl">Imprimir Ticket</button>
                </div>
            </div>
        );
    }

    return (
        <Layout>
            <div className="max-w-[1600px] mx-auto min-h-[calc(100vh-100px)] flex flex-col gap-8 pb-10">
                {/* TOP BAR */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => router.back()}
                            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 shadow-sm transition active:scale-90"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                <Zap className="w-8 h-8 text-indigo-600 fill-indigo-600" />
                                Punto de Venta (POS)
                            </h1>
                            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-0.5">Vendedor: {user?.name}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
                    {/* LEFT PANEL: PRODUCT CATALOG */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        {/* SEARCH & FILTERS */}
                        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex items-center gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar por nombre, SKU o código de barras..."
                                    className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                />
                            </div>
                            <button className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition">
                                <LayoutGrid className="w-6 h-6" />
                            </button>
                        </div>

                        {/* PRODUCT GRID */}
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 flex-1 overflow-y-auto max-h-[700px] pr-2 custom-scrollbar">
                            {isLoading ? (
                                <div className="col-span-full py-20 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
                                </div>
                            ) : filteredProducts.map((p) => (
                                <div key={p.id} className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-lg shadow-gray-200/10 flex flex-col gap-4 group">
                                    <div className="aspect-square bg-gray-50 rounded-2xl mb-2 flex items-center justify-center relative overflow-hidden">
                                        <Box className="w-12 h-12 text-gray-200" />
                                        <div className="absolute top-3 right-3 px-3 py-1 bg-white/80 backdrop-blur-md rounded-lg text-[10px] font-black tracking-widest uppercase">
                                            {p.category}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{p.sku}</span>
                                        <h3 className="font-black text-gray-900 line-clamp-1">{p.name}</h3>
                                        <p className="text-xl font-black text-gray-900 mt-2">${p.sellingPrice}</p>
                                    </div>
                                    
                                    <div className="mt-2 space-y-2">
                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Variantes Disponibles</p>
                                        <div className="grid grid-cols-1 gap-1.5">
                                            {p.variants.map((v: any) => (
                                                <button 
                                                    key={v.id}
                                                    onClick={() => addToCart(p, v)}
                                                    disabled={v.stock <= 0}
                                                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition ${
                                                        v.stock > 0 
                                                        ? 'bg-gray-50 hover:bg-indigo-600 hover:text-white group/btn' 
                                                        : 'bg-red-50 text-red-300 cursor-not-allowed opacity-50'
                                                    }`}
                                                >
                                                    <span>{v.size} / {v.color}</span>
                                                    <span className={v.stock > 0 ? 'text-indigo-600 group-hover/btn:text-white' : 'text-red-300'}>
                                                        {v.stock > 0 ? `${v.stock} uni` : 'AGOTADO'}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT PANEL: CART & CHECKOUT */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl flex flex-col h-full overflow-hidden">
                            {/* CLIENT SECTION */}
                            <div className="p-8 border-b border-gray-50">
                                <div className="flex items-center justify-between mb-4">
                                     <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Venta a:</h2>
                                     <button 
                                        onClick={() => setShowClientSearch(!showClientSearch)}
                                        className="text-xs font-black text-indigo-600 hover:underline"
                                     >
                                        Cambiar Cliente
                                     </button>
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowClientSearch(!showClientSearch)}
                                        className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition text-left"
                                    >
                                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900">{selectedClient?.name || 'Cliente Varios (Mostrador)'}</p>
                                            <p className="text-xs font-bold text-gray-400">{selectedClient?.documentNumber || '00000000'}</p>
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {showClientSearch && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-[2rem] shadow-2xl p-6"
                                            >
                                                <input 
                                                    type="text" placeholder="Buscar cliente..." 
                                                    className="w-full p-4 bg-gray-50 border-none rounded-xl mb-4 font-bold outline-none"
                                                />
                                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                                    <button 
                                                        onClick={() => { setSelectedClientId(''); setShowClientSearch(false); }}
                                                        className="w-full p-3 text-left hover:bg-indigo-50 rounded-xl transition font-bold"
                                                    >
                                                        Cliente Varios
                                                    </button>
                                                    {clients.map(c => (
                                                        <button 
                                                            key={c.id}
                                                            onClick={() => { setSelectedClientId(c.id); setShowClientSearch(false); }}
                                                            className="w-full p-3 text-left hover:bg-indigo-50 rounded-xl transition flex flex-col"
                                                        >
                                                            <span className="font-bold text-gray-800">{c.name}</span>
                                                            <span className="text-[10px] text-gray-400 font-mono">{c.documentNumber}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* CART ITEMS */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-6 min-h-[400px]">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                                        <ShoppingBag className="w-16 h-16 mb-4" />
                                        <p className="font-black uppercase tracking-widest text-xs">El carrito está vacío</p>
                                    </div>
                                ) : cart.map((item) => (
                                    <div key={item.variantId} className="flex items-center gap-4 group">
                                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-gray-400 text-xs">
                                            {item.name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900 leading-tight">{item.name}</h4>
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">{item.variantLabel}</p>
                                            <div className="flex items-center gap-4 mt-2">
                                                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                                    <button onClick={() => updateQuantity(item.variantId, item.quantity - 1)} className="p-1 hover:text-indigo-600 transition"><ChevronDown className="w-4 h-4" /></button>
                                                    <span className="px-3 font-black text-sm">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.variantId, item.quantity + 1)} className="p-1 hover:text-indigo-600 transition"><Plus className="w-3 h-3" /></button>
                                                </div>
                                                <span className="font-black text-gray-900 ml-auto">${(item.quantity * item.unitPrice).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => removeFromCart(item.variantId)}
                                            className="p-2 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* CHECKOUT TOTALS */}
                            <div className="p-8 bg-gray-900 rounded-t-[3rem] text-white">
                                <div className="space-y-4 mb-8">
                                    <div className="flex items-center justify-between text-gray-400 font-bold">
                                        <span>Subtotal</span>
                                        <span>${(total * 0.82).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-gray-400 font-bold">
                                        <span>IGV (18%)</span>
                                        <span>${(total * 0.18).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                        <span className="text-xl font-black uppercase">Total a Pagar</span>
                                        <span className="text-4xl font-black text-emerald-400">${total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-8">
                                    {[
                                        { id: 'EFECTIVO', icon: DollarSign },
                                        { id: 'TARJETA', icon: CreditCard },
                                        { id: 'TRANSFERENCIA', icon: ArrowUpRight },
                                    ].map(method => (
                                        <button
                                            key={method.id}
                                            onClick={() => setPaymentMethod(method.id)}
                                            className={`py-4 rounded-2xl flex flex-col items-center gap-2 transition font-black text-[10px] ${
                                                paymentMethod === method.id 
                                                ? 'bg-indigo-600 text-white' 
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                            }`}
                                        >
                                            <method.icon className="w-6 h-6" />
                                            {method.id}
                                        </button>
                                    ))}
                                </div>

                                <button 
                                    onClick={handleSubmit}
                                    disabled={isSaving || cart.length === 0}
                                    className="w-full py-6 bg-emerald-500 text-gray-900 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/20 hover:bg-emerald-400 transition active:scale-95 disabled:opacity-50 disabled:grayscale"
                                >
                                    {isSaving ? 'Procesando...' : (
                                        <>
                                            <Save className="w-6 h-6" /> Finalizar Venta
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[10px] text-gray-500 font-bold mt-6 uppercase tracking-widest opacity-40">
                                    ESTA OPERACIÓN DISMINUIRÁ AUTOMÁTICAMENTE EL STOCK
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
