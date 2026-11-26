import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import AvisoPermiso from '../../components/AvisoPermiso';
import Campo, { claseControl } from '../../components/Campo';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { experienciasApi, salidasApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useNotificar } from '../../context/NotificacionesContext';
import { useEnvioFormulario, useRegistro } from '../../hooks/useFormulario';
import { useOpciones } from '../../hooks/useOpciones';
import { aDatetimeLocal } from '../../utils/formato';
import { puede } from '../../utils/permisos';

/** Crear / editar una salida (fecha concreta de una experiencia). POST /salidas/ y PATCH /salidas/:id/ */
export default function SalidaFormulario() {
  const { id } = useParams();
  const [query] = useSearchParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const notificar = useNotificar();
  const { registro, cargando, error: errorCarga } = useRegistro(salidasApi.obtener, id);
  const { procesando, error, errores, enviar, validar } = useEnvioFormulario();
  const [formulario, setFormulario] = useState({ experiencia: query.get('experiencia') || '', fecha_hora: '', activo: true });
  // Un guia solo ve sus experiencias en el selector; el admin ve todas las activas.
  const filtroExp = usuario.rol === 'GUIA' ? { guia: usuario.id, activo: 'true' } : { activo: 'true' };
  const { opciones: experiencias, cargando: cargandoExp } = useOpciones(experienciasApi.listar, filtroExp);

  useEffect(() => {
    if (registro) {
      setFormulario({ experiencia: registro.experiencia, fecha_hora: aDatetimeLocal(registro.fecha_hora), activo: registro.activo });
    }
  }, [registro]);

  function manejarCambio(e) {
    const { name, value, type, checked } = e.target;
    setFormulario({ ...formulario, [name]: type === 'checkbox' ? checked : value });
  }

  async function guardar(e) {
    e.preventDefault();
    const n = {};
    if (!formulario.experiencia) n.experiencia = 'Seleccione la experiencia.';
    if (!formulario.fecha_hora) n.fecha_hora = 'Indique fecha y hora.';
    else if (new Date(formulario.fecha_hora) <= new Date() && formulario.fecha_hora !== aDatetimeLocal(registro?.fecha_hora)) {
      n.fecha_hora = 'La salida debe programarse en el futuro.';
    }
    if (!validar(n)) return;

    const datos = { activo: formulario.activo };
    // Al editar solo se envia la fecha si cambio (el backend exige fechas futuras)
    if (!id || formulario.fecha_hora !== aDatetimeLocal(registro?.fecha_hora)) datos.fecha_hora = formulario.fecha_hora;
    if (!id) datos.experiencia = Number(formulario.experiencia);

    const r = await enviar(() => (id ? salidasApi.modificar(id, datos) : salidasApi.crear(datos)));
    if (r.ok) {
      notificar(id ? 'Salida actualizada.' : 'Salida programada.');
      navigate(`/experiencias/${r.resultado.experiencia}`);
    }
  }

  if (cargando) return <Cargando />;
  if (errorCarga) return <AlertaError error={errorCarga} />;

  const volver = formulario.experiencia ? `/experiencias/${formulario.experiencia}` : '/experiencias';
  const experienciaActual = experiencias.find((x) => String(x.id) === String(formulario.experiencia));

  return (
    <>
      <EncabezadoPagina titulo={id ? 'Editar salida' : 'Programar salida'} subtitulo="Fecha y hora concreta en que se realiza la experiencia." />
      <AvisoPermiso
        visible={!puede.crearExperiencia(usuario) || (experienciaActual && !puede.editarExperiencia(usuario, experienciaActual))}
        texto="Solo el administrador o el guía dueño de la experiencia gestionan sus salidas."
      />
      <AlertaError error={error} mostrarCampos />
      <form className="card shadow-sm" onSubmit={guardar} noValidate style={{ maxWidth: 640 }}>
        <div className="card-body">
          <Campo etiqueta="Experiencia" id="experiencia" error={errores.experiencia} requerido ayuda={id ? 'La experiencia de una salida no se puede cambiar.' : undefined}>
            <select
              id="experiencia"
              name="experiencia"
              className={claseControl(errores.experiencia, 'form-select')}
              value={formulario.experiencia}
              onChange={manejarCambio}
              disabled={!!id || cargandoExp}
            >
              <option value="">{cargandoExp ? 'Cargando...' : 'Seleccione...'}</option>
              {experiencias.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
              {id && registro && !experiencias.some((x) => x.id === registro.experiencia) && (
                <option value={registro.experiencia}>{registro.experiencia_nombre}</option>
              )}
            </select>
          </Campo>
          <Campo etiqueta="Fecha y hora" id="fecha_hora" error={errores.fecha_hora} requerido>
            <input id="fecha_hora" name="fecha_hora" type="datetime-local" className={claseControl(errores.fecha_hora)} value={formulario.fecha_hora} onChange={manejarCambio} required />
          </Campo>
          <div className="form-check">
            <input id="activo" name="activo" type="checkbox" className="form-check-input" checked={formulario.activo} onChange={manejarCambio} />
            <label htmlFor="activo" className="form-check-label">Salida activa</label>
          </div>
        </div>
        <div className="card-footer bg-white d-flex gap-2">
          <button className="btn btn-primary" disabled={procesando}>{procesando ? 'Guardando...' : 'Guardar'}</button>
          <Link to={volver} className="btn btn-outline-secondary">Cancelar</Link>
        </div>
      </form>
    </>
  );
}
