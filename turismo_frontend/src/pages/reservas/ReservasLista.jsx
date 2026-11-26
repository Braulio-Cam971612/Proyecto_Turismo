import { Link } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import EstadoVacio from '../../components/EstadoVacio';
import { InsigniaEstado, InsigniaPago } from '../../components/Insignia';
import Paginacion from '../../components/Paginacion';
import TarjetaFiltros from '../../components/TarjetaFiltros';
import { experienciasApi, hospedajesApi, reservasApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useFiltros } from '../../hooks/useFiltros';
import { useListado } from '../../hooks/useListado';
import { useOpciones } from '../../hooks/useOpciones';
import { ESTADOS_PAGO, ESTADOS_RESERVA } from '../../utils/constantes';
import { colones, fecha, fechaHora } from '../../utils/formato';
import { puede } from '../../utils/permisos';
import AccionesReserva from './AccionesReserva';

const FILTROS = {
  estado: '', estado_pago: '', experiencia: '', hospedaje: '', total_min: '',
  ordering: '-fecha_creacion', page: 1, page_size: 10,
};

const DESCRIPCION_ROL = {
  ADMIN: 'Todas las reservas del sistema.',
  TURISTA: 'Sus reservas de tours y hospedajes.',
  GUIA: 'Reservas de las salidas de sus experiencias.',
  ANFITRION: 'Reservas de sus hospedajes.',
};

/** Modulo Reservas: el backend devuelve solo las reservas que el rol puede ver. */
export default function ReservasLista() {
  const { usuario } = useAuth();
  const { filtros, params, cambiar, irAPagina, limpiar } = useFiltros(FILTROS);
  const { resultados, pagina, totalPaginas, total, cargando, error, recargar } = useListado(reservasApi.listar, params);
  const { opciones: experiencias } = useOpciones(experienciasApi.listar);
  const { opciones: hospedajes } = useOpciones(hospedajesApi.listar);

  return (
    <>
      <EncabezadoPagina titulo="Reservas" subtitulo={DESCRIPCION_ROL[usuario.rol]}>
        {puede.crearReserva(usuario) && <Link to="/reservas/nueva" className="btn btn-primary">Nueva reserva</Link>}
      </EncabezadoPagina>

      <TarjetaFiltros onLimpiar={limpiar}>
        <div className="col-6 col-md-3 col-xl-2">
          <label className="form-label small" htmlFor="f-estado">Estado</label>
          <select id="f-estado" name="estado" className="form-select" value={filtros.estado} onChange={cambiar}>
            <option value="">Todos</option>
            {Object.entries(ESTADOS_RESERVA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-3 col-xl-2">
          <label className="form-label small" htmlFor="f-pago">Pago</label>
          <select id="f-pago" name="estado_pago" className="form-select" value={filtros.estado_pago} onChange={cambiar}>
            <option value="">Todos</option>
            {Object.entries(ESTADOS_PAGO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-3 col-xl-2">
          <label className="form-label small" htmlFor="f-exp">Experiencia</label>
          <select id="f-exp" name="experiencia" className="form-select" value={filtros.experiencia} onChange={cambiar}>
            <option value="">Todas</option>
            {experiencias.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-3 col-xl-2">
          <label className="form-label small" htmlFor="f-hosp">Hospedaje</label>
          <select id="f-hosp" name="hospedaje" className="form-select" value={filtros.hospedaje} onChange={cambiar}>
            <option value="">Todos</option>
            {hospedajes.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-3 col-xl-1">
          <label className="form-label small" htmlFor="f-tmin">Total mín.</label>
          <input id="f-tmin" name="total_min" type="number" min="0" className="form-control" value={filtros.total_min} onChange={cambiar} />
        </div>
        <div className="col-6 col-md-3 col-xl-2">
          <label className="form-label small" htmlFor="f-orden">Ordenar por</label>
          <select id="f-orden" name="ordering" className="form-select" value={filtros.ordering} onChange={cambiar}>
            <option value="-fecha_creacion">Más recientes</option>
            <option value="fecha_creacion">Más antiguas</option>
            <option value="-total">Total mayor</option>
            <option value="total">Total menor</option>
            <option value="fecha_entrada">Fecha de entrada</option>
          </select>
        </div>
      </TarjetaFiltros>

      <AlertaError error={error} onReintentar={recargar} />

      <div className="card shadow-sm">
        <div className="card-body">
          {cargando ? (
            <Cargando />
          ) : error ? null : resultados.length === 0 ? (
            <EstadoVacio texto="No hay reservas con estos filtros.">
              {puede.crearReserva(usuario) && <Link to="/reservas/nueva" className="btn btn-sm btn-primary">Crear una reserva</Link>}
            </EstadoVacio>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    {usuario.rol !== 'TURISTA' && <th>Turista</th>}
                    <th>Tour</th>
                    <th>Hospedaje</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r) => (
                    <tr key={r.id}>
                      <td><Link to={`/reservas/${r.id}`}>{r.id}</Link></td>
                      {usuario.rol !== 'TURISTA' && <td>{r.turista_username}</td>}
                      <td className="small">
                        {r.salida ? (
                          <>
                            {r.experiencia_nombre}
                            <div className="text-secondary">{fechaHora(r.salida_fecha_hora)} · {r.personas} pers.</div>
                          </>
                        ) : '—'}
                      </td>
                      <td className="small">
                        {r.hospedaje ? (
                          <>
                            {r.hospedaje_nombre}
                            <div className="text-secondary">{fecha(r.fecha_entrada)} → {fecha(r.fecha_salida)}</div>
                          </>
                        ) : '—'}
                      </td>
                      <td className="text-nowrap">{colones(r.total)}</td>
                      <td>
                        <div className="d-flex flex-column gap-1 align-items-start">
                          <InsigniaEstado estado={r.estado} />
                          <InsigniaPago estado={r.estado_pago} />
                        </div>
                      </td>
                      <td className="text-end">
                        <AccionesReserva reserva={r} onCambio={recargar} compacto />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Paginacion pagina={pagina} totalPaginas={totalPaginas} total={total} onCambiar={irAPagina} />
        </div>
      </div>
    </>
  );
}
