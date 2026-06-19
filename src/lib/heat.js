// Stima della finestra fertile a partire dalla data di inizio del calore.
//
// Riferimento veterinario indicativo per la cagna: l'estro fertile va
// all'incirca dal 9° al 15° giorno dall'inizio del calore, con ovulazione
// e giorni ottimali di monta intorno all'11°-13° giorno. Sono stime medie:
// per la copertura ideale serve comunque il monitoraggio del progesterone.

const FERTILE_START_DAY = 9
const FERTILE_END_DAY = 15
const OPTIMAL_START_DAY = 11
const OPTIMAL_END_DAY = 13

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Ritorna la finestra fertile stimata per un calore che inizia in `heatStart`
// (Date o stringa data). Null se la data non è valida.
export function fertileWindow(heatStart) {
  if (!heatStart) return null
  const start = heatStart instanceof Date ? heatStart : new Date(heatStart)
  if (isNaN(start.getTime())) return null

  return {
    start: addDays(start, FERTILE_START_DAY),
    end: addDays(start, FERTILE_END_DAY),
    optimalStart: addDays(start, OPTIMAL_START_DAY),
    optimalEnd: addDays(start, OPTIMAL_END_DAY),
  }
}
