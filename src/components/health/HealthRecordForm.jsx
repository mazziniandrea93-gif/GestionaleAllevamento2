import { useState } from 'react'
import { X, Syringe, Activity, Scissors, FileText, Pill, HelpCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function HealthRecordForm({ record, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    dog_id: record?.dog_id || '',
    record_type: record?.record_type || 'vaccinazione',
    description: record?.description || '',
    record_date: record?.record_date || new Date().toISOString().split('T')[0],
    veterinarian: record?.veterinarian || '',
    cost: record?.cost || '',
    next_appointment_date: record?.next_appointment_date || '',
    notes: record?.notes || '',
  })

  // Fetch dogs per il dropdown
  const { data: dogs = [] } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => db.getDogs(),
  })

  const recordTypes = [
    { value: 'vaccinazione', label: 'Vaccinazione', icon: Syringe, color: 'blue' },
    { value: 'visita', label: 'Visita', icon: Activity, color: 'green' },
    { value: 'intervento', label: 'Intervento', icon: Scissors, color: 'red' },
    { value: 'esame', label: 'Esame', icon: FileText, color: 'purple' },
    { value: 'trattamento', label: 'Trattamento', icon: Pill, color: 'orange' },
    { value: 'altro', label: 'Altro', icon: HelpCircle, color: 'gray' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const dataToSubmit = {
        dog_id: formData.dog_id,
        record_type: formData.record_type,
        description: formData.description,
        record_date: formData.record_date,
        veterinarian: formData.veterinarian || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        next_appointment_date: formData.next_appointment_date || null,
        notes: formData.notes || null,
      }

      if (record?.id) {
        // Update (da implementare se necessario)
        toast.error('Modifica record non ancora implementata')
      } else {
        const healthRecord = await db.createHealthRecord(dataToSubmit)
        toast.success('Record sanitario aggiunto con successo')

        // Se c'è un costo, crea automaticamente una spesa in finanza
        if (dataToSubmit.cost && dataToSubmit.cost > 0) {
          try {
            await db.createExpense({
              dog_id: dataToSubmit.dog_id,
              category: 'veterinario',
              description: `${formData.record_type === 'vaccinazione' ? 'Vaccino' : 
                           formData.record_type === 'visita' ? 'Visita' : 
                           formData.record_type === 'intervento' ? 'Intervento' : 
                           formData.record_type === 'esame' ? 'Esame' : 
                           formData.record_type === 'trattamento' ? 'Trattamento' : 
                           'Spesa sanitaria'}: ${dataToSubmit.description}`,
              amount: dataToSubmit.cost,
              expense_date: dataToSubmit.record_date,
              payment_method: null,
              notes: `Spesa generata automaticamente da evento di salute${dataToSubmit.veterinarian ? ` - ${dataToSubmit.veterinarian}` : ''}`,
            })
          } catch (expenseError) {
            console.warn('Errore durante la creazione della spesa:', expenseError)
            // Non blocchiamo il flusso se la spesa fallisce
          }
        }
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving health record:', error)
      toast.error(error.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const selectedType = recordTypes.find(t => t.value === formData.record_type)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-3xl">
          <h3 className="text-2xl font-black text-dark-900">
            {record ? 'Modifica Record Sanitario' : 'Nuovo Evento di Salute'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tipo Evento */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-gray-900">Tipo di Evento</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {recordTypes.map((type) => {
                const Icon = type.icon
                const isSelected = formData.record_type === type.value
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, record_type: type.value }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl font-bold transition ${
                      isSelected
                        ? `bg-${type.color}-500 text-white`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={isSelected ? {
                      backgroundColor: {
                        blue: '#3b82f6',
                        green: '#10b981',
                        red: '#ef4444',
                        purple: '#a855f7',
                        orange: '#f97316',
                        gray: '#6b7280'
                      }[type.color]
                    } : {}}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Informazioni Base */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-gray-900">Informazioni</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cane *
                </label>
                <select
                  name="dog_id"
                  value={formData.dog_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                >
                  <option value="">Seleziona un cane</option>
                  {dogs.map((dog) => (
                    <option key={dog.id} value={dog.id}>
                      {dog.name} - {dog.breed}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Data Evento *
                </label>
                <input
                  type="date"
                  name="record_date"
                  value={formData.record_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Veterinario
                </label>
                <input
                  type="text"
                  name="veterinarian"
                  value={formData.veterinarian}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  placeholder="Dr. Rossi"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Costo (€)
                </label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  placeholder="50.00"
                />
              </div>

              {(formData.record_type === 'vaccinazione' || formData.record_type === 'visita') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Prossimo Appuntamento
                  </label>
                  <input
                    type="date"
                    name="next_appointment_date"
                    value={formData.next_appointment_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descrizione *
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                placeholder={`Es: ${
                  formData.record_type === 'vaccinazione' ? 'Vaccino antirabbica' :
                  formData.record_type === 'visita' ? 'Visita di controllo annuale' :
                  formData.record_type === 'intervento' ? 'Sterilizzazione' :
                  formData.record_type === 'esame' ? 'Esame del sangue' :
                  formData.record_type === 'trattamento' ? 'Terapia antibiotica' :
                  'Descrivi l\'evento'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Note
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition resize-none"
                placeholder="Inserisci eventuali note aggiuntive..."
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvataggio...' : record ? 'Aggiorna' : 'Aggiungi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

