import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'

interface Obra {
  id: string
  nome: string
  endereco: string | null
  status: string
  progresso_percentual: number | null
  data_conclusao_prevista: string | null
  valor_contratado: number | null
}

const STATUS_CONFIG: Record<string, { label: string; accent: string; bg: string; text: string }> = {
  aguardando_inicio: { label: 'Aguardando início', accent: '#94a3b8', bg: '#f1f5f9', text: '#475569' },
  em_andamento:      { label: 'Em andamento', accent: '#c4956a', bg: '#fdf6ee', text: '#a0693a' },
  paralisada:        { label: 'Paralisada', accent: '#eab308', bg: '#fefce8', text: '#92400e' },
  concluida:         { label: 'Concluída', accent: '#22c55e', bg: '#f0fdf4', text: '#15803d' },
  cancelada:         { label: 'Cancelada', accent: '#ef4444', bg: '#fef2f2', text: '#b91c1c' },
}

type Tab = 'visitas' | 'diario' | 'pendencias' | 'medicoes' | 'aditivos'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'visitas',   label: 'Visitas',    icon: 'camera' },
  { key: 'diario',    label: 'Diário',     icon: 'book-open' },
  { key: 'pendencias',label: 'Pendências', icon: 'alert-circle' },
  { key: 'medicoes',  label: 'Medições',   icon: 'bar-chart-2' },
  { key: 'aditivos',  label: 'Aditivos',   icon: 'plus-circle' },
]

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function formatCurrency(v: number | null) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ObraDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [obra, setObra] = useState<Obra | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('visitas')

  // Tab-specific counts for badges
  const [counts, setCounts] = useState({ visitas: 0, pendencias: 0 })

  useFocusEffect(useCallback(() => {
    if (!id) return
    setLoading(true)

    // Fetch obra first — counts are optional and don't block rendering
    supabase
      .from('obras')
      .select('id, nome, endereco, status, progresso_percentual, data_conclusao_prevista, valor_contratado')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) console.warn('Erro ao buscar obra:', error.message)
        if (data) setObra(data as unknown as Obra)
        setLoading(false)
      })

    // Counts — fire and forget, ignore errors (tables may not exist yet)
    supabase.from('visitas_tecnicas').select('id', { count: 'exact', head: true }).eq('obra_id', id)
      .then(({ count }) => setCounts(prev => ({ ...prev, visitas: count ?? 0 })))
      .catch(() => {})

    supabase.from('pendencias_obra').select('id', { count: 'exact', head: true }).eq('obra_id', id).eq('status', 'aberta')
      .then(({ count }) => setCounts(prev => ({ ...prev, pendencias: count ?? 0 })))
      .catch(() => {})
  }, [id]))

  if (loading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.loadingHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color="#d4b89b" />
        </View>
      </View>
    )
  }

  if (!obra) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Obra</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color="#d4c8be" style={{ marginBottom: 12 }} />
          <Text style={styles.vazioText}>Obra não encontrada.</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: '#c4956a', fontSize: 14 }}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }
  const st = STATUS_CONFIG[obra.status] ?? STATUS_CONFIG.em_andamento

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{obra.nome}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        {/* Hero info */}
        <View style={styles.hero}>


          <View style={styles.heroRow}>
            <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
            </View>
          </View>

          {obra.endereco && (
            <View style={styles.heroDetail}>
              <Feather name="map-pin" size={12} color="#b0a090" />
              <Text style={styles.heroDetailText}>{obra.endereco}</Text>
            </View>
          )}

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progresso</Text>
              <Text style={[styles.progressPct, { color: st.accent }]}>{obra.progresso_percentual ?? 0}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${obra.progresso_percentual ?? 0}%` as any, backgroundColor: st.accent }]} />
            </View>
          </View>

          {/* Info grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Valor contratado</Text>
              <Text style={styles.infoValue}>{formatCurrency(obra.valor_contratado)}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Conclusão prevista</Text>
              <Text style={styles.infoValue}>{formatDate(obra.data_conclusao_prevista)}</Text>
            </View>

          </View>
        </View>

        {/* Tab bar — sticky */}
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {TABS.map(t => {
              const active = tab === t.key
              const badge = t.key === 'visitas' ? counts.visitas : t.key === 'pendencias' ? counts.pendencias : 0
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tabItem, active && styles.tabItemActive]}
                  onPress={() => setTab(t.key)}
                >
                  <Feather name={t.icon as any} size={14} color={active ? '#c4956a' : '#9a9088'} />
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                  {badge > 0 && (
                    <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                      <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>{badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* Tab content */}
        <View style={styles.tabContent}>
          {tab === 'visitas' && <VisitasTab obraId={id!} router={router} />}
          {tab === 'diario' && <DiarioTab obraId={id!} router={router} />}
          {tab === 'pendencias' && <PendenciasTab obraId={id!} router={router} />}
          {tab === 'medicoes' && <MedicoesTab obraId={id!} router={router} />}
          {tab === 'aditivos' && <AditivosTab obraId={id!} router={router} />}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => {
          if (tab === 'visitas') router.push(`/obras/visita/nova?obra_id=${id}`)
          else if (tab === 'diario') router.push(`/obras/diario/novo?obra_id=${id}`)
          else if (tab === 'pendencias') router.push(`/obras/pendencia/nova?obra_id=${id}`)
          else if (tab === 'medicoes') router.push(`/obras/medicao/nova?obra_id=${id}`)
          else if (tab === 'aditivos') router.push(`/obras/aditivo/novo?obra_id=${id}`)
        }}
      >
        <Feather name="plus" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

// ─── Tab sub-components ────────────────────────────────────────────────────

interface TabProps { obraId: string; router: ReturnType<typeof useRouter> }

function VisitasTab({ obraId, router }: TabProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('visitas_tecnicas')
      .select('id, numero, data_visita, local_obra, cliente_nome, etapas, anotacoes, fotos')
      .eq('obra_id', obraId)
      .order('numero', { ascending: false })
      .then(({ data }) => { setItems(data ?? []); setLoading(false) })
  }, [obraId])

  if (loading) return <LoadingTab />
  if (items.length === 0) return <EmptyTab icon="camera" message="Nenhuma visita registrada." />

  return (
    <View style={styles.itemList}>
      {items.map(v => (
        <TouchableOpacity
          key={v.id}
          style={styles.itemCard}
          onPress={() => router.push(`/obras/visita/${v.id}`)}
          activeOpacity={0.82}
        >
          <View style={styles.itemCardTop}>
            <Text style={styles.itemCardDate}>Visita #{v.numero} · {formatDate(v.data_visita)}</Text>
            {(v.fotos ?? []).filter((f: any) => f.foto_url).length > 0 && (
              <View style={styles.fotoCountPill}>
                <Feather name="image" size={10} color="#c4956a" />
                <Text style={styles.fotoCountText}>{v.fotos.filter((f: any) => f.foto_url).length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemCardTitle}>{v.cliente_nome || v.local_obra || 'Visita técnica'}</Text>
          {v.etapas?.length > 0 && (
            <Text style={styles.itemCardMeta}>{v.etapas.length} etapa{v.etapas.length !== 1 ? 's' : ''} vistoriada{v.etapas.length !== 1 ? 's' : ''}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  )
}

function DiarioTab({ obraId, router }: TabProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const CLIMA_ICONS: Record<string, string> = {
    ensolarado: '☀️', nublado: '⛅', chuvoso: '🌧️', parcialmente_nublado: '🌤️',
  }

  useEffect(() => {
    setLoading(true)
    supabase
      .from('diario_obra')
      .select('id, data_registro, clima, atividades_realizadas, ocorrencias, num_funcionarios')
      .eq('obra_id', obraId)
      .order('data_registro', { ascending: false })
      .then(({ data }) => { setItems(data ?? []); setLoading(false) })
  }, [obraId])

  if (loading) return <LoadingTab />
  if (items.length === 0) return <EmptyTab icon="book-open" message="Nenhum registro no diário." />

  return (
    <View style={styles.itemList}>
      {items.map(d => (
        <TouchableOpacity
          key={d.id}
          style={styles.itemCard}
          onPress={() => router.push(`/obras/diario/${d.id}`)}
          activeOpacity={0.82}
        >
          <View style={styles.itemCardTop}>
            <Text style={styles.itemCardDate}>{formatDate(d.data_registro)}</Text>
            <Text style={styles.climaText}>{CLIMA_ICONS[d.clima] ?? ''}</Text>
          </View>
          {d.atividades_realizadas && (
            <Text style={styles.itemCardTitle} numberOfLines={2}>{d.atividades_realizadas}</Text>
          )}
          <View style={styles.diarioMeta}>
            {d.num_funcionarios > 0 && (
              <View style={styles.diarioMetaItem}>
                <Feather name="users" size={11} color="#b0a090" />
                <Text style={styles.diarioMetaText}>{d.num_funcionarios} funcionário{d.num_funcionarios !== 1 ? 's' : ''}</Text>
              </View>
            )}
            {d.ocorrencias && (
              <View style={[styles.diarioMetaItem, { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }]}>
                <Feather name="alert-triangle" size={10} color="#92400e" />
                <Text style={[styles.diarioMetaText, { color: '#92400e' }]}>Ocorrência</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function PendenciasTab({ obraId, router }: TabProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const PRIOR_CONFIG: Record<string, { color: string; label: string }> = {
    baixa:  { color: '#94a3b8', label: 'Baixa' },
    media:  { color: '#f59e0b', label: 'Média' },
    alta:   { color: '#ef4444', label: 'Alta' },
    critica:{ color: '#7c3aed', label: 'Crítica' },
  }
  const STATUS_P: Record<string, { label: string; color: string }> = {
    aberta:     { label: 'Aberta', color: '#ef4444' },
    em_resolucao:{ label: 'Em resolução', color: '#f59e0b' },
    resolvida:  { label: 'Resolvida', color: '#22c55e' },
  }

  useEffect(() => {
    setLoading(true)
    supabase
      .from('pendencias_obra')
      .select('id, titulo, descricao, prioridade, status, responsavel')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setItems(data ?? []); setLoading(false) })
  }, [obraId])

  if (loading) return <LoadingTab />
  if (items.length === 0) return <EmptyTab icon="alert-circle" message="Nenhuma pendência registrada." />

  return (
    <View style={styles.itemList}>
      {items.map(p => {
        const prior = PRIOR_CONFIG[p.prioridade] ?? PRIOR_CONFIG.media
        const st = STATUS_P[p.status] ?? STATUS_P.aberta
        return (
          <TouchableOpacity
            key={p.id}
            style={[styles.itemCard, { borderLeftColor: prior.color, borderLeftWidth: 3 }]}
            onPress={() => router.push(`/obras/pendencia/${p.id}`)}
            activeOpacity={0.82}
          >
            <View style={styles.itemCardTop}>
              <Text style={[styles.priorTag, { color: prior.color }]}>{prior.label}</Text>
              <View style={[styles.statusDot, { backgroundColor: st.color }]} />
              <Text style={[styles.statusSmall, { color: st.color }]}>{st.label}</Text>
            </View>
            <Text style={styles.itemCardTitle}>{p.titulo}</Text>
            {p.responsavel && (
              <Text style={styles.itemCardSub}>{p.responsavel}</Text>
            )}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function MedicoesTab({ obraId, router }: TabProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('medicoes_obra')
      .select('id, numero_medicao, data_medicao, valor_medido, percentual_executado, status')
      .eq('obra_id', obraId)
      .order('numero_medicao', { ascending: false })
      .then(({ data }) => { setItems(data ?? []); setLoading(false) })
  }, [obraId])

  const STATUS_M: Record<string, { label: string; color: string }> = {
    rascunho:  { label: 'Rascunho', color: '#94a3b8' },
    enviada:   { label: 'Enviada', color: '#f59e0b' },
    aprovada:  { label: 'Aprovada', color: '#22c55e' },
    rejeitada: { label: 'Rejeitada', color: '#ef4444' },
  }

  if (loading) return <LoadingTab />
  if (items.length === 0) return <EmptyTab icon="bar-chart-2" message="Nenhuma medição registrada." />

  return (
    <View style={styles.itemList}>
      {items.map(m => {
        const st = STATUS_M[m.status] ?? STATUS_M.rascunho
        return (
          <TouchableOpacity
            key={m.id}
            style={styles.itemCard}
            onPress={() => router.push(`/obras/medicao/${m.id}`)}
            activeOpacity={0.82}
          >
            <View style={styles.itemCardTop}>
              <Text style={styles.itemCardDate}>Medição #{m.numero_medicao}</Text>
              <View style={[styles.statusSmallPill, { backgroundColor: st.color + '20' }]}>
                <Text style={[styles.statusSmall, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>
            <Text style={styles.itemCardTitle}>{formatDate(m.data_medicao)}</Text>
            <View style={styles.medicaoRow}>
              <Text style={styles.medicaoValue}>{formatCurrency(m.valor_medido)}</Text>
              <Text style={styles.medicaoPct}>{m.percentual_executado}% executado</Text>
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function AditivosTab({ obraId, router }: TabProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const TIPO_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
    prazo: { label: 'Prazo', icon: 'calendar', color: '#3b82f6' },
    valor: { label: 'Valor', icon: 'dollar-sign', color: '#22c55e' },
    ambos: { label: 'Prazo + Valor', icon: 'layers', color: '#c4956a' },
  }

  useEffect(() => {
    setLoading(true)
    supabase
      .from('aditivos_obra')
      .select('id, tipo, descricao, dias_adicionados, valor_aditivo, data_aditivo')
      .eq('obra_id', obraId)
      .order('data_aditivo', { ascending: false })
      .then(({ data }) => { setItems(data ?? []); setLoading(false) })
  }, [obraId])

  if (loading) return <LoadingTab />
  if (items.length === 0) return <EmptyTab icon="plus-circle" message="Nenhum aditivo registrado." />

  return (
    <View style={styles.itemList}>
      {items.map(a => {
        const tipo = TIPO_CONFIG[a.tipo] ?? TIPO_CONFIG.prazo
        return (
          <TouchableOpacity
            key={a.id}
            style={[styles.itemCard, { borderLeftColor: tipo.color, borderLeftWidth: 3 }]}
            onPress={() => router.push(`/obras/aditivo/${a.id}`)}
            activeOpacity={0.82}
          >
            <View style={styles.itemCardTop}>
              <View style={styles.tipoRow}>
                <Feather name={tipo.icon as any} size={12} color={tipo.color} />
                <Text style={[styles.tipoText, { color: tipo.color }]}>{tipo.label}</Text>
              </View>
              <Text style={styles.itemCardDate}>{formatDate(a.data_aditivo)}</Text>
            </View>
            <Text style={styles.itemCardTitle} numberOfLines={2}>{a.descricao}</Text>
            <View style={styles.aditivoRow}>
              {a.dias_adicionados > 0 && (
                <Text style={styles.aditivoDetail}>+{a.dias_adicionados} dias</Text>
              )}
              {a.valor_aditivo > 0 && (
                <Text style={styles.aditivoDetail}>{formatCurrency(a.valor_aditivo)}</Text>
              )}
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function LoadingTab() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color="#d4b89b" />
    </View>
  )
}

function EmptyTab({ icon, message }: { icon: string; message: string }) {
  return (
    <View style={styles.center}>
      <Feather name={icon as any} size={32} color="#d4c8be" style={{ marginBottom: 12 }} />
      <Text style={styles.vazioText}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F0EC' },
  center: { paddingVertical: 48, alignItems: 'center' },
  vazioText: { fontSize: 14, color: '#9a9088' },

  loadingHeader: { paddingHorizontal: 16, paddingVertical: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 16, color: '#1a1a1a', fontWeight: '500' },

  hero: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  heroProjeto: { fontSize: 11, color: '#b0a090', marginBottom: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  heroDetail: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  heroDetailText: { fontSize: 12, color: '#b0a090', flex: 1 },

  progressSection: { marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 11, color: '#9a9088' },
  progressPct: { fontSize: 11, fontWeight: '700' },
  progressTrack: { height: 4, backgroundColor: '#e8e4e0', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoCell: { flex: 1, minWidth: 100, backgroundColor: '#fff', borderRadius: 10, padding: 12 },
  infoLabel: { fontSize: 9, color: '#b0a090', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 13, color: '#1a1a1a', fontWeight: '500' },

  tabBar: { backgroundColor: '#F4F0EC', borderBottomWidth: 1, borderBottomColor: '#e8e4e0' },
  tabScroll: { paddingHorizontal: 16, gap: 4 },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: '#c4956a' },
  tabText: { fontSize: 12, color: '#9a9088' },
  tabTextActive: { color: '#c4956a', fontWeight: '600' },
  tabBadge: {
    backgroundColor: '#e8e4e0',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeActive: { backgroundColor: '#fdf6ee' },
  tabBadgeText: { fontSize: 10, color: '#9a9088', fontWeight: '600' },
  tabBadgeTextActive: { color: '#c4956a' },

  tabContent: { paddingBottom: 100 },
  itemList: { padding: 16, gap: 10 },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#a08060',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  itemCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  itemCardDate: { fontSize: 11, color: '#b0a090' },
  itemCardTitle: { fontSize: 14, color: '#1a1a1a', fontWeight: '400', marginBottom: 4 },
  itemCardSub: { fontSize: 12, color: '#9a9088', marginBottom: 4 },
  itemCardMeta: { fontSize: 11, color: '#b0a090' },

  fotoCountPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fdf6ee', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 'auto' },
  fotoCountText: { fontSize: 11, color: '#c4956a', fontWeight: '600' },

  climaText: { fontSize: 16, marginLeft: 'auto' },
  diarioMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  diarioMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  diarioMetaText: { fontSize: 11, color: '#b0a090' },

  priorTag: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 'auto' },
  statusSmall: { fontSize: 10, fontWeight: '600' },
  statusSmallPill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },

  medicaoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  medicaoValue: { fontSize: 13, color: '#1a1a1a', fontWeight: '600' },
  medicaoPct: { fontSize: 11, color: '#9a9088' },

  tipoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tipoText: { fontSize: 11, fontWeight: '600' },
  aditivoRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  aditivoDetail: { fontSize: 12, color: '#9a9088' },

  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
})
