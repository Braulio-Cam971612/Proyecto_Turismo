import { Link } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import EstadoVacio from '../../components/EstadoVacio';
import Paginacion from '../../components/Paginacion';
import TarjetaFiltros from '../../components/TarjetaFiltros';
import { experienciasApi, metricasApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useConfirmar } from '../../context/ConfirmacionContext';
import { useNotificar } from '../../context/NotificacionesContext';
import { useFiltros } from '../../hooks/useFiltros';
import { useListado } from '../../hooks/useListado';
import { useOpciones } from '../../hooks/useOpciones';
import { TIPOS_METRICA } from '../../utils/constantes';
import { mensajeError } from '../../utils/errores';
import { fecha } from '../../utils/formato';
import { puede } from '../../utils/permisos';

const FILTROS = { experiencia: '', tipo: '', page: 1, page_size: 10 };

/** Metricas de sostenibilidad por experiencia (GET/POST /metricas/, PATCH/DELETE /metricas/:id/). */
export default function MetricasLista() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const notificar = useNotificar();
  const { filtros, params, cambiar, irAPagina, limpiar } = useFiltros(FILTROS);
  const { resultados, pagina, totalPaginas, total, cargando, error, recargar } = useListado(metricasApi.listar, params);
  const { opciones: experiencias } = useOpciones(experienciasApi.listar);

  async function eliminar(m) {
    if (!(await confirmar({ titulo: 'Eliminar métrica', mensaje: `¿Eliminar la métrica "${TIPOS_METRICA[m.tipo]}" de ${m.experiencia_nombre}?` }))) return;
    try {
      await metricasApi.eliminar(m.id);
      notificar('Métrica eliminada.');
      recargar();
    } catch (err) {
      notificar(mensajeError(err), 'danger');
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Métricas ambientales" subtitulo="Impacto de sostenibilidad registrado por los guías.">
        {puede.crearMetrica(usuario) && <Link to="/metricas/nueva" className="btn btn-primary">Registrar métrica</Link>}
      </EncabezadoPagina>

      <TarjetaFiltros onLimpiar={limpiar}>
        <div className="col-12 col-md-5">
          <label className="form-label small" htmlFor="f-exp">Experiencia</label>
          <select id="f-exp" name="experiencia" className="form-select" value={filtros.experiencia} onChange={cambiar}>
            <option value="">Todas</option>
            {experiencias.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
          </select>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label small" htmlFor="f-tipo">Tipo</label>
          <select id="f-tipo" name="tipo" className="form-select" value={filtros.tipo} onChange={cambiar}>
            <option value="">Todos</option>
            {Object.entries(TIPOS_METRICA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>
      </TarjetaFiltros>

      <AlertaError error={error} onReintentar={recargar} />
      <div className="card shadow-sm">
        <div className="card-body">
          {cargando ? (
            <Cargando />
          ) : error ? null : resultados.length === 0 ? (
            <EstadoVacio texto="No hay métricas registradas con estos filtros." />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr><th>Fecha</th><th>Experiencia</th><th>Tipo</th><th className="text-end">Valor</th><th className="d-none d-md-table-cell">Notas</th><th className="text-end">Acciones</th></tr>
                </thead>
                <tbody>
                  {resultados.map((m) => (
                    <tr key={m.id}>
                      <td className="text-nowrap">{fecha(m.fecha)}</td>
                      <td><Link to={`/experiencias/${m.experiencia}`}>{m.experiencia_nombre}</Link></td>
                      <td>{TIPOS_METRICA[m.tipo] || m.tipo}</td>
                      <td className="text-end fw-semibold">{Number(m.valor).toLocaleString('es-CR')}</td>
                      <td className="d-none d-md-table-cell small">{m.notas || '—'}</td>
                      <td className="text-end text-nowrap">
                        {puede.editarMetrica(usuario, m) && (
                          <>
                            <Link to={`/metricas/${m.id}/editar`} className="btn btn-sm btn-outline-secondary me-1">Editar</Link>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => eliminar(m)}>Eliminar</button>
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
