'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, Camera, Search, AlertCircle, CheckCircle, X, StopCircle } from 'lucide-react'
import { GiftCard } from '@/types/giftcard'
import { SupabaseGiftCardService } from '@/lib/supabase-giftcard-service'

// Importar html5-qrcode dinámicamente para evitar problemas de SSR
let Html5QrcodeScanner: any = null
let Html5Qrcode: any = null

interface QRScannerProps {
  isOpen: boolean
  onClose: () => void
  onCardFound: (card: GiftCard) => void
  onError?: (error: string) => void
}

export default function QRScanner({ isOpen, onClose, onCardFound, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [scanResult, setScanResult] = useState<GiftCard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'manual' | 'camera'>('manual')
  const [hasCamera, setHasCamera] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false)
  const [qrScanner, setQrScanner] = useState<any>(null)
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending')
  
  const service = SupabaseGiftCardService.getInstance()
  const scannerRef = useRef<HTMLDivElement>(null)

  // Cargar la librería html5-qrcode dinámicamente
  useEffect(() => {
    const loadQRLibrary = async () => {
      try {
        const { Html5QrcodeScanner: Scanner, Html5Qrcode: QrCode } = await import('html5-qrcode')
        Html5QrcodeScanner = Scanner
        Html5Qrcode = QrCode
        setIsLibraryLoaded(true)
        console.log('✅ QR library loaded successfully')
      } catch (error) {
        console.error('❌ Error loading QR library:', error)
        setError('Error al cargar la librería de escaneo QR')
      }
    }

    if (typeof window !== 'undefined') {
      loadQRLibrary()
    }
  }, [])

  // Verificar si hay cámara disponible y permisos
  useEffect(() => {
    const checkCameraAndPermissions = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('❌ Navigator.mediaDevices not available')
        setHasCamera(false)
        setCameraPermission('denied')
        return
      }

      try {
        // Verificar si hay cámaras disponibles
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        
        if (videoDevices.length === 0) {
          console.log('❌ No video devices found')
          setHasCamera(false)
          setCameraPermission('denied')
          return
        }

        console.log(`📹 Found ${videoDevices.length} video device(s):`, videoDevices.map(d => d.label || 'Unknown'))

        // Solicitar permiso de cámara
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment', // Preferir cámara trasera
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        })
        
        console.log('✅ Camera permission granted')
        setHasCamera(true)
        setCameraPermission('granted')
        
        // Cerrar el stream de prueba
        stream.getTracks().forEach(track => track.stop())
      } catch (error: any) {
        console.error('❌ Camera access error:', error)
        setHasCamera(false)
        setCameraPermission('denied')
        
        if (error.name === 'NotAllowedError') {
          setError('Permisos de cámara denegados. Por favor, permite el acceso a la cámara y recarga la página.')
        } else if (error.name === 'NotFoundError') {
          setError('No se encontró ninguna cámara en este dispositivo.')
        } else {
          setError(`Error de cámara: ${error.message}`)
        }
      }
    }

    checkCameraAndPermissions()
  }, [])

  // Limpiar escáner al cerrar
  useEffect(() => {
    if (!isOpen && qrScanner) {
      stopScanning()
    }
  }, [isOpen])

  const handleManualSearch = async () => {
    if (!manualCode.trim()) {
      setError('Ingresa un código válido')
      return
    }

    setError(null)
    setScanResult(null)
    setIsSearching(true)
    
    try {
      const card = await service.findGiftCardByCode(manualCode.trim())
      
      if (card) {
        setScanResult(card)
        onCardFound(card)
      } else {
        setError('Código no encontrado. Verifica que el código sea correcto.')
      }
    } catch (error) {
      console.error('Error searching card:', error)
      setError('Error al buscar la tarjeta')
    } finally {
      setIsSearching(false)
    }
  }

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
    console.log('🔍 QR Code scanned:', decodedText)
    
    // Detener el escáner
    stopScanning()
    
    setError(null)
    setScanResult(null)
    setIsSearching(true)
    
    try {
      // Intentar parsear como JSON si contiene datos estructurados
      let codeToSearch = decodedText.trim()
      try {
        const qrData = JSON.parse(decodedText)
        if (qrData.code) {
          codeToSearch = qrData.code
        }
      } catch {
        // No es JSON, usar el texto tal como está
      }

      // Buscar la tarjeta por el código escaneado
      const card = await service.findGiftCardByCode(codeToSearch)
      
      if (card) {
        console.log('✅ Card found:', card.code)
        setScanResult(card)
        onCardFound(card)
      } else {
        setError(`Código "${codeToSearch}" no encontrado en el sistema.`)
      }
    } catch (error) {
      console.error('❌ Error processing scanned code:', error)
      setError('Error al procesar el código escaneado')
    } finally {
      setIsSearching(false)
    }
  }

  const onScanFailure = (error: string) => {
    // Solo loggear errores específicos, no todos los intentos de escaneo
    if (error.includes('NotFoundException') === false) {
      console.warn('QR Scan error:', error)
    }
  }

  const startScanning = async () => {
    if (!isLibraryLoaded || !Html5QrcodeScanner || !hasCamera || cameraPermission !== 'granted') {
      setError('Escáner QR no disponible o sin permisos de cámara')
      return
    }

    setError(null)
    setIsScanning(true)

    // Esperar un momento para que el DOM esté listo
    setTimeout(() => {
      try {
        // Verificar que el elemento existe
        const qrReaderElement = document.getElementById('qr-reader')
        if (!qrReaderElement) {
          throw new Error('Elemento qr-reader no encontrado en el DOM')
        }

        // Limpiar cualquier scanner anterior
        qrReaderElement.innerHTML = ''

        console.log('🚀 Starting QR scanner...')

        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          { 
            fps: 10,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            defaultZoomValueIfSupported: 1,
            rememberLastUsedCamera: true,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            }
          },
          false // verbose logging
        )

        scanner.render(onScanSuccess, onScanFailure)
        setQrScanner(scanner)
        console.log('✅ QR scanner started successfully')
      } catch (error: any) {
        console.error('❌ Error starting QR scanner:', error)
        setError(`Error al iniciar el escáner QR: ${error.message}`)
        setIsScanning(false)
      }
    }, 200) // Delay de 200ms para que el DOM esté listo
  }

  const stopScanning = () => {
    if (qrScanner) {
      try {
        console.log('🛑 Stopping QR scanner...')
        qrScanner.clear()
        setQrScanner(null)
        console.log('✅ QR scanner stopped')
      } catch (error) {
        console.error('❌ Error stopping scanner:', error)
      }
    }
    setIsScanning(false)
  }

  const handleScanQR = () => {
    if (!hasCamera) {
      setError('No se detectó cámara en este dispositivo')
      return
    }

    if (cameraPermission === 'denied') {
      setError('Permisos de cámara denegados. Permite el acceso a la cámara y recarga la página.')
      return
    }

    if (!isLibraryLoaded) {
      setError('Librería de escaneo QR aún no está cargada')
      return
    }

    setMode('camera')
    // Esperar a que el DOM se actualice antes de iniciar el escáner
    setTimeout(() => {
      startScanning()
    }, 300)
  }

  const resetScanner = () => {
    stopScanning()
    setScanResult(null)
    setError(null)
    setManualCode('')
    setMode('manual')
    setIsScanning(false)
  }

  const handleClose = () => {
    resetScanner()
    onClose()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <QrCode className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-100 mb-2">Escáner de GiftCards</h2>
        <p className="text-gray-300">
          Escanea el código QR o ingresa manualmente el código de la tarjeta
        </p>
      </motion.div>

      {/* Selector de modo */}
      <div className="flex rounded-lg border border-neutral-600 p-1 bg-neutral-800/50">
        <button
          onClick={() => {
            if (mode === 'camera') stopScanning()
            setMode('manual')
          }}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md font-medium transition-colors ${
            mode === 'manual'
              ? 'bg-neutral-700 text-primary-400 shadow-sm'
              : 'text-gray-300 hover:text-gray-100'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Código Manual</span>
        </button>
        
        <button
          onClick={() => setMode('camera')}
          disabled={!hasCamera || !isLibraryLoaded || cameraPermission !== 'granted'}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md font-medium transition-colors ${
            mode === 'camera'
              ? 'bg-neutral-700 text-primary-400 shadow-sm'
              : 'text-gray-300 hover:text-gray-100'
          } ${(!hasCamera || !isLibraryLoaded || cameraPermission !== 'granted') ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Camera className="w-4 h-4" />
          <span>Escanear QR</span>
        </button>
      </div>

      {/* Alertas de estado */}
      {cameraPermission === 'pending' && (
        <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
          <p className="text-blue-300 text-sm">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Verificando permisos de cámara...
          </p>
        </div>
      )}

      {cameraPermission === 'denied' && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Acceso a la cámara denegado. Para usar el escáner QR, permite el acceso a la cámara en tu navegador y recarga la página.
          </p>
        </div>
      )}

      {!hasCamera && cameraPermission === 'granted' && (
        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
          <p className="text-yellow-300 text-sm">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            No se detectó cámara en este dispositivo. Usa el código manual.
          </p>
        </div>
      )}

      {!isLibraryLoaded && mode === 'camera' && (
        <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
          <p className="text-blue-300 text-sm">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Cargando librería de escaneo QR...
          </p>
        </div>
      )}

      {/* Mensajes de error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-900/30 border border-red-500/50 rounded-lg p-4"
          >
            <p className="text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resultado del escaneo */}
      <AnimatePresence>
        {scanResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-green-900/30 border border-green-500/50 rounded-lg p-6"
          >
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-green-300 font-semibold mb-2">¡Tarjeta encontrada!</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Código:</strong> {service.deobfuscateCode(scanResult.code)}</p>
                  <p><strong>Propietario:</strong> {scanResult.ownerName}</p>
                  <p><strong>Saldo:</strong> ${scanResult.currentAmount.toFixed(2)}</p>
                  <p><strong>Estado:</strong> {service.getGiftCardStatus(scanResult)}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido principal */}
      <div className="card">
        {mode === 'manual' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Código de la GiftCard
              </label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  className="input-field flex-1 font-mono"
                  placeholder="MM241201123456ABCD"
                  onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
                  disabled={isSearching}
                />
                <button
                  onClick={handleManualSearch}
                  className="btn-primary px-6"
                  disabled={!manualCode.trim() || isSearching}
                >
                  {isSearching ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>
            
            <div className="text-center text-sm text-gray-400">
              <p>El código generalmente comienza con "MM" seguido de números y letras</p>
            </div>
          </motion.div>
        )}

        {mode === 'camera' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {!isScanning && hasCamera && isLibraryLoaded && cameraPermission === 'granted' && (
              <div className="text-center space-y-4">
                <div className="w-32 h-32 border-4 border-dashed border-neutral-600 rounded-lg flex items-center justify-center mx-auto">
                  <Camera className="w-16 h-16 text-gray-400" />
                </div>
                
                <button
                  onClick={handleScanQR}
                  className="btn-primary flex items-center space-x-2 mx-auto"
                >
                  <QrCode className="w-5 h-5" />
                  <span>Iniciar Escáner QR</span>
                </button>
                
                <p className="text-sm text-gray-400">
                  Posiciona el código QR dentro del marco para escanearlo
                </p>
              </div>
            )}

            {isScanning && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-200">Escaneando...</h3>
                  <button
                    onClick={stopScanning}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <StopCircle className="w-4 h-4" />
                    <span>Detener</span>
                  </button>
                </div>
                
                {/* Contenedor del escáner QR */}
                <div className="bg-black rounded-lg overflow-hidden border-2 border-primary-500/50">
                  <div 
                    id="qr-reader"
                    ref={scannerRef}
                    className="w-full max-w-md mx-auto"
                    style={{ minHeight: '350px' }}
                  />
                </div>
                
                <div className="text-center text-sm text-gray-400">
                  <p>Apunta la cámara hacia el código QR de la tarjeta</p>
                  <p>El escaneo se realizará automáticamente</p>
                </div>
              </div>
            )}

            {/* Instrucciones cuando no se puede escanear */}
            {(!hasCamera || cameraPermission !== 'granted' || !isLibraryLoaded) && (
              <div className="text-center space-y-4 py-8">
                <div className="w-32 h-32 border-4 border-dashed border-gray-600 rounded-lg flex items-center justify-center mx-auto opacity-50">
                  <Camera className="w-16 h-16 text-gray-500" />
                </div>
                <div className="text-gray-400">
                  <p className="font-medium">Escáner QR no disponible</p>
                  <p className="text-sm mt-2">
                    {cameraPermission === 'denied' ? 'Permisos de cámara denegados' :
                     !hasCamera ? 'No se detectó cámara' :
                     !isLibraryLoaded ? 'Cargando librería...' : 'Error desconocido'}
                  </p>
                  <p className="text-sm text-primary-400 mt-2">
                    Usa la búsqueda manual mientras tanto
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex justify-between">
        <button
          onClick={resetScanner}
          className="btn-secondary"
          disabled={isSearching}
        >
          Limpiar
        </button>
        <button
          onClick={handleClose}
          className="btn-primary"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
} 