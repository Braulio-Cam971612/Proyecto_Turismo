import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import AvisoPermiso from '../../components/AvisoPermiso';
import Campo, { claseControl } from '../../components/Campo';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { experienciasApi, metricasApi } from '../../api/recursos';
import { useAuth } from '../../context/AuthContext';
import { useNotificar } from '../../context/NotificacionesContext';
import { useEnvioFormulario, useRegistro } from '../../hooks/useFormulario';
import { useOpciones } from '../../hooks/useOpciones';
import { TIPOS_METRICA } from '../../utils/constantes';
import { hoyISO } from '../../utils/formato';
import { puede } from '../../utils/permisos';

export default function MetricaFormulario() {
  const { id } = useParams();
  const [query] = useSearchParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const notificar = useNotificar();
  const { registro, cargando, error: errorCarga } = useRegistro(metricasApi.obtener, id);
  const { procesando, error, errores, enviar, validar } = useEnvioFormulario();
  const [formulario, setFormulario] = useState({ experiencia: query.get('experiencia') || '', tipo: 'CO2_EVITADO_KG', valor: '', fecha: hoyISO(), notas: '' });
  const filtroExp = usuario.rol === 'GUIA' ? { guia: usuario.id } : {};
  const { opciones: experiencias, cargando: cargandoExp } = useOpciones(experienciasApi.listar, filtroExp);

  useEffect(() => {
    if (registro) {
      setFormulario({ experiencia: registro.experiencia, tipo: registro.tipo, valor: registro.valor, fecha: registro.fecha, notas: registro.notas ?? '' });
    }
  }, [registro]);

  const manejarCambio = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });

  async function guardar(e) {
    e.preventDefault();
    const n = {};
    if (!formulario.experiencia) n.experiencia = 'Seleccione la experiencia.';
    if (!(Number(formulario.valor) > 0)) n.valor = 'El valor debe ser mayor que cero.';
    if (!formulario.fecha) n.fecha = 'Indique la fecha.';
    else if (formulario.fecha > hoyISO()) n.fecha = 'La fecha no puede estar en el futuro.';
    if (!validar(n)) return;

    const datos = { tipo: formulario.tipo, valor: formulario.valor, fecha: formulario.fecha, notas: formulario.notas };
    if (!id) datos.experiencia = Number(formulario.experiencia);
    const r = await enviar(() => (id ? metricasApi.modificar(id, datos) : metricasApi.crear(datos)));
    if (r.ok) {
      notificar(id ? 'Métrica actualizada.' : 'Métrica registrada.');
      navigate('/metricas');
    }
  }

  if (cargando) return <Cargando />;
  if (errorCarga) return <AlertaError error={errorCarga} />;

  return (
    <>
      <EncabezadoPagina titulo={id ? 'Editar métrica' : 'Registrar métrica ambiental'} />
      <AvisoPermiso
        visible={id ? !puede.editarMetrica(usuario, registro) : !puede.crearMetrica(usuario)}
        texto="Solo el administrador o el guía dueño de la experiencia registran métricas."
      />
      <AlertaError error={error} mostrarCampos />
      <form className="card shadow-sm" onSubmit={guardar} noValidate style={{ maxWidth: 680 }}>
        <div className="card-body row">
          <div className="col-12">
            <Campo etiqueta="Experiencia" id="experiencia" error={errores.experiencia} requerido>
              <select id="experiencia" name="experiencia" className={claseControl(errores.experiencia, 'form-select')} value={formulario.experiencia} onChange={manejarCambio} disabled={!!id || cargandoExp}>
                <option value="">{cargandoExp ? 'Cargando...' : 'Seleccione...'}</option>
                {experiencias.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                {id && registro && !experiencias.some((x) => x.id === registro.experiencia) && (
                  <option value={registro.experiencia}>{registro.experiencia_nombre}</option>
                )}
              </select>
            </Campo>
          </div>
          <div className="col-md-6">
            <Campo etiqueta="Tipo" id="tipo" error={errores.tipo} requerido>
              <select id="tipo" name="tipo" className={claseControl(errores.tipo, 'form-select')} value={formulario.tipo} onChange={manejarCambio}>
                {Object.entries(TIPOS_METRICA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </Campo>
          </div>
          <div className="col-6 col-md-3">
            <Campo etiqueta="Valor" id="valor" error={errores.valor} requerido>
              <input id="valor" name="valor" type="number" min="0.01" step="0.01" className={claseControl(errores.valor)} value={formulario.valor} onChange={manejarCambio} />
            </Campo>
          </div>
          <div className="col-6 col-md-3">
            <Campo etiqueta="Fecha" id="fecha" error={errores.fecha} requerido>
              <input id="fecha" name="fecha" type="date" max={hoyISO()} className={claseControl(errores.fecha)} value={formulario.fecha} onChange={manejarCambio} />
            </Campo>
          </div>
          <div className="col-12">
            <Campo etiqueta="Notas" id="notas" error={errores.notas}>
              <input id="notas" name="notas" maxLength={200} className={claseControl(errores.notas)} value={formulario.notas} onChange={manejarCambio} />
            </Campo>
          </div>
        </div>
        <div className="card-footer bg-white d-flex gap-2">
          <button className="btn btn-primary" disabled={procesando}>{procesando ? 'Guardando...' : 'Guardar'}</button>
          <Link to="/metricas" className="btn btn-outline-secondary">Cancelar</Link>
        </div>
      </form>
    </>
  );
}
