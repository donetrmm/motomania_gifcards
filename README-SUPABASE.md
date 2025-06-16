# Configuración de Supabase para GiftCard Motomanía

## 🚀 Migración a Base de Datos en la Nube

Esta aplicación ahora utiliza **Supabase PostgreSQL** para almacenar los datos de forma persistente y compartida entre dispositivos, reemplazando el sistema anterior de localStorage.

## 📋 Requisitos Previos

1. Cuenta en [Supabase](https://supabase.com)
2. Proyecto creado en Supabase
3. Base de datos PostgreSQL disponible

## ⚙️ Configuración Paso a Paso

### 1. Crear Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_aqui

# Authentication (opcional, para mayor seguridad)
AUTH_SECRET=tu_secreto_de_autenticacion_aqui
```

### 2. Configurar la Base de Datos

Ejecuta el siguiente script SQL en el **SQL Editor** de tu proyecto Supabase:

```bash
# El archivo está disponible en:
./scripts/setup-database.sql
```

Este script:
- ✅ Crea las tablas necesarias (`users`, `gift_cards`, `transactions`)
- ✅ Configura índices para mejor rendimiento
- ✅ Establece triggers para `updated_at` automático
- ✅ Crea el usuario admin por defecto
- ✅ Configura políticas de seguridad (RLS)

### 3. Usuario por Defecto

El script crea automáticamente:
- **Usuario**: `admin`
- **Contraseña**: `admin123`
- **Rol**: `admin`

⚠️ **Importante**: Cambia esta contraseña después del primer inicio de sesión.

### 4. Estructura de la Base de Datos

#### Tabla `users`
```sql
- id (UUID, PK)
- username (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- role ('admin' | 'user')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- is_active (BOOLEAN)
```

#### Tabla `gift_cards`
```sql
- id (UUID, PK)
- code (VARCHAR, UNIQUE) -- Código ofuscado
- owner_name (VARCHAR)
- owner_email (VARCHAR, opcional)
- owner_phone (VARCHAR, opcional)
- initial_amount (DECIMAL)
- current_amount (DECIMAL)
- type ('giftcard' | 'ewallet')
- is_active (BOOLEAN)
- notes (TEXT, opcional)
- expires_at (TIMESTAMP, opcional)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### Tabla `transactions`
```sql
- id (UUID, PK)
- gift_card_id (UUID, FK)
- type ('creation' | 'usage' | 'refund' | 'adjustment')
- amount (DECIMAL)
- description (TEXT)
- timestamp (TIMESTAMP)
- created_by (UUID, FK, opcional)
```

## 🔄 Migración desde localStorage

Si tienes datos existentes en localStorage, estos seguirán funcionando pero solo en el navegador donde fueron creados. Para migrar completamente a Supabase:

1. **Configura Supabase** siguiendo los pasos anteriores
2. **Modifica los componentes** para usar el nuevo servicio:

```typescript
// Antes (localStorage)
import { GiftCardService } from '@/lib/giftcard-service'

// Después (Supabase)
import { SupabaseGiftCardService } from '@/lib/supabase-giftcard-service'
import { SupabaseAuthService } from '@/lib/supabase-auth-service'
```

## 🔒 Seguridad

### Row Level Security (RLS)
- ✅ Habilitado en todas las tablas
- ✅ Políticas básicas configuradas
- ✅ Solo usuarios autenticados pueden acceder a los datos

### Autenticación
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Validación de usuarios activos
- ✅ Gestión de roles (admin/user)

## 🌟 Nuevas Funcionalidades

### ✅ **Sincronización Multi-Dispositivo**
- Los datos se sincronizan automáticamente
- Acceso desde cualquier dispositivo con las mismas credenciales
- Sin pérdida de datos al cambiar de navegador

### ✅ **Gestión de Usuarios**
- Múltiples usuarios con diferentes roles
- Sistema de permisos admin/user
- Creación y gestión de cuentas

### ✅ **Historial Completo**
- Todas las transacciones se almacenan permanentemente
- Auditoría completa de cambios
- Reportes y estadísticas precisos

### ✅ **Backup Automático**
- Los datos están respaldados en Supabase
- Redundancia y alta disponibilidad
- Sin riesgo de pérdida por problemas del navegador

## 🚀 Instalación y Ejecución

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
# (crea .env.local con las credenciales de Supabase)

# 3. Ejecutar el script SQL en Supabase
# (copia y pega scripts/setup-database.sql)

# 4. Iniciar la aplicación
npm run dev
```

## 🔧 Comandos Útiles

```bash
# Generar nuevo hash de contraseña
node scripts/generate-admin-hash.js

# Verificar conexión a Supabase
# (desde el navegador, verifica la consola)
```

## 📝 Notas Importantes

1. **Variables de Entorno**: No commitees el archivo `.env.local` al repositorio
2. **Credenciales**: Cambia las contraseñas por defecto en producción
3. **Políticas RLS**: Ajusta las políticas según tus necesidades específicas
4. **Backup**: Supabase maneja los backups, pero considera exportaciones periódicas

## 🆘 Troubleshooting

### Error de conexión
- Verifica las URLs y claves en `.env.local`
- Confirma que el proyecto Supabase esté activo

### Error de autenticación
- Verifica que el script SQL se ejecutó correctamente
- Confirma que el usuario admin existe en la tabla `users`

### Datos no aparecen
- Verifica las políticas RLS en Supabase
- Confirma que las tablas existen y tienen datos

---

¡Ahora tu aplicación está lista para uso multi-dispositivo con Supabase! 🎉 