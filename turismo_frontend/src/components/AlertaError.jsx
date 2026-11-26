import { Link } from 'react-router-dom';
import { mensajeError, erroresDeCampos } from '../utils/errores';

/** Muestra un error de la API con un mensaje segun su codigo HTTP (400, 401, 403, 404, 409, red). */
export default function AlertaError({ error, onReintentar, mostrarCampos = false, className = '' }) {
  if (!error) return null;
  const status = error.status;
  const campos = mostrarCampos ? Object.entries(erroresDeCampos(error)) : [];
  const variante = status === 403 || status === 401 ? 'warning' : 'danger';

  return (
    <div className={`alert alert-${variante} ${className}`} role="alert">
      <div className="d-flex flex-wrap align-items-center gap-2">
        {status > 0 && <span className="badge text-bg-dark">HTTP {status}</span>}
        <span>{mensajeError(error)}</span>
      </div>
      {campos.length > 0 && (
        <ul className="mb-0 mt-2 small">
          {campos.map(([campo, texto]) => (
            <li key={campo}>
              <strong>{campo}</strong>: {texto}
            </li>
          ))}
        </ul>
      )}
      {(onReintentar || status === 401) && (
        <div className="mt-2 d-flex gap-2">
          {onReintentar && (
            <button type="button" className="btn btn-sm btn-outline-dark" onClick={onReintentar}>
              Reintentar
            </button>
          )}
          {status === 401 && (
            <Link to="/login" className="btn btn-sm btn-dark">
              Ir al login
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
