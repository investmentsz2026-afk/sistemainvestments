// frontend/components/inventory/ScanForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { Search, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export const ScanForm: React.FC = () => {
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('Venta');
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { registerMovement, isRegistering: isLoading } = useInventory();

  useEffect(() => {
    // Enfocar el input cuando se activa el modo escaneo
    if (isScanning && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isScanning]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barcode) {
      toast.error('Escanea un código de barras');
      return;
    }

    registerMovement({
      variantId: barcode, // Asumiendo que procesará el SKU/Barcode en el backend o necesita adaptación
      type: 'EXIT',
      quantity,
      reason,
    });

    // Limpiar para el próximo escaneo
    setBarcode('');
    setQuantity(1);
    
    // Mantener el foco
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  if (!isScanning) {
    return (
      <button
        onClick={() => setIsScanning(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
      >
        <Package className="w-5 h-5 mr-2" />
        Iniciar Escaneo
      </button>
    );
  }

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Modo Escaneo
          </h3>
          <button
            onClick={() => setIsScanning(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Código de Barras
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Esperando código de barras..."
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Cantidad
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Motivo
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="Venta">Venta</option>
              <option value="Merma">Merma</option>
              <option value="Ajuste">Ajuste</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsScanning(false)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Procesando...' : 'Registrar Salida'}
            </button>
          </div>
        </form>

        <div className="mt-4 text-sm text-gray-500">
          <p className="flex items-center">
            <Package className="w-4 h-4 mr-1" />
            Escanea el código de barras y presiona Enter para registrar
          </p>
        </div>
      </div>
    </div>
  );
};