import { COLOR_ESTADO, ESTADOS_PAGO, ESTADOS_RESERVA } from '../utils/constantes';

export function InsigniaEstado({ estado }) {
  return <span className={`badge text-bg-${COLOR_ESTADO[estado] || 'secondary'}`}>{ESTADOS_RESERVA[estado] || estado}</span>;
}

export function InsigniaPago({ estado }) {
  const color = estado === 'PENDIENTE' ? 'light border text-dark' : COLOR_ESTADO[estado] || 'secondary';
  return <span className={`badge text-bg-${color}`}>{ESTADOS_PAGO[estado] || estado}</span>;
}

export function InsigniaActivo({ activo }) {
  return activo ? (
    <span className="badge text-bg-success">Activo</span>
  ) : (
    <span className="badge text-bg-secondary">Inactivo</span>
  );
}
