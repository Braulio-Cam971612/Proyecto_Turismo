import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import AvisoPermiso from '../../components/AvisoPermiso';
import Campo, { claseControl } from '../../components/Campo';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { hospedajesApi, serviciosApi, usuariosApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useNotificar } from '../../context/NotificacionesContext';
import { useEnvioFormulario, useRegistro } from '../../hooks/useFormulario';
import { useOpciones } from '../../hooks/useOpciones';
import { puede } from '../../utils/permisos';

const INICIAL = {
  nombre: '', descripcion: '', ubicacion: '', anfitrion: '', precio_noche: '',
  capacidad_personas: '', num_habitaciones: 1, servicios: [], activo: true,
};

export default function HospedajeFormulario() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const esAdmin = puede.administrar(usuario);
  const navigate = useNavigate();
  const notificar = useNotificar();
  const { registro, cargando, error: errorCarga } = useRegistro(hospedajesApi.obtener, id);
  const { procesando, error, errores, enviar, validar } = useEnvioFormulario();
  const [formulario, setFormulario] = useState(INICIAL);
  const { opciones: servicios } = useOpciones(serviciosApi.listar);
  const { opciones: anfitriones, cargando: cargandoAnf } = useOpciones(esAdmin ? usuariosApi.listar : null, { rol: 'ANFITRION', is_active: 'true' });

  useEffect(() => {
    if (registro) {
      setFormulario({
        nombre: registro.nombre,
        descripcion: registro.descripcion ?? '',
        ubicacion: registro.ubicacion,
        anfitrion: registro.anfitrion,
        precio_noche: registro.precio_noche,
        capacidad_personas: registro.capacidad_personas,
        num_habitaciones: registro.num_habitaciones,
        servicios: registro.servicios ?? [],
        activo: registro.activo,
      });
    }
  }, [registro]);

  function manejarCambio(e) {
    const { name, value, type, checked } = e.target;
    setFormulario({ ...formulario, [name]: type === 'checkbox' ? checked : value });
  }

  function alternarServicio(sid) {
    setFormulario((f) => ({
      ...f,
      servicios: f.servicios.includes(sid) ? f.servicios.filter((x) => x !== sid) : [...f.servicios, sid],
    }));
  }

  async function guardar(e) {
    e.preventDefault();
    const n = {};
    if (!formulario.nombre.trim()) n.nombre = 'El nombre es obligatorio.';
    if (!formulario.ubicacion.trim()) n.ubicacion = 'La ubicación es obligatoria.';
    if (!(Number(formulario.precio_noche) > 0)) n.precio_noche = 'El precio por noche debe ser mayor que cero.';
    if (!(Number(formulario.capacidad_personas) >= 1)) n.capacidad_personas = 'Debe admitir al menos 1 persona.';
    if (!(Number(formulario.num_habitaciones) >= 1)) n.num_habitaciones = 'Debe tener al menos 1 habitación.';
    if (esAdmin && !formulario.anfitrion) n.anfitrion = 'Seleccione el anfitrión responsable.';
    if (!validar(n)) return;

    const datos = {
      ...formulario,
      nombre: formulario.nombre.trim(),
      ubicacion: formulario.ubicacion.trim(),
      capacidad_personas: Number(formulario.capacidad_personas),
      num_habitaciones: Number(formulario.num_habitaciones),
      anfitrion: esAdmin ? Number(formulario.anfitrion) : usuario.id,
    };
    const r = await enviar(() => (id ? hospedajesApi.modificar(id, datos) : hospedajesApi.crear(datos)));
    if (r.ok) {
      notificar(id ? 'Hospedaje actualizado.' : 'Hospedaje creado.');
      navigate(`/hospedajes/${r.resultado.id}`);
    }
  }

  if (cargando) return <Cargando />;
  if (errorCarga) return <AlertaError error={errorCarga} />;

  const sinPermiso = id ? !puede.editarHospedaje(usuario, registro) : !puede.crearHospedaje(usuario);
  const control = (nombre, props = {}) => (
    <input id={nombre} name={nombre} className={claseControl(errores[nombre])} value={formulario[nombre]} onChange={manejarCambio} {...props} />
  );

  return (
    <>
      <EncabezadoPagina titulo={id ? 'Editar hospedaje' : 'Nuevo hospedaje'} subtitulo="Los campos con * son obligatorios." />
      <AvisoPermiso visible={sinPermiso} />
      <AlertaError error={error} mostrarCampos />

      <form className="card shadow-sm" onSubmit={guardar} noValidate>
        <div className="card-body row">
          <div className="col-md-6">
            <Campo etiqueta="Nombre" id="nombre" error={errores.nombre} requerido>{control('nombre', { maxLength: 120, required: true })}</Campo>
          </div>
          <div className="col-md-6">
            <Campo etiqueta="Ubicación" id="ubicacion" error={errores.ubicacion} requerido>{control('ubicacion', { maxLength: 150, required: true })}</Campo>
          </div>
          <div className="col-12">
            <Campo etiqueta="Descripción" id="descripcion" error={errores.descripcion}>
              <textarea id="descripcion" name="descripcion" rows={3} className={claseControl(errores.descripcion)} value={formulario.descripcion} onChange={manejarCambio} />
            </Campo>
          </div>
          <div className="col-6 col-md-3">
            <Campo etiqueta="Precio por noche (₡)" id="precio_noche" error={errores.precio_noche} requerido>{control('precio_noche', { type: 'number', min: 1, step: '0.01', required: true })}</Campo>
          </div>
          <div className="col-6 col-md-3">
            <Campo etiqueta="Capacidad (personas)" id="capacidad_personas" error={errores.capacidad_personas} requerido>{control('capacidad_personas', { type: 'number', min: 1, step: 1, required: true })}</Campo>
          </div>
          <div className="col-6 col-md-3">
            <Campo etiqueta="Habitaciones" id="num_habitaciones" error={errores.num_habitaciones} requerido>{control('num_habitaciones', { type: 'number', min: 1, step: 1, required: true })}</Campo>
          </div>
          <div className="col-6 col-md-3">
            <Campo etiqueta="Anfitrión" id="anfitrion" error={errores.anfitrion} requerido={esAdmin}>
              {esAdmin ? (
                <select id="anfitrion" name="anfitrion" className={claseControl(errores.anfitrion, 'form-select')} value={formulario.anfitrion} onChange={manejarCambio} disabled={cargandoAnf}>
                  <option value="">{cargandoAnf ? 'Cargando...' : 'Seleccione...'}</option>
                  {anfitriones.map((a) => <option key={a.id} value={a.id}>{`${a.username}${a.first_name ? ` (${a.first_name})` : ''}`}</option>)}
                </select>
              ) : (
                <input className="form-control" value={registro?.anfitrion_username || usuario.username} disabled />
              )}
            </Campo>
          </div>
          <div className="col-12">
            <fieldset className="mb-3">
              <legend className="form-label fs-6">Servicios incluidos</legend>
              {servicios.length === 0 && <div className="small text-secondary">No hay servicios registrados.</div>}
              <div className="d-flex flex-wrap gap-3">
                {servicios.map((s) => (
                  <div key={s.id} className="form-check">
                    <input id={`serv-${s.id}`} type="checkbox" className="form-check-input" checked={formulario.servicios.includes(s.id)} onChange={() => alternarServicio(s.id)} />
                    <label htmlFor={`serv-${s.id}`} className="form-check-label">{s.nombre}</label>
                  </div>
                ))}
              </div>
              {errores.servicios && <div className="invalid-feedback d-block">{errores.servicios}</div>}
            </fieldset>
            <div className="form-check">
              <input id="activo" name="activo" type="checkbox" className="form-check-input" checked={formulario.activo} onChange={manejarCambio} />
              <label htmlFor="activo" className="form-check-label">Hospedaje activo (se puede reservar)</label>
            </div>
          </div>
        </div>
        <div className="card-footer bg-white d-flex gap-2">
          <button className="btn btn-primary" disabled={procesando}>{procesando ? 'Guardando...' : 'Guardar'}</button>
          <Link to={id ? `/hospedajes/${id}` : '/hospedajes'} className="btn btn-outline-secondary">Cancelar</Link>
        </div>
      </form>
    </>
  );
}
