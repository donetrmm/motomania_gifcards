'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Download, 
  Edit, 
  Minus, 
  Plus, 
  QrCode,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  FileText,
  History,
  Zap,
  ShoppingBag
} from 'lucide-react'
import { GiftCard, Transaction } from '@/types/giftcard'
import { GiftCardService } from '@/lib/giftcard-service'
import { deobfuscateCode } from '@/lib/auth'
import GiftCardDesign from './GiftCardDesign'
import MotomaniaLogo from './MotomaniaLogo'
import html2canvas from 'html2canvas'
import QRCode from 'qrcode'

interface GiftCardDetailProps {
  giftCard: GiftCard
  onClose: () => void
  onUpdate: () => void
}

export default function GiftCardDetail({ giftCard, onClose, onUpdate }: GiftCardDetailProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'transactions' | 'design'>('details')
  const [adjustAmount, setAdjustAmount] = useState<number>(0)
  const [adjustReason, setAdjustReason] = useState('')
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  
  const service = GiftCardService.getInstance()
  const cardRef = useRef<HTMLDivElement>(null)
  const code = deobfuscateCode(giftCard.code)

  // Prevenir scroll del body y auto-scroll al modal
  useEffect(() => {
    // Prevenir scroll del body
    document.body.style.overflow = 'hidden'
    
    // Auto scroll al modal
    const modalElement = document.querySelector('[data-modal="giftcard-detail"]')
    if (modalElement) {
      modalElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    // Cleanup: restaurar scroll del body al cerrar
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // Manejo de ESC para cerrar modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Generar QR code
  useEffect(() => {
    const generateQR = async () => {
      try {
        const qrData = {
          cardId: giftCard.id,
          code: code,
          amount: giftCard.currentAmount,
          timestamp: Date.now()
        }
        const qrUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        setQrCodeUrl(qrUrl)
      } catch (error) {
        // Error generating QR code
      }
    }
    generateQR()
  }, [giftCard.id, code, giftCard.currentAmount])

  const handleAdjustAmount = async (type: 'add' | 'subtract') => {
    if (adjustAmount <= 0 || !adjustReason.trim()) return

    setIsAdjusting(true)
    
    try {
      const newAmount = type === 'add' 
        ? giftCard.currentAmount + adjustAmount
        : Math.max(0, giftCard.currentAmount - adjustAmount)

      const success = service.updateGiftCardAmount(
        giftCard.id, 
        newAmount, 
        `${type === 'add' ? 'Recarga' : 'Descuento'}: ${adjustReason}`
      )

      if (success) {
        setAdjustAmount(0)
        setAdjustReason('')
        onUpdate()
      }
    } catch (error) {
              // Error adjusting amount
    } finally {
      setIsAdjusting(false)
    }
  }

  const handleRedeemFull = async () => {
    setIsAdjusting(true)
    
    try {
      const success = service.redeemGiftCard(
        giftCard.id, 
        giftCard.currentAmount, 
        'Canje completo de la tarjeta'
      )

      if (success) {
        onUpdate()
      }
    } catch (error) {
              // Error redeeming card
    } finally {
      setIsAdjusting(false)
    }
  }

  const handleExportCard = async () => {
    if (!cardRef.current) return

    setIsExporting(true)
    
    try {
      // Esperar un momento para que todos los elementos se rendericen completamente
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3, // Mayor escala para mejor calidad
        logging: false,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
        imageTimeout: 15000,
        removeContainer: true,
        // Mejorar la captura de fuentes y estilos
        onclone: (clonedDoc, element) => {
          // Asegurar que las fuentes se carguen correctamente
          const clonedElement = element as HTMLElement
          clonedElement.style.fontFamily = 'Inter, system-ui, sans-serif'
          
          // Aplicar estilos para mejor renderizado
          const allElements = clonedElement.querySelectorAll('*')
          allElements.forEach((el: any) => {
            if (el.style) {
              el.style.webkitFontSmoothing = 'antialiased'
              el.style.mozOsxFontSmoothing = 'grayscale'
            }
          })
        }
      })

      const link = document.createElement('a')
      link.download = `giftcard-${code}-${giftCard.ownerName.replace(/\s+/g, '-')}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      link.click()
    } catch (error) {
      console.error('Error exporting card:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const status = service.getGiftCardStatus(giftCard)
  const transactions = giftCard.transactions.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <AnimatePresence>
      <div 
        className="fixed bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-2 sm:p-4" 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          height: '100vh',
          width: '100vw'
        }}
      >
        <motion.div
          data-modal="giftcard-detail"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[95vh] sm:max-h-[90vh] flex flex-col border border-neutral-700/50 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white p-4 sm:p-6 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                <div className="w-12 h-6 sm:w-16 sm:h-8 rounded-lg p-1 flex items-center justify-center flex-shrink-0">
                  <MotomaniaLogo size="sm" animated={false} className="w-full h-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold truncate">{giftCard.ownerName}</h2>
                  <p className="text-white/80 font-mono text-sm sm:text-lg truncate">{code}</p>
                  <p className="text-white/60 text-xs sm:text-sm">
                    {giftCard.type === 'giftcard' ? 'Tarjeta de Regalo' : 'Monedero Electrónico'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                <button
                  onClick={handleExportCard}
                  disabled={isExporting}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors disabled:opacity-50"
                  title="Exportar tarjeta"
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Balance */}
            <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-4">
              <div className="bg-white/10 rounded-lg p-3 sm:p-4">
                <p className="text-white/80 text-xs sm:text-sm">Saldo Actual</p>
                <p className="text-xl sm:text-3xl font-bold text-white">
                  ${giftCard.currentAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                </p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 sm:p-4">
                <p className="text-white/80 text-xs sm:text-sm">Saldo Inicial</p>
                <p className="text-lg sm:text-xl font-semibold text-white">
                  ${giftCard.initialAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="border-b border-neutral-700 flex-shrink-0">
            <div className="flex overflow-x-auto scrollbar-hide px-4 sm:px-6">
              {[
                { id: 'details', label: 'Detalles', icon: User },
                { id: 'transactions', label: 'Transacciones', icon: History },
                { id: 'design', label: 'Diseño', icon: QrCode }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center space-x-2 py-3 sm:py-4 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                    activeTab === id
                      ? 'border-primary-500 text-primary-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {activeTab === 'details' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Información del propietario */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center space-x-2">
                      <User className="w-5 h-5 text-primary-400" />
                      <span>Información del Propietario</span>
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{giftCard.ownerName}</span>
                      </div>
                      
                      {giftCard.ownerEmail && (
                        <div className="flex items-center space-x-3">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-300">{giftCard.ownerEmail}</span>
                        </div>
                      )}
                      
                      {giftCard.ownerPhone && (
                        <div className="flex items-center space-x-3">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-300">{giftCard.ownerPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gestión de saldo */}
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center space-x-2">
                      <DollarSign className="w-5 h-5 text-secondary-400" />
                      <span>Gestión de Saldo</span>
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Monto a ajustar
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={adjustAmount || ''}
                          onChange={(e) => setAdjustAmount(parseFloat(e.target.value) || 0)}
                          className="input-field"
                          placeholder="0.00"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Razón del ajuste
                        </label>
                        <input
                          type="text"
                          value={adjustReason}
                          onChange={(e) => setAdjustReason(e.target.value)}
                          className="input-field"
                          placeholder="Motivo del ajuste..."
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleAdjustAmount('add')}
                          disabled={isAdjusting || adjustAmount <= 0 || !adjustReason.trim()}
                          className="btn-secondary flex items-center justify-center space-x-1 disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Agregar</span>
                        </button>
                        
                        <button
                          onClick={() => handleAdjustAmount('subtract')}
                          disabled={isAdjusting || adjustAmount <= 0 || !adjustReason.trim()}
                          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
                        >
                          <Minus className="w-4 h-4" />
                          <span>Restar</span>
                        </button>
                      </div>
                      
                      {giftCard.currentAmount > 0 && (
                        <button
                          onClick={handleRedeemFull}
                          disabled={isAdjusting}
                          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          <span>Canjear Completa</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Información adicional */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <span>Información Adicional</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Fecha de creación:</span>
                      <p className="font-medium text-gray-200">{giftCard.createdAt.toLocaleDateString()}</p>
                    </div>
                    
                    <div>
                      <span className="text-gray-400">Última actualización:</span>
                      <p className="font-medium text-gray-200">{giftCard.updatedAt.toLocaleDateString()}</p>
                    </div>
                    
                    <div>
                      <span className="text-gray-400">Estado:</span>
                      <p className="font-medium text-gray-200">{giftCard.isActive ? 'Activa' : 'Inactiva'}</p>
                    </div>
                  </div>
                  
                  {giftCard.notes && (
                    <div className="mt-4 p-3 bg-neutral-700/50 rounded-lg">
                      <p className="text-sm text-gray-300">
                        <span className="font-medium">Notas:</span> {giftCard.notes}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'transactions' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-lg font-semibold text-gray-100 mb-4">
                  Historial de Transacciones ({transactions.length})
                </h3>
                
                {transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-300">No hay transacciones registradas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="border border-neutral-600 rounded-lg p-4 bg-neutral-800/50">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-100">
                              {transaction.description}
                            </p>
                            <p className="text-sm text-gray-300">
                              {transaction.timestamp.toLocaleString()}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className={`font-bold ${
                              transaction.type === 'creation' || transaction.type === 'refund'
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {transaction.type === 'creation' || transaction.type === 'refund' ? '+' : '-'}
                              ${transaction.amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400 capitalize">
                              {transaction.type}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'design' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GiftCardDesign
                  ref={cardRef}
                  giftCard={giftCard}
                  qrCodeUrl={qrCodeUrl}
                  onExport={handleExportCard}
                  isExporting={isExporting}
                />
              </motion.div>
            )}
          </div>
          </motion.div>
      </div>
    </AnimatePresence>
  )
} 