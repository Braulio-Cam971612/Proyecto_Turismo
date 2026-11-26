import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AlertaError from '../components/AlertaError';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, estaAutenticado, avisoSesion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formulario, setFormulario] = useState({ username: '', password: '' });
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [procesando, setProcesando] = useState(false);

  if (estaAutenticado) return <Navigate to="/" replace />;

  function manejarCambio(e) {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  }

  function validar() {
    const nuevos = {};
    if (!formulario.username.trim()) nuevos.username = 'Ingrese su usuario.';
    if (!formulario.password) nuevos.password = 'Ingrese su contraseña.';
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  async function enviar(e) {
    e.preventDefault();
    if (!validar()) return;
    setProcesando(true);
    setError(null);
    try {
      await login(formulario.username.trim(), formulario.password);
      navigate(location.state?.desde || '/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="pantalla-acceso d-flex align-items-center justify-content-center p-3">
      <div className="card shadow-lg border-0" style={{ maxWidth: 420, width: '100%' }}>
        <div className="card-body p-4 p-md-5">
          <h1 className="h3 mb-1">Turismo Comunitario</h1>
          <p className="text-secondary mb-4">Inicie sesión para continuar</p>

          {avisoSesion && <div className="alert alert-warning">{avisoSesion}</div>}
          {location.state?.registrado && (
            <div className="alert alert-success">Cuenta creada. Ya puede iniciar sesión.</div>
          )}
          <AlertaError error={error} />

          <form onSubmit={enviar} noValidate>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">
                Usuario
              </label>
              <input
                id="username"
                name="username"
                className={`form-control ${errores.username ? 'is-invalid' : ''}`}
                value={formulario.username}
                onChange={manejarCambio}
                autoComplete="username"
                autoFocus
              />
              <div className="invalid-feedback">{errores.username}</div>
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className={`form-control ${errores.password ? 'is-invalid' : ''}`}
                value={formulario.password}
                onChange={manejarCambio}
                autoComplete="current-password"
              />
              <div className="invalid-feedback">{errores.password}</div>
            </div>
            <button className="btn btn-primary w-100" disabled={procesando}>
              {procesando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-center mt-4 mb-0 small">
            ¿Es turista y no tiene cuenta? <Link to="/registro">Regístrese</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
