const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔗 Probando conexión con Supabase...');
console.log('URL:', supabaseUrl);
console.log('Key (primeros 20 chars):', supabaseKey?.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\n📊 Probando SELECT...');
    const { data: selectData, error: selectError } = await supabase
      .from('gift_cards')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('❌ Error en SELECT:', selectError);
    } else {
      console.log('✅ SELECT funciona. Registros encontrados:', selectData?.length || 0);
    }

    console.log('\n➕ Probando INSERT...');
    const testCard = {
      code: 'TEST_' + Date.now(),
      owner_name: 'Test User',
      owner_email: 'test@example.com',
      initial_amount: 100,
      current_amount: 100,
      type: 'giftcard',
      is_active: true
    };

    const { data: insertData, error: insertError } = await supabase
      .from('gift_cards')
      .insert([testCard])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error en INSERT:', insertError);
      console.error('Details:', JSON.stringify(insertError, null, 2));
    } else {
      console.log('✅ INSERT funciona. ID creado:', insertData?.id);
      
      // Limpiar registro de prueba
      console.log('\n🧹 Limpiando registro de prueba...');
      const { error: deleteError } = await supabase
        .from('gift_cards')
        .delete()
        .eq('id', insertData.id);
      
      if (deleteError) {
        console.error('❌ Error al limpiar:', deleteError);
      } else {
        console.log('✅ Registro de prueba eliminado');
      }
    }

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

testConnection(); 