import { Link, useNavigate, useParams } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { InsigniaActivo } from '../../components/Insignia';
import { hospedajesApi, resenasApi, serviciosApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useConfirmar } from '../../context/ConfirmacionContext';
import { useNotificar } from '../../context/NotificacionesContext';
import { useRegistro } from '../../hooks/useFormulario';
import { useListado } from '../../hooks/useListado';
import { useOpciones } from '../../hooks/useOpciones';
import { mensajeError } from '../../utils/errores';
import { colones, estrellas, fecha } from '../../utils/formato';
import { puede } from '../../utils/permisos';

/** Detalle de hospedaje con sus servicios (N:M) y las reseñas de sus reservas. */
export default function HospedajeDetalle() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const confirmar = useConfirmar();
  const notificar = useNotificar();
  const { registro: h, cargando, error } = useRegistro(hospedajesApi.obtener, id);
  const { opciones: servicios } = useOpciones(serviciosApi.listar);
  const resenas = useListado(resenasApi.listar, { hospedaje: id, page_size: 10 });

  if (cargando) return <Cargando />;
  if (error) return <AlertaError error={error} />;
  if (!h) return null;

  async function eliminar() {
    if (!(await confirmar({ titulo: 'Eliminar hospedaje', mensaje: `¿Eliminar "${h.nombre}"?` }))) return;
    try {
      await hospedajesApi.eliminar(h.id);
      notificar('Hospedaje eliminado.');
      navigate('/hospedajes');
    } catch (err) {
      notificar(mensajeError(err), 'danger');
    }
  }

  const nombres = h.servicios.map((sid) => servicios.find((s) => s.id === sid)?.nombre).filter(Boolean);

  return (
    <>
      <EncabezadoPagina titulo={h.nombre} subtitulo={`${h.ubicacion} · Anfitrión: ${h.anfitrion_username}`}>
        <Link to="/hospedajes" className="btn btn-outline-secondary">Volver</Link>
        {puede.crearReserva(usuario) && h.activo && (
          <Link to={`/reservas/nueva?hospedaje=${h.id}`} className="btn btn-primary">Reservar</Link>
        )}
        {puede.editarHospedaje(usuario, h) && (
          <>
            <Link to={`/hospedajes/${h.id}/editar`} className="btn btn-outline-primary">Editar</Link>
            <button type="button" className="btn btn-outline-danger" onClick={eliminar}>Eliminar</button>
          </>
        )}
      </EncabezadoPagina>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="mb-2"><InsigniaActivo activo={h.activo} /></div>
              <p>{h.descripcion || 'Sin descripción.'}</p>
              <dl className="row small">
                <dt className="col-6">Precio por noche</dt><dd className="col-6">{colones(h.precio_noche)}</dd>
                <dt className="col-6">Capacidad</dt><dd className="col-6">{h.capacidad_personas} personas</dd>
                <dt className="col-6">Habitaciones</dt><dd className="col-6">{h.num_habitaciones}</dd>
              </dl>
              <h2 className="h6">Servicios</h2>
              <div className="d-flex flex-wrap gap-1">
                {nombres.length ? nombres.map((n) => <span key={n} className="badge text-bg-light border">{n}</span>) : <span className="small text-secondary">Sin servicios.</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="card shadow-sm">
            <div className="card-header bg-white fw-semibold">Reseñas de huéspedes</div>
            <ul className="list-group list-group-flush">
              {resenas.cargando && <li className="list-group-item"><Cargando /></li>}
              {resenas.resultados.map((r) => (
                <li key={r.id} className="list-group-item">
                  <span className="estrellas">{estrellas(r.calificacion)}</span>
                  <span className="small text-secondary ms-2">{r.turista_username} · {fecha(r.fecha_creacion)}</span>
                  <div>{r.comentario || 'Sin comentario.'}</div>
                </li>
              ))}
              {!resenas.cargando && resenas.resultados.length === 0 && <li className="list-group-item text-secondary">Este hospedaje aún no tiene reseñas.</li>}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
