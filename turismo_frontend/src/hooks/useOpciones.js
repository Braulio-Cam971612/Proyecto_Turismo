import { PAGE_SIZE_MAX } from '../utils/constantes';
import { useListado } from './useListado';

/** Carga los registros de una entidad relacionada para llenar un <select> desde la API. */
export function useOpciones(listar, params = {}) {
  const { resultados, cargando, error } = useListado(listar, { page_size: PAGE_SIZE_MAX, ...params });
  return { opciones: resultados, cargando, error };
}
