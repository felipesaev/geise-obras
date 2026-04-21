import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, TextInput,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface Obra {
  id: string
  nome: string
  endereco: string | null
  status: string
  progresso_percentual: number
  data_conclusao_prevista: string | null
  valor_contratado: number
  projeto: { nome: string; numero: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; accent: string; bg: string; text: string }> = {
  aguardando_inicio: { label: 'Aguardando', accent: '#94a3b8', bg: '#f1f5f9', text: '#475569' },
  em_andamento:      { label: 'Em andamento', accent: '#c4956a', bg: '#fdf6ee', text: '#a0693a' },
  paralisada:        { label: 'Paralisada', accent: '#eab308', bg: '#fefce8', text: '#92400e' },
  concluida:         { label: 'Concluída', accent: '#22c55e', bg: '#f0fdf4', text: '#15803d' },
  cancelada:         { label: 'Cancelada', accent: '#ef4444', bg: '#fef2f2', text: '#b91c1c' },
}

function formatMes(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

export default function Obras() {
  const { signOut } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<string | null>(null)

  useFocusEffect(useCallback(() => {
    setLoading(true)
    supabase
      .from('obras')
      .select('id, nome, endereco, status, progresso_percentual, data_conclusao_prevista, valor_contratado, projeto:projetos(nome, numero)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setObras((data ?? []) as unknown as Obra[])
        setLoading(false)
      })
  }, []))

  const obrasFiltradas = obras.filter(o => {
    const matchBusca = !busca || o.nome.toLowerCase().includes(busca.toLowerCase())
      || (o.endereco ?? '').toLowerCase().includes(busca.toLowerCase())
    const matchFiltro = !filtro || o.status === filtro
    return matchBusca && matchFiltro
  })

  const emAndamento = obras.filter(o => o.status === 'em_andamento').length

  const FILTROS = [
    { key: null, label: 'Todas' },
    { key: 'em_andamento', label: 'Em andamento' },
    { key: 'aguardando_inicio', label: 'Aguardando' },
    { key: 'paralisada', label: 'Paralisadas' },
    { key: 'concluida', label: 'Concluídas' },
  ]

  const renderObra = ({ item }: { item: Obra }) => {
    const st = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.em_andamento
    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: st.accent }]}
        onPress={() => router.push(`/obras/${item.id}`)}
        activeOpacity={0.82}
      >
        <View style={styles.cardTop}>
          {item.projeto && (
            <Text style={styles.cardProjeto} numberOfLines={1}>
              {item.projeto.numero ? `${item.projeto.numero} · ` : ''}{item.projeto.nome}
            </Text>
          )}
          <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
          </View>
        </View>

        <Text style={styles.cardNome}>{item.nome}</Text>
        {item.endereco && (
          <Text style={styles.cardEndereco} numberOfLines={1}>{item.endereco}</Text>
        )}

        <View style={styles.cardBottom}>
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${item.progresso_percentual}%` as any, backgroundColor: st.accent }]} />
            </View>
            <Text style={styles.progressPct}>{item.progresso_percentual}%</Text>
          </View>
          {item.data_conclusao_prevista && (
            <Text style={styles.prazo}>{formatMes(item.data_conclusao_prevista)}</Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.headerRight}>
          <Text style={styles.versaoText}>v1.1.0</Text>
          <TouchableOpacity onPress={signOut} style={styles.sairBtn}>
            <Feather name="log-out" size={18} color="#c0b8b0" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={obrasFiltradas}
        keyExtractor={o => o.id}
        renderItem={renderObra}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        ListHeaderComponent={
          <>
            {/* Título */}
            <View style={styles.titleRow}>
              <Text style={styles.pageTitle}>Obras</Text>
              {emAndamento > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{emAndamento} ativas</Text>
                </View>
              )}
            </View>

            {/* Busca */}
            <View style={styles.buscaWrap}>
              <Feather name="search" size={14} color="#b0a090" style={styles.buscaIcon} />
              <TextInput
                style={styles.buscaInput}
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar obra..."
                placeholderTextColor="#c0b8b0"
              />
              {busca.length > 0 && (
                <TouchableOpacity onPress={() => setBusca('')}>
                  <Feather name="x" size={14} color="#b0a090" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filtros */}
            <FlatList
              horizontal
              data={FILTROS}
              keyExtractor={f => String(f.key)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtrosRow}
              renderItem={({ item: f }) => (
                <TouchableOpacity
                  style={[styles.filtroPill, filtro === f.key && styles.filtroPillAtivo]}
                  onPress={() => setFiltro(f.key)}
                >
                  <Text style={[styles.filtroPillText, filtro === f.key && styles.filtroPillTextAtivo]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              )}
            />

            {loading && (
              <View style={styles.center}>
                <ActivityIndicator color="#d4b89b" />
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.center}>
              <Text style={styles.vazioText}>Nenhuma obra encontrada.</Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F0EC' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  logo: { width: 110, height: 34 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  versaoText: { fontSize: 11, color: '#c0b8b0', fontWeight: '500' },
  sairBtn: { padding: 4 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, marginBottom: 16 },
  pageTitle: { fontSize: 28, color: '#1a1a1a', fontWeight: '200', letterSpacing: -0.5 },
  badge: {
    backgroundColor: '#c4956a',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  buscaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  buscaIcon: {},
  buscaInput: { flex: 1, fontSize: 14, color: '#1a1a1a' },

  filtrosRow: { gap: 8, paddingBottom: 16 },
  filtroPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8e4e0',
  },
  filtroPillAtivo: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  filtroPillText: { fontSize: 12, color: '#7a7270' },
  filtroPillTextAtivo: { color: '#fff', fontWeight: '600' },

  list: { paddingHorizontal: 16, paddingTop: 8 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderLeftWidth: 3,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#a08060',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardProjeto: { fontSize: 10, color: '#b0a090', flex: 1, marginRight: 8 },
  statusPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '600' },
  cardNome: { fontSize: 17, color: '#1a1a1a', fontWeight: '400', marginBottom: 4 },
  cardEndereco: { fontSize: 11, color: '#b0a090', marginBottom: 12 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 3, backgroundColor: '#F0EBE5', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressPct: { fontSize: 11, color: '#9a9088', width: 30, textAlign: 'right' },
  prazo: { fontSize: 11, color: '#b0a090' },

  center: { paddingVertical: 40, alignItems: 'center' },
  vazioText: { fontSize: 14, color: '#9a9088' },
})
