export const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');

const CLAVE_TOKEN = 'turismo_token';

export function obtenerToken() {
  return localStorage.getItem(CLAVE_TOKEN);
}

export function guardarToken(token) {
  localStorage.setItem(CLAVE_TOKEN, token);
}

export function borrarToken() {
  localStorage.removeItem(CLAVE_TOKEN);
}

export class ApiError extends Error {
  constructor(status, datos, mensaje) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status; // 0 = fallo de red
    this.datos = datos;
  }
}

let manejador401 = null;
export function registrarManejador401(funcion) {
  manejador401 = funcion;
}

function construirUrl(ruta, params) {
  const url = new URL(API_URL + ruta, window.location.origin);
  Object.entries(params || {}).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(clave, valor);
    }
  });
  return url.toString();
}

/**
 * Ejecuta una peticion a la API.
 * @param {string} ruta  Ruta relativa, por ejemplo "/experiencias/".
 * @param {object} opciones { metodo, datos, params, autenticar }
 */
export async function solicitud(ruta, { metodo = 'GET', datos, params, autenticar = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (datos !== undefined) headers['Content-Type'] = 'application/json';

  const token = obtenerToken();
  if (autenticar && token) headers.Authorization = `Token ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(construirUrl(ruta, params), {
      method: metodo,
      headers,
      body: datos !== undefined ? JSON.stringify(datos) : undefined,
    });
  } catch {
    throw new ApiError(0, null, 'No se pudo conectar con el servidor. Verifique que Django esté en ejecución y la configuración de CORS.');
  }

  if (respuesta.status === 204) return null;

  const texto = await respuesta.text();
  let cuerpo = null;
  if (texto) {
    try {
      cuerpo = JSON.parse(texto);
    } catch {
      cuerpo = { detail: texto.slice(0, 200) };
    }
  }

  if (!respuesta.ok) {
    if (respuesta.status === 401 && autenticar && token && manejador401) {
      manejador401();
    }
    throw new ApiError(respuesta.status, cuerpo, `Error HTTP ${respuesta.status}`);
  }
  return cuerpo;
}

/** Peticion "cruda" usada por la pantalla de Seguridad para mostrar estado y cuerpo tal cual. */
export async function solicitudDiagnostico(ruta, { metodo = 'GET', conToken = true } = {}) {
  const headers = { Accept: 'application/json' };
  const token = obtenerToken();
  if (conToken && token) headers.Authorization = `Token ${token}`;
  const url = construirUrl(ruta);
  try {
    const respuesta = await fetch(url, { method: metodo, headers });
    const texto = await respuesta.text();
    let cuerpo = texto;
    try {
      cuerpo = JSON.parse(texto);
    } catch {
      /* se deja como texto */
    }
    return { url, metodo, status: respuesta.status, cuerpo, conToken: conToken && !!token };
  } catch {
    return { url, metodo, status: 0, cuerpo: 'Fallo de red', conToken: conToken && !!token };
  }
}
