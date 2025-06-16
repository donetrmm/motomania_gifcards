// Sistema de Rate Limiting para acciones críticas
interface RateLimitEntry {
  count: number
  firstAttempt: number
  lastAttempt: number
}

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  blockDurationMs: number
}

export class RateLimiter {
  private static instance: RateLimiter
  private attempts: Map<string, RateLimitEntry> = new Map()
  
  // Configuraciones por tipo de acción
  private configs: Record<string, RateLimitConfig> = {
    // Creación de tarjetas: máximo 10 por minuto
    createCard: {
      maxAttempts: 10,
      windowMs: 60000, // 1 minuto
      blockDurationMs: 300000 // 5 minutos de bloqueo
    },
    
    // Cambio de contraseña: máximo 3 por hora
    changePassword: {
      maxAttempts: 3,
      windowMs: 3600000, // 1 hora
      blockDurationMs: 1800000 // 30 minutos de bloqueo
    },
    
    // Ajustes de saldo: máximo 20 por minuto
    adjustBalance: {
      maxAttempts: 20,
      windowMs: 60000, // 1 minuto
      blockDurationMs: 600000 // 10 minutos de bloqueo
    },
    
    // Exportación: máximo 50 por hora
    export: {
      maxAttempts: 50,
      windowMs: 3600000, // 1 hora
      blockDurationMs: 300000 // 5 minutos de bloqueo
    },
    
    // Importación: máximo 5 por hora
    import: {
      maxAttempts: 5,
      windowMs: 3600000, // 1 hora
      blockDurationMs: 1800000 // 30 minutos de bloqueo
    },
    
    // Escaneo QR: máximo 100 por minuto
    scanQR: {
      maxAttempts: 100,
      windowMs: 60000, // 1 minuto
      blockDurationMs: 60000 // 1 minuto de bloqueo
    }
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter()
    }
    return RateLimiter.instance
  }

  // Verificar si una acción está permitida
  checkLimit(action: string, identifier: string = 'default'): { allowed: boolean; message?: string; retryAfter?: number } {
    const config = this.configs[action]
    if (!config) {
      return { allowed: true } // Si no hay configuración, permitir
    }

    const key = `${action}:${identifier}`
    const now = Date.now()
    const entry = this.attempts.get(key)

    // Si no hay entrada previa, permitir
    if (!entry) {
      this.attempts.set(key, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      })
      return { allowed: true }
    }

    // Verificar si estamos en período de bloqueo
    if (entry.lastAttempt + config.blockDurationMs > now && entry.count >= config.maxAttempts) {
      const retryAfter = Math.ceil((entry.lastAttempt + config.blockDurationMs - now) / 1000)
      return {
        allowed: false,
        message: `Acción bloqueada temporalmente. Intenta de nuevo en ${Math.ceil(retryAfter / 60)} minutos.`,
        retryAfter
      }
    }

    // Verificar si estamos en una nueva ventana de tiempo
    if (now - entry.firstAttempt > config.windowMs) {
      // Nueva ventana, reiniciar contador
      this.attempts.set(key, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      })
      return { allowed: true }
    }

    // Incrementar contador en la ventana actual
    entry.count++
    entry.lastAttempt = now
    this.attempts.set(key, entry)

    // Verificar si se excedió el límite
    if (entry.count > config.maxAttempts) {
      const retryAfter = Math.ceil(config.blockDurationMs / 1000)
      return {
        allowed: false,
        message: `Demasiados intentos. Acción bloqueada por ${Math.ceil(retryAfter / 60)} minutos.`,
        retryAfter
      }
    }

    return { allowed: true }
  }

  // Obtener información del límite actual
  getLimitInfo(action: string, identifier: string = 'default'): { remaining: number; resetTime: number } {
    const config = this.configs[action]
    if (!config) {
      return { remaining: Infinity, resetTime: 0 }
    }

    const key = `${action}:${identifier}`
    const entry = this.attempts.get(key)
    const now = Date.now()

    if (!entry) {
      return { remaining: config.maxAttempts, resetTime: 0 }
    }

    // Si estamos en nueva ventana, límite completo disponible
    if (now - entry.firstAttempt > config.windowMs) {
      return { remaining: config.maxAttempts, resetTime: 0 }
    }

    const remaining = Math.max(0, config.maxAttempts - entry.count)
    const resetTime = entry.firstAttempt + config.windowMs

    return { remaining, resetTime }
  }

  // Limpiar entradas antiguas (mantenimiento)
  cleanup(): void {
    const now = Date.now()
    const maxAge = Math.max(...Object.values(this.configs).map(c => c.windowMs + c.blockDurationMs))

    for (const [key, entry] of this.attempts.entries()) {
      if (now - entry.lastAttempt > maxAge) {
        this.attempts.delete(key)
      }
    }
  }

  // Resetear límites para una acción específica (solo para emergencias)
  resetLimits(action: string, identifier: string = 'default'): void {
    const key = `${action}:${identifier}`
    this.attempts.delete(key)
  }

  // Obtener estadísticas de uso
  getStats(): Record<string, { totalAttempts: number; blockedAttempts: number }> {
    const stats: Record<string, { totalAttempts: number; blockedAttempts: number }> = {}
    
    for (const [key, entry] of this.attempts.entries()) {
      const [action] = key.split(':')
      const config = this.configs[action]
      
      if (!stats[action]) {
        stats[action] = { totalAttempts: 0, blockedAttempts: 0 }
      }
      
      stats[action].totalAttempts += entry.count
      if (config && entry.count > config.maxAttempts) {
        stats[action].blockedAttempts += entry.count - config.maxAttempts
      }
    }
    
    return stats
  }
}

// Instancia global
export const rateLimiter = RateLimiter.getInstance()

// Limpiar automáticamente cada 10 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    rateLimiter.cleanup()
  }, 600000) // 10 minutos
} 