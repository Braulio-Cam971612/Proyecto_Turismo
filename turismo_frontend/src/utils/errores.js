import { ApiError } from '../api/cliente';

const CLAVES_GENERALES = ['detail', 'error', 'non_field_errors'];

function aTexto(valor) {
  if (valor === null || valor === undefined) return '';
  if (Array.isArray(valor)) return valor.map(aTexto).join(' ');
  if (typeof valor === 'object') return Object.values(valor).map(aTexto).join(' ');
  return String(valor);
}

/** Mensaje general enviado por Django (detail, error o non_field_errors). */
function detalleServidor(datos) {
  if (!datos) return '';
  if (Array.isArray(datos) || typeof datos === 'string') return aTexto(datos);
  return CLAVES_GENERALES.map((c) => aTexto(datos[c])).filter(Boolean).join(' ');
}

/** Convierte cualquier error en un texto comprensible para el usuario, segun el codigo HTTP. */
export function mensajeError(error) {
  if (!(error instanceof ApiError)) return error?.message || 'Ocurrió un error inesperado.';
  const detalle = detalleServidor(error.datos);
  switch (error.status) {
    case 0:
      return error.message;
    case 400:
      return detalle || 'Hay datos inválidos. Revise los campos marcados.';
    case 401:
      return 'No autenticado (401): su sesión no es válida o expiró. Inicie sesión de nuevo.';
    case 403:
      return `Acceso denegado (403): ${detalle || 'su rol no tiene permiso para esta operación.'}`;
    case 404:
      return `No encontrado (404): ${detalle || 'el registro no existe o no tiene acceso a él.'}`;
    case 409:
      return `Conflicto (409): ${detalle || 'la operación entra en conflicto con otros datos.'}`;
    default:
      return error.status >= 500
        ? `Error del servidor (${error.status}). Intente más tarde.`
        : detalle || `Error HTTP ${error.status}`;
  }
}

/** Errores por campo de una respuesta 400 de DRF: { campo: "mensaje" }. */
export function erroresDeCampos(error) {
  if (!(error instanceof ApiError) || error.status !== 400) return {};
  const datos = error.datos;
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return {};
  const resultado = {};
  Object.entries(datos).forEach(([campo, valor]) => {
    if (!CLAVES_GENERALES.includes(campo)) resultado[campo] = aTexto(valor);
  });
  return resultado;
}
