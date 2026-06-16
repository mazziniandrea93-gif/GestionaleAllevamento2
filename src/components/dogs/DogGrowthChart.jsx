import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { TrendingUp } from 'lucide-react'

// Interpola linearmente il valore medio a una data età (in mesi) tra le
// fasce note. Ritorna null se non ci sono dati di riferimento utilizzabili.
function avgAtAge(buckets, ageMonths, key) {
  const pts = buckets.filter(b => b[key] != null)
  if (pts.length === 0) return null
  if (pts.length === 1) return pts[0][key]

  // Prima/dopo i limiti: usa il valore dell'estremo più vicino
  if (ageMonths <= pts[0].ageMonths) return pts[0][key]
  if (ageMonths >= pts[pts.length - 1].ageMonths) return pts[pts.length - 1][key]

  for (let i = 0; i < pts.length - 1; i++) {
    const lo = pts[i]
    const hi = pts[i + 1]
    if (ageMonths >= lo.ageMonths && ageMonths <= hi.ageMonths) {
      const span = hi.ageMonths - lo.ageMonths
      if (span === 0) return lo[key]
      const t = (ageMonths - lo.ageMonths) / span
      return lo[key] + t * (hi[key] - lo[key])
    }
  }
  return null
}

export default function DogGrowthChart({ dogId, dog }) {
  const { data: measurements = [], isLoading } = useQuery({
    queryKey: ['dog-measurements', dogId],
    queryFn: () => db.getDogMeasurements(dogId),
    enabled: !!dogId,
  })

  const { data: breedAverages = [] } = useQuery({
    queryKey: ['breed-growth-averages', dog?.breed, dogId],
    queryFn: () => db.getBreedGrowthAverages(dog.breed, dogId),
    enabled: !!dog?.breed,
    staleTime: 1000 * 60 * 60, // 1h: i dati di razza cambiano di rado
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (measurements.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-2xl">
        <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 font-semibold">Nessun dato disponibile</p>
        <p className="text-sm text-gray-500 mt-2">
          Aggiungi almeno 2 misurazioni per visualizzare il grafico di crescita
        </p>
      </div>
    )
  }

  const birthDate = dog?.birth_date ? new Date(dog.birth_date) : null
  const hasAverages = breedAverages.length > 0 && !!birthDate

  // Prepara i dati per il grafico. Se disponibile, aggiunge la media di razza
  // calcolata all'età del cane al momento di ciascuna misurazione.
  const chartData = measurements.map(m => {
    const point = {
      date: format(new Date(m.measurement_date), 'dd/MM/yy'),
      fullDate: format(new Date(m.measurement_date), 'dd MMMM yyyy', { locale: it }),
      weight: m.weight ? parseFloat(m.weight) : null,
      height: m.height ? parseFloat(m.height) : null,
    }
    if (hasAverages) {
      const ageMonths = Math.max(0, Math.round(
        (new Date(m.measurement_date) - birthDate) / (1000 * 60 * 60 * 24 * 30.44)
      ))
      point.avgWeight = avgAtAge(breedAverages, ageMonths, 'avgWeight')
      point.avgHeight = avgAtAge(breedAverages, ageMonths, 'avgHeight')
    }
    return point
  })

  // Verifica se ci sono dati per peso e altezza
  const hasWeight = measurements.some(m => m.weight)
  const hasHeight = measurements.some(m => m.height)
  const hasAvgWeight = hasAverages && chartData.some(d => d.avgWeight != null)
  const hasAvgHeight = hasAverages && chartData.some(d => d.avgHeight != null)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-black text-gray-900 mb-2">Grafico di Crescita</h3>
        <p className="text-sm text-gray-600">Visualizzazione dell'andamento di peso e altezza nel tempo</p>
      </div>

      {/* Grafico Peso */}
      {hasWeight && (
        <div className="bg-white p-6 rounded-2xl border-2 border-gray-200">
          <h4 className="text-lg font-bold text-gray-900 mb-4">Andamento Peso (kg)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: 600 }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: 600 }}
                label={{ value: 'kg', angle: -90, position: 'insideLeft', style: { fontWeight: 700 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '12px',
                  fontWeight: 600,
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullDate
                  }
                  return label
                }}
                formatter={(value, name) => {
                  if (name === 'weight') return [`${value} kg`, 'Peso']
                  if (name === 'avgWeight') return [`${Number(value).toFixed(1)} kg`, `Media ${dog?.breed || 'razza'}`]
                  return [value, name]
                }}
              />
              <Legend
                wrapperStyle={{ fontWeight: 600, paddingTop: '20px' }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5 }}
                activeDot={{ r: 7 }}
                name="Peso"
              />
              {hasAvgWeight && (
                <Line
                  type="monotone"
                  dataKey="avgWeight"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={false}
                  name={`Media ${dog?.breed || 'razza'}`}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Grafico Altezza */}
      {hasHeight && (
        <div className="bg-white p-6 rounded-2xl border-2 border-gray-200">
          <h4 className="text-lg font-bold text-gray-900 mb-4">Andamento Altezza (cm)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: 600 }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: 600 }}
                label={{ value: 'cm', angle: -90, position: 'insideLeft', style: { fontWeight: 700 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '12px',
                  fontWeight: 600,
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullDate
                  }
                  return label
                }}
                formatter={(value, name) => {
                  if (name === 'height') return [`${value} cm`, 'Altezza']
                  if (name === 'avgHeight') return [`${Number(value).toFixed(1)} cm`, `Media ${dog?.breed || 'razza'}`]
                  return [value, name]
                }}
              />
              <Legend
                wrapperStyle={{ fontWeight: 600, paddingTop: '20px' }}
              />
              <Line
                type="monotone"
                dataKey="height"
                stroke="#a855f7"
                strokeWidth={3}
                dot={{ fill: '#a855f7', r: 5 }}
                activeDot={{ r: 7 }}
                name="Altezza"
              />
              {hasAvgHeight && (
                <Line
                  type="monotone"
                  dataKey="avgHeight"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={false}
                  name={`Media ${dog?.breed || 'razza'}`}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Grafico Combinato (se ci sono entrambi i dati) */}
      {hasWeight && hasHeight && (
        <div className="bg-white p-6 rounded-2xl border-2 border-gray-200">
          <h4 className="text-lg font-bold text-gray-900 mb-4">Andamento Combinato</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: 600 }}
              />
              <YAxis
                yAxisId="left"
                stroke="#3b82f6"
                style={{ fontSize: '12px', fontWeight: 600 }}
                label={{ value: 'kg', angle: -90, position: 'insideLeft', style: { fontWeight: 700 } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#a855f7"
                style={{ fontSize: '12px', fontWeight: 600 }}
                label={{ value: 'cm', angle: 90, position: 'insideRight', style: { fontWeight: 700 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '12px',
                  fontWeight: 600,
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullDate
                  }
                  return label
                }}
                formatter={(value, name) => {
                  if (name === 'weight') return [`${value} kg`, 'Peso']
                  if (name === 'height') return [`${value} cm`, 'Altezza']
                  if (name === 'avgWeight') return [`${Number(value).toFixed(1)} kg`, 'Media peso']
                  if (name === 'avgHeight') return [`${Number(value).toFixed(1)} cm`, 'Media altezza']
                  return [value, name]
                }}
              />
              <Legend
                wrapperStyle={{ fontWeight: 600, paddingTop: '20px' }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="weight"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5 }}
                activeDot={{ r: 7 }}
                name="Peso"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="height"
                stroke="#a855f7"
                strokeWidth={3}
                dot={{ fill: '#a855f7', r: 5 }}
                activeDot={{ r: 7 }}
                name="Altezza"
              />
              {hasAvgWeight && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avgWeight"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={false}
                  name="Media peso"
                />
              )}
              {hasAvgHeight && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgHeight"
                  stroke="#c084fc"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={false}
                  name="Media altezza"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

