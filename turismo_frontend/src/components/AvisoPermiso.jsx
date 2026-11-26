/** Aviso informativo: el rol no deberia poder hacer la operacion. El servidor decide (403). */
export default function AvisoPermiso({ visible, texto }) {
  if (!visible) return null;
  return (
    <div className="alert alert-info small" role="note">
      {texto || 'Su rol normalmente no puede realizar esta operación.'} Si la envía, el servidor responderá{' '}
      <strong>403 Prohibido</strong>: la autorización real la aplica Django, no la interfaz.
    </div>
  );
}
