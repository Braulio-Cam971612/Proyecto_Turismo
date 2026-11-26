import { Link, useNavigate, useParams } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { InsigniaEstado, InsigniaPago } from '../../components/Insignia';
import { reservasApi, resenasApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useRegistro } from '../../hooks/useFormulario';
import { useListado } from '../../hooks/useListado';
import { colones, estrellas, fecha, fechaHora, noches } from '../../utils/formato';
import AccionesReserva from './AccionesReserva';

/** Detalle de una reserva: relaciones con turista, salida/experiencia, hospedaje y reseña. */
export default function ReservaDetalle() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const { registro: r, cargando, error, recargar } = useRegistro(reservasApi.obtener, id);
  // La reseña de la reserva se busca en /resenas/ filtrando por la experiencia u hospedaje relacionados
  const filtroResena = r ? (r.experiencia ? { experiencia: r.experiencia } : { hospedaje: r.hospedaje }) : null;
  const resenas = useListado(r?.tiene_resena ? resenasApi.listar : null, { ...filtroResena, page_size: 50 });
  const resena = resenas.resultados.find((x) => x.reserva === r?.id);

  if (cargando) return <Cargando />;
  if (error) return <AlertaError error={error} />;
  if (!r) return null;

  return (
    <>
      <EncabezadoPagina titulo={`Reserva #${r.id}`} subtitulo={`Creada el ${fechaHora(r.fecha_creacion)}${usuario.rol !== 'TURISTA' ? ` por ${r.turista_username}` : ''}`}>
        <Link to="/reservas" className="btn btn-outline-secondary">Volver</Link>
      </EncabezadoPagina>

      <div className="card shadow-sm mb-3">
        <div className="card-body d-flex flex-wrap gap-3 align-items-center justify-content-between">
          <div className="d-flex gap-3 align-items-center">
            <div><div className="small text-secondary">Estado</div><InsigniaEstado estado={r.estado} /></div>
            <div><div className="small text-secondary">Pago</div><InsigniaPago estado={r.estado_pago} /></div>
            <div><div className="small text-secondary">Total</div><strong className="fs-5">{colones(r.total)}</strong></div>
          </div>
          <AccionesReserva reserva={r} onCambio={recargar} onEliminada={() => navigate('/reservas')} />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Tour</div>
            <div className="card-body">
              {r.salida ? (
                <dl className="row mb-0">
                  <dt className="col-5">Experiencia</dt>
                  <dd className="col-7"><Link to={`/experiencias/${r.experiencia}`}>{r.experiencia_nombre}</Link></dd>
                  <dt className="col-5">Fecha y hora</dt><dd className="col-7">{fechaHora(r.salida_fecha_hora)}</dd>
                  <dt className="col-5">Personas</dt><dd className="col-7">{r.personas}</dd>
                </dl>
              ) : <p className="text-secondary mb-0">Esta reserva no incluye tour.</p>}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Hospedaje</div>
            <div className="card-body">
              {r.hospedaje ? (
                <dl className="row mb-0">
                  <dt className="col-5">Hospedaje</dt>
                  <dd className="col-7"><Link to={`/hospedajes/${r.hospedaje}`}>{r.hospedaje_nombre}</Link></dd>
                  <dt className="col-5">Fechas</dt><dd className="col-7">{fecha(r.fecha_entrada)} → {fecha(r.fecha_salida)}</dd>
                  <dt className="col-5">Noches</dt><dd className="col-7">{noches(r.fecha_entrada, r.fecha_salida)}</dd>
                  <dt className="col-5">Huéspedes</dt><dd className="col-7">{r.huespedes}</dd>
                </dl>
              ) : <p className="text-secondary mb-0">Esta reserva no incluye hospedaje.</p>}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Notas</div>
            <div className="card-body">{r.notas || <span className="text-secondary">Sin notas.</span>}</div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Reseña</div>
            <div className="card-body">
              {resena ? (
                <>
                  <div className="estrellas fs-5">{estrellas(resena.calificacion)}</div>
                  <p className="mb-2">{resena.comentario || 'Sin comentario.'}</p>
                  <Link to={`/resenas/${resena.id}/editar`} className="btn btn-sm btn-outline-secondary">Editar reseña</Link>
                </>
              ) : r.tiene_resena ? (
                resenas.cargando ? <Cargando /> : <span className="text-secondary">La reserva tiene reseña.</span>
              ) : r.estado === 'COMPLETADA' ? (
                <span className="text-secondary">Aún sin reseña. Use el botón “Reseñar”.</span>
              ) : (
                <span className="text-secondary">Se puede reseñar cuando la reserva esté completada.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
