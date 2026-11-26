import { useCallback, useEffect, useState } from 'react';

const VACIO = { resultados: [], pagina_actual: 1, total_paginas: 1, total_registros: 0 };

/** Acepta la respuesta paginada del backend o un arreglo simple (reportes). */
function normalizar(datos) {
  if (Array.isArray(datos)) {
    return { resultados: datos, pagina_actual: 1, total_paginas: 1, total_registros: datos.length };
  }
  return { ...VACIO, ...datos };
}

/**
 * Consulta un listado de la API cada vez que cambian los parametros.
 * @param {Function|null} listar  funcion del modulo api/recursos (null = no consultar)
 * @param {object} params         filtros, busqueda, orden y pagina que se envian como query string
 */
export function useListado(listar, params) {
  const [respuesta, setRespuesta] = useState(VACIO);
  const [cargando, setCargando] = useState(!!listar);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);
  const clave = JSON.stringify(params ?? {});

  useEffect(() => {
    if (!listar) return undefined;
    let vigente = true;
    setCargando(true);
    setError(null);
    listar(JSON.parse(clave))
      .then((datos) => vigente && setRespuesta(normalizar(datos)))
      .catch((err) => {
        if (!vigente) return;
        setError(err);
        setRespuesta(VACIO);
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [listar, clave, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  return {
    resultados: respuesta.resultados,
    pagina: respuesta.pagina_actual,
    totalPaginas: respuesta.total_paginas,
    total: respuesta.total_registros,
    cargando,
    error,
    recargar,
  };
}
