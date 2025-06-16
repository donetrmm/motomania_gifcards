'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Download, Zap, Gift } from 'lucide-react'
import { GiftCard } from '@/types/giftcard'
import { SupabaseGiftCardService } from '@/lib/supabase-giftcard-service'
import MotomaniaLogo from './MotomaniaLogo'

interface GiftCardDesignProps {
  giftCard: GiftCard
  qrCodeUrl: string
  onExport: () => void
  isExporting: boolean
}

const GiftCardDesign = forwardRef<HTMLDivElement, GiftCardDesignProps>(
  ({ giftCard, qrCodeUrl, onExport, isExporting }, ref) => {
    const service = SupabaseGiftCardService.getInstance()
    const code = service.deobfuscateCode(giftCard.code)

    return (
      <div className="space-y-6">
        {/* Controles */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-100">
            Diseño de la {giftCard.type === 'giftcard' ? 'Tarjeta de Regalo' : 'Monedero Electrónico'}
          </h3>
          <button
            onClick={onExport}
            disabled={isExporting}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exportando...' : 'Exportar PNG'}</span>
          </button>
        </div>

        {/* Diseño de la tarjeta */}
        <div className="flex justify-center px-4">
          <div
            ref={ref}
            className="gift-card-realistic relative rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: giftCard.type === 'giftcard' 
                ? 'linear-gradient(135deg, #FF8C00 0%, #FF6600 50%, #FF4500 100%)'
                : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
            }}
          >
            {/* Efectos de fondo sutiles */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-3 right-3 w-16 h-16 rounded-full bg-white/10" />
              <div className="absolute bottom-3 left-3 w-12 h-12 rounded-full bg-white/15" />
            </div>

            {/* Contenido principal */}
            <div className="relative z-10 h-full flex flex-col p-4 lg:p-6 xl:p-7 text-white">
              {/* Header con logo, tipo y QR */}
              <div className="flex items-start justify-between mb-4 lg:mb-5 xl:mb-6">
                <div className="flex items-center space-x-2 lg:space-x-3 xl:space-x-4 flex-1 min-w-0 mr-3">
                  <div className="w-12 h-7 lg:w-16 lg:h-9 xl:w-18 xl:h-11 flex items-center justify-center flex-shrink-0">
                    <img 
                      src="/motomania_cards.png" 
                      alt="Motomania Logo" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="card-text-xs text-white font-bold leading-tight">
                      {giftCard.type === 'giftcard' ? 'TARJETA DE REGALO' : 'MONEDERO ELECTRÓNICO'}
                    </p>
                    <p className="card-text-xs text-white/80 mt-0.5">Motomania</p>
                  </div>
                </div>
                
                {/* QR Code en esquina superior derecha */}
                <div className="w-12 h-12 lg:w-24 lg:h-24 xl:w-28 xl:h-28 rounded-lg p-1 lg:p-2 xl:p-3 flex items-center justify-center flex-shrink-0">
                  {qrCodeUrl ? (
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code" 
                      className="w-full h-full object-contain rounded"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-xs text-gray-500">QR</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Información del propietario - más espacio */}
              <div className="mb-4 lg:mb-5 xl:mb-6">
                {giftCard.type === 'giftcard' ? (
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="card-text-xs text-white/80 font-medium whitespace-nowrap">PARA:</span>
                    <span className="card-text-sm font-bold text-white leading-none break-words">{giftCard.ownerName}</span>
                  </div>
                ) : (
                  <div>
                    <p className="card-text-sm font-bold text-white leading-none break-words">{giftCard.ownerName}</p>
                  </div>
                )}
              </div>

              {/* Código de tarjeta y fecha en la misma sección */}
              <div className="flex-1 flex flex-col justify-between">
                <div className="mb-2 lg:mb-3 xl:mb-4">
                  <p className="card-text-xs text-white/80 mb-1 lg:mb-1.5 xl:mb-2 uppercase tracking-wide">Código de Tarjeta</p>
                  <p className="font-mono card-text-sm font-bold text-white tracking-widest leading-none">{code}</p>
                </div>

                {/* Fecha de expiración - dentro del área segura */}
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="card-text-xs text-white/90 font-medium">Expiración:</p>
                    <p className="card-text-xs font-bold text-white leading-none">
                      {giftCard.expiresAt 
                        ? giftCard.expiresAt.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric'
                          })
                        : 'Sin vencimiento'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Brillo sutil */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent shimmer" />
          </div>
        </div>

        {/* Información adicional */}
        <div className="bg-neutral-800 rounded-xl p-5 space-y-3 text-sm border border-neutral-700/50">
          <h5 className="font-semibold text-gray-100 mb-3 flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
            <span>Información de la Tarjeta:</span>
          </h5>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="font-medium text-gray-300">Código:</span> 
              <p className="text-gray-100 font-mono text-xs">{code}</p>
            </div>
            <div className="space-y-1">
              <span className="font-medium text-gray-300">Estado:</span> 
              <p className={`text-sm font-semibold ${giftCard.isActive ? 'text-green-400' : 'text-red-400'}`}>
                {giftCard.isActive ? 'Activa' : 'Inactiva'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-medium text-gray-300">Tipo:</span> 
              <p className="text-gray-100">{giftCard.type === 'giftcard' ? 'Tarjeta de Regalo' : 'Monedero Electrónico'}</p>
            </div>
            <div className="space-y-1">
              <span className="font-medium text-gray-300">Creada:</span> 
              <p className="text-gray-100">{giftCard.createdAt.toLocaleDateString()}</p>
            </div>
            {giftCard.expiresAt && (
              <div className="space-y-1">
                <span className="font-medium text-gray-300">Vence:</span> 
                <p className="text-gray-100">{giftCard.expiresAt.toLocaleDateString()}</p>
              </div>
            )}
            <div className="space-y-1">
              <span className="font-medium text-gray-300">Propietario:</span> 
              <p className="text-gray-100">{giftCard.ownerName}</p>
            </div>
          </div>
          
          {giftCard.notes && (
            <div className="mt-4 pt-4 border-t border-neutral-700">
              <span className="font-medium text-gray-300">Notas:</span> 
              <p className="text-gray-100 mt-1">{giftCard.notes}</p>
            </div>
          )}
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-900/40 border border-blue-500/60 rounded-xl p-5">
          <h5 className="font-semibold text-blue-300 mb-3 flex items-center space-x-2">
            <Gift className="w-5 h-5" />
            <span>Instrucciones de uso</span>
          </h5>
          <ul className="text-sm text-blue-200 space-y-2 list-disc list-inside">
            <li>Presenta el código de la tarjeta o escanea el QR en nuestras instalaciones</li>
            <li>El personal verificará la validez y aplicará el descuento correspondiente</li>
            <li>Guarda esta tarjeta de forma segura hasta su uso</li>
            {giftCard.type === 'giftcard' ? (
              <li className="text-blue-300 font-medium">Esta tarjeta de regalo es válida para una sola compra</li>
            ) : (
              <li className="text-blue-300 font-medium">Este monedero electrónico puede usarse múltiples veces y recargarse</li>
            )}
            {giftCard.expiresAt && (
              <li className="text-yellow-300 font-medium">Válida hasta: {giftCard.expiresAt.toLocaleDateString()}</li>
            )}
          </ul>
        </div>
      </div>
    )
  }
)

GiftCardDesign.displayName = 'GiftCardDesign'

export default GiftCardDesign