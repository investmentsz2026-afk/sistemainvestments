'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from '../../../components/common/Layout';
import api from '../../../lib/axios';
import { toast } from 'react-hot-toast';
import {
    Users,
    UserPlus,
    Calendar,
    Clock,
    DollarSign,
    Plus,
    Trash2,
    Edit,
    Printer,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Briefcase,
    Mail,
    Phone,
    FileText
} from 'lucide-react';

export default function HrPage() {
    const [activeTab, setActiveTab] = useState<'employees' | 'shifts' | 'payroll'>('employees');
    const [employees, setEmployees] = useState<any[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modals
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [showShiftModal, setShowShiftModal] = useState(false);

    // Employee Form State
    const [employeeId, setEmployeeId] = useState<string | null>(null);
    const [empName, setEmpName] = useState('');
    const [empDoc, setEmpDoc] = useState('');
    const [empPhone, setEmpPhone] = useState('');
    const [empEmail, setEmpEmail] = useState('');
    const [empRate, setEmpRate] = useState<number>(0);
    const [empActive, setEmpActive] = useState(true);
    const [isSubmittingEmp, setIsSubmittingEmp] = useState(false);

    // Deletion states
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'employee' | 'day' } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Batch Shift Form State
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
    const [batchShifts, setBatchShifts] = useState<any[]>([]);
    const [isSavingBatch, setIsSavingBatch] = useState(false);

    // Payroll Report State
    const [payrollEmpId, setPayrollEmpId] = useState('');
    const [payrollWeekStart, setPayrollWeekStart] = useState(() => {
        // Default to current week's Monday
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff)).toISOString().split('T')[0];
    });
    const [payrollReport, setPayrollReport] = useState<any>(null);
    const [isLoadingPayroll, setIsLoadingPayroll] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [empResp, shiftResp] = await Promise.all([
                api.get('/hr/employees'),
                api.get('/hr/shifts/grouped')
            ]);
            setEmployees(empResp.data);
            setShifts(shiftResp.data);
        } catch (e) {
            console.error('Error loading HR data:', e);
            toast.error('Error al cargar datos del módulo de RRHH');
        } finally {
            setIsLoading(false);
        }
    };

    // Employee Handlers
    const openCreateEmp = () => {
        setEmployeeId(null);
        setEmpName('');
        setEmpDoc('');
        setEmpPhone('');
        setEmpEmail('');
        setEmpRate(15); // standard default
        setEmpActive(true);
        setShowEmployeeModal(true);
    };

    const openEditEmp = (emp: any) => {
        setEmployeeId(emp.id);
        setEmpName(emp.name);
        setEmpDoc(emp.documentNumber);
        setEmpPhone(emp.phone || '');
        setEmpEmail(emp.email || '');
        setEmpRate(emp.hourlyRate);
        setEmpActive(emp.isActive);
        setShowEmployeeModal(true);
    };

    const handleEmployeeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingEmp(true);
        try {
            const payload = {
                name: empName,
                documentNumber: empDoc,
                phone: empPhone || null,
                email: empEmail || null,
                hourlyRate: Number(empRate),
                isActive: empActive
            };

            if (employeeId) {
                await api.patch(`/hr/employees/${employeeId}`, payload);
                toast.success('Trabajador actualizado exitosamente');
            } else {
                await api.post('/hr/employees', payload);
                toast.success('Trabajador registrado exitosamente');
            }
            setShowEmployeeModal(false);
            loadData();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Error al guardar los datos del trabajador');
        } finally {
            setIsSubmittingEmp(false);
        }
    };

    const handleDeleteEmployee = (id: string, name: string) => {
        setDeleteTarget({ id, name, type: 'employee' });
        setShowDeleteConfirm(true);
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            if (deleteTarget.type === 'employee') {
                await api.delete(`/hr/employees/${deleteTarget.id}`);
                toast.success('Trabajador eliminado exitosamente');
            } else {
                await api.delete(`/hr/shifts/day?date=${deleteTarget.id}`);
                toast.success('Planilla diaria eliminada exitosamente');
            }
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
            loadData();
        } catch (e) {
            console.error(e);
            toast.error('Error al intentar realizar la eliminación');
        } finally {
            setIsDeleting(false);
        }
    };

    // Batch Shift Handlers
    const openCreateBatch = () => {
        if (employees.length === 0) {
            toast.error('Primero debes registrar al menos un trabajador');
            return;
        }
        const initial = employees.filter(e => e.isActive).map(e => ({
            employeeId: e.id,
            name: e.name,
            hourlyRate: e.hourlyRate,
            status: 'ASISTIO',
            startTime: '08:00',
            endTime: '17:00'
        }));
        setBatchShifts(initial);
        setBatchDate(new Date().toISOString().split('T')[0]);
        setShowBatchModal(true);
    };

    const openEditBatch = (day: any) => {
        const mapped = employees.map(e => {
            const existing = day.shifts.find((s: any) => s.employeeId === e.id);
            if (existing) {
                return {
                    employeeId: e.id,
                    name: e.name,
                    hourlyRate: e.hourlyRate,
                    status: existing.status,
                    startTime: existing.status === 'ASISTIO'
                        ? new Date(existing.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                        : '08:00',
                    endTime: existing.status === 'ASISTIO'
                        ? new Date(existing.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                        : '17:00'
                };
            } else {
                return {
                    employeeId: e.id,
                    name: e.name,
                    hourlyRate: e.hourlyRate,
                    status: 'FALTA',
                    startTime: '08:00',
                    endTime: '17:00'
                };
            }
        });
        setBatchShifts(mapped);
        setBatchDate(day.date);
        setShowBatchModal(true);
    };

    const handleBatchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingBatch(true);
        try {
            // Verify entry/exit logical ranges
            for (const s of batchShifts) {
                if (s.status === 'ASISTIO') {
                    const startDateTime = new Date(`${batchDate}T${s.startTime}:00`);
                    const endDateTime = new Date(`${batchDate}T${s.endTime}:00`);
                    if (endDateTime <= startDateTime) {
                        toast.error(`La hora de salida de ${s.name} debe ser posterior a la de entrada`);
                        setIsSavingBatch(false);
                        return;
                    }
                }
            }

            const formatted = batchShifts.map(s => {
                const startDateTime = new Date(`${batchDate}T${s.startTime}:00`).toISOString();
                const endDateTime = new Date(`${batchDate}T${s.endTime}:00`).toISOString();
                return {
                    employeeId: s.employeeId,
                    status: s.status,
                    startTime: startDateTime,
                    endTime: endDateTime
                };
            });

            await api.post('/hr/shifts/batch', {
                date: new Date(batchDate).toISOString(),
                shifts: formatted
            });

            toast.success('Horario diario guardado exitosamente');
            setShowBatchModal(false);
            loadData();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Error al guardar los horarios');
        } finally {
            setIsSavingBatch(false);
        }
    };

    const handleDeleteDay = (dateStr: string) => {
        setDeleteTarget({ id: dateStr, name: dateStr, type: 'day' });
        setShowDeleteConfirm(true);
    };

    // Payroll calculation
    const handleFetchPayroll = async () => {
        if (!payrollEmpId) {
            toast.error('Selecciona un trabajador');
            return;
        }
        setIsLoadingPayroll(true);
        try {
            const resp = await api.get(`/hr/shifts/weekly-report?employeeId=${payrollEmpId}&startDate=${payrollWeekStart}`);
            setPayrollReport(resp.data);
        } catch (e) {
            toast.error('Error al cargar la nómina semanal');
        } finally {
            setIsLoadingPayroll(false);
        }
    };

    const handlePrintPayroll = () => {
        window.print();
    };

    return (
        <Layout>
            <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-16 print:p-0 print:bg-white print:max-w-full">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6 print:hidden">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Briefcase className="w-8 h-8 text-indigo-600" />
                            Recursos Humanos (RRHH)
                        </h1>
                        <p className="text-slate-500 font-medium mt-1.5 text-sm">
                            Gestión de trabajadores, programación de horarios, control de horas trabajadas y cálculo automático de pagos.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {activeTab === 'employees' && (
                            <button
                                onClick={openCreateEmp}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-black rounded-xl transition-all shadow-md active:scale-95"
                            >
                                <UserPlus className="w-4 h-4" />
                                Nuevo Trabajador
                            </button>
                        )}
                        {activeTab === 'shifts' && (
                            <button
                                onClick={openCreateBatch}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-black rounded-xl transition-all shadow-md active:scale-95"
                            >
                                <Clock className="w-4 h-4" />
                                Registrar Horario Diario
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs selection */}
                <div className="flex border-b border-slate-200 gap-6 print:hidden">
                    <button
                        onClick={() => setActiveTab('employees')}
                        className={`pb-4 text-xs font-black uppercase tracking-wider border-b-4 transition-all duration-200 ${
                            activeTab === 'employees'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Trabajadores
                    </button>
                    <button
                        onClick={() => setActiveTab('shifts')}
                        className={`pb-4 text-xs font-black uppercase tracking-wider border-b-4 transition-all duration-200 ${
                            activeTab === 'shifts'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Control de Horarios
                    </button>
                    <button
                        onClick={() => setActiveTab('payroll')}
                        className={`pb-4 text-xs font-black uppercase tracking-wider border-b-4 transition-all duration-200 ${
                            activeTab === 'payroll'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Cálculo Semanal
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4 print:hidden">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando base de datos RRHH...</p>
                    </div>
                ) : (
                    <>
                        {/* Tab 1: Employees List */}
                        {activeTab === 'employees' && (
                            <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xl overflow-hidden print:hidden">
                                <div className="p-6 border-b border-slate-100">
                                    <h3 className="text-sm font-black uppercase text-slate-500 tracking-wider">Directorio de Trabajadores</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[9px] font-black border-b border-slate-100 text-left">
                                                <th className="px-6 py-4">Colaborador</th>
                                                <th className="px-6 py-4">Documento</th>
                                                <th className="px-6 py-4">Contacto</th>
                                                <th className="px-6 py-4 text-right">Pago por Hora</th>
                                                <th className="px-6 py-4 text-center">Estado</th>
                                                <th className="px-6 py-4 text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                            {employees.length > 0 ? (
                                                employees.map((emp) => (
                                                    <tr key={emp.id} className="hover:bg-slate-50/50">
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-black text-slate-900 uppercase">{emp.name}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500">{emp.documentNumber}</td>
                                                        <td className="px-6 py-4">
                                                            {emp.phone && (
                                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                                    <Phone className="w-3.5 h-3.5" />
                                                                    {emp.phone}
                                                                </div>
                                                            )}
                                                            {emp.email && (
                                                                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mt-0.5">
                                                                    <Mail className="w-3.5 h-3.5" />
                                                                    {emp.email}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-indigo-600 text-sm font-black">
                                                            S/. {emp.hourlyRate.toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                                emp.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {emp.isActive ? 'Activo' : 'Inactivo'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex items-center justify-center gap-3">
                                                                <button
                                                                    onClick={() => openEditEmp(emp)}
                                                                    className="text-slate-500 hover:text-indigo-600 active:scale-90 transition-all"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                                                                    className="text-slate-400 hover:text-rose-600 active:scale-90 transition-all"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest">
                                                        No hay trabajadores registrados en el sistema
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Shift Logging & Control */}
                        {activeTab === 'shifts' && (
                            <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xl overflow-hidden print:hidden">
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="text-sm font-black uppercase text-slate-500 tracking-wider">Planilla de Horarios por Día</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[9px] font-black border-b border-slate-100 text-left">
                                                <th className="px-6 py-4">Fecha / Día</th>
                                                <th className="px-6 py-4 text-center">Asistencia</th>
                                                <th className="px-6 py-4 text-center">Horas Totales</th>
                                                <th className="px-6 py-4 text-right">Planilla del Día</th>
                                                <th className="px-6 py-4 text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                            {shifts.length > 0 ? (
                                                shifts.map((day) => {
                                                    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                                                    const parts = day.date.split('-');
                                                    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                                                    const dayName = dayNames[d.getDay()];

                                                    return (
                                                        <tr key={day.date} className="hover:bg-slate-50/50">
                                                            <td className="px-6 py-4">
                                                                <span className="text-sm font-black text-slate-900 uppercase">
                                                                    {dayName} {d.getDate()}/{d.getMonth() + 1}/{d.getFullYear()}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                                    day.presentCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                                }`}>
                                                                    {day.presentCount} / {day.shiftsCount} Presentes
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center text-slate-900 font-black">
                                                                {day.totalHours.toFixed(2)} hrs
                                                            </td>
                                                            <td className="px-6 py-4 text-right text-indigo-600 font-black text-sm">
                                                                S/. {day.totalPayment.toFixed(2)}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <div className="flex items-center justify-center gap-3">
                                                                    <button
                                                                        onClick={() => openEditBatch(day)}
                                                                        className="text-slate-500 hover:text-indigo-600 active:scale-90 transition-all flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg"
                                                                    >
                                                                        <Edit className="w-3.5 h-3.5" />
                                                                        <span>Ver / Editar</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteDay(day.date)}
                                                                        className="text-slate-400 hover:text-rose-600 active:scale-90 transition-all bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 p-1.5 rounded-lg"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest">
                                                        No hay planillas de horarios registradas en el sistema
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Tab 3: Weekly Payroll Calculation */}
                        {activeTab === 'payroll' && (
                            <div className="space-y-6">
                                {/* Form parameters */}
                                <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-xl flex flex-wrap items-end gap-4 print:hidden">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5">Trabajador</label>
                                        <select
                                            value={payrollEmpId}
                                            onChange={(e) => setPayrollEmpId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-700 outline-none text-xs"
                                        >
                                            <option value="">Selecciona Colaborador</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.name.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="w-48">
                                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5">Lunes de la Semana</label>
                                        <input
                                            type="date"
                                            value={payrollWeekStart}
                                            onChange={(e) => setPayrollWeekStart(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-700 outline-none text-xs"
                                        />
                                    </div>

                                    <button
                                        onClick={handleFetchPayroll}
                                        disabled={isLoadingPayroll}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 h-[38px] active:scale-95 shadow-md"
                                    >
                                        {isLoadingPayroll && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Calcular Pago
                                    </button>
                                </div>

                                {/* Report details */}
                                {payrollReport ? (
                                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl space-y-6 print:border-none print:shadow-none print:p-0">
                                        {/* Header report */}
                                        <div className="flex justify-between items-start border-b border-slate-100 pb-6">
                                            <div>
                                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full print:hidden">
                                                    Liquidación Semanal de Pago
                                                </span>
                                                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mt-3">
                                                    Nómina: {payrollReport.employee.name}
                                                </h2>
                                                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-wide mt-1">
                                                    Documento: {payrollReport.employee.documentNumber} | Semana: del {payrollReport.weekStart} al {payrollReport.weekEnd}
                                                </p>
                                            </div>

                                            <button
                                                onClick={handlePrintPayroll}
                                                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 text-xs font-black rounded-xl transition-all shadow-sm active:scale-95 print:hidden"
                                            >
                                                <Printer className="w-4 h-4" />
                                                Imprimir Boleta
                                            </button>
                                        </div>

                                        {/* Weekly Consolidated KPIs */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            <div className="bg-slate-50/50 border border-slate-150 p-5 rounded-2xl">
                                                <p className="text-[10px] font-black uppercase text-slate-400">Total Horas Semanales</p>
                                                <p className="text-2xl font-black text-slate-900 mt-2">{payrollReport.totalHours} horas</p>
                                            </div>
                                            <div className="bg-slate-50/50 border border-slate-150 p-5 rounded-2xl">
                                                <p className="text-[10px] font-black uppercase text-slate-400">Tarifa por Hora</p>
                                                <p className="text-2xl font-black text-slate-900 mt-2">S/. {payrollReport.employee.hourlyRate.toFixed(2)}</p>
                                            </div>
                                            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl text-indigo-900">
                                                <p className="text-[10px] font-black uppercase text-indigo-500">Monto Neto Semanal a Pagar</p>
                                                <p className="text-3xl font-black text-indigo-700 mt-2">S/. {payrollReport.totalPayment.toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {/* Shift list for the week */}
                                        <div>
                                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Desglose Diario de Horas</h3>
                                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[9px] font-black border-b border-slate-100 text-left">
                                                            <th className="px-6 py-3">Día / Fecha</th>
                                                            <th className="px-6 py-3 text-center">Hora Entrada</th>
                                                            <th className="px-6 py-3 text-center">Hora Salida</th>
                                                            <th className="px-6 py-3 text-center">Horas Trabajadas</th>
                                                            <th className="px-6 py-3 text-right">Monto Diario</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                                        {payrollReport.shifts.length > 0 ? (
                                                            payrollReport.shifts.map((s: any) => {
                                                                const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                                                                const dayName = dayNames[new Date(s.date).getDay()];
                                                                return (
                                                                    <tr key={s.id} className="hover:bg-slate-50/50">
                                                                        <td className="px-6 py-3">
                                                                            <span className="text-slate-900 uppercase font-black">{dayName}</span>
                                                                            <span className="text-[10px] text-slate-400 block font-normal">{new Date(s.date).toLocaleDateString()}</span>
                                                                        </td>
                                                                        <td className="px-6 py-3 text-center text-slate-500">
                                                                            {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </td>
                                                                        <td className="px-6 py-3 text-center text-slate-500">
                                                                            {new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </td>
                                                                        <td className="px-6 py-3 text-center text-slate-900 font-black">{s.hoursWorked} hrs</td>
                                                                        <td className="px-6 py-3 text-right text-emerald-600 font-black">S/. {s.totalPayment.toFixed(2)}</td>
                                                                    </tr>
                                                                );
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                                                    No hay turnos registrados para el colaborador en esta semana
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Footer signing receipt */}
                                        <div className="hidden print:block pt-16 flex justify-between">
                                            <div className="w-[200px] border-t border-slate-400 text-center pt-2">
                                                <p className="text-[9px] font-bold text-slate-500 uppercase">Firma del Colaborador</p>
                                                <p className="text-[10px] font-black text-slate-800 mt-1">{payrollReport.employee.name.toUpperCase()}</p>
                                            </div>
                                            <div className="w-[200px] border-t border-slate-400 text-center pt-2">
                                                <p className="text-[9px] font-bold text-slate-500 uppercase">Autorizado por</p>
                                                <p className="text-[10px] font-black text-slate-800 mt-1">ADMINISTRACIÓN</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 border border-dashed border-slate-350 p-16 rounded-[2rem] text-center text-slate-400 font-bold uppercase tracking-widest text-xs print:hidden">
                                        Selecciona un colaborador y presiona "Calcular Pago" para ver su reporte semanal.
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* MODAL: Employee Form */}
                {showEmployeeModal && (
                    <div className="fixed inset-0 bg-slate-950/60 z-50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">
                                {employeeId ? 'Editar Trabajador' : 'Registrar Trabajador'}
                            </h2>

                            <form onSubmit={handleEmployeeSubmit} className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5">Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={empName}
                                        onChange={(e) => setEmpName(e.target.value)}
                                        placeholder="Ej: Juan Pérez"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-700 outline-none focus:border-indigo-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5">Documento de Identidad (DNI/RUC)</label>
                                    <input
                                        type="text"
                                        value={empDoc}
                                        onChange={(e) => setEmpDoc(e.target.value)}
                                        placeholder="Ej: 71053764"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-700 outline-none focus:border-indigo-500"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5">Pago por Hora (S/.)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={empRate}
                                            onChange={(e) => setEmpRate(parseFloat(e.target.value) || 0)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-700 outline-none focus:border-indigo-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5">Teléfono</label>
                                        <input
                                            type="text"
                                            value={empPhone}
                                            onChange={(e) => setEmpPhone(e.target.value)}
                                            placeholder="999888777"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-700 outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        value={empEmail}
                                        onChange={(e) => setEmpEmail(e.target.value)}
                                        placeholder="juan@email.com"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-700 outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="empActive"
                                        checked={empActive}
                                        onChange={(e) => setEmpActive(e.target.checked)}
                                        className="w-4 h-4 rounded text-indigo-600"
                                    />
                                    <label htmlFor="empActive" className="text-slate-600 font-bold uppercase text-[10px]">Trabajador Activo</label>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowEmployeeModal(false)}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-5 py-2.5 rounded-xl text-xs active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-2.5 rounded-xl text-xs active:scale-95 flex items-center gap-2 shadow-md"
                                        disabled={isSubmittingEmp}
                                    >
                                        {isSubmittingEmp && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {employeeId ? 'Guardar Cambios' : 'Registrar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: Daily Batch Schedule Form */}
                {showBatchModal && (
                    <div className="fixed inset-0 bg-slate-950/60 z-50 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-4xl p-8 shadow-2xl relative flex flex-col max-h-[90vh]">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-indigo-600" />
                                        Planilla Diaria de Horarios
                                    </h2>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                        Ingresa la asistencia, horas de entrada y salida de todos los colaboradores.
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-36">
                                        <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Fecha</label>
                                        <input
                                            type="date"
                                            value={batchDate}
                                            onChange={(e) => setBatchDate(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 outline-none text-xs"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => window.print()}
                                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 text-[10px] font-black uppercase rounded-xl transition-all shadow-sm active:scale-95 mt-4"
                                    >
                                        <Printer className="w-4 h-4" />
                                        Imprimir Hoja de Asistencia
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleBatchSubmit} className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex-1 overflow-y-auto pr-2">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[9px] font-black border-b border-slate-100 text-left">
                                                <th className="px-4 py-3">Trabajador</th>
                                                <th className="px-4 py-3 text-center">Estado de Asistencia</th>
                                                <th className="px-4 py-3 text-center">Hora Entrada</th>
                                                <th className="px-4 py-3 text-center">Hora Salida</th>
                                                <th className="px-4 py-3 text-right">Monto Diario</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                            {batchShifts.map((s, idx) => {
                                                let hours = 0;
                                                if (s.status === 'ASISTIO') {
                                                    const [sh, sm] = s.startTime.split(':').map(Number);
                                                    const [eh, em] = s.endTime.split(':').map(Number);
                                                    const diff = (eh * 60 + em) - (sh * 60 + sm);
                                                    if (diff > 0) {
                                                        hours = diff / 60;
                                                    }
                                                }
                                                const dayPay = hours * s.hourlyRate;

                                                return (
                                                    <tr key={s.employeeId} className="hover:bg-slate-50/30">
                                                        <td className="px-4 py-3 uppercase text-slate-800 font-black">
                                                            {s.name}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <select
                                                                value={s.status}
                                                                onChange={(e) => {
                                                                    const copy = [...batchShifts];
                                                                    copy[idx].status = e.target.value;
                                                                    setBatchShifts(copy);
                                                                }}
                                                                className={`font-black rounded-xl border px-3 py-1.5 text-[10px] uppercase outline-none transition-all cursor-pointer ${
                                                                    s.status === 'ASISTIO' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                                    s.status === 'FALTA' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                                    'bg-sky-50 text-sky-600 border-sky-200'
                                                                }`}
                                                            >
                                                                <option value="ASISTIO">Asistió</option>
                                                                <option value="FALTA">Falta</option>
                                                                <option value="DESCANSO">Descanso</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <input
                                                                type="time"
                                                                value={s.startTime}
                                                                disabled={s.status !== 'ASISTIO'}
                                                                onChange={(e) => {
                                                                    const copy = [...batchShifts];
                                                                    copy[idx].startTime = e.target.value;
                                                                    setBatchShifts(copy);
                                                                }}
                                                                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 outline-none text-center disabled:opacity-40 disabled:bg-slate-100 text-xs w-28 mx-auto block"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <input
                                                                type="time"
                                                                value={s.endTime}
                                                                disabled={s.status !== 'ASISTIO'}
                                                                onChange={(e) => {
                                                                    const copy = [...batchShifts];
                                                                    copy[idx].endTime = e.target.value;
                                                                    setBatchShifts(copy);
                                                                }}
                                                                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 outline-none text-center disabled:opacity-40 disabled:bg-slate-100 text-xs w-28 mx-auto block"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm font-black text-slate-900">
                                                            {s.status === 'ASISTIO' ? (
                                                                <span className="text-emerald-600">S/. {dayPay.toFixed(2)}</span>
                                                            ) : (
                                                                <span className="text-slate-400">S/. 0.00</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowBatchModal(false)}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-6 py-3 rounded-xl text-xs active:scale-95 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSavingBatch}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-3 rounded-xl text-xs active:scale-95 transition-all flex items-center gap-2 shadow-md"
                                    >
                                        {isSavingBatch && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Guardar Planilla del Día
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {/* MODAL: Delete Confirmation */}
                {showDeleteConfirm && deleteTarget && (
                    <div className="fixed inset-0 bg-slate-950/60 z-50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl relative text-center space-y-6">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-rose-50 text-rose-600">
                                <Trash2 className="w-8 h-8 animate-pulse" />
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">¿Confirmar Eliminación?</h3>
                                <p className="text-xs text-slate-500 font-bold leading-normal mt-2">
                                    {deleteTarget.type === 'employee' 
                                        ? `¿Estás seguro de eliminar a "${deleteTarget.name}"? Se perderá permanentemente su historial de turnos y pagos.`
                                        : `¿Estás seguro de eliminar el registro completo del día "${deleteTarget.name}"? Se perderán las asistencias de todos los trabajadores registradas en esta fecha.`
                                    }
                                </p>
                            </div>

                            <div className="flex gap-3 justify-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setDeleteTarget(null);
                                    }}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-5 py-2.5 rounded-xl text-xs active:scale-95 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={executeDelete}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-black px-6 py-2.5 rounded-xl text-xs active:scale-95 transition-all flex items-center gap-2 shadow-md"
                                    disabled={isDeleting}
                                >
                                    {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Sí, Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Print Template (Visible only when printing) */}
                <div className="hidden print:block font-serif w-full p-4 text-black bg-white">
                    <h1 className="text-xl font-bold text-center border-b border-slate-950 pb-2 mb-4 uppercase">
                        Control de Asistencia Diaria
                    </h1>
                    <div className="flex justify-between text-sm font-bold mb-4 uppercase">
                        <span>Día: {new Date(batchDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        <span>Área: PRODUCCIÓN / LOGÍSTICA</span>
                    </div>
                    <table className="w-full border-collapse border border-slate-950 text-xs">
                        <thead>
                            <tr className="bg-slate-150 uppercase font-bold text-center border-b border-slate-950">
                                <th className="border border-slate-950 px-4 py-3 text-left w-1/3">Apellido y Nombre</th>
                                <th className="border border-slate-950 px-4 py-3 w-[120px]">Hora de Llegada</th>
                                <th className="border border-slate-950 px-4 py-3 w-[150px]">Firma</th>
                                <th className="border border-slate-950 px-4 py-3 w-[120px]">Hora de Salida</th>
                                <th className="border border-slate-950 px-4 py-3 w-[150px]">Firma</th>
                            </tr>
                        </thead>
                        <tbody>
                            {batchShifts.map((s, idx) => (
                                <tr key={idx} className="h-14">
                                    <td className="border border-slate-950 px-4 py-2 font-bold uppercase text-left">
                                        {s.name}
                                    </td>
                                    <td className="border border-slate-950 px-4 py-2 text-center text-slate-400 font-normal">__:__</td>
                                    <td className="border border-slate-950 px-4 py-2"></td>
                                    <td className="border border-slate-950 px-4 py-2 text-center text-slate-400 font-normal">__:__</td>
                                    <td className="border border-slate-950 px-4 py-2"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-20 flex justify-between text-[10px] font-bold uppercase px-8">
                        <div className="w-[200px] border-t border-slate-950 text-center pt-2">
                            Responsable de Control
                        </div>
                        <div className="w-[200px] border-t border-slate-950 text-center pt-2">
                            Firma y Sello del Supervisor
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
