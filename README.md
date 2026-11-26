# Proyecto_Turismo — Turismo Comunitario y Rural

Proyecto del curso Desarrollo de Software IV (UCR, Sede Regional del Pacífico).

- **Proyecto 1:** API REST con Django REST Framework (`turismo_backend/`).
- **Proyecto 2:** SPA con React + Vite + Bootstrap 5 que consume esa API (`turismo_frontend/`).

-------------- Integrantes --------------
Braulio Cambronero Murillo C38879
Bryan Salamanca Castillo C4J562
[Tercer integrante — completar]

---

## 1. Estructura

```
Proyecto_Turismo/
├── turismo_backend/        Django + DRF (Proyecto 1, con ampliaciones del Proyecto 2)
│   ├── usuarios/           Usuarios, perfiles/roles, login, logout, registro
│   ├── experiencias/       Experiencias (tours) y salidas
│   ├── hospedajes/         Hospedajes, servicios y disponibilidad
│   ├── reservas/           Reservas, pago, cancelación y completado
│   ├── resenas/            Reseñas, métricas ambientales, distribución de ingresos y reportes
│   └── .env.example
├── turismo_frontend/       React (Vite) + React Router + Bootstrap 5
│   ├── src/api/            Cliente HTTP centralizado (fetch) y funciones por recurso
│   ├── src/context/        Sesión (AuthContext), avisos y modal de confirmación
│   ├── src/hooks/          useListado, useFiltros, useOpciones, useFormulario
│   ├── src/components/     Layout, ruta protegida, alertas, paginación, campos...
│   ├── src/pages/          Una carpeta por módulo de negocio
│   └── .env.example
└── docs/                   Matrices de pantallas/endpoints, permisos y escenarios de prueba
```

## 2. Requisitos

| Herramienta | Versión |
|---|---|
| Python | 3.12 o superior |
| Node.js | 20.19+ o 22.12+ (requerido por Vite 8) |
| MySQL | 8.x (o SQLite para una prueba rápida) |
| VS Code | Extensiones sugeridas: Python, ESLint |

## 3. Backend (Django)

```bash
cd turismo_backend
python -m venv venv
# Windows:  venv\Scripts\activate      macOS/Linux:  source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env                 # macOS/Linux: cp .env.example .env
```

Edite `.env` con su usuario/contraseña de MySQL y cree la base de datos:

```sql
CREATE DATABASE turismo_comunitario CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> Prueba rápida sin MySQL: en `.env` ponga `DB_ENGINE=sqlite`.

```bash
python manage.py migrate
python manage.py cargar_datos          # usuarios, experiencias, hospedajes, reservas y reseñas de demostración
python manage.py runserver             # http://127.0.0.1:8000/api/
python manage.py test                  # pruebas automatizadas del backend
```

## 4. Frontend (React)

En otra terminal:

```bash
cd turismo_frontend
copy .env.example .env                 # macOS/Linux: cp .env.example .env
npm install                            # genera package-lock.json (debe subirse al repositorio)
npm run dev                            # http://localhost:5173
```

`VITE_API_URL` (en `turismo_frontend/.env`) es la URL base de la API. Todas las llamadas pasan por `src/api/cliente.js`.

## 5. Configuración CORS

El frontend (puerto 5173) y la API (puerto 8000) son orígenes distintos, por eso el backend usa
`django-cors-headers`. Los orígenes permitidos se leen de la variable `CORS_ALLOWED_ORIGINS` del `.env` del backend
(por defecto `http://localhost:5173,http://127.0.0.1:5173`). El token viaja en el encabezado
`Authorization: Token <clave>`, no en cookies, por lo que no se habilitan credenciales CORS.

## 6. Usuarios de prueba (ficticios)

Creados por `python manage.py cargar_datos`. Contraseña de todos: `Clave12345`.

| Usuario | Rol | Qué puede demostrar |
|---|---|---|
| `admin_demo` | Administrador | Todo: usuarios, servicios, pagos, eliminar reservas, reportes |
| `guia_demo` | Guía local | Sus experiencias, salidas y métricas; completar reservas de sus tours |
| `anfitrion_demo` | Anfitrión | Sus hospedajes; completar reservas de sus hospedajes |
| `turista_demo` | Turista | Reservar, editar/cancelar sus reservas, escribir reseñas |

`turista_demo` ya tiene una reserva completada **sin reseña** (para demostrar la creación de reseñas) y una pendiente de pago.

## 7. Autenticación y sesión

- **Login:** `POST /api/auth/login/` devuelve un token real de DRF (`rest_framework.authtoken`). El frontend lo guarda en
  `localStorage` y lo envía en cada petición. El estado de sesión se comparte con `AuthContext`.
- **Rutas protegidas:** `RutaProtegida` redirige a `/login` si no hay sesión. Al recargar, el token se valida con `GET /api/auth/me/`.
- **401:** si el servidor responde 401 a una petición con token (token inválido o revocado), se limpia la sesión y se vuelve al login con un aviso.
- **403:** la autorización la hace Django. La interfaz oculta acciones según el rol solo por comodidad; si alguien entra a una
  pantalla no permitida (por ejemplo `/usuarios` con un turista), la API responde 403 y se muestra el mensaje.
  La pantalla **Prueba de permisos** (`/seguridad`) ejecuta en vivo un acceso exitoso, uno sin token (401) y uno sin permiso (403).
- **Logout:** `POST /api/auth/logout/` **revoca el token en el servidor** (lo elimina) y el frontend limpia `localStorage`.
  Limitación: DRF usa un solo token por usuario, así que cerrar sesión cierra todas las sesiones abiertas de ese usuario.
  Los tokens no expiran por tiempo.

## 8. Ampliaciones del backend para el Proyecto 2 (justificadas)

| Cambio | Archivo | Justificación |
|---|---|---|
| `django-cors-headers` y `CORS_ALLOWED_ORIGINS` | `settings.py`, `requirements.txt` | El navegador bloquea las llamadas del frontend sin CORS. |
| `POST /api/auth/logout/` | `usuarios/views.py`, `usuarios/urls.py` | Permite revocar el token en el servidor al cerrar sesión. |
| `GET /api/auth/me/` devuelve el rol con `rol_de()` | `usuarios/views.py` | Un superusuario sin perfil se reporta como ADMIN, igual que en los permisos. |
| Campos de solo lectura en reservas: `turista_username`, `experiencia`, `experiencia_nombre`, `salida_fecha_hora`, `hospedaje_nombre`, `tiene_resena` | `reservas/serializers.py` | Mostrar relaciones en tablas sin una consulta extra por fila. No cambian validaciones. |
| Campos de solo lectura en reseñas (`turista_username`, `experiencia_nombre`, `hospedaje_nombre`) y métricas (`experiencia_nombre`, `experiencia_guia`) | `resenas/serializers.py` | Igual que el anterior; `experiencia_guia` permite decidir qué botones mostrar. |
| `SECRET_KEY` vacío usa la clave de desarrollo | `settings.py` | Con `SECRET_KEY=` vacío en `.env` Django no arrancaba. |
| `cargar_datos` crea historial (salida pasada, reservas completadas, una reseña, distribución) | `usuarios/management/commands/cargar_datos.py` | La API exige fechas futuras, así que sin esto no se pueden demostrar reseñas ni reportes. |
| 2 pruebas nuevas (logout revoca token; campos de relación) | `turismo_backend/tests.py` | Evidencia de las ampliaciones. |

Ninguna ampliación debilita reglas de negocio ni permisos.

## 9. Funcionalidades del frontend

- Menú lateral (deslizable en móvil), barra superior con usuario y rol, área principal que cambia sin recargar.
- Dashboard con indicadores reales (experiencias y hospedajes activos, próximas salidas, reservas, calificación promedio y, para el administrador, ingresos de la comunidad).
- Cinco módulos con listado y CRUD: **Usuarios**, **Experiencias** (+ salidas), **Hospedajes** (+ servicios y disponibilidad), **Reservas** (+ pagar, cancelar, completar), **Reseñas** (+ métricas ambientales y reportes).
- Búsqueda (experiencias, hospedajes, usuarios), filtros combinables (experiencias, hospedajes, reservas, usuarios, reseñas, métricas), ordenamiento y paginación del backend.
- Formularios controlados con validación previa, valores precargados al editar, selectores de relaciones consultados a la API y errores del servidor mostrados por campo.
- Confirmación antes de borrar, avisos de éxito, mensajes para 400/401/403/404/409 y fallos de red.

Ver `docs/` para la matriz de pantallas y endpoints, la matriz de permisos y los escenarios de prueba manual.

## 10. Limitaciones conocidas

- Los selectores de relaciones cargan hasta 50 registros (tope de `page_size` del backend).
- El total de una reserva se muestra como estimado en el formulario; el total oficial lo calcula el servidor.
- El token no expira por tiempo y es único por usuario (ver sección 7).
- Completar reservas exige que el tour o la estadía ya hayan ocurrido; con datos recién creados el servidor responde 400 (comportamiento correcto).
