'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../../components/common/Layout';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/axios';
import {
    Search,
    Filter,
    CreditCard,
    FileText,
    Eye,
    Download,
    Calendar,
    User,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SaleDetailsModal from '../../../components/sales/SaleDetailsModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function CollectionsPage() {
    const { user } = useAuth();
    const [sales, setSales] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    
    // Modal state
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            const resp = await api.get('/sales');
            setSales(resp.data || []);
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredSales = sales.filter(s => {
        const matchesSearch = s.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             s.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || s.paymentStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const openDetails = (id: string) => {
        setSelectedSaleId(id);
        setIsModalOpen(true);
    };

    const downloadCollectionNote = (sale: any) => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Horizontal for the wide table
        const pageWidth = doc.internal.pageSize.width;

        // Header - Simple and Bold like the image
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('NOTA DE COBRANZA', 15, 15);

        doc.setFontSize(10);
        const dateStr = new Date(sale.createdAt).toLocaleDateString('es-PE');
        doc.text(`FECHA: ${dateStr}`, 15, 25);
        doc.text(`FACTURA: ${sale.invoiceNumber || 'S/N'}`, pageWidth / 3, 25);
        
        doc.text(`CLIENTE: ${sale.client?.name || 'PUBLICO GENERAL'}`, 15, 33);
        doc.text(`RUC: ${sale.client?.documentNumber || '---------'}`, 15, 41);
        
        // Multiline address
        const address = sale.client?.address || 'Sin dirección registrada';
        const splitAddress = doc.splitTextToSize(`DIRECCIÓN: ${address}`, pageWidth - 30);
        doc.text(splitAddress, 15, 49);

        const tableStartY = 57 + (splitAddress.length * 5);

        // Grouping items by Product, Color & Price
        const grouped = (sale.items || []).reduce((acc: any, item: any) => {
            const key = `${item.variant?.product?.name}-${item.variant?.color}-${item.unitPrice}`;
            if (!acc[key]) {
                acc[key] = {
                    name: `${item.variant?.product?.name || 'PRODUCTO'} ${item.variant?.color || ''}`,
                    unitPrice: item.unitPrice,
                    sizes: {},
                    totalQty: 0,
                    totalPrice: 0
                };
            }
            const size = item.variant?.size?.toString();
            acc[key].sizes[size] = (acc[key].sizes[size] || 0) + item.quantity;
            acc[key].totalQty += item.quantity;
            acc[key].totalPrice += item.totalPrice;
            return acc;
        }, {});

        const sizeColumns = ['28', '30', '32', '34', '36', '38', '40', '42', '44', '46'];
        const tableBody: any[] = [];
        let grandTotalQty = 0;
        let grandTotalPrice = 0;

        Object.values(grouped).forEach((item: any) => {
            const row = [
                item.totalQty,
                item.name,
                ...sizeColumns.map(size => item.sizes[size] || ''),
                item.unitPrice.toFixed(2),
                item.totalPrice.toFixed(2)
            ];
            tableBody.push(row);
            grandTotalQty += item.totalQty;
            grandTotalPrice += item.totalPrice;
        });

        // Final Aggregate Row
        tableBody.push([
            grandTotalQty,
            '',
            '', '', '', '', '', '', '', '', '', '',
            '',
            grandTotalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })
        ]);

        autoTable(doc, {
            startY: tableStartY,
            head: [['CA...', 'MODELO', ...sizeColumns, 'PUNI', 'IMPORTE']],
            body: tableBody,
            theme: 'grid',
            headStyles: { 
                fillColor: [255, 255, 255], 
                textColor: [0, 0, 0], 
                fontStyle: 'bold', 
                lineWidth: 0.1, 
                lineColor: [0, 0, 0] 
            },
            styles: { 
                fontSize: 8, 
                cellPadding: 2, 
                textColor: [0, 0, 0],
                font: 'helvetica'
            },
            columnStyles: {
                0: { cellWidth: 15, fontStyle: 'bold' },
                1: { cellWidth: 80, fontStyle: 'bold' },
                ...Object.fromEntries(sizeColumns.map((_, i) => [i + 2, { cellWidth: 10, halign: 'center' }])),
                12: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
                13: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
            },
            didParseCell: (data) => {
                // Formatting for the last total row
                if (data.row.index === tableBody.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    if (data.column.index === 0 || data.column.index === 13) {
                       // Keep it bold
                    } else {
                        // data.cell.text = ['']; // Keep other cells empty if needed
                    }
                }
            }
        });

        doc.save(`NOTA_COBRANZA_${sale.invoiceNumber || sale.id.slice(-6)}.pdf`);
    };

    const downloadCollectionExcel = (sale: any) => {
        // Grouping items by Product, Color & Price (Same logic as PDF)
        const grouped = (sale.items || []).reduce((acc: any, item: any) => {
            const key = `${item.variant?.product?.name}-${item.variant?.color}-${item.unitPrice}`;
            if (!acc[key]) {
                acc[key] = {
                    name: `${item.variant?.product?.name || 'PRODUCTO'} ${item.variant?.color || ''}`,
                    unitPrice: item.unitPrice,
                    sizes: {},
                    totalQty: 0,
                    totalPrice: 0
                };
            }
            const size = item.variant?.size?.toString();
            acc[key].sizes[size] = (acc[key].sizes[size] || 0) + item.quantity;
            acc[key].totalQty += item.quantity;
            acc[key].totalPrice += item.totalPrice;
            return acc;
        }, {});

        const sizeColumns = ['28', '30', '32', '34', '36', '38', '40', '42', '44', '46'];
        
        // Prepare Data for Excel
        const rows = [
            ['NOTA DE COBRANZA'],
            [`FECHA: ${new Date(sale.createdAt).toLocaleDateString('es-PE')}`],
            [`FACTURA: ${sale.invoiceNumber || 'S/N'}`],
            [`CLIENTE: ${sale.client?.name || 'PUBLICO GENERAL'}`],
            [`RUC: ${sale.client?.documentNumber || '---------'}`],
            [`DIRECCIÓN: ${sale.client?.address || 'Sin dirección registrada'}`],
            [], // Empty row
            ['CA...', 'MODELO', ...sizeColumns, 'PUNI', 'IMPORTE'] // Table Header
        ];

        let grandTotalQty = 0;
        let grandTotalPrice = 0;

        Object.values(grouped).forEach((item: any) => {
            const row = [
                item.totalQty,
                item.name,
                ...sizeColumns.map(size => item.sizes[size] || ''),
                item.unitPrice,
                item.totalPrice
            ];
            rows.push(row);
            grandTotalQty += item.totalQty;
            grandTotalPrice += item.totalPrice;
        });

        // Totals Row
        rows.push([
            grandTotalQty,
            'TOTAL FINAL',
            '', '', '', '', '', '', '', '', '', '',
            '',
            grandTotalPrice
        ]);

        // Create Worksheet
        const ws = XLSX.utils.aoa_to_sheet(rows);
        
        // Minimal styling for width (optional but helpful)
        const wscols = [
            { wch: 8 },  // CA
            { wch: 40 }, // MODELO
            ...sizeColumns.map(() => ({ wch: 4 })), // Sizes
            { wch: 10 }, // PUNI
            { wch: 12 }  // IMPORTE
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Nota de Cobranza');
        
        XLSX.writeFile(wb, `NOTA_COBRANZA_${sale.invoiceNumber || sale.id.slice(-6)}.xlsx`);
    };

    const cardClass = "bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20";

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Módulo de Cobranza</h1>
                        <p className="text-gray-500 font-medium text-lg mt-1">Gestión de créditos y estados de cuenta de clientes.</p>
                    </div>
                </div>

                {/* FILTERS */}
                <div className={`${cardClass} p-4 flex flex-wrap items-center gap-4`}>
                    <div className="flex-1 min-w-[300px] relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar por cliente o factura..."
                            className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3.5 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                         <Filter className="w-5 h-5 text-gray-400" />
                         <select 
                            className="bg-gray-50 border-none rounded-2xl px-4 py-3.5 font-bold text-gray-700 outline-none"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                         >
                            <option value="ALL">Todos los Estados</option>
                            <option value="PENDIENTE">Solo Pendientes</option>
                            <option value="PARCIAL">Solo Parciales</option>
                            <option value="CANCELADO">Solo Cancelados</option>
                         </select>
                    </div>
                </div>

                {/* COLLECTIONS LIST */}
                <div className={`${cardClass} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Factura / Fecha</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Pagado</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-8 py-20 text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
                                        </td>
                                    </tr>
                                ) : filteredSales.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-8 py-20 text-center opacity-50 italic">No se encontraron ventas para cobrar</td>
                                    </tr>
                                ) : (
                                    filteredSales.map((sale) => {
                                        const paid = (sale.payments || []).reduce((acc: number, p: any) => acc + p.amount, 0);
                                        const balance = sale.totalAmount - paid;
                                        return (
                                            <tr key={sale.id} className="hover:bg-gray-50/50 transition duration-150 group">
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-900">{sale.invoiceNumber || 'Sin Factura'}</span>
                                                        <span className="text-[10px] font-bold text-gray-400 mt-0.5">{new Date(sale.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 font-bold text-gray-900">
                                                    {sale.client?.name || 'Cliente Varios'}
                                                </td>
                                                <td className="px-8 py-6 font-black text-gray-900">
                                                    S/ {sale.totalAmount.toLocaleString()}
                                                </td>
                                                <td className="px-8 py-6 font-bold text-emerald-600">
                                                    S/ {paid.toLocaleString()}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`font-black ${balance > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                                        S/ {balance.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                        sale.paymentStatus === 'CANCELADO' ? 'bg-emerald-50 text-emerald-600' : 
                                                        sale.paymentStatus === 'PARCIAL' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                                                    }`}>
                                                        {sale.paymentStatus || 'PENDIENTE'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => openDetails(sale.id)}
                                                            className="p-2 border border-gray-100 rounded-xl text-gray-600 hover:bg-gray-50 transition flex items-center gap-2 px-4 whitespace-nowrap"
                                                            title="Ver Detalles"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            <span className="text-xs font-black uppercase">Detalles</span>
                                                        </button>
                                                        <button 
                                                            onClick={() => downloadCollectionNote(sale)}
                                                            className="p-2 bg-indigo-600 rounded-xl text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition flex items-center gap-2 px-4 whitespace-nowrap"
                                                            title="Descargar PDF"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            <span className="text-xs font-black uppercase">PDF</span>
                                                        </button>
                                                        <button 
                                                            onClick={() => downloadCollectionExcel(sale)}
                                                            className="p-2 bg-emerald-600 rounded-xl text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition flex items-center gap-2 px-4 whitespace-nowrap"
                                                            title="Descargar Excel"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                            <span className="text-xs font-black uppercase">Excel</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectedSaleId && (
                <SaleDetailsModal 
                    saleId={selectedSaleId}
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedSaleId(null);
                    }}
                />
            )}
        </Layout>
    );
}
