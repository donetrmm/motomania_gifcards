-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can view all gift cards" ON gift_cards;
DROP POLICY IF EXISTS "Users can view all transactions" ON transactions;

-- Crear políticas más permisivas para desarrollo/uso sin autenticación
-- NOTA: En producción real, estas políticas deberían ser más restrictivas

-- Políticas para users
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);

-- Políticas para gift_cards
CREATE POLICY "Allow all operations on gift_cards" ON gift_cards FOR ALL USING (true);

-- Políticas para transactions  
CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);

-- Como alternativa, también podemos deshabilitar RLS temporalmente para desarrollo
-- (descomenta las siguientes líneas si las políticas no funcionan)
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE gift_cards DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions DISABLE ROW LEVEL SECURITY; 