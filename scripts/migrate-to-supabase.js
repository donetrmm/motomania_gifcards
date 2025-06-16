// Script para migrar datos del localStorage a Supabase
// Ejecutar en la consola del navegador después de configurar Supabase

async function migrateLocalStorageToSupabase() {
  console.log('🚀 Iniciando migración de localStorage a Supabase...');
  
  try {
    // Verificar que Supabase esté configurado
    if (typeof window === 'undefined' || !window.supabase) {
      console.error('❌ Supabase no está configurado');
      return;
    }
    
    const { supabase } = window;
    
    // Obtener datos del localStorage
    const giftCardsData = localStorage.getItem('giftcards');
    
    if (!giftCardsData) {
      console.log('ℹ️ No hay datos de tarjetas en localStorage para migrar');
      return;
    }
    
    const giftCards = JSON.parse(giftCardsData);
    console.log(`📦 Encontradas ${giftCards.length} tarjetas en localStorage`);
    
    let migrated = 0;
    let errors = 0;
    
    for (const card of giftCards) {
      try {
        // Mapear datos del localStorage al formato de Supabase
        const cardData = {
          id: card.id,
          code: card.code,
          owner_name: card.ownerName,
          owner_email: card.ownerEmail || null,
          owner_phone: card.ownerPhone || null,
          initial_amount: parseFloat(card.initialAmount),
          current_amount: parseFloat(card.currentAmount),
          type: card.type || 'giftcard',
          is_active: card.isActive !== false,
          notes: card.notes || null,
          expires_at: card.expiresAt ? new Date(card.expiresAt).toISOString() : null,
          created_at: card.createdAt ? new Date(card.createdAt).toISOString() : new Date().toISOString(),
          updated_at: card.updatedAt ? new Date(card.updatedAt).toISOString() : new Date().toISOString()
        };
        
        // Insertar en Supabase
        const { error } = await supabase
          .from('gift_cards')
          .upsert([cardData]);
        
        if (error) {
          console.error(`❌ Error migrando tarjeta ${card.id}:`, error);
          errors++;
        } else {
          console.log(`✅ Tarjeta ${card.id} migrada exitosamente`);
          migrated++;
          
          // Migrar transacciones si existen
          if (card.transactions && card.transactions.length > 0) {
            for (const transaction of card.transactions) {
              const transactionData = {
                id: transaction.id,
                gift_card_id: card.id,
                type: transaction.type,
                amount: parseFloat(transaction.amount),
                description: transaction.description,
                timestamp: transaction.timestamp ? new Date(transaction.timestamp).toISOString() : new Date().toISOString()
              };
              
              await supabase
                .from('transactions')
                .upsert([transactionData]);
            }
            console.log(`  📝 ${card.transactions.length} transacciones migradas`);
          }
        }
      } catch (cardError) {
        console.error(`❌ Error procesando tarjeta ${card.id}:`, cardError);
        errors++;
      }
    }
    
    console.log('\n📊 Resumen de migración:');
    console.log(`✅ Tarjetas migradas exitosamente: ${migrated}`);
    console.log(`❌ Errores durante la migración: ${errors}`);
    
    if (migrated > 0 && errors === 0) {
      console.log('\n🎉 ¡Migración completada exitosamente!');
      console.log('💡 Puedes hacer backup del localStorage y luego limpiarlo:');
      console.log('   localStorage.setItem("giftcards_backup", localStorage.getItem("giftcards"))');
      console.log('   localStorage.removeItem("giftcards")');
    } else if (errors > 0) {
      console.log('\n⚠️ La migración tuvo errores. Revisa los mensajes de error arriba.');
    }
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  }
}

// Función para hacer backup del localStorage
function backupLocalStorage() {
  const giftCardsData = localStorage.getItem('giftcards');
  if (giftCardsData) {
    const backup = {
      timestamp: new Date().toISOString(),
      data: JSON.parse(giftCardsData)
    };
    
    localStorage.setItem('giftcards_backup', JSON.stringify(backup));
    console.log('💾 Backup del localStorage creado exitosamente');
    
    // Crear descarga del backup
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `giftcards-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('📁 Archivo de backup descargado');
  } else {
    console.log('ℹ️ No hay datos en localStorage para hacer backup');
  }
}

// Función para limpiar localStorage después de migración exitosa
function cleanLocalStorage() {
  const confirm = window.confirm(
    '⚠️ ¿Estás seguro de que quieres limpiar los datos del localStorage?\n\n' +
    'Esta acción eliminará todos los datos locales de tarjetas.\n' +
    'Asegúrate de que la migración a Supabase fue exitosa.'
  );
  
  if (confirm) {
    localStorage.removeItem('giftcards');
    console.log('🧹 localStorage limpiado exitosamente');
  }
}

// Instrucciones de uso
console.log(`
🔧 INSTRUCCIONES DE MIGRACIÓN:

1. Asegúrate de que Supabase esté configurado y funcionando
2. Ejecuta: migrateLocalStorageToSupabase()
3. Si todo sale bien, haz backup: backupLocalStorage()
4. Finalmente, limpia el localStorage: cleanLocalStorage()

⚠️ IMPORTANTE: Haz la migración en un entorno de prueba primero!
`);

// Exportar funciones para uso global
window.migrateLocalStorageToSupabase = migrateLocalStorageToSupabase;
window.backupLocalStorage = backupLocalStorage;
window.cleanLocalStorage = cleanLocalStorage; 