# Matriz de perfiles y permisos

La autorización la aplica Django en cada vista (`rol_de()` + `prohibido()` → 403). La interfaz solo oculta botones.
Leyenda: ✔ permitido · ✔* solo sobre registros propios · ✖ 403 · 👁 solo lectura

| Operación | ADMIN | GUÍA | ANFITRIÓN | TURISTA |
|---|---|---|---|---|
| Ver experiencias, salidas, hospedajes, servicios, reseñas, métricas | 👁 | 👁 | 👁 | 👁 |
| Crear / editar / eliminar usuarios | ✔ | ✖ | ✖ | ✖ |
| Crear experiencia | ✔ (elige guía) | ✔ (queda a su nombre) | ✖ | ✖ |
| Editar / eliminar experiencia y sus salidas | ✔ | ✔* | ✖ | ✖ |
| Crear hospedaje | ✔ (elige anfitrión) | ✖ | ✔ (a su nombre) | ✖ |
| Editar / eliminar hospedaje | ✔ | ✖ | ✔* | ✖ |
| Crear / editar / eliminar servicios | ✔ | ✖ | ✖ | ✖ |
| Ver reservas | Todas | De sus tours | De sus hospedajes | Las suyas |
| Crear reserva | ✔ | ✖ | ✖ | ✔ |
| Editar reserva (solo PENDIENTE) | ✔ | ✖ | ✖ | ✔* |
| Pagar reserva | ✔ | ✖ | ✖ | ✖ |
| Cancelar reserva | ✔ | ✖ | ✖ | ✔* |
| Completar reserva | ✔ | ✔* | ✔* | ✖ |
| Eliminar reserva | ✔ | ✖ | ✖ | ✖ |
| Crear reseña (reserva COMPLETADA) | ✔ | ✖ | ✖ | ✔* |
| Editar / eliminar reseña | ✔ | ✖ | ✖ | ✔* |
| Crear / editar / eliminar métrica | ✔ | ✔* | ✖ | ✖ |
| Reportes y distribuciones | ✔ | ✖ | ✖ | ✖ |

## Cómo demostrarlo desde la interfaz

1. Inicie sesión como `turista_demo` y abra **Prueba de permisos** → “Ejecutar todas”: 200, 401 y 403.
2. Con el mismo usuario escriba `/usuarios` en la barra de direcciones: la tabla muestra “Acceso denegado (403)”.
3. Como `turista_demo` abra `/experiencias/nueva` y envíe el formulario: aviso previo y respuesta 403 del servidor.
4. Como `guia_demo` edite una experiencia propia (permitido). Para el caso “otro guía”, cree un segundo guía como admin.
5. Como `admin_demo` repita la prueba de permisos: los cuatro accesos responden 200 salvo el de “sin token” (401).
