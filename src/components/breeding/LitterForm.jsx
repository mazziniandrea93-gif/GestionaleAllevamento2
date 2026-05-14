import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { db } from '@/lib/supabase'

export default function LitterForm({ litter, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    mating_id: litter?.mating_id || '',
    birth_date: litter?.birth_date || '',
    total_puppies: litter?.total_puppies || '',
    males: litter?.males || '',
    females: litter?.females || '',
    deceased_puppies: litter?.deceased_puppies || '0',
    notes: litter?.notes || ''
  })
  const [matings, setMatings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadMatings()
  }, [])

  async function loadMatings() {
    try {
      const data = await db.getMatings()
      // Filtra accoppiamenti: mostra solo quelli senza cucciolata nata
      // Se in modifica, includi l'accoppiamento corrente
      const availableMatings = data.filter(m =>
        !m.litter_born || (litter && m.id === litter.mating_id)
      )
      setMatings(availableMatings)
    } catch (error) {
      console.error('Errore caricamento accoppiamenti:', error)
    }
  }

  const totalSet = formData.total_puppies !== ''
  const total = parseInt(formData.total_puppies) || 0
  const malesVal = parseInt(formData.males) || 0
  const femalesVal = parseInt(formData.females) || 0
  const deceasedVal = parseInt(formData.deceased_puppies) || 0
  const mfSum = malesVal + femalesVal
  const exceedsTotal = totalSet && mfSum > total

  // Cuccioli vivi: totale - deceduti (totale auto = maschi + femmine + deceduti)
  const effectiveTotal = totalSet ? total : mfSum + deceasedVal
  const alivePuppies = Math.max(0, effectiveTotal - deceasedVal)

  async function handleSubmit(e) {
    e.preventDefault()
    if (exceedsTotal) return
    setLoading(true)
    setError(null)

    try {
      const deceasedPuppies = deceasedVal
      // Se totale non inserito, calcolalo da maschi + femmine + deceduti
      const totalPuppies = totalSet ? total : mfSum + deceasedPuppies

      const litterData = {
        ...formData,
        total_puppies: totalPuppies,
        males: malesVal,
        females: femalesVal,
        deceased_puppies: deceasedPuppies,
        alive_puppies: Math.max(0, totalPuppies - deceasedPuppies)
      }

      if (litter) {
        // Modifica cucciolata esistente
        await db.updateLitter(litter.id, litterData)

        // Aggiorna anche l'accoppiamento se la data di nascita è cambiata
        if (litterData.mating_id && litterData.birth_date) {
          const mating = matings.find(m => m.id === litterData.mating_id)
          if (mating) {
            const matingDate = new Date(mating.mating_date)
            const birthDate = new Date(litterData.birth_date)
            const gestationDays = Math.floor((birthDate - matingDate) / (1000 * 60 * 60 * 24))

            await db.updateMating(mating.id, {
              litter_birth_date: litterData.birth_date,
              gestation_days: gestationDays,
              litter_born: true
            })
          }
        }
      } else {
        // Nuova cucciolata
        const newLitter = await db.createLitter(litterData)

        // Aggiorna l'accoppiamento associato
        if (litterData.mating_id && litterData.birth_date) {
          const mating = matings.find(m => m.id === litterData.mating_id)
          if (mating) {
            const matingDate = new Date(mating.mating_date)
            const birthDate = new Date(litterData.birth_date)
            const gestationDays = Math.floor((birthDate - matingDate) / (1000 * 60 * 60 * 24))

            await db.updateMating(mating.id, {
              litter_birth_date: litterData.birth_date,
              gestation_days: gestationDays,
              litter_born: true
            })

            // Marca come completato l'evento parto_stimato collegato
            const partoEvent = await db.getEventByMatingId(mating.id)
            if (partoEvent && !partoEvent.completed) {
              await db.updateEvent(partoEvent.id, { completed: true })
            }
          }
        }

        // Auto-crea i record individuali dei cuccioli
        if (totalPuppies > 0 && newLitter?.id) {
          const puppyRecords = []

          for (let i = 0; i < malesVal; i++) {
            puppyRecords.push({ gender: 'maschio', status: 'disponibile', litter_id: newLitter.id })
          }
          for (let i = 0; i < femalesVal; i++) {
            puppyRecords.push({ gender: 'femmina', status: 'disponibile', litter_id: newLitter.id })
          }
          // Deceduti: record separati senza genere specificato
          for (let i = 0; i < deceasedPuppies; i++) {
            puppyRecords.push({ status: 'deceduto', litter_id: newLitter.id })
          }
          // Eventuali rimanenti (totale > maschi + femmine + deceduti)
          const remaining = totalPuppies - malesVal - femalesVal - deceasedPuppies
          for (let i = 0; i < Math.max(0, remaining); i++) {
            puppyRecords.push({ status: 'disponibile', litter_id: newLitter.id })
          }

          await Promise.all(puppyRecords.map(p => db.createPuppy(p)))
        }
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Errore salvataggio cucciolata:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-6 flex justify-between items-center rounded-t-3xl">
          <h3 className="text-2xl font-black text-dark-900">
            {litter ? 'Modifica Cucciolata' : 'Nuova Cucciolata'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">
              {error}
            </div>
          )}

          {/* Accoppiamento */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Accoppiamento *
            </label>
            {matings.length === 0 && !litter ? (
              <div className="w-full px-4 py-3 border-2 border-yellow-200 bg-yellow-50 rounded-2xl text-yellow-700 text-sm">
                ⚠️ Nessun accoppiamento disponibile. Tutti gli accoppiamenti hanno già una cucciolata dichiarata.
              </div>
            ) : (
              <select
                value={formData.mating_id}
                onChange={(e) => setFormData({ ...formData, mating_id: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none transition"
                required
              >
                <option value="">Seleziona accoppiamento</option>
                {matings.map((mating) => (
                  <option key={mating.id} value={mating.id}>
                    {mating.female?.nickname || mating.female?.name} × {mating.male?.nickname || mating.male?.name} - {new Date(mating.mating_date).toLocaleDateString('it-IT')}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Data di nascita */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Data di Nascita *
            </label>
            <input
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none transition"
              required
            />
          </div>

          {/* Numeri cuccioli */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Totale Cuccioli
              </label>
              <input
                type="number"
                min="0"
                value={formData.total_puppies}
                onChange={(e) => setFormData({ ...formData, total_puppies: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none transition"
                placeholder="Auto"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Maschi
              </label>
              <input
                type="number"
                min="0"
                max={totalSet ? Math.max(0, total - femalesVal) : undefined}
                value={formData.males}
                onChange={(e) => setFormData({ ...formData, males: e.target.value })}
                className={`w-full px-4 py-3 border-2 rounded-2xl focus:outline-none transition ${exceedsTotal ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Femmine
              </label>
              <input
                type="number"
                min="0"
                max={totalSet ? Math.max(0, total - malesVal) : undefined}
                value={formData.females}
                onChange={(e) => setFormData({ ...formData, females: e.target.value })}
                className={`w-full px-4 py-3 border-2 rounded-2xl focus:outline-none transition ${exceedsTotal ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'}`}
              />
            </div>
          </div>
          {exceedsTotal && (
            <p className="text-sm text-red-600 font-semibold -mt-4">
              Maschi + femmine ({mfSum}) superano il totale ({total})
            </p>
          )}

          {/* Cuccioli deceduti e vivi */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Cuccioli Deceduti
              </label>
              <input
                type="number"
                min="0"
                max={formData.total_puppies || 0}
                value={formData.deceased_puppies}
                onChange={(e) => setFormData({ ...formData, deceased_puppies: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Cuccioli Vivi
              </label>
              <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl bg-gray-50 flex items-center">
                <span className="text-2xl font-black text-primary-600">{alivePuppies}</span>
                <span className="ml-2 text-sm text-gray-500">(calcolato automaticamente)</span>
              </div>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Note
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none transition resize-none"
              placeholder="Note aggiuntive sulla cucciolata..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading || exceedsTotal}
              className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition disabled:opacity-50 shadow-lg shadow-primary-500/30"
            >
              {loading ? 'Salvataggio...' : litter ? 'Aggiorna' : 'Crea Cucciolata'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

