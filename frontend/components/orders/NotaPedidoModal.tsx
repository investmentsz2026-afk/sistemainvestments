'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    X,
    Plus,
    Trash2,
    Save,
    Calculator,
    User,
    MapPin,
    AlertCircle,
    Truck,
    ShoppingBag,
    CreditCard,
    Search,
    ChevronDown,
    Package,
    CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { agenciesService, Agency } from '../../services/agencies.service';
import { useProducts } from '../../hooks/useProducts';
import { Product } from '../../types';

interface NotaPedidoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user: any;
    initialOrder?: any;
    readOnly?: boolean;
}

export function NotaPedidoModal({ isOpen, onClose, onSuccess, user, initialOrder, readOnly }: NotaPedidoModalProps) {
    const [clients, setClients] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        clientId: '',
        condition: 'FACTURA/CREDITO 45 DIAS',
        agency: '',
        observations: '',
        orderNumber: '',
        createdAt: new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD local format
    });

    const [selectedClient, setSelectedClient] = useState<any>(null);

    const [items, setItems] = useState<any[]>(
        Array(5).fill(null).map(() => ({
            modelName: '', color: '', s28: 0, m30: 0, l32: 0, xl34: 0, xxl36: 0,
            size38: 0, size40: 0, size42: 0, size44: 0, size46: 0,
            unitPrice: 0, quantity: 0, totalPrice: 0
        }))
    );

    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [showAgencyPicker, setShowAgencyPicker] = useState(false);
    const [agencySearch, setAgencySearch] = useState('');
    const [clientSearch, setClientSearch] = useState('');
    const [showClientPicker, setShowClientPicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [duplicateError, setDuplicateError] = useState(false);

    // Filtered Products Search State
    const { products } = useProducts();
    const [productSearch, setProductSearch] = useState<{ index: number; query: string } | null>(null);
    const [colorSearch, setColorSearch] = useState<{ index: number; query: string } | null>(null);

    // Derive display zone
    const displayZone = user?.zone || (
        user?.role === 'VENDEDOR_LIMA' ? 'LIMA' :
            user?.role === 'VENDEDOR_ORIENTE' ? 'ORIENTE' : 'OFICINA'
    );

    useEffect(() => {
        if (isOpen) {
            fetchClients();
            fetchAgencies();
            if (initialOrder) {
                setFormData({
                    clientId: initialOrder.clientId || '',
                    condition: initialOrder.condition || '',
                    agency: initialOrder.agency || '',
                    observations: initialOrder.observations || '',
                    orderNumber: initialOrder.orderNumber || '',
                    createdAt: new Date(initialOrder.createdAt).toLocaleDateString('sv-SE')
                });
                setItems(initialOrder.items || []);
                setSelectedClient(initialOrder.client);
            } else {
                // Reset for new order
                setFormData({
                    clientId: '',
                    condition: 'FACTURA/CREDITO 45 DIAS',
                    agency: '',
                    observations: '',
                    orderNumber: '',
                    createdAt: new Date().toLocaleDateString('sv-SE')
                });
                setItems(Array(5).fill(null).map(() => ({
                    modelName: '', color: '', s28: 0, m30: 0, l32: 0, xl34: 0, xxl36: 0,
                    size38: 0, size40: 0, size42: 0, size44: 0, size46: 0,
                    unitPrice: 0, quantity: 0, totalPrice: 0
                })));
                setSelectedClient(null);
                setDuplicateError(false);
            }
        }
    }, [isOpen, initialOrder]);

    const fetchClients = async () => {
        try {
            const resp = await api.get('/sales/clients');
            const data = resp.data.data || resp.data;
            setClients(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const fetchAgencies = async () => {
        try {
            const data = await agenciesService.getAll();
            setAgencies(data || []);
        } catch (error) {
            console.error('Error fetching agencies:', error);
        }
    };

    const filteredAgencies = agencies.filter(a => {
        // Lógica de filtrado por zona
        const userRole = user?.role || '';
        const userZone = user?.zone;

        let matchesZone = true;
        // Si es vendedor de LIMA o su zona es LIMA, solo ve agencias de LIMA
        if (userRole === 'VENDEDOR_LIMA' || userZone === 'LIMA') {
            matchesZone = a.zone === 'LIMA';
        }
        // Si es vendedor de ORIENTE o su zona es ORIENTE, solo ve agencias de ORIENTE
        else if (userRole === 'VENDEDOR_ORIENTE' || userZone === 'ORIENTE') {
            matchesZone = a.zone === 'ORIENTE';
        }
        // Comercial, Admin, Logistica ven todo

        if (!matchesZone) return false;

        // Lógica de búsqueda
        const search = agencySearch.toLowerCase();
        return (
            a.name.toLowerCase().includes(search) ||
            (a.address?.toLowerCase().includes(search) || '') ||
            (a.ruc?.toLowerCase().includes(search) || '')
        );
    });
    
    const filteredClients = clients.filter(c => {
        const search = clientSearch.toLowerCase();
        return (
            c.name.toLowerCase().includes(search) ||
            (c.documentNumber?.toLowerCase().includes(search) || '') ||
            (c.zone?.toLowerCase().includes(search) || '')
        );
    });

    const handleClientChange = (id: string | null) => {
        if (!id || readOnly) {
            if (!id) {
                setSelectedClient(null);
                setFormData({ ...formData, clientId: '' });
            }
            return;
        }
        const client = clients.find(c => String(c.id) === String(id));
        setSelectedClient(client || null);
        setFormData({ ...formData, clientId: id });
    };

    const handleRowChange = (index: number, field: string, value: any) => {
        if (readOnly) return;
        const newItems = [...items];
        
        if (field === 'productSelection') {
            const product = value as Product;
            newItems[index].modelName = product.name;
            newItems[index].unitPrice = product.sellingPrice;
            newItems[index].productId = product.id;
            // Clear color if product changes
            newItems[index].color = '';
            
            // Auto-propagate removed to follow new requirement
            setProductSearch(null);
        } else {
            newItems[index][field] = value;
        }

        // Recalculate quantity for matrix rows
        if (['s28', 'm30', 'l32', 'xl34', 'xxl36', 'size38', 'size40', 'size42', 'size44', 'size46'].includes(field)) {
            const qtyFields = ['s28', 'm30', 'l32', 'xl34', 'xxl36', 'size38', 'size40', 'size42', 'size44', 'size46'];
            newItems[index].quantity = qtyFields.reduce((acc, f) => acc + (parseInt(newItems[index][f]) || 0), 0);
        }

        newItems[index].totalPrice = newItems[index].quantity * (parseFloat(newItems[index].unitPrice) || 0);
        setItems(newItems);
    };

    const addRow = () => {
        setItems([...items, { modelName: '', color: '', s28: 0, m30: 0, l32: 0, xl34: 0, xxl36: 0, size38: 0, size40: 0, size42: 0, size44: 0, size46: 0, unitPrice: 0, quantity: 0, totalPrice: 0 }]);
    };

    const removeRow = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const totalOrderQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
    const totalOrderAmount = items.reduce((acc, item) => acc + item.totalPrice, 0);

    // Stock analysis for view mode (By Model, Color and Size)
    const stockAnalysis = useMemo(() => {
        if (!readOnly || !products || !items) return [];
        
        const summary: { 
            [key: string]: { 
                name: string; 
                sku: string;
                variants: { 
                    [key: string]: { 
                        color: string; 
                        size: string; 
                        requested: number; 
                        stock: number 
                    } 
                } 
            } 
        } = {};
        
        const sizeKeys = ['s28', 'm30', 'l32', 'xl34', 'xxl36', 'size38', 'size40', 'size42', 'size44', 'size46'];
        const sizeLabels: {[key:string]: string} = {
            s28:'28', m30:'30', l32:'32', xl34:'34', xxl36:'36', 
            size38:'38', size40:'40', size42:'42', size44:'44', size46:'46'
        };

        items.forEach(item => {
            if (!item.modelName || !item.color) return;
            
            const p = products.find(prod => 
                (item.productId && prod.id === item.productId) || 
                prod.name.trim().toUpperCase() === item.modelName.trim().toUpperCase()
            );
            
            if (!p) return;
            const pid = p.id;
            
            if (!summary[pid]) {
                summary[pid] = { name: p.name, sku: p.sku || '', variants: {} };
            }

            sizeKeys.forEach(key => {
                const requestedQty = parseInt(item[key]) || 0;
                if (requestedQty > 0) {
                    const label = sizeLabels[key];
                    const vKey = `${item.color}-${label}`;
                    
                    if (!summary[pid].variants[vKey]) {
                        // Find match in product variants - Flexible matching for numeric sizes
                        const variantInStock = p.variants?.find(v => {
                            const vColor = v.color.trim().toUpperCase();
                            const vSize = v.size.trim().toUpperCase();
                            const targetColor = item.color.trim().toUpperCase();
                            const targetSize = label.toUpperCase();
                            
                            return vColor === targetColor && (
                                vSize === targetSize || 
                                vSize.endsWith(`-${targetSize}`) || 
                                vSize.replace(/[^0-9]/g, '') === targetSize
                            );
                        });
                        
                        summary[pid].variants[vKey] = {
                            color: item.color,
                            size: label,
                            requested: 0,
                            stock: variantInStock?.stock || 0
                        };
                    }
                    summary[pid].variants[vKey].requested += requestedQty;
                }
            });
        });
        
        return Object.values(summary);
    }, [readOnly, items, products]);

    const totalAvailableInPedido = stockAnalysis.reduce((acc, p) => 
        acc + Object.values(p.variants).reduce((vAcc, v) => vAcc + Math.min(v.stock, v.requested), 0), 0
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (readOnly) return;
        if (!formData.clientId) return toast.error('Selecciona un cliente');
        if (items.some(item => !item.modelName || item.quantity <= 0)) return toast.error('Completa los modelos y cantidades');

        setIsSaving(true);
        if (formData.orderNumber && !initialOrder?.id) {
            try {
                const resp = await api.get('/orders');
                const existingOrders = resp.data || [];
                const isDuplicate = existingOrders.some((o: any) => o.orderNumber === formData.orderNumber);
                if (isDuplicate) {
                    setDuplicateError(true);
                    setIsSaving(false);
                    return;
                }
            } catch (err) {
                console.error("Error validando número de pedido", err);
            }
        }

        try {
            if (initialOrder?.id) {
                await api.patch(`/orders/${initialOrder.id}`, {
                    ...formData,
                    items
                });
                toast.success('Nota de Pedido actualizada');
            } else {
                await api.post('/orders', {
                    ...formData,
                    items
                });
                toast.success('Nota de Pedido registrada con éxito');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving order:', error);
            toast.error(error.response?.data?.message || 'Error al guardar el pedido');
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colKey: string) => {
        if (readOnly) return;

        // Navigation Keys
        const fieldsOrder = ['modelName', 'color', 's28', 'm30', 'l32', 'xl34', 'xxl36', 'size38', 'size40', 'size42', 'size44', 'size46', 'unitPrice'];
        const currentCol = fieldsOrder.indexOf(colKey);

        const focusElement = (r: number, c: string) => {
            setTimeout(() => {
                const el = document.querySelector(`[data-row="${r}"][data-col="${c}"]`) as HTMLElement;
                if (el) el.focus();
            }, 10);
        };

        if (e.key === 'Enter') {
            e.preventDefault();
            // Selection components handle ENTER themselves for selecting, but we handle the jump if selection is not active
            if (colKey === 'modelName' && productSearch?.index === rowIndex) return;
            if (colKey === 'color' && colorSearch?.index === rowIndex) return;

            if (currentCol < fieldsOrder.length - 1) {
                // Next field same row
                focusElement(rowIndex, fieldsOrder[currentCol + 1]);
            } else {
                // Next row first field - Copy model information to the next row
                const currentModel = items[rowIndex].modelName;
                const currentProductId = items[rowIndex].productId;
                const currentUnitPrice = items[rowIndex].unitPrice;

                if (rowIndex < items.length - 1) {
                    const newItems = [...items];
                    newItems[rowIndex + 1] = {
                        ...newItems[rowIndex + 1],
                        modelName: currentModel,
                        productId: currentProductId,
                        unitPrice: currentUnitPrice
                    };
                    setItems(newItems);
                    focusElement(rowIndex + 1, fieldsOrder[0]);
                } else {
                    setItems([...items, {
                        modelName: currentModel,
                        productId: currentProductId,
                        unitPrice: currentUnitPrice,
                        color: '', s28: 0, m30: 0, l32: 0, xl34: 0, xxl36: 0,
                        size38: 0, size40: 0, size42: 0, size44: 0, size46: 0,
                        quantity: 0, totalPrice: 0
                    }]);
                    focusElement(rowIndex + 1, fieldsOrder[0]);
                }
            }
        } else if (e.key === 'ArrowDown') {
            if (rowIndex < items.length - 1) {
                e.preventDefault();
                focusElement(rowIndex + 1, colKey);
            }
        } else if (e.key === 'ArrowUp') {
            if (rowIndex > 0) {
                e.preventDefault();
                focusElement(rowIndex - 1, colKey);
            }
        } else if (e.key === 'ArrowRight') {
            const input = e.target as HTMLInputElement;
            // Only move if cursor is at the end or it's a number/selection input
            if (input.selectionEnd === input.value.length || input.type === 'number') {
                if (currentCol < fieldsOrder.length - 1) {
                    e.preventDefault();
                    focusElement(rowIndex, fieldsOrder[currentCol + 1]);
                }
            }
        } else if (e.key === 'ArrowLeft') {
            const input = e.target as HTMLInputElement;
            if (input.selectionStart === 0 || input.type === 'number') {
                if (currentCol > 0) {
                    e.preventDefault();
                    focusElement(rowIndex, fieldsOrder[currentCol - 1]);
                }
            }
        }
    };

    const sizeHeaders = [
        { label: 'S', sub: '28' },
        { label: 'M', sub: '30' },
        { label: 'L', sub: '32' },
        { label: 'XL', sub: '34' },
        { label: 'XXL', sub: '36' },
        { label: '38', sub: '' },
        { label: '40', sub: '' },
        { label: '42', sub: '' },
        { label: '44', sub: '' },
        { label: '46', sub: '' }
    ];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 10 }}
                    className="relative bg-white w-full max-w-7xl max-h-[95vh] rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200"
                >
                    {/* Header - More compact and elegant */}
                    <div className="bg-slate-900 px-8 py-4 text-white flex justify-between items-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <ShoppingBag className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight leading-none">
                                    {readOnly ? 'Vista de Pedido' : (initialOrder ? 'Editar Pedido' : 'Nota de Pedido')}
                                </h2>
                                <p className="text-indigo-300 font-black text-[10px] mt-1 uppercase tracking-[0.2em] opacity-80">
                                    {initialOrder?.seller?.name || user?.name} <span className="mx-1 opacity-30">•</span> {initialOrder?.zone || displayZone}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white relative z-10">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar">
                        {/* Form Sections */}
                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                            {/* Left Column: Client & Info */}
                            <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-md">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5 font-sans">
                                            <User className="w-3 h-3 text-indigo-500" /> Cliente / Razón Social
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                required
                                                disabled={readOnly}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none font-bold text-slate-900 text-sm disabled:opacity-70 shadow-inner uppercase"
                                                value={showClientPicker ? clientSearch : (selectedClient?.name || '')}
                                                onChange={(e) => {
                                                    setClientSearch(e.target.value);
                                                    setShowClientPicker(true);
                                                }}
                                                onFocus={() => {
                                                    setClientSearch('');
                                                    setShowClientPicker(true);
                                                }}
                                                placeholder="BUSCAR CLIENTE..."
                                            />
                                            <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform ${showClientPicker ? 'rotate-180' : ''}`} />
                                            
                                            <AnimatePresence>
                                                {!readOnly && showClientPicker && (
                                                    <>
                                                        <div className="fixed inset-0 z-[60]" onClick={() => setShowClientPicker(false)} />
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[70] max-h-72 overflow-y-auto overflow-x-hidden custom-scrollbar py-2"
                                                        >
                                                            {filteredClients.length === 0 ? (
                                                                <div className="px-6 py-8 text-center">
                                                                    <User className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No se encontraron clientes</p>
                                                                </div>
                                                            ) : (
                                                                filteredClients.map(c => (
                                                                    <button
                                                                        key={c.id}
                                                                        type="button"
                                                                        className="w-full text-left px-5 py-3 hover:bg-indigo-50 transition-colors group border-b border-slate-50 last:border-0"
                                                                        onClick={() => {
                                                                            handleClientChange(c.id);
                                                                            setClientSearch(c.name);
                                                                            setShowClientPicker(false);
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center justify-between gap-4">
                                                                            <div>
                                                                                <div className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase truncate">
                                                                                    {c.name}
                                                                                </div>
                                                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                                                                                    {c.documentType}: {c.documentNumber} • {c.zone}
                                                                                </div>
                                                                            </div>
                                                                            <div className="shrink-0 w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                                                <CheckCircle className="w-4 h-4" />
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                ))
                                                            )}
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha</label>
                                            <input
                                                type="date"
                                                disabled={readOnly}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none font-bold text-slate-900 text-sm shadow-inner"
                                                value={formData.createdAt}
                                                onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5 font-sans">
                                                <AlertCircle className="w-3 h-3 text-amber-500" /> Identificación
                                            </label>
                                            <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs flex items-center truncate h-[46px]">
                                                {selectedClient ? `${selectedClient.documentType}: ${selectedClient.documentNumber}` : '---'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5 font-sans">
                                            <CreditCard className="w-3 h-3 text-indigo-500" /> Condición de Pago
                                        </label>
                                        <input
                                            type="text"
                                            disabled={readOnly}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none font-bold text-slate-900 text-sm shadow-inner"
                                            value={formData.condition}
                                            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                            placeholder="Pago al contado, Crédito, etc."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5 relative">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5 font-sans">
                                                <Truck className="w-3 h-3 text-indigo-500" /> Agencia
                                            </label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    disabled={readOnly}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none font-bold text-slate-900 text-xs shadow-inner uppercase"
                                                    value={formData.agency}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, agency: e.target.value });
                                                        setAgencySearch(e.target.value);
                                                        setShowAgencyPicker(true);
                                                    }}
                                                    onFocus={() => setShowAgencyPicker(true)}
                                                    placeholder="Buscar agencia..."
                                                />
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-focus-within:rotate-180 transition-transform" />
                                            </div>

                                            {/* Agency Dropdown */}
                                            <AnimatePresence>
                                                {!readOnly && showAgencyPicker && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setShowAgencyPicker(false)} />
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                                                            className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-48 overflow-y-auto"
                                                        >
                                                            <div className="p-1.5">
                                                                {filteredAgencies.length === 0 ? (
                                                                    <div className="p-4 text-center text-slate-400 text-[10px] font-bold">No hay resultados</div>
                                                                ) : filteredAgencies.map(a => (
                                                                    <button
                                                                        key={a.id} type="button"
                                                                        className="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-lg transition-colors group"
                                                                        onClick={() => { setFormData({ ...formData, agency: a.name }); setShowAgencyPicker(false); }}
                                                                    >
                                                                        <div className="text-[11px] font-black text-slate-900 group-hover:text-indigo-600">{a.name}</div>
                                                                        <div className="text-[9px] text-slate-400 truncate font-bold uppercase">{a.zone} • {a.address || 'Sin dirección'}</div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nota de Pedido N°</label>
                                            <input
                                                type="text"
                                                disabled={readOnly}
                                                className="w-full px-4 py-3 bg-amber-50/50 border border-amber-200 rounded-xl outline-none font-black text-amber-700 text-xs shadow-inner uppercase placeholder:text-amber-300"
                                                value={formData.orderNumber}
                                                onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                                                placeholder="AUTOGENERADO"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Observations */}
                            <div className="xl:col-span-1 bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-md flex flex-col">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Comentarios</label>
                                <textarea
                                    disabled={readOnly}
                                    className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-600 focus:bg-white transition-all outline-none font-medium text-slate-800 text-xs min-h-[100px] shadow-inner"
                                    value={formData.observations}
                                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                                    placeholder="Instrucciones especiales..."
                                />
                            </div>
                        </div>

                        {/* TABLE SECTION */}
                        <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-md overflow-hidden">
                            <div className="overflow-x-auto overflow-y-visible">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-900 text-white border-b border-slate-800">
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-left border-r border-slate-800">Modelo</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-left border-r border-slate-800">Color</th>
                                            {sizeHeaders.map(s => (
                                                <th key={s.label} className="px-1 py-3 text-[10px] font-black uppercase tracking-tighter w-12 border-r border-slate-800">
                                                    <div>{s.label}</div>
                                                    <div className="text-[8px] opacity-40 font-bold -mt-0.5">{s.sub}</div>
                                                </th>
                                            ))}
                                            <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider w-14 border-r border-slate-700 text-center">Cant.</th>
                                            <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider w-24 border-r border-slate-700 text-right">Precio</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider w-24 text-right">Subtotal</th>
                                            {!readOnly && <th className="w-10 bg-slate-900 border-l border-slate-700"></th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-slate-900">
                                        {items.map((item, index) => (
                                            <tr key={index} className="group hover:bg-indigo-50/50 transition-colors border-b-2 border-slate-900">
                                                <td className="p-0 border-r border-slate-900 relative">
                                                    <div className="relative group">
                                                        <input
                                                            type="text" disabled={readOnly}
                                                            data-row={index} data-col="modelName"
                                                            className="w-full px-4 py-3.5 bg-transparent border-none outline-none font-bold text-slate-900 text-[10px] uppercase focus:bg-white transition-all placeholder:text-slate-300"
                                                            value={productSearch?.index === index ? productSearch.query : item.modelName}
                                                            onChange={(e) => setProductSearch({ index, query: e.target.value })}
                                                            onFocus={() => setProductSearch({ index, query: item.modelName || '' })}
                                                            onKeyDown={(e) => handleKeyDown(e, index, 'modelName')}
                                                            placeholder="BUSCAR MODELO..."
                                                        />
                                                        <AnimatePresence>
                                                            {productSearch?.index === index && (
                                                                <>
                                                                    <div className="fixed inset-0 z-[60]" onClick={() => setProductSearch(null)} />
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                                                                        className="absolute left-0 w-[250px] top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 z-[70] max-h-60 overflow-y-auto overflow-x-hidden"
                                                                    >
                                                                        <div className="p-1">
                                                                            {(products || [])
                                                                                .filter(p => 
                                                                                    p.inventoryType === 'TERMINADOS' && (
                                                                                        p.name.toLowerCase().includes(productSearch.query.toLowerCase()) || 
                                                                                        p.sku.toLowerCase().includes(productSearch.query.toLowerCase()) ||
                                                                                        (p.op && p.op.toLowerCase().includes(productSearch.query.toLowerCase()))
                                                                                    )
                                                                                )
                                                                                .slice(0, 10)
                                                                                .map(p => (
                                                                                    <button
                                                                                        key={p.id} type="button"
                                                                                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg transition-colors group flex flex-col"
                                                                                        onClick={() => handleRowChange(index, 'productSelection', p)}
                                                                                    >
                                                                                        <span className="text-[10px] font-black text-slate-900 group-hover:text-indigo-600 truncate">{p.name}</span>
                                                                                        <span className="text-[8px] text-slate-400 font-bold">{p.sku} {p.op ? `• OP:${p.op}` : ''}</span>
                                                                                    </button>
                                                                                ))
                                                                            }
                                                                        </div>
                                                                    </motion.div>
                                                                </>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </td>
                                                <td className="p-0 border-r border-slate-900 relative">
                                                    <div className="relative group">
                                                        <input
                                                            type="text" disabled={readOnly || !item.productId}
                                                            data-row={index} data-col="color"
                                                            className="w-full px-4 py-3.5 bg-transparent border-none outline-none font-bold text-slate-900 text-[10px] uppercase focus:bg-white transition-all placeholder:text-slate-300 disabled:opacity-30"
                                                            value={colorSearch?.index === index ? colorSearch.query : item.color}
                                                            onChange={(e) => setColorSearch({ index, query: e.target.value })}
                                                            onFocus={() => item.productId && setColorSearch({ index, query: item.color || '' })}
                                                            onKeyDown={(e) => handleKeyDown(e, index, 'color')}
                                                            placeholder="COLOR..."
                                                        />
                                                        <AnimatePresence>
                                                            {colorSearch?.index === index && item.productId && (
                                                                <>
                                                                    <div className="fixed inset-0 z-[60]" onClick={() => setColorSearch(null)} />
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                                                                        className="absolute left-0 w-full top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 z-[70] max-h-60 overflow-y-auto"
                                                                    >
                                                                        <div className="p-1">
                                                                            {Array.from(new Set(
                                                                                (products?.find(p => p.id === item.productId)?.variants || [])
                                                                                    .map(v => v.color)
                                                                                    .filter(c => c.toLowerCase().includes(colorSearch.query.toLowerCase()))
                                                                            )).map(color => (
                                                                                <button
                                                                                    key={color} type="button"
                                                                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors"
                                                                                    onClick={() => {
                                                                                        handleRowChange(index, 'color', color.toUpperCase());
                                                                                        setColorSearch(null);
                                                                                    }}
                                                                                >
                                                                                    <span className="text-[10px] font-black text-slate-900 uppercase">{color}</span>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </motion.div>
                                                                </>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </td>
                                                {['s28', 'm30', 'l32', 'xl34', 'xxl36', 'size38', 'size40', 'size42', 'size44', 'size46'].map(field => (
                                                    <td key={field} className="p-0 border-r border-slate-900 bg-white">
                                                        <input
                                                            type="number" disabled={readOnly} min="0"
                                                            data-row={index} data-col={field}
                                                            className="w-full p-2 bg-transparent border-none outline-none text-center text-[11px] font-black text-slate-900 focus:text-indigo-600 focus:bg-indigo-50 transition-all"
                                                            value={item[field] || ''}
                                                            onChange={(e) => handleRowChange(index, field, e.target.value)}
                                                            onKeyDown={(e) => handleKeyDown(e, index, field)}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                        />
                                                    </td>
                                                ))}
                                                <td className="px-2 py-3 border-r border-slate-900 bg-slate-50 text-center">
                                                    <span className="font-black text-slate-900 text-[11px]">{item.quantity}</span>
                                                </td>
                                                <td className="p-0 border-r border-slate-900 overflow-hidden">
                                                    <div className="flex items-center px-2">
                                                        <span className="text-[9px] font-black text-slate-400 mr-1">S/</span>
                                                        <input
                                                            type="number" disabled={readOnly} step="0.01"
                                                            data-row={index} data-col="unitPrice"
                                                            className="w-full py-3.5 bg-transparent border-none outline-none font-black text-slate-900 text-[11px] text-right focus:bg-white"
                                                            value={item.unitPrice || ''}
                                                            onChange={(e) => handleRowChange(index, 'unitPrice', e.target.value)}
                                                            onKeyDown={(e) => handleKeyDown(e, index, 'unitPrice')}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 bg-indigo-50/40 text-right border-r border-slate-900">
                                                    <span className="font-black text-indigo-700 text-[11px]">
                                                        {item.totalPrice?.toFixed(2) || '0.00'}
                                                    </span>
                                                </td>
                                                {!readOnly && (
                                                    <td className="p-0 bg-slate-50 overflow-hidden">
                                                        <button
                                                            type="button" onClick={() => removeRow(index)}
                                                            className="w-full py-3.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-100 text-slate-900 font-black border-t-2 border-slate-200">
                                            <td colSpan={2} className="px-6 py-4 text-xs uppercase tracking-widest text-slate-400 border-r border-slate-200">Total General</td>
                                            <td colSpan={10} className="border-r border-slate-200" />
                                            <td className="py-4 text-center bg-slate-200 text-indigo-700 text-xs border-r border-white/50">{totalOrderQuantity}</td>
                                            <td colSpan={2} className="px-6 py-4 text-right bg-slate-900 text-white rounded-bl-xl">
                                                <span className="text-[9px] opacity-50 mr-3 tracking-[0.2em] font-sans">IMPORTE TOTAL</span>
                                                <span className="text-sm">S/ {totalOrderAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </td>
                                            {!readOnly && <td className="bg-slate-900" />}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Stock Availability Card - Exclusive for View Mode (Detailed) */}
                        {readOnly && stockAnalysis.length > 0 && (
                            <div className="mt-8 bg-white rounded-[2rem] border-2 border-slate-900 overflow-hidden shadow-2xl animate-fade-in">
                                <div className="bg-slate-900 px-8 py-5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
                                            <Package className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1 text-nowrap">Control de Stock Detallado</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Comparación por Color y Talla</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Pedido</p>
                                            <p className="text-lg font-black text-white leading-none">{totalOrderQuantity}</p>
                                        </div>
                                        <div className="w-px h-8 bg-slate-800" />
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Disponible</p>
                                            <p className={`text-lg font-black leading-none ${totalAvailableInPedido < totalOrderQuantity ? 'text-rose-500' : 'text-emerald-500'}`}>{totalAvailableInPedido}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 space-y-8">
                                    {stockAnalysis.map((prod, pIdx) => (
                                        <div key={pIdx} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                                            <div className="px-6 py-3 bg-slate-100/50 border-b border-slate-200 flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded leading-none">{prod.sku}</span>
                                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">{prod.name}</h4>
                                                </div>
                                            </div>
                                            <div className="p-0 overflow-x-auto">
                                                <div className="divide-y-4 divide-slate-100">
                                                    {(() => {
                                                        const colorGroups: { [key: string]: any[] } = {};
                                                        Object.values(prod.variants)
                                                            .sort((a, b) => (parseInt(a.size) || 0) - (parseInt(b.size) || 0))
                                                            .forEach(v => {
                                                                if (!colorGroups[v.color]) colorGroups[v.color] = [];
                                                                colorGroups[v.color].push(v);
                                                            });

                                                        return Object.entries(colorGroups).map(([color, variants], cIdx) => (
                                                            <div key={cIdx} className="bg-white">
                                                                <div className="px-6 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-3">
                                                                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                                                                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{color}</span>
                                                                </div>
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-center border-collapse">
                                                                        <thead>
                                                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                                                <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200 w-24 text-left bg-slate-100/50">Concepto</th>
                                                                                {variants.map((v, i) => (
                                                                                    <th key={i} className="px-2 py-2 text-[10px] font-black text-slate-900 uppercase border-r border-slate-200 min-w-[65px]">
                                                                                        T {v.size}
                                                                                    </th>
                                                                                ))}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            <tr className="border-b border-slate-100">
                                                                                <td className="px-4 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200 text-left bg-slate-50/50 leading-none">Pedido</td>
                                                                                {variants.map((v, i) => (
                                                                                    <td key={i} className="px-2 py-2 text-[11px] font-black text-indigo-600 border-r border-slate-100">
                                                                                        {v.requested}
                                                                                    </td>
                                                                                ))}
                                                                            </tr>
                                                                            <tr className="border-b border-slate-100">
                                                                                <td className="px-4 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200 text-left bg-slate-50/50 leading-none">Stock</td>
                                                                                {variants.map((v, i) => (
                                                                                    <td key={i} className={`px-2 py-2 text-[11px] font-black border-r border-slate-100 ${v.stock < v.requested ? 'text-rose-600' : 'text-slate-900'}`}>
                                                                                        {v.stock}
                                                                                    </td>
                                                                                ))}
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="px-4 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200 text-left bg-slate-50/50 leading-none">Estado</td>
                                                                                {variants.map((v, i) => {
                                                                                    const isMissing = v.stock < v.requested;
                                                                                    return (
                                                                                        <td key={i} className={`px-2 py-2 border-r border-slate-100 ${isMissing ? 'bg-rose-50/50' : 'bg-emerald-50/30'}`}>
                                                                                            {isMissing ? (
                                                                                                <span className="text-[7.5px] font-black text-rose-600 uppercase leading-none block">
                                                                                                    Insuficiente
                                                                                                </span>
                                                                                            ) : (
                                                                                                <span className="text-[7.5px] font-black text-emerald-600 uppercase leading-none block">
                                                                                                    Completo
                                                                                                </span>
                                                                                            )}
                                                                                        </td>
                                                                                    );
                                                                                })}
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-slate-900 px-8 py-5 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Resumen General de Surtido</span>
                                            <span className="text-white text-xs font-medium">Revisión automática de stock en el sistema de Productos Terminados.</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Surtido del Pedido</p>
                                            <p className="text-2xl font-black text-white leading-none">
                                                {Math.round((totalAvailableInPedido / totalOrderQuantity) * 100)}%
                                            </p>
                                        </div>
                                        <div className="w-32 bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${totalAvailableInPedido < totalOrderQuantity ? 'bg-gradient-to-r from-rose-500 to-orange-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'}`}
                                                style={{ width: `${(totalAvailableInPedido / totalOrderQuantity) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!readOnly && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-inner">
                                <button
                                    type="button" onClick={addRow}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-[0.15em] leading-none ring-4 ring-transparent hover:ring-indigo-100"
                                >
                                    <Plus className="w-5 h-5" /> Agregar Nueva Fila
                                </button>
                                <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <div className="flex items-center gap-1.5 text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                                        <Calculator className="w-3 h-3" /> Cálculos Automáticos
                                    </div>
                                    <span className="hidden md:inline opacity-50">•</span>
                                    <span className="hidden md:inline">Verifique antes de guardar</span>
                                </div>
                            </div>
                        )}
                    </form>

                    {/* Footer Actions */}
                    <div className="px-8 py-4 bg-white border-t border-slate-200 flex justify-end items-center gap-4 relative z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                        <button
                            type="button" onClick={onClose}
                            className="px-8 py-3 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all"
                        >
                            {readOnly ? 'Cerrar Ventana' : 'Cancelar Registro'}
                        </button>
                        {!readOnly && (
                            <button
                                type="button" onClick={handleSubmit} disabled={isSaving}
                                className="flex items-center gap-2.5 px-10 py-3.5 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-black transition-all active:scale-95 disabled:opacity-50 ring-4 ring-transparent hover:ring-slate-100"
                            >
                                {isSaving ? 'Guardando...' : (
                                    <>
                                        <Save className="w-4 h-4 text-indigo-400" /> {initialOrder ? 'Guardar Cambios' : 'Emitir Nota de Pedido'}
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Modal Error Duplicado */}
                    <AnimatePresence>
                        {duplicateError && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDuplicateError(false)} />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="relative bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full border-2 border-rose-100 flex flex-col items-center text-center"
                                >
                                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-rose-50/50">
                                        <AlertCircle className="w-10 h-10 text-rose-500" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-2">Número ya registrado</h3>
                                    <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                                        La <strong className="text-slate-900">Nota de Pedido N° {formData.orderNumber}</strong> ya existe en el sistema. Debe ingresar un número diferente para continuar.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setDuplicateError(false)}
                                        className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.15em] rounded-2xl hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-900/20"
                                    >
                                        Aceptar y Corregir
                                    </button>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                </motion.div>
            </div>
        </AnimatePresence>
    );
}
