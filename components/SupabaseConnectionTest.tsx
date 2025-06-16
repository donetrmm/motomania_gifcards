'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SupabaseConnectionTest() {
  const [status, setStatus] = useState<'testing' | 'connected' | 'error'>('testing')
  const [details, setDetails] = useState<string>('')

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      // Verificar configuración desde múltiples fuentes
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                 (typeof window !== 'undefined' && (window as any).process?.env?.NEXT_PUBLIC_SUPABASE_URL)
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                 (typeof window !== 'undefined' && (window as any).process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY)

      console.log('🔍 Debug - Variables de entorno:')
      console.log('URL:', url ? `${url.substring(0, 20)}...` : 'NO CONFIGURADA')
      console.log('KEY:', key ? `${key.substring(0, 20)}...` : 'NO CONFIGURADA')

      if (!url || !key) {
        setStatus('error')
        setDetails(`Variables de entorno no configuradas:
        - URL: ${url ? '✅ Configurada' : '❌ Falta'}
        - KEY: ${key ? '✅ Configurada' : '❌ Falta'}
        
        Crear archivo .env en la raíz del proyecto con:
        NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
        NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_aqui`)
        return
      }

      if (url.includes('tu-proyecto') || key.includes('tu_clave')) {
        setStatus('error')
        setDetails('Variables de entorno contienen valores de ejemplo. Reemplaza con tus credenciales reales de Supabase.')
        return
      }

      // Probar conexión básica
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)

      if (error) {
        setStatus('error')
        setDetails(`Error de conexión: ${error.message}. Verifica que el script SQL se ejecutó correctamente.`)
        return
      }

      // Verificar tablas
      const { data: giftCards, error: gcError } = await supabase
        .from('gift_cards')
        .select('count')
        .limit(1)

      if (gcError) {
        setStatus('error')
        setDetails(`Tabla gift_cards no encontrada: ${gcError.message}`)
        return
      }

      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('count')
        .limit(1)

      if (txError) {
        setStatus('error')
        setDetails(`Tabla transactions no encontrada: ${txError.message}`)
        return
      }

      setStatus('connected')
      setDetails('✅ Conexión exitosa. Todas las tablas están disponibles.')

    } catch (error) {
      setStatus('error')
      setDetails(`Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'testing': return 'text-yellow-600'
      case 'connected': return 'text-green-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'testing': return '🔄'
      case 'connected': return '✅'
      case 'error': return '❌'
      default: return '❓'
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <h3 className="text-lg font-semibold mb-4">🔗 Estado de Conexión Supabase</h3>
      
      <div className={`mb-4 ${getStatusColor()}`}>
        <p className="flex items-center gap-2 font-medium">
          <span>{getStatusIcon()}</span>
          {status === 'testing' && 'Probando conexión...'}
          {status === 'connected' && 'Conectado exitosamente'}
          {status === 'error' && 'Error de conexión'}
        </p>
      </div>

      <div className="bg-gray-100 p-3 rounded text-sm">
        <p className="whitespace-pre-wrap">{details}</p>
      </div>

      <button
        onClick={testConnection}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        🔄 Probar Conexión
      </button>

      {status === 'error' && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
          <h4 className="font-medium text-red-800 mb-2">💡 Pasos para resolver:</h4>
          <ol className="text-sm text-red-700 space-y-1">
            <li>1. Verifica que el archivo .env.local existe en la raíz del proyecto</li>
            <li>2. Confirma que las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY están configuradas</li>
            <li>3. Verifica que ejecutaste el script SQL en tu proyecto Supabase</li>
            <li>4. Reinicia el servidor de desarrollo (npm run dev)</li>
          </ol>
        </div>
      )}
    </div>
  )
} 