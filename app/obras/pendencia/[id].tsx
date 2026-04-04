import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'

const PRIOR_CONFIG: Record<string, { color: string; label: string }> = {
  baixa:  { color: '#94a3b8', label: 'Baixa' },
  media:  { color: '#f59e0b', label: 'Média' },
  alta:   { color: '#ef4444', label: 'Alta' },
  critica:{ color: '#7c3aed', label: 'Crítica' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  aberta:      { label: 'Aberta', color: '#ef4444', bg: '#fef2f2' },
  em_resolucao:{ label: 'Em resolução', color: '#f59e0b', bg: '#fffbeb' },
  resolvida:   { label: 'Resolvida', color: '#22c55e', bg: '#f0fdf4' },
}

export default function PendenciaDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [pendencia, setPendencia] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useFocusEffect(useCallback(() => {
    if (!id) return
    supabase
      .from('pendencias_obra')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => { setPendencia(data); setLoading(false) })
  }, [id]))

  const handleUpdateStatus = async (novoStatus: string) => {
    setUpdating(true)
    const { error } = await supabase
      .from('pendencias_obra')
      .update({ status: novoStatus })
      .eq('id', id)
    setUpdating(false)
    if (!error) setPendencia((prev: any) => ({ ...prev, status: novoStatus }))
  }

  if (loading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
        <View style={styles.center}><ActivityIndicator color="#d4b89b" /></View>
      </View>
    )
  }

  if (!pendencia) return null
  const prior = PRIOR_CONFIG[pendencia.prioridade] ?? PRIOR_CONFIG.media
  const st = STATUS_CONFIG[pendencia.status] ?? STATUS_CONFIG.aberta

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pendência</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {/* Hero */}
        <View style={[styles.hero, { borderLeftColor: prior.color }]}>
          <View style={styles.heroTop}>
            <Text style={[styles.priorLabel, { color: prior.color }]}>{prior.label}</Text>
            <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{pendencia.titulo}</Text>
          {pendencia.responsavel && (
            <View style={styles.heroDetail}>
              <Feather name="user" size={12} color="#b0a090" />
              <Text style={styles.heroDetailText}>{pendencia.responsavel}</Text>
            </View>
          )}
        </View>

        {/* Descrição */}
        {pendencia.descricao && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>DESCRIÇÃO</Text>
            <Text style={styles.bodyText}>{pendencia.descricao}</Text>
          </View>
        )}

        {/* Ações de status */}
        {pendencia.status !== 'resolvida' && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>ATUALIZAR STATUS</Text>
            <View style={styles.statusBtns}>
              {pendencia.status === 'aberta' && (
                <TouchableOpacity
                  style={[styles.statusBtn, { borderColor: '#f59e0b' }]}
                  onPress={() => handleUpdateStatus('em_resolucao')}
                  disabled={updating}
                >
                  <Feather name="refresh-cw" size={14} color="#f59e0b" />
                  <Text style={[styles.statusBtnText, { color: '#f59e0b' }]}>Em resolução</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.statusBtn, { borderColor: '#22c55e', backgroundColor: '#f0fdf4' }]}
                onPress={() => handleUpdateStatus('resolvida')}
                disabled={updating}
              >
                <Feather name="check-circle" size={14} color="#22c55e" />
                <Text style={[styles.statusBtnText, { color: '#22c55e' }]}>Marcar resolvida</Text>
              </TouchableOpacity>
            </View>
            {updating && <ActivityIndicator size="small" color="#c4956a" style={{ marginTop: 8 }} />}
          </View>
        )}

        {pendencia.status === 'resolvida' && (
          <View style={[styles.card, { backgroundColor: '#f0fdf4' }]}>
            <View style={styles.resolvidaRow}>
              <Feather name="check-circle" size={18} color="#22c55e" />
              <Text style={styles.resolvidaText}>Pendência resolvida</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F0EC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 16, color: '#1a1a1a', fontWeight: '500' },
  content: { paddingHorizontal: 16 },
  hero: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#a08060', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  priorLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  heroTitle: { fontSize: 20, color: '#1a1a1a', fontWeight: '300', marginBottom: 8 },
  heroDetail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroDetailText: { fontSize: 12, color: '#b0a090' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: '#a08060', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  cardLabel: { fontSize: 9, fontWeight: '700', color: '#b0a090', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  bodyText: { fontSize: 14, color: '#1a1a1a', lineHeight: 22 },
  statusBtns: { flexDirection: 'column', gap: 8 },
  statusBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 14,
  },
  statusBtnText: { fontSize: 13, fontWeight: '600' },
  resolvidaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resolvidaText: { fontSize: 14, color: '#15803d', fontWeight: '500' },
})
