import { Link } from 'react-router-dom';

export default function NoEncontrado() {
  return (
    <div className="text-center py-5">
      <p className="display-4 fw-bold text-secondary">404</p>
      <p className="lead">La pantalla que busca no existe.</p>
      <Link to="/" className="btn btn-primary">
        Volver al dashboard
      </Link>
    </div>
  );
}
