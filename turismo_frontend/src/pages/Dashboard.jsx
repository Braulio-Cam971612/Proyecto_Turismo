import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Cargando from '../components/Cargando';
import EncabezadoPagina from '../components/EncabezadoPagina';
import { InsigniaEstado } from '../components/Insignia';
import { experienciasApi, hospedajesApi, reportesApi, resenasApi, reservasApi, salidasApi } from '../api/recursos';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constantes';
import { mensajeError } from '../utils/errores';
import { colones, estrellas, fechaHora } from '../utils/formato';
import { puede } from '../utils/permisos';

const MODULOS = [
  { a: '/usuarios', titulo: 'Usuarios', texto: 'Cuentas y roles del sistema (solo administrador).' },
  { a: '/experiencias', titulo: 'Experiencias', texto: 'Tours comunitarios y sus salidas programadas.' },
  { a: '/hospedajes', titulo: 'Hospedajes', texto: 'Alojamientos rurales, servicios y disponibilidad.' },
  { a: '/reservas', titulo: 'Reservas', texto: 'Reservas de tours y hospedajes, pagos y estados.' },
  { a: '/resenas', titulo: 'Reseñas y sostenibilidad', texto: 'Calificaciones, métricas ambientales y reportes.' },
];

const ETIQUETA_RESERVAS = {
  ADMIN: 'Reservas totales',
  TURISTA: 'Mis reservas',
  GUIA: 'Reservas de mis tours',
  ANFITRION: 'Reservas de mis hospedajes',
};

function Indicador({ titulo, valor, detalle, error }) {
  return (
    <div className="col-6 col-xl-3">
      <div className="card shadow-sm tarjeta-indicador h-100">
        <div className="card-body">
          <div className="text-secondary small">{titulo}</div>
          <div className="valor">{error ? '—' : valor}</div>
          {error ? <div className="small text-danger">{error}</div> : detalle && <div className="small text-secondary">{detalle}</div>}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const esAdmin = puede.administrar(usuario);
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let vigente = true;
    // Cada indicador sale de una consulta real a la API; si una falla, las demas se muestran igual.
    const consultas = {
      experiencias: experienciasApi.listar({ activo: 'true', page_size: 1 }),
      hospedajes: hospedajesApi.listar({ activo: 'true', page_size: 1 }),
      salidas: salidasApi.listar({ futuras: 'true', activo: 'true', page_size: 5 }),
      reservas: reservasApi.listar({ page_size: 5, ordering: '-fecha_creacion' }),
      pendientes: reservasApi.listar({ estado: 'PENDIENTE', page_size: 1 }),
      resenas: resenasApi.listar({ page_size: 50 }),
    };
    if (esAdmin) consultas.resumen = reportesApi.resumenSostenibilidad();

    const claves = Object.keys(consultas);
    Promise.allSettled(Object.values(consultas)).then((resultados) => {
      if (!vigente) return;
      const r = {};
      resultados.forEach((res, i) => {
        r[claves[i]] = res.status === 'fulfilled' ? { ok: res.value } : { error: mensajeError(res.reason) };
      });
      setDatos(r);
    });
    return () => {
      vigente = false;
    };
  }, [esAdmin]);

  if (!datos) return <Cargando texto="Cargando indicadores..." />;

  const total = (clave) => datos[clave]?.ok?.total_registros ?? 0;
  const resenas = datos.resenas?.ok?.resultados || [];
  const promedio = resenas.length ? resenas.reduce((s, r) => s + r.calificacion, 0) / resenas.length : null;
  const ingresos = datos.resumen?.ok?.ingresos;

  return (
    <>
      <EncabezadoPagina
        titulo={`Hola, ${usuario.first_name || usuario.username}`}
        subtitulo={`Perfil: ${ROLES[usuario.rol] || usuario.rol}. Indicadores calculados con datos reales de la API.`}
      />

      <div className="row g-3 mb-4">
        <Indicador titulo="Experiencias activas" valor={total('experiencias')} error={datos.experiencias.error} />
        <Indicador titulo="Hospedajes activos" valor={total('hospedajes')} error={datos.hospedajes.error} />
        <Indicador titulo="Próximas salidas" valor={total('salidas')} detalle="Tours programados a futuro" error={datos.salidas.error} />
        <Indicador
          titulo={ETIQUETA_RESERVAS[usuario.rol] || 'Reservas'}
          valor={total('reservas')}
          detalle={`${total('pendientes')} pendiente(s)`}
          error={datos.reservas.error}
        />
        <Indicador
          titulo="Calificación promedio"
          valor={promedio ? promedio.toFixed(1) : 'Sin datos'}
          detalle={promedio ? `${estrellas(Math.round(promedio))} · ${total('resenas')} reseña(s)` : 'Aún no hay reseñas'}
          error={datos.resenas.error}
        />
        {esAdmin && (
          <>
            <Indicador
              titulo="Ingresos para la comunidad"
              valor={colones(ingresos?.comunidad)}
              detalle="Suma de distribuciones de reservas pagadas"
              error={datos.resumen?.error}
            />
            <Indicador titulo="Ingresos totales cobrados" valor={colones(ingresos?.total)} error={datos.resumen?.error} />
            <Indicador titulo="Porción de la asociación" valor={colones(ingresos?.asociacion)} error={datos.resumen?.error} />
          </>
        )}
      </div>

      <h2 className="h5 mb-3">Módulos</h2>
      <div className="row g-3 mb-4">
        {MODULOS.filter((m) => m.a !== '/usuarios' || esAdmin).map((m) => (
          <div key={m.a} className="col-12 col-sm-6 col-xl">
            <Link to={m.a} className="card h-100 shadow-sm text-decoration-none text-reset tarjeta-modulo">
              <div className="card-body">
                <h3 className="h6 text-primary">{m.titulo}</h3>
                <p className="small text-secondary mb-0">{m.texto}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Próximas salidas</div>
            <ul className="list-group list-group-flush">
              {(datos.salidas.ok?.resultados || []).map((s) => (
                <li key={s.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
                  <div>
                    <Link to={`/experiencias/${s.experiencia}`}>{s.experiencia_nombre}</Link>
                    <div className="small text-secondary">
                      {fechaHora(s.fecha_hora)} · {s.cupos_disponibles} cupo(s)
                    </div>
                  </div>
                  {puede.crearReserva(usuario) && s.cupos_disponibles > 0 && (
                    <Link to={`/reservas/nueva?salida=${s.id}`} className="btn btn-sm btn-outline-primary">
                      Reservar
                    </Link>
                  )}
                </li>
              ))}
              {datos.salidas.ok?.resultados?.length === 0 && (
                <li className="list-group-item text-secondary">No hay salidas programadas.</li>
              )}
              {datos.salidas.error && <li className="list-group-item text-danger">{datos.salidas.error}</li>}
            </ul>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Últimas reservas</div>
            <ul className="list-group list-group-flush">
              {(datos.reservas.ok?.resultados || []).map((r) => (
                <li key={r.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
                  <div>
                    <Link to={`/reservas/${r.id}`}>Reserva #{r.id}</Link>
                    <div className="small text-secondary">
                      {[r.experiencia_nombre, r.hospedaje_nombre].filter(Boolean).join(' + ')} · {colones(r.total)}
                    </div>
                  </div>
                  <InsigniaEstado estado={r.estado} />
                </li>
              ))}
              {datos.reservas.ok?.resultados?.length === 0 && (
                <li className="list-group-item text-secondary">No hay reservas visibles para su perfil.</li>
              )}
              {datos.reservas.error && <li className="list-group-item text-danger">{datos.reservas.error}</li>}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
