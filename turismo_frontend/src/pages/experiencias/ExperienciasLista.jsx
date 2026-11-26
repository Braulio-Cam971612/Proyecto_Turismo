import { Link } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import EstadoVacio from '../../components/EstadoVacio';
import { InsigniaActivo } from '../../components/Insignia';
import Paginacion from '../../components/Paginacion';
import TarjetaFiltros from '../../components/TarjetaFiltros';
import { experienciasApi, usuariosApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useConfirmar } from '../../context/ConfirmacionContext';
import { useNotificar } from '../../context/NotificacionesContext';
import { useFiltros } from '../../hooks/useFiltros';
import { useListado } from '../../hooks/useListado';
import { useOpciones } from '../../hooks/useOpciones';
import { CATEGORIAS } from '../../utils/constantes';
import { mensajeError } from '../../utils/errores';
import { colones } from '../../utils/formato';
import { puede } from '../../utils/permisos';

const FILTROS = {
  search: '', categoria: '', activo: '', precio_min: '', precio_max: '', guia: '',
  ordering: 'nombre', page: 1, page_size: 9,
};

/** Modulo Experiencias: busqueda, filtros combinables, ordenamiento y paginacion del backend. */
export default function ExperienciasLista() {
  const { usuario } = useAuth();
  const esAdmin = puede.administrar(usuario);
  const confirmar = useConfirmar();
  const notificar = useNotificar();
  const { filtros, params, cambiar, irAPagina, limpiar } = useFiltros(FILTROS);
  const { resultados, pagina, totalPaginas, total, cargando, error, recargar } = useListado(experienciasApi.listar, params);
  // El listado de guias solo lo puede consultar el administrador (GET /usuarios/?rol=GUIA)
  const { opciones: guias } = useOpciones(esAdmin ? usuariosApi.listar : null, { rol: 'GUIA' });

  async function eliminar(exp) {
    const ok = await confirmar({
      titulo: 'Eliminar experiencia',
      mensaje: `¿Eliminar "${exp.nombre}" y sus salidas? Si tiene reservas, el servidor lo impedirá (409).`,
    });
    if (!ok) return;
    try {
      await experienciasApi.eliminar(exp.id);
      notificar('Experiencia eliminada.');
      recargar();
    } catch (err) {
      notificar(mensajeError(err), 'danger');
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Experiencias" subtitulo="Tours y actividades ofrecidas por guías locales.">
        {puede.crearExperiencia(usuario) && (
          <Link to="/experiencias/nueva" className="btn btn-primary">Nueva experiencia</Link>
        )}
      </EncabezadoPagina>

      <TarjetaFiltros onLimpiar={limpiar}>
        <div className="col-12 col-md-4 col-xl-3">
          <label className="form-label small" htmlFor="f-search">Buscar</label>
          <input id="f-search" name="search" className="form-control" placeholder="Nombre o descripción" value={filtros.search} onChange={cambiar} />
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <label className="form-label small" htmlFor="f-cat">Categoría</label>
          <select id="f-cat" name="categoria" className="form-select" value={filtros.categoria} onChange={cambiar}>
            <option value="">Todas</option>
            {Object.entries(CATEGORIAS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <label className="form-label small" htmlFor="f-activo">Estado</label>
          <select id="f-activo" name="activo" className="form-select" value={filtros.activo} onChange={cambiar}>
            <option value="">Todas</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
        </div>
        <div className="col-6 col-md-3 col-xl-1">
          <label className="form-label small" htmlFor="f-pmin">Precio mín.</label>
          <input id="f-pmin" name="precio_min" type="number" min="0" className="form-control" value={filtros.precio_min} onChange={cambiar} />
        </div>
        <div className="col-6 col-md-3 col-xl-1">
          <label className="form-label small" htmlFor="f-pmax">Precio máx.</label>
          <input id="f-pmax" name="precio_max" type="number" min="0" className="form-control" value={filtros.precio_max} onChange={cambiar} />
        </div>
        {esAdmin && (
          <div className="col-6 col-md-3 col-xl-2">
            <label className="form-label small" htmlFor="f-guia">Guía</label>
            <select id="f-guia" name="guia" className="form-select" value={filtros.guia} onChange={cambiar}>
              <option value="">Todos</option>
              {guias.map((g) => <option key={g.id} value={g.id}>{g.username}</option>)}
            </select>
          </div>
        )}
        {usuario.rol === 'GUIA' && (
          <div className="col-6 col-md-3 col-xl-2">
            <div className="form-check mb-2">
              <input
                id="f-mias"
                type="checkbox"
                className="form-check-input"
                checked={String(filtros.guia) === String(usuario.id)}
                onChange={(e) => cambiar({ target: { name: 'guia', value: e.target.checked ? String(usuario.id) : '' } })}
              />
              <label className="form-check-label" htmlFor="f-mias">Solo mis experiencias</label>
            </div>
          </div>
        )}
        <div className="col-6 col-md-3 col-xl-2">
          <label className="form-label small" htmlFor="f-orden">Ordenar por</label>
          <select id="f-orden" name="ordering" className="form-select" value={filtros.ordering} onChange={cambiar}>
            <option value="nombre">Nombre (A-Z)</option>
            <option value="-nombre">Nombre (Z-A)</option>
            <option value="precio_persona">Precio menor</option>
            <option value="-precio_persona">Precio mayor</option>
            <option value="-capacidad_maxima">Mayor capacidad</option>
          </select>
        </div>
      </TarjetaFiltros>

      <AlertaError error={error} onReintentar={recargar} />

      {cargando ? (
        <Cargando />
      ) : error ? null : resultados.length === 0 ? (
        <EstadoVacio texto="No hay experiencias que coincidan con la búsqueda." />
      ) : (
        <div className="row g-3">
          {resultados.map((exp) => (
            <div key={exp.id} className="col-12 col-md-6 col-xl-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between gap-2 mb-2">
                    <span className="badge text-bg-light border">{CATEGORIAS[exp.categoria] || exp.categoria}</span>
                    <InsigniaActivo activo={exp.activo} />
                  </div>
                  <h2 className="h5">
                    <Link to={`/experiencias/${exp.id}`} className="text-decoration-none">{exp.nombre}</Link>
                  </h2>
                  <p className="small text-secondary mb-2">{exp.descripcion || 'Sin descripción.'}</p>
                  <ul className="list-unstyled small mb-0">
                    <li><strong>{colones(exp.precio_persona)}</strong> por persona</li>
                    <li>Capacidad: {exp.capacidad_maxima} personas · {exp.duracion_horas} h</li>
                    <li>Guía: {exp.guia_username}</li>
                  </ul>
                </div>
                <div className="card-footer bg-white d-flex flex-wrap gap-1">
                  <Link to={`/experiencias/${exp.id}`} className="btn btn-sm btn-outline-primary">Ver salidas</Link>
                  {puede.editarExperiencia(usuario, exp) && (
                    <>
                      <Link to={`/experiencias/${exp.id}/editar`} className="btn btn-sm btn-outline-secondary">Editar</Link>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => eliminar(exp)}>Eliminar</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Paginacion pagina={pagina} totalPaginas={totalPaginas} total={total} onCambiar={irAPagina} />
    </>
  );
}
