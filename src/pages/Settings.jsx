import { useState, useEffect } from 'react'
import { User, Building, Bell, Lock, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profilo')
  const [loading, setLoading] = useState(false)
  const [settingsId, setSettingsId] = useState(null)
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [formData, setFormData] = useState({
    kennelName: '',
    kennelAffix: '',
    ownerName: '',
    email: user?.email || '',
    phone: '',
    address: '',
    vatNumber: '',
    website: '',
  })

  // Carica le impostazioni esistenti
  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setSettingsId(data.id)
        setFormData({
          kennelName: data.kennel_name || '',
          kennelAffix: data.kennel_affix || '',
          ownerName: data.owner_name || '',
          email: user.email || '',
          phone: data.phone || '',
          address: data.address || '',
          vatNumber: data.vat_number || '',
          website: data.website || '',
        })
      }
    } catch (error) {
      console.error('Errore caricamento impostazioni:', error)
      toast.error('Errore nel caricamento delle impostazioni')
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (passwordData.newPassword.length < 6) {
      toast.error('La password deve essere di almeno 6 caratteri')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Le password non coincidono')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      toast.success('Password modificata con successo!')
      setPasswordData({ newPassword: '', confirmPassword: '' })
    } catch (error) {
      console.error('Errore cambio password:', error)
      toast.error('Errore nel cambio password: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      setTimeout(() => setShowDeleteConfirm(false), 5000)
      return
    }

    setLoading(true)
    try {
      // Prima elimina tutti i dati dell'utente (grazie a ON DELETE CASCADE)
      const { error } = await supabase.rpc('delete_user_account')

      if (error) {
        // Fallback: prova a eliminare manualmente
        await supabase.auth.signOut()
        toast.success('Account disconnesso. Contatta il supporto per la cancellazione completa.')
      } else {
        toast.success('Account eliminato con successo')
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Errore eliminazione account:', error)
      toast.error('Errore nell\'eliminazione: ' + error.message)
    } finally {
      setLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const settingsData = {
        user_id: user.id,
        kennel_name: formData.kennelName,
        kennel_affix: formData.kennelAffix,
        owner_name: formData.ownerName,
        phone: formData.phone,
        address: formData.address,
        vat_number: formData.vatNumber,
        email: formData.email,
        website: formData.website,
        updated_at: new Date().toISOString()
      }

      let error

      if (settingsId) {
        // Aggiorna
        const result = await supabase
          .from('settings')
          .update(settingsData)
          .eq('id', settingsId)
        error = result.error
      } else {
        // Inserisci nuovo
        const result = await supabase
          .from('settings')
          .insert([settingsData])
          .select()

        error = result.error
        if (!error && result.data && result.data[0]) {
          setSettingsId(result.data[0].id)
        }
      }

      if (error) throw error

      toast.success('Impostazioni salvate con successo!')
    } catch (error) {
      console.error('Errore salvataggio impostazioni:', error)
      toast.error('Errore nel salvataggio: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const { isPrivate } = useAuth()

  const tabs = [
    { id: 'profilo', label: 'Profilo', icon: User },
    !isPrivate && { id: 'allevamento', label: 'Allevamento', icon: Building },
    { id: 'notifiche', label: 'Notifiche', icon: Bell },
    { id: 'sicurezza', label: 'Sicurezza', icon: Lock },
  ].filter(Boolean)

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
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Salvataggio...' : 'Salva Modifiche'}
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
                        Affisso Allevamento
                      </label>
                      <input
                        type="text"
                        name="kennelAffix"
                        value={formData.kennelAffix}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                        placeholder="Es: del Lupo Azzurro"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Partita IVA
                      </label>
                      <input
                        type="text"
                        name="vatNumber"
                        value={formData.vatNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                        placeholder="IT12345678901"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Indirizzo Completo
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                        placeholder="Via, numero civico, CAP, Città, Provincia"
                      />
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
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Salvataggio...' : 'Salva Modifiche'}
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

                <div className="space-y-6">
                  {/* Form Cambio Password */}
                  <div className="p-6 bg-white border-2 border-gray-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-4">
                      <Lock className="w-5 h-5 text-primary-600" />
                      <h4 className="font-bold text-gray-900">Modifica Password</h4>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Nuova Password
                        </label>
                        <input
                          type="password"
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          required
                          minLength={6}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                          placeholder="Minimo 6 caratteri"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Conferma Password
                        </label>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          required
                          minLength={6}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                          placeholder="Conferma la nuova password"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Aggiornamento...' : 'Aggiorna Password'}
                      </button>
                    </form>
                  </div>

                  {/* Zona Pericolosa */}
                  <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-5 h-5 text-red-600" />
                      <h4 className="font-bold text-red-900">Zona Pericolosa</h4>
                    </div>
                    <p className="text-sm text-red-700 mb-4">
                      Eliminando l'account perderai tutti i dati. Questa azione è irreversibile.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={loading}
                      className={`px-6 py-3 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                        showDeleteConfirm 
                          ? 'bg-red-700 text-white hover:bg-red-800' 
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {loading ? 'Eliminazione...' : showDeleteConfirm ? '⚠️ Conferma Eliminazione' : 'Elimina Account'}
                    </button>
                    {showDeleteConfirm && (
                      <p className="text-xs text-red-600 mt-2 font-semibold">
                        Clicca di nuovo per confermare l'eliminazione definitiva
                      </p>
                    )}
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

