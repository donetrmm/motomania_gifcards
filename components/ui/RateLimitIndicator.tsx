import React, { useState, useEffect } from 'react'
import { rateLimiter } from '@/lib/rate-limiter'
import { Shield, Clock, AlertTriangle } from 'lucide-react'

interface RateLimitIndicatorProps {
  action: string
  className?: string
}

export const RateLimitIndicator: React.FC<RateLimitIndicatorProps> = ({
  action,
  className = ''
}) => {
  const [limitInfo, setLimitInfo] = useState({ remaining: 0, resetTime: 0 })
  const [isBlocked, setIsBlocked] = useState(false)

  useEffect(() => {
    const updateLimitInfo = () => {
      const info = rateLimiter.getLimitInfo(action)
      const check = rateLimiter.checkLimit(action)
      
      setLimitInfo(info)
      setIsBlocked(!check.allowed)
    }

    updateLimitInfo()
    const interval = setInterval(updateLimitInfo, 1000) // Actualizar cada segundo

    return () => clearInterval(interval)
  }, [action])

  const getTimeUntilReset = () => {
    if (limitInfo.resetTime === 0) return ''
    
    const now = Date.now()
    const timeLeft = Math.max(0, limitInfo.resetTime - now)
    const minutes = Math.floor(timeLeft / 60000)
    const seconds = Math.floor((timeLeft % 60000) / 1000)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  const getProgressPercentage = () => {
    if (limitInfo.remaining === Infinity) return 100
    
    // Obtener configuración del rate limiter para calcular el máximo
    const configs = {
      createCard: 10,
      changePassword: 3,
      adjustBalance: 20,
      export: 50,
      import: 5,
      scanQR: 100
    }
    
    const maxAttempts = configs[action as keyof typeof configs] || 10
    return (limitInfo.remaining / maxAttempts) * 100
  }

  const getStatusColor = () => {
    if (isBlocked) return 'text-red-400 bg-red-900/20 border-red-500/30'
    
    const percentage = getProgressPercentage()
    if (percentage > 50) return 'text-green-400 bg-green-900/20 border-green-500/30'
    if (percentage > 20) return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30'
    return 'text-orange-400 bg-orange-900/20 border-orange-500/30'
  }

  const getActionName = () => {
    const names = {
      createCard: 'Crear Tarjetas',
      changePassword: 'Cambiar Contraseña',
      adjustBalance: 'Ajustar Saldo',
      export: 'Exportar',
      import: 'Importar',
      scanQR: 'Escanear QR'
    }
    
    return names[action as keyof typeof names] || action
  }

  if (limitInfo.remaining === Infinity) {
    return null // No mostrar si no hay límites
  }

  return (
    <div className={`${getStatusColor()} rounded-lg border p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {isBlocked ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <Shield className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">{getActionName()}</span>
        </div>
        
        {limitInfo.resetTime > 0 && (
          <div className="flex items-center space-x-1 text-xs">
            <Clock className="w-3 h-3" />
            <span>{getTimeUntilReset()}</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>
            {isBlocked ? 'Bloqueado' : `${limitInfo.remaining} restantes`}
          </span>
          <span>{Math.round(getProgressPercentage())}%</span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              isBlocked 
                ? 'bg-red-500' 
                : getProgressPercentage() > 50 
                  ? 'bg-green-500' 
                  : getProgressPercentage() > 20 
                    ? 'bg-yellow-500' 
                    : 'bg-orange-500'
            }`}
            style={{ width: `${isBlocked ? 100 : getProgressPercentage()}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// Componente para mostrar múltiples indicadores
export const RateLimitDashboard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const actions = ['createCard', 'changePassword', 'adjustBalance', 'export', 'import']

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Límites de Seguridad</h3>
      {actions.map(action => (
        <RateLimitIndicator key={action} action={action} />
      ))}
    </div>
  )
} 