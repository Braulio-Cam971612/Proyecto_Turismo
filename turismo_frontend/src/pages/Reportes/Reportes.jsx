import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AlertaError from '../../components/AlertaError';
import Cargando from '../../components/Cargando';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import Paginacion from '../../components/Paginacion';
import { InsigniaEstado } from '../../components/Insignia';
import { distribucionesApi, reportesApi } from '../../api/recursos';
import { useListado } from '../../hooks/useListado';
import { TIPOS_METRICA } from '../../utils/constantes';
import { colones, fechaHora } from '../../utils/formato';

const REPORTES = {
  resumen: reportesApi.resumenSostenibilidad,
  top: reportesApi.experienciasTop,
  ingresos: reportesApi.ingresosPorExperiencia,
  ocupacion: reportesApi.ocupacionSalidas,
  demanda: reportesApi.hospedajesDemanda,
};

function Tarjeta({ titulo, error, children }) {
  return (
    <div className="card shadow-sm h-100">
      <div className="card-header bg-white fw-semibold">{titulo}</div>
      <div className="card-body">{error ? <AlertaError error={error} className="mb-0" /> : children}</div>
    </div>
  );
}

const SinDatos = () => <p className="text-secondary small mb-0">Sin datos todavía.</p>;

/** Reportes del administrador (GET /reportes/* y /distribuciones/). Otros roles reciben 403. */
export default function Reportes() {
  const [datos, setDatos] = useState(null);
  const [pagina, setPagina] = useState(1);
  const distribuciones = useListado(distribucionesApi.listar, { page: pagina, page_size: 8 });

  useEffect(() => {
    let vigente = true;
    const claves = Object.keys(REPORTES);
    Promise.allSettled(claves.map((c) => REPORTES[c]())).then((res) => {
      if (!vigente) return;
      const r = {};
      res.forEach((x, i) => {
        r[claves[i]] = x.status === 'fulfilled' ? { ok: x.value } : { error: x.reason };
      });
      setDatos(r);
    });
    return () => {
      vigente = false;
    };
  }, []);

  if (!datos) return <Cargando texto="Generando reportes..." />;
  const resumen = datos.resumen.ok;

  return (
    <>
      <EncabezadoPagina titulo="Reportes e ingresos" subtitulo="Consultas agregadas del backend. Exclusivo del administrador." />

      {datos.resumen.error ? (
        <AlertaError error={datos.resumen.error} />
      ) : (
        <div className="row g-3 mb-3">
          {[
            ['Ingresos cobrados', resumen.ingresos.total],
            ['Para la comunidad', resumen.ingresos.comunidad],
            ['Para la asociación', resumen.ingresos.asociacion],
          ].map(([t, v]) => (
            <div key={t} className="col-md-4">
              <div className="card shadow-sm tarjeta-indicador"><div className="card-body">
                <div className="small text-secondary">{t}</div>
                <div className="valor">{colones(v)}</div>
              </div></div>
            </div>
          ))}
        </div>
      )}

      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <Tarjeta titulo="Reservas por estado" error={datos.resumen.error}>
            {resumen?.reservas_por_estado?.length ? (
              <ul className="list-group list-group-flush">
                {resumen.reservas_por_estado.map((r) => (
                  <li key={r.estado} className="list-group-item d-flex justify-content-between"><InsigniaEstado estado={r.estado} /><strong>{r.total}</strong></li>
                ))}
              </ul>
            ) : <SinDatos />}
          </Tarjeta>
        </div>
        <div className="col-lg-6">
          <Tarjeta titulo="Métricas ambientales acumuladas" error={datos.resumen.error}>
            {resumen?.metricas_ambientales?.length ? (
              <ul className="list-group list-group-flush">
                {resumen.metricas_ambientales.map((m) => (
                  <li key={m.tipo} className="list-group-item d-flex justify-content-between"><span>{TIPOS_METRICA[m.tipo] || m.tipo}</span><strong>{Number(m.total).toLocaleString('es-CR')}</strong></li>
                ))}
              </ul>
            ) : <SinDatos />}
          </Tarjeta>
        </div>
        <div className="col-lg-6">
          <Tarjeta titulo="Experiencias mejor calificadas" error={datos.top.error}>
            {datos.top.ok?.length ? (
              <table className="table table-sm mb-0">
                <thead><tr><th>Experiencia</th><th>Guía</th><th className="text-end">Promedio</th><th className="text-end">Reseñas</th></tr></thead>
                <tbody>
                  {datos.top.ok.map((e) => (
                    <tr key={e.id}><td><Link to={`/experiencias/${e.id}`}>{e.nombre}</Link></td><td>{e.guia}</td><td className="text-end">{e.promedio}</td><td className="text-end">{e.total_resenas}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <SinDatos />}
          </Tarjeta>
        </div>
        <div className="col-lg-6">
          <Tarjeta titulo="Ingresos por experiencia (tours pagados)" error={datos.ingresos.error}>
            {datos.ingresos.ok?.length ? (
              <table className="table table-sm mb-0">
                <thead><tr><th>Experiencia</th><th className="text-end">Reservas pagadas</th><th className="text-end">Ingresos</th></tr></thead>
                <tbody>
                  {datos.ingresos.ok.map((e) => (
                    <tr key={e.id}><td>{e.nombre}</td><td className="text-end">{e.reservas_pagadas}</td><td className="text-end">{colones(e.ingresos)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <SinDatos />}
          </Tarjeta>
        </div>
        <div className="col-lg-6">
          <Tarjeta titulo="Ocupación de salidas" error={datos.ocupacion.error}>
            {datos.ocupacion.ok?.length ? (
              datos.ocupacion.ok.slice(0, 8).map((s) => (
                <div key={s.salida} className="mb-2">
                  <div className="d-flex justify-content-between small">
                    <span>{s.experiencia} · {fechaHora(s.fecha_hora)}</span>
                    <span>{s.ocupados}/{s.capacidad}</span>
                  </div>
                  <div className="progress" role="progressbar" aria-valuenow={s.ocupacion_pct} aria-valuemin="0" aria-valuemax="100" style={{ height: 8 }}>
                    <div className="progress-bar bg-success" style={{ width: `${Math.min(s.ocupacion_pct, 100)}%` }} />
                  </div>
                </div>
              ))
            ) : <SinDatos />}
          </Tarjeta>
        </div>
        <div className="col-lg-6">
          <Tarjeta titulo="Demanda de hospedajes" error={datos.demanda.error}>
            {datos.demanda.ok?.length ? (
              <table className="table table-sm mb-0">
                <thead><tr><th>Hospedaje</th><th>Anfitrión</th><th className="text-end">Reservas vigentes</th></tr></thead>
                <tbody>
                  {datos.demanda.ok.map((h) => (
                    <tr key={h.id}><td><Link to={`/hospedajes/${h.id}`}>{h.nombre}</Link></td><td>{h.anfitrion}</td><td className="text-end">{h.reservas_vigentes}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <SinDatos />}
          </Tarjeta>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-white fw-semibold">Distribución de ingresos por reserva pagada</div>
        <div className="card-body">
          <AlertaError error={distribuciones.error} />
          {distribuciones.cargando ? <Cargando /> : distribuciones.resultados.length === 0 && !distribuciones.error ? <SinDatos /> : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead><tr><th>Reserva</th><th>Fecha</th><th className="text-end">Total</th><th className="text-end">% comunidad</th><th className="text-end">Comunidad</th><th className="text-end">Asociación</th></tr></thead>
                <tbody>
                  {distribuciones.resultados.map((d) => (
                    <tr key={d.id}>
                      <td><Link to={`/reservas/${d.reserva}`}>#{d.reserva}</Link></td>
                      <td>{fechaHora(d.fecha)}</td>
                      <td className="text-end">{colones(d.monto_total)}</td>
                      <td className="text-end">{Number(d.porcentaje_comunidad)}%</td>
                      <td className="text-end">{colones(d.monto_comunidad)}</td>
                      <td className="text-end">{colones(d.monto_asociacion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Paginacion pagina={distribuciones.pagina} totalPaginas={distribuciones.totalPaginas} total={distribuciones.total} onCambiar={setPagina} />
        </div>
      </div>
    </>
  );
}
