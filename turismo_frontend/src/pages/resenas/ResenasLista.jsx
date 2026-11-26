import { Link } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import EstadoVacio from '../../components/EstadoVacio';
import Paginacion from '../../components/Paginacion';
import TarjetaFiltros from '../../components/TarjetaFiltros';
import { experienciasApi, hospedajesApi, resenasApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useConfirmar } from '../../context/ConfirmacionContext';
import { useNotificar } from '../../context/NotificacionesContext';
import { useFiltros } from '../../hooks/useFiltros';
import { useListado } from '../../hooks/useListado';
import { useOpciones } from '../../hooks/useOpciones';
import { mensajeError } from '../../utils/errores';
import { estrellas, fecha } from '../../utils/formato';
import { puede } from '../../utils/permisos';

const FILTROS = { experiencia: '', hospedaje: '', calificacion_min: '', ordering: '-fecha_creacion', page: 1, page_size: 8 };

/** Modulo Reseñas: calificaciones de reservas completadas (relacion 1:1 Reserva-Reseña). */
export default function ResenasLista() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const notificar = useNotificar();
  const { filtros, params, cambiar, irAPagina, limpiar } = useFiltros(FILTROS);
  const { resultados, pagina, totalPaginas, total, cargando, error, recargar } = useListado(resenasApi.listar, params);
  const { opciones: experiencias } = useOpciones(experienciasApi.listar);
  const { opciones: hospedajes } = useOpciones(hospedajesApi.listar);

  async function eliminar(r) {
    if (!(await confirmar({ titulo: 'Eliminar reseña', mensaje: `¿Eliminar la reseña de la reserva #${r.reserva}?` }))) return;
    try {
      await resenasApi.eliminar(r.id);
      notificar('Reseña eliminada.');
      recargar();
    } catch (err) {
      notificar(mensajeError(err), 'danger');
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Reseñas" subtitulo="Opiniones de turistas sobre reservas completadas.">
        <Link to="/metricas" className="btn btn-outline-primary">Métricas ambientales</Link>
        {puede.crearResena(usuario) && <Link to="/resenas/nueva" className="btn btn-primary">Nueva reseña</Link>}
      </EncabezadoPagina>

      <TarjetaFiltros onLimpiar={limpiar}>
        <div className="col-12 col-md-4">
          <label className="form-label small" htmlFor="f-exp">Experiencia</label>
          <select id="f-exp" name="experiencia" className="form-select" value={filtros.experiencia} onChange={cambiar}>
            <option value="">Todas</option>
            {experiencias.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
          </select>
        </div>
        <div className="col-12 col-md-3">
          <label className="form-label small" htmlFor="f-hosp">Hospedaje</label>
          <select id="f-hosp" name="hospedaje" className="form-select" value={filtros.hospedaje} onChange={cambiar}>
            <option value="">Todos</option>
            {hospedajes.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label small" htmlFor="f-cal">Calificación mínima</label>
          <select id="f-cal" name="calificacion_min" className="form-select" value={filtros.calificacion_min} onChange={cambiar}>
            <option value="">Cualquiera</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{`${n}+ ★`}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label small" htmlFor="f-orden">Ordenar por</label>
          <select id="f-orden" name="ordering" className="form-select" value={filtros.ordering} onChange={cambiar}>
            <option value="-fecha_creacion">Más recientes</option>
            <option value="fecha_creacion">Más antiguas</option>
            <option value="-calificacion">Mejor calificación</option>
            <option value="calificacion">Peor calificación</option>
          </select>
        </div>
      </TarjetaFiltros>

      <AlertaError error={error} onReintentar={recargar} />

      {cargando ? (
        <Cargando />
      ) : error ? null : resultados.length === 0 ? (
        <EstadoVacio texto="No hay reseñas con estos filtros." />
      ) : (
        <div className="row g-3">
          {resultados.map((r) => (
            <div key={r.id} className="col-md-6">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <span className="estrellas fs-5">{estrellas(r.calificacion)}</span>
                    <small className="text-secondary">{fecha(r.fecha_creacion)}</small>
                  </div>
                  <p className="my-2">{r.comentario || <span className="text-secondary">Sin comentario.</span>}</p>
                  <div className="small text-secondary">
                    {r.turista_username} · <Link to={`/reservas/${r.reserva}`}>Reserva #{r.reserva}</Link>
                    {r.experiencia && <> · <Link to={`/experiencias/${r.experiencia}`}>{r.experiencia_nombre}</Link></>}
                    {r.hospedaje && <> · <Link to={`/hospedajes/${r.hospedaje}`}>{r.hospedaje_nombre}</Link></>}
                  </div>
                </div>
                {puede.editarResena(usuario, r) && (
                  <div className="card-footer bg-white d-flex gap-1">
                    <Link to={`/resenas/${r.id}/editar`} className="btn btn-sm btn-outline-secondary">Editar</Link>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => eliminar(r)}>Eliminar</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Paginacion pagina={pagina} totalPaginas={totalPaginas} total={total} onCambiar={irAPagina} />
    </>
  );
}
