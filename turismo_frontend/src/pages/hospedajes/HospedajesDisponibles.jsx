import { useState } from 'react';
import { Link } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import Campo, { claseControl } from '../../components/Campo';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import EstadoVacio from '../../components/EstadoVacio';
import Paginacion from '../../components/Paginacion';
import { hospedajesApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useListado } from '../../hooks/useListado';
import { colones, hoyISO, noches } from '../../utils/formato';
import { puede } from '../../utils/permisos';

/** Consulta GET /hospedajes/disponibles/?entrada&salida&huespedes: excluye hospedajes con reservas que se cruzan. */
export default function HospedajesDisponibles() {
  const { usuario } = useAuth();
  const [formulario, setFormulario] = useState({ entrada: hoyISO(1), salida: hoyISO(3), huespedes: 2 });
  const [errores, setErrores] = useState({});
  const [consulta, setConsulta] = useState(null);
  const lista = useListado(consulta ? hospedajesApi.disponibles : null, consulta || {});

  const manejarCambio = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });

  function buscar(e) {
    e.preventDefault();
    const n = {};
    if (!formulario.entrada) n.entrada = 'Indique la fecha de entrada.';
    if (!formulario.salida) n.salida = 'Indique la fecha de salida.';
    if (formulario.entrada && formulario.salida && formulario.salida <= formulario.entrada) n.salida = 'La salida debe ser posterior a la entrada.';
    setErrores(n);
    if (Object.keys(n).length) return;
    setConsulta({ ...formulario, page: 1, page_size: 10 });
  }

  const totalNoches = consulta ? noches(consulta.entrada, consulta.salida) : 0;

  return (
    <>
      <EncabezadoPagina titulo="Disponibilidad de hospedajes" subtitulo="El servidor excluye los hospedajes con reservas vigentes en esas fechas." />

      <form className="card shadow-sm mb-3" onSubmit={buscar} noValidate>
        <div className="card-body row g-2 align-items-end">
          <div className="col-6 col-md-3">
            <Campo etiqueta="Entrada" id="entrada" error={errores.entrada} className="mb-0" requerido>
              <input id="entrada" name="entrada" type="date" className={claseControl(errores.entrada)} value={formulario.entrada} onChange={manejarCambio} />
            </Campo>
          </div>
          <div className="col-6 col-md-3">
            <Campo etiqueta="Salida" id="salida" error={errores.salida} className="mb-0" requerido>
              <input id="salida" name="salida" type="date" min={formulario.entrada} className={claseControl(errores.salida)} value={formulario.salida} onChange={manejarCambio} />
            </Campo>
          </div>
          <div className="col-6 col-md-2">
            <Campo etiqueta="Huéspedes" id="huespedes" className="mb-0">
              <input id="huespedes" name="huespedes" type="number" min="1" className="form-control" value={formulario.huespedes} onChange={manejarCambio} />
            </Campo>
          </div>
          <div className="col-6 col-md-2">
            <button className="btn btn-primary w-100">Buscar</button>
          </div>
        </div>
      </form>

      {!consulta ? (
        <EstadoVacio titulo="Indique fechas para consultar" texto="Los resultados vienen del endpoint /hospedajes/disponibles/." />
      ) : (
        <>
          <AlertaError error={lista.error} />
          {lista.cargando ? (
            <Cargando />
          ) : lista.error ? null : lista.resultados.length === 0 ? (
            <EstadoVacio titulo="Sin disponibilidad" texto="No hay hospedajes libres para esas fechas y huéspedes." />
          ) : (
            <div className="row g-3">
              {lista.resultados.map((h) => (
                <div key={h.id} className="col-md-6 col-xl-4">
                  <div className="card h-100 shadow-sm">
                    <div className="card-body">
                      <h2 className="h5"><Link to={`/hospedajes/${h.id}`} className="text-decoration-none">{h.nombre}</Link></h2>
                      <p className="small text-secondary mb-2">{h.ubicacion} · hasta {h.capacidad_personas} personas</p>
                      <p className="mb-0">
                        {colones(h.precio_noche)} / noche
                        <br />
                        <strong>Total estimado: {colones(h.precio_noche * totalNoches)}</strong>{' '}
                        <span className="small text-secondary">({totalNoches} noche{totalNoches === 1 ? '' : 's'})</span>
                      </p>
                    </div>
                    {puede.crearReserva(usuario) && (
                      <div className="card-footer bg-white">
                        <Link
                          className="btn btn-sm btn-primary"
                          to={`/reservas/nueva?hospedaje=${h.id}&entrada=${consulta.entrada}&fin=${consulta.salida}&huespedes=${consulta.huespedes || 1}`}
                        >
                          Reservar estas fechas
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Paginacion pagina={lista.pagina} totalPaginas={lista.totalPaginas} total={lista.total} onCambiar={(p) => setConsulta({ ...consulta, page: p })} />
        </>
      )}
    </>
  );
}
