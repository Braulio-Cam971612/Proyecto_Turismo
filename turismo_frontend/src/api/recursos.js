
import { solicitud } from './cliente';

function crearRecurso(ruta) {
  return {
    listar: (params) => solicitud(`/${ruta}/`, { params }),
    obtener: (id) => solicitud(`/${ruta}/${id}/`),
    crear: (datos) => solicitud(`/${ruta}/`, { metodo: 'POST', datos }),
    modificar: (id, datos) => solicitud(`/${ruta}/${id}/`, { metodo: 'PATCH', datos }),
    eliminar: (id) => solicitud(`/${ruta}/${id}/`, { metodo: 'DELETE' }),
  };
}

export const authApi = {
  login: (username, password) =>
    solicitud('/auth/login/', { metodo: 'POST', datos: { username, password }, autenticar: false }),
  registro: (datos) => solicitud('/auth/registro/', { metodo: 'POST', datos, autenticar: false }),
  logout: () => solicitud('/auth/logout/', { metodo: 'POST' }),
  me: () => solicitud('/auth/me/'),
};

export const usuariosApi = crearRecurso('usuarios');
export const experienciasApi = crearRecurso('experiencias');
export const salidasApi = crearRecurso('salidas');
export const serviciosApi = crearRecurso('servicios');
export const resenasApi = crearRecurso('resenas');
export const metricasApi = crearRecurso('metricas');

export const hospedajesApi = {
  ...crearRecurso('hospedajes'),
  disponibles: (params) => solicitud('/hospedajes/disponibles/', { params }),
};

export const reservasApi = {
  ...crearRecurso('reservas'),
  pagar: (id) => solicitud(`/reservas/${id}/pagar/`, { metodo: 'POST' }),
  cancelar: (id) => solicitud(`/reservas/${id}/cancelar/`, { metodo: 'POST' }),
  completar: (id) => solicitud(`/reservas/${id}/completar/`, { metodo: 'POST' }),
};

export const distribucionesApi = {
  listar: (params) => solicitud('/distribuciones/', { params }),
};

export const reportesApi = {
  experienciasTop: () => solicitud('/reportes/experiencias-top/'),
  ingresosPorExperiencia: () => solicitud('/reportes/ingresos-por-experiencia/'),
  ocupacionSalidas: () => solicitud('/reportes/ocupacion-salidas/'),
  hospedajesDemanda: () => solicitud('/reportes/hospedajes-demanda/'),
  resumenSostenibilidad: () => solicitud('/reportes/resumen-sostenibilidad/'),
};
