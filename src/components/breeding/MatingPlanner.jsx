import { useState } from 'react'
import { X, Calculator, AlertTriangle, CheckCircle2, Dna } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import { computeCOI, coiRisk } from '@/lib/coi'

const RISK_STYLES = {
  green: { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', Icon: CheckCircle2 },
  amber: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', Icon: AlertTriangle },
  red:   { text: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200',   Icon: AlertTriangle },
}

export default function MatingPlanner({ onClose }) {
  const [maleId, setMaleId] = useState('')
  const [femaleId, setFemaleId] = useState('')

  const { data: dogs = [] } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => db.getDogs(),
  })

  const males = dogs.filter(d => d.gender === 'maschio')
  const females = dogs.filter(d => d.gender === 'femmina')

  const { data: sire } = useQuery({
    queryKey: ['ancestors', maleId],
    queryFn: () => db.getDogWithAncestors(maleId),
    enabled: !!maleId,
  })
  const { data: dam } = useQuery({
    queryKey: ['ancestors', femaleId],
    queryFn: () => db.getDogWithAncestors(femaleId),
    enabled: !!femaleId,
  })

  const ready = !!sire && !!dam
  const { coi, commonAncestors } = ready ? computeCOI(sire, dam) : { coi: 0, commonAncestors: [] }
  const coiPct = coi * 100
  const risk = coiRisk(coi)
  const style = RISK_STYLES[risk.color]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-3xl">
          <h3 className="text-2xl font-black text-dark-900 flex items-center gap-2">
            <Dna className="w-6 h-6 text-primary-500" />
            Simula accoppiamento
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Selezione coppia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Maschio ♂</label>
              <select
                value={maleId}
                onChange={(e) => setMaleId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
              >
                <option value="">Seleziona maschio</option>
                {males.map(d => (
                  <option key={d.id} value={d.id}>{d.nickname || d.name}{d.breed ? ` — ${d.breed}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Femmina ♀</label>
              <select
                value={femaleId}
                onChange={(e) => setFemaleId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
              >
                <option value="">Seleziona femmina</option>
                {females.map(d => (
                  <option key={d.id} value={d.id}>{d.nickname || d.name}{d.breed ? ` — ${d.breed}` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {!ready && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Calculator className="w-12 h-12 mb-3" />
              <p className="font-semibold">Seleziona un maschio e una femmina per stimare il COI</p>
            </div>
          )}

          {ready && (
            <>
              {/* Risultato COI */}
              <div className={`rounded-2xl border-2 ${style.border} ${style.bg} p-6 text-center`}>
                <p className="text-sm font-bold text-gray-500 uppercase mb-1">Coefficiente di consanguineità</p>
                <p className={`text-5xl font-black ${style.text}`}>{coiPct.toFixed(2)}%</p>
                <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full text-sm font-bold ${style.text}`}>
                  <style.Icon className="w-4 h-4" />
                  Rischio {risk.label}
                </div>
              </div>

              {/* Antenati comuni */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">
                  Antenati comuni {commonAncestors.length > 0 && `(${commonAncestors.length})`}
                </h4>
                {commonAncestors.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nessun antenato comune nelle 3 generazioni disponibili: outcross.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {commonAncestors.map(({ node, contribution }) => (
                      <div key={node.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="min-w-0">
                          <span className="font-bold text-gray-800">{node.nickname || node.name || 'Senza nome'}</span>
                          {node.breed && <span className="text-xs text-gray-400 block truncate">{node.breed}</span>}
                        </div>
                        <span className="text-sm font-bold text-primary-600 shrink-0">
                          +{(contribution * 100).toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400">
                Stima calcolata sulle 3 generazioni presenti in anagrafica (metodo di Wright,
                consanguineità degli antenati assunta a 0). È un limite inferiore: con pedigree
                più profondi il valore reale può essere più alto.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
