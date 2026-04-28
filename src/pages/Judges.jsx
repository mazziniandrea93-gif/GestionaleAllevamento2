import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { db } from '@/lib/supabase'
import toast from 'react-hot-toast'
import {
  Plus,
  User,
  Trophy,
  Star,
  Edit,
  Trash2,
  X,
  Search,
  ChevronRight,
  MessageSquare,
  Dog,
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

const GRADES = ['Eccellente', 'Molto Buono', 'Buono', 'Sufficiente', 'Qualificato', 'Fuori Concorso', 'Non Classificato']

const GRADE_COLORS = {
  'Eccellente':       'bg-emerald-100 text-emerald-700',
  'Molto Buono':      'bg-blue-100 text-blue-700',
  'Buono':            'bg-cyan-100 text-cyan-700',
  'Sufficiente':      'bg-yellow-100 text-yellow-700',
  'Qualificato':      'bg-purple-100 text-purple-700',
  'Fuori Concorso':   'bg-gray-100 text-gray-600',
  'Non Classificato': 'bg-red-100 text-red-600',
}

function JudgeModal({ judge, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: judge?.name || '',
    nationality: judge?.nationality || '',
    specialization: judge?.specialization || '',
    notes: judge?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (judge) {
        await db.updateJudge(judge.id, form)
        toast.success('Giudice aggiornato')
      } else {
        await db.createJudge(form)
        toast.success('Giudice creato')
      }
      onSuccess()
    } catch (err) {
      toast.error(err?.message || 'Errore nel salvataggio')
      console.error('createJudge/updateJudge error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-gray-900">
            {judge ? 'Modifica giudice' : 'Nuovo giudice'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome e cognome *</label>
            <input
              type="text"
              required
              value={form.name}
              placeholder="Es: Mario Rossi"
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nazionalità</label>
            <input
              type="text"
              value={form.nationality}
              placeholder="Es: Italiano, Tedesco, Francese…"
              onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Specializzazione</label>
            <input
              type="text"
              value={form.specialization}
              placeholder="Es: All-round, Terrier, Golden Retriever…"
              onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Note</label>
            <textarea
              rows={2}
              value={form.notes}
              placeholder="Note aggiuntive sul giudice…"
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-sm">
              Annulla
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 text-sm disabled:opacity-50">
              {saving ? 'Salvataggio…' : judge ? 'Aggiorna' : 'Crea giudice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function JudgmentModal({ judges, dogs, preselectedJudgeId, initialData, judgmentId, onClose, onSuccess }) {
  const isEditing = !!judgmentId
  const [form, setForm] = useState({
    judge_id: initialData?.judge_id || preselectedJudgeId || '',
    dog_id: initialData?.dog_id || '',
    judgment_date: initialData?.judgment_date || new Date().toISOString().split('T')[0],
    show_name: initialData?.show_name || '',
    grade: initialData?.grade || '',
    judgment_text: initialData?.judgment_text || '',
    our_comments: initialData?.our_comments || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.judge_id) { toast.error('Seleziona un giudice'); return }
    if (!form.dog_id) { toast.error('Seleziona un cane'); return }
    setSaving(true)
    try {
      if (isEditing) {
        await db.updateJudgment(judgmentId, form)
        toast.success('Giudizio aggiornato')
      } else {
        await db.createJudgment(form)
        toast.success('Giudizio salvato')
      }
      onSuccess()
    } catch (err) {
      toast.error(err?.message || 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-gray-900">{isEditing ? 'Modifica giudizio' : 'Nuovo giudizio'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Giudice *</label>
              <select
                required
                value={form.judge_id}
                onChange={e => setForm(f => ({ ...f, judge_id: e.target.value }))}
                disabled={!!preselectedJudgeId}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm bg-white disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Seleziona giudice…</option>
                {judges.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Cane *</label>
              <select
                required
                value={form.dog_id}
                onChange={e => setForm(f => ({ ...f, dog_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm bg-white"
              >
                <option value="">Seleziona cane…</option>
                {dogs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Data esposizione *</label>
              <input
                type="date"
                required
                value={form.judgment_date}
                onChange={e => setForm(f => ({ ...f, judgment_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Qualifica</label>
              <select
                value={form.grade}
                onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm bg-white"
              >
                <option value="">Nessuna qualifica</option>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome esposizione</label>
            <input
              type="text"
              value={form.show_name}
              placeholder="Es: Esposizione Nazionale Milano 2024…"
              onChange={e => setForm(f => ({ ...f, show_name: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Giudizio del giudice</label>
            <textarea
              rows={3}
              value={form.judgment_text}
              placeholder="Testo del giudizio ufficiale…"
              onChange={e => setForm(f => ({ ...f, judgment_text: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nostri commenti</label>
            <textarea
              rows={2}
              value={form.our_comments}
              placeholder="Note personali…"
              onChange={e => setForm(f => ({ ...f, our_comments: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-sm">
              Annulla
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 text-sm disabled:opacity-50">
              {saving ? 'Salvataggio…' : isEditing ? 'Aggiorna' : 'Salva giudizio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Judges() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('giudici')
  const [search, setSearch] = useState('')
  const [judgeFilter, setJudgeFilter] = useState('tutti')
  const [gradeFilter, setGradeFilter] = useState('tutti')
  const [modalJudge, setModalJudge] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [judgmentModal, setJudgmentModal] = useState(null) // null | { preselectedJudgeId, initialData, judgmentId }

  const { data: judges = [], isLoading: loadingJudges } = useQuery({
    queryKey: ['judges'],
    queryFn: db.getJudges,
  })

  const { data: allJudgments = [], isLoading: loadingJudgments } = useQuery({
    queryKey: ['all-judgments'],
    queryFn: db.getAllJudgments,
  })

  const { data: dogs = [] } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => db.getDogs(),
  })

  function invalidate() {
    queryClient.invalidateQueries(['judges'])
    queryClient.invalidateQueries(['all-judgments'])
    queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'judgments' })
  }

  async function handleDeleteJudge(judge) {
    const count = allJudgments.filter(j => j.judge_id === judge.id).length
    const msg = count > 0
      ? `Eliminare "${judge.name}"? Verranno eliminati anche ${count} giudizi collegati.`
      : `Eliminare "${judge.name}"?`
    if (!window.confirm(msg)) return
    setDeletingId(judge.id)
    try {
      await db.deleteJudge(judge.id)
      toast.success('Giudice eliminato')
      invalidate()
    } catch (err) {
      toast.error('Errore nella rimozione')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDeleteJudgment(id) {
    if (!window.confirm('Eliminare questo giudizio?')) return
    setDeletingId(id)
    try {
      await db.deleteJudgment(id)
      toast.success('Giudizio eliminato')
      invalidate()
    } catch (err) {
      toast.error('Errore nella rimozione')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredJudges = judges.filter(j =>
    j.name.toLowerCase().includes(search.toLowerCase()) ||
    (j.nationality || '').toLowerCase().includes(search.toLowerCase()) ||
    (j.specialization || '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredJudgments = allJudgments.filter(j => {
    if (judgeFilter !== 'tutti' && j.judge_id !== judgeFilter) return false
    if (gradeFilter !== 'tutti' && j.grade !== gradeFilter) return false
    return true
  })

  const statsEcc = allJudgments.filter(j => j.grade === 'Eccellente').length
  const presentGrades = [...new Set(allJudgments.map(j => j.grade).filter(Boolean))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Giudici</h2>
          <p className="text-gray-500 mt-1">Gestisci giudici e giudizi delle esposizioni</p>
        </div>
        <button
          onClick={() => { setModalJudge(null); setShowModal(true) }}
          className="flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-2xl font-bold hover:bg-yellow-600 transition shadow-lg shadow-yellow-500/30"
        >
          <Plus className="w-5 h-5" />
          Nuovo Giudice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 p-8 rounded-[40px] shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold opacity-80 uppercase text-xs">Giudici Registrati</p>
              <User className="w-6 h-6 opacity-50" />
            </div>
            <h3 className="text-5xl font-black">{judges.length}</h3>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
        </div>

        <div className="bg-gradient-to-br from-purple-400 to-purple-500 p-8 rounded-[40px] shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold opacity-80 uppercase text-xs">Giudizi Totali</p>
              <Trophy className="w-6 h-6 opacity-50" />
            </div>
            <h3 className="text-5xl font-black">{allJudgments.length}</h3>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
        </div>

        <div className="bg-gradient-to-br from-emerald-400 to-emerald-500 p-8 rounded-[40px] shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold opacity-80 uppercase text-xs">Eccellenti</p>
              <Star className="w-6 h-6 opacity-50" />
            </div>
            <h3 className="text-5xl font-black">{statsEcc}</h3>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'giudici', label: 'Giudici', icon: User },
          { id: 'giudizi', label: 'Tutti i Giudizi', icon: Trophy },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 font-bold transition ${
              activeTab === tab.id
                ? 'text-yellow-600 border-b-2 border-yellow-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB GIUDICI ── */}
      {activeTab === 'giudici' && (
        <div className="space-y-4">
          {/* Ricerca */}
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca giudice…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm"
            />
          </div>

          {loadingJudges ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
            </div>
          ) : filteredJudges.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Nessun giudice trovato</h3>
              <p className="text-gray-500">Aggiungi il primo giudice tramite il pulsante in alto</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredJudges.map(judge => {
                const judgeJudgments = allJudgments.filter(j => j.judge_id === judge.id)
                const eccCount = judgeJudgments.filter(j => j.grade === 'Eccellente').length
                return (
                  <div key={judge.id} className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm hover:border-yellow-200 transition group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-black text-gray-900">{judge.name}</p>
                          {judge.nationality && (
                            <p className="text-xs text-gray-400 font-semibold">{judge.nationality}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => { setModalJudge(judge); setShowModal(true) }}
                          className="p-2 hover:bg-yellow-50 rounded-xl transition text-yellow-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteJudge(judge)}
                          disabled={deletingId === judge.id}
                          className="p-2 hover:bg-red-50 rounded-xl transition text-red-400 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {judge.specialization && (
                      <p className="text-sm text-gray-500 mb-3">{judge.specialization}</p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex gap-3">
                        <div className="text-center">
                          <p className="text-lg font-black text-gray-900">{judgeJudgments.length}</p>
                          <p className="text-xs text-gray-400 font-semibold">Giudizi</p>
                        </div>
                        {eccCount > 0 && (
                          <div className="text-center">
                            <p className="text-lg font-black text-emerald-600">{eccCount}</p>
                            <p className="text-xs text-emerald-400 font-semibold">Eccellenti</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setJudgmentModal({ preselectedJudgeId: judge.id })}
                          className="flex items-center gap-1 text-xs font-bold text-yellow-600 hover:text-yellow-700 border border-yellow-200 hover:bg-yellow-50 px-2.5 py-1.5 rounded-xl transition"
                        >
                          <Plus className="w-3 h-3" /> Giudizio
                        </button>
                        {judgeJudgments.length > 0 && (
                          <button
                            onClick={() => { setJudgeFilter(judge.id); setActiveTab('giudizi') }}
                            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 transition"
                          >
                            Vedi <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {judge.notes && (
                      <p className="text-xs text-gray-400 mt-2 italic">{judge.notes}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB TUTTI I GIUDIZI ── */}
      {activeTab === 'giudizi' && (
        <div className="space-y-4">
          {/* Filtri + bottone aggiungi */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Giudice</label>
              <select
                value={judgeFilter}
                onChange={e => setJudgeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm bg-white min-w-[180px]"
              >
                <option value="tutti">Tutti i giudici</option>
                {judges.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Qualifica</label>
              <select
                value={gradeFilter}
                onChange={e => setGradeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm bg-white min-w-[160px]"
              >
                <option value="tutti">Tutte le qualifiche</option>
                {GRADES.filter(g => presentGrades.includes(g)).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            {(judgeFilter !== 'tutti' || gradeFilter !== 'tutti') && (
              <button
                onClick={() => { setJudgeFilter('tutti'); setGradeFilter('tutti') }}
                className="px-3 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Azzera filtri
              </button>
            )}
            <div className="ml-auto">
              <button
                onClick={() => setJudgmentModal({ preselectedJudgeId: judgeFilter !== 'tutti' ? judgeFilter : null })}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" /> Aggiungi giudizio
              </button>
            </div>
          </div>

          {loadingJudgments ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
            </div>
          ) : filteredJudgments.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Nessun giudizio trovato</h3>
              <p className="text-gray-500">Aggiungi il primo giudizio tramite il pulsante in alto</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJudgments.map(j => (
                <div key={j.id} className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{j.judge?.name || '—'}</p>
                        {(j.judge?.nationality || j.judge?.specialization) && (
                          <p className="text-xs text-gray-400">
                            {[j.judge.nationality, j.judge.specialization].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/dogs/${j.dog_id}`)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                      >
                        {j.dog?.name || 'Cane'} <ChevronRight className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setJudgmentModal({
                          judgmentId: j.id,
                          preselectedJudgeId: null,
                          initialData: {
                            judge_id: j.judge_id,
                            dog_id: j.dog_id,
                            judgment_date: j.judgment_date,
                            show_name: j.show_name || '',
                            grade: j.grade || '',
                            judgment_text: j.judgment_text || '',
                            our_comments: j.our_comments || '',
                          },
                        })}
                        className="p-2 hover:bg-yellow-50 rounded-xl transition text-yellow-500"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteJudgment(j.id)}
                        disabled={deletingId === j.id}
                        className="p-2 hover:bg-red-50 rounded-xl transition text-red-400 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center mt-3">
                    {j.grade && (
                      <span className={`px-3 py-1 rounded-xl text-xs font-bold ${GRADE_COLORS[j.grade] || 'bg-gray-100 text-gray-600'}`}>
                        <Star className="w-3 h-3 inline mr-1" />{j.grade}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 font-semibold">
                      {format(new Date(j.judgment_date + 'T00:00:00'), 'dd MMMM yyyy', { locale: it })}
                    </span>
                    {j.show_name && (
                      <span className="text-xs text-gray-500 font-semibold">· {j.show_name}</span>
                    )}
                  </div>

                  {j.judgment_text && (
                    <div className="bg-gray-50 rounded-xl p-3 mt-3">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> Giudizio ufficiale
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{j.judgment_text}</p>
                    </div>
                  )}

                  {j.our_comments && (
                    <div className="bg-blue-50 rounded-xl p-3 mt-2">
                      <p className="text-xs font-bold text-blue-400 uppercase mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Nostri commenti
                      </p>
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">{j.our_comments}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal crea/modifica giudice */}
      {showModal && (
        <JudgeModal
          judge={modalJudge}
          onClose={() => { setShowModal(false); setModalJudge(null) }}
          onSuccess={() => { setShowModal(false); setModalJudge(null); invalidate() }}
        />
      )}

      {/* Modal nuovo giudizio */}
      {judgmentModal && (
        <JudgmentModal
          judges={judges}
          dogs={dogs}
          preselectedJudgeId={judgmentModal.preselectedJudgeId}
          initialData={judgmentModal.initialData}
          judgmentId={judgmentModal.judgmentId}
          onClose={() => setJudgmentModal(null)}
          onSuccess={() => { setJudgmentModal(null); invalidate() }}
        />
      )}
    </div>
  )
}
