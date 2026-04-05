'use client';

import { useState, useEffect } from 'react';
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
    CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/axios';
import { toast } from 'react-hot-toast';

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
        createdAt: new Date().toISOString().split('T')[0]
    });

    const [selectedClient, setSelectedClient] = useState<any>(null);

    const [items, setItems] = useState<any[]>([
        { modelName: 'BALANCE', color: 'ARENA', s28: 0, m30: 0, l32: 0, xl34: 0, xxl36: 0, size38: 0, size40: 0, size42: 0, size44: 0, size46: 0, unitPrice: 0, quantity: 0, totalPrice: 0 }
    ]);

    const [isSaving, setIsSaving] = useState(false);

    // Derive display zone
    const displayZone = user?.zone || (
        user?.role === 'VENDEDOR_LIMA' ? 'LIMA' : 
        user?.role === 'VENDEDOR_ORIENTE' ? 'ORIENTE' : 'OFICINA'
    );

    useEffect(() => {
        if (isOpen) {
            fetchClients();
            if (initialOrder) {
                setFormData({
                    clientId: initialOrder.clientId || '',
                    condition: initialOrder.condition || '',
                    agency: initialOrder.agency || '',
                    observations: initialOrder.observations || '',
                    orderNumber: initialOrder.orderNumber || '',
                    createdAt: new Date(initialOrder.createdAt).toISOString().split('T')[0]
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
                    createdAt: new Date().toISOString().split('T')[0]
                });
                setItems([{ modelName: '', color: '', s28: 0, m30: 0, l32: 0, xl34: 0, xxl36: 0, size38: 0, size40: 0, size42: 0, size44: 0, size46: 0, unitPrice: 0, quantity: 0, totalPrice: 0 }]);
                setSelectedClient(null);
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
        newItems[index][field] = value;

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (readOnly) return;
        if (!formData.clientId) return toast.error('Selecciona un cliente');
        if (items.some(item => !item.modelName || item.quantity <= 0)) return toast.error('Completa los modelos y cantidades');

        setIsSaving(true);
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
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 30 }}
                    className="relative bg-white w-full max-w-[95vw] max-h-[92vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-gray-900 px-10 py-8 text-white flex justify-between items-center">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                <ShoppingBag className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight">
                                    {readOnly ? 'Detalles de Pedido' : (initialOrder ? 'Editar Pedido' : 'Nota de Pedido')}
                                </h2>
                                <p className="text-gray-400 font-bold text-sm mt-1 uppercase tracking-widest">
                                    {initialOrder?.seller?.name || user?.name} — {initialOrder?.zone || displayZone}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                        {/* Matrix Header Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-6 md:col-span-2">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                           <User className="w-3.5 h-3.5" /> Cliente / Razon Social
                                        </label>
                                        <select 
                                            required
                                            disabled={readOnly}
                                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none font-bold text-gray-900 shadow-sm disabled:opacity-70"
                                            value={formData.clientId}
                                            onChange={(e) => handleClientChange(e.target.value)}
                                        >
                                            <option value="">Seleccionar Cliente</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} ({c.zone})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                           <CreditCard className="w-3.5 h-3.5" /> Condición
                                        </label>
                                        <input 
                                            type="text"
                                            disabled={readOnly}
                                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none font-bold text-gray-900 shadow-sm disabled:opacity-70"
                                            value={formData.condition}
                                            onChange={(e) => setFormData({...formData, condition: e.target.value})}
                                            placeholder="Ej: Factura / Crédito 45 días"
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Fecha de Pedido</label>
                                        <input 
                                            type="date"
                                            disabled={readOnly}
                                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none font-bold text-gray-900 shadow-sm disabled:opacity-70"
                                            value={formData.createdAt}
                                            onChange={(e) => setFormData({...formData, createdAt: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Vendedor / Zona</label>
                                        <div className="w-full px-6 py-4 bg-indigo-50 border-none rounded-2xl font-black text-indigo-700 shadow-sm flex items-center justify-between uppercase text-xs">
                                            <span>{initialOrder?.seller?.name || user?.name}</span>
                                            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-lg text-[10px] tracking-tight">{initialOrder?.zone || displayZone}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Identificación ({selectedClient?.documentType || 'RUC/DNI'})</label>
                                        <div className="w-full px-6 py-4 bg-gray-100 border-none rounded-2xl font-black text-gray-500 shadow-sm text-xs truncate">
                                            {selectedClient?.documentNumber || '----'}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                           <Truck className="w-3.5 h-3.5" /> Agencia de Transporte
                                        </label>
                                        <input 
                                            type="text"
                                            disabled={readOnly}
                                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none font-bold text-gray-900 shadow-sm disabled:opacity-70"
                                            value={formData.agency}
                                            onChange={(e) => setFormData({...formData, agency: e.target.value})}
                                            placeholder="Agencia de destino"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                                           NRO. Nota de Pedido
                                        </label>
                                        <input 
                                            type="text"
                                            disabled={readOnly}
                                            className="w-full px-6 py-4 bg-amber-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none font-black text-amber-700 shadow-sm uppercase disabled:opacity-70"
                                            value={formData.orderNumber}
                                            onChange={(e) => setFormData({...formData, orderNumber: e.target.value})}
                                            placeholder="Automático si se deja vacío"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Observaciones</label>
                                <textarea 
                                    disabled={readOnly}
                                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none font-medium text-gray-900 shadow-sm h-[calc(100%-1.75rem)] disabled:opacity-70"
                                    value={formData.observations}
                                    onChange={(e) => setFormData({...formData, observations: e.target.value})}
                                    placeholder="Detalles adicionales del pedido..."
                                />
                            </div>
                        </div>

                        {/* MATRIX TABLE */}
                        <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-2xl shadow-gray-200/40">
                            <div className="overflow-x-auto overflow-y-visible">
                                <table className="w-full text-center border-collapse">
                                    <thead>
                                        <tr className="bg-gray-900 text-white border-b-2 border-gray-800">
                                            <th className="px-6 py-6 text-[11px] font-black uppercase tracking-[0.2em] w-48 border-r-2 border-gray-800">Modelo</th>
                                            <th className="px-6 py-6 text-[11px] font-black uppercase tracking-[0.2em] w-40 border-r-2 border-gray-800">Color</th>
                                            {sizeHeaders.map(s => (
                                                <th key={s.label} className="px-2 py-6 text-[11px] font-black uppercase tracking-widest w-16 border-r border-gray-800">
                                                    <div className="leading-none">{s.label}</div>
                                                    <div className="text-[9px] opacity-40 font-bold mt-1">{s.sub}</div>
                                                </th>
                                            ))}
                                            <th className="px-4 py-6 text-[11px] font-black uppercase tracking-[0.1em] w-20 border-r-2 border-gray-800">Cant.</th>
                                            <th className="px-4 py-6 text-[11px] font-black uppercase tracking-[0.1em] w-28 border-r-2 border-gray-800">Precio U.</th>
                                            <th className="px-4 py-6 text-[11px] font-black uppercase tracking-[0.1em] w-28">Importe</th>
                                            {!readOnly && <th className="px-2 w-12 border-l-2 border-gray-800 bg-gray-900/50"></th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-400">
                                        {items.map((item, index) => (
                                            <tr key={index} className="hover:bg-indigo-50/50 transition-colors group border-b border-gray-400">
                                                <td className="p-0 border-r border-gray-400">
                                                    <input 
                                                        type="text" 
                                                        disabled={readOnly}
                                                        className="w-full h-full px-4 py-4 bg-transparent border-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-gray-900 font-bold uppercase text-xs disabled:opacity-70 outline-none transition-all"
                                                        value={item.modelName}
                                                        onChange={(e) => handleRowChange(index, 'modelName', e.target.value.toUpperCase())}
                                                        placeholder="MODELO..."
                                                    />
                                                </td>
                                                <td className="p-0 border-r border-gray-400">
                                                    <input 
                                                        type="text" 
                                                        disabled={readOnly}
                                                        className="w-full h-full px-4 py-4 bg-transparent border-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-gray-900 font-bold uppercase text-xs disabled:opacity-70 outline-none transition-all"
                                                        value={item.color}
                                                        onChange={(e) => handleRowChange(index, 'color', e.target.value.toUpperCase())}
                                                        placeholder="COLOR..."
                                                    />
                                                </td>
                                                {['s28', 'm30', 'l32', 'xl34', 'xxl36', 'size38', 'size40', 'size42', 'size44', 'size46'].map(field => (
                                                    <td key={field} className="p-0 border-r border-gray-400 bg-gray-50/30">
                                                        <input 
                                                            type="number" 
                                                            disabled={readOnly}
                                                            min="0"
                                                            className="w-full h-full p-4 bg-transparent border-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-center text-xs font-black text-gray-700 hover:text-indigo-600 focus:text-indigo-600 transition-all disabled:opacity-50 outline-none"
                                                            value={item[field] || ''}
                                                            onChange={(e) => handleRowChange(index, field, e.target.value)}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                        />
                                                    </td>
                                                ))}
                                                <td className="p-4 border-r border-gray-400 bg-gray-100/50">
                                                    <span className="font-black text-gray-900 text-xs">{item.quantity}</span>
                                                </td>
                                                <td className="p-0 border-r border-gray-400">
                                                    <div className="flex items-center gap-1 h-full px-4 relative">
                                                        <span className="text-[10px] font-black text-gray-400 absolute left-3">S/</span>
                                                        <input 
                                                            type="number" 
                                                            disabled={readOnly}
                                                            step="0.01"
                                                            className="w-full h-full py-4 pl-4 bg-transparent border-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-black text-gray-900 text-xs text-right disabled:opacity-70 outline-none transition-all"
                                                            value={item.unitPrice || ''}
                                                            onChange={(e) => handleRowChange(index, 'unitPrice', e.target.value)}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-4 bg-indigo-50/40">
                                                    <span className="font-black text-indigo-700 text-xs text-right block">
                                                        S/ {item.totalPrice?.toFixed(2) || '0.00'}
                                                    </span>
                                                </td>
                                                {!readOnly && (
                                                    <td className="p-0 border-l border-gray-400 bg-gray-50/20">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeRow(index)}
                                                            className="w-full h-full p-4 text-gray-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-indigo-600 text-white font-black uppercase tracking-widest text-sm border-t border-indigo-700">
                                            <td colSpan={2} className="py-6 px-8 text-left border-r border-white/10">Resumen Total</td>
                                            <td colSpan={10} className="border-r border-white/10 italic text-[10px] text-indigo-200 normal-case opacity-50 tracking-normal">Detalle de cantidades por talla</td>
                                            <td className="py-6 border-r border-white/10 bg-indigo-700/30">{totalOrderQuantity}</td>
                                            <td className="py-6 text-right pr-8 bg-indigo-700/50" colSpan={2}>
                                                <span className="text-[10px] opacity-70 mr-2">TOTAL</span>
                                                S/ {totalOrderAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            {!readOnly && <td className="bg-indigo-700/20"></td>}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {!readOnly && (
                            <div className="flex justify-between items-center bg-gray-900/5 p-8 rounded-[2rem] border border-gray-100">
                                <button 
                                    type="button" 
                                    onClick={addRow}
                                    className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                                >
                                    <Plus className="w-6 h-6" /> Añadir Nuevo Modelo
                                </button>
                                <div className="flex items-center gap-5 bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-2 text-indigo-600">
                                        <Calculator className="w-5 h-5" />
                                        <span className="text-xs font-black uppercase tracking-wider">Cálculos en Tiempo Real</span>
                                    </div>
                                    <div className="h-4 w-px bg-gray-200"></div>
                                    <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                        Verifique las cantidades antes de registrar
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>

                    {/* Actions */}
                    <div className="p-10 bg-white border-t border-gray-100 flex justify-end gap-4 shadow-sm relative z-10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-10 py-4 text-gray-500 hover:text-gray-700 font-bold transition-colors"
                        >
                            {readOnly ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {!readOnly && (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSaving}
                                className="flex items-center gap-3 px-12 py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition scale-up active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? 'Guardando...' : (
                                    <>
                                        <Save className="w-5 h-5" /> {initialOrder ? 'Actualizar Pedido' : 'Registrar Pedido'}
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
