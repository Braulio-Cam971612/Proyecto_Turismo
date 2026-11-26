import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { borrarToken, guardarToken, obtenerToken, registrarManejador401 } from '../api/cliente';
import { authApi } from '../api/recursos';

const CLAVE_USUARIO = 'turismo_usuario';
const AuthContext = createContext(null);

function leerUsuarioGuardado() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_USUARIO));
  } catch {
    return null;
  }
}

/**
 * Estado de autenticacion compartido por toda la aplicacion.
 * Guarda el token en localStorage y los datos basicos del usuario (id, username, rol).
 */
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => (obtenerToken() ? leerUsuarioGuardado() : null));
  const [verificando, setVerificando] = useState(() => !!obtenerToken());
  const [avisoSesion, setAvisoSesion] = useState('');

  const limpiarSesion = useCallback(() => {
    borrarToken();
    localStorage.removeItem(CLAVE_USUARIO);
    setUsuario(null);
  }, []);

  const guardarUsuario = useCallback((datos) => {
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(datos));
    setUsuario(datos);
  }, []);

  // Si cualquier peticion con token recibe 401 (token invalido o revocado) se cierra la sesion local.
  useEffect(() => {
    registrarManejador401(() => {
      limpiarSesion();
      setAvisoSesion('Su sesión expiró o el token fue revocado. Inicie sesión nuevamente.');
    });
    return () => registrarManejador401(null);
  }, [limpiarSesion]);

  // Al recargar la pagina se valida el token guardado contra GET /auth/me/.
  useEffect(() => {
    if (!obtenerToken()) return;
    authApi
      .me()
      .then((me) => guardarUsuario(me))
      .catch(() => {
        if (!leerUsuarioGuardado()) limpiarSesion();
      })
      .finally(() => setVerificando(false));
  }, [guardarUsuario, limpiarSesion]);

  const login = useCallback(
    async (username, password) => {
      const respuesta = await authApi.login(username, password); // POST /auth/login/
      guardarToken(respuesta.token);
      let datos = { username: respuesta.username, rol: respuesta.rol };
      try {
        const me = await authApi.me();
        datos = { ...me, rol: me.rol || respuesta.rol };
      } catch {
        /* si /me falla se usan los datos del login */
      }
      guardarUsuario(datos);
      setAvisoSesion('');
      return datos;
    },
    [guardarUsuario],
  );

  /** Revoca el token en el servidor (POST /auth/logout/) y limpia el navegador. */
  const logout = useCallback(async () => {
    let revocado = false;
    try {
      await authApi.logout();
      revocado = true;
    } catch {
      /* sin conexion o token ya invalido: igual se limpia la sesion local */
    }
    limpiarSesion();
    setAvisoSesion('');
    return revocado;
  }, [limpiarSesion]);

  const valor = useMemo(
    () => ({ usuario, verificando, avisoSesion, login, logout, estaAutenticado: !!usuario }),
    [usuario, verificando, avisoSesion, login, logout],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return contexto;
}
