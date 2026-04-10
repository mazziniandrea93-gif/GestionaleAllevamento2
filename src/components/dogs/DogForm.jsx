import { useState, useRef, useEffect } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { db } from '@/lib/supabase'
import toast from 'react-hot-toast'

const DOG_BREEDS = [
  'Affenpinscher', 'Afghan Hound', 'Airedale Terrier', 'Akita', 'Alano Spagnolo',
  'Alaskan Malamute', 'American Bulldog', 'American Cocker Spaniel', 'American Staffordshire Terrier',
  'Aussiedoodle', 'Australian Cattle Dog', 'Australian Shepherd', 'Australian Silky Terrier',
  'Australian Terrier', 'Azawakh', 'Basenji', 'Basset Hound', 'Beagle', 'Bearded Collie',
  'Bedlington Terrier', 'Belgian Malinois', 'Belgian Shepherd', 'Bergamasco', 'Bichon Frisé',
  'Black and Tan Coonhound', 'Bloodhound', 'Blue Heeler', 'Bobtail', 'Bolognese',
  'Border Collie', 'Border Terrier', 'Borzoi', 'Boston Terrier', 'Bouvier des Flandres',
  'Boxer', 'Boykin Spaniel', 'Bracco Italiano', 'Braque du Bourbonnais', 'Briard',
  'Brittany Spaniel', 'Brussels Griffon', 'Bull Mastiff', 'Bull Terrier', 'Bulldog Americano',
  'Bulldog Francese', 'Bulldog Inglese', 'Cairn Terrier', 'Cane Corso', 'Cane da Pastore Belga',
  'Cane da Pastore di Brie', 'Cane da Pastore Maremmano Abruzzese', 'Cane di Oropa',
  'Caniche', 'Cardigan Welsh Corgi', 'Cavalier King Charles Spaniel', 'Chesapeake Bay Retriever',
  'Chihuahua', 'Chinese Crested', 'Chinese Shar-Pei', 'Chow Chow', 'Cirneco dell'Etna',
  'Clumber Spaniel', 'Cocker Spaniel', 'Cocker Spaniel Americano', 'Cocker Spaniel Inglese',
  'Collie', 'Collie a Pelo Lungo', 'Collie a Pelo Corto', 'Curly-Coated Retriever',
  'Dachshund', 'Dalmata', 'Dandie Dinmont Terrier', 'Dobermann', 'Dogo Argentino',
  'Dogo de Bordeaux', 'Drahthaar', 'Drever', 'Entlebucher', 'Epagneul Breton',
  'Eurasier', 'Field Spaniel', 'Fila Brasileiro', 'Finnish Lapphund', 'Finnish Spitz',
  'Flat-Coated Retriever', 'Fox Terrier', 'Foxhound Americano', 'Foxhound Inglese',
  'Galgo Spagnolo', 'German Pinscher', 'Goldendoodle', 'Golden Retriever', 'Gordon Setter',
  'Grand Basset Griffon Vendéen', 'Grande Spitz', 'Great Dane', 'Greyhound',
  'Griffon Bruxellois', 'Groenendael', 'Hovawart', 'Husky Siberiano', 'Ibizan Hound',
  'Irish Red and White Setter', 'Irish Setter', 'Irish Terrier', 'Irish Water Spaniel',
  'Irish Wolfhound', 'Italian Greyhound', 'Jack Russell Terrier', 'Japanese Spitz',
  'Keeshond', 'Kerry Blue Terrier', 'King Charles Spaniel', 'Komondor', 'Kuvasz',
  'Labrador Retriever', 'Lagotto Romagnolo', 'Lancashire Heeler', 'Leonberger',
  'Lhasa Apso', 'Lowchen', 'Maltese', 'Manchester Terrier', 'Maremma Sheepdog',
  'Mastiff', 'Mastino Napoletano', 'Miniature Bull Terrier', 'Miniature Pinscher',
  'Miniature Schnauzer', 'Mudi', 'Münsterländer', 'Norfolk Terrier', 'Norwegian Buhund',
  'Norwegian Elkhound', 'Norwich Terrier', 'Nova Scotia Duck Tolling Retriever',
  'Old English Sheepdog', 'Otterhound', 'Pastore Australiano', 'Pastore Belga',
  'Pastore Bergamasco', 'Pastore dei Carpazi', 'Pastore del Caucaso', 'Pastore della Savoia',
  'Pastore di Groenlandia', 'Pastore Islandese', 'Pastore Maremmano', 'Pastore Scozzese',
  'Pastore Svizzero Bianco', 'Pastore Tedesco', 'Pechinese', 'Pembroke Welsh Corgi',
  'Perro de Agua Español', 'Petit Basset Griffon Vendéen', 'Pharaoh Hound', 'Piccolo Brabantino',
  'Piccolo Levriero Italiano', 'Piccolo Spitz', 'Pit Bull Terrier', 'Plott Hound',
  'Pointer', 'Pomerania', 'Poodle', 'Porcelaine', 'Portuguese Water Dog', 'Pug',
  'Puli', 'Pumi', 'Pyrenean Mastiff', 'Pyrenean Mountain Dog', 'Rafeiro do Alentejo',
  'Rat Terrier', 'Redbone Coonhound', 'Rhodesian Ridgeback', 'Rottweiler', 'Saluki',
  'Samoiedo', 'Schipperke', 'Schnauzer', 'Schnauzer Gigante', 'Schnauzer Medio',
  'Scottish Deerhound', 'Scottish Terrier', 'Sealyham Terrier', 'Segugio Italiano',
  'Setter Gordon', 'Setter Inglese', 'Setter Irlandese', 'Shar Pei', 'Shiba Inu',
  'Shih Tzu', 'Siberian Husky', 'Skye Terrier', 'Sloughi', 'Soft Coated Wheaten Terrier',
  'Spagnolo da Ferma Tedesco', 'Spaniel da Acqua Irlandese', 'Spitz Finlandese',
  'Spitz Giapponese', 'Spitz Italiano', 'Spitz Medio', 'Spitz Nano', 'Spitz Wolfspitz',
  'Springer Spaniel', 'Staffordshire Bull Terrier', 'Standard Schnauzer',
  'Sussex Spaniel', 'Tervuren', 'Tibetan Mastiff', 'Tibetan Spaniel', 'Tibetan Terrier',
  'Toy Fox Terrier', 'Treeing Walker Coonhound', 'Vizsla', 'Volpino Italiano',
  'Weimaraner', 'Welsh Springer Spaniel', 'Welsh Terrier', 'West Highland White Terrier',
  'Whippet', 'Wire Fox Terrier', 'Wirehaired Pointing Griffon', 'Xoloitzcuintli',
  'Yorkshire Terrier',
].sort()

function BreedSelect({ value, onChange }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const filtered = query.length === 0
    ? DOG_BREEDS
    : DOG_BREEDS.filter(b => b.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  function handleSelect(breed) {
    setQuery(breed)
    onChange(breed)
    setOpen(false)
  }

  function handleInputChange(e) {
    setQuery(e.target.value)
    onChange(e.target.value)
    setOpen(true)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          required
          className="w-full px-4 py-3 pr-10 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
          placeholder="Cerca razza..."
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-400">Nessuna razza trovata</li>
          ) : (
            filtered.map(breed => (
              <li
                key={breed}
                onMouseDown={() => handleSelect(breed)}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-primary-50 hover:text-primary-700 transition ${
                  breed === query ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-700'
                }`}
              >
                {breed}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export default function DogForm({ dog, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: dog?.name || '',
    breed: dog?.breed || '',
    gender: dog?.gender || 'maschio',
    birth_date: dog?.birth_date || '',
    microchip: dog?.microchip || '',
    pedigree_number: dog?.pedigree_number || '',
    status: dog?.status || 'attivo',
    color: dog?.color || '',
    coat_color: dog?.coat_color || '',
    weight: dog?.weight || '',
    height: dog?.height || '',
    notes: dog?.notes || '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (dog?.id) {
        await db.updateDog(dog.id, formData)
        toast.success('Cane aggiornato con successo')
      } else {
        await db.createDog(formData)
        toast.success('Cane aggiunto con successo')
      }
      onSuccess()
    } catch (error) {
      console.error('Error saving dog:', error)
      toast.error(error.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-3xl">
          <h3 className="text-2xl font-black text-dark-900">
            {dog ? 'Modifica Cane' : 'Aggiungi Nuovo Cane'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-gray-900">Informazioni Base</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  placeholder="Es: Luna"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Razza *
                </label>
                <BreedSelect
                  value={formData.breed}
                  onChange={(val) => setFormData(prev => ({ ...prev, breed: val }))}
                />
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
                  Data di Nascita *
                </label>
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
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
                  <option value="attivo">Attivo</option>
                  <option value="venduto">Venduto</option>
                  <option value="ceduto">Ceduto</option>
                  <option value="deceduto">Deceduto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Colore Mantello
                </label>
                <input
                  type="text"
                  name="coat_color"
                  value={formData.coat_color}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  placeholder="Es: Marrone"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-lg text-gray-900">Documenti</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pedigree
                </label>
                <input
                  type="text"
                  name="pedigree_number"
                  value={formData.pedigree_number}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  placeholder="Numero pedigree"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-lg text-gray-900">Misure</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  step="0.1"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  placeholder="Es: 25.5"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Altezza (cm)
                </label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  step="0.1"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  placeholder="Es: 55.0"
                />
              </div>
            </div>
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
              {loading ? 'Salvataggio...' : dog ? 'Aggiorna' : 'Aggiungi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

