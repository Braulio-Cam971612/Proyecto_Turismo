import { useState } from 'react';
import AlertaError from '../../components/AlertaError';
import AvisoPermiso from '../../components/AvisoPermiso';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import EstadoVacio from '../../components/EstadoVacio';
import Paginacion from '../../components/Paginacion';
import { serviciosApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useConfirmar } from '../../context/ConfirmacionContext';
import { useNotificar } from '../../context/NotificacionesContext';
import { useEnvioFormulario } from '../../hooks/useFormulario';
import { useListado } from '../../hooks/useListado';
import { mensajeError } from '../../utils/errores';
import { puede } from '../../utils/permisos';

/** Catalogo de servicios de hospedaje (wifi, desayuno...). Solo ADMIN crea, edita o elimina. */
export default function Servicios() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const notificar = useNotificar();
  const [pagina, setPagina] = useState(1);
  const lista = useListado(serviciosApi.listar, { page: pagina, page_size: 10 });
  const { procesando, error, errores, enviar, validar } = useEnvioFormulario();
  const [nombre, setNombre] = useState('');
  const [editandoId, setEditandoId] = useState(null);

  function iniciarEdicion(s) {
    setEditandoId(s.id);
    setNombre(s.nombre);
  }

  function cancelar() {
    setEditandoId(null);
    setNombre('');
    validar({});
  }

  async function guardar(e) {
    e.preventDefault();
    if (!validar(nombre.trim() ? {} : { nombre: 'Escriba el nombre del servicio.' })) return;
    const datos = { nombre: nombre.trim() };
    const r = await enviar(() => (editandoId ? serviciosApi.modificar(editandoId, datos) : serviciosApi.crear(datos)));
    if (r.ok) {
      notificar(editandoId ? 'Servicio actualizado.' : 'Servicio creado.');
      cancelar();
      lista.recargar();
    }
  }

  async function eliminar(s) {
    if (!(await confirmar({ titulo: 'Eliminar servicio', mensaje: `¿Eliminar "${s.nombre}"? Se quitará de los hospedajes que lo tengan.` }))) return;
    try {
      await serviciosApi.eliminar(s.id);
      notificar('Servicio eliminado.');
      if (editandoId === s.id) cancelar();
      lista.recargar();
    } catch (err) {
      notificar(mensajeError(err), 'danger');
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Servicios de hospedaje" subtitulo="Catálogo usado en la relación N:M Hospedaje–Servicio." />
      <AvisoPermiso visible={!puede.administrar(usuario)} texto="Solo el administrador gestiona el catálogo de servicios." />
      <div className="row g-3">
        <div className="col-lg-4">
          <form className="card shadow-sm" onSubmit={guardar} noValidate>
            <div className="card-body">
              <h2 className="h6">{editandoId ? 'Editar servicio' : 'Nuevo servicio'}</h2>
              <AlertaError error={error} />
              <label htmlFor="nombre" className="form-label">Nombre <span className="text-danger">*</span></label>
              <input id="nombre" className={`form-control ${errores.nombre ? 'is-invalid' : ''}`} value={nombre} maxLength={60} onChange={(e) => setNombre(e.target.value)} />
              {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
            </div>
            <div className="card-footer bg-white d-flex gap-2">
              <button className="btn btn-primary" disabled={procesando}>{procesando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Agregar'}</button>
              {editandoId && <button type="button" className="btn btn-outline-secondary" onClick={cancelar}>Cancelar</button>}
            </div>
          </form>
        </div>
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <AlertaError error={lista.error} onReintentar={lista.recargar} />
              {lista.cargando ? (
                <Cargando />
              ) : lista.resultados.length === 0 ? (
                <EstadoVacio texto="Aún no hay servicios registrados." />
              ) : (
                <table className="table table-hover mb-0">
                  <thead><tr><th>Servicio</th><th className="text-end">Acciones</th></tr></thead>
                  <tbody>
                    {lista.resultados.map((s) => (
                      <tr key={s.id} className={editandoId === s.id ? 'table-active' : ''}>
                        <td>{s.nombre}</td>
                        <td className="text-end text-nowrap">
                          <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={() => iniciarEdicion(s)}>Editar</button>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => eliminar(s)}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <Paginacion pagina={lista.pagina} totalPaginas={lista.totalPaginas} total={lista.total} onCambiar={setPagina} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
