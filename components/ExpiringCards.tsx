'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Calendar, CreditCard, User, Clock } from 'lucide-react'
import { GiftCard } from '@/types/giftcard'
import { SupabaseGiftCardService } from '@/lib/supabase-giftcard-service'
import { DateUtils } from '@/lib/config'

interface ExpiringCardsProps {
  onCardSelect: (card: GiftCard) => void
}

export default function ExpiringCards({ onCardSelect }: ExpiringCardsProps) {
  const [expiringCards, setExpiringCards] = useState<GiftCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const service = SupabaseGiftCardService.getInstance()

  useEffect(() => {
    loadExpiringCards()
  }, [])

  const loadExpiringCards = async () => {
    setIsLoading(true)
    try {
      const cards = await service.getExpiringGiftCardsAsync(7) // Próximas a expirar en 7 días
      setExpiringCards(cards)
    } catch (error) {
      console.error('Error loading expiring cards:', error)
      setExpiringCards([])
    } finally {
      setIsLoading(false)
    }
  }

  const getDaysUntilExpiration = (expiresAt: Date) => {
    const now = new Date()
    const diffTime = expiresAt.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getUrgencyColor = (daysLeft: number) => {
    if (daysLeft <= 1) return 'text-red-400 bg-red-900/30 border-red-500/50'
    if (daysLeft <= 3) return 'text-orange-400 bg-orange-900/30 border-orange-500/50'
    return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50'
  }

  if (expiringCards.length === 0) {
    // Mostrar mensaje informativo en lugar de ocultar completamente
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
                 <div className="card border-green-500/30 bg-green-900/10">
           <div className="flex items-center space-x-3">
             <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
               <AlertTriangle className="w-5 h-5 text-green-400" />
             </div>
             <div className="min-w-0 flex-1">
               <h3 className="text-base sm:text-lg font-semibold text-green-400 leading-tight">
                 ✅ Sin Tarjetas Próximas a Expirar
               </h3>
               <p className="text-sm text-green-300/80 leading-tight">
                 No hay tarjetas que expiren en los próximos 7 días
               </p>
             </div>
           </div>
         </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="card border-yellow-500/30 bg-yellow-900/10">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-yellow-400 leading-tight">
              Tarjetas Próximas a Expirar
            </h3>
            <p className="text-sm text-yellow-300/80 leading-tight">
              {expiringCards.length} tarjeta{expiringCards.length !== 1 ? 's' : ''} expira{expiringCards.length === 1 ? '' : 'n'} en los próximos 7 días
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {expiringCards.map((card, index) => {
            const now = DateUtils.nowInMexico()
            const daysLeft = card.expiresAt ? DateUtils.daysDifferenceInMexico(now, card.expiresAt) : 0
            const urgencyColor = getUrgencyColor(daysLeft)

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-neutral-800/60 rounded-lg p-4 border border-neutral-700/50 hover:border-yellow-500/50 transition-all duration-300 cursor-pointer group"
                onClick={() => onCardSelect(card)}
                style={{ 
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden',
                  perspective: '1000px'
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>

                    {/* Información */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-100 truncate text-base leading-tight text-crisp mobile-crisp ultra-crisp">
                          {card.ownerName}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border w-fit ${
                          card.type === 'giftcard' 
                            ? 'bg-orange-900/30 text-orange-400 border-orange-500/50' 
                            : 'bg-blue-900/30 text-blue-400 border-blue-500/50'
                        }`}>
                          {card.type === 'giftcard' ? 'GiftCard' : 'Monedero'}
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-2 text-sm text-gray-300">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="w-4 h-4 flex-shrink-0" />
                          <span className="font-mono text-sm font-semibold leading-tight mobile-crisp ultra-crisp" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {service.deobfuscateCode(card.code)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-semibold leading-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {card.expiresAt ? DateUtils.formatForDisplay(card.expiresAt) : 'Sin fecha'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Indicador de urgencia */}
                  <div className={`px-3 py-2 rounded-lg border text-center flex-shrink-0 ${urgencyColor}`}>
                    <div className="flex items-center justify-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span className="font-bold text-sm leading-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {daysLeft === 0 ? 'HOY' : daysLeft === 1 ? '1 día' : `${daysLeft} días`}
                      </span>
                    </div>
                    <p className="text-xs opacity-80 mt-1 leading-tight">
                      {daysLeft === 0 ? 'Expira hoy' : 'restantes'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-4 p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
          <p className="text-sm text-yellow-200 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Recordatorio:</strong> Contacta a los propietarios para informarles sobre la próxima expiración de sus tarjetas.
            </span>
          </p>
        </div>
      </div>
    </motion.div>
  )
} 