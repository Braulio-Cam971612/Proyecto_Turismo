import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RutaProtegida from './components/RutaProtegida';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NoEncontrado from './pages/NoEncontrado';
import Registro from './pages/Registro';
import Seguridad from './pages/Seguridad';
import ExperienciaDetalle from './pages/experiencias/ExperienciaDetalle';
import ExperienciaFormulario from './pages/experiencias/ExperienciaFormulario';
import ExperienciasLista from './pages/experiencias/ExperienciasLista';
import SalidaFormulario from './pages/experiencias/SalidaFormulario';
import HospedajeDetalle from './pages/hospedajes/HospedajeDetalle';
import HospedajeFormulario from './pages/hospedajes/HospedajeFormulario';
import HospedajesDisponibles from './pages/hospedajes/HospedajesDisponibles';
import HospedajesLista from './pages/hospedajes/HospedajesLista';
import Servicios from './pages/hospedajes/Servicios';
import Reportes from './pages/reportes/Reportes';
import MetricaFormulario from './pages/resenas/MetricaFormulario';
import MetricasLista from './pages/resenas/MetricasLista';
import ResenaFormulario from './pages/resenas/ResenaFormulario';
import ResenasLista from './pages/resenas/ResenasLista';
import ReservaDetalle from './pages/reservas/ReservaDetalle';
import ReservaFormulario from './pages/reservas/ReservaFormulario';
import ReservasLista from './pages/reservas/ReservasLista';
import UsuarioFormulario from './pages/usuarios/UsuarioFormulario';
import UsuariosLista from './pages/usuarios/UsuariosLista';

export default function App() {
  return (
    <Routes>
      {/* Rutas publicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />

      {/* Rutas privadas: requieren token. Los permisos por rol los valida Django (403). */}
      <Route
        element={
          <RutaProtegida>
            <Layout />
          </RutaProtegida>
        }
      >
        <Route index element={<Dashboard />} />

        <Route path="usuarios" element={<UsuariosLista />} />
        <Route path="usuarios/nuevo" element={<UsuarioFormulario />} />
        <Route path="usuarios/:id/editar" element={<UsuarioFormulario />} />

        <Route path="experiencias" element={<ExperienciasLista />} />
        <Route path="experiencias/nueva" element={<ExperienciaFormulario />} />
        <Route path="experiencias/:id" element={<ExperienciaDetalle />} />
        <Route path="experiencias/:id/editar" element={<ExperienciaFormulario />} />
        <Route path="salidas/nueva" element={<SalidaFormulario />} />
        <Route path="salidas/:id/editar" element={<SalidaFormulario />} />

        <Route path="hospedajes" element={<HospedajesLista />} />
        <Route path="hospedajes/disponibles" element={<HospedajesDisponibles />} />
        <Route path="hospedajes/nuevo" element={<HospedajeFormulario />} />
        <Route path="hospedajes/:id" element={<HospedajeDetalle />} />
        <Route path="hospedajes/:id/editar" element={<HospedajeFormulario />} />
        <Route path="servicios" element={<Servicios />} />

        <Route path="reservas" element={<ReservasLista />} />
        <Route path="reservas/nueva" element={<ReservaFormulario />} />
        <Route path="reservas/:id" element={<ReservaDetalle />} />
        <Route path="reservas/:id/editar" element={<ReservaFormulario />} />

        <Route path="resenas" element={<ResenasLista />} />
        <Route path="resenas/nueva" element={<ResenaFormulario />} />
        <Route path="resenas/:id/editar" element={<ResenaFormulario />} />
        <Route path="metricas" element={<MetricasLista />} />
        <Route path="metricas/nueva" element={<MetricaFormulario />} />
        <Route path="metricas/:id/editar" element={<MetricaFormulario />} />
        <Route path="reportes" element={<Reportes />} />

        <Route path="seguridad" element={<Seguridad />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  );
}
