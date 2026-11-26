/** Envoltorio de un campo de formulario: etiqueta, control, ayuda y error del servidor o del cliente. */
export default function Campo({ etiqueta, id, error, ayuda, requerido, className = 'mb-3', children }) {
  return (
    <div className={className}>
      {etiqueta && (
        <label htmlFor={id} className="form-label">
          {etiqueta}
          {requerido && <span className="text-danger ms-1" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {ayuda && !error && <div className="form-text">{ayuda}</div>}
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
}

/** Clase de Bootstrap para un input con o sin error */
// eslint-disable-next-line react-refresh/only-export-components
export const claseControl = (error, base = 'form-control') => `${base}${error ? ' is-invalid' : ''}`;
