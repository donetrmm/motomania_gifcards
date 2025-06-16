// Configuración centralizada del sistema
export const CONFIG = {
  // Configuración de seguridad
  SECURITY: {
    SECRET_KEY: process.env.SECURITY_SECRET_KEY || "MotoM@nia#2024$GiftCard%System!Prod",
    SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT || "3600000"), // 1 hora
    MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5"),
    LOCKOUT_DURATION: parseInt(process.env.LOCKOUT_DURATION || "900000"), // 15 minutos
    PASSWORD_MIN_LENGTH: 8,
    REQUIRE_SPECIAL_CHARS: true
  },

  // Configuración de aplicación
  APP: {
    NAME: process.env.NEXT_PUBLIC_APP_NAME || "Motomania GiftCard System",
    VERSION: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    ENV: process.env.NODE_ENV || "development"
  },

  // Configuración de logs
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || "error",
    ENABLE_DEBUG: process.env.ENABLE_DEBUG_LOGS === "true" || process.env.NODE_ENV === "development"
  },

  // Configuración de almacenamiento
  STORAGE: {
    ENCRYPT_DATA: true,
    BACKUP_INTERVAL: 300000, // 5 minutos
    MAX_STORAGE_SIZE: 50 * 1024 * 1024 // 50MB
  }
}

// Validar configuración crítica
export function validateConfig(): boolean {
  const requiredKeys = [
    CONFIG.SECURITY.SECRET_KEY,
    CONFIG.APP.NAME
  ]
  
  return requiredKeys.every(key => key && key.length > 0)
}

// Función para logs seguros (solo en desarrollo o errores críticos)
export function secureLog(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  if (CONFIG.APP.ENV === 'production' && level !== 'error') {
    return // No logs en producción excepto errores
  }
  
  if (CONFIG.LOGGING.ENABLE_DEBUG || level === 'error') {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`
    
    switch (level) {
      case 'error':
        console.error(logMessage, data || '')
        break
      case 'warn':
        console.warn(logMessage, data || '')
        break
      case 'info':
        console.log(logMessage, data || '')
        break
    }
  }
} 