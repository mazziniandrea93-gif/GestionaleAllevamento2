import { useState } from 'react'
import { X, Dog } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function PuppyForm({ puppy, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [addDogPrompt, setAddDogPrompt] = useState(null) // { name, gender, microchip, birth_date }
  // buyer_contact è salvato come "email|telefono"
  const [buyerEmailRaw, buyerPhoneRaw] = (puppy?.buyer_contact || '').split('|')

  const [formData, setFormData] = useState({
    litter_id: puppy?.litter_id || '',
    name: puppy?.name || '',
    gender: puppy?.gender || 'maschio',
    color: puppy?.color || '',
    birth_weight: puppy?.birth_weight || '',
    status: puppy?.status || 'disponibile',
    microchip: puppy?.microchip || '',
    sale_price: puppy?.sale_price || '',
    buyer_name: puppy?.buyer_name || '',
    buyer_email: buyerEmailRaw?.trim() || '',
    buyer_phone: buyerPhoneRaw?.trim() || '',
    sale_date: puppy?.sale_date || '',
    deposit_amount: puppy?.deposit_amount || '',
    deposit_date: puppy?.deposit_date || '',
    balance_paid: puppy?.balance_paid || false,
    notes: puppy?.notes || '',
  })

  // Residuo da incassare: prezzo - acconto (mai negativo)
  const remainingBalance = Math.max(
    0,
    (parseFloat(formData.sale_price) || 0) - (parseFloat(formData.deposit_amount) || 0)
  )

  // Fetch litters per il dropdown
  const { data: litters = [] } = useQuery({
    queryKey: ['litters'],
    queryFn: () => db.getLitters(),
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Converti stringhe vuote in null per i campi numerici
      // Combina email e telefono in buyer_contact come "email|telefono"
      const buyerContact = [formData.buyer_email.trim(), formData.buyer_phone.trim()]
        .filter(Boolean).join('|') || null

      const { buyer_email, buyer_phone, ...rest } = formData
      const dataToSubmit = {
        ...rest,
        buyer_contact: buyerContact,
        litter_id: formData.litter_id || null,
        birth_weight: formData.birth_weight ? parseFloat(formData.birth_weight) : null,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : null,
        sale_date: formData.sale_date || null,
        deposit_date: formData.deposit_date || null,
        microchip: formData.microchip || null,
      }

      let savedPuppy
      if (puppy?.id) {
        savedPuppy = await db.updatePuppy(puppy.id, dataToSubmit)
        toast.success('Cucciolo aggiornato con successo')
      } else {
        savedPuppy = await db.createPuppy(dataToSubmit)
        toast.success('Cucciolo aggiunto con successo')
      }

      // Auto-crea entrata se il cucciolo viene venduto con un prezzo
      const wasVenduto = puppy?.status === 'venduto'
      const isNowVenduto = dataToSubmit.status === 'venduto'
      const hasPrice = dataToSubmit.sale_price > 0
      const statusChangedToVenduto = isNowVenduto && !wasVenduto

      if (isNowVenduto && hasPrice && (!puppy?.id || statusChangedToVenduto)) {
        const puppyLabel = formData.name?.trim()
          ? formData.name.trim()
          : `cucciolo ${formData.gender === 'femmina' ? '♀' : '♂'}`
        await db.createIncome({
          category: 'vendita_cucciolo',
          description: `Vendita ${puppyLabel}`,
          amount: dataToSubmit.sale_price,
          income_date: dataToSubmit.sale_date || new Date().toISOString().split('T')[0],
          puppy_id: savedPuppy?.id || null,
          payment_method: null,
          notes: formData.buyer_name ? `Acquirente: ${formData.buyer_name}` : null,
        })
        toast.success('Entrata registrata automaticamente in Finanze')
      }

      // Modal per aggiungere il cucciolo trattenuto come cane
      const wasTrattenuto = puppy?.status === 'trattenuto'
      const isNowTrattenuto = dataToSubmit.status === 'trattenuto'
      if (isNowTrattenuto && !wasTrattenuto) {
        const litter = litters.find(l => l.id === formData.litter_id)
        setAddDogPrompt({
          name: formData.name || null,
          gender: formData.gender || null,
          microchip: formData.microchip || null,
          birth_date: litter?.birth_date || null,
        })
        // Non chiamare onSuccess/onClose qui: lo fa il modal dopo la scelta
        return
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving puppy:', error)
      toast.error(error.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  async function handleAddAsDog() {
    try {
      await db.createDog(addDogPrompt)
      toast.success(`${addDogPrompt.name || 'Cucciolo'} aggiunto ai tuoi cani!`)
    } catch (err) {
      toast.error('Errore durante la creazione del cane')
    }
    setAddDogPrompt(null)
    onSuccess()
  }

  if (addDogPrompt) {
    const label = addDogPrompt.name || 'il cucciolo'
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
            <Dog className="w-8 h-8 text-purple-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-black text-gray-900 mb-2">Aggiungi ai tuoi cani?</h3>
            <p className="text-gray-500 text-sm">
              <span className="font-bold text-gray-800">{label}</span> è stato trattenuto.<br />
              Vuoi aggiungerlo alla scheda dei tuoi cani?
            </p>
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => { setAddDogPrompt(null); onSuccess() }}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition"
            >
              No, grazie
            </button>
            <button
              onClick={handleAddAsDog}
              className="flex-1 px-4 py-3 rounded-xl bg-purple-500 text-white font-bold hover:bg-purple-600 transition shadow-lg shadow-purple-500/30"
            >
              Sì, aggiungi
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-3xl">
          <h3 className="text-2xl font-black text-dark-900">
            {puppy ? 'Modifica Cucciolo' : 'Aggiungi Nuovo Cucciolo'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informazioni Base */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-gray-900">Informazioni Base</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  placeholder="Es: Lucky"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cucciolata
                </label>
                <select
                  name="litter_id"
                  value={formData.litter_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                >
                  <option value="">Nessuna cucciolata</option>
                  {litters.map((litter) => (
                    <option key={litter.id} value={litter.id}>
                      Cucciolata del {new Date(litter.birth_date).toLocaleDateString('it-IT')}
                      {litter.mating?.female?.name && ` - ${litter.mating.female.name}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sesso *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                >
                  <option value="maschio">Maschio</option>
                  <option value="femmina">Femmina</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Colore
                </label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  placeholder="Es: Marrone"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Peso alla Nascita (kg)
                </label>
                <input
                  type="number"
                  name="birth_weight"
                  value={formData.birth_weight}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  placeholder="0.5"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Stato *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                >
                  <option value="disponibile">Disponibile</option>
                  <option value="prenotato">Prenotato</option>
                  <option value="venduto">Venduto</option>
                  <option value="trattenuto">Trattenuto</option>
                  <option value="deceduto">Deceduto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Microchip
                </label>
                <input
                  type="text"
                  name="microchip"
                  value={formData.microchip}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  placeholder="15 cifre"
                  maxLength="15"
                />
              </div>
            </div>
          </div>

          {/* Informazioni Vendita */}
          {(formData.status === 'venduto' || formData.status === 'prenotato') && (
            <div className="space-y-4">
              <h4 className="font-bold text-lg text-gray-900">Informazioni Vendita</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Prezzo di Vendita (€)
                  </label>
                  <input
                    type="number"
                    name="sale_price"
                    value={formData.sale_price}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                    placeholder="1500.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {formData.status === 'prenotato' ? 'Data Ritiro' : 'Data Vendita'}
                  </label>
                  <input
                    type="date"
                    name="sale_date"
                    value={formData.sale_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome Acquirente
                  </label>
                  <input
                    type="text"
                    name="buyer_name"
                    value={formData.buyer_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                    placeholder="Mario Rossi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Acquirente
                  </label>
                  <input
                    type="email"
                    name="buyer_email"
                    value={formData.buyer_email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                    placeholder="mario@esempio.it"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Telefono Acquirente
                  </label>
                  <input
                    type="tel"
                    name="buyer_phone"
                    value={formData.buyer_phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                    placeholder="+39 333 1234567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Importo Acconto (€)
                  </label>
                  <input
                    type="number"
                    name="deposit_amount"
                    value={formData.deposit_amount}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                    placeholder="500.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Data Acconto
                  </label>
                  <input
                    type="date"
                    name="deposit_date"
                    value={formData.deposit_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  />
                </div>
              </div>

              {/* Saldo */}
              {(parseFloat(formData.sale_price) || 0) > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-gray-50 border-2 border-gray-100">
                  <div className="text-sm">
                    <span className="text-gray-600 font-semibold">Saldo residuo: </span>
                    <span className={`font-black ${remainingBalance > 0 && !formData.balance_paid ? 'text-orange-600' : 'text-green-600'}`}>
                      €{remainingBalance.toFixed(2)}
                    </span>
                    {(parseFloat(formData.deposit_amount) || 0) > 0 && (
                      <span className="text-xs text-gray-400 ml-2">
                        (prezzo €{(parseFloat(formData.sale_price) || 0).toFixed(2)} − acconto €{(parseFloat(formData.deposit_amount) || 0).toFixed(2)})
                      </span>
                    )}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="balance_paid"
                      checked={formData.balance_paid}
                      onChange={(e) => setFormData(prev => ({ ...prev, balance_paid: e.target.checked }))}
                      className="w-5 h-5 rounded text-primary-500 focus:ring-primary-200"
                    />
                    <span className="text-sm font-bold text-gray-700">Saldo pagato</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Note */}
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
              {loading ? 'Salvataggio...' : puppy ? 'Aggiorna' : 'Aggiungi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

