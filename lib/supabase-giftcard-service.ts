import { supabase } from './supabase'
import { GiftCard, GiftCardFormData, Transaction, GiftCardStatus } from '@/types/giftcard'
import { deobfuscateCode } from './auth'
import { DateUtils } from './config'

export class SupabaseGiftCardService {
  private static instance: SupabaseGiftCardService
  
  static getInstance(): SupabaseGiftCardService {
    if (!SupabaseGiftCardService.instance) {
      SupabaseGiftCardService.instance = new SupabaseGiftCardService()
    }
    return SupabaseGiftCardService.instance
  }

  // Migrar tarjeta existente del localStorage
  async migrateGiftCard(existingCard: any): Promise<GiftCard | { error: string }> {
    try {
      const cardData = {
        id: existingCard.id, // Preservar ID original
        code: existingCard.code, // Preservar código original
        owner_name: existingCard.ownerName?.trim() || '',
        owner_email: existingCard.ownerEmail?.trim() || null,
        owner_phone: existingCard.ownerPhone?.trim() || null,
        initial_amount: parseFloat(existingCard.initialAmount) || 0,
        current_amount: parseFloat(existingCard.currentAmount) || 0,
        type: existingCard.type || 'giftcard',
        is_active: existingCard.isActive !== false,
        notes: existingCard.notes?.trim() || null,
        expires_at: existingCard.expiresAt ? DateUtils.toMexicoISOString(new Date(existingCard.expiresAt)) : null,
        created_at: existingCard.createdAt ? DateUtils.toMexicoISOString(new Date(existingCard.createdAt)) : DateUtils.toMexicoISOString(),
        updated_at: existingCard.updatedAt ? DateUtils.toMexicoISOString(new Date(existingCard.updatedAt)) : DateUtils.toMexicoISOString()
      }

      const { data: giftCard, error } = await supabase
        .from('gift_cards')
        .upsert([cardData]) // Usar upsert para evitar duplicados
        .select()
        .single()

      if (error) {
        console.error('Error migrating gift card:', error)
        return { error: `Error al migrar la tarjeta: ${error.message}` }
      }

      // Migrar transacciones si existen
      if (existingCard.transactions && existingCard.transactions.length > 0) {
        for (const transaction of existingCard.transactions) {
          await this.migrateTransaction(existingCard.id, transaction)
        }
      }

      return this.mapToGiftCard(giftCard)
    } catch (error) {
      console.error('Error migrating gift card:', error)
      return { error: 'Error inesperado al migrar la tarjeta' }
    }
  }

  // Migrar transacción existente
  private async migrateTransaction(giftCardId: string, existingTransaction: any): Promise<void> {
    try {
      const transactionData = {
        id: existingTransaction.id,
        gift_card_id: giftCardId,
        type: existingTransaction.type || 'creation',
        amount: parseFloat(existingTransaction.amount) || 0,
        description: existingTransaction.description || 'Transacción migrada',
        timestamp: existingTransaction.timestamp ? DateUtils.toMexicoISOString(new Date(existingTransaction.timestamp)) : DateUtils.toMexicoISOString()
      }

      await supabase
        .from('transactions')
        .upsert([transactionData])
    } catch (error) {
      console.error('Error migrating transaction:', error)
    }
  }

  // Crear nueva GiftCard/Monedero
  async createGiftCard(data: GiftCardFormData & { type: 'giftcard' | 'ewallet' }): Promise<GiftCard | { error: string }> {
    try {
      const cardData = {
        code: this.generateUniqueCode(),
        owner_name: data.ownerName.trim(),
        owner_email: data.ownerEmail?.trim() || null,
        owner_phone: data.ownerPhone?.trim() || null,
        initial_amount: data.type === 'ewallet' ? 0 : data.initialAmount,
        current_amount: data.type === 'ewallet' ? 0 : data.initialAmount,
        type: data.type,
        is_active: true,
        notes: data.notes?.trim() || null,
        expires_at: data.expiresAt ? DateUtils.toMexicoISOString(data.expiresAt) : null,
      }

      const { data: giftCard, error } = await supabase
        .from('gift_cards')
        .insert([cardData])
        .select()
        .single()

      if (error) {
        console.error('Error creating gift card:', error)
        return { error: 'Error al crear la tarjeta' }
      }

      // Crear transacción inicial
      if (giftCard.initial_amount > 0) {
        await this.createTransaction(giftCard.id, {
          type: 'creation',
          amount: giftCard.initial_amount,
          description: `Tarjeta creada con saldo inicial de $${giftCard.initial_amount}`
        })
      }

      return this.mapToGiftCard(giftCard)
    } catch (error) {
      console.error('Error creating gift card:', error)
      return { error: 'Error inesperado al crear la tarjeta' }
    }
  }

