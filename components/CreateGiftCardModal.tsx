'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Mail, Phone, DollarSign, Calendar, FileText } from 'lucide-react'
import { GiftCardFormData } from '@/types/giftcard'
import { GiftCardService } from '@/lib/giftcard-service'

interface CreateGiftCardModalProps {
  type: 'giftcard' | 'ewallet'
  onClose: () => void
  onSuccess: () => void
}

export default function CreateGiftCardModal({ type, onClose, onSuccess }: CreateGiftCardModalProps) {
  const [formData, setFormData] = useState<GiftCardFormData>({
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    initialAmount: type === 'ewallet' ? 0 : 0,
    notes: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Prevenir scroll del body y auto-scroll al modal
  useEffect(() => {
    // Prevenir scroll del body
    document.body.style.overflow = 'hidden'
    
    // Auto scroll al modal
    const modalElement = document.querySelector('[data-modal="create-giftcard"]')
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.ownerName.trim()) {
      newErrors.ownerName = 'El nombre es requerido'
    }

    if (formData.ownerEmail && !/\S+@\S+\.\S+/.test(formData.ownerEmail)) {
      newErrors.ownerEmail = 'Email inválido'
    }

    if (formData.ownerPhone && !/^\+?[\d\s-()]+$/.test(formData.ownerPhone)) {
      newErrors.ownerPhone = 'Teléfono inválido'
    }

    if (type === 'giftcard') {
      if (formData.initialAmount <= 0) {
        newErrors.initialAmount = 'El monto debe ser mayor a 0'
      }
      if (formData.initialAmount > 1000000) {
        newErrors.initialAmount = 'El monto no puede ser mayor a $1,000,000'
      }
    } else if (type === 'ewallet') {
      // Para monederos, el monto siempre es 0 (se fuerza en el backend)
      formData.initialAmount = 0
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    
    try {
      const service = GiftCardService.getInstance()
      const result = service.createGiftCard({ ...formData, type })
      
      // Verificar si hay error
      if (typeof result === 'object' && 'error' in result) {
        setErrors({ general: result.error })
        return
      }
      
      // Simular delay para UX
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      onSuccess()
    } catch (error) {
      setErrors({ general: 'Error inesperado al crear la tarjeta' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: keyof GiftCardFormData, value: string | number | Date) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

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
          data-modal="create-giftcard"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-2xl h-[95vh] sm:max-h-[90vh] flex flex-col border border-neutral-700/50 overflow-hidden"
        >
          <div className="sticky top-0 z-50 bg-neutral-800 rounded-t-2xl border-b border-neutral-700 px-6 py-4 flex items-center justify-between shadow-lg">
            <h2 className="text-2xl font-bold text-gray-100">
              {type === 'giftcard' ? 'Crear Nueva GiftCard' : 'Crear Nuevo Monedero Electrónico'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-700 rounded-full transition-colors text-gray-300 hover:text-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 pt-6 sm:pt-8 space-y-6">
            {/* Información del propietario */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-100 flex items-center space-x-2">
                <User className="w-5 h-5 text-primary-400" />
                <span>Información del Propietario</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => handleChange('ownerName', e.target.value)}
                    className={`input-field ${errors.ownerName ? 'border-red-500' : ''}`}
                    placeholder="Nombre del propietario"
                  />
                  {errors.ownerName && (
                    <p className="text-red-500 text-sm mt-1">{errors.ownerName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email (Opcional)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/3 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(e) => handleChange('ownerEmail', e.target.value)}
                      className={`input-field pl-10 ${errors.ownerEmail ? 'border-red-500' : ''}`}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  {errors.ownerEmail && (
                    <p className="text-red-500 text-sm mt-1">{errors.ownerEmail}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Teléfono (Opcional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/3 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel"
                    value={formData.ownerPhone}
                    onChange={(e) => handleChange('ownerPhone', e.target.value)}
                    className={`input-field pl-10 ${errors.ownerPhone ? 'border-red-500' : ''}`}
                    placeholder="+57 300 123 4567"
                  />
                </div>
                {errors.ownerPhone && (
                  <p className="text-red-500 text-sm mt-1">{errors.ownerPhone}</p>
                )}
              </div>
            </div>

            {/* Información de la tarjeta */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-100 flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-secondary-400" />
                <span>Información de la Tarjeta</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {type === 'giftcard' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Monto Inicial *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/3 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        min="1"
                        max="1000000"
                        step="0.01"
                        value={formData.initialAmount || ''}
                        onChange={(e) => handleChange('initialAmount', parseFloat(e.target.value) || 0)}
                        className={`input-field pl-10 ${errors.initialAmount ? 'border-red-500' : ''}`}
                        placeholder="Monto requerido"
                      />
                    </div>
                    {errors.initialAmount && (
                      <p className="text-red-500 text-sm mt-1">{errors.initialAmount}</p>
                    )}
                  </div>
                )}
                
                {type === 'ewallet' && (
                  <div className="col-span-full">
                    <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
                      <p className="text-blue-300 text-sm">
                        <strong>Monedero Electrónico:</strong> Se crea automáticamente con $0.00. 
                        Podrás agregar dinero después usando la función "Ajustar Saldo".
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fecha de Vencimiento (Opcional)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/3 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.expiresAt ? formData.expiresAt.toISOString().split('T')[0] : ''}
                      onChange={(e) => handleChange('expiresAt', e.target.value ? new Date(e.target.value) : undefined as any)}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notas (Opcional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-4 text-gray-400 w-4 h-4" />
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className="input-field pl-10 min-h-[100px] resize-y"
                    placeholder="Información adicional sobre la tarjeta..."
                  />
                </div>
              </div>
            </div>

            {/* Vista previa del monto */}
            {formData.initialAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-primary-900/30 to-secondary-900/30 rounded-lg p-4 border border-primary-500/50"
              >
                <div className="text-center">
                  <p className="text-sm text-gray-300 mb-1">Valor de la Tarjeta</p>
                  <p className="text-3xl font-bold text-primary-400">
                    ${formData.initialAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Para: {formData.ownerName || 'Sin nombre'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Error general */}
            {errors.general && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-300 text-sm">{errors.general}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-neutral-600 text-gray-300 rounded-lg hover:bg-neutral-700 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creando...</span>
                  </div>
                ) : (
                  'Crear GiftCard'
                )}
              </button>
            </div>
                    </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
} 