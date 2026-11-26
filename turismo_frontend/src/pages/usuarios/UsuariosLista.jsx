import { Link } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import EstadoVacio from '../../components/EstadoVacio';
import { InsigniaActivo } from '../../components/Insignia';
import Paginacion from '../../components/Paginacion';
import TarjetaFiltros from '../../components/TarjetaFiltros';
import { usuariosApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useConfirmar } from '../../context/ConfirmacionContext';
import { useNotificar } from '../../context/NotificacionesContext';
import { useFiltros } from '../../hooks/useFiltros';
import { useListado } from '../../hooks/useListado';
import { COLOR_ROL, ROLES } from '../../utils/constantes';
import { mensajeError } from '../../utils/errores';

const FILTROS = { search: '', rol: '', is_active: '', ordering: 'username', page: 1, page_size: 10 };

/** Modulo Usuarios: GET/POST /usuarios/, PATCH/DELETE /usuarios/:id/ (solo ADMIN; otro rol recibe 403). */
export default function UsuariosLista() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const notificar = useNotificar();
  const { filtros, params, cambiar, irAPagina, limpiar } = useFiltros(FILTROS);
  const { resultados, pagina, totalPaginas, total, cargando, error, recargar } = useListado(usuariosApi.listar, params);

  async function eliminar(u) {
    const ok = await confirmar({
      titulo: 'Eliminar usuario',
      mensaje: `¿Eliminar a "${u.username}"? Si tiene reservas, experiencias u hospedajes, el servidor lo impedirá (409).`,
    });
    if (!ok) return;
    try {
      await usuariosApi.eliminar(u.id);
      notificar('Usuario eliminado.');
      recargar();
    } catch (err) {
      notificar(mensajeError(err), 'danger');
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Usuarios" subtitulo="Cuentas del sistema y su perfil de acceso.">
        <Link to="/usuarios/nuevo" className="btn btn-primary">
          Nuevo usuario
        </Link>
      </EncabezadoPagina>

      <TarjetaFiltros onLimpiar={limpiar}>
        <div className="col-12 col-md-4">
          <label className="form-label small" htmlFor="f-search">Buscar</label>
          <input id="f-search" name="search" className="form-control" placeholder="Usuario, nombre o correo" value={filtros.search} onChange={cambiar} />
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label small" htmlFor="f-rol">Rol</label>
          <select id="f-rol" name="rol" className="form-select" value={filtros.rol} onChange={cambiar}>
            <option value="">Todos</option>
            {Object.entries(ROLES).map(([v, t]) => (
              <option key={v} value={v}>{t}</option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label small" htmlFor="f-activo">Estado</label>
          <select id="f-activo" name="is_active" className="form-select" value={filtros.is_active} onChange={cambiar}>
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
        <div className="col-12 col-md-2">
          <label className="form-label small" htmlFor="f-orden">Ordenar por</label>
          <select id="f-orden" name="ordering" className="form-select" value={filtros.ordering} onChange={cambiar}>
            <option value="username">Usuario (A-Z)</option>
            <option value="-username">Usuario (Z-A)</option>
            <option value="-date_joined">Más recientes</option>
            <option value="date_joined">Más antiguos</option>
          </select>
        </div>
      </TarjetaFiltros>

      <AlertaError error={error} onReintentar={recargar} />

      <div className="card shadow-sm">
        <div className="card-body">
          {cargando ? (
            <Cargando />
          ) : error ? null : resultados.length === 0 ? (
            <EstadoVacio texto="Ningún usuario coincide con los filtros." />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Nombre</th>
                    <th className="d-none d-md-table-cell">Correo</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((u) => (
                    <tr key={u.id}>
                      <td className="fw-semibold">{u.username}</td>
                      <td>{`${u.first_name} ${u.last_name}`.trim() || '—'}</td>
                      <td className="d-none d-md-table-cell">{u.email || '—'}</td>
                      <td>
                        <span className={`badge text-bg-${COLOR_ROL[u.rol] || 'secondary'}`}>{ROLES[u.rol] || 'Sin perfil'}</span>
                      </td>
                      <td><InsigniaActivo activo={u.is_active} /></td>
                      <td className="text-end text-nowrap">
                        <Link to={`/usuarios/${u.id}/editar`} className="btn btn-sm btn-outline-primary me-1">Editar</Link>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => eliminar(u)}
                          disabled={u.id === usuario.id}
                          title={u.id === usuario.id ? 'No puede eliminar su propio usuario' : undefined}
                        >
                          Eliminar
                        </button>
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
