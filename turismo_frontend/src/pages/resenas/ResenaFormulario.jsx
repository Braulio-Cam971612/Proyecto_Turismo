import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import AvisoPermiso from '../../components/AvisoPermiso';
import Campo, { claseControl } from '../../components/Campo';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { resenasApi, reservasApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useNotificar } from '../../context/NotificacionesContext';
import { useEnvioFormulario, useRegistro } from '../../hooks/useFormulario';
import { useOpciones } from '../../hooks/useOpciones';
import { puede } from '../../utils/permisos';

const describirReserva = (r) => `#${r.id} — ${[r.experiencia_nombre, r.hospedaje_nombre].filter(Boolean).join(' + ')}`;

/** Crear (POST /resenas/) o editar (PATCH /resenas/:id/) una reseña. Solo reservas COMPLETADAS. */
export default function ResenaFormulario() {
  const { id } = useParams();
  const [query] = useSearchParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const notificar = useNotificar();
  const { registro, cargando, error: errorCarga } = useRegistro(resenasApi.obtener, id);
  const { procesando, error, errores, enviar, validar } = useEnvioFormulario();
  const [formulario, setFormulario] = useState({ reserva: query.get('reserva') || '', calificacion: 5, comentario: '' });
  // Reservas completadas visibles para el usuario y todavia sin reseña
  const { opciones: reservas, cargando: cargandoReservas } = useOpciones(id ? null : reservasApi.listar, { estado: 'COMPLETADA' });
  const reservables = reservas.filter((r) => !r.tiene_resena);

  useEffect(() => {
    if (registro) setFormulario({ reserva: registro.reserva, calificacion: registro.calificacion, comentario: registro.comentario ?? '' });
  }, [registro]);

  const manejarCambio = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });

  async function guardar(e) {
    e.preventDefault();
    const n = {};
    if (!formulario.reserva) n.reserva = 'Seleccione la reserva a reseñar.';
    const cal = Number(formulario.calificacion);
    if (!(cal >= 1 && cal <= 5)) n.calificacion = 'La calificación va de 1 a 5.';
    if (formulario.comentario.length > 500) n.comentario = 'Máximo 500 caracteres.';
    if (!validar(n)) return;

    const datos = { calificacion: cal, comentario: formulario.comentario };
    if (!id) datos.reserva = Number(formulario.reserva);
    const r = await enviar(() => (id ? resenasApi.modificar(id, datos) : resenasApi.crear(datos)));
    if (r.ok) {
      notificar(id ? 'Reseña actualizada.' : '¡Gracias! Reseña publicada.');
      navigate('/resenas');
    }
  }

  if (cargando) return <Cargando />;
  if (errorCarga) return <AlertaError error={errorCarga} />;

  return (
    <>
      <EncabezadoPagina titulo={id ? 'Editar reseña' : 'Nueva reseña'} subtitulo="Califique su experiencia de 1 a 5 estrellas." />
      <AvisoPermiso visible={id ? !puede.editarResena(usuario, registro) : !puede.crearResena(usuario)} />
      <AlertaError error={error} mostrarCampos />

      <form className="card shadow-sm" onSubmit={guardar} noValidate style={{ maxWidth: 680 }}>
        <div className="card-body">
          <Campo etiqueta="Reserva" id="reserva" error={errores.reserva} requerido ayuda={id ? 'La reserva de una reseña no se puede cambiar.' : 'Solo aparecen reservas completadas sin reseña.'}>
            <select id="reserva" name="reserva" className={claseControl(errores.reserva, 'form-select')} value={formulario.reserva} onChange={manejarCambio} disabled={!!id || cargandoReservas}>
              <option value="">{cargandoReservas ? 'Cargando...' : 'Seleccione...'}</option>
              {id ? (
                <option value={formulario.reserva}>{`#${formulario.reserva} — ${[registro?.experiencia_nombre, registro?.hospedaje_nombre].filter(Boolean).join(' + ')}`}</option>
              ) : (
                reservables.map((r) => <option key={r.id} value={r.id}>{describirReserva(r)}</option>)
              )}
              {!id && formulario.reserva && !reservables.some((r) => String(r.id) === String(formulario.reserva)) && (
                <option value={formulario.reserva}>{`Reserva #${formulario.reserva}`}</option>
              )}
            </select>
          </Campo>

          <fieldset className="mb-3">
            <legend className="form-label fs-6">Calificación <span className="text-danger">*</span></legend>
            <div className="d-flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="form-check">
                  <input id={`cal-${n}`} type="radio" name="calificacion" value={n} className="form-check-input" checked={Number(formulario.calificacion) === n} onChange={manejarCambio} />
                  <label htmlFor={`cal-${n}`} className="form-check-label estrellas">{'★'.repeat(n)}</label>
                </div>
              ))}
            </div>
            {errores.calificacion && <div className="invalid-feedback d-block">{errores.calificacion}</div>}
          </fieldset>

          <Campo etiqueta="Comentario" id="comentario" error={errores.comentario} ayuda={`${formulario.comentario.length}/500`}>
            <textarea id="comentario" name="comentario" rows={4} maxLength={500} className={claseControl(errores.comentario)} value={formulario.comentario} onChange={manejarCambio} />
          </Campo>
        </div>
        <div className="card-footer bg-white d-flex gap-2">
          <button className="btn btn-primary" disabled={procesando}>{procesando ? 'Guardando...' : 'Publicar'}</button>
          <Link to="/resenas" className="btn btn-outline-secondary">Cancelar</Link>
        </div>
      </form>
    </>
  );
}
