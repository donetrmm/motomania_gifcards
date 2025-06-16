// Script para limpiar completamente localStorage después de migrar a Supabase
// Ejecutar en la consola del navegador cuando la migración esté completa

function cleanupLocalStorageAfterMigration() {
  console.log('🧹 Iniciando limpieza de localStorage...')
  
  // Lista de todas las claves relacionadas con la aplicación
  const keysToRemove = [
    'motomania_giftcards',
    'motomania_transactions', 
    'giftcards',
    'giftcards_backup',
    'motomania_session_data',
    'motomania_custom_password'
  ]
  
  let removedCount = 0
  
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`🗑️ Removiendo: ${key}`)
      localStorage.removeItem(key)
      removedCount++
    }
  })
  
  // También verificar si hay otras claves relacionadas
  const allKeys = Object.keys(localStorage)
  const motomaniaKeys = allKeys.filter(key => 
    key.toLowerCase().includes('motomania') || 
    key.toLowerCase().includes('giftcard')
  )
  
  motomaniaKeys.forEach(key => {
    if (!keysToRemove.includes(key)) {
      console.log(`⚠️ Clave adicional encontrada: ${key}`)
      const shouldRemove = confirm(`¿Remover también la clave "${key}"?`)
      if (shouldRemove) {
        localStorage.removeItem(key)
        removedCount++
        console.log(`🗑️ Removido: ${key}`)
      }
    }
  })
  
  console.log(`✅ Limpieza completada. Se removieron ${removedCount} elementos.`)
  console.log('🎉 La aplicación ahora usa únicamente Supabase!')
  
  // Recargar la página para asegurar que todo funciona sin localStorage
  if (removedCount > 0) {
    const shouldReload = confirm('¿Recargar la página para verificar que todo funciona correctamente?')
    if (shouldReload) {
      window.location.reload()
    }
  }
}

// Función para hacer backup antes de limpiar
function backupBeforeCleanup() {
  console.log('💾 Creando backup final antes de limpiar...')
  
  const backup = {
    timestamp: new Date().toISOString(),
    localStorage: {}
  }
  
  // Backup de todo localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      backup.localStorage[key] = localStorage.getItem(key)
    }
  }
  
  // Descargar backup
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `localStorage-backup-final-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  console.log('💾 Backup descargado exitosamente')
}

// Función para verificar estado de migración
function checkMigrationStatus() {
  console.log('🔍 Verificando estado de migración...')
  
  const localStorageKeys = Object.keys(localStorage)
  const hasOldData = localStorageKeys.some(key => 
    key.includes('giftcard') || key.includes('motomania_giftcard')
  )
  
  if (hasOldData) {
    console.log('⚠️ Aún hay datos en localStorage:')
    localStorageKeys.forEach(key => {
      if (key.includes('giftcard') || key.includes('motomania')) {
        console.log(`  - ${key}: ${localStorage.getItem(key)?.length} caracteres`)
      }
    })
  } else {
    console.log('✅ No se encontraron datos antiguos en localStorage')
  }
  
  // Verificar conexión a Supabase
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    console.log('🔗 Para verificar Supabase, abre las herramientas de desarrollador > Red > Refresh')
  }
  
  return !hasOldData
}

// Instrucciones
console.log(`
🔧 LIMPIEZA POST-MIGRACIÓN:

1. Hacer backup final: backupBeforeCleanup()
2. Verificar estado: checkMigrationStatus()  
3. Limpiar localStorage: cleanupLocalStorageAfterMigration()

⚠️ IMPORTANTE: Ejecuta estos comandos solo después de confirmar que Supabase funciona correctamente!
`)

// Exportar funciones
window.backupBeforeCleanup = backupBeforeCleanup
window.checkMigrationStatus = checkMigrationStatus
window.cleanupLocalStorageAfterMigration = cleanupLocalStorageAfterMigration 