import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ConfirmacionContext = createContext(null);

/**
 * Modal de confirmacion reutilizable.
 * Uso: const confirmar = useConfirmar();  if (await confirmar({ titulo, mensaje })) { ... }
 */
export function ConfirmacionProvider({ children }) {
  const [dialogo, setDialogo] = useState(null);

  const confirmar = useCallback(
    (opciones) => new Promise((resolver) => setDialogo({ ...opciones, resolver })),
    [],
  );

  const cerrar = useCallback(
    (resultado) => {
      dialogo?.resolver(resultado);
      setDialogo(null);
    },
    [dialogo],
  );

  useEffect(() => {
    if (!dialogo) return undefined;
    const alPresionar = (e) => e.key === 'Escape' && cerrar(false);
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [dialogo, cerrar]);

  return (
    <ConfirmacionContext.Provider value={confirmar}>
      {children}
      {dialogo && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{dialogo.titulo || '¿Confirmar operación?'}</h5>
                  <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => cerrar(false)} />
                </div>
                <div className="modal-body">{dialogo.mensaje}</div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => cerrar(false)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={`btn btn-${dialogo.variante || 'danger'}`}
                    onClick={() => cerrar(true)}
                    autoFocus
                  >
                    {dialogo.textoConfirmar || 'Eliminar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}
    </ConfirmacionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useConfirmar = () => useContext(ConfirmacionContext);
