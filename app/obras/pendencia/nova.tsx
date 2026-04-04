import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'

const PRIORIDADES = [
  { key: 'baixa', label: 'Baixa', color: '#94a3b8' },
  { key: 'media', label: 'Média', color: '#f59e0b' },
  { key: 'alta', label: 'Alta', color: '#ef4444' },
  { key: 'critica', label: 'Crítica', color: '#7c3aed' },
]

export default function NovaPendencia() {
  const { obra_id } = useLocalSearchParams<{ obra_id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState<string>('media')
  const [responsavel, setResponsavel] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSalvar = async () => {
    if (!titulo.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o título da pendência.')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('pendencias_obra').insert({
      obra_id,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      prioridade,
      responsavel: responsavel.trim() || null,
      status: 'aberta',
    })

    setSaving(false)

    if (error) {
      Alert.alert('Erro', 'Não foi possível criar a pendência. Tente novamente.')
      return
    }

    router.back()
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova pendência</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSalvar}
          disabled={saving}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.section}>
          <View style={styles.field}>
            <Text style={styles.label}>Título</Text>
            <TextInput
              style={styles.input}
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Descreva a pendência em poucas palavras"
              placeholderTextColor="#c0b8b0"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Detalhes sobre a pendência (opcional)..."
              placeholderTextColor="#c0b8b0"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Responsável</Text>
            <TextInput
              style={styles.input}
              value={responsavel}
              onChangeText={setResponsavel}
              placeholder="Responsável pela resolução (opcional)"
              placeholderTextColor="#c0b8b0"
            />
          </View>

          <Text style={styles.label}>Prioridade</Text>
          <View style={styles.priorRow}>
            {PRIORIDADES.map(p => (
              <TouchableOpacity
                key={p.key}
                style={[
                  styles.priorBtn,
                  { borderColor: p.color },
                  prioridade === p.key && { backgroundColor: p.color },
                ]}
                onPress={() => setPrioridade(p.key)}
              >
                <Text style={[styles.priorText, { color: prioridade === p.key ? '#fff' : p.color }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F0EC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 16, color: '#1a1a1a', fontWeight: '500' },
  saveBtn: { backgroundColor: '#1a1a1a', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnDisabled: { backgroundColor: '#c0b8b0' },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  content: { paddingHorizontal: 16 },
  section: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#a08060', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  field: { marginBottom: 16 },
  label: { fontSize: 9, fontWeight: '600', color: '#b0a090', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  input: { backgroundColor: '#F4F0EC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1a1a1a' },
  inputMulti: { height: 100 },
  priorRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  priorBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5 },
  priorText: { fontSize: 12, fontWeight: '600' },
})
