import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import AvisoPermiso from '../../components/AvisoPermiso';
import Campo, { claseControl } from '../../components/Campo';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { experienciasApi, usuariosApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useNotificar } from '../../context/NotificacionesContext';
import { useEnvioFormulario, useRegistro } from '../../hooks/useFormulario';
import { useOpciones } from '../../hooks/useOpciones';
import { CATEGORIAS } from '../../utils/constantes';
import { puede } from '../../utils/permisos';

const INICIAL = {
  nombre: '', descripcion: '', categoria: 'CAMINATA', precio_persona: '',
  capacidad_maxima: '', duracion_horas: 2, guia: '', activo: true,
};

export default function ExperienciaFormulario() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const esAdmin = puede.administrar(usuario);
  const navigate = useNavigate();
  const notificar = useNotificar();
  const { registro, cargando, error: errorCarga } = useRegistro(experienciasApi.obtener, id);
  const { procesando, error, errores, enviar, validar } = useEnvioFormulario();
  const [formulario, setFormulario] = useState(INICIAL);
  // Selector de la entidad relacionada (guia) consultado desde la API; solo el admin lo elige.
  const { opciones: guias, cargando: cargandoGuias } = useOpciones(esAdmin ? usuariosApi.listar : null, { rol: 'GUIA', is_active: 'true' });

  useEffect(() => {
    if (registro) {
      setFormulario({
        nombre: registro.nombre,
        descripcion: registro.descripcion ?? '',
        categoria: registro.categoria,
        precio_persona: registro.precio_persona,
        capacidad_maxima: registro.capacidad_maxima,
        duracion_horas: registro.duracion_horas,
        guia: registro.guia,
        activo: registro.activo,
      });
    }
  }, [registro]);

  function manejarCambio(e) {
    const { name, value, type, checked } = e.target;
    setFormulario({ ...formulario, [name]: type === 'checkbox' ? checked : value });
  }

  async function guardar(e) {
    e.preventDefault();
    const n = {};
    if (!formulario.nombre.trim()) n.nombre = 'El nombre es obligatorio.';
    if (!(Number(formulario.precio_persona) > 0)) n.precio_persona = 'El precio debe ser mayor que cero.';
    if (!(Number(formulario.capacidad_maxima) >= 1)) n.capacidad_maxima = 'La capacidad mínima es 1.';
    if (!(Number(formulario.duracion_horas) >= 1)) n.duracion_horas = 'La duración mínima es 1 hora.';
    if (esAdmin && !formulario.guia) n.guia = 'Seleccione el guía responsable.';
    if (!validar(n)) return;

    const datos = {
      ...formulario,
      nombre: formulario.nombre.trim(),
      capacidad_maxima: Number(formulario.capacidad_maxima),
      duracion_horas: Number(formulario.duracion_horas),
      guia: esAdmin ? Number(formulario.guia) : usuario.id, // el backend fuerza el guia si el rol es GUIA
    };
    const r = await enviar(() => (id ? experienciasApi.modificar(id, datos) : experienciasApi.crear(datos)));
    if (r.ok) {
      notificar(id ? 'Experiencia actualizada.' : 'Experiencia creada.');
      navigate(`/experiencias/${r.resultado.id}`);
    }
  }

  if (cargando) return <Cargando />;
  if (errorCarga) return <AlertaError error={errorCarga} />;

  const sinPermiso = id ? !puede.editarExperiencia(usuario, registro) : !puede.crearExperiencia(usuario);

  return (
    <>
      <EncabezadoPagina titulo={id ? 'Editar experiencia' : 'Nueva experiencia'} subtitulo="Los campos con * son obligatorios." />
      <AvisoPermiso visible={sinPermiso} />
      <AlertaError error={error} mostrarCampos />

      <form className="card shadow-sm" onSubmit={guardar} noValidate>
        <div className="card-body row">
          <div className="col-md-8">
            <Campo etiqueta="Nombre" id="nombre" error={errores.nombre} requerido>
              <input id="nombre" name="nombre" className={claseControl(errores.nombre)} value={formulario.nombre} onChange={manejarCambio} maxLength={120} required />
            </Campo>
          </div>
          <div className="col-md-4">
            <Campo etiqueta="Categoría" id="categoria" error={errores.categoria} requerido>
              <select id="categoria" name="categoria" className={claseControl(errores.categoria, 'form-select')} value={formulario.categoria} onChange={manejarCambio}>
                {Object.entries(CATEGORIAS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </Campo>
          </div>
          <div className="col-12">
            <Campo etiqueta="Descripción" id="descripcion" error={errores.descripcion}>
              <textarea id="descripcion" name="descripcion" rows={3} className={claseControl(errores.descripcion)} value={formulario.descripcion} onChange={manejarCambio} />
            </Campo>
          </div>
          <div className="col-6 col-md-3">
            <Campo etiqueta="Precio por persona (₡)" id="precio_persona" error={errores.precio_persona} requerido>
              <input id="precio_persona" name="precio_persona" type="number" min="1" step="0.01" className={claseControl(errores.precio_persona)} value={formulario.precio_persona} onChange={manejarCambio} required />
            </Campo>
          </div>
          <div className="col-6 col-md-3">
            <Campo etiqueta="Capacidad máxima" id="capacidad_maxima" error={errores.capacidad_maxima} requerido>
              <input id="capacidad_maxima" name="capacidad_maxima" type="number" min="1" step="1" className={claseControl(errores.capacidad_maxima)} value={formulario.capacidad_maxima} onChange={manejarCambio} required />
            </Campo>
          </div>
          <div className="col-6 col-md-3">
            <Campo etiqueta="Duración (horas)" id="duracion_horas" error={errores.duracion_horas} requerido>
              <input id="duracion_horas" name="duracion_horas" type="number" min="1" step="1" className={claseControl(errores.duracion_horas)} value={formulario.duracion_horas} onChange={manejarCambio} required />
            </Campo>
          </div>
          <div className="col-6 col-md-3">
            <Campo etiqueta="Guía responsable" id="guia" error={errores.guia} requerido={esAdmin}>
              {esAdmin ? (
                <select id="guia" name="guia" className={claseControl(errores.guia, 'form-select')} value={formulario.guia} onChange={manejarCambio} disabled={cargandoGuias}>
                  <option value="">{cargandoGuias ? 'Cargando...' : 'Seleccione...'}</option>
                  {guias.map((g) => (
                    <option key={g.id} value={g.id}>{`${g.username}${g.first_name ? ` (${g.first_name})` : ''}`}</option>
                  ))}
                </select>
              ) : (
                <input className="form-control" value={registro?.guia_username || usuario.username} disabled />
              )}
            </Campo>
          </div>
          <div className="col-12">
            <div className="form-check mb-2">
              <input id="activo" name="activo" type="checkbox" className="form-check-input" checked={formulario.activo} onChange={manejarCambio} />
              <label htmlFor="activo" className="form-check-label">Experiencia activa (se puede reservar)</label>
            </div>
          </div>
        </div>
        <div className="card-footer bg-white d-flex gap-2">
          <button className="btn btn-primary" disabled={procesando}>{procesando ? 'Guardando...' : 'Guardar'}</button>
          <Link to={id ? `/experiencias/${id}` : '/experiencias'} className="btn btn-outline-secondary">Cancelar</Link>
        </div>
      </form>
    </>
  );
}
