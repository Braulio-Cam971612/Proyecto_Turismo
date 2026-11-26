import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AlertaError from '../components/AlertaError';
import Campo, { claseControl } from '../components/Campo';
import { authApi } from '../api/recursos';
import { erroresDeCampos } from '../utils/errores';

const INICIAL = { username: '', email: '', password: '', confirmar: '', first_name: '', last_name: '', telefono: '', pais: 'Costa Rica' };

/** Registro publico (POST /auth/registro/): el backend siempre crea el usuario con rol TURISTA. */
export default function Registro() {
  const navigate = useNavigate();
  const [formulario, setFormulario] = useState(INICIAL);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const manejarCambio = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });

  function validar() {
    const n = {};
    if (!formulario.username.trim()) n.username = 'El usuario es obligatorio.';
    if (!/^\S+@\S+\.\S+$/.test(formulario.email)) n.email = 'Ingrese un correo válido.';
    if (formulario.password.length < 8) n.password = 'Mínimo 8 caracteres.';
    if (formulario.password !== formulario.confirmar) n.confirmar = 'Las contraseñas no coinciden.';
    setErrores(n);
    return Object.keys(n).length === 0;
  }

  async function enviar(e) {
    e.preventDefault();
    if (!validar()) return;
    setProcesando(true);
    setError(null);
    try {
      const { confirmar, ...datos } = formulario;
      void confirmar;
      await authApi.registro(datos);
      navigate('/login', { state: { registrado: true } });
    } catch (err) {
      setError(err);
      setErrores(erroresDeCampos(err));
    } finally {
      setProcesando(false);
    }
  }

  const campo = (nombre, etiqueta, props = {}) => (
    <Campo etiqueta={etiqueta} id={nombre} error={errores[nombre]} requerido={props.required}>
      <input id={nombre} name={nombre} className={claseControl(errores[nombre])} value={formulario[nombre]} onChange={manejarCambio} {...props} />
    </Campo>
  );

  return (
    <div className="pantalla-acceso d-flex align-items-center justify-content-center p-3">
      <div className="card shadow-lg border-0" style={{ maxWidth: 620, width: '100%' }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-1">Crear cuenta de turista</h1>
          <p className="text-secondary small">Las cuentas de guía, anfitrión y administrador las crea un administrador.</p>
          <AlertaError error={error} />
          <form onSubmit={enviar} noValidate>
            <div className="row">
              <div className="col-md-6">{campo('username', 'Usuario', { required: true, autoComplete: 'username' })}</div>
              <div className="col-md-6">{campo('email', 'Correo', { type: 'email', required: true })}</div>
              <div className="col-md-6">{campo('first_name', 'Nombre')}</div>
              <div className="col-md-6">{campo('last_name', 'Apellidos')}</div>
              <div className="col-md-6">{campo('password', 'Contraseña', { type: 'password', required: true, autoComplete: 'new-password' })}</div>
              <div className="col-md-6">{campo('confirmar', 'Confirmar contraseña', { type: 'password', required: true, autoComplete: 'new-password' })}</div>
              <div className="col-md-6">{campo('telefono', 'Teléfono', { type: 'tel', maxLength: 20 })}</div>
              <div className="col-md-6">{campo('pais', 'País', { maxLength: 60 })}</div>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-primary" disabled={procesando}>
                {procesando ? 'Registrando...' : 'Crear cuenta'}
              </button>
              <Link to="/login" className="btn btn-outline-secondary">
                Volver al login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
