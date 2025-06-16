import CryptoJS from 'crypto-js'
import { CONFIG, secureLog } from './config'

// Datos ofuscados - Las credenciales reales están encriptadas
const ENCRYPTED_CREDENTIALS = {
  // Usuario: motomania, Contraseña: MotoMania2024!
  username: "U2FsdGVkX193lezhOWt/vh1kbpIcsQbc0wrn+9Sc+aU=",
  password: "U2FsdGVkX1+vYgKZ8N1dZqOEKhMXhJnCxH5Q0wEUKqYj4w=="
}

const SECRET_KEY = CONFIG.SECURITY.SECRET_KEY

// Control de intentos de login
interface LoginAttempt {
  count: number
  lastAttempt: number
  lockedUntil?: number
}

const loginAttempts = new Map<string, LoginAttempt>()

export function decryptCredentials() {
  try {
    const decryptedUsername = CryptoJS.AES.decrypt(ENCRYPTED_CREDENTIALS.username, SECRET_KEY).toString(CryptoJS.enc.Utf8)
    const decryptedPassword = CryptoJS.AES.decrypt(ENCRYPTED_CREDENTIALS.password, SECRET_KEY).toString(CryptoJS.enc.Utf8)
    
    return {
      username: decryptedUsername || 'motomania',
      password: decryptedPassword || 'MotoMania2024!'
    }
  } catch (error) {
    secureLog('error', 'Error decrypting credentials', error)
    // Fallback en caso de error
    return {
      username: 'admin',
      password: 'MotoMania2024!'
    }
  }
}

export function isAccountLocked(username: string): boolean {
  const attempt = loginAttempts.get(username)
  if (!attempt || !attempt.lockedUntil) return false
  
  if (Date.now() > attempt.lockedUntil) {
    // Desbloquear cuenta
    loginAttempts.delete(username)
    return false
  }
  
  return true
}

export function recordFailedLogin(username: string): void {
  const now = Date.now()
  const attempt = loginAttempts.get(username) || { count: 0, lastAttempt: 0 }
  
  attempt.count++
  attempt.lastAttempt = now
  
  if (attempt.count >= CONFIG.SECURITY.MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = now + CONFIG.SECURITY.LOCKOUT_DURATION
    secureLog('warn', `Account locked for user: ${username}`)
  }
  
  loginAttempts.set(username, attempt)
}

export function resetLoginAttempts(username: string): void {
  loginAttempts.delete(username)
}

export function authenticateUser(username: string, password: string): { success: boolean; message?: string } {
  // Verificar si la cuenta está bloqueada
  if (isAccountLocked(username)) {
    const attempt = loginAttempts.get(username)
    const remainingTime = Math.ceil((attempt!.lockedUntil! - Date.now()) / 60000)
    return { 
      success: false, 
      message: `Cuenta bloqueada. Intenta de nuevo en ${remainingTime} minutos.` 
    }
  }

  const validCredentials = getCurrentCredentials()
  const isValid = username === validCredentials.username && password === validCredentials.password
  
  if (isValid) {
    resetLoginAttempts(username)
    secureLog('info', `Successful login for user: ${username}`)
    return { success: true }
  } else {
    recordFailedLogin(username)
    secureLog('warn', `Failed login attempt for user: ${username}`)
    return { 
      success: false, 
      message: 'Credenciales inválidas' 
    }
  }
}

export function generateSession(): string {
  const sessionData = {
    timestamp: Date.now(),
    random: Math.random().toString(36),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
  }
  
  return CryptoJS.SHA256(JSON.stringify(sessionData) + SECRET_KEY).toString()
}

export function isValidSession(session: string): boolean {
  if (!session || session.length !== 64) return false
  
  // Verificar si la sesión ha expirado
  const sessionTimestamp = getSessionTimestamp(session)
  if (sessionTimestamp && Date.now() - sessionTimestamp > CONFIG.SECURITY.SESSION_TIMEOUT) {
    return false
  }
  
  return true
}

function getSessionTimestamp(session: string): number | null {
  try {
    const sessionData = localStorage.getItem('motomania_session_data')
    if (sessionData) {
      const data = JSON.parse(sessionData)
      return data.timestamp
    }
  } catch (error) {
    secureLog('error', 'Error getting session timestamp', error)
  }
  return null
}

export function createSecureSession(): { session: string; timestamp: number } {
  const timestamp = Date.now()
  const session = generateSession()
  
  // Guardar timestamp de la sesión
  if (typeof window !== 'undefined') {
    localStorage.setItem('motomania_session_data', JSON.stringify({ timestamp }))
  }
  
  return { session, timestamp }
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < CONFIG.SECURITY.PASSWORD_MIN_LENGTH) {
    return { 
      valid: false, 
      message: `La contraseña debe tener al menos ${CONFIG.SECURITY.PASSWORD_MIN_LENGTH} caracteres` 
    }
  }
  
  if (CONFIG.SECURITY.REQUIRE_SPECIAL_CHARS) {
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    
    if (!hasSpecialChar || !hasNumber || !hasUpperCase || !hasLowerCase) {
      return {
        valid: false,
        message: 'La contraseña debe contener al menos: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial'
      }
    }
  }
  
  return { valid: true }
}

export function changePassword(currentPassword: string, newPassword: string): { success: boolean; message: string } {
  const validCredentials = getCurrentCredentials()
  
  // Verificar contraseña actual
  if (currentPassword !== validCredentials.password) {
    return { success: false, message: 'La contraseña actual es incorrecta' }
  }
  
  // Validar nueva contraseña
  const validation = validatePassword(newPassword)
  if (!validation.valid) {
    return { success: false, message: validation.message! }
  }
  
  // Guardar nueva contraseña en localStorage
  try {
    const encryptedPassword = CryptoJS.AES.encrypt(newPassword, SECRET_KEY).toString()
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('motomania_custom_password', encryptedPassword)
      secureLog('info', 'Password changed successfully')
    }
    
    return { 
      success: true, 
      message: 'Contraseña cambiada exitosamente.' 
    }
  } catch (error) {
    secureLog('error', 'Error changing password', error)
    return { success: false, message: 'Error al cambiar la contraseña' }
  }
}

export function getCurrentCredentials() {
  const defaultCredentials = decryptCredentials()
  
  // Verificar si hay una contraseña personalizada guardada
  if (typeof window !== 'undefined') {
    try {
      const customPassword = localStorage.getItem('motomania_custom_password')
      if (customPassword) {
        const decryptedCustomPassword = CryptoJS.AES.decrypt(customPassword, SECRET_KEY).toString(CryptoJS.enc.Utf8)
        if (decryptedCustomPassword) {
          return {
            username: defaultCredentials.username,
            password: decryptedCustomPassword
          }
        }
      }
    } catch (error) {
      secureLog('error', 'Error loading custom password', error)
    }
  }
  
  return defaultCredentials
}

export function obfuscateCode(code: string): string {
  return CryptoJS.AES.encrypt(code, SECRET_KEY).toString()
}

export function deobfuscateCode(encryptedCode: string): string {
  try {
    return CryptoJS.AES.decrypt(encryptedCode, SECRET_KEY).toString(CryptoJS.enc.Utf8)
  } catch {
    return ''
  }
} 