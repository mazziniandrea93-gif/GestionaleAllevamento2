import { useState } from 'react'
import { X, Syringe, Activity, Scissors, FileText, Pill, HelpCircle, Plus, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import toast from 'react-hot-toast'

const DEFAULT_FASE = { dosaggio: '', frequenza: '', giorni: '' }

const FREQUENZE = [
  '1 volta al giorno',
  '2 volte al giorno',
  '3 volte al giorno',
  'Ogni 8 ore',
  'Ogni 12 ore',
  '1 volta a settimana',
  'Al bisogno',
]

// Salva le fasi come JSON nel campo notes: {"fasi":[...],"extra":"..."}
function buildTherapyNotes(fasi, extra) {
  const payload = { fasi, extra: extra || '' }
  return JSON.stringify(payload)
}

// Legge le note: supporta sia il nuovo formato JSON che il vecchio testo
function parseTherapyNotes(notes) {
  if (!notes) return { fasi: [{ ...DEFAULT_FASE }], extra: '' }
  try {
    const parsed = JSON.parse(notes)
    if (parsed.fasi) {
      return {
        fasi: parsed.fasi.length > 0 ? parsed.fasi : [{ ...DEFAULT_FASE }],
        extra: parsed.extra || '',
      }
    }
  } catch (_) { /* vecchio formato testo */ }
  // Fallback: vecchio formato testo → metti tutto in extra
  return { fasi: [{ ...DEFAULT_FASE }], extra: notes }
}

// Calcola data fine aggiungendo i giorni totali alla data inizio
function calcEndDate(startDate, fasi) {
  if (!startDate) return ''
  const totalDays = fasi.reduce((sum, f) => sum + (parseInt(f.giorni) || 0), 0)
  if (totalDays === 0) return ''
  const d = new Date(startDate)
  d.setDate(d.getDate() + totalDays)
  return d.toISOString().split('T')[0]
}

export default function HealthRecordForm({ record, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)

  const isTerapiaRecord = record?.record_type === 'terapia' || record?.record_type === 'trattamento'
  const parsedNotes = isTerapiaRecord ? parseTherapyNotes(record?.notes) : { fasi: [{ ...DEFAULT_FASE }], extra: '' }

  const [formData, setFormData] = useState({
    dog_id: record?.dog_id || '',
    record_type: (record?.record_type === 'trattamento' ? 'terapia' : record?.record_type) || 'vaccinazione',
    description: record?.description || '',
    record_date: record?.record_date || new Date().toISOString().split('T')[0],
    veterinarian: record?.veterinarian || '',
    cost: record?.cost || '',
    next_appointment_date: record?.next_appointment_date || '',
    extra_notes: parsedNotes.extra,
  })

  const [fasi, setFasi] = useState(parsedNotes.fasi)

  const { data: dogs = [] } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => db.getDogs(),
  })

  const recordTypes = [
    { value: 'vaccinazione', label: 'Vaccinazione', icon: Syringe, color: '#3b82f6' },
    { value: 'visita', label: 'Visita', icon: Activity, color: '#10b981' },
    { value: 'intervento', label: 'Intervento', icon: Scissors, color: '#ef4444' },
    { value: 'esame', label: 'Esame', icon: FileText, color: '#a855f7' },
    { value: 'terapia', label: 'Terapia', icon: Pill, color: '#f97316' },
    { value: 'altro', label: 'Altro', icon: HelpCircle, color: '#6b7280' },
  ]

  const isTer = formData.record_type === 'terapia'

  // Calcola automaticamente la data fine quando cambiano fasi o data inizio
  const autoEndDate = isTer ? calcEndDate(formData.record_date, fasi) : ''

  const totalGiorni = fasi.reduce((sum, f) => sum + (parseInt(f.giorni) || 0), 0)

  // Aggiorna una singola fase
  const updateFase = (index, field, value) => {
    setFasi(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f))
  }

  const addFase = () => setFasi(prev => [...prev, { ...DEFAULT_FASE }])

  const removeFase = (index) => {
    if (fasi.length === 1) return
    setFasi(prev => prev.filter((_, i) => i !== index))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const notesValue = isTer
        ? buildTherapyNotes(fasi, formData.extra_notes)
        : formData.extra_notes || null

      // Per terapia usa la data calcolata automaticamente (se disponibile) o quella manuale
      const endDate = isTer
        ? (autoEndDate || formData.next_appointment_date || null)
        : formData.next_appointment_date || null

      const dataToSubmit = {
        dog_id: formData.dog_id,
        record_type: formData.record_type,
        description: formData.description,
        record_date: formData.record_date,
        veterinarian: formData.veterinarian || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        next_appointment_date: endDate,
        notes: notesValue,
      }

      let savedRecord
      if (record?.id) {
        savedRecord = await db.updateHealthRecord(record.id, dataToSubmit)
        toast.success('Record sanitario aggiornato')
      } else {
        savedRecord = await db.createHealthRecord(dataToSubmit)
        toast.success('Record sanitario aggiunto con successo')
      }

      // Auto-crea spesa se c'è un costo (solo nuovi record)
      if (!record?.id && dataToSubmit.cost && dataToSubmit.cost > 0) {
        try {
          const expenseLabels = { vaccinazione: 'Vaccino', visita: 'Visita', intervento: 'Intervento', esame: 'Esame', terapia: 'Terapia', altro: 'Spesa sanitaria' }
          await db.createExpense({
            dog_id: dataToSubmit.dog_id,
            category: 'veterinario',
            description: `${expenseLabels[formData.record_type] || 'Spesa sanitaria'}: ${dataToSubmit.description}`,
            amount: dataToSubmit.cost,
            expense_date: dataToSubmit.record_date,
            payment_method: null,
            notes: `Generata automaticamente da evento di salute${dataToSubmit.veterinarian ? ` - ${dataToSubmit.veterinarian}` : ''}`,
          })
        } catch (err) { console.warn('Errore creazione spesa:', err) }
      }

      // Auto-crea evento calendario per data futura
      if (!record?.id && dataToSubmit.next_appointment_date) {
        const futureDate = new Date(dataToSubmit.next_appointment_date)
        const now = new Date(); now.setHours(0, 0, 0, 0)
        if (futureDate >= now) {
          try {
            const eventTitles = {
              vaccinazione: `Richiamo vaccino: ${dataToSubmit.description}`,
              visita: `Visita: ${dataToSubmit.description}`,
              terapia: `Fine terapia: ${dataToSubmit.description}`,
              altro: dataToSubmit.description,
            }
            const faseSummary = isTer && fasi.some(f => f.dosaggio)
              ? fasi.map(f => `${f.dosaggio}${f.frequenza ? ' · ' + f.frequenza : ''}${f.giorni ? ' × ' + f.giorni + 'gg' : ''}`).join(' → ')
              : null
            await db.createEvent({
              dog_ids: [dataToSubmit.dog_id],
              event_type: 'veterinario',
              title: eventTitles[formData.record_type] || dataToSubmit.description,
              description: faseSummary,
              event_date: dataToSubmit.next_appointment_date,
              completed: false,
              reminder_days: 3,
            })
            toast.success('Evento aggiunto al calendario')
          } catch (err) { console.warn('Errore creazione evento:', err) }
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-3xl">
          <h3 className="text-2xl font-black text-dark-900">
            {record ? 'Modifica Record Sanitario' : 'Nuovo Evento di Salute'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
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
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl font-bold transition ${isSelected ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    style={isSelected ? { backgroundColor: type.color } : {}}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Informazioni base */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-gray-900">Informazioni</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cane *</label>
                <select
                  name="dog_id"
                  value={formData.dog_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                >
                  <option value="">Seleziona un cane</option>
                  {dogs.map((dog) => (
                    <option key={dog.id} value={dog.id}>{dog.name} - {dog.breed}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {isTer ? 'Data Inizio *' : 'Data Evento *'}
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
                  {isTer ? 'Prescritto da' : 'Veterinario'}
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Costo (€)</label>
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

              {/* Data fine / prossimo appuntamento — solo per non-terapia */}
              {!isTer && (formData.record_type === 'vaccinazione' || formData.record_type === 'visita') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Prossimo Appuntamento</label>
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

            {/* Nome farmaco */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {isTer ? 'Nome Farmaco *' : 'Descrizione *'}
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                placeholder={
                  isTer ? 'Es: Amoxicillina, Metacam, Frontline...' :
                  formData.record_type === 'vaccinazione' ? 'Es: Vaccino antirabbica' :
                  formData.record_type === 'visita' ? 'Es: Visita di controllo annuale' :
                  formData.record_type === 'intervento' ? 'Es: Sterilizzazione' :
                  formData.record_type === 'esame' ? 'Es: Esame del sangue' :
                  'Descrivi l\'evento'
                }
              />
            </div>

            {/* Fasi terapia */}
            {isTer && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900">Schema posologico</h4>
                  {totalGiorni > 0 && (
                    <span className="text-sm font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                      {totalGiorni} giorni totali
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {fasi.map((fase, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-orange-50 rounded-2xl border-2 border-orange-100"
                    >
                      <span className="text-xs font-black text-orange-400 w-5 shrink-0">
                        {index + 1}
                      </span>

                      <input
                        type="text"
                        value={fase.dosaggio}
                        onChange={(e) => updateFase(index, 'dosaggio', e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 rounded-xl border-2 border-gray-200 bg-white text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                        placeholder="Dose (es: 1 cpr, 5mg)"
                      />

                      <select
                        value={fase.frequenza}
                        onChange={(e) => updateFase(index, 'frequenza', e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 rounded-xl border-2 border-gray-200 bg-white text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                      >
                        <option value="">Frequenza</option>
                        {FREQUENZE.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>

                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          value={fase.giorni}
                          onChange={(e) => updateFase(index, 'giorni', e.target.value)}
                          min="1"
                          className="w-14 px-2 py-2 rounded-xl border-2 border-gray-200 bg-white text-sm text-center focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                          placeholder="gg"
                        />
                        <span className="text-xs text-gray-500 font-semibold">gg</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFase(index)}
                        disabled={fasi.length === 1}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addFase}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-orange-300 text-orange-600 text-sm font-bold hover:bg-orange-50 transition w-full justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi fase
                </button>

                {/* Data fine calcolata automaticamente */}
                {autoEndDate && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-2xl border-2 border-green-100 text-sm">
                    <span className="text-green-600 font-semibold">Fine terapia calcolata:</span>
                    <span className="text-green-700 font-black">
                      {new Date(autoEndDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-green-500 ml-auto">Evento aggiunto al calendario</span>
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Note</label>
              <textarea
                name="extra_notes"
                value={formData.extra_notes}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition resize-none"
                placeholder="Note aggiuntive..."
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
