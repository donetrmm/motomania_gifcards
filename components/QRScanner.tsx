'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { QrCode, Camera, Search, AlertCircle, CheckCircle, X } from 'lucide-react'
import { GiftCardService } from '@/lib/giftcard-service'
import { GiftCard } from '@/types/giftcard'

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
  
  const service = GiftCardService.getInstance()

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
    setMode('camera')
    setIsScanning(true)
    setError('')
    setScanResult(null)
    
    try {
      // Simulación del escáner QR - en producción usarías una librería real
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simular lectura de QR con datos JSON
      const allCards = service.getAllGiftCards()
      if (allCards.length > 0) {
        const randomCard = allCards[Math.floor(Math.random() * allCards.length)]
        
        // Simular datos QR como los que se generan en GiftCardDetail
        const qrData = {
          cardId: randomCard.id,
          code: service.deobfuscateCode(randomCard.code),
          amount: randomCard.currentAmount,
          timestamp: Date.now()
        }
        
        // Buscar la tarjeta por ID
        const foundCard = service.getGiftCardById(qrData.cardId)
        if (foundCard) {
          setScanResult(foundCard)
          onScanSuccess(foundCard)
        } else {
          setError('Tarjeta no encontrada en el sistema')
        }
      } else {
        setError('No hay tarjetas en el sistema para escanear')
      }
    } catch (error) {
      setError('Error al escanear el código QR')
    } finally {
      setIsScanning(false)
    }
  }

  const resetScanner = () => {
    setScanResult(null)
    setError('')
    setManualCode('')
    setIsScanning(false)
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
          className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md font-medium transition-colors ${
            mode === 'camera'
              ? 'bg-neutral-700 text-primary-400 shadow-sm'
              : 'text-gray-300 hover:text-gray-100'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Escanear QR</span>
        </button>
      </div>

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

        {mode === 'camera' && (
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
                <div className="relative w-48 h-48 border-4 border-primary-500 rounded-lg mx-auto overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  
                  {/* Línea de escaneo animada */}
                  <motion.div
                    initial={{ y: -10 }}
                    animate={{ y: 180 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'linear'
                    }}
                    className="absolute left-0 right-0 h-1 bg-primary-500 shadow-lg"
                  />
                </div>
                
                <div>
                  <p className="font-medium text-gray-100">Escaneando...</p>
                  <p className="text-sm text-gray-300">
                    Mantén el código QR dentro del marco
                  </p>
                  
                  <button
                    onClick={() => setIsScanning(false)}
                    className="mt-3 text-sm text-gray-400 hover:text-gray-200 underline"
                  >
                    Cancelar
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
          <li><strong>Escáner QR:</strong> Usa la cámara para escanear el código QR de la tarjeta</li>
          <li>Una vez encontrada la tarjeta, podrás ver todos sus detalles y gestionar el saldo</li>
          <li>Asegúrate de que el código esté completo y sin espacios</li>
        </ul>
      </div>
    </div>
  )
} 