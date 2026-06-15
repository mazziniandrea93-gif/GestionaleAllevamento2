import { useState, useEffect } from 'react'
import { User, Building, Bell, Lock, Save, FileText, BellOff, BellRing, Smartphone, Info } from 'lucide-react'
import SimpleEditor from '@/components/ui/SimpleEditor'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useNotifications } from '@/hooks/useNotifications'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user } = useAuth()
  const { isSubscribed, permission, isReady, sdkUnavailable, enableNotifications, disableNotifications } = useNotifications()
  const [notifLoading, setNotifLoading] = useState(false)
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
    docForoCompetente: '',
    docPrecontrattoClausole: '',
    docContrattoClausole: '',
    docContrattoGaranzie: '',
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
          docForoCompetente: data.doc_foro_competente || '',
          docPrecontrattoClausole: data.doc_precontratto_clausole || '',
          docContrattoClausole: data.doc_contratto_clausole || '',
          docContrattoGaranzie: data.doc_contratto_garanzie || '',
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
        doc_foro_competente: formData.docForoCompetente,
        doc_precontratto_clausole: formData.docPrecontrattoClausole,
        doc_contratto_clausole: formData.docContrattoClausole,
        doc_contratto_garanzie: formData.docContrattoGaranzie,
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
    { id: 'documenti', label: 'Documenti', icon: FileText },
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

            {activeTab === 'documenti' && (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <h3 className="text-xl font-black text-gray-900 mb-1">Personalizzazione Documenti</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    I testi che inserisci qui verranno aggiunti automaticamente ai PDF generati dal gestionale.
                  </p>

                  {/* Foro competente — comune a tutti */}
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                    <div>
                      <p className="font-bold text-gray-800 text-sm mb-0.5">Foro Competente</p>
                      <p className="text-xs text-gray-500 mb-3">
                        Città del tribunale competente per eventuali controversie (es. "Milano", "Roma"). Apparirà in tutti i contratti.
                      </p>
                      <input
                        type="text"
                        name="docForoCompetente"
                        value={formData.docForoCompetente}
                        onChange={handleChange}
                        placeholder="Es: Milano"
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-sm"
                      />
                    </div>
                  </div>

                  {/* Precontratto */}
                  <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-4 mt-4">
                    <div>
                      <p className="font-bold text-amber-800 text-sm mb-0.5">Precontratto con Caparra — Clausole aggiuntive</p>
                      <p className="text-xs text-amber-700 mb-3">
                        Testo extra che verrà inserito nel precontratto dopo le clausole standard sulla caparra.
                        Usa questo campo per aggiungere condizioni specifiche del tuo allevamento
                        (es. obblighi vaccinali, condizioni di allevamento, ecc.).
                      </p>
                      <SimpleEditor
                        value={formData.docPrecontrattoClausole}
                        onChange={e => setFormData(f => ({ ...f, docPrecontrattoClausole: e.target.value }))}
                        rows={5}
                        accentColor="amber"
                        placeholder={"Es:\n• Il cucciolo verrà consegnato con libretto sanitario aggiornato e prima vaccinazione effettuata.\n• L'acquirente si impegna a non utilizzare il soggetto per attività di riproduzione commerciale senza autorizzazione scritta del venditore."}
                      />
                    </div>
                  </div>

                  {/* Contratto di vendita */}
                  <div className="p-5 bg-green-50 rounded-2xl border border-green-200 space-y-4 mt-4">
                    <div>
                      <p className="font-bold text-green-800 text-sm mb-0.5">Contratto di Vendita — Garanzie personalizzate</p>
                      <p className="text-xs text-green-700 mb-3">
                        Garanzie aggiuntive da inserire nell'Art. 5 del contratto, dopo quelle standard.
                        Utile per specificare garanzie sanitarie particolari della tua razza.
                      </p>
                      <SimpleEditor
                        value={formData.docContrattoGaranzie}
                        onChange={e => setFormData(f => ({ ...f, docContrattoGaranzie: e.target.value }))}
                        rows={4}
                        accentColor="green"
                        placeholder={"Es:\n• Il cucciolo è stato testato per [malattia specifica] con risultato negativo.\n• Il venditore garantisce l'assenza di displasia dell'anca nei genitori (certificato HD)."}
                      />
                    </div>

                    <div>
                      <p className="font-bold text-green-800 text-sm mb-0.5">Contratto di Vendita — Clausole aggiuntive</p>
                      <p className="text-xs text-green-700 mb-3">
                        Testo extra che apparirà in fondo al contratto prima delle firme.
                        Puoi inserire condizioni particolari, divieti o accordi specifici.
                      </p>
                      <SimpleEditor
                        value={formData.docContrattoClausole}
                        onChange={e => setFormData(f => ({ ...f, docContrattoClausole: e.target.value }))}
                        rows={4}
                        accentColor="green"
                        placeholder={"Es:\n• È vietata la cessione del soggetto a terzi senza preventivo accordo scritto con il venditore.\n• In caso di rinuncia del soggetto, il venditore ha diritto di prelazione sul riacquisto."}
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
                <div>
                  <h3 className="text-xl font-black text-gray-900">Notifiche Push</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Ricevi promemoria su telefono e PC anche quando il gestionale è chiuso.
                  </p>
                </div>

                {/* Stato attuale */}
                {!isReady ? (
                  <div className="flex items-center gap-3 p-5 bg-gray-50 rounded-2xl border-2 border-gray-100">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-primary-500 animate-spin" />
                    <span className="text-sm text-gray-500">Controllo stato notifiche…</span>
                  </div>
                ) : sdkUnavailable ? (
                  /* SDK OneSignal non caricato */
                  <div className="p-5 bg-amber-50 rounded-2xl border-2 border-amber-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <BellOff className="w-6 h-6 text-amber-500 shrink-0" />
                      <div>
                        <p className="font-bold text-amber-800">Servizio notifiche non disponibile</p>
                        <p className="text-sm text-amber-700 mt-0.5">
                          Il sistema di notifiche non è riuscito a caricarsi. Può succedere se un blocco pubblicità,
                          un VPN o un'estensione del browser blocca lo script di notifiche.
                        </p>
                      </div>
                    </div>
                    <div className="bg-amber-100 rounded-xl p-4 text-sm text-amber-700 space-y-1">
                      <p className="font-semibold">Cosa provare:</p>
                      <p>🔌 Disattiva temporaneamente AdBlock/uBlock per questo sito</p>
                      <p>🕵️ Esci dalla modalità di navigazione privata/incognito</p>
                      <p>🔄 Ricarica la pagina</p>
                    </div>
                  </div>
                ) : permission === 'denied' ? (
                  /* Permesso revocato */
                  <div className="p-5 bg-red-50 rounded-2xl border-2 border-red-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <BellOff className="w-6 h-6 text-red-500 shrink-0" />
                      <div>
                        <p className="font-bold text-red-800">Notifiche bloccate dal browser</p>
                        <p className="text-sm text-red-600 mt-0.5">
                          Hai bloccato le notifiche in precedenza. Per riattivarle devi farlo manualmente nelle impostazioni del browser.
                        </p>
                      </div>
                    </div>
                    <div className="bg-red-100 rounded-xl p-4 text-sm text-red-700 space-y-1">
                      <p className="font-semibold">Come sbloccare:</p>
                      <p>🖥️ <strong>PC Chrome/Edge:</strong> clicca il lucchetto 🔒 nella barra URL → Notifiche → Consenti</p>
                      <p>📱 <strong>Android Chrome:</strong> Impostazioni browser → Notifiche sito → rimuovi il blocco</p>
                      <p>🍎 <strong>iPhone Safari:</strong> Impostazioni → Safari → Impostazioni avanzate → Notifiche</p>
                    </div>
                  </div>
                ) : isSubscribed ? (
                  /* Attive */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-5 bg-green-50 rounded-2xl border-2 border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                          <BellRing className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-green-800">Notifiche attive ✓</p>
                          <p className="text-sm text-green-600">
                            Questo dispositivo riceverà i promemoria del calendario.
                          </p>
                        </div>
                      </div>
                      <button
                        disabled={notifLoading}
                        onClick={async () => {
                          setNotifLoading(true)
                          await disableNotifications()
                          setNotifLoading(false)
                          toast.success('Notifiche disattivate')
                        }}
                        className="px-4 py-2 bg-white border-2 border-gray-200 text-gray-600 font-bold text-sm rounded-xl hover:border-red-300 hover:text-red-600 transition disabled:opacity-50"
                      >
                        {notifLoading ? 'Attendere…' : 'Disattiva'}
                      </button>
                    </div>

                    {/* Come funzionano */}
                    <div className="p-5 bg-blue-50 rounded-2xl border-2 border-blue-100 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Info className="w-4 h-4 text-blue-500" />
                        <p className="font-bold text-blue-800 text-sm">Come funzionano i promemoria</p>
                      </div>
                      <p className="text-sm text-blue-700">
                        Ogni evento del calendario ha un campo <strong>"Giorni promemoria"</strong>: la notifica arriva esattamente quel numero di giorni prima dell'evento.
                      </p>
                      <p className="text-sm text-blue-600">
                        Es. visita veterinaria il 10 giugno con promemoria = 2 → notifica l'8 giugno mattina.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Non attive */
                  <div className="space-y-4">
                    <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                          <Bell className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Notifiche non attive</p>
                          <p className="text-sm text-gray-500">Attivale per ricevere i promemoria del calendario.</p>
                        </div>
                      </div>
                      <button
                        disabled={notifLoading}
                        onClick={async () => {
                          setNotifLoading(true)
                          try {
                            const ok = await enableNotifications()
                            if (ok) toast.success('Notifiche attivate! 🔔')
                            else toast.error('Impossibile attivare le notifiche. Controlla le impostazioni del browser o apri la console per i dettagli.')
                          } finally {
                            setNotifLoading(false)
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {notifLoading ? (
                          <>
                            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            Attivazione…
                          </>
                        ) : (
                          <>
                            <BellRing className="w-5 h-5" />
                            Attiva Notifiche Push
                          </>
                        )}
                      </button>
                    </div>

                    {/* Guida iPhone */}
                    <div className="p-5 bg-amber-50 rounded-2xl border-2 border-amber-200 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Smartphone className="w-4 h-4 text-amber-600" />
                        <p className="font-bold text-amber-800 text-sm">Uso su iPhone?</p>
                      </div>
                      <p className="text-sm text-amber-700">
                        Su iOS le notifiche push funzionano solo se aggiungi il gestionale alla <strong>schermata Home</strong>:
                      </p>
                      <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                        <li>Apri questa pagina in <strong>Safari</strong></li>
                        <li>Tocca il tasto <strong>Condividi</strong> (□↑)</li>
                        <li>Seleziona <strong>"Aggiungi a Home"</strong></li>
                        <li>Riapri l'app dalla schermata Home e attiva le notifiche</li>
                      </ol>
                      <p className="text-xs text-amber-600 mt-1">Richiede iOS 16.4 o superiore.</p>
                    </div>
                  </div>
                )}
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

