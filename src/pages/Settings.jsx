import { useState } from 'react'
import { User, Building, Bell, Lock, Globe, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profilo')

  const [formData, setFormData] = useState({
    kennelName: '',
    ownerName: '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    country: 'Italia',
    website: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    toast.success('Impostazioni salvate con successo')
  }

  const tabs = [
    { id: 'profilo', label: 'Profilo', icon: User },
    { id: 'allevamento', label: 'Allevamento', icon: Building },
    { id: 'notifiche', label: 'Notifiche', icon: Bell },
    { id: 'sicurezza', label: 'Sicurezza', icon: Lock },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-dark-900">Impostazioni</h2>
        <p className="text-gray-500 mt-1">Gestisci le tue preferenze</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border-2 border-gray-100 p-4 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl border-2 border-gray-100 p-6">
            {activeTab === 'profilo' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900 mb-4">Informazioni Personali</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        name="ownerName"
                        value={formData.ownerName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                        placeholder="Il tuo nome"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        L'email non può essere modificata
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Telefono
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                        placeholder="+39 123 456 7890"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition"
                  >
                    <Save className="w-5 h-5" />
                    Salva Modifiche
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'allevamento' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900 mb-4">Dati Allevamento</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nome Allevamento
                      </label>
                      <input
                        type="text"
                        name="kennelName"
                        value={formData.kennelName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                        placeholder="Es: Allevamento del Lupo Azzurro"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Indirizzo
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                        placeholder="Via, numero civico"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Città
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                          placeholder="Roma"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Paese
                        </label>
                        <input
                          type="text"
                          name="country"
                          value={formData.country}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Sito Web
                      </label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                        placeholder="https://www.tuoallevamento.it"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition"
                  >
                    <Save className="w-5 h-5" />
                    Salva Modifiche
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'notifiche' && (
              <div className="space-y-6">
                <h3 className="text-xl font-black text-gray-900">Preferenze Notifiche</h3>

                <div className="space-y-4">
                  {[
                    { id: 'email', label: 'Notifiche Email', description: 'Ricevi aggiornamenti via email' },
                    { id: 'vaccini', label: 'Scadenza Vaccini', description: 'Avvisi per vaccini in scadenza' },
                    { id: 'eventi', label: 'Eventi Calendario', description: 'Promemoria per eventi programmati' },
                    { id: 'cucciolate', label: 'Nuove Cucciolate', description: 'Notifiche per nuove cucciolate' },
                  ].map((notif) => (
                    <div key={notif.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-semibold text-gray-900">{notif.label}</p>
                        <p className="text-sm text-gray-500">{notif.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'sicurezza' && (
              <div className="space-y-6">
                <h3 className="text-xl font-black text-gray-900">Sicurezza Account</h3>

                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-5 h-5 text-yellow-600" />
                      <p className="font-semibold text-yellow-900">Modifica Password</p>
                    </div>
                    <p className="text-sm text-yellow-700 mb-4">
                      Per modificare la password, vai alla sezione di autenticazione di Supabase.
                    </p>
                    <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition">
                      Cambia Password
                    </button>
                  </div>

                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-5 h-5 text-red-600" />
                      <p className="font-semibold text-red-900">Zona Pericolosa</p>
                    </div>
                    <p className="text-sm text-red-700 mb-4">
                      Eliminando l'account perderai tutti i dati. Questa azione è irreversibile.
                    </p>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition">
                      Elimina Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

