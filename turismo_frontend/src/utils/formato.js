const formatoColones = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
});

export function colones(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? formatoColones.format(numero) : '—';
}

export function fechaHora(iso) {
  if (!iso) return '—';
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime())
    ? iso
    : fecha.toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' });
}

/** "2026-12-01" -> "1 dic 2026" sin desfase de zona horaria */
export function fecha(iso) {
  if (!iso) return '—';
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return iso;
  return new Date(a, m - 1, d).toLocaleDateString('es-CR', { dateStyle: 'medium' });
}

const dos = (n) => String(n).padStart(2, '0');

/** ISO del servidor -> valor para <input type="datetime-local"> en hora local */
export function aDatetimeLocal(iso) {
  if (!iso) return '';
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return '';
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}T${dos(f.getHours())}:${dos(f.getMinutes())}`;
}

/** Fecha local de hoy en formato AAAA-MM-DD (para atributos min/max de inputs date) */
export function hoyISO(diasExtra = 0) {
  const f = new Date();
  f.setDate(f.getDate() + diasExtra);
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`;
}

export function noches(entrada, salida) {
  if (!entrada || !salida) return 0;
  const ms = new Date(`${salida}T00:00:00`) - new Date(`${entrada}T00:00:00`);
  return ms > 0 ? Math.round(ms / 86400000) : 0;
}

export function estrellas(n) {
  const valor = Math.max(0, Math.min(5, Number(n) || 0));
  return '★'.repeat(valor) + '☆'.repeat(5 - valor);
}
