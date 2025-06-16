'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, Power } from 'lucide-react'
import { GiftCard } from '@/types/giftcard'
import { GiftCardService } from '@/lib/giftcard-service'
import { useToast } from '@/components/ui/Toast'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface DeleteGiftCardModalProps {
  isOpen: boolean
  onClose: () => void
  giftCard: GiftCard | null
  onDeleted?: () => void
}

export default function DeleteGiftCardModal({
  isOpen,
  onClose,
  giftCard,
  onDeleted
}: DeleteGiftCardModalProps) {
  const [confirmationCode, setConfirmationCode] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [step, setStep] = useState(1) // 1: Advertencia, 2: Confirmación
  const [action, setAction] = useState<'delete' | 'deactivate'>('delete')
  const { addToast } = useToast()
  const service = GiftCardService.getInstance()

  // Auto scroll al modal y atajo Escape
  useEffect(() => {
    if (isOpen) {
      // Auto scroll al modal
      const modalElement = document.querySelector('[data-modal="delete-card"]')
      if (modalElement) {
        modalElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }

      // Atajo Escape para cerrar
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isDeleting) {
          handleClose()
        }
      }

      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, isDeleting])

  if (!isOpen || !giftCard) return null

  const expectedCode = service.getDeleteConfirmationCode(giftCard.id)
  const confirmationCodeNeeded = typeof expectedCode === 'string' ? expectedCode : ''

  const handleClose = () => {
    if (!isDeleting) {
      setStep(1)
      setAction('delete')
      setConfirmationCode('')
      onClose()
    }
  }

  const handleContinue = () => {
    if (action === 'deactivate') {
      // Ejecutar desactivación directamente
      handleExecuteAction()
    } else {
      // Ir al paso de confirmación para eliminación
      setStep(2)
    }
  }

  const handleExecuteAction = async () => {
    if (!giftCard || isDeleting) return

    setIsDeleting(true)

    try {
      if (action === 'deactivate') {
        // Desactivar tarjeta
        const result = service.deactivateGiftCard(giftCard.id)
        
        if (!result) {
          addToast({
            type: 'error',
            title: 'Error al desactivar',
            message: 'No se pudo desactivar la tarjeta. Puede que ya esté inactiva.'
          })
          setIsDeleting(false)
          return
        }

        addToast({
          type: 'success',
          title: 'Tarjeta desactivada correctamente',
                      message: `La tarjeta de ${giftCard.ownerName} ha sido desactivada. Se puede reactivar más tarde.`
        })

        onDeleted?.()
        handleClose()
      } else {
        // Eliminar permanentemente
        if (confirmationCode !== confirmationCodeNeeded) {
          addToast({
            type: 'error',
            title: 'Código incorrecto',
            message: `Debe escribir exactamente: ${confirmationCodeNeeded}`
          })
          return
        }

        const result = service.permanentlyDeleteGiftCard(giftCard.id, confirmationCode)

        if (typeof result === 'object' && result.error) {
          addToast({
            type: 'error',
            title: 'Error al eliminar',
            message: result.error
          })
          return
        }

        addToast({
          type: 'success',
          title: 'Tarjeta eliminada',
                      message: `La tarjeta de ${giftCard.ownerName} ha sido eliminada permanentemente`
        })

        onDeleted?.()
        handleClose()
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error inesperado',
                    message: `Ocurrió un error al ${action === 'delete' ? 'eliminar' : 'desactivar'} la tarjeta`
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        data-modal="delete-card"
        className="bg-neutral-800 border border-neutral-700/50 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-red-500/30 bg-red-900/20">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-100">
              {action === 'delete' ? 'Eliminar Tarjeta Permanentemente' : 'Desactivar Tarjeta'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-red-400 disabled:opacity-50"
            title="Cerrar (Escape)"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            // Step 1: Selección de acción y advertencia
            <div className="space-y-4">
              {/* Selector de acción */}
              <div className="space-y-3">
                <h3 className="text-gray-100 font-medium">¿Qué acción desea realizar?</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setAction('deactivate')}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      action === 'deactivate'
                        ? 'border-yellow-500 bg-yellow-900/20 text-yellow-300'
                        : 'border-neutral-600 bg-neutral-700/30 text-gray-300 hover:border-yellow-500/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Power className="w-5 h-5" />
                      <div className="text-left">
                        <p className="font-medium">Desactivar Tarjeta</p>
                        <p className="text-xs opacity-80">Mantiene historial, se puede reactivar</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setAction('delete')}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      action === 'delete'
                        ? 'border-red-500 bg-red-900/20 text-red-300'
                        : 'border-neutral-600 bg-neutral-700/30 text-gray-300 hover:border-red-500/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-5 h-5" />
                      <div className="text-left">
                        <p className="font-medium">Eliminar Permanentemente</p>
                        <p className="text-xs opacity-80">IRREVERSIBLE, elimina todo el historial</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {action === 'delete' && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <h3 className="text-red-400 font-medium mb-2">
                    ATENCIÓN: Esta acción es IRREVERSIBLE
                  </h3>
                  <ul className="text-red-300 text-sm space-y-1">
                    <li>• La tarjeta será eliminada permanentemente</li>
                    <li>• Todas las transacciones serán eliminadas</li>
                    <li>• Los datos NO se pueden recuperar</li>
                    <li>• Esta acción afecta los reportes históricos</li>
                  </ul>
                </div>
              )}

              {action === 'deactivate' && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                  <h3 className="text-yellow-400 font-medium mb-2">
                    Información: Desactivación de Tarjeta
                  </h3>
                  <ul className="text-yellow-300 text-sm space-y-1">
                    <li>• La tarjeta quedará inactiva temporalmente</li>
                    <li>• Se preserva todo el historial de transacciones</li>
                    <li>• Se puede reactivar en cualquier momento</li>
                    <li>• No afecta los reportes históricos</li>
                  </ul>
                </div>
              )}

              <div className="bg-neutral-700/30 rounded-lg p-4">
                <h4 className="font-medium text-gray-100 mb-2">
                  {action === 'delete' ? 'Tarjeta a eliminar:' : 'Tarjeta a desactivar:'}
                </h4>
                <div className="text-sm text-gray-300 space-y-1">
                  <p><strong>Propietario:</strong> {giftCard.ownerName}</p>
                  <p><strong>Email:</strong> {giftCard.ownerEmail}</p>
                  <p><strong>Código:</strong> {service.deobfuscateCode(giftCard.code)}</p>
                  <p><strong>Saldo Actual:</strong> ${giftCard.currentAmount.toLocaleString()}</p>
                  <p><strong>Transacciones:</strong> {giftCard.transactions.length}</p>
                </div>
              </div>


            </div>
                      ) : (
              // Step 2: Confirmation (solo para eliminación)
              <div className="space-y-4">
                <div className="text-center">
                  <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-100 mb-2">
                    Confirmación Final de Eliminación
                  </h3>
                  <p className="text-gray-300">
                    Para confirmar la eliminación PERMANENTE, escriba exactamente el siguiente código:
                  </p>
                </div>

              <div className="bg-neutral-700/50 rounded-lg p-4 text-center">
                <code className="text-lg font-mono font-bold text-red-400">
                  {confirmationCodeNeeded}
                </code>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Código de confirmación:
                </label>
                <input
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                  placeholder={confirmationCodeNeeded}
                  className="w-full px-3 py-2 border border-neutral-600 bg-neutral-700 text-gray-100 rounded-md font-mono text-center text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  disabled={isDeleting}
                  autoFocus
                />
              </div>

              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-300 text-sm text-center">
                  Una vez eliminada, esta tarjeta y todas sus transacciones desaparecerán para siempre
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-700/30 border-t border-neutral-600 flex justify-end space-x-3">
          {step === 1 ? (
            <>
                              <button
                  onClick={handleClose}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-300 bg-neutral-700 border border-neutral-600 rounded-md hover:bg-neutral-600 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleContinue}
                  disabled={isDeleting}
                  className={`px-4 py-2 text-white rounded-md disabled:opacity-50 ${
                    action === 'deactivate' 
                      ? 'bg-yellow-600 hover:bg-yellow-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {action === 'deactivate' ? 'Desactivar Ahora' : 'Continuar'}
                </button>
            </>
          ) : (
            <>
                              <button
                  onClick={() => setStep(1)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-300 bg-neutral-700 border border-neutral-600 rounded-md hover:bg-neutral-600 disabled:opacity-50"
                >
                  ← Atrás
                </button>
              <button
                onClick={handleExecuteAction}
                disabled={isDeleting || confirmationCode !== confirmationCodeNeeded}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isDeleting ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Eliminar Permanentemente</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 