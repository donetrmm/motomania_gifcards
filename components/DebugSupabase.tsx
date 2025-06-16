'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugSupabase() {
  const [result, setResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const testConnection = async () => {
    setIsLoading(true)
    setResult('🔄 Probando conexión...')
    
    try {
      // Verificar variables de entorno
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      let log = `📋 Variables de entorno:\n`
      log += `URL: ${url || 'NO DEFINIDA'}\n`
      log += `Key: ${key ? key.substring(0, 20) + '...' : 'NO DEFINIDA'}\n\n`

      // Probar SELECT
      log += `📊 Probando SELECT...\n`
      const { data: selectData, error: selectError } = await supabase
        .from('gift_cards')
        .select('*')
        .limit(1)

      if (selectError) {
        log += `❌ Error en SELECT: ${JSON.stringify(selectError, null, 2)}\n\n`
      } else {
        log += `✅ SELECT funciona. Registros: ${selectData?.length || 0}\n\n`
      }

      // Probar INSERT
      log += `➕ Probando INSERT...\n`
      const testCard = {
        code: 'TEST_DEBUG_' + Date.now(),
        owner_name: 'Debug Test',
        owner_email: 'debug@test.com',
        initial_amount: 50,
        current_amount: 50,
        type: 'giftcard' as const,
        is_active: true
      }

      const { data: insertData, error: insertError } = await supabase
        .from('gift_cards')
        .insert([testCard])
        .select()
        .single()

      if (insertError) {
        log += `❌ Error en INSERT: ${JSON.stringify(insertError, null, 2)}\n\n`
      } else {
        log += `✅ INSERT funciona. ID: ${insertData?.id}\n\n`
        
        // Limpiar
        const { error: deleteError } = await supabase
          .from('gift_cards')
          .delete()
          .eq('id', insertData.id)
        
        if (deleteError) {
          log += `❌ Error al limpiar: ${JSON.stringify(deleteError, null, 2)}\n`
        } else {
          log += `✅ Registro limpiado correctamente\n`
        }
      }

      setResult(log)
    } catch (error) {
      setResult(`💥 Error inesperado: ${JSON.stringify(error, null, 2)}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 bg-neutral-800 rounded-lg border border-neutral-700">
      <h3 className="text-lg font-semibold text-white mb-4">🔧 Diagnóstico Supabase</h3>
      
      <button
        onClick={testConnection}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded mb-4"
      >
        {isLoading ? 'Probando...' : 'Probar Conexión'}
      </button>

      {result && (
        <pre className="bg-black text-green-400 p-4 rounded text-sm overflow-auto max-h-96 whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  )
} 