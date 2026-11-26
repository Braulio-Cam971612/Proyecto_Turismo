import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotificar } from '../context/NotificacionesContext';
import { COLOR_ROL, ROLES } from '../utils/constantes';

// "roles": si se indica, el enlace solo se muestra a esos roles (la ruta igual la protege Django).
const MENU = [
  { titulo: 'General' },
  { a: '/', texto: 'Dashboard', fin: true },
  { titulo: 'Módulos' },
  { a: '/experiencias', texto: 'Experiencias y salidas' },
  { a: '/hospedajes', texto: 'Hospedajes', fin: true },
  { a: '/hospedajes/disponibles', texto: 'Disponibilidad' },
  { a: '/reservas', texto: 'Reservas' },
  { a: '/resenas', texto: 'Reseñas' },
  { a: '/metricas', texto: 'Métricas ambientales' },
  { a: '/usuarios', texto: 'Usuarios', roles: ['ADMIN'] },
  { titulo: 'Administración', roles: ['ADMIN'] },
  { a: '/servicios', texto: 'Servicios de hospedaje', roles: ['ADMIN'] },
  { a: '/reportes', texto: 'Reportes e ingresos', roles: ['ADMIN'] },
  { titulo: 'Ayuda' },
  { a: '/seguridad', texto: 'Prueba de permisos (401/403)' },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const notificar = useNotificar();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const visibles = MENU.filter((item) => !item.roles || item.roles.includes(usuario?.rol));

  async function cerrarSesion() {
    const revocado = await logout();
    notificar(revocado ? 'Sesión cerrada. El token fue revocado en el servidor.' : 'Sesión cerrada en este navegador.', 'secondary');
    navigate('/login', { replace: true });
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <nav className="navbar navbar-dark barra-superior sticky-top shadow-sm">
        <div className="container-fluid">
          <div className="d-flex align-items-center gap-2">
            <button
              className="navbar-toggler d-lg-none"
              type="button"
              aria-label="Abrir menú"
              onClick={() => setMenuAbierto((a) => !a)}
            >
              <span className="navbar-toggler-icon" />
            </button>
            <NavLink to="/" className="navbar-brand fw-semibold mb-0">
              Turismo Comunitario
            </NavLink>
          </div>
          <div className="d-flex align-items-center gap-2 text-white">
            <div className="text-end lh-sm d-none d-sm-block">
              <div className="fw-semibold">{usuario?.first_name || usuario?.username}</div>
              <small className="opacity-75">@{usuario?.username}</small>
            </div>
            <span className={`badge text-bg-${COLOR_ROL[usuario?.rol] || 'secondary'}`}>
              {ROLES[usuario?.rol] || 'Sin rol'}
            </span>
            <button type="button" className="btn btn-sm btn-outline-light" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="d-flex flex-grow-1">
        <aside className={`menu-lateral border-end ${menuAbierto ? 'abierto' : ''}`}>
          <nav className="nav flex-column p-2">
            {visibles.map((item, i) =>
              item.titulo ? (
                <div key={`t-${i}`} className="menu-titulo">
                  {item.titulo}
                </div>
              ) : (
                <NavLink
                  key={item.a}
                  to={item.a}
                  end={item.fin}
                  className="nav-link"
                  onClick={() => setMenuAbierto(false)}
                >
                  {item.texto}
                </NavLink>
              ),
            )}
          </nav>
        </aside>
        {menuAbierto && <div className="menu-fondo d-lg-none" onClick={() => setMenuAbierto(false)} />}

        <main className="flex-grow-1 p-3 p-md-4 contenido-principal">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
