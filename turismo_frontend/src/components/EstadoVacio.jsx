export default function EstadoVacio({ titulo = 'No hay registros', texto, children }) {
  return (
    <div className="text-center text-secondary py-5 px-3 estado-vacio">
      <div className="display-6 mb-2" aria-hidden="true">∅</div>
      <p className="fw-semibold mb-1">{titulo}</p>
      {texto && <p className="small mb-3">{texto}</p>}
      {children}
    </div>
  );
}
