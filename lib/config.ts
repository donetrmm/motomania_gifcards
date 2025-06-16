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
    ENV: process.env.NODE_ENV || "development",
    TIMEZONE: "America/Mexico_City" // Zona horaria fija para México
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

// Configuración de validación
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[\+]?[1-9][\d]{0,15}$/,
  AMOUNT_MIN: 0.01,
  AMOUNT_MAX: 1000000,
  TEXT_MAX_LENGTH: 255,
  NOTES_MAX_LENGTH: 1000
}

// Utilidades para manejo de fechas con zona horaria México
export const DateUtils = {
  // Obtener fecha actual en zona horaria de México
  nowInMexico(): Date {
    return new Date(new Date().toLocaleString("en-US", { timeZone: CONFIG.APP.TIMEZONE }))
  },

  // Convertir fecha a zona horaria de México
  toMexicoTime(date: Date | string): Date {
    const inputDate = typeof date === 'string' ? new Date(date) : date
    return new Date(inputDate.toLocaleString("en-US", { timeZone: CONFIG.APP.TIMEZONE }))
  },

  // Obtener fecha en formato ISO pero ajustada a México
  toMexicoISOString(date?: Date): string {
    const mexicoDate = date ? this.toMexicoTime(date) : this.nowInMexico()
    return mexicoDate.toISOString()
  },

  // Formatear fecha para mostrar en interfaz
  formatForDisplay(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const inputDate = typeof date === 'string' ? new Date(date) : date
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: CONFIG.APP.TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options
    }
    return inputDate.toLocaleDateString('es-MX', defaultOptions)
  },

  // Formatear fecha y hora para mostrar en interfaz
  formatDateTimeForDisplay(date: Date | string): string {
    const inputDate = typeof date === 'string' ? new Date(date) : date
    return inputDate.toLocaleString('es-MX', {
      timeZone: CONFIG.APP.TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  },

  // Obtener inicio del día en México
  startOfDayInMexico(date?: Date): Date {
    const mexicoDate = date ? this.toMexicoTime(date) : this.nowInMexico()
    mexicoDate.setHours(0, 0, 0, 0)
    return mexicoDate
  },

  // Obtener fin del día en México
  endOfDayInMexico(date?: Date): Date {
    const mexicoDate = date ? this.toMexicoTime(date) : this.nowInMexico()
    mexicoDate.setHours(23, 59, 59, 999)
    return mexicoDate
  },

  // Agregar días a una fecha en zona horaria de México
  addDaysInMexico(date: Date, days: number): Date {
    const mexicoDate = this.toMexicoTime(date)
    mexicoDate.setDate(mexicoDate.getDate() + days)
    return mexicoDate
  },

  // Verificar si una fecha está en el pasado (México)
  isInPastMexico(date: Date | string): boolean {
    const inputDate = typeof date === 'string' ? new Date(date) : date
    return this.toMexicoTime(inputDate) < this.nowInMexico()
  },

  // Calcular diferencia en días (México)
  daysDifferenceInMexico(date1: Date | string, date2: Date | string): number {
    const d1 = this.toMexicoTime(typeof date1 === 'string' ? new Date(date1) : date1)
    const d2 = this.toMexicoTime(typeof date2 === 'string' ? new Date(date2) : date2)
    const diffTime = Math.abs(d2.getTime() - d1.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
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
    const timestamp = DateUtils.toMexicoISOString()
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