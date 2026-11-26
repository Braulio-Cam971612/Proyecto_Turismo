import { Link } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import EstadoVacio from '../../components/EstadoVacio';
import { InsigniaActivo } from '../../components/Insignia';
import Paginacion from '../../components/Paginacion';
import TarjetaFiltros from '../../components/TarjetaFiltros';
import { hospedajesApi, serviciosApi, usuariosApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useConfirmar } from '../../context/ConfirmacionContext';
import { useNotificar } from '../../context/NotificacionesContext';
import { useFiltros } from '../../hooks/useFiltros';
import { useListado } from '../../hooks/useListado';
import { useOpciones } from '../../hooks/useOpciones';
import { mensajeError } from '../../utils/errores';
import { colones } from '../../utils/formato';
import { puede } from '../../utils/permisos';

const FILTROS = {
  search: '', ubicacion: '', capacidad_min: '', precio_max: '', servicio: '', activo: '', anfitrion: '',
  ordering: 'nombre', page: 1, page_size: 10,
};

/** Modulo Hospedajes: filtros combinables (ubicacion, capacidad, precio, servicio, estado) y orden. */
export default function HospedajesLista() {
  const { usuario } = useAuth();
  const esAdmin = puede.administrar(usuario);
  const confirmar = useConfirmar();
  const notificar = useNotificar();
  const { filtros, params, cambiar, irAPagina, limpiar } = useFiltros(FILTROS);
  const { resultados, pagina, totalPaginas, total, cargando, error, recargar } = useListado(hospedajesApi.listar, params);
  const { opciones: servicios } = useOpciones(serviciosApi.listar);
  const { opciones: anfitriones } = useOpciones(esAdmin ? usuariosApi.listar : null, { rol: 'ANFITRION' });
  const nombreServicio = (sid) => servicios.find((s) => s.id === sid)?.nombre || `#${sid}`;

  async function eliminar(h) {
    const ok = await confirmar({
      titulo: 'Eliminar hospedaje',
      mensaje: `¿Eliminar "${h.nombre}"? Si tiene reservas, el servidor lo impedirá (409).`,
    });
    if (!ok) return;
    try {
      await hospedajesApi.eliminar(h.id);
      notificar('Hospedaje eliminado.');
      recargar();
    } catch (err) {
      notificar(mensajeError(err), 'danger');
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Hospedajes" subtitulo="Alojamientos rurales administrados por anfitriones de la comunidad.">
        <Link to="/hospedajes/disponibles" className="btn btn-outline-primary">Buscar por fechas</Link>
        {puede.crearHospedaje(usuario) && <Link to="/hospedajes/nuevo" className="btn btn-primary">Nuevo hospedaje</Link>}
      </EncabezadoPagina>

      <TarjetaFiltros onLimpiar={limpiar}>
        <div className="col-12 col-md-4 col-xl-3">
          <label className="form-label small" htmlFor="f-search">Buscar</label>
          <input id="f-search" name="search" className="form-control" placeholder="Nombre, ubicación o descripción" value={filtros.search} onChange={cambiar} />
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <label className="form-label small" htmlFor="f-ubic">Ubicación</label>
          <input id="f-ubic" name="ubicacion" className="form-control" value={filtros.ubicacion} onChange={cambiar} />
        </div>
        <div className="col-6 col-md-2 col-xl-1">
          <label className="form-label small" htmlFor="f-cap">Personas</label>
          <input id="f-cap" name="capacidad_min" type="number" min="1" className="form-control" value={filtros.capacidad_min} onChange={cambiar} />
        </div>
        <div className="col-6 col-md-2 col-xl-2">
          <label className="form-label small" htmlFor="f-pmax">Precio/noche máx.</label>
          <input id="f-pmax" name="precio_max" type="number" min="0" className="form-control" value={filtros.precio_max} onChange={cambiar} />
        </div>
        <div className="col-6 col-md-3 col-xl-2">
          <label className="form-label small" htmlFor="f-serv">Servicio</label>
          <select id="f-serv" name="servicio" className="form-select" value={filtros.servicio} onChange={cambiar}>
            <option value="">Cualquiera</option>
            {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-3 col-xl-2">
          <label className="form-label small" htmlFor="f-activo">Estado</label>
          <select id="f-activo" name="activo" className="form-select" value={filtros.activo} onChange={cambiar}>
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
        {esAdmin && (
          <div className="col-6 col-md-3 col-xl-2">
            <label className="form-label small" htmlFor="f-anf">Anfitrión</label>
            <select id="f-anf" name="anfitrion" className="form-select" value={filtros.anfitrion} onChange={cambiar}>
              <option value="">Todos</option>
              {anfitriones.map((a) => <option key={a.id} value={a.id}>{a.username}</option>)}
            </select>
          </div>
        )}
        {usuario.rol === 'ANFITRION' && (
          <div className="col-6 col-md-3 col-xl-2">
            <div className="form-check mb-2">
              <input
                id="f-mios"
                type="checkbox"
                className="form-check-input"
                checked={String(filtros.anfitrion) === String(usuario.id)}
                onChange={(e) => cambiar({ target: { name: 'anfitrion', value: e.target.checked ? String(usuario.id) : '' } })}
              />
              <label className="form-check-label" htmlFor="f-mios">Solo mis hospedajes</label>
            </div>
          </div>
        )}
        <div className="col-6 col-md-3 col-xl-2">
          <label className="form-label small" htmlFor="f-orden">Ordenar por</label>
          <select id="f-orden" name="ordering" className="form-select" value={filtros.ordering} onChange={cambiar}>
            <option value="nombre">Nombre (A-Z)</option>
            <option value="-nombre">Nombre (Z-A)</option>
            <option value="precio_noche">Precio menor</option>
            <option value="-precio_noche">Precio mayor</option>
            <option value="-capacidad_personas">Mayor capacidad</option>
          </select>
        </div>
      </TarjetaFiltros>

      <AlertaError error={error} onReintentar={recargar} />

      <div className="card shadow-sm">
        <div className="card-body">
          {cargando ? (
            <Cargando />
          ) : error ? null : resultados.length === 0 ? (
            <EstadoVacio texto="No hay hospedajes que coincidan con los filtros." />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Hospedaje</th>
                    <th className="d-none d-md-table-cell">Anfitrión</th>
                    <th>Precio/noche</th>
                    <th className="d-none d-sm-table-cell">Capacidad</th>
                    <th className="d-none d-lg-table-cell">Servicios</th>
                    <th>Estado</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <Link to={`/hospedajes/${h.id}`} className="fw-semibold text-decoration-none">{h.nombre}</Link>
                        <div className="small text-secondary">{h.ubicacion}</div>
                      </td>
                      <td className="d-none d-md-table-cell">{h.anfitrion_username}</td>
                      <td>{colones(h.precio_noche)}</td>
                      <td className="d-none d-sm-table-cell">{h.capacidad_personas} pers. · {h.num_habitaciones} hab.</td>
                      <td className="d-none d-lg-table-cell small">{h.servicios.map(nombreServicio).join(', ') || '—'}</td>
                      <td><InsigniaActivo activo={h.activo} /></td>
                      <td className="text-end text-nowrap">
                        <Link to={`/hospedajes/${h.id}`} className="btn btn-sm btn-outline-primary me-1">Ver</Link>
                        {puede.editarHospedaje(usuario, h) && (
                          <>
                            <Link to={`/hospedajes/${h.id}/editar`} className="btn btn-sm btn-outline-secondary me-1">Editar</Link>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => eliminar(h)}>Eliminar</button>
                          </>
                        )}
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
