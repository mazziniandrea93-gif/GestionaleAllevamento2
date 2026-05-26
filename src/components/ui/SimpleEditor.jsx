import { useRef } from 'react'
import { List, Minus } from 'lucide-react'

// Inserisce testo alla posizione del cursore in una textarea
function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const newValue = value.slice(0, start) + text + value.slice(end)
  // Aggiorna il valore tramite il setter nativo (compatibile con React)
  const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
  nativeInputSetter.call(textarea, newValue)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  // Riposiziona il cursore dopo il testo inserito
  requestAnimationFrame(() => {
    textarea.selectionStart = start + text.length
    textarea.selectionEnd = start + text.length
    textarea.focus()
  })
}

// Aggiunge "• " all'inizio di ogni riga selezionata
function toggleBullets(textarea) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value

  // Trova l'inizio della prima riga selezionata
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const selectedText = value.slice(lineStart, end)
  const lines = selectedText.split('\n')

  const allBulleted = lines.every(l => l.startsWith('• ') || l === '')
  const newLines = lines.map(l => {
    if (l === '') return l
    if (allBulleted) return l.startsWith('• ') ? l.slice(2) : l
    return l.startsWith('• ') ? l : `• ${l}`
  })

  const newSelected = newLines.join('\n')
  const newValue = value.slice(0, lineStart) + newSelected + value.slice(end)
  const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
  nativeInputSetter.call(textarea, newValue)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  requestAnimationFrame(() => {
    textarea.selectionStart = lineStart
    textarea.selectionEnd = lineStart + newSelected.length
    textarea.focus()
  })
}

export default function SimpleEditor({ value, onChange, placeholder, rows = 5, accentColor = 'primary' }) {
  const ref = useRef(null)

  const colorMap = {
    primary: { toolbar: 'bg-gray-100 border-gray-200', btn: 'hover:bg-gray-200 text-gray-600', border: 'border-gray-200 focus:border-primary-500 focus:ring-primary-200' },
    amber:   { toolbar: 'bg-amber-50 border-amber-200',  btn: 'hover:bg-amber-200 text-amber-700', border: 'border-amber-200 focus:border-amber-400 focus:ring-amber-100' },
    green:   { toolbar: 'bg-green-50 border-green-200',  btn: 'hover:bg-green-200 text-green-700', border: 'border-green-200 focus:border-green-400 focus:ring-green-100' },
  }
  const c = colorMap[accentColor] || colorMap.primary

  return (
    <div className={`rounded-xl border-2 overflow-hidden ${c.border.split(' ')[0]}`}>
      {/* Toolbar */}
      <div className={`flex items-center gap-1 px-2 py-1.5 border-b ${c.toolbar}`}>
        <button
          type="button"
          title="Aggiungi punto elenco alle righe selezionate"
          onClick={() => ref.current && toggleBullets(ref.current)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition ${c.btn}`}
        >
          <List className="w-3.5 h-3.5" />
          Elenco
        </button>

        <button
          type="button"
          title="Inserisci separatore"
          onClick={() => ref.current && insertAtCursor(ref.current, '\n─────────────────────\n')}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition ${c.btn}`}
        >
          <Minus className="w-3.5 h-3.5" />
          Separatore
        </button>

        <div className="flex-1" />
        <span className="text-xs text-gray-400 pr-1">{value?.length || 0} car.</span>
      </div>

      {/* Textarea */}
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-4 py-3 text-sm outline-none resize-none bg-white focus:ring-2 transition ${c.border}`}
        style={{ borderTop: 'none', borderRadius: 0 }}
      />
    </div>
  )
}
