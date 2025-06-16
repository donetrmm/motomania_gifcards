// Sistema de sanitización de datos para inputs del usuario
export class DataSanitizer {
  
  // Sanitizar texto general (nombres, notas, etc.)
  static sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') return ''
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remover caracteres HTML básicos
      .replace(/javascript:/gi, '') // Remover javascript:
      .replace(/on\w+=/gi, '') // Remover event handlers
      .replace(/script/gi, '') // Remover script tags
      .substring(0, 500) // Limitar longitud
  }

  // Sanitizar email
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') return ''
    
    return email
      .trim()
      .toLowerCase()
      .replace(/[<>]/g, '')
      .substring(0, 254) // RFC 5321 limit
  }

  // Sanitizar teléfono
  static sanitizePhone(phone: string): string {
    if (!phone || typeof phone !== 'string') return ''
    
    return phone
      .trim()
      .replace(/[^+\d\s\-()]/g, '') // Solo números, +, espacios, guiones y paréntesis
      .substring(0, 20)
  }

  // Validar y sanitizar montos
  static sanitizeAmount(amount: number | string): number {
    if (typeof amount === 'string') {
      amount = parseFloat(amount)
    }
    
    if (isNaN(amount) || amount < 0) return 0
    if (amount > 10000000) return 10000000 // Límite máximo
    
    return Math.round(amount * 100) / 100 // Redondear a 2 decimales
  }

  // Sanitizar notas/comentarios
  static sanitizeNotes(notes: string): string {
    if (!notes || typeof notes !== 'string') return ''
    
    return notes
      .trim()
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/script/gi, '')
      .substring(0, 1000) // Límite para notas
  }

  // Validar formato de fecha
  static sanitizeDate(date: string | Date): Date | null {
    if (!date) return null
    
    try {
      const parsedDate = new Date(date)
      const now = new Date()
      const maxDate = new Date()
      maxDate.setFullYear(now.getFullYear() + 10) // Máximo 10 años en el futuro
      
      if (isNaN(parsedDate.getTime())) return null
      if (parsedDate < now) return null // No fechas pasadas
      if (parsedDate > maxDate) return null // No más de 10 años
      
      return parsedDate
    } catch {
      return null
    }
  }

  // Sanitizar código de tarjeta (solo para display, no para generación)
  static sanitizeCardCode(code: string): string {
    if (!code || typeof code !== 'string') return ''
    
    return code
      .trim()
      .replace(/[^A-Za-z0-9]/g, '') // Solo alfanuméricos
      .toUpperCase()
      .substring(0, 20)
  }

  // Validar entrada completa de formulario
  static sanitizeFormData(data: any): any {
    const sanitized: any = {}
    
    // Preservar el tipo (giftcard o ewallet)
    if (data.type && ['giftcard', 'ewallet'].includes(data.type)) {
      sanitized.type = data.type
    }
    
    if (data.ownerName) {
      sanitized.ownerName = this.sanitizeText(data.ownerName)
    }
    
    if (data.ownerEmail) {
      sanitized.ownerEmail = this.sanitizeEmail(data.ownerEmail)
    }
    
    if (data.ownerPhone) {
      sanitized.ownerPhone = this.sanitizePhone(data.ownerPhone)
    }
    
    if (data.initialAmount !== undefined) {
      sanitized.initialAmount = this.sanitizeAmount(data.initialAmount)
    }
    
    if (data.notes) {
      sanitized.notes = this.sanitizeNotes(data.notes)
    }
    
    if (data.expiresAt) {
      sanitized.expiresAt = this.sanitizeDate(data.expiresAt)
    }
    
    return sanitized
  }
} 