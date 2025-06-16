import { supabase } from './supabase'
import bcrypt from 'bcryptjs'

export class SupabaseAuthService {
  private static instance: SupabaseAuthService
  
  static getInstance(): SupabaseAuthService {
    if (!SupabaseAuthService.instance) {
      SupabaseAuthService.instance = new SupabaseAuthService()
    }
    return SupabaseAuthService.instance
  }

  // Autenticar usuario
  async authenticate(username: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Buscar usuario por username
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single()

      if (error || !user) {
        return { success: false, error: 'Usuario no encontrado' }
      }

      // Verificar contraseña
      const passwordMatch = await bcrypt.compare(password, user.password_hash)
      
      if (!passwordMatch) {
        return { success: false, error: 'Contraseña incorrecta' }
      }

      // Actualizar última conexión
      await supabase
        .from('users')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', user.id)

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.created_at
        }
      }
    } catch (error) {
      console.error('Error authenticating user:', error)
      return { success: false, error: 'Error de autenticación' }
    }
  }

  // Verificar si un usuario existe
  async userExists(username: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single()

      return !error && !!data
    } catch (error) {
      return false
    }
  }

  // Crear nuevo usuario (solo admin)
  async createUser(userData: {
    username: string
    password: string
    role?: 'admin' | 'user'
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Verificar si el usuario ya existe
      const exists = await this.userExists(userData.username)
      if (exists) {
        return { success: false, error: 'El usuario ya existe' }
      }

      // Hash de la contraseña
      const saltRounds = 10
      const passwordHash = await bcrypt.hash(userData.password, saltRounds)

      // Crear usuario
      const { error } = await supabase
        .from('users')
        .insert([{
          username: userData.username,
          password_hash: passwordHash,
          role: userData.role || 'user'
        }])

      if (error) {
        console.error('Error creating user:', error)
        return { success: false, error: 'Error al crear el usuario' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error creating user:', error)
      return { success: false, error: 'Error inesperado al crear el usuario' }
    }
  }

  // Cambiar contraseña
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Primero obtener el usuario actual
      const { data: user, error: getUserError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', userId)
        .single()

      if (getUserError || !user) {
        return { success: false, error: 'Usuario no encontrado' }
      }

      // Verificar que la contraseña actual sea correcta
      const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash)
      
      if (!passwordMatch) {
        return { success: false, error: 'La contraseña actual es incorrecta' }
      }

      // Hash de la nueva contraseña
      const saltRounds = 10
      const passwordHash = await bcrypt.hash(newPassword, saltRounds)

      // Actualizar contraseña
      const { error } = await supabase
        .from('users')
        .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) {
        console.error('Error changing password:', error)
        return { success: false, error: 'Error al cambiar la contraseña' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error changing password:', error)
      return { success: false, error: 'Error inesperado al cambiar la contraseña' }
    }
  }

  // Obtener todos los usuarios (solo admin)
  async getAllUsers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, created_at, updated_at, is_active')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching users:', error)
      return []
    }
  }

  // Desactivar usuario
  async deactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId)

      if (error) {
        console.error('Error deactivating user:', error)
        return { success: false, error: 'Error al desactivar el usuario' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error deactivating user:', error)
      return { success: false, error: 'Error inesperado al desactivar el usuario' }
    }
  }

  // Activar usuario
  async activateUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', userId)

      if (error) {
        console.error('Error activating user:', error)
        return { success: false, error: 'Error al activar el usuario' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error activating user:', error)
      return { success: false, error: 'Error inesperado al activar el usuario' }
    }
  }
} 