import { useState } from 'react'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function TransactionForm({ transaction, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [transactionType, setTransactionType] = useState(transaction?.type || 'income')

  const [formData, setFormData] = useState({
    category: transaction?.category || '',
    description: transaction?.description || '',
    amount: transaction?.amount || '',
    date: transaction?.income_date || transaction?.expense_date || new Date().toISOString().split('T')[0],
    payment_method: transaction?.payment_method || '',
    dog_id: transaction?.dog_id || '',
    puppy_id: transaction?.puppy_id || '',
    invoice_number: transaction?.invoice_number || '',
    notes: transaction?.notes || '',
  })

  // Fetch dogs per il dropdown
  const { data: dogs = [] } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => db.getDogs(),
  })

  // Fetch puppies per il dropdown
  const { data: puppies = [] } = useQuery({
    queryKey: ['puppies'],
    queryFn: () => db.getPuppies(),
  })

  const incomeCategories = [
    { value: 'vendita_cucciolo', label: 'Vendita Cucciolo' },
    { value: 'monta', label: 'Monta' },
    { value: 'pensione', label: 'Pensione' },
    { value: 'addestramento', label: 'Addestramento' },
    { value: 'altro', label: 'Altro' },
  ]

  const expenseCategories = [
    { value: 'veterinario', label: 'Veterinario' },
    { value: 'alimentazione', label: 'Alimentazione' },
    { value: 'toelettatura', label: 'Toelettatura' },
    { value: 'medicinali', label: 'Medicinali' },
    { value: 'attrezzatura', label: 'Attrezzatura' },
    { value: 'esposizioni', label: 'Esposizioni' },
    { value: 'riproduzione', label: 'Riproduzione' },
    { value: 'addestramento', label: 'Addestramento' },
    { value: 'altro', label: 'Altro' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const dataToSubmit = {
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method || null,
        notes: formData.notes || null,
      }

      if (transactionType === 'income') {
        dataToSubmit.income_date = formData.date
        dataToSubmit.puppy_id = formData.puppy_id || null
        dataToSubmit.invoice_number = formData.invoice_number || null

        if (transaction?.id) {
          await db.updateIncome(transaction.id, dataToSubmit)
          toast.success('Entrata aggiornata con successo')
        } else {
          await db.createIncome(dataToSubmit)
          toast.success('Entrata registrata con successo')
        }
      } else {
        dataToSubmit.expense_date = formData.date
        dataToSubmit.dog_id = formData.dog_id || null

        if (transaction?.id) {
          await db.updateExpense(transaction.id, dataToSubmit)
          toast.success('Spesa aggiornata con successo')
        } else {
          await db.createExpense(dataToSubmit)
          toast.success('Spesa registrata con successo')
        }
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving transaction:', error)
      toast.error(error.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const categories = transactionType === 'income' ? incomeCategories : expenseCategories

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-3xl">
          <h3 className="text-2xl font-black text-dark-900">
            {transaction ? 'Modifica Transazione' : 'Nuova Transazione'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tipo Transazione */}
          {!transaction && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTransactionType('income')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition ${
                  transactionType === 'income'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <TrendingUp className="w-5 h-5" />
                Entrata
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('expense')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition ${
                  transactionType === 'expense'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <TrendingDown className="w-5 h-5" />
                Uscita
              </button>
            </div>
          )}

          {/* Informazioni Base */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-gray-900">Informazioni Transazione</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Categoria *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                >
                  <option value="">Seleziona categoria</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Importo (€) *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  placeholder="100.00"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Data *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Metodo Pagamento
                </label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                >
                  <option value="">Seleziona metodo</option>
                  <option value="contanti">Contanti</option>
                  <option value="carta">Carta</option>
                  <option value="bonifico">Bonifico</option>
                  <option value="assegno">Assegno</option>
                  <option value="altro">Altro</option>
                </select>
              </div>

              {transactionType === 'expense' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cane (opzionale)
                  </label>
                  <select
                    name="dog_id"
                    value={formData.dog_id}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  >
                    <option value="">Nessun cane specifico</option>
                    {dogs.map((dog) => (
                      <option key={dog.id} value={dog.id}>
                        {dog.name} - {dog.breed}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {transactionType === 'income' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cucciolo (opzionale)
                    </label>
                    <select
                      name="puppy_id"
                      value={formData.puppy_id}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                    >
                      <option value="">Nessun cucciolo</option>
                      {puppies.map((puppy) => (
                        <option key={puppy.id} value={puppy.id}>
                          {puppy.name || 'Senza nome'} - {puppy.gender}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      N° Fattura
                    </label>
                    <input
                      type="text"
                      name="invoice_number"
                      value={formData.invoice_number}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                      placeholder="FAT-2024-001"
                    />
                  </div>
                </>
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
                placeholder="Es: Vaccino antirabbica"
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
                rows="3"
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
              className={`flex-1 px-6 py-3 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                transactionType === 'income'
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {loading ? 'Salvataggio...' : transaction ? 'Aggiorna' : 'Aggiungi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

