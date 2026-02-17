import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { TrendingUp } from 'lucide-react'

export default function DogGrowthChart({ dogId }) {
  const { data: measurements = [], isLoading } = useQuery({
    queryKey: ['dog-measurements', dogId],
    queryFn: () => db.getDogMeasurements(dogId),
    enabled: !!dogId,
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

  // Prepara i dati per il grafico
  const chartData = measurements.map(m => ({
    date: format(new Date(m.measurement_date), 'dd/MM/yy'),
    fullDate: format(new Date(m.measurement_date), 'dd MMMM yyyy', { locale: it }),
    weight: m.weight ? parseFloat(m.weight) : null,
    height: m.height ? parseFloat(m.height) : null,
  }))

  // Verifica se ci sono dati per peso e altezza
  const hasWeight = measurements.some(m => m.weight)
  const hasHeight = measurements.some(m => m.height)

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
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

