# 🔔 ElUltimoTimbraso — Sistema de Logística Inteligente

> "Cuando comieres el trabajo de tus manos, Bienaventurado serás, y te irá bien."

---

## 🚀 Setup paso a paso

### 1. Base de datos (Supabase)
1. Ir a [supabase.com](https://supabase.com) → crear proyecto
2. En **SQL Editor**, ejecutar **en orden**:
   - `backend/migrations/001_initial_schema.sql`
   - `backend/migrations/002_corresponsales_y_mejoras.sql`
   - `backend/migrations/002_evidencia_foto.sql`
   - `backend/migrations/003_asignar_solicitudes.sql`
   - `backend/migrations/004_otp_settings.sql`

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus datos
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🔧 Variables de entorno (backend/.env)

```env
PORT=4000
JWT_SECRET=clave_secreta_larga_aqui
SUPABASE_URL=https://tuproyecto.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
GOOGLE_MAPS_API_KEY=AIzaSy...  ← Requerida para el mapa GPS en vivo
CLIENT_URL=http://localhost:5173

# Email OTP (Gmail recomendado)
# En Gmail: Configuración → Seguridad → Contraseñas de aplicación
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tucorreo@gmail.com
SMTP_PASS=xxxx_xxxx_xxxx_xxxx
```

> **Sin SMTP configurado:** el código OTP se muestra en la consola del backend Y en pantalla (banner amarillo). Ideal para desarrollo.

---

## 👤 Credenciales por defecto

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@rutas.com | Admin123! |

Los operadores y clientes los crea el admin.

---

## 📱 Funcionalidades

### Admin
- Dashboard con simulación de flota en tiempo real (autos, motos, camiones, vans)
- Mapa GPS en vivo de operadores (requiere Google Maps API Key)
- Gestión de rutas, paquetes, ciclos, operadores, clientes
- Asignar solicitudes de recogida a operadores específicos
- Ver fotos de evidencia de entregas
- Reportes por ciclo y operador

### Operador
- Ver rutas asignadas del día con GPS automático
- **Actualizar estado del envío** en cada punto (recogido, entregado, no entregado, etc.)
- Subir **foto de evidencia** desde cámara o galería
- **Recibir y responder asignaciones** del admin (aceptar/rechazar con razón)
- **Contacto directo con cliente** vía WhatsApp
- Notificaciones en tiempo real

### Cliente
- Ver estado de paquetes en tiempo real con **timeline de progreso**
- Ver **foto de evidencia** de entrega
- Seguimiento GPS del operador en tiempo real
- Solicitar recogida (domicilio o corresponsal)

### Seguridad
- **Verificación en 2 pasos (OTP)** opcional — activable/desactivable en ⚙️ Ajustes
- Código de 6 dígitos enviado al correo registrado
- Email de OTP con diseño profesional y logo de la empresa
- JWT con expiración de 7 días

---

## 🗺️ El mapa GPS no carga — solución

El mapa en vivo del admin y el seguimiento del cliente requieren una **Google Maps API Key** válida:

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear proyecto → habilitar **Maps JavaScript API** + **Directions API**
3. Crear API Key en Credenciales
4. Agregar a `backend/.env`: `GOOGLE_MAPS_API_KEY=tu_key_aqui`
5. Reiniciar el backend

La **simulación de flota** en el Dashboard Admin funciona siempre sin API Key.

---

## 🔌 Socket.io — Eventos en tiempo real

| Evento | Descripción |
|--------|-------------|
| `operador:iniciar_tracking` | Inicia GPS del operador |
| `operador:ubicacion` | Envía coordenadas GPS |
| `admin:unirse` | Admin entra a sala de monitoreo |
| `cliente:seguir_operador` | Cliente suscribe a un operador |
| `operador:ubicacion_update` | Broadcast de nueva ubicación |
| `punto:actualizado` | Estado de punto cambiado |
| `paquete:actualizado` | Estado de paquete cambiado → notifica al cliente |