  // Actualizar tarjetas expiradas automáticamente
  private async updateExpiredCards(): Promise<void> {
    try {
      const now = DateUtils.toMexicoISOString()
      
      // Marcar como expiradas las tarjetas que pasaron su fecha
      const { error } = await supabase
        .from('gift_cards')
        .update({ 
          is_active: false,
          updated_at: now
        })
        .lt('expires_at', now)
        .eq('is_active', true)
        .not('expires_at', 'is', null)

      if (error) {
        console.error('Error updating expired cards:', error)
      } else {
        console.log('✅ Tarjetas expiradas actualizadas automáticamente')
      }
    } catch (error) {
      console.error('Error updating expired cards:', error)
    }
  }

  // Obtener todas las GiftCards
  async getAllGiftCards(): Promise<GiftCard[]> {
    try {
      // Actualizar tarjetas expiradas antes de obtener los datos
      await this.updateExpiredCards()
      
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching gift cards:', error)
        return []
      }

      return data.map((item) => this.mapToGiftCard(item))
    } catch (error) {
      console.error('Error fetching gift cards:', error)
      return []
    }
  }

  // Obtener GiftCard por ID
  getGiftCardById(id: string): Promise<GiftCard | null> {
    return this.getGiftCardByIdAsync(id)
  }

  // Obtener GiftCard por ID (versión asíncrona explícita)
  async getGiftCardByIdAsync(id: string): Promise<GiftCard | null> {
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) return null
      return this.mapToGiftCard(data)
    } catch (error) {
      console.error('Error fetching gift card:', error)
      return null
    }
  }

  // Buscar GiftCard por código
  async findGiftCardByCode(code: string): Promise<GiftCard | null> {
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('code', code)
        .single()

      if (error || !data) return null
      return this.mapToGiftCard(data)
    } catch (error) {
      console.error('Error finding gift card:', error)
      return null
    }
  }

  // Actualizar monto de GiftCard
  async updateGiftCardAmount(id: string, newAmount: number, reason: string): Promise<boolean> {
    try {
      const giftCard = await this.getGiftCardById(id)
      if (!giftCard) return false

      // Validar que la tarjeta no esté expirada
      if (giftCard.expiresAt && new Date() > giftCard.expiresAt) {
        console.error('No se pueden realizar operaciones en tarjetas expiradas')
        return false
      }

      // Para GiftCards, no permitir recargas (solo reducciones)
      if (giftCard.type === 'giftcard' && newAmount > giftCard.currentAmount) {
        console.error('Las GiftCards no se pueden recargar, solo usar')
        return false
      }

      // Auto-reactivar monederos que reciben dinero
      const wasAutoReactivated = giftCard.type === 'ewallet' && giftCard.currentAmount <= 0 && newAmount > 0
      const amountDifference = newAmount - giftCard.currentAmount

      const updateData: any = { current_amount: newAmount }
      
      // Auto-reactivar monedero si aplica
      if (wasAutoReactivated) {
        updateData.is_active = true
      }

      const { error } = await supabase
        .from('gift_cards')
        .update(updateData)
        .eq('id', id)

      if (error) {
        console.error('Error updating gift card amount:', error)
        return false
      }

      // Crear transacción con tipo específico según sea abono o descuento
      if (amountDifference > 0) {
        // Es un abono/recarga
        const description = wasAutoReactivated ? `Recarga: ${reason} (Monedero reactivado automáticamente)` : `Recarga: ${reason}`
        await this.createTransaction(id, {
          type: 'refund', // Usar 'refund' para abonos/recargas
          amount: amountDifference, // Positivo
          description
        })
      } else if (amountDifference < 0) {
        // Es un descuento/gasto
        await this.createTransaction(id, {
          type: 'adjustment', // Usar 'adjustment' para gastos/descuentos
          amount: Math.abs(amountDifference), // Positivo en base de datos
          description: `Descuento: ${reason}`
        })
      }

      return true
    } catch (error) {
      console.error('Error updating gift card amount:', error)
      return false
    }
  }

  // Canjear completamente una GiftCard
  async redeemGiftCard(id: string, amount?: number): Promise<boolean> {
    try {
      const giftCard = await this.getGiftCardById(id)
      if (!giftCard || giftCard.currentAmount <= 0) return false

      // Validar que la tarjeta no esté expirada
      if (giftCard.expiresAt && new Date() > giftCard.expiresAt) {
        console.error('No se pueden realizar operaciones en tarjetas expiradas')
        return false
      }

      // Si no se especifica monto, canjear completamente
      const redeemAmount = amount !== undefined ? amount : giftCard.currentAmount
      
      // Validar saldo suficiente
      if (giftCard.currentAmount < redeemAmount) {
        console.error('Saldo insuficiente')
        return false
      }

      const newAmount = giftCard.currentAmount - redeemAmount

      const { error } = await supabase
        .from('gift_cards')
        .update({ 
          current_amount: newAmount,
          is_active: giftCard.type === 'ewallet' && newAmount <= 0 ? false : giftCard.isActive
        })
        .eq('id', id)

      if (error) {
        console.error('Error redeeming gift card:', error)
        return false
      }

      // Crear transacción de uso/canje
      await this.createTransaction(id, {
        type: 'adjustment',
        amount: redeemAmount,
        description: redeemAmount === giftCard.currentAmount 
          ? `Canje completo de ${giftCard.type === 'giftcard' ? 'tarjeta de regalo' : 'monedero'}`
          : `Canje parcial: $${redeemAmount}`
      })

      return true
    } catch (error) {
      console.error('Error redeeming gift card:', error)
      return false
    }
  }

  // Eliminar GiftCard
  async deleteGiftCard(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('gift_cards')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting gift card:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting gift card:', error)
      return false
    }
  }

  // Obtener transacciones de una GiftCard
  async getGiftCardTransactions(giftCardId: string): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('gift_card_id', giftCardId)
        .order('timestamp', { ascending: false })

      if (error) {
        console.error('Error fetching transactions:', error)
        return []
      }

      return data.map((item) => this.mapToTransaction(item))
    } catch (error) {
      console.error('Error fetching transactions:', error)
      return []
    }
  }

  // Crear transacción
  private async createTransaction(giftCardId: string, transactionData: {
    type: 'creation' | 'redemption' | 'refund' | 'adjustment'
    amount: number
    description: string
  }): Promise<void> {
    try {
      await supabase
        .from('transactions')
        .insert([{
          gift_card_id: giftCardId,
          ...transactionData
        }])
    } catch (error) {
      console.error('Error creating transaction:', error)
    }
  }

  // Obtener estadísticas
  async getStatistics() {
    try {
      const { data: giftCards, error } = await supabase
        .from('gift_cards')
        .select('*')

      if (error || !giftCards) return {
        totalCards: 0,
        totalValue: 0,
        activeCards: 0,
        expiredCards: 0,
        giftCardStats: { count: 0, value: 0 },
        ewalletStats: { count: 0, value: 0 }
      }

      const now = new Date()
      const totalCards = giftCards.length
      const totalValue = giftCards.reduce((sum, card) => sum + card.current_amount, 0)
      const activeCards = giftCards.filter(card => card.is_active).length
      const expiredCards = giftCards.filter(card => 
        card.expires_at && new Date(card.expires_at) < now
      ).length

      const giftCardData = giftCards.filter(card => card.type === 'giftcard')
      const ewalletData = giftCards.filter(card => card.type === 'ewallet')

      return {
        totalCards,
        totalValue,
        activeCards,
        expiredCards,
        giftCardStats: {
          count: giftCardData.length,
          value: giftCardData.reduce((sum, card) => sum + card.current_amount, 0)
        },
        ewalletStats: {
          count: ewalletData.length,
          value: ewalletData.reduce((sum, card) => sum + card.current_amount, 0)
        }
      }
    } catch (error) {
      console.error('Error getting statistics:', error)
      return {
        totalCards: 0,
        totalValue: 0,
        activeCards: 0,
        expiredCards: 0,
        giftCardStats: { count: 0, value: 0 },
        ewalletStats: { count: 0, value: 0 }
      }
    }
  }

  // Mapear datos de Supabase a GiftCard
  private mapToGiftCard(data: any): GiftCard {
    return {
      id: data.id,
      code: data.code,
      ownerName: data.owner_name,
      ownerEmail: data.owner_email || '',
      ownerPhone: data.owner_phone || '',
      initialAmount: parseFloat(data.initial_amount),
      currentAmount: parseFloat(data.current_amount),
      type: data.type,
      status: this.calculateStatus(data),
      isRedeemed: parseFloat(data.current_amount) <= 0,
      isActive: data.is_active,
      notes: data.notes || '',
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      transactions: [] // Se cargan por separado si es necesario
    }
  }

  // Calcular status basado en los datos
  private calculateStatus(data: any): GiftCardStatus {
    if (!data.is_active) {
      return GiftCardStatus.INACTIVE
    }
    
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return GiftCardStatus.EXPIRED
    }
    
    if (parseFloat(data.current_amount) <= 0) {
      // Las giftcards con saldo 0 están "REDEEMED"
      // Los monederos con saldo 0 deberían estar "INACTIVE" (pero eso se maneja arriba)
      return data.type === 'giftcard' ? GiftCardStatus.REDEEMED : GiftCardStatus.INACTIVE
    }
    
    return GiftCardStatus.ACTIVE
  }

  // Mapear datos de Supabase a Transaction
  private mapToTransaction(data: any): Transaction {
    return {
      id: data.id,
      giftCardId: data.gift_card_id,
      type: data.type,
      amount: parseFloat(data.amount),
      description: data.description,
      timestamp: new Date(data.timestamp),
      performedBy: data.performed_by || 'system'
    }
  }

  // Generar código único más corto
  private generateUniqueCode(): string {
    const now = DateUtils.nowInMexico()
    const year = now.getFullYear().toString().slice(-2) // Últimos 2 dígitos del año
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const time = now.getTime().toString().slice(-6) // Últimos 6 dígitos del timestamp
    const random = Math.random().toString(36).substring(2, 6).toUpperCase() // 4 caracteres aleatorios
    
    // Formato: MM240101123456ABCD (18 caracteres)
    return `MM${year}${month}${day}${time}${random}`
  }

  // Métodos de compatibilidad con la interfaz anterior
  deobfuscateCode(code: string): string {
    if (!code) return ''
    
    // Si el código ya tiene el formato MM[año][mes][día]..., no está encriptado
    if (code.match(/^MM\d{14}[A-Z0-9]{4}$/)) {
      return code
    }
    
    // Si es un código simple, devolverlo tal como está
    if (code.length < 50 && !code.includes('=')) {
      return code
    }
    
    // Intentar desencriptar (para códigos legacy) usando la función de auth
    try {
      const { deobfuscateCode: authDeobfuscate } = require('./auth')
      return authDeobfuscate(code)
    } catch {
      // Si falla la desencriptación, devolver el código tal como está
      return code
    }
  }

  getDeleteConfirmationCode(cardId: string): string {
    // Generar código de confirmación basado en el ID de la tarjeta
    const hash = cardId.slice(-6).toUpperCase()
    return `DEL${hash}`
  }

  getGiftCardStatus(giftCard: GiftCard): GiftCardStatus {
    // Lógica diferente para GiftCards vs Monederos
    if (giftCard.type === 'giftcard') {
      // GiftCards: Una vez sin dinero, quedan canjeadas permanentemente
      if (giftCard.currentAmount <= 0) {
        return GiftCardStatus.REDEEMED
      } else if (giftCard.expiresAt && new Date() > giftCard.expiresAt) {
        return GiftCardStatus.EXPIRED
      } else if (!giftCard.isActive) {
        return GiftCardStatus.INACTIVE
      } else {
        return GiftCardStatus.ACTIVE
      }
    } else {
      // Monederos: Se pueden recargar, auto-reactivar si tienen dinero
      if (giftCard.currentAmount <= 0) {
        return GiftCardStatus.INACTIVE
      } else {
        // Auto-reactivar monedero si tiene dinero
        return GiftCardStatus.ACTIVE
      }
    }
  }

  // Obtener tarjetas próximas a expirar (versión síncrona para compatibilidad)
  getExpiringGiftCards(days: number = 7): GiftCard[] {
    // Para mantener compatibilidad, retornamos un array vacío
    // La versión async está disponible como getExpiringGiftCardsAsync
    return []
  }

  // Obtener tarjetas próximas a expirar (versión asíncrona)
  async getExpiringGiftCardsAsync(days: number = 7): Promise<GiftCard[]> {
    try {
          const now = DateUtils.nowInMexico()
    const futureDate = DateUtils.addDaysInMexico(now, days)

      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .not('expires_at', 'is', null)
        .gte('expires_at', DateUtils.toMexicoISOString(now)) // Desde hoy
        .lte('expires_at', DateUtils.toMexicoISOString(futureDate)) // Hasta 7 días en el futuro
        .eq('is_active', true)
        .order('expires_at', { ascending: true })

      if (error) {
        console.error('Error fetching expiring cards:', error)
        return []
      }

      console.log(`Found ${data.length} cards expiring between ${DateUtils.formatForDisplay(now)} and ${DateUtils.formatForDisplay(futureDate)}`)
      return data.map((item) => this.mapToGiftCard(item))
    } catch (error) {
      console.error('Error fetching expiring cards:', error)
      return []
    }
  }

  // Exportar GiftCards
  exportGiftCards(): string {
    // Esta función necesita ser async, pero para compatibilidad devolvemos string vacío
    console.warn('exportGiftCards no es compatible con Supabase en modo síncrono')
    return ''
  }

  // Exportar GiftCards (versión asíncrona)
  async exportGiftCardsAsync(): Promise<string> {
    try {
      const giftCards = await this.getAllGiftCards()
      const dataToExport = {
        timestamp: DateUtils.toMexicoISOString(),
        version: '2.0',
        source: 'supabase',
        totalCards: giftCards.length,
        data: giftCards.map(card => ({
          ...card,
          transactions: [] // Las transacciones se cargan por separado
        }))
      }

      return JSON.stringify(dataToExport, null, 2)
    } catch (error) {
      console.error('Error exporting gift cards:', error)
      return ''
    }
  }

  // Actualizar GiftCard
  async updateGiftCard(id: string, updates: Partial<GiftCard>): Promise<boolean> {
    try {
      const updateData: any = {}
      
      if (updates.ownerName !== undefined) updateData.owner_name = updates.ownerName
      if (updates.ownerEmail !== undefined) updateData.owner_email = updates.ownerEmail
      if (updates.ownerPhone !== undefined) updateData.owner_phone = updates.ownerPhone
      if (updates.currentAmount !== undefined) updateData.current_amount = updates.currentAmount
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive
      if (updates.notes !== undefined) updateData.notes = updates.notes
      if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt?.toISOString()
      
      updateData.updated_at = DateUtils.toMexicoISOString()

      const { error } = await supabase
        .from('gift_cards')
        .update(updateData)
        .eq('id', id)

      if (error) {
        console.error('Error updating gift card:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating gift card:', error)
      return false
    }
  }

  // Desactivar GiftCard
  async deactivateGiftCard(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('gift_cards')
        .update({ is_active: false })
        .eq('id', id)

      if (error) {
        console.error('Error deactivating gift card:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deactivating gift card:', error)
      return false
    }
  }
} 
