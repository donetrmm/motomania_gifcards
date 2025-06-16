'use client'

import { motion } from 'framer-motion'
import { Eye, Edit, Trash2, CreditCard, Calendar, DollarSign, User } from 'lucide-react'
import { GiftCard } from '@/types/giftcard'
import { SupabaseGiftCardService } from '@/lib/supabase-giftcard-service'


interface GiftCardListProps {
  giftCards: GiftCard[]
  onCardSelect: (card: GiftCard) => void
  onCardUpdate: () => void
  onCardDelete?: (card: GiftCard) => void
}

export default function GiftCardList({ giftCards, onCardSelect, onCardUpdate, onCardDelete }: GiftCardListProps) {
  const service = SupabaseGiftCardService.getInstance()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Activa':
        return 'bg-green-900/30 text-green-400 border-green-500/50'
      case 'Sin saldo':
        return 'bg-red-900/30 text-red-400 border-red-500/50'
      case 'Vencida':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-500/50'
      case 'Inactiva':
        return 'bg-neutral-700/50 text-gray-300 border-neutral-600'
      default:
        return 'bg-neutral-700/50 text-gray-300 border-neutral-600'
    }
  }

  const getStatusLabel = (status: string) => {
    return status // El servicio ya devuelve el label correcto
  }

  const handleQuickAction = async (card: GiftCard, action: 'deactivate' | 'reactivate') => {
    try {
      if (action === 'deactivate') {
        const success = service.deactivateGiftCard(card.id)
        if (!success) {
          console.error('Error deactivating card')
          return
        }
      } else {
        // Reactivar tarjeta/monedero
        if (card.type === 'ewallet' && card.currentAmount <= 0) {
          console.warn('Cannot reactivate wallet with zero balance')
          return
        }
        
        const result = service.updateGiftCard(card.id, { isActive: true })
        if (typeof result === 'object' && result.error) {
          console.error('Error reactivating card:', result.error)
          return
        }
      }
      onCardUpdate()
    } catch (error) {
      console.error('Error performing quick action:', error)
    }
  }

  if (giftCards.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-100 mb-2">No hay tarjetas</h3>
        <p className="text-gray-300">
          Crea tu primera GiftCard para comenzar a gestionar tu monedero electrónico.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      {giftCards.map((card, index) => {
        const status = service.getGiftCardStatus(card)
        const statusColor = getStatusColor(status)
        const statusLabel = getStatusLabel(status)

        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card hover:shadow-xl hover:border-neutral-600/70 transition-all duration-300 cursor-pointer group relative"
            onClick={() => onCardSelect(card)}
            style={{ 
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
              perspective: '1000px'
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Información principal */}
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                {/* Avatar/Icono */}
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-white" />
                </div>

                {/* Detalles */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="font-semibold text-gray-100 truncate text-base leading-tight text-crisp mobile-crisp ultra-crisp">
                      {card.ownerName}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${statusColor}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {statusLabel}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                        card.type === 'giftcard' 
                          ? 'bg-orange-900/30 text-orange-400 border-orange-500/50' 
                          : 'bg-blue-900/30 text-blue-400 border-blue-500/50'
                      }`}>
                        {card.type === 'giftcard' ? 'GiftCard' : 'Monedero'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-300">
                    <div className="flex items-center space-x-1">
                      <CreditCard className="w-4 h-4 flex-shrink-0" />
                      <span className="font-mono text-xs sm:text-sm leading-tight mobile-crisp ultra-crisp" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {service.deobfuscateCode(card.code)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4 flex-shrink-0" />
                      <span className="font-semibold leading-tight mobile-crisp" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        ${card.currentAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      </span>
                    </div>

                    <div className="hidden sm:flex items-center space-x-1">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {card.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {card.ownerEmail && (
                    <p className="text-sm text-gray-400 mt-1 truncate leading-tight">
                      {card.ownerEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* Indicador de valor y acciones */}
              <div className="flex items-center justify-between sm:justify-end gap-4">
                {/* Indicador de valor */}
                <div className="text-right flex-shrink-0">
                  <div className="text-xl sm:text-2xl font-bold text-gray-100 leading-tight text-crisp mobile-crisp ultra-crisp" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    ${card.currentAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400 leading-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    de ${card.initialAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  </div>
                  
                  {/* Barra de progreso */}
                  <div className="w-16 sm:w-24 h-2 bg-neutral-700 rounded-full mt-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${Math.max(0, Math.min(100, (card.currentAmount / card.initialAmount) * 100))}%`
                      }}
                      transition={{ duration: 1, delay: index * 0.1 + 0.5 }}
                      className={`h-full rounded-full ${
                        card.currentAmount <= 0 
                          ? 'bg-red-500' 
                          : card.currentAmount < card.initialAmount * 0.3
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center space-x-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onCardSelect(card)
                    }}
                    className="p-2 text-gray-300 hover:text-primary-400 hover:bg-primary-900/20 rounded-full transition-colors"
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {onCardDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onCardDelete(card)
                      }}
                      className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-colors"
                      title="Gestionar tarjeta (Desactivar/Eliminar)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Información adicional expandible */}
            {card.notes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-3 pt-3 border-t border-neutral-700"
              >
                <p className="text-sm text-gray-300 line-clamp-2">
                  <span className="font-medium">Notas:</span> {card.notes}
                </p>
              </motion.div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
} 