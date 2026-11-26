import { useState } from 'react';
import { Link } from 'react-router-dom';
import { reservasApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useConfirmar } from '../../context/ConfirmacionContext';
import { useNotificar } from '../../context/NotificacionesContext';
import { mensajeError } from '../../utils/errores';
import { colones } from '../../utils/formato';
import { puede } from '../../utils/permisos';

/**
 * Botones de las operaciones de negocio de una reserva. Cada una cambia el estado en el servidor:
 *  pagar     POST /reservas/:id/pagar/      (ADMIN)  -> CONFIRMADA + PAGADO + distribucion de ingresos
 *  cancelar  POST /reservas/:id/cancelar/   (ADMIN, TURISTA) -> CANCELADA (REEMBOLSADO si estaba pagada)
 *  completar POST /reservas/:id/completar/  (ADMIN, GUIA, ANFITRION) -> COMPLETADA
 *  eliminar  DELETE /reservas/:id/          (ADMIN)
 */
export default function AccionesReserva({ reserva, onCambio, onEliminada, compacto = false }) {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const notificar = useNotificar();
  const [procesando, setProcesando] = useState(false);
  const tam = compacto ? 'btn-sm' : '';

  async function ejecutar({ titulo, mensaje, textoConfirmar, variante, accion, exito, alTerminar }) {
    if (!(await confirmar({ titulo, mensaje, textoConfirmar, variante }))) return;
    setProcesando(true);
    try {
      const resultado = await accion(reserva.id);
      notificar(exito);
      (alTerminar || onCambio)?.(resultado);
    } catch (err) {
      notificar(mensajeError(err), 'danger');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className={`d-inline-flex flex-wrap gap-1 ${compacto ? 'justify-content-end' : ''}`}>
      {compacto && <Link to={`/reservas/${reserva.id}`} className={`btn ${tam} btn-outline-primary`}>Ver</Link>}
      {puede.editarReserva(usuario, reserva) && (
        <Link to={`/reservas/${reserva.id}/editar`} className={`btn ${tam} btn-outline-secondary`}>Editar</Link>
      )}
      {puede.pagarReserva(usuario, reserva) && (
        <button
          type="button"
          className={`btn ${tam} btn-success`}
          disabled={procesando}
          onClick={() => ejecutar({
            titulo: 'Registrar pago',
            mensaje: `¿Registrar el pago de ${colones(reserva.total)}? La reserva pasará a CONFIRMADA y se generará la distribución de ingresos para la comunidad.`,
            textoConfirmar: 'Registrar pago',
            variante: 'success',
            accion: reservasApi.pagar,
            exito: 'Pago registrado. Reserva confirmada.',
          })}
        >
          Pagar
        </button>
      )}
      {puede.completarReserva(usuario, reserva) && (
        <button
          type="button"
          className={`btn ${tam} btn-outline-success`}
          disabled={procesando}
          onClick={() => ejecutar({
            titulo: 'Completar reserva',
            mensaje: 'Marque la reserva como completada solo si el tour ya se realizó o la estadía terminó.',
            textoConfirmar: 'Completar',
            variante: 'success',
            accion: reservasApi.completar,
            exito: 'Reserva completada.',
          })}
        >
          Completar
        </button>
      )}
      {puede.cancelarReserva(usuario, reserva) && (
        <button
          type="button"
          className={`btn ${tam} btn-outline-warning`}
          disabled={procesando}
          onClick={() => ejecutar({
            titulo: 'Cancelar reserva',
            mensaje: reserva.estado_pago === 'PAGADO'
              ? 'La reserva está pagada: al cancelarla se marcará como REEMBOLSADA y se anulará la distribución de ingresos.'
              : '¿Desea cancelar esta reserva? Los cupos quedarán libres.',
            textoConfirmar: 'Cancelar reserva',
            variante: 'warning',
            accion: reservasApi.cancelar,
            exito: 'Reserva cancelada.',
          })}
        >
          Cancelar
        </button>
      )}
      {puede.resenarReserva(usuario, reserva) && (
        <Link to={`/resenas/nueva?reserva=${reserva.id}`} className={`btn ${tam} btn-outline-primary`}>Reseñar</Link>
      )}
      {puede.eliminarReserva(usuario) && (
        <button
          type="button"
          className={`btn ${tam} btn-outline-danger`}
          disabled={procesando}
          onClick={() => ejecutar({
            titulo: 'Eliminar reserva',
            mensaje: `¿Eliminar definitivamente la reserva #${reserva.id}? También se borrarán su reseña y su distribución de ingresos.`,
            accion: reservasApi.eliminar,
            exito: 'Reserva eliminada.',
            alTerminar: onEliminada || onCambio,
          })}
        >
          Eliminar
        </button>
      )}
    </div>
  );
}
