import { useState } from 'react'
import { Plus, Users, Pencil, Trash2, Phone, Mail } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import { FeatureGate } from '@/components/FeatureGate'
import { ACCESS_STATUS } from '@/lib/permissions'
import StaffForm from '@/components/routines/StaffForm'
import toast from 'react-hot-toast'

const initialOf = (name) => (name || '?').trim().charAt(0).toUpperCase()

export default function Staff() {
  const queryClient = useQueryClient()
  const [staffModal, setStaffModal] = useState(null) // { member } | null
  const [confirmDialog, setConfirmDialog] = useState(null)

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => db.getStaff(),
  })

  const handleSaved = () => {
    setStaffModal(null)
    queryClient.invalidateQueries({ queryKey: ['staff'] })
    queryClient.invalidateQueries({ queryKey: ['routine-tasks'] })
  }

  const handleDelete = (member) => {
    setConfirmDialog({
      message: `Eliminare il dipendente "${member.name}"? Le routine assegnate resteranno, ma senza assegnatario.`,
      onConfirm: async () => {
        try {
          await db.deleteStaff(member.id)
          toast.success('Dipendente eliminato')
          queryClient.invalidateQueries({ queryKey: ['staff'] })
          queryClient.invalidateQueries({ queryKey: ['routines'] })
          queryClient.invalidateQueries({ queryKey: ['routine-tasks'] })
        } catch (err) {
          console.error('delete staff error:', err)
          toast.error('Errore durante l\'eliminazione')
        } finally {
          setConfirmDialog(null)
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-dark-900">Dipendenti</h2>
          <p className="text-gray-500 mt-1">Gestisci i collaboratori e i loro accessi all’app</p>
        </div>
        <button
          onClick={() => setStaffModal({ member: null })}
          className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/30"
        >
          <Plus className="w-5 h-5" />
          Nuovo Dipendente
        </button>
      </div>

      <FeatureGate feature="staff">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Nessun dipendente</h3>
            <p className="text-gray-500 mb-5 max-w-md mx-auto">
              Aggiungi i tuoi collaboratori per assegnare loro le routine e dare un accesso limitato all’app.
            </p>
            <button
              onClick={() => setStaffModal({ member: null })}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition"
            >
              <Plus className="w-5 h-5" /> Nuovo Dipendente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {staff.map((s) => (
              <div
                key={s.id}
                className={`bg-white rounded-3xl border-2 border-gray-100 p-5 transition hover:shadow-lg ${s.active === false ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black flex-shrink-0 text-lg"
                      style={{ backgroundColor: s.color || '#94a3b8' }}
                    >
                      {initialOf(s.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-gray-900 truncate">{s.name}</p>
                      <p className="text-sm text-gray-500 truncate">{s.role || 'Dipendente'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setStaffModal({ member: s })} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(s)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {s.access_status && s.access_status !== 'nessuno' && ACCESS_STATUS[s.access_status] && (
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg mb-1"
                      style={{ backgroundColor: `${ACCESS_STATUS[s.access_status].color}1A`, color: ACCESS_STATUS[s.access_status].color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ACCESS_STATUS[s.access_status].color }} />
                      Accesso: {ACCESS_STATUS[s.access_status].label}
                    </span>
                  )}
                  {s.phone && (
                    <p className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400" /> {s.phone}
                    </p>
                  )}
                  {s.email && (
                    <p className="flex items-center gap-2 text-sm text-gray-600 truncate">
                      <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> {s.email}
                    </p>
                  )}
                  {s.active === false && (
                    <span className="inline-block mt-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">Non in servizio</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </FeatureGate>

      {/* Modale dipendente */}
      {staffModal && (
        <StaffForm
          member={staffModal.member}
          onClose={() => setStaffModal(null)}
          onSuccess={handleSaved}
        />
      )}

      {/* Conferma eliminazione */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 space-y-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-gray-900">Conferma eliminazione</h3>
              <p className="text-gray-500 text-sm">{confirmDialog.message}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition"
              >
                Annulla
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 px-4 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition shadow-lg shadow-red-500/30"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
