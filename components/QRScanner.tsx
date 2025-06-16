'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { QrCode, Camera, Search, AlertCircle, CheckCircle, X, StopCircle } from 'lucide-react'
import { GiftCardService } from '@/lib/giftcard-service'
import { GiftCard } from '@/types/giftcard'
import QrScanner from 'qr-scanner'

interface QRScannerProps {
  onScanSuccess: (data: any) => void
  onViewDetails?: (giftCard: GiftCard) => void
}

export default function QRScanner({ onScanSuccess, onViewDetails }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [scanResult, setScanResult] = useState<GiftCard | null>(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'manual' | 'camera'>('manual')
  const [hasCamera, setHasCamera] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const qrScannerRef = useRef<QrScanner | null>(null)
  
  const service = GiftCardService.getInstance()

  // Verificar si hay cámara disponible
  useEffect(() => {
    QrScanner.hasCamera().then(setHasCamera)
  }, [])

  // Cleanup del scanner al desmontar
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop()
        qrScannerRef.current.destroy()
      }
    }
  }, [])

  const handleManualSearch = () => {
    if (!manualCode.trim()) {
      setError('Ingresa un código válido')
      return
    }

    setError('')
    setScanResult(null)
    
    try {
      // Buscar por código desobfuscado
      const allCards = service.getAllGiftCards()
      const card = allCards.find(c => {
        const deobfuscatedCode = service.deobfuscateCode(c.code)
        return deobfuscatedCode === manualCode.trim() || c.code === manualCode.trim()
      })
      
      if (card) {
        setScanResult(card)
        onScanSuccess(card)
      } else {
        setError('Código no encontrado. Verifica que el código sea correcto.')
      }
    } catch (error) {
      setError('Error al buscar la tarjeta')
    }
  }

  const handleScanQR = async () => {
    if (!hasCamera) {
      setError('No se detectó cámara en este dispositivo')
      return
    }

    setMode('camera')
    setIsScanning(true)
    setError('')
    setScanResult(null)
    
    try {
      if (videoRef.current) {
        // Crear el scanner QR
        qrScannerRef.current = new QrScanner(
          videoRef.current,
          (result) => {
            // Resultado del QR escaneado
            try {
              // Intentar parsear como JSON (datos QR generados por la app)
              let qrData
              try {
                qrData = JSON.parse(result.data)
              } catch {
                // Si no es JSON, asumir que es un código directo
                qrData = { code: result.data }
              }

              // Buscar la tarjeta
              const allCards = service.getAllGiftCards()
              let foundCard = null

              if (qrData.cardId) {
                // Buscar por ID si está disponible
                foundCard = service.getGiftCardById(qrData.cardId)
              } else if (qrData.code) {
                // Buscar por código
                foundCard = allCards.find(c => {
                  const deobfuscatedCode = service.deobfuscateCode(c.code)
                  return deobfuscatedCode === qrData.code || c.code === qrData.code
                })
              }

              if (foundCard) {
                setScanResult(foundCard)
                onScanSuccess(foundCard)
                stopScanning()
              } else {
                setError('Tarjeta no encontrada en el sistema')
                stopScanning()
              }
            } catch (err) {
              setError('Error al procesar el código QR')
              stopScanning()
            }
          },
          {
            preferredCamera: 'environment', // Usar cámara trasera si está disponible
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        )

        await qrScannerRef.current.start()
      }
    } catch (error: any) {
      setError(`Error al iniciar la cámara: ${error.message || 'Permisos denegados'}`)
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
    }
    setIsScanning(false)
  }

  const resetScanner = () => {
    stopScanning()
    setScanResult(null)
    setError('')
    setManualCode('')
    setMode('manual')
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
          onClick={() => setMode('manual')}
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
          disabled={!hasCamera}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md font-medium transition-colors ${
            mode === 'camera'
              ? 'bg-neutral-700 text-primary-400 shadow-sm'
              : 'text-gray-300 hover:text-gray-100'
          } ${!hasCamera ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Camera className="w-4 h-4" />
          <span>Escanear QR</span>
        </button>
      </div>

      {!hasCamera && mode === 'camera' && (
        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
          <p className="text-yellow-300 text-sm">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            No se detectó cámara en este dispositivo. Usa el código manual.
          </p>
        </div>
      )}

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
                  className="input-field flex-1"
                  placeholder="MM123456789"
                  onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
                />
                <button
                  onClick={handleManualSearch}
                  className="btn-primary px-6"
                  disabled={!manualCode.trim()}
                >
                  Buscar
                </button>
              </div>
            </div>
            
            <div className="text-center text-sm text-gray-400">
              <p>El código generalmente comienza con "MM" seguido de números y letras</p>
            </div>
          </motion.div>
        )}

        {mode === 'camera' && hasCamera && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center space-y-4"
          >
            {!isScanning && !scanResult && (
              <div className="space-y-4">
                <div className="w-32 h-32 border-4 border-dashed border-neutral-600 rounded-lg flex items-center justify-center mx-auto">
                  <Camera className="w-16 h-16 text-gray-400" />
                </div>
                
                <div>
                  <button
                    onClick={handleScanQR}
                    className="btn-primary flex items-center space-x-2 mx-auto"
                  >
                    <QrCode className="w-5 h-5" />
                    <span>Iniciar Escáner</span>
                  </button>
                  <p className="text-sm text-gray-400 mt-2">
                    Haz clic para activar la cámara y escanear el código QR
                  </p>
                </div>
              </div>
            )}

            {isScanning && (
              <div className="space-y-4">
                <div className="relative w-full max-w-sm mx-auto">
                  <video
                    ref={videoRef}
                    className="w-full h-64 bg-black rounded-lg object-cover"
                    playsInline
                    muted
                  />
                  
                  {/* Overlay de escaneado */}
                  <div className="absolute inset-0 border-4 border-primary-500 rounded-lg pointer-events-none">
                    <div className="absolute inset-4 border-2 border-white/50 rounded-lg"></div>
                  </div>
                  
                  {/* Línea de escaneo animada */}
                  <motion.div
                    initial={{ y: 20 }}
                    animate={{ y: 240 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'linear'
                    }}
                    className="absolute left-4 right-4 h-0.5 bg-primary-400 shadow-lg"
                  />
                </div>
                
                <div>
                  <p className="font-medium text-gray-100">Escaneando...</p>
                  <p className="text-sm text-gray-300 mb-3">
                    Mantén el código QR dentro del marco
                  </p>
                  
                  <button
                    onClick={stopScanning}
                    className="btn-secondary flex items-center space-x-2 mx-auto"
                  >
                    <StopCircle className="w-4 h-4" />
                    <span>Detener</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Resultado del escaneo */}
      {scanResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-800 rounded-xl shadow-lg border border-green-500/50 p-6"
        >
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-green-400 mb-2">¡Tarjeta Encontrada!</h3>
              
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-green-300 font-medium">Propietario:</span>
                    <p className="text-gray-100">{scanResult.ownerName}</p>
                  </div>
                  
                  <div>
                    <span className="text-green-300 font-medium">Saldo:</span>
                    <p className="text-gray-100 font-bold">
                      ${scanResult.currentAmount.toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-green-300 font-medium">Código:</span>
                    <p className="text-gray-100 font-mono">
                      {service.deobfuscateCode(scanResult.code)}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-green-300 font-medium">Estado:</span>
                    <p className="text-gray-100">
                      {scanResult.isActive ? 'Activa' : 'Inactiva'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-4">
                <button
                  className="btn-primary text-sm"
                  onClick={() => {
                    if (onViewDetails && scanResult) {
                      onViewDetails(scanResult)
                    }
                  }}
                >
                  Ver Detalles
                </button>
                
                <button
                  onClick={resetScanner}
                  className="text-sm px-4 py-2 text-gray-300 hover:text-gray-100 underline"
                >
                  Escanear Otra
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-800 rounded-xl shadow-lg border border-red-500/50 p-6"
        >
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-400 font-medium">Error</p>
              <p className="text-gray-300 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Información adicional */}
      <div className="bg-neutral-800/60 border border-neutral-600 rounded-lg p-4">
        <h4 className="font-semibold text-blue-400 mb-2">Instrucciones</h4>
        <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
          <li><strong>Código Manual:</strong> Ingresa el código exacto de la tarjeta (ej: MM123456789)</li>
          <li><strong>Escáner QR:</strong> Permite acceso a la cámara para escanear el código QR de la tarjeta</li>
          <li>Una vez encontrada la tarjeta, podrás ver todos sus detalles y gestionar el saldo</li>
          <li>Asegúrate de que el código esté completo y sin espacios</li>
          {hasCamera && (
            <li className="text-green-400"><strong>Cámara detectada:</strong> Puedes usar el escáner QR real</li>
          )}
        </ul>
      </div>
    </div>
  )
} 