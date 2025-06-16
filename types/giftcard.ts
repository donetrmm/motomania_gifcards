export interface GiftCard {
  id: string
  code: string
  type: 'giftcard' | 'ewallet'
  ownerName: string
  ownerEmail?: string
  ownerPhone?: string
  initialAmount: number
  currentAmount: number
  status: GiftCardStatus
  isRedeemed: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
  transactions: Transaction[]
  notes?: string
}

export interface Transaction {
  id: string
  giftCardId: string
  type: 'creation' | 'redemption' | 'refund' | 'adjustment'
  amount: number
  description: string
  timestamp: Date
  performedBy: string
}

export interface GiftCardFormData {
  type?: 'giftcard' | 'ewallet'
  ownerName: string
  ownerEmail?: string
  ownerPhone?: string
  initialAmount: number
  expiresAt?: Date
  notes?: string
}

export interface QRCodeData {
  cardId: string
  code: string
  amount: number
  timestamp: number
}

export enum GiftCardStatus {
  ACTIVE = 'active',
  REDEEMED = 'redeemed',
  EXPIRED = 'expired',
  INACTIVE = 'inactive'
}

export interface GiftCardFilters {
  status?: GiftCardStatus
  searchTerm?: string
  dateRange?: {
    start: Date
    end: Date
  }
  amountRange?: {
    min: number
    max: number
  }
} 