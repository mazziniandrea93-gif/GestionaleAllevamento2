import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail, Lock, Building2, ArrowRight } from 'lucide-react'

function BrandIcon() {
  return (
    <svg viewBox="0 0 65 55.02" className="w-14 h-14 flex-shrink-0">
      <path fill="#35ED6C" d="M55,38.52h-2.41c-.89,0-1.62-.73-1.62-1.62v-9.91c0-.89-.73-1.62-1.62-1.62h-5.66c-.89,0-1.62-.73-1.62-1.62v-5.5c0-.89-.73-1.62-1.62-1.62h-17.08c-.89,0-1.62.73-1.62,1.62v5.5c0,.89-.73,1.62-1.62,1.62h-5.66c-.89,0-1.62.73-1.62,1.62v9.91c0,.89-.73,1.62-1.62,1.62h-2.97c-.89,0-1.62.73-1.62,1.62v8.59c0,.89.73,1.62,1.62,1.62h17.08c.89,0,1.62-.73,1.62-1.62v-2.67c0-.89.73-1.62,1.62-1.62h6.1c.89,0,1.62.73,1.62,1.62v2.67c0,.89.73,1.62,1.62,1.62h17.08c.89,0,1.62-.73,1.62-1.62v-8.59c0-.89-.73-1.62-1.62-1.62ZM35.92,34.85c0,.89-.73,1.62-1.62,1.62h-4.78c-.89,0-1.62-.73-1.62-1.62v-4.78c0-.89.73-1.62,1.62-1.62h4.78c.89,0,1.62.73,1.62,1.62v4.78Z"/>
      <rect fill="#35ED6C" x="1.03" y="13.05" width="11.82" height="11.82" rx="1.62" ry="1.62"/>
      <rect fill="#35ED6C" x="15.84" y=".73" width="11.82" height="11.82" rx="1.62" ry="1.62"/>
      <rect fill="#35ED6C" x="36.16" y=".73" width="11.82" height="11.82" rx="1.62" ry="1.62"/>
      <rect fill="#35ED6C" x="50.97" y="13.05" width="11.82" height="11.82" rx="1.62" ry="1.62"/>
    </svg>
  )
}

export function Auth() {
  const [view, setView] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [kennelName, setKennelName] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const isLogin = view === 'login'

  function switchView(next) {
    setView(next)
    setEmail('')
    setPassword('')
    setKennelName('')
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth',
      })
      if (error) throw error
      toast.success('Email inviata! Controlla la tua casella di posta.')
      switchView('login')
    } catch (error) {
      toast.error(error.message || 'Errore nell\'invio della email')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/dashboard' }
      })
      if (error) throw error
    } catch (error) {
      toast.error(error.message || 'Errore con il login Google')
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      toast.success('Login effettuato con successo!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.message || 'Errore durante il login')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { kennel_name: kennelName, account_type: 'allevamento' } }
      })
      if (authError) throw authError

      await new Promise(resolve => setTimeout(resolve, 1000))

      if (authData.user) {
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings').select('id').eq('user_id', authData.user.id).single()
        if (settingsError || !settingsData) {
          await supabase.from('settings').insert({
            user_id: authData.user.id,
            kennel_name: kennelName || 'Il Mio Allevamento',
            default_heat_cycle_days: 180,
            default_pregnancy_days: 63
          })
        }
      }

      toast.success('Registrazione completata! Controlla la tua email per confermare.')
      switchView('login')
    } catch (error) {
      toast.error(error.message || 'Errore durante la registrazione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Pannello sinistro (brand) ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 flex-col justify-between p-12">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <BrandIcon />
          <div>
            <p className="text-white font-bold text-lg leading-tight">Allevamento</p>
            <p className="text-primary-100 font-semibold text-xs tracking-widest uppercase">Digitale</p>
          </div>
        </div>

        {/* Claim centrale */}
        <div>
          <h1 className="text-5xl font-black text-white leading-tight mb-6">
            Gestisci il tuo<br />
            <span className="text-primary-100">allevamento</span><br />
            in modo smart.
          </h1>
          <p className="text-primary-200 text-lg leading-relaxed">
            Cani, cuccioli, riproduzione, salute e finanze — tutto in un unico posto.
          </p>
        </div>

        {/* Decorazione bottom */}
        <div className="flex gap-3">
          <div className="w-2 h-2 rounded-full bg-accent-DEFAULT"></div>
          <div className="w-2 h-2 rounded-full bg-white/20"></div>
          <div className="w-2 h-2 rounded-full bg-white/20"></div>
        </div>
      </div>

      {/* ── Pannello destro (form) ── */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <BrandIcon />
            <div>
              <p className="text-primary-900 font-bold text-lg leading-tight">Allevamento</p>
              <p className="text-primary-400 font-semibold text-xs tracking-widest uppercase">Digitale</p>
            </div>
          </div>

          {/* Titolo form */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-primary-900">
              {view === 'login' && 'Bentornato'}
              {view === 'register' && 'Crea account'}
              {view === 'forgot' && 'Recupera password'}
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              {view === 'login' && 'Accedi al tuo gestionale'}
              {view === 'register' && 'Inizia a gestire il tuo allevamento'}
              {view === 'forgot' && 'Ti inviamo un link via email'}
            </p>
          </div>

          {/* ── RECUPERA PASSWORD ── */}
          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="tua@email.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-300 focus:border-transparent outline-none text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-900 text-white rounded-xl font-bold hover:bg-primary-800 transition disabled:opacity-50"
              >
                {loading ? 'Invio…' : 'Invia link di recupero'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
              <button type="button" onClick={() => switchView('login')} className="w-full text-sm text-primary-600 hover:text-primary-800 font-medium text-center">
                ← Torna al login
              </button>
            </form>
          )}

          {/* ── LOGIN / REGISTER ── */}
          {view !== 'forgot' && (
            <>
              <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
                {!isLogin && (
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={kennelName}
                      onChange={e => setKennelName(e.target.value)}
                      required
                      placeholder="Nome allevamento"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-300 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="tua@email.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-300 focus:border-transparent outline-none text-sm"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Password"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-300 focus:border-transparent outline-none text-sm"
                  />
                </div>

                {isLogin && (
                  <div className="text-right">
                    <button type="button" onClick={() => switchView('forgot')} className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                      Password dimenticata?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-900 text-white rounded-xl font-bold hover:bg-primary-800 transition disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                  ) : (
                    <>
                      {isLogin ? 'Accedi' : 'Registrati'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divisore */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-gray-400 uppercase tracking-wider">oppure</span>
                </div>
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-primary-300 hover:bg-primary-50 transition"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continua con Google
              </button>

              {/* Switch login/register */}
              <p className="text-center text-sm text-gray-500 mt-6">
                {isLogin ? 'Non hai un account?' : 'Hai già un account?'}{' '}
                <button
                  onClick={() => switchView(isLogin ? 'register' : 'login')}
                  className="text-primary-700 font-bold hover:text-primary-900 transition"
                >
                  {isLogin ? 'Registrati' : 'Accedi'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
