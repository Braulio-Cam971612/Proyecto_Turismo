import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import AvisoPermiso from '../../components/AvisoPermiso';
import Campo, { claseControl } from '../../components/Campo';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { usuariosApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useNotificar } from '../../context/NotificacionesContext';
import { useEnvioFormulario, useRegistro } from '../../hooks/useFormulario';
import { ROLES } from '../../utils/constantes';
import { puede } from '../../utils/permisos';

const INICIAL = {
  username: '', email: '', first_name: '', last_name: '', password: '',
  rol: 'TURISTA', telefono: '', pais: '', is_active: true,
};

export default function UsuarioFormulario() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const notificar = useNotificar();
  const { registro, cargando, error: errorCarga } = useRegistro(usuariosApi.obtener, id);
  const { procesando, error, errores, enviar, validar } = useEnvioFormulario();
  const [formulario, setFormulario] = useState(INICIAL);
  const esPropio = Number(id) === usuario.id;

  useEffect(() => {
    if (registro) {
      setFormulario({
        username: registro.username ?? '',
        email: registro.email ?? '',
        first_name: registro.first_name ?? '',
        last_name: registro.last_name ?? '',
        password: '',
        rol: registro.rol ?? 'TURISTA',
        telefono: registro.telefono ?? '',
        pais: registro.pais ?? '',
        is_active: registro.is_active ?? true,
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
    if (!formulario.username.trim()) n.username = 'El usuario es obligatorio.';
    if (formulario.email && !/^\S+@\S+\.\S+$/.test(formulario.email)) n.email = 'Correo inválido.';
    if (!id && formulario.password.length < 8) n.password = 'La contraseña debe tener al menos 8 caracteres.';
    if (id && formulario.password && formulario.password.length < 8) n.password = 'Mínimo 8 caracteres.';
    if (!validar(n)) return;

    const datos = { ...formulario, username: formulario.username.trim() };
    if (!datos.password) delete datos.password; // al editar, vacia = no cambiar
    const r = await enviar(() => (id ? usuariosApi.modificar(id, datos) : usuariosApi.crear(datos)));
    if (r.ok) {
      notificar(id ? 'Usuario actualizado.' : 'Usuario creado.');
      navigate('/usuarios');
    }
  }

  if (cargando) return <Cargando />;
  if (errorCarga) return <AlertaError error={errorCarga} />;

  const control = (nombre, props = {}) => (
    <input id={nombre} name={nombre} className={claseControl(errores[nombre])} value={formulario[nombre]} onChange={manejarCambio} {...props} />
  );

  return (
    <>
      <EncabezadoPagina titulo={id ? `Editar usuario ${registro?.username ?? ''}` : 'Nuevo usuario'} subtitulo="Solo el administrador gestiona cuentas y roles." />
      <AvisoPermiso visible={!puede.administrar(usuario)} />
      <AlertaError error={error} mostrarCampos />

      <form className="card shadow-sm" onSubmit={guardar} noValidate>
        <div className="card-body row">
          <div className="col-md-6">
            <Campo etiqueta="Usuario" id="username" error={errores.username} requerido>{control('username', { maxLength: 150, required: true })}</Campo>
          </div>
          <div className="col-md-6">
            <Campo etiqueta="Correo" id="email" error={errores.email}>{control('email', { type: 'email' })}</Campo>
          </div>
          <div className="col-md-6">
            <Campo etiqueta="Nombre" id="first_name" error={errores.first_name}>{control('first_name', { maxLength: 150 })}</Campo>
          </div>
          <div className="col-md-6">
            <Campo etiqueta="Apellidos" id="last_name" error={errores.last_name}>{control('last_name', { maxLength: 150 })}</Campo>
          </div>
          <div className="col-md-6">
            <Campo
              etiqueta="Contraseña"
              id="password"
              error={errores.password}
              requerido={!id}
              ayuda={id ? 'Déjela vacía para conservar la contraseña actual.' : 'Mínimo 8 caracteres.'}
            >
              {control('password', { type: 'password', autoComplete: 'new-password' })}
            </Campo>
          </div>
          <div className="col-md-6">
            <Campo etiqueta="Rol" id="rol" error={errores.rol} requerido ayuda={esPropio ? 'No puede quitarse el rol de administrador.' : undefined}>
              <select id="rol" name="rol" className={claseControl(errores.rol, 'form-select')} value={formulario.rol} onChange={manejarCambio}>
                {Object.entries(ROLES).map(([v, t]) => (
                  <option key={v} value={v}>{t}</option>
                ))}
              </select>
            </Campo>
          </div>
          <div className="col-md-6">
            <Campo etiqueta="Teléfono" id="telefono" error={errores.telefono}>{control('telefono', { type: 'tel', maxLength: 20 })}</Campo>
          </div>
          <div className="col-md-6">
            <Campo etiqueta="País" id="pais" error={errores.pais}>{control('pais', { maxLength: 60 })}</Campo>
          </div>
          <div className="col-12">
            <div className="form-check mb-3">
              <input id="is_active" name="is_active" type="checkbox" className="form-check-input" checked={formulario.is_active} onChange={manejarCambio} />
              <label htmlFor="is_active" className="form-check-label">Cuenta activa (puede iniciar sesión)</label>
            </div>
          </div>
        </div>
        <div className="card-footer bg-white d-flex gap-2">
          <button className="btn btn-primary" disabled={procesando}>{procesando ? 'Guardando...' : 'Guardar'}</button>
          <Link to="/usuarios" className="btn btn-outline-secondary">Cancelar</Link>
        </div>
      </form>
    </>
  );
}
