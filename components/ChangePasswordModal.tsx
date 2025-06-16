'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, X, Shield, CheckCircle, AlertCircle } from 'lucide-react'
import { changePassword, validatePassword } from '@/lib/auth'

interface ChangePasswordModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function ChangePasswordModal({ onClose, onSuccess }: ChangePasswordModalProps) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number
    feedback: string[]
  }>({ score: 0, feedback: [] })

  // Scroll automático al abrir el modal
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }, [])

  // Manejo de ESC para cerrar modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const evaluatePasswordStrength = (password: string) => {
    const feedback: string[] = []
    let score = 0

    if (password.length >= 8) {
      score += 1
    } else {
      feedback.push('Al menos 8 caracteres')
    }

    if (/[A-Z]/.test(password)) {
      score += 1
    } else {
      feedback.push('Una letra mayúscula')
    }

    if (/[a-z]/.test(password)) {
      score += 1
    } else {
      feedback.push('Una letra minúscula')
    }

    if (/\d/.test(password)) {
      score += 1
    } else {
      feedback.push('Un número')
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1
    } else {
      feedback.push('Un carácter especial')
    }

    return { score, feedback }
  }

  const handlePasswordChange = (value: string) => {
    setFormData(prev => ({ ...prev, newPassword: value }))
    setPasswordStrength(evaluatePasswordStrength(value))
  }

  const getStrengthColor = (score: number) => {
    if (score <= 2) return 'bg-red-500'
    if (score <= 3) return 'bg-yellow-500'
    if (score <= 4) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getStrengthText = (score: number) => {
    if (score <= 2) return 'Débil'
    if (score <= 3) return 'Regular'
    if (score <= 4) return 'Buena'
    return 'Muy fuerte'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    // Validaciones
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setIsLoading(false)
      return
    }

    const validation = validatePassword(formData.newPassword)
    if (!validation.valid) {
      setError(validation.message!)
      setIsLoading(false)
      return
    }

    // Simular delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    const result = changePassword(formData.currentPassword, formData.newPassword)
    
    if (result.success) {
      setSuccess(result.message)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
    } else {
      setError(result.message)
    }

    setIsLoading(false)
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-md border border-neutral-700/50"
        >
        <div className="sticky top-0 z-50 bg-neutral-800 rounded-t-2xl border-b border-neutral-700 px-6 py-4 flex items-center justify-between shadow-lg">
          <h2 className="text-xl font-bold text-gray-100 flex items-center space-x-2">
            <Shield className="w-5 h-5 text-primary-400" />
            <span>Cambiar Contraseña</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-700 rounded-full transition-colors text-gray-300 hover:text-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Contraseña actual */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contraseña Actual *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/3 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="input-field pl-10 pr-10"
                placeholder="Ingresa tu contraseña actual"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/3 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nueva Contraseña *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/3 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="input-field pl-10 pr-10"
                placeholder="Ingresa tu nueva contraseña"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/3 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Indicador de fortaleza */}
            {formData.newPassword && (
              <div className="mt-2">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="flex-1 bg-neutral-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength.score)}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength.score <= 2 ? 'text-red-400' :
                    passwordStrength.score <= 3 ? 'text-yellow-400' :
                    passwordStrength.score <= 4 ? 'text-blue-400' : 'text-green-400'
                  }`}>
                    {getStrengthText(passwordStrength.score)}
                  </span>
                </div>
                
                {passwordStrength.feedback.length > 0 && (
                  <div className="text-xs text-gray-400">
                    <p className="mb-1">Falta:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {passwordStrength.feedback.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirmar Nueva Contraseña *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/3 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className={`input-field pl-10 pr-10 ${
                  formData.confirmPassword && formData.newPassword !== formData.confirmPassword 
                    ? 'border-red-500' 
                    : formData.confirmPassword && formData.newPassword === formData.confirmPassword
                    ? 'border-green-500'
                    : ''
                }`}
                placeholder="Confirma tu nueva contraseña"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/3 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="text-red-400 text-xs mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          {/* Mensajes */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center space-x-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-900/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </motion.div>
          )}

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-neutral-600 text-gray-300 rounded-lg hover:bg-neutral-700 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || passwordStrength.score < 4 || formData.newPassword !== formData.confirmPassword}
              className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Cambiando...</span>
                </div>
              ) : (
                'Cambiar Contraseña'
              )}
            </button>
          </div>
        </form>
        </motion.div>
      </div>
    </div>
  )
} 