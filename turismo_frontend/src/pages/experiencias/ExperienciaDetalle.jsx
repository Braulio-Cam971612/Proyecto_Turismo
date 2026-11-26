import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import EstadoVacio from '../../components/EstadoVacio';
import { InsigniaActivo } from '../../components/Insignia';
import Paginacion from '../../components/Paginacion';
import { experienciasApi, metricasApi, resenasApi, salidasApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useConfirmar } from '../../context/ConfirmacionContext';
import { useNotificar } from '../../context/NotificacionesContext';
import { useRegistro } from '../../hooks/useFormulario';
import { useListado } from '../../hooks/useListado';
import { CATEGORIAS, TIPOS_METRICA } from '../../utils/constantes';
import { mensajeError } from '../../utils/errores';
import { colones, estrellas, fecha, fechaHora } from '../../utils/formato';
import { puede } from '../../utils/permisos';

/** Detalle de una experiencia con sus entidades relacionadas: salidas (1:N), metricas y reseñas. */
export default function ExperienciaDetalle() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const confirmar = useConfirmar();
  const notificar = useNotificar();
  const [soloFuturas, setSoloFuturas] = useState(true);
  const [paginaSalidas, setPaginaSalidas] = useState(1);

  const { registro: exp, cargando, error } = useRegistro(experienciasApi.obtener, id);
  const salidas = useListado(salidasApi.listar, { experiencia: id, futuras: soloFuturas ? 'true' : '', page: paginaSalidas, page_size: 6 });
  const metricas = useListado(metricasApi.listar, { experiencia: id, page_size: 5 });
  const resenas = useListado(resenasApi.listar, { experiencia: id, page_size: 5 });

  if (cargando) return <Cargando />;
  if (error) return <AlertaError error={error} />;
  if (!exp) return null;

  const gestiona = puede.editarExperiencia(usuario, exp);

  async function eliminarExperiencia() {
    if (!(await confirmar({ titulo: 'Eliminar experiencia', mensaje: `¿Eliminar "${exp.nombre}"?` }))) return;
    try {
      await experienciasApi.eliminar(exp.id);
      notificar('Experiencia eliminada.');
      navigate('/experiencias');
    } catch (err) {
      notificar(mensajeError(err), 'danger');
    }
  }

  async function eliminarSalida(s) {
    if (!(await confirmar({ titulo: 'Eliminar salida', mensaje: `¿Eliminar la salida del ${fechaHora(s.fecha_hora)}?` }))) return;
    try {
      await salidasApi.eliminar(s.id);
      notificar('Salida eliminada.');
      salidas.recargar();
    } catch (err) {
      notificar(mensajeError(err), 'danger');
    }
  }

  const esFutura = (s) => new Date(s.fecha_hora) > new Date();

  return (
    <>
      <EncabezadoPagina titulo={exp.nombre} subtitulo={`${CATEGORIAS[exp.categoria] || exp.categoria} · Guía: ${exp.guia_username}`}>
        <Link to="/experiencias" className="btn btn-outline-secondary">Volver</Link>
        {gestiona && (
          <>
            <Link to={`/experiencias/${exp.id}/editar`} className="btn btn-outline-primary">Editar</Link>
            <button type="button" className="btn btn-outline-danger" onClick={eliminarExperiencia}>Eliminar</button>
          </>
        )}
      </EncabezadoPagina>

      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <div className="mb-2"><InsigniaActivo activo={exp.activo} /></div>
              <p>{exp.descripcion || 'Sin descripción.'}</p>
              <dl className="row small mb-0">
                <dt className="col-6">Precio por persona</dt><dd className="col-6">{colones(exp.precio_persona)}</dd>
                <dt className="col-6">Capacidad máxima</dt><dd className="col-6">{exp.capacidad_maxima}</dd>
                <dt className="col-6">Duración</dt><dd className="col-6">{exp.duracion_horas} h</dd>
              </dl>
            </div>
          </div>

          <div className="card shadow-sm mb-3">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Métricas ambientales</span>
              {gestiona && <Link to={`/metricas/nueva?experiencia=${exp.id}`} className="btn btn-sm btn-outline-primary">Registrar</Link>}
            </div>
            <ul className="list-group list-group-flush small">
              {metricas.resultados.map((m) => (
                <li key={m.id} className="list-group-item d-flex justify-content-between">
                  <span>{TIPOS_METRICA[m.tipo] || m.tipo}<br /><span className="text-secondary">{fecha(m.fecha)}</span></span>
                  <strong>{Number(m.valor).toLocaleString('es-CR')}</strong>
                </li>
              ))}
              {!metricas.cargando && metricas.resultados.length === 0 && <li className="list-group-item text-secondary">Sin métricas registradas.</li>}
            </ul>
          </div>

          <div className="card shadow-sm">
            <div className="card-header bg-white fw-semibold">Reseñas recientes</div>
            <ul className="list-group list-group-flush small">
              {resenas.resultados.map((r) => (
                <li key={r.id} className="list-group-item">
                  <span className="estrellas">{estrellas(r.calificacion)}</span> · {r.turista_username}
                  <div className="text-secondary">{r.comentario || 'Sin comentario.'}</div>
                </li>
              ))}
              {!resenas.cargando && resenas.resultados.length === 0 && <li className="list-group-item text-secondary">Aún no hay reseñas.</li>}
            </ul>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header bg-white d-flex flex-wrap gap-2 justify-content-between align-items-center">
              <span className="fw-semibold">Salidas programadas</span>
              <div className="d-flex gap-2 align-items-center">
                <div className="form-check mb-0">
                  <input
                    id="solo-futuras"
                    type="checkbox"
                    className="form-check-input"
                    checked={soloFuturas}
                    onChange={(e) => { setSoloFuturas(e.target.checked); setPaginaSalidas(1); }}
                  />
                  <label htmlFor="solo-futuras" className="form-check-label small">Solo futuras</label>
                </div>
                {gestiona && <Link to={`/salidas/nueva?experiencia=${exp.id}`} className="btn btn-sm btn-primary">Nueva salida</Link>}
              </div>
            </div>
            <div className="card-body">
              <AlertaError error={salidas.error} onReintentar={salidas.recargar} />
              {salidas.cargando ? (
                <Cargando />
              ) : salidas.resultados.length === 0 ? (
                <EstadoVacio titulo="Sin salidas" texto="No hay salidas para mostrar con este filtro." />
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr><th>Fecha y hora</th><th>Cupos</th><th>Estado</th><th className="text-end">Acciones</th></tr>
                    </thead>
                    <tbody>
                      {salidas.resultados.map((s) => (
                        <tr key={s.id}>
                          <td>{fechaHora(s.fecha_hora)}{!esFutura(s) && <span className="badge text-bg-light border ms-2">Realizada</span>}</td>
                          <td>{s.cupos_disponibles} / {exp.capacidad_maxima}</td>
                          <td><InsigniaActivo activo={s.activo} /></td>
                          <td className="text-end text-nowrap">
                            {puede.crearReserva(usuario) && s.activo && exp.activo && esFutura(s) && s.cupos_disponibles > 0 && (
                              <Link to={`/reservas/nueva?salida=${s.id}`} className="btn btn-sm btn-primary me-1">Reservar</Link>
                            )}
                            {gestiona && (
                              <>
                                <Link to={`/salidas/${s.id}/editar`} className="btn btn-sm btn-outline-secondary me-1">Editar</Link>
                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => eliminarSalida(s)}>Eliminar</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Paginacion pagina={salidas.pagina} totalPaginas={salidas.totalPaginas} total={salidas.total} onCambiar={setPaginaSalidas} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
