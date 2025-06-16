-- Deshabilitar Row Level Security para desarrollo
-- ADVERTENCIA: Solo usar en desarrollo, nunca en producción

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE gift_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Para verificar el estado de RLS, puedes ejecutar:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename IN ('users', 'gift_cards', 'transactions'); 