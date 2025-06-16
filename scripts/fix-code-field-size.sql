-- Aumentar el tamaño del campo code para soportar códigos ofuscados
-- Los códigos cifrados con AES pueden ser de 64+ caracteres

ALTER TABLE gift_cards 
ALTER COLUMN code TYPE VARCHAR(200);

-- Verificar el cambio
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'gift_cards' AND column_name = 'code'; 