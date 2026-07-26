import { useState } from 'react'
import { X, UserCog, ShieldCheck } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ACCESS_PRESETS, ACCESS_ORDER, presetPermissions, ACCESS_STATUS } from '@/lib/permissions'
import toast from 'react-hot-toast'

// Palette per l'avatar del dipendente
const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1']

export default function StaffForm({ member, onClose, onSuccess }) {
  const isEdit = !!member?.id
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: member?.name || '',
    role: member?.role || '',
    color: member?.color || COLORS[0],
    phone: member?.phone || '',
    email: member?.email || member?.member_email || '',
    active: member?.active ?? true,
    access_level: member?.access_level || 'nessuno',
  })

  const isLinked = member?.access_status === 'attivo'

  const change = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Inserisci il nome del dipendente')
      return
    }

    const hasAccess = form.access_level !== 'nessuno'
    const email = form.email.trim().toLowerCase()

    if (hasAccess && !email) {
      toast.error('Per dare l’accesso serve l’email del dipendente')
      return
    }
    if (hasAccess && email === (user?.email || '').toLowerCase()) {
      toast.error('Non puoi invitare la tua stessa email (sei il titolare)')
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role.trim() || null,
        color: form.color,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        active: form.active,
        access_level: form.access_level,
        permissions: hasAccess ? presetPermissions(form.access_level) : {},
        member_email: hasAccess ? email : null,
        // Do accesso → 'attivo' se già collegato, altrimenti 'invitato'.
        // Tolgo accesso → 'sospeso' se era collegato, altrimenti 'nessuno'.
        access_status: hasAccess
          ? (isLinked ? 'attivo' : 'invitato')
          : (isLinked ? 'sospeso' : 'nessuno'),
      }

      if (isEdit) {
        await db.updateStaff(member.id, payload)
        toast.success('Dipendente aggiornato')
      } else {
        await db.createStaff(payload)
        toast.success(hasAccess ? 'Dipendente invitato' : 'Dipendente aggiunto')
      }
      onSuccess()
    } catch (err) {
      console.error('save staff error:', err)
      toast.error(err.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  const initial = (form.name || '?').trim().charAt(0).toUpperCase()
  const status = member?.access_status && member.access_status !== 'nessuno'
    ? ACCESS_STATUS[member.access_status]
    : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-3xl">
          <h3 className="text-2xl font-black text-dark-900 flex items-center gap-2">
            <UserCog className="w-6 h-6 text-primary-500" />
            {isEdit ? 'Modifica Dipendente' : 'Nuovo Dipendente'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          {/* Anteprima avatar + nome */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0"
              style={{ backgroundColor: form.color }}
            >
              {initial}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nome *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={change}
                required
                placeholder="Es. Marco Rossi"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
              />
            </div>
          </div>

          {/* Ruolo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Ruolo</label>
            <input
              type="text"
              name="role"
              value={form.role}
              onChange={change}
              placeholder="Es. Addetto pulizie, Toelettatore…"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
            />
          </div>

          {/* Colore */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Colore</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-9 h-9 rounded-xl transition ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-800 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Colore ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Contatti */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Telefono</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={change}
                placeholder="Es. 333 1234567"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={change}
                placeholder="nome@email.it"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
              />
            </div>
          </div>

          {/* ── Accesso all'app ── */}
          <div className="rounded-2xl border-2 border-gray-100 p-4 space-y-3 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary-500" /> Accesso all’app
              </h4>
              {status && (
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: `${status.color}1A`, color: status.color }}
                >
                  {status.label}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {ACCESS_ORDER.map((level) => {
                const preset = ACCESS_PRESETS[level]
                const selected = form.access_level === level
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, access_level: level }))}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition ${
                      selected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`} />
                      <span className="font-bold text-gray-900">{preset.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">{preset.hint}</p>
                  </button>
                )
              })}
            </div>

            {form.access_level !== 'nessuno' && (
              <p className="text-xs text-gray-500 leading-relaxed">
                {isLinked
                  ? 'Il dipendente è già collegato: le modifiche ai permessi hanno effetto subito.'
                  : 'Di’ al dipendente di aprire l’app, toccare “Sei un dipendente invitato?” e registrarsi con l’email qui sopra: verrà collegato in automatico e vedrà solo le sezioni permesse.'}
              </p>
            )}
          </div>

          {/* Attivo */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="w-5 h-5 rounded text-primary-500 focus:ring-primary-200"
            />
            <span className="text-sm font-semibold text-gray-700">In servizio</span>
            <span className="text-xs text-gray-400">— disattiva per nascondere dalle assegnazioni</span>
          </label>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
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
              {loading ? 'Salvataggio...' : isEdit ? 'Aggiorna' : 'Aggiungi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
