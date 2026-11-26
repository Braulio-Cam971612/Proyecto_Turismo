import { useCallback, useEffect, useState } from 'react';
import { erroresDeCampos } from '../utils/errores';

/** Obtiene un registro por id (para precargar formularios de edicion o mostrar detalles). */
export function useRegistro(obtener, id) {
  const [registro, setRegistro] = useState(null);
  const [cargando, setCargando] = useState(!!id);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!id) return undefined;
    let vigente = true;
    setCargando(true);
    setError(null);
    obtener(id)
      .then((datos) => vigente && setRegistro(datos))
      .catch((err) => vigente && setError(err))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [obtener, id, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { registro, cargando, error, recargar };
}

/**
 * Estado del envio de un formulario: procesando, error general y errores por campo
 * (los errores 400 de Django se reparten automaticamente en cada campo).
 */
export function useEnvioFormulario() {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);
  const [errores, setErrores] = useState({});

  const enviar = useCallback(async (accion) => {
    setProcesando(true);
    setError(null);
    try {
      const resultado = await accion();
      setErrores({});
      return { ok: true, resultado };
    } catch (err) {
      setError(err);
      setErrores(erroresDeCampos(err));
      return { ok: false };
    } finally {
      setProcesando(false);
    }
  }, []);

  /** Aplica la validacion previa del cliente; devuelve true si no hay errores. */
  const validar = useCallback((nuevosErrores) => {
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      setError(null);
      return false;
    }
    return true;
  }, []);

  return { procesando, error, errores, enviar, validar };
}
