import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Cargando from './Cargando';

/** Redirige al login si no hay sesion. Los permisos por rol los valida el backend. */
export default function RutaProtegida({ children }) {
  const { usuario, verificando } = useAuth();
  const location = useLocation();

  if (verificando && !usuario) return <Cargando texto="Verificando sesión..." />;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  return children;
}
