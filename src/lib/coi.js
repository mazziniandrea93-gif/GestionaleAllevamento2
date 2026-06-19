// Calcolo del coefficiente di consanguineità (COI) per un ipotetico
// accoppiamento, col metodo dei percorsi di Wright.
//
// Il COI dei figli è uguale al coefficiente di parentela (kinship) tra i
// due genitori: per ogni antenato comune A si sommano i contributi di tutti
// i percorsi che collegano padre e madre passando per A:
//
//   contributo = (1/2)^(d1 + d2 + 1) * (1 + F_A)
//
// dove d1/d2 sono il numero di passaggi (archi) da padre/madre fino ad A.
// F_A (consanguineità dell'antenato) è approssimato a 0: con la genealogia
// disponibile (3 generazioni) non abbiamo dati più profondi. La stima è
// quindi un limite inferiore, adeguato come supporto alla pianificazione.

// Raccoglie ricorsivamente tutti i percorsi verso gli antenati di `node`,
// includendo il nodo stesso a profondità 0. Per ogni id tiene la lista
// delle profondità (un elemento per ciascun percorso distinto).
function collectPaths(node, depth, acc) {
  if (!node || !node.id) return
  if (!acc[node.id]) acc[node.id] = { depths: [], node }
  acc[node.id].depths.push(depth)
  collectPaths(node.mother, depth + 1, acc)
  collectPaths(node.father, depth + 1, acc)
}

// Calcola il COI dei figli di sire × dam (entrambi con genealogia annidata
// come restituita da db.getDogWithAncestors). Ritorna:
//   { coi: number (0..1), commonAncestors: [{ node, contribution }] }
export function computeCOI(sire, dam) {
  if (!sire || !dam) return { coi: 0, commonAncestors: [] }

  const sirePaths = {}
  const damPaths = {}
  collectPaths(sire, 0, sirePaths)
  collectPaths(dam, 0, damPaths)

  let coi = 0
  const commonAncestors = []

  for (const id in sirePaths) {
    if (!damPaths[id]) continue
    let contribution = 0
    for (const d1 of sirePaths[id].depths) {
      for (const d2 of damPaths[id].depths) {
        contribution += Math.pow(0.5, d1 + d2 + 1)
      }
    }
    coi += contribution
    commonAncestors.push({ node: sirePaths[id].node, contribution })
  }

  commonAncestors.sort((a, b) => b.contribution - a.contribution)
  return { coi, commonAncestors }
}

// Classificazione del rischio in base a soglie comuni in cinofilia.
export function coiRisk(coi) {
  const pct = coi * 100
  if (pct < 6.25) return { level: 'basso', color: 'green', label: 'Basso' }
  if (pct < 12.5) return { level: 'medio', color: 'amber', label: 'Medio' }
  return { level: 'alto', color: 'red', label: 'Alto' }
}
