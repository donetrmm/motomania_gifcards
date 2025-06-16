'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react'
import { GiftCard } from '@/types/giftcard'
import { GiftCardService } from '@/lib/giftcard-service'

interface ImportCardsProps {
  onImportSuccess: () => void
}

interface ImportResult {
  success: boolean
  imported: number
  errors: string[]
  duplicates: number
}

export default function ImportCards({ onImportSuccess }: ImportCardsProps) {
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const service = GiftCardService.getInstance()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      setImportResult({
        success: false,
        imported: 0,
        errors: ['El archivo debe ser un JSON válido'],
        duplicates: 0
      })
      return
    }

    setIsImporting(true)
    setImportResult(null)

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      // Validar estructura del archivo
      if (!data.giftCards || !Array.isArray(data.giftCards)) {
        throw new Error('El archivo debe contener un array "giftCards"')
      }

      // Si es un archivo de exportación completa, usar el método de importación del servicio
      if (data.transactions && data.version) {
        const success = service.importGiftCards(text)
        if (success) {
          setImportResult({
            success: true,
            imported: data.giftCards.length,
            errors: [],
            duplicates: 0
          })
          onImportSuccess()
          return
        } else {
          throw new Error('Error al importar el archivo de exportación completa')
        }
      }

      const result = await importGiftCards(data.giftCards)
      setImportResult(result)
      
      if (result.success && result.imported > 0) {
        onImportSuccess()
      }
    } catch (error) {
      setImportResult({
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Error al procesar el archivo'],
        duplicates: 0
      })
    } finally {
      setIsImporting(false)
    }
  }

  const importGiftCards = async (cards: any[]): Promise<ImportResult> => {
    const errors: string[] = []
    let imported = 0
    let duplicates = 0

    for (let i = 0; i < cards.length; i++) {
      const cardData = cards[i]
      
      try {
        // Validar campos requeridos
        if (!cardData.ownerName || !cardData.initialAmount) {
          errors.push(`Tarjeta ${i + 1}: Faltan campos requeridos (ownerName, initialAmount)`)
          continue
        }

        // Verificar si ya existe una tarjeta con el mismo código
        if (cardData.code) {
          const existingCard = service.getAllGiftCards().find(c => c.code === cardData.code)
          if (existingCard) {
            duplicates++
            continue
          }
        }

        // Crear la tarjeta
        const newCard = service.createGiftCard({
          type: cardData.type || 'giftcard',
          ownerName: cardData.ownerName,
          ownerEmail: cardData.ownerEmail,
          ownerPhone: cardData.ownerPhone,
          initialAmount: Number(cardData.initialAmount),
          expiresAt: cardData.expiresAt ? new Date(cardData.expiresAt) : undefined,
          notes: cardData.notes
        })

        // Si se especifica un código personalizado, actualizarlo
        if (cardData.code && cardData.code !== newCard.code) {
          newCard.code = cardData.code
        }

        imported++
      } catch (error) {
        errors.push(`Tarjeta ${i + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }

    return {
      success: imported > 0,
      imported,
      errors,
      duplicates
    }
  }

  const downloadTemplate = () => {
    const template = {
      giftCards: [
        {
          type: "giftcard",
          ownerName: "Juan Pérez",
          ownerEmail: "juan@ejemplo.com",
          ownerPhone: "+57 300 123 4567",
          initialAmount: 50000,
          expiresAt: "2024-12-31",
          notes: "Tarjeta de ejemplo"
        },
        {
          type: "ewallet",
          ownerName: "María García",
          ownerEmail: "maria@ejemplo.com",
          initialAmount: 0,
          notes: "Monedero electrónico de ejemplo"
        }
      ]
    }

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-giftcards.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-100 mb-2">Importar Tarjetas</h3>
        <p className="text-gray-300">Importa múltiples tarjetas desde un archivo JSON</p>
      </div>

      {/* Área de carga */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          dragActive
            ? 'border-primary-400 bg-primary-900/20'
            : 'border-neutral-600 hover:border-neutral-500 bg-neutral-800/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto">
            <Upload className="w-8 h-8 text-primary-400" />
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-100 mb-2">
              Arrastra tu archivo JSON aquí
            </h4>
            <p className="text-gray-400 mb-4">
              O haz clic para seleccionar un archivo
            </p>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="btn-primary disabled:opacity-50"
            >
              {isImporting ? 'Importando...' : 'Seleccionar Archivo'}
            </button>
          </div>
        </div>
      </div>

      {/* Plantilla */}
      <div className="bg-neutral-800/60 rounded-xl p-6 border border-neutral-700/50">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-100 flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Plantilla de Importación</span>
          </h4>
          <button
            onClick={downloadTemplate}
            className="text-primary-400 hover:text-primary-300 text-sm font-medium"
          >
            Descargar Plantilla
          </button>
        </div>

        <div className="text-sm text-gray-300 space-y-2">
          <p>El archivo JSON debe tener la siguiente estructura:</p>
          <pre className="bg-neutral-900/60 rounded-lg p-4 text-xs overflow-x-auto">
{`{
  "giftCards": [
    {
      "type": "giftcard",
      "ownerName": "Nombre del propietario",
      "ownerEmail": "email@ejemplo.com",
      "ownerPhone": "+57 300 123 4567",
      "initialAmount": 50000,
      "expiresAt": "2024-12-31",
      "notes": "Notas opcionales"
    }
  ]
}`}
          </pre>
          
          <div className="mt-4 space-y-1">
            <p className="font-medium text-gray-200">Campos:</p>
            <ul className="text-xs text-gray-400 space-y-1 ml-4">
              <li>• <strong>type:</strong> "giftcard" o "ewallet"</li>
              <li>• <strong>ownerName:</strong> Nombre del propietario (requerido)</li>
              <li>• <strong>ownerEmail:</strong> Email (opcional)</li>
              <li>• <strong>ownerPhone:</strong> Teléfono (opcional)</li>
              <li>• <strong>initialAmount:</strong> Monto inicial (requerido)</li>
              <li>• <strong>expiresAt:</strong> Fecha de vencimiento YYYY-MM-DD (opcional)</li>
              <li>• <strong>notes:</strong> Notas adicionales (opcional)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Resultado de la importación */}
      {importResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-6 border ${
            importResult.success
              ? 'bg-green-900/20 border-green-500/50'
              : 'bg-red-900/20 border-red-500/50'
          }`}
        >
          <div className="flex items-center space-x-3 mb-4">
            {importResult.success ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-400" />
            )}
            <h4 className={`text-lg font-semibold ${
              importResult.success ? 'text-green-400' : 'text-red-400'
            }`}>
              {importResult.success ? 'Importación Exitosa' : 'Error en la Importación'}
            </h4>
          </div>

          <div className="space-y-2 text-sm">
            {importResult.imported > 0 && (
              <p className="text-green-300">
                ✅ {importResult.imported} tarjeta{importResult.imported !== 1 ? 's' : ''} importada{importResult.imported !== 1 ? 's' : ''} correctamente
              </p>
            )}
            
            {importResult.duplicates > 0 && (
              <p className="text-yellow-300">
                ⚠️ {importResult.duplicates} tarjeta{importResult.duplicates !== 1 ? 's' : ''} duplicada{importResult.duplicates !== 1 ? 's' : ''} (omitida{importResult.duplicates !== 1 ? 's' : ''})
              </p>
            )}

            {importResult.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-red-300 font-medium mb-2">Errores encontrados:</p>
                <ul className="space-y-1 text-red-200">
                  {importResult.errors.map((error, index) => (
                    <li key={index} className="text-xs">• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={() => setImportResult(null)}
            className="mt-4 text-gray-400 hover:text-gray-200 text-sm"
          >
            <X className="w-4 h-4 inline mr-1" />
            Cerrar
          </button>
        </motion.div>
      )}
    </div>
  )
} 