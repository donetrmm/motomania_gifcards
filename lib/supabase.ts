import { createClient } from '@supabase/supabase-js'

// Cargar variables de entorno con fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                   (typeof window !== 'undefined' ? window.process?.env?.NEXT_PUBLIC_SUPABASE_URL : '') || 
                   ''

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                       (typeof window !== 'undefined' ? window.process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY : '') || 
                       ''

// Crear cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false // No necesitamos sesión persistente para este caso de uso
  }
})

// Tipos para la base de datos
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          password_hash: string
          role: 'admin' | 'user'
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          username: string
          password_hash: string
          role?: 'admin' | 'user'
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          username?: string
          password_hash?: string
          role?: 'admin' | 'user'
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
      }
      gift_cards: {
        Row: {
          id: string
          code: string
          owner_name: string
          owner_email: string | null
          owner_phone: string | null
          initial_amount: number
          current_amount: number
          type: 'giftcard' | 'ewallet'
          is_active: boolean
          notes: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          owner_name: string
          owner_email?: string | null
          owner_phone?: string | null
          initial_amount: number
          current_amount: number
          type: 'giftcard' | 'ewallet'
          is_active?: boolean
          notes?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          owner_name?: string
          owner_email?: string | null
          owner_phone?: string | null
          initial_amount?: number
          current_amount?: number
          type?: 'giftcard' | 'ewallet'
          is_active?: boolean
          notes?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          gift_card_id: string
          type: 'creation' | 'usage' | 'refund' | 'adjustment'
          amount: number
          description: string
          timestamp: string
          created_by: string | null
        }
        Insert: {
          id?: string
          gift_card_id: string
          type: 'creation' | 'usage' | 'refund' | 'adjustment'
          amount: number
          description: string
          timestamp?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          gift_card_id?: string
          type?: 'creation' | 'usage' | 'refund' | 'adjustment'
          amount?: number
          description?: string
          timestamp?: string
          created_by?: string | null
        }
      }
    }
  }
} 