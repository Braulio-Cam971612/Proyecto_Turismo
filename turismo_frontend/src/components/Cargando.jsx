export default function Cargando({ texto = 'Cargando datos...' }) {
  return (
    <div className="d-flex align-items-center gap-2 text-secondary py-4 justify-content-center" role="status">
      <div className="spinner-border spinner-border-sm" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}
