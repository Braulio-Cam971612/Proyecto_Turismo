/** Contenedor de filtros de un listado. Los filtros se envian al backend como parametros de consulta. */
export default function TarjetaFiltros({ onLimpiar, children }) {
  return (
    <div className="card shadow-sm mb-3">
      <div className="card-body">
        <div className="row g-2 align-items-end">
          {children}
          {onLimpiar && (
            <div className="col-12 col-md-auto ms-md-auto">
              <button type="button" className="btn btn-outline-secondary w-100" onClick={onLimpiar}>
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
