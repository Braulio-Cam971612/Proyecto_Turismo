/** Paginacion basada en la respuesta del backend: pagina_actual, total_paginas, total_registros. */
export default function Paginacion({ pagina, totalPaginas, total, onCambiar }) {
  if (!total) return null;
  const inicio = Math.max(1, Math.min(pagina - 2, totalPaginas - 4));
  const paginas = [];
  for (let p = inicio; p <= Math.min(totalPaginas, inicio + 4); p += 1) paginas.push(p);

  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
      <small className="text-secondary">
        {total} registro{total === 1 ? '' : 's'} · página {pagina} de {totalPaginas}
      </small>
      {totalPaginas > 1 && (
        <nav aria-label="Paginación">
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${pagina <= 1 ? 'disabled' : ''}`}>
              <button type="button" className="page-link" onClick={() => onCambiar(pagina - 1)}>
                Anterior
              </button>
            </li>
            {paginas.map((p) => (
              <li key={p} className={`page-item ${p === pagina ? 'active' : ''}`}>
                <button type="button" className="page-link" onClick={() => onCambiar(p)}>
                  {p}
                </button>
              </li>
            ))}
            <li className={`page-item ${pagina >= totalPaginas ? 'disabled' : ''}`}>
              <button type="button" className="page-link" onClick={() => onCambiar(pagina + 1)}>
                Siguiente
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
