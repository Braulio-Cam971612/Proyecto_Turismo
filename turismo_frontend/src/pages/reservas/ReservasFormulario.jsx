import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import AvisoPermiso from '../../components/AvisoPermiso';
import Campo, { claseControl } from '../../components/Campo';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { experienciasApi, hospedajesApi, reservasApi, salidasApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useNotificar } from '../../context/NotificacionesContext';
import { useEnvioFormulario, useRegistro } from '../../hooks/useFormulario';
import { useOpciones } from '../../hooks/useOpciones';
import { colones, fechaHora, hoyISO, noches } from '../../utils/formato';
import { puede } from '../../utils/permisos';

/**
 * Crear (POST /reservas/) o editar (PATCH /reservas/:id/) una reserva de tour, hospedaje o ambos.
 * Relaciones: la salida y el hospedaje se eligen de listas consultadas a la API.
 * El total oficial lo calcula el servidor; aqui solo se muestra un estimado.
 */
export default function ReservaFormulario() {
  const { id } = useParams();
  const [query] = useSearchParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const notificar = useNotificar();
  const { registro, cargando, error: errorCarga } = useRegistro(reservasApi.obtener, id);
  const { procesando, error, errores, enviar, validar } = useEnvioFormulario();

  const { opciones: salidas, cargando: cargandoSalidas } = useOpciones(salidasApi.listar, { futuras: 'true', activo: 'true' });
  const { opciones: experiencias } = useOpciones(experienciasApi.listar, { activo: 'true' });
  const { opciones: hospedajes, cargando: cargandoHosp } = useOpciones(hospedajesApi.listar, { activo: 'true' });

  const [formulario, setFormulario] = useState(() => ({
    incluirTour: !!query.get('salida') || !query.get('hospedaje'),
    salida: query.get('salida') || '',
    personas: 1,
    incluirHospedaje: !!query.get('hospedaje'),
    hospedaje: query.get('hospedaje') || '',
    fecha_entrada: query.get('entrada') || '',
    fecha_salida: query.get('fin') || '',
    huespedes: query.get('huespedes') || 1,
    notas: '',
  }));

  useEffect(() => {
    if (registro) {
      setFormulario({
        incluirTour: !!registro.salida,
        salida: registro.salida ?? '',
        personas: registro.personas || 1,
        incluirHospedaje: !!registro.hospedaje,
        hospedaje: registro.hospedaje ?? '',
        fecha_entrada: registro.fecha_entrada ?? '',
        fecha_salida: registro.fecha_salida ?? '',
        huespedes: registro.huespedes || 1,
        notas: registro.notas ?? '',
      });
    }
  }, [registro]);

  const salidaSel = salidas.find((s) => String(s.id) === String(formulario.salida));
  const expSel = experiencias.find((x) => x.id === (salidaSel?.experiencia ?? registro?.experiencia));
  const hospSel = hospedajes.find((h) => String(h.id) === String(formulario.hospedaje));
  // Al editar, los cupos propios ya estan ocupados por esta misma reserva
  const cuposMax = salidaSel ? salidaSel.cupos_disponibles + (registro?.salida === salidaSel.id ? registro.personas : 0) : null;
  const totalNoches = noches(formulario.fecha_entrada, formulario.fecha_salida);

  const estimado = useMemo(() => {
    let total = 0;
    if (formulario.incluirTour && expSel) total += Number(expSel.precio_persona) * Number(formulario.personas || 0);
    if (formulario.incluirHospedaje && hospSel) total += Number(hospSel.precio_noche) * totalNoches;
    return total;
  }, [formulario, expSel, hospSel, totalNoches]);

  function manejarCambio(e) {
    const { name, value, type, checked } = e.target;
    setFormulario({ ...formulario, [name]: type === 'checkbox' ? checked : value });
  }

  function validarCliente() {
    const n = {};
    if (!formulario.incluirTour && !formulario.incluirHospedaje) n.general = 'Incluya un tour, un hospedaje o ambos.';
    if (formulario.incluirTour) {
      if (!formulario.salida) n.salida = 'Seleccione una salida.';
      if (!(Number(formulario.personas) >= 1)) n.personas = 'Indique al menos 1 persona.';
      else if (cuposMax !== null && Number(formulario.personas) > cuposMax) n.personas = `Solo hay ${cuposMax} cupo(s) disponibles.`;
    }
    if (formulario.incluirHospedaje) {
      if (!formulario.hospedaje) n.hospedaje = 'Seleccione un hospedaje.';
      if (!formulario.fecha_entrada) n.fecha_entrada = 'Indique la fecha de entrada.';
      else if ((!id || formulario.fecha_entrada !== registro?.fecha_entrada) && formulario.fecha_entrada < hoyISO()) {
        n.fecha_entrada = 'La fecha de entrada no puede estar en el pasado.';
      }
      if (!formulario.fecha_salida) n.fecha_salida = 'Indique la fecha de salida.';
      else if (formulario.fecha_entrada && formulario.fecha_salida <= formulario.fecha_entrada) n.fecha_salida = 'Debe ser posterior a la entrada.';
      if (!(Number(formulario.huespedes) >= 1)) n.huespedes = 'Indique al menos 1 huésped.';
      else if (hospSel && Number(formulario.huespedes) > hospSel.capacidad_personas) n.huespedes = `Capacidad máxima: ${hospSel.capacidad_personas}.`;
    }
    return n;
  }

  function construirDatos() {
    const datos = { notas: formulario.notas };
    if (formulario.incluirTour) {
      if (!id) datos.salida = Number(formulario.salida);
      datos.personas = Number(formulario.personas);
    }
    if (formulario.incluirHospedaje) {
      if (!id) datos.hospedaje = Number(formulario.hospedaje);
      datos.huespedes = Number(formulario.huespedes);
      // Al editar solo se envian las fechas que cambiaron
      if (!id || formulario.fecha_entrada !== registro?.fecha_entrada) datos.fecha_entrada = formulario.fecha_entrada;
      if (!id || formulario.fecha_salida !== registro?.fecha_salida) datos.fecha_salida = formulario.fecha_salida;
    }
    return datos;
  }

  async function guardar(e) {
    e.preventDefault();
    if (!validar(validarCliente())) return;
    const datos = construirDatos();
    const r = await enviar(() => (id ? reservasApi.modificar(id, datos) : reservasApi.crear(datos)));
    if (r.ok) {
      notificar(id ? 'Reserva actualizada.' : `Reserva #${r.resultado.id} creada. Total: ${colones(r.resultado.total)}`);
      navigate(`/reservas/${r.resultado.id}`);
    }
  }

  if (cargando) return <Cargando />;
  if (errorCarga) return <AlertaError error={errorCarga} />;

  return (
    <>
      <EncabezadoPagina
        titulo={id ? `Editar reserva #${id}` : 'Nueva reserva'}
        subtitulo={id ? 'Solo las reservas pendientes se pueden modificar. La salida y el hospedaje no se cambian.' : 'Reserve una salida de tour, un hospedaje o ambos.'}
      />
      <AvisoPermiso visible={!puede.crearReserva(usuario)} texto="Solo turistas y administradores crean o modifican reservas." />
      {id && registro && registro.estado !== 'PENDIENTE' && (
        <div className="alert alert-warning">Esta reserva está {registro.estado.toLowerCase()}: el servidor rechazará cambios (400).</div>
      )}
      <AlertaError error={error} mostrarCampos />
      {errores.general && <div className="alert alert-danger">{errores.general}</div>}

      <form onSubmit={guardar} noValidate>
        <div className="row g-3">
          <div className="col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white">
                <div className="form-check form-switch mb-0">
                  <input id="incluirTour" name="incluirTour" type="checkbox" className="form-check-input" checked={formulario.incluirTour} onChange={manejarCambio} disabled={!!id} />
                  <label htmlFor="incluirTour" className="form-check-label fw-semibold">Tour (salida de una experiencia)</label>
                </div>
              </div>
              {formulario.incluirTour && (
                <div className="card-body">
                  <Campo etiqueta="Salida" id="salida" error={errores.salida} requerido>
                    <select id="salida" name="salida" className={claseControl(errores.salida, 'form-select')} value={formulario.salida} onChange={manejarCambio} disabled={!!id || cargandoSalidas}>
                      <option value="">{cargandoSalidas ? 'Cargando salidas...' : 'Seleccione...'}</option>
                      {salidas.map((s) => (
                        <option key={s.id} value={s.id} disabled={s.cupos_disponibles === 0}>
                          {`${s.experiencia_nombre} — ${fechaHora(s.fecha_hora)} (${s.cupos_disponibles} cupos)`}
                        </option>
                      ))}
                      {id && registro?.salida && !salidaSel && (
                        <option value={registro.salida}>{`${registro.experiencia_nombre} — ${fechaHora(registro.salida_fecha_hora)}`}</option>
                      )}
                    </select>
                  </Campo>
                  <Campo
                    etiqueta="Personas"
                    id="personas"
                    error={errores.personas}
                    requerido
                    ayuda={expSel ? `${colones(expSel.precio_persona)} por persona${cuposMax !== null ? ` · ${cuposMax} cupo(s) disponibles` : ''}` : undefined}
                  >
                    <input id="personas" name="personas" type="number" min="1" max={cuposMax ?? undefined} className={claseControl(errores.personas)} value={formulario.personas} onChange={manejarCambio} />
                  </Campo>
                </div>
              )}
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white">
                <div className="form-check form-switch mb-0">
                  <input id="incluirHospedaje" name="incluirHospedaje" type="checkbox" className="form-check-input" checked={formulario.incluirHospedaje} onChange={manejarCambio} disabled={!!id} />
                  <label htmlFor="incluirHospedaje" className="form-check-label fw-semibold">Hospedaje</label>
                </div>
              </div>
              {formulario.incluirHospedaje && (
                <div className="card-body row">
                  <div className="col-12">
                    <Campo etiqueta="Hospedaje" id="hospedaje" error={errores.hospedaje} requerido>
                      <select id="hospedaje" name="hospedaje" className={claseControl(errores.hospedaje, 'form-select')} value={formulario.hospedaje} onChange={manejarCambio} disabled={!!id || cargandoHosp}>
                        <option value="">{cargandoHosp ? 'Cargando hospedajes...' : 'Seleccione...'}</option>
                        {hospedajes.map((h) => (
                          <option key={h.id} value={h.id}>{`${h.nombre} — ${colones(h.precio_noche)}/noche (máx. ${h.capacidad_personas})`}</option>
                        ))}
                        {id && registro?.hospedaje && !hospSel && <option value={registro.hospedaje}>{registro.hospedaje_nombre}</option>}
                      </select>
                    </Campo>
                  </div>
                  <div className="col-6">
                    <Campo etiqueta="Entrada" id="fecha_entrada" error={errores.fecha_entrada} requerido>
                      <input id="fecha_entrada" name="fecha_entrada" type="date" min={id ? undefined : hoyISO()} className={claseControl(errores.fecha_entrada)} value={formulario.fecha_entrada} onChange={manejarCambio} />
                    </Campo>
                  </div>
                  <div className="col-6">
                    <Campo etiqueta="Salida" id="fecha_salida" error={errores.fecha_salida} requerido>
                      <input id="fecha_salida" name="fecha_salida" type="date" min={formulario.fecha_entrada || undefined} className={claseControl(errores.fecha_salida)} value={formulario.fecha_salida} onChange={manejarCambio} />
                    </Campo>
                  </div>
                  <div className="col-6">
                    <Campo etiqueta="Huéspedes" id="huespedes" error={errores.huespedes} requerido>
                      <input id="huespedes" name="huespedes" type="number" min="1" max={hospSel?.capacidad_personas} className={claseControl(errores.huespedes)} value={formulario.huespedes} onChange={manejarCambio} />
                    </Campo>
                  </div>
                  <div className="col-6 d-flex align-items-center">
                    <span className="small text-secondary">{totalNoches} noche{totalNoches === 1 ? '' : 's'}</span>
                  </div>
                  <div className="col-12">
                    <Link to="/hospedajes/disponibles" className="small">Consultar disponibilidad por fechas</Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body">
                <Campo etiqueta="Notas" id="notas" error={errores.notas} ayuda="Máximo 300 caracteres.">
                  <textarea id="notas" name="notas" rows={2} maxLength={300} className={claseControl(errores.notas)} value={formulario.notas} onChange={manejarCambio} />
                </Campo>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <button className="btn btn-primary" disabled={procesando}>{procesando ? 'Guardando...' : id ? 'Guardar cambios' : 'Confirmar reserva'}</button>
                  <Link to={id ? `/reservas/${id}` : '/reservas'} className="btn btn-outline-secondary">Cancelar</Link>
                  <span className="ms-auto">
                    Total estimado: <strong>{colones(estimado)}</strong>
                    <span className="small text-secondary ms-1">(el servidor calcula el total oficial)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
