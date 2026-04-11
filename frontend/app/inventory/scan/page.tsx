// frontend/app/inventory/scan/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Layout } from '../../../components/common/Layout';
import { useInventory } from '../../../hooks/useInventory';
import { useProducts } from '../../../hooks/useProducts';
import { 
  Barcode, 
  Camera, 
  Keyboard, 
  ArrowUpCircle, 
  ArrowDownCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  Scan,
  QrCode,
  Loader2,
  History,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Truck,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { ProductBarcode } from '../../../components/products/Barcode';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

// Tipos
type MovementType = 'ENTRY' | 'EXIT';
type ScanMode = 'camera' | 'manual' | 'scanner';

interface ScannedItem {
  id: string;
  variantSku: string;
  productName: string;
  size: string;
  color: string;
  stock: number;
  quantity: number;
  price: number;
  timestamp: Date;
}

export default function ScanPage() {
  const { registerMovement, registerBulkMovement, isRegistering } = useInventory();
  const { products, isLoading: productsLoading } = useProducts();
  
  // Estados
  const [movementType, setMovementType] = useState<MovementType>('EXIT');
  const [scanMode, setScanMode] = useState<ScanMode>('scanner');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [detectedBarcode, setDetectedBarcode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Auto-focus en el input para escáner
  useEffect(() => {
    if (scanMode === 'scanner' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanMode, scannedItems]);

  // Inicializar lector de códigos
  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.QR_CODE
    ]);
    codeReader.current = new BrowserMultiFormatReader(hints);
    
    return () => {
      if (codeReader.current) {
        try {
          codeReader.current.reset();
        } catch (e) {
          console.error('Error resetting code reader:', e);
        }
      }
    };
  }, []);

  // Obtener cámaras disponibles
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameras(videoDevices);
        
        // Seleccionar cámara trasera por defecto si existe
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('trasera')
        );
        
        if (backCamera) {
          setSelectedCamera(backCamera.deviceId);
        } else if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting cameras:', error);
      }
    };
    
    if (scanMode === 'camera') {
      getCameras();
    }
  }, [scanMode]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setCameraActive(true);
      setIsScanning(true);
      
      // Verificar permisos
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Iniciar escaneo continuo
      startContinuousScan();
      
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      setCameraError(error.message);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Permiso denegado para usar la cámara. Por favor, concede permisos en tu navegador.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error('No se encontró ninguna cámara en tu dispositivo.');
      } else {
        toast.error('No se pudo acceder a la cámara: ' + error.message);
      }
      
      setCameraActive(false);
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    setCameraActive(false);
    setIsScanning(false);
    setDetectedBarcode('');
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const startContinuousScan = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    scanIntervalRef.current = window.setInterval(async () => {
      if (!cameraActive || !webcamRef.current || !codeReader.current) return;
      
      try {
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;
        
        // Convertir base64 a blob
        const blob = await (await fetch(imageSrc)).blob();
        
        const imageUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.src = imageUrl;

        img.onload = async () => {
          if (!codeReader.current) return;
          try {
            const result = await codeReader.current.decodeFromImage(img);
            
            if (result && result.getText()) {
              const barcode = result.getText();
              setDetectedBarcode(barcode);
              processBarcode(barcode);
              
              // Vibrar si es posible (solo dispositivos móviles)
              if (navigator.vibrate) {
                navigator.vibrate(200);
              }
            }
          } catch (error) {
            // Ignorar error de decodificación
          } finally {
            URL.revokeObjectURL(imageUrl); // Prevenir fugas de memoria
          }
        };
      } catch (error) {
        // Error capturando la imagen
      }
    }, 500); // Escanear cada 500ms
  };

  const toggleTorch = async () => {
    if (webcamRef.current && webcamRef.current.video) {
      const stream = webcamRef.current.video.srcObject as MediaStream;
      if (stream) {
        const track = stream.getVideoTracks()[0];
        try {
          await track.applyConstraints({
            advanced: [{ torch: !torchOn } as any]
          });
          setTorchOn(!torchOn);
        } catch (error) {
          console.error('Torch not supported:', error);
          toast.error('Tu dispositivo no soporta linterna');
        }
      }
    }
  };

  const processBarcode = (barcode: string) => {
    // Buscar producto por SKU de variante
    const variant = products?.flatMap(p => 
      p.variants.map(v => ({
        ...v,
        product: p
      }))
    ).find(v => v.variantSku === barcode);

    if (variant) {
      const existingItem = scannedItems.find(item => item.variantSku === barcode);
      
      if (existingItem) {
        // Verificar stock para salidas
        if (movementType === 'EXIT' && existingItem.quantity + 1 > variant.stock) {
          toast.error(`Stock insuficiente. Stock actual: ${variant.stock}`);
          return;
        }
        
        // Si ya existe, aumentar cantidad
        setScannedItems(prev =>
          prev.map(item =>
            item.variantSku === barcode
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
        toast.success(`+1 ${variant.product.name} (${variant.size}/${variant.color})`);
      } else {
        // Verificar stock para salidas
        if (movementType === 'EXIT' && variant.stock < 1) {
          toast.error(`Stock insuficiente. Stock actual: ${variant.stock}`);
          return;
        }
        
        // Si es nuevo, agregar a la lista
        const newItem: ScannedItem = {
          id: variant.id,
          variantSku: variant.variantSku,
          productName: variant.product.name,
          size: variant.size,
          color: variant.color,
          stock: variant.stock,
          quantity: 1,
          price: variant.product.sellingPrice,
          timestamp: new Date()
        };
        setScannedItems(prev => [newItem, ...prev]);
        toast.success(`${variant.product.name} (${variant.size}/${variant.color}) agregado`);
      }
      
      setBarcodeInput('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else {
      toast.error(`Producto no encontrado: ${barcode}`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      processBarcode(barcodeInput.trim());
    }
  };

  const updateItemQuantity = (variantSku: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(variantSku);
      return;
    }

    const item = scannedItems.find(i => i.variantSku === variantSku);
    if (item && movementType === 'EXIT' && newQuantity > item.stock) {
      toast.error(`Stock insuficiente. Stock actual: ${item.stock}`);
      return;
    }

    setScannedItems(prev =>
      prev.map(item =>
        item.variantSku === variantSku
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const removeItem = (variantSku: string) => {
    setScannedItems(prev => prev.filter(item => item.variantSku !== variantSku));
    toast.success('Producto eliminado');
  };

  const clearAll = () => {
    if (scannedItems.length > 0) {
      if (confirm('¿Estás seguro de limpiar toda la lista?')) {
        setScannedItems([]);
      }
    }
  };

  const handleSubmitMovements = async () => {
    if (scannedItems.length === 0) {
      toast.error('No hay productos escaneados');
      return;
    }

    if (!reason) {
      toast.error('Selecciona un motivo');
      return;
    }

    try {
      if (scannedItems.length === 1) {
        // Movimiento simple
        await registerMovement({
          variantId: scannedItems[0].id,
          type: movementType,
          quantity: scannedItems[0].quantity,
          reason,
          reference: reference || undefined
        });
      } else {
        // Movimiento múltiple
        await registerBulkMovement({
          items: scannedItems.map(item => ({
            variantId: item.id,
            quantity: item.quantity
          })),
          reason,
          reference: reference || undefined
        });
      }

      // Limpiar después del éxito
      setScannedItems([]);
      setReason('');
      setReference('');
      setShowConfirmation(false);
      toast.success(
        movementType === 'ENTRY' 
          ? 'Entrada registrada exitosamente' 
          : 'Salida registrada exitosamente'
      );
      
      // Detener cámara después de registrar
      if (cameraActive) {
        stopCamera();
      }
    } catch (error) {
      console.error('Error registering movement:', error);
    }
  };

  const getTotalItems = () => scannedItems.reduce((sum, item) => sum + item.quantity, 0);
  const getTotalValue = () => scannedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  if (productsLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registro por Código de Barras</h1>
          <p className="text-gray-600">Escanea productos para registrar entradas o salidas</p>
        </div>
        <Link
          href="/inventory"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Volver a inventario
        </Link>
      </div>

      {/* Selector de tipo de movimiento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setMovementType('EXIT')}
          className={`p-6 rounded-xl border-2 transition flex items-center gap-4 ${
            movementType === 'EXIT'
              ? 'border-red-500 bg-red-50'
              : 'border-gray-200 hover:border-red-200 hover:bg-gray-50'
          }`}
        >
          <div className={`p-3 rounded-full ${
            movementType === 'EXIT' ? 'bg-red-500' : 'bg-gray-200'
          }`}>
            <ArrowDownCircle className={`w-8 h-8 ${
              movementType === 'EXIT' ? 'text-white' : 'text-gray-500'
            }`} />
          </div>
          <div className="text-left">
            <h2 className={`text-xl font-bold ${
              movementType === 'EXIT' ? 'text-red-600' : 'text-gray-700'
            }`}>
              Salida de Productos
            </h2>
            <p className={movementType === 'EXIT' ? 'text-red-500' : 'text-gray-500'}>
              Venta, merma, ajuste, transferencia
            </p>
          </div>
        </button>

        <button
          onClick={() => setMovementType('ENTRY')}
          className={`p-6 rounded-xl border-2 transition flex items-center gap-4 ${
            movementType === 'ENTRY'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-green-200 hover:bg-gray-50'
          }`}
        >
          <div className={`p-3 rounded-full ${
            movementType === 'ENTRY' ? 'bg-green-500' : 'bg-gray-200'
          }`}>
            <ArrowUpCircle className={`w-8 h-8 ${
              movementType === 'ENTRY' ? 'text-white' : 'text-gray-500'
            }`} />
          </div>
          <div className="text-left">
            <h2 className={`text-xl font-bold ${
              movementType === 'ENTRY' ? 'text-green-600' : 'text-gray-700'
            }`}>
              Entrada de Productos
            </h2>
            <p className={movementType === 'ENTRY' ? 'text-green-500' : 'text-gray-500'}>
              Compra, devolución, ajuste, transferencia
            </p>
          </div>
        </button>
      </div>

      {/* Selector de modo de escaneo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Modo de escaneo:</span>
          <button
            onClick={() => {
              setScanMode('scanner');
              if (cameraActive) stopCamera();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              scanMode === 'scanner'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Barcode className="w-4 h-4" />
            Escáner USB
          </button>
          <button
            onClick={() => {
              setScanMode('camera');
              if (!cameraActive) {
                startCamera();
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              scanMode === 'camera'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            Cámara
          </button>
          <button
            onClick={() => {
              setScanMode('manual');
              if (cameraActive) stopCamera();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              scanMode === 'manual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Manual
          </button>
        </div>
      </div>

      {/* Área de escaneo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Panel de escaneo */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {scanMode === 'camera' ? 'Escaneo con Cámara' : 
               scanMode === 'scanner' ? 'Escáner USB' : 'Ingreso Manual'}
            </h2>

            {/* Modo Cámara */}
            {scanMode === 'camera' && (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video w-full">
                  {cameraActive ? (
                    <>
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{
                          deviceId: selectedCamera,
                          facingMode: selectedCamera ? undefined : 'environment',
                          width: { ideal: 1280 },
                          height: { ideal: 720 }
                        }}
                        className="w-full h-full object-cover"
                        onUserMediaError={(error) => {
                          console.error('Webcam error:', error);
                          setCameraError('Error al iniciar la cámara');
                          setCameraActive(false);
                          setIsScanning(false);
                        }}
                      />
                      
                      {/* Overlay de escaneo */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 border-4 border-blue-500 rounded-lg opacity-30"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-16 border-2 border-white rounded-lg animate-pulse"></div>
                      </div>
                      
                      {/* Indicador de escaneo */}
                      <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        Escaneando...
                      </div>

                      {/* Selector de cámara */}
                      {cameras.length > 1 && (
                        <div className="absolute bottom-3 left-3">
                          <select
                            value={selectedCamera}
                            onChange={(e) => setSelectedCamera(e.target.value)}
                            className="bg-black/50 text-white text-xs rounded-lg px-2 py-1 border border-white/30"
                          >
                            {cameras.map((camera, index) => (
                              <option key={camera.deviceId} value={camera.deviceId}>
                                Cámara {index + 1}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Botón linterna */}
                      <button
                        onClick={toggleTorch}
                        className="absolute bottom-3 right-3 bg-black/50 text-white p-2 rounded-lg hover:bg-black/70 transition"
                        title="Linterna"
                      >
                        {torchOn ? '🔦' : '💡'}
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-white p-6">
                      <Camera className="w-12 h-12 opacity-40 mb-3" />
                      <p className="text-center text-gray-300 text-sm">
                        {cameraError || 'Haz clic en "Iniciar Cámara" para comenzar'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={cameraActive ? stopCamera : startCamera}
                    className={`flex-1 py-2 rounded-lg transition ${
                      cameraActive
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {cameraActive ? 'Detener Cámara' : 'Iniciar Cámara'}
                  </button>
                  
                  {cameraActive && (
                    <button
                      onClick={() => {
                        if (scanIntervalRef.current) {
                          clearInterval(scanIntervalRef.current);
                          startContinuousScan();
                        }
                      }}
                      className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                      title="Reiniciar escaneo"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {detectedBarcode && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-600">Último código detectado:</p>
                    <p className="text-lg font-mono font-bold text-blue-800 break-all">{detectedBarcode}</p>
                  </div>
                )}

                <p className="text-xs text-gray-500 text-center">
                  Enfoca el código de barras y espera la detección automática
                </p>
              </div>
            )}

            {/* Modo Escáner USB */}
            {scanMode === 'scanner' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <Barcode className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Conecta tu escáner USB y comienza a escanear
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Escáner activo
                  </div>
                </div>
                <form onSubmit={handleManualSubmit} className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Esperando código de barras..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </form>
                <p className="text-xs text-gray-500 text-center">
                  Escanea un código o ingrésalo manualmente
                </p>
              </div>
            )}

            {/* Modo Manual */}
            {scanMode === 'manual' && (
              <div className="space-y-4">
                <form onSubmit={handleManualSubmit} className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Ingresa el código de barras"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <QrCode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </form>
                <button
                  onClick={handleManualSubmit}
                  disabled={!barcodeInput.trim()}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  Agregar Producto
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Lista de productos escaneados */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-500" />
                <h2 className="font-semibold text-gray-900">
                  Productos Escaneados ({scannedItems.length})
                </h2>
              </div>
              {scannedItems.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpiar todo
                </button>
              )}
            </div>

            {scannedItems.length > 0 ? (
              <div className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
                <AnimatePresence>
                  {scannedItems.map((item) => (
                    <motion.div
                      key={item.variantSku}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="p-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start gap-4">
                        {/* Mini código */}
                        <div className="w-20 h-14 bg-gray-100 rounded p-1 flex-shrink-0">
                          <ProductBarcode 
                            value={item.variantSku}
                            width={0.8}
                            height={25}
                            displayValue={false}
                          />
                        </div>

                        {/* Info producto */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900">{item.productName}</h3>
                              <p className="text-sm text-gray-500">
                                {item.size} / {item.color} | SKU: {item.variantSku}
                              </p>
                              {movementType === 'EXIT' && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Stock disponible: {item.stock}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => removeItem(item.variantSku)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Control de cantidad */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateItemQuantity(item.variantSku, item.quantity - 1)}
                                className="p-1 border border-gray-300 rounded hover:bg-gray-100"
                                disabled={movementType === 'EXIT' && item.quantity <= 1}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-12 text-center font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateItemQuantity(item.variantSku, item.quantity + 1)}
                                className="p-1 border border-gray-300 rounded hover:bg-gray-100"
                                disabled={movementType === 'EXIT' && item.quantity >= item.stock}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <span className="font-medium text-gray-900">
                              S/ {(item.quantity * item.price).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="p-12 text-center">
                <Scan className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay productos escaneados
                </h3>
                <p className="text-gray-500">
                  Escanea códigos de barras para agregar productos a la lista
                </p>
              </div>
            )}

            {/* Resumen y acción */}
            {scannedItems.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      Total productos: <span className="font-medium">{scannedItems.length}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Total unidades: <span className="font-medium">{getTotalItems()}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Valor total</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${getTotalValue().toFixed(2)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowConfirmation(true)}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  {movementType === 'ENTRY' ? 'Registrar Entrada' : 'Registrar Salida'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmación */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Confirmar {movementType === 'ENTRY' ? 'Entrada' : 'Salida'}
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar motivo</option>
                    {movementType === 'ENTRY' ? (
                      <>
                        <option value="Compra">Compra a proveedor</option>
                        <option value="Devolución">Devolución de cliente</option>
                        <option value="Ajuste">Ajuste de inventario</option>
                        <option value="Transferencia">Transferencia</option>
                      </>
                    ) : (
                      <>
                        <option value="Venta">Venta</option>
                        <option value="Merma">Merma</option>
                        <option value="Ajuste">Ajuste de inventario</option>
                        <option value="Transferencia">Transferencia</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referencia (opcional)
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={movementType === 'ENTRY' ? 'N° factura, orden...' : 'N° venta, ticket...'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Resumen:</p>
                  <p className="text-sm">
                    <span className="font-medium">{scannedItems.length}</span> productos
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">{getTotalItems()}</span> unidades
                  </p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    Total: ${getTotalValue().toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitMovements}
                  disabled={isRegistering || !reason}
                  className={`flex-1 px-4 py-2 rounded-lg text-white transition ${
                    movementType === 'ENTRY'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50`}
                >
                  {isRegistering ? 'Registrando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}