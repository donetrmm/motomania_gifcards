-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Crear tabla de gift cards
CREATE TABLE IF NOT EXISTS gift_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255),
    owner_phone VARCHAR(50),
    initial_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    type VARCHAR(20) NOT NULL CHECK (type IN ('giftcard', 'ewallet')),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de transacciones
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gift_card_id UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('creation', 'usage', 'refund', 'adjustment')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_owner_name ON gift_cards(owner_name);
CREATE INDEX IF NOT EXISTS idx_gift_cards_type ON gift_cards(type);
CREATE INDEX IF NOT EXISTS idx_gift_cards_is_active ON gift_cards(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_gift_card_id ON transactions(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gift_cards_updated_at ON gift_cards;
CREATE TRIGGER update_gift_cards_updated_at 
    BEFORE UPDATE ON gift_cards 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insertar usuario por defecto (password: admin123)
-- Hash bcrypt para 'admin123'
INSERT INTO users (username, password_hash, role) 
VALUES ('admin', '$2b$10$lqW797TToM7i5KOW.nHNKeXlfBVDkU92apx026mkf7dJmPVzv9KNq', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Habilitar RLS (Row Level Security) para seguridad
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad básicas (ajustar según necesidades)
-- Por ahora, permitir acceso completo para usuarios autenticados
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (true);

CREATE POLICY "Users can view all gift cards" ON gift_cards FOR ALL USING (true);
CREATE POLICY "Users can view all transactions" ON transactions FOR ALL USING (true);

-- Comentarios para documentación
COMMENT ON TABLE users IS 'Tabla de usuarios del sistema';
COMMENT ON TABLE gift_cards IS 'Tabla de tarjetas de regalo y monederos electrónicos';
COMMENT ON TABLE transactions IS 'Tabla de transacciones de las tarjetas';

COMMENT ON COLUMN gift_cards.code IS 'Código único ofuscado de la tarjeta';
COMMENT ON COLUMN gift_cards.type IS 'Tipo: giftcard (una sola compra) o ewallet (recargable)';
COMMENT ON COLUMN transactions.type IS 'Tipo de transacción: creation, usage, refund, adjustment'; 