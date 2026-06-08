const TZ_ARGENTINA = 'America/Argentina/Buenos_Aires';

function partesFechaHoraArgentina(fecha = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_ARGENTINA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(fecha);

  const get = (type) => parts.find(p => p.type === type)?.value || '00';
  return {
    fecha: `${get('year')}-${get('month')}-${get('day')}`,
    hora: parseInt(get('hour'), 10),
    minuto: parseInt(get('minute'), 10)
  };
}

function fechaHoyArgentina() {
  return partesFechaHoraArgentina().fecha;
}

function turnoYaPasoArgentina(fecha, horaInicio) {
  const hoy = fechaHoyArgentina();
  if (fecha !== hoy) return fecha < hoy;
  const [hh, mm] = String(horaInicio).substring(0, 5).split(':').map(Number);
  const { hora, minuto } = partesFechaHoraArgentina();
  return hh < hora || (hh === hora && mm <= minuto);
}

function normalizarHoraFin(horaFin) {
  const hf = String(horaFin).substring(0, 5);
  if (hf === '00:00') return '23:59:59';
  return hf.length === 5 ? `${hf}:00` : horaFin;
}

function normalizarHoraInicio(horaInicio) {
  const hi = String(horaInicio).substring(0, 5);
  return hi.length === 5 ? `${hi}:00` : horaInicio;
}

function turnosSeSolapan(a, b) {
  const ai = normalizarHoraInicio(a.hora_inicio);
  const af = normalizarHoraFin(a.hora_fin);
  const bi = normalizarHoraInicio(b.hora_inicio);
  const bf = normalizarHoraFin(b.hora_fin);
  return ai < bf && af > bi;
}

module.exports = {
  TZ_ARGENTINA,
  fechaHoyArgentina,
  turnoYaPasoArgentina,
  normalizarHoraFin,
  normalizarHoraInicio,
  turnosSeSolapan
};
