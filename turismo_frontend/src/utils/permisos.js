
export const ADMIN = 'ADMIN';
export const GUIA = 'GUIA';
export const ANFITRION = 'ANFITRION';
export const TURISTA = 'TURISTA';

const es = (usuario, ...roles) => !!usuario && roles.includes(usuario.rol);

export const puede = {
  administrar: (u) => es(u, ADMIN),

  crearExperiencia: (u) => es(u, ADMIN, GUIA),
  editarExperiencia: (u, exp) => es(u, ADMIN) || (es(u, GUIA) && exp?.guia === u.id),

  crearHospedaje: (u) => es(u, ADMIN, ANFITRION),
  editarHospedaje: (u, h) => es(u, ADMIN) || (es(u, ANFITRION) && h?.anfitrion === u.id),

  crearReserva: (u) => es(u, ADMIN, TURISTA),
  editarReserva: (u, r) => es(u, ADMIN, TURISTA) && r?.estado === 'PENDIENTE',
  eliminarReserva: (u) => es(u, ADMIN),
  pagarReserva: (u, r) => es(u, ADMIN) && r?.estado === 'PENDIENTE' && r?.estado_pago === 'PENDIENTE',
  cancelarReserva: (u, r) => es(u, ADMIN, TURISTA) && ['PENDIENTE', 'CONFIRMADA'].includes(r?.estado),
  completarReserva: (u, r) => es(u, ADMIN, GUIA, ANFITRION) && r?.estado === 'CONFIRMADA',
  resenarReserva: (u, r) =>
    es(u, ADMIN, TURISTA) && r?.estado === 'COMPLETADA' && !r?.tiene_resena && (es(u, ADMIN) || r?.turista === u.id),

  crearResena: (u) => es(u, ADMIN, TURISTA),
  editarResena: (u, r) => es(u, ADMIN) || (es(u, TURISTA) && r?.turista === u.id),

  crearMetrica: (u) => es(u, ADMIN, GUIA),
  editarMetrica: (u, m) => es(u, ADMIN) || (es(u, GUIA) && m?.experiencia_guia === u.id),
};
