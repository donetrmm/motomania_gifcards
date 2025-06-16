import { GiftCard, Transaction, GiftCardFormData, GiftCardStatus } from '@/types/giftcard'
import { obfuscateCode, deobfuscateCode } from './auth'
import { CONFIG, secureLog } from './config'
import { DataSanitizer } from './sanitizer'
import { rateLimiter } from './rate-limiter'

const STORAGE_KEY = 'motomania_giftcards'
const TRANSACTION_STORAGE_KEY = 'motomania_transactions'

export class GiftCardService {
  private static instance: GiftCardService
  private giftCards: GiftCard[] = []
  private transactions: Transaction[] = []

  private constructor() {
    this.loadFromStorage()
  }

  static getInstance(): GiftCardService {
    if (!GiftCardService.instance) {
      GiftCardService.instance = new GiftCardService()
    }
    return GiftCardService.instance
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const storedCards = localStorage.getItem(STORAGE_KEY)
        const storedTransactions = localStorage.getItem(TRANSACTION_STORAGE_KEY)
        
        if (storedCards) {
          this.giftCards = JSON.parse(storedCards).map((card: any) => ({
            ...card,
            createdAt: new Date(card.createdAt),
            updatedAt: new Date(card.updatedAt),
            expiresAt: card.expiresAt ? new Date(card.expiresAt) : undefined,
            transactions: card.transactions.map((t: any) => ({
              ...t,
              timestamp: new Date(t.timestamp)
            }))
          }))
        }
        
        if (storedTransactions) {
          this.transactions = JSON.parse(storedTransactions).map((transaction: any) => ({
            ...transaction,
            timestamp: new Date(transaction.timestamp)
          }))
        }
      } catch (error) {
        secureLog('error', 'Error loading data from storage', error)
        this.giftCards = []
        this.transactions = []
      }
    }
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.giftCards))
        localStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(this.transactions))
      } catch (error) {
        secureLog('error', 'Error saving data to storage', error)
      }
    }
  }

  generateGiftCardCode(): string {
    let code: string
    let attempts = 0
    const maxAttempts = 100
    
    do {
      const prefix = 'MM'
      const timestamp = Date.now().toString().slice(-6)
      const random = Math.random().toString(36).substring(2, 8).toUpperCase()
      code = `${prefix}${timestamp}${random}`
      attempts++
      
      if (attempts >= maxAttempts) {
        // En caso extremo, usar un UUID más timestamp
        code = `MM${Date.now()}${crypto.randomUUID().slice(0, 4).toUpperCase()}`
        break
      }
    } while (this.giftCards.some(card => deobfuscateCode(card.code) === code))
    
    secureLog('info', 'Generated unique code', { attempts, code })
    return code
  }

  createGiftCard(formData: GiftCardFormData): GiftCard | { error: string } {
    // Verificar rate limiting
    const rateLimitCheck = rateLimiter.checkLimit('createCard')
    if (!rateLimitCheck.allowed) {
      return { error: rateLimitCheck.message || 'Demasiados intentos de creación' }
    }

    // Sanitizar datos de entrada
    const sanitizedData = DataSanitizer.sanitizeFormData(formData)
    
    // Validaciones adicionales
    if (!sanitizedData.ownerName || sanitizedData.ownerName.length < 2) {
      return { error: 'El nombre del propietario debe tener al menos 2 caracteres' }
    }
    
    // Email es opcional, pero si se proporciona debe ser válido
    if (sanitizedData.ownerEmail && !sanitizedData.ownerEmail.includes('@')) {
      return { error: 'Email inválido' }
    }
    
    // Validar monto inicial según el tipo
    if (formData.type === 'giftcard') {
      // GiftCards deben tener monto inicial > 0 (son prepagadas)
      if (sanitizedData.initialAmount <= 0) {
        return { error: 'El monto inicial de una GiftCard debe ser mayor a 0' }
      }
    } else if (formData.type === 'ewallet') {
      // Monederos siempre empiezan en $0 y se recargan después
      sanitizedData.initialAmount = 0
    }
    
    if (sanitizedData.expiresAt === null && formData.expiresAt) {
      return { error: 'Fecha de expiración inválida' }
    }

    const now = new Date()
    const code = this.generateGiftCardCode()
    
    const giftCard: GiftCard = {
      id: crypto.randomUUID(),
      code: obfuscateCode(code),
      type: sanitizedData.type || 'giftcard',
      ownerName: sanitizedData.ownerName,
      ownerEmail: sanitizedData.ownerEmail,
      ownerPhone: sanitizedData.ownerPhone,
      initialAmount: sanitizedData.initialAmount,
      currentAmount: sanitizedData.initialAmount,
      status: GiftCardStatus.ACTIVE,
      isRedeemed: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      expiresAt: sanitizedData.expiresAt,
      transactions: [],
      notes: sanitizedData.notes
    }

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      giftCardId: giftCard.id,
      type: 'creation',
      amount: sanitizedData.initialAmount,
      description: `${giftCard.type === 'giftcard' ? 'GiftCard' : 'Monedero'} creado para ${sanitizedData.ownerName}`,
      timestamp: now,
      performedBy: 'admin'
    }

    giftCard.transactions.push(transaction)
    this.giftCards.push(giftCard)
    this.transactions.push(transaction)
    this.saveToStorage()

    secureLog('info', 'Gift card created successfully', { id: giftCard.id, code: code })
    return giftCard
  }

  getAllGiftCards(): GiftCard[] {
    return [...this.giftCards]
  }

  getGiftCardById(id: string): GiftCard | undefined {
    return this.giftCards.find(card => card.id === id)
  }

  getGiftCardByCode(code: string): GiftCard | undefined {
    return this.giftCards.find(card => deobfuscateCode(card.code) === code)
  }

  // Método para desobfuscar códigos
  deobfuscateCode(code: string): string {
    return deobfuscateCode(code)
  }

  updateGiftCardAmount(id: string, newAmount: number, description: string): boolean | { error: string } {
    const card = this.getGiftCardById(id)
    if (!card) {
      return { error: 'Tarjeta no encontrada' }
    }

    // Validar que la tarjeta no esté expirada
    if (card.expiresAt && new Date() > card.expiresAt) {
      return { error: 'No se pueden realizar operaciones en tarjetas expiradas' }
    }

    // Validar que la tarjeta esté activa para operaciones (excepto recargas a monederos)
    if (!card.isActive && !(card.type === 'ewallet' && newAmount > card.currentAmount)) {
      return { error: 'Tarjeta inactiva' }
    }

    // Verificar rate limiting
    const rateLimitCheck = rateLimiter.checkLimit('adjustBalance')
    if (!rateLimitCheck.allowed) {
      return { error: rateLimitCheck.message || 'Demasiados ajustes de saldo' }
    }

    // Sanitizar y validar el nuevo monto
    const sanitizedAmount = DataSanitizer.sanitizeAmount(newAmount)
    if (sanitizedAmount < 0) {
      return { error: 'El monto no puede ser negativo' }
    }

    // Para GiftCards, no permitir recargas (solo reducciones)
    if (card.type === 'giftcard' && sanitizedAmount > card.currentAmount) {
      return { error: 'Las GiftCards no se pueden recargar, solo usar' }
    }
    
    // Para GiftCards canjeadas, no permitir cambios
    if (card.type === 'giftcard' && card.status === GiftCardStatus.REDEEMED) {
      return { error: 'No se puede modificar una tarjeta canjeada' }
    }

    // Sanitizar descripción
    const sanitizedDescription = DataSanitizer.sanitizeText(description)
    if (!sanitizedDescription) {
      return { error: 'La descripción es requerida' }
    }

    const oldAmount = card.currentAmount
    card.currentAmount = sanitizedAmount
    card.updatedAt = new Date()

    // Auto-reactivar monederos que reciben dinero
    const wasAutoReactivated = card.type === 'ewallet' && oldAmount <= 0 && sanitizedAmount > 0
    if (wasAutoReactivated) {
      card.isActive = true
      secureLog('info', 'Wallet auto-reactivated due to balance increase', { 
        id, 
        ownerName: card.ownerName,
        oldAmount,
        newAmount: sanitizedAmount 
      })
    }

    // Actualizar estado según el tipo
    this.getGiftCardStatus(card)

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      giftCardId: id,
      type: sanitizedAmount < oldAmount ? 'usage' : 'refund',
      amount: Math.abs(sanitizedAmount - oldAmount),
      description: wasAutoReactivated ? `${sanitizedDescription} (Monedero reactivado automáticamente)` : sanitizedDescription,
      timestamp: new Date(),
      performedBy: 'admin'
    }

    card.transactions.push(transaction)
    this.transactions.push(transaction)
    this.saveToStorage()

    secureLog('info', 'Gift card amount updated', { id, oldAmount, newAmount: sanitizedAmount })
    return true
  }

  redeemGiftCard(id: string, amount: number, description: string = 'Tarjeta canjeada'): boolean | { error: string } {
    const card = this.getGiftCardById(id)
    if (!card) {
      return { error: 'Tarjeta no encontrada' }
    }
    
    if (card.currentAmount < amount) {
      return { error: 'Saldo insuficiente' }
    }

    const result = this.updateGiftCardAmount(id, card.currentAmount - amount, description)
    return result
  }

  deactivateGiftCard(id: string): boolean {
    const card = this.getGiftCardById(id)
    if (!card) {
      secureLog('warn', 'Attempted to deactivate non-existent card', { id })
      return false
    }

    if (!card.isActive) {
      secureLog('warn', 'Attempted to deactivate already inactive card', { id, ownerName: card.ownerName })
      return false
    }

    card.isActive = false
    card.status = GiftCardStatus.INACTIVE
    card.updatedAt = new Date()
    
    // Crear transacción de desactivación
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      giftCardId: id,
      type: 'adjustment',
      amount: 0,
      description: 'Tarjeta desactivada por administrador',
      timestamp: new Date(),
      performedBy: 'admin'
    }

    card.transactions.push(transaction)
    this.transactions.push(transaction)
    this.saveToStorage()

    secureLog('info', 'Gift card deactivated successfully', { 
      id, 
      code: deobfuscateCode(card.code),
      ownerName: card.ownerName 
    })
    return true
  }

  getGiftCardStatus(card: GiftCard): GiftCardStatus {
    // Lógica diferente para GiftCards vs Monederos
    if (card.type === 'giftcard') {
      // GiftCards: Una vez sin dinero, quedan canjeadas permanentemente
      if (card.currentAmount <= 0) {
        card.status = GiftCardStatus.REDEEMED
        card.isRedeemed = true
        card.isActive = false
      } else if (card.expiresAt && new Date() > card.expiresAt) {
        card.status = GiftCardStatus.EXPIRED
        card.isActive = false
      } else if (!card.isActive) {
        card.status = GiftCardStatus.INACTIVE
      } else {
        card.status = GiftCardStatus.ACTIVE
      }
    } else {
      // Monederos: Se pueden recargar, auto-reactivar si tienen dinero
      if (card.currentAmount <= 0) {
        card.status = GiftCardStatus.INACTIVE
        card.isActive = false
        card.isRedeemed = false
      } else {
        // Auto-reactivar monedero si tiene dinero
        card.status = GiftCardStatus.ACTIVE
        card.isActive = true
        card.isRedeemed = false
      }
    }
    
    return card.status
  }

  getTransactionsByGiftCardId(id: string): Transaction[] {
    return this.transactions.filter(t => t.giftCardId === id)
  }

  getAllTransactions(): Transaction[] {
    return [...this.transactions]
  }

  getExpiringGiftCards(daysAhead: number = 7): GiftCard[] {
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(now.getDate() + daysAhead)

    secureLog('info', `Searching for cards expiring between ${now.toLocaleDateString()} and ${futureDate.toLocaleDateString()}`)
    secureLog('info', `Total cards: ${this.giftCards.length}`)

    const expiringCards = this.giftCards.filter(card => {
      if (!card.expiresAt || !card.isActive) return false
      
      // Tarjeta expira entre ahora y la fecha futura
      const willExpire = card.expiresAt > now && card.expiresAt <= futureDate
      
      if (willExpire) {
        secureLog('info', `Card expiring soon: ${card.ownerName} expires: ${card.expiresAt.toLocaleDateString()}`)
      }
      
      return willExpire
    })

    secureLog('info', `Expiring cards found: ${expiringCards.length}`)
    return expiringCards
  }

  exportGiftCards(): string | { error: string } {
    // Verificar rate limiting
    const rateLimitCheck = rateLimiter.checkLimit('export')
    if (!rateLimitCheck.allowed) {
      return { error: rateLimitCheck.message || 'Demasiadas exportaciones' }
    }

    try {
      const exportData = JSON.stringify({
        giftCards: this.giftCards,
        transactions: this.transactions,
        exportDate: new Date(),
        version: '1.0'
      }, null, 2)

      secureLog('info', 'Gift cards exported successfully', { count: this.giftCards.length })
      return exportData
    } catch (error) {
      secureLog('error', 'Error exporting gift cards', error)
      return { error: 'Error al exportar los datos' }
    }
  }

  importGiftCards(jsonData: string): boolean | { error: string } {
    // Verificar rate limiting
    const rateLimitCheck = rateLimiter.checkLimit('import')
    if (!rateLimitCheck.allowed) {
      return { error: rateLimitCheck.message || 'Demasiadas importaciones' }
    }

    // Sanitizar datos de entrada
    const sanitizedJsonData = DataSanitizer.sanitizeText(jsonData)
    if (!sanitizedJsonData) {
      return { error: 'Datos de importación inválidos' }
    }

    try {
      const data = JSON.parse(sanitizedJsonData)
      
      if (!data || typeof data !== 'object') {
        return { error: 'Formato de datos inválido' }
      }

      if (data.giftCards && Array.isArray(data.giftCards)) {
        // Sanitizar cada tarjeta antes de importar
        const sanitizedCards = data.giftCards.map((card: any) => {
          const sanitizedCard = DataSanitizer.sanitizeFormData(card)
          return {
            ...card,
            ownerName: sanitizedCard.ownerName,
            ownerEmail: sanitizedCard.ownerEmail,
            ownerPhone: sanitizedCard.ownerPhone,
            initialAmount: sanitizedCard.initialAmount,
            currentAmount: DataSanitizer.sanitizeAmount(card.currentAmount),
            notes: sanitizedCard.notes,
            createdAt: new Date(card.createdAt),
            updatedAt: new Date(card.updatedAt),
            expiresAt: card.expiresAt ? new Date(card.expiresAt) : undefined,
            transactions: card.transactions.map((t: any) => ({
              ...t,
              description: DataSanitizer.sanitizeText(t.description),
              timestamp: new Date(t.timestamp)
            }))
          }
        })
        
        this.giftCards = sanitizedCards
      }
      
      if (data.transactions && Array.isArray(data.transactions)) {
        this.transactions = data.transactions.map((transaction: any) => ({
          ...transaction,
          description: DataSanitizer.sanitizeText(transaction.description),
          timestamp: new Date(transaction.timestamp)
        }))
      }
      
      this.saveToStorage()
      secureLog('info', 'Gift cards imported successfully', { 
        cardsCount: this.giftCards.length,
        transactionsCount: this.transactions.length 
      })
      return true
    } catch (error) {
      secureLog('error', 'Error importing gift cards', error)
      return { error: 'Error al procesar los datos de importación' }
    }
  }

  /**
   * Elimina permanentemente una tarjeta de regalo y todas sus transacciones
   * Esta acción es IRREVERSIBLE
   */
  permanentlyDeleteGiftCard(id: string, confirmationCode: string): boolean | { error: string } {
    const card = this.getGiftCardById(id)
    if (!card) {
      return { error: 'Tarjeta no encontrada' }
    }

    // Generar código de confirmación esperado
    const expectedCode = `DELETE-${card.id.slice(-8).toUpperCase()}`
    
    if (confirmationCode !== expectedCode) {
      return { error: `Código de confirmación incorrecto. Debe escribir: ${expectedCode}` }
    }

    // Eliminar todas las transacciones relacionadas
    this.transactions = this.transactions.filter(t => t.giftCardId !== id)
    
    // Eliminar la tarjeta
    const cardIndex = this.giftCards.findIndex(c => c.id === id)
    if (cardIndex === -1) {
      return { error: 'Error interno: tarjeta no encontrada en índice' }
    }

    const deletedCard = this.giftCards[cardIndex]
    this.giftCards.splice(cardIndex, 1)
    
    // Guardar cambios
    this.saveToStorage()

    // Log de seguridad
    secureLog('warn', 'Gift card permanently deleted', {
      id: deletedCard.id,
      code: deobfuscateCode(deletedCard.code),
      ownerName: deletedCard.ownerName,
      amount: deletedCard.currentAmount,
      transactionsDeleted: this.getAllTransactions().length - this.transactions.length
    })

    return true
  }

  /**
   * Genera el código de confirmación necesario para eliminar una tarjeta
   */
  getDeleteConfirmationCode(id: string): string | { error: string } {
    const card = this.getGiftCardById(id)
    if (!card) {
      return { error: 'Tarjeta no encontrada' }
    }
    
    return `DELETE-${card.id.slice(-8).toUpperCase()}`
  }

  // Nuevo método para actualizar tarjetas completas (necesario para reactivación)
  updateGiftCard(id: string, updates: Partial<GiftCard>): boolean | { error: string } {
    const card = this.getGiftCardById(id)
    if (!card) {
      return { error: 'Tarjeta no encontrada' }
    }

    // Aplicar actualizaciones
    Object.assign(card, updates)
    card.updatedAt = new Date()

    // Si se está reactivando un monedero con dinero, asegurar que esté activo
    if (card.type === 'ewallet' && card.currentAmount > 0 && updates.isActive === true) {
      card.status = GiftCardStatus.ACTIVE
      card.isActive = true
      card.isRedeemed = false
      
      // Crear transacción de reactivación
      const transaction: Transaction = {
        id: crypto.randomUUID(),
        giftCardId: id,
        type: 'adjustment',
        amount: 0,
        description: 'Monedero reactivado por administrador',
        timestamp: new Date(),
        performedBy: 'admin'
      }

      card.transactions.push(transaction)
      this.transactions.push(transaction)
    }
    
    this.saveToStorage()
    
    secureLog('info', 'Gift card updated successfully', { 
      id, 
      updates: Object.keys(updates),
      ownerName: card.ownerName 
    })
    
    return true
  }
} 