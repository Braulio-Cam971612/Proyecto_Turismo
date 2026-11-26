import { useCallback, useEffect, useState } from 'react';

/** Retrasa la actualizacion de un valor (evita una peticion por cada tecla). */
export function useDebounce(valor, ms = 350) {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return retrasado;
}

/**
 * Estado de filtros de un listado. Cualquier cambio de filtro vuelve a la pagina 1.
 * Devuelve tambien "params": los filtros con debounce, listos para enviarse al backend.
 */
export function useFiltros(inicial) {
  const [filtros, setFiltros] = useState(inicial);

  const cambiar = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFiltros((f) => ({ ...f, [name]: type === 'checkbox' ? (checked ? 'true' : '') : value, page: 1 }));
  }, []);

  const irAPagina = useCallback((page) => setFiltros((f) => ({ ...f, page })), []);
  const limpiar = useCallback(() => setFiltros(inicial), [inicial]);

  const params = useDebounce(filtros);
  return { filtros, params, cambiar, irAPagina, limpiar };
}
