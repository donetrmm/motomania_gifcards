'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Keyboard, X, Sparkles, CheckCircle } from 'lucide-react'

interface WelcomeModalProps {
  onClose: () => void
}

export default function WelcomeModal({ onClose }: WelcomeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false)

  // Manejo de ESC para cerrar modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [dontShowAgain]) // Incluir dontShowAgain para que el closure tenga el valor actualizado

  const shortcuts = [
    { keys: ['Alt', 'F'], description: 'Enfocar búsqueda', category: 'Navegación' },
    { keys: ['Alt', 'N'], description: 'Nueva GiftCard', category: 'Acciones' },
    { keys: ['Alt', 'M'], description: 'Nuevo Monedero', category: 'Acciones' },
    { keys: ['Alt', 'E'], description: 'Exportar datos', category: 'Acciones' },
    { keys: ['Esc'], description: 'Cerrar modales y filtros', category: 'Navegación' }
  ]

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('motomania_hide_welcome', 'true')
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 overflow-y-auto" style={{ zIndex: 99999 }}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg border border-neutral-700/50"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-700 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-100 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-primary-400" />
              <span>¡Bienvenido a Motomania!</span>
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-neutral-700 rounded-full transition-colors text-gray-300 hover:text-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Mensaje */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Keyboard className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-100 mb-2">
                Acelera tu trabajo con atajos de teclado
              </h3>
              <p className="text-gray-300 text-sm">
                Usa estos atajos para navegar más rápido por el sistema
              </p>
            </div>

            {/* Atajos organizados por categoría */}
            <div className="space-y-4">
              {['Navegación', 'Acciones'].map((category) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-gray-300 mb-2 uppercase tracking-wide flex items-center space-x-2">
                    <span className="w-2 h-2 bg-primary-400 rounded-full"></span>
                    <span>{category}</span>
                  </h4>
                  <div className="space-y-2">
                    {shortcuts
                      .filter(s => s.category === category)
                      .map((shortcut, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-neutral-700/30 rounded-lg hover:bg-neutral-700/50 transition-colors">
                          <span className="text-gray-200 text-sm">{shortcut.description}</span>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, keyIndex) => (
                              <span key={keyIndex} className="flex items-center">
                                <kbd className="px-2 py-1 bg-neutral-600 rounded text-xs text-gray-100 font-mono min-w-[2rem] text-center">
                                  {key}
                                </kbd>
                                {keyIndex < shortcut.keys.length - 1 && (
                                  <span className="text-gray-400 mx-1">+</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Información adicional */}
            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
              <p className="text-blue-300 text-sm">
                <strong>💡 Consejo:</strong> Los atajos con <kbd className="px-1.5 py-0.5 bg-neutral-600 rounded text-xs mx-1">Alt</kbd> evitan conflictos con el navegador y funcionan en cualquier momento.
              </p>
            </div>

            {/* Checkbox */}
            <div className="flex items-center space-x-3 p-3 bg-neutral-700/20 rounded-lg">
              <input
                type="checkbox"
                id="dontShow"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-neutral-700 border-neutral-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="dontShow" className="text-gray-300 text-sm cursor-pointer">
                No volver a mostrar este mensaje
              </label>
            </div>

            {/* Botón */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-lg transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                ¡Empecemos! 🚀
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 