import { createContext, useCallback, useContext, useState } from 'react';

const NotificacionesContext = createContext(() => {});

/** Avisos tipo "toast" de Bootstrap para confirmar operaciones exitosas. */
export function NotificacionesProvider({ children }) {
  const [avisos, setAvisos] = useState([]);

  const cerrar = useCallback((id) => setAvisos((lista) => lista.filter((a) => a.id !== id)), []);

  const notificar = useCallback(
    (mensaje, tipo = 'success') => {
      const id = `${Date.now()}-${Math.random()}`;
      setAvisos((lista) => [...lista, { id, mensaje, tipo }]);
      setTimeout(() => cerrar(id), 4500);
    },
    [cerrar],
  );

  return (
    <NotificacionesContext.Provider value={notificar}>
      {children}
      <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1090 }}>
        {avisos.map((aviso) => (
          <div key={aviso.id} className={`toast show align-items-center text-bg-${aviso.tipo} border-0`} role="status">
            <div className="d-flex">
              <div className="toast-body">{aviso.mensaje}</div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                aria-label="Cerrar"
                onClick={() => cerrar(aviso.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </NotificacionesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useNotificar = () => useContext(NotificacionesContext);
