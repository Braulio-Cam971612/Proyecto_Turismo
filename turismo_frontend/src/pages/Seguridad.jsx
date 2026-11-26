import { useState } from 'react';
import EncabezadoPagina from '../components/EncabezadoPagina';
import { solicitudDiagnostico } from '../api/cliente';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constantes';

/**
 * Evidencia de la seccion 5.2: un acceso exitoso, un intento sin autenticacion (401)
 * y un intento autenticado sin permisos (403), ejecutados contra el backend real.
 */
const PRUEBAS = [
  {
    id: 'exito',
    titulo: 'Acceso autenticado permitido',
    esperado: '200',
    descripcion: 'GET /auth/me/ con el token de la sesión actual.',
    ruta: '/auth/me/',
    conToken: true,
  },
  {
    id: 'sin-token',
    titulo: 'Intento sin autenticación',
    esperado: '401',
    descripcion: 'GET /experiencias/ sin enviar el encabezado Authorization.',
    ruta: '/experiencias/',
    conToken: false,
  },
  {
    id: 'sin-permiso',
    titulo: 'Intento autenticado sin permisos',
    esperado: '403 (si no es administrador)',
    descripcion: 'GET /usuarios/ con token. Solo el rol ADMIN puede listar usuarios.',
    ruta: '/usuarios/',
    conToken: true,
  },
  {
    id: 'reporte',
    titulo: 'Reporte exclusivo del administrador',
    esperado: '403 (si no es administrador)',
    descripcion: 'GET /reportes/resumen-sostenibilidad/ con token.',
    ruta: '/reportes/resumen-sostenibilidad/',
    conToken: true,
  },
];

const colorEstado = (s) => (s >= 200 && s < 300 ? 'success' : s === 401 || s === 403 ? 'warning' : 'danger');

export default function Seguridad() {
  const { usuario } = useAuth();
  const [resultados, setResultados] = useState({});
  const [ejecutando, setEjecutando] = useState(false);

  async function ejecutar(prueba) {
    const r = await solicitudDiagnostico(prueba.ruta, { conToken: prueba.conToken });
    setResultados((actual) => ({ ...actual, [prueba.id]: r }));
  }

  async function ejecutarTodas() {
    setEjecutando(true);
    for (const prueba of PRUEBAS) {
      await ejecutar(prueba);
    }
    setEjecutando(false);
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Prueba de permisos"
        subtitulo={`Solicitudes reales al backend con el perfil actual: ${ROLES[usuario.rol] || usuario.rol}. Inicie sesión con otro rol para comparar.`}
      >
        <button type="button" className="btn btn-primary" onClick={ejecutarTodas} disabled={ejecutando}>
          {ejecutando ? 'Ejecutando...' : 'Ejecutar todas'}
        </button>
      </EncabezadoPagina>

      <div className="alert alert-light border small">
        El ocultamiento de botones en la interfaz es solo comodidad. La autorización la decide Django:
        <code className="mx-1">TokenAuthentication</code> responde 401 sin token válido y cada vista responde 403
        si el rol no tiene permiso. El logout llama a <code>POST /auth/logout/</code>, que elimina el token en el servidor.
      </div>

      <div className="row g-3">
        {PRUEBAS.map((p) => {
          const r = resultados[p.id];
          return (
            <div className="col-lg-6" key={p.id}>
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <h2 className="h6 mb-1">{p.titulo}</h2>
                      <p className="small text-secondary mb-2">{p.descripcion}</p>
                    </div>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => ejecutar(p)}>
                      Probar
                    </button>
                  </div>
                  <p className="small mb-2">
                    Esperado: <strong>{p.esperado}</strong>
                  </p>
                  {r && (
                    <>
                      <div className="small mb-1">
                        <span className={`badge text-bg-${colorEstado(r.status)} me-2`}>HTTP {r.status}</span>
                        <code>
                          {r.metodo} {r.url}
                        </code>
                        <span className="ms-2 text-secondary">{r.conToken ? 'con token' : 'sin token'}</span>
                      </div>
                      <pre className="respuesta mb-0">{JSON.stringify(r.cuerpo, null, 2)}</pre>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
