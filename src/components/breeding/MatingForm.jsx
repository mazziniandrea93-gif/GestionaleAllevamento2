import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

export default function MatingForm({ mating, onClose, onSuccess }) {
  // Gestione date multiple (fino a 3)
  const initialDates = mating?.mating_dates || (mating?.mating_date ? [mating.mating_date] : [''])

  const [formData, setFormData] = useState({
    female_id: mating?.female_id || '',
    male_id: mating?.male_id || '',
    mating_dates: initialDates,
    expected_delivery: mating?.expected_delivery || '',
    notes: mating?.notes || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const { data: dogs = [], isLoading: dogsLoading } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => db.getDogs()
  })

  // Debug: vediamo cosa contengono i cani
  useEffect(() => {
    console.log('Cani caricati:', dogs)
    console.log('Femmine:', dogs.filter(dog =>
      dog.gender?.toLowerCase() === 'femmina' ||
      dog.gender?.toLowerCase() === 'f'
    ))
    console.log('Maschi:', dogs.filter(dog =>
      dog.gender?.toLowerCase() === 'maschio' ||
      dog.gender?.toLowerCase() === 'm'
    ))
  }, [dogs])

  // Filtra per gender (il campo nel database si chiama 'gender' non 'sex')
  const females = dogs.filter(dog =>
    dog.gender?.toLowerCase() === 'femmina' ||
    dog.gender?.toLowerCase() === 'f'
  )
  const males = dogs.filter(dog =>
    dog.gender?.toLowerCase() === 'maschio' ||
    dog.gender?.toLowerCase() === 'm'
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Filtra le date vuote
      const validDates = formData.mating_dates.filter(date => date !== '')

      if (validDates.length === 0) {
        throw new Error('Inserisci almeno una data di accoppiamento')
      }

      // Usa la prima data per il campo mating_date (compatibilità)
      const dataToSave = {
        female_id: formData.female_id,
        male_id: formData.male_id,
        mating_date: validDates[0],
        mating_dates: validDates, // Array di date
        expected_delivery: formData.expected_delivery,
        notes: formData.notes
      }

      if (mating) {
        await db.updateMating(mating.id, dataToSave)
      } else {
        await db.createMating(dataToSave)
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Errore salvataggio accoppiamento:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Calcola data presunta parto (63 giorni dopo prima data di accoppiamento)
  function calculateExpectedDelivery(dates) {
    const validDates = dates.filter(d => d !== '')
    if (validDates.length === 0) return ''

    // Usa la prima data
    const date = new Date(validDates[0])
    date.setDate(date.getDate() + 63)
    return date.toISOString().split('T')[0]
  }

  function handleMatingDateChange(index, value) {
    const newDates = [...formData.mating_dates]
    newDates[index] = value

    setFormData({
      ...formData,
      mating_dates: newDates,
      expected_delivery: calculateExpectedDelivery(newDates)
    })
  }

  function addMatingDate() {
    if (formData.mating_dates.length < 3) {
      setFormData({
        ...formData,
        mating_dates: [...formData.mating_dates, '']
      })
    }
  }

  function removeMatingDate(index) {
    const newDates = formData.mating_dates.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      mating_dates: newDates.length > 0 ? newDates : [''],
      expected_delivery: calculateExpectedDelivery(newDates.length > 0 ? newDates : [''])
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-6 flex justify-between items-center rounded-t-3xl">
          <h3 className="text-2xl font-black text-dark-900">
            {mating ? 'Modifica Accoppiamento' : 'Nuovo Accoppiamento'}
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

          {/* Femmina */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Femmina *
            </label>
            {dogsLoading ? (
              <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-gray-400">
                Caricamento cani...
              </div>
            ) : (
              <select
                value={formData.female_id}
                onChange={(e) => setFormData({ ...formData, female_id: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none transition"
                required
              >
                <option value="">Seleziona femmina ({females.length} disponibili)</option>
                {females.map((dog) => (
                  <option key={dog.id} value={dog.id}>
                    {dog.name} {dog.microchip ? `- ${dog.microchip}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Maschio */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Maschio *
            </label>
            {dogsLoading ? (
              <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-gray-400">
                Caricamento cani...
              </div>
            ) : (
              <select
                value={formData.male_id}
                onChange={(e) => setFormData({ ...formData, male_id: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none transition"
                required
              >
                <option value="">Seleziona maschio ({males.length} disponibili)</option>
                {males.map((dog) => (
                  <option key={dog.id} value={dog.id}>
                    {dog.name} {dog.microchip ? `- ${dog.microchip}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date accoppiamento (max 3) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-gray-700">
                Date Accoppiamento *
              </label>
              {formData.mating_dates.length < 3 && (
                <button
                  type="button"
                  onClick={addMatingDate}
                  className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi data
                </button>
              )}
            </div>
            <div className="space-y-3">
              {formData.mating_dates.map((date, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => handleMatingDateChange(index, e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none transition"
                    required={index === 0}
                  />
                  {formData.mating_dates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMatingDate(index)}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Puoi inserire fino a 3 date se l'accoppiamento è avvenuto in più giorni
            </p>
          </div>

          {/* Data presunta parto */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Data Presunta Parto
            </label>
            <input
              type="date"
              value={formData.expected_delivery}
              onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none transition"
            />
            <p className="text-sm text-gray-500 mt-2">
              Calcolato automaticamente a 63 giorni dall'accoppiamento
            </p>
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
              placeholder="Note sull'accoppiamento..."
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
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition disabled:opacity-50 shadow-lg shadow-primary-500/30"
            >
              {loading ? 'Salvataggio...' : mating ? 'Aggiorna' : 'Crea Accoppiamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

