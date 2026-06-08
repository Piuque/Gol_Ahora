function fechaLocalHoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function slotHorarioYaPaso(fecha, horaInicio) {
  if (fecha !== fechaLocalHoy()) return false;
  const [hh, mm] = String(horaInicio).substring(0, 5).split(':').map(Number);
  const now = new Date();
  return hh < now.getHours() || (hh === now.getHours() && mm <= now.getMinutes());
}

function normalizarHoraFinCliente(horaFin) {
  const hf = String(horaFin).substring(0, 5);
  if (hf === '00:00') return '23:59:59';
  return hf.length === 5 ? `${hf}:00` : horaFin;
}
