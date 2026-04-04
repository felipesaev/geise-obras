import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'

const CLIMA_LABEL: Record<string, { label: string; emoji: string }> = {
  ensolarado:           { label: 'Ensolarado', emoji: '☀️' },
  parcialmente_nublado: { label: 'Parcialmente nublado', emoji: '🌤️' },
  nublado:              { label: 'Nublado', emoji: '⛅' },
  chuvoso:              { label: 'Chuvoso', emoji: '🌧️' },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

export default function DiarioDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [registro, setRegistro] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [fotoSelecionada, setFotoSelecionada] = useState<string | null>(null)

  useFocusEffect(useCallback(() => {
    if (!id) return
    supabase
      .from('diario_obra')
      .select('*, obra:obras(nome)')
      .eq('id', id)
      .single()
      .then(({ data }) => { setRegistro(data); setLoading(false) })
  }, [id]))

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

  if (!registro) return null
  const clima = CLIMA_LABEL[registro.clima] ?? { label: registro.clima, emoji: '' }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diário de obra</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.hero}>
          <Text style={styles.heroDate}>{formatDate(registro.data_registro)}</Text>
          <View style={styles.climaRow}>
            <Text style={styles.climaEmoji}>{clima.emoji}</Text>
            <Text style={styles.climaLabel}>{clima.label}</Text>
          </View>
          {registro.num_funcionarios > 0 && (
            <View style={styles.heroDetail}>
              <Feather name="users" size={12} color="#b0a090" />
              <Text style={styles.heroDetailText}>{registro.num_funcionarios} funcionário{registro.num_funcionarios !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>ATIVIDADES REALIZADAS</Text>
          <Text style={styles.bodyText}>{registro.atividades_realizadas}</Text>
        </View>

        {registro.ocorrencias && (
          <View style={[styles.card, styles.cardWarning]}>
            <View style={styles.cardLabelRow}>
              <Feather name="alert-triangle" size={12} color="#92400e" />
              <Text style={[styles.cardLabel, { color: '#92400e' }]}>OCORRÊNCIAS</Text>
            </View>
            <Text style={[styles.bodyText, { color: '#78350f' }]}>{registro.ocorrencias}</Text>
          </View>
        )}

        {(registro.fotos_urls ?? []).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>FOTOS ({registro.fotos_urls.length})</Text>
            <View style={styles.fotosGrid}>
              {registro.fotos_urls.map((url: string, idx: number) => (
                <TouchableOpacity key={idx} onPress={() => setFotoSelecionada(url)} activeOpacity={0.85}>
                  <Image source={{ uri: url }} style={styles.fotoThumb} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {fotoSelecionada && (
        <TouchableOpacity style={styles.fotoViewer} onPress={() => setFotoSelecionada(null)} activeOpacity={1}>
          <Image source={{ uri: fotoSelecionada }} style={styles.fotoFull} resizeMode="contain" />
          <TouchableOpacity style={styles.fotoClose} onPress={() => setFotoSelecionada(null)}>
            <Feather name="x" size={20} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
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
  hero: { paddingVertical: 16, paddingHorizontal: 4, marginBottom: 8 },
  heroDate: { fontSize: 13, color: '#b0a090', marginBottom: 8, textTransform: 'capitalize' },
  climaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  climaEmoji: { fontSize: 22 },
  climaLabel: { fontSize: 18, color: '#1a1a1a', fontWeight: '300' },
  heroDetail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroDetailText: { fontSize: 12, color: '#b0a090' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: '#a08060', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  cardWarning: { backgroundColor: '#fffbeb' },
  cardLabel: { fontSize: 9, fontWeight: '700', color: '#b0a090', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  bodyText: { fontSize: 14, color: '#1a1a1a', lineHeight: 22 },
  fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fotoThumb: { width: 90, height: 90, borderRadius: 8 },
  fotoViewer: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  fotoFull: { width: '100%', height: '80%' },
  fotoClose: {
    position: 'absolute', top: 48, right: 20, width: 36, height: 36,
    borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
})
