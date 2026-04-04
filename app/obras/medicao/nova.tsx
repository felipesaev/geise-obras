import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'

export default function NovaMedicao() {
  const { obra_id } = useLocalSearchParams<{ obra_id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [dataMedicao, setDataMedicao] = useState(new Date().toISOString().split('T')[0])
  const [etapa, setEtapa] = useState('')
  const [percentualPrevisto, setPercentualPrevisto] = useState('')
  const [percentualExecutado, setPercentualExecutado] = useState('')
  const [valorMedido, setValorMedido] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSalvar = async () => {
    if (!etapa.trim() || !valorMedido) {
      Alert.alert('Campos obrigatórios', 'Informe a etapa e o valor medido.')
      return
    }

    setSaving(true)

    // Get next medicao number
    const { count } = await supabase
      .from('medicoes_obra')
      .select('id', { count: 'exact', head: true })
      .eq('obra_id', obra_id)

    const { error } = await supabase.from('medicoes_obra').insert({
      obra_id,
      numero_medicao: (count ?? 0) + 1,
      data_medicao: dataMedicao,
      etapa: etapa.trim(),
      percentual_previsto: percentualPrevisto ? parseFloat(percentualPrevisto) : 0,
      percentual_executado: percentualExecutado ? parseFloat(percentualExecutado) : 0,
      valor_medido: parseFloat(valorMedido.replace(',', '.')),
      observacoes: observacoes.trim() || null,
      status: 'rascunho',
    })

    setSaving(false)

    if (error) {
      Alert.alert('Erro', 'Não foi possível salvar a medição. Tente novamente.')
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
        <Text style={styles.headerTitle}>Nova medição</Text>
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
            <Text style={styles.label}>Data da medição</Text>
            <TextInput
              style={styles.input}
              value={dataMedicao}
              onChangeText={setDataMedicao}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#c0b8b0"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Etapa / Descrição</Text>
            <TextInput
              style={styles.input}
              value={etapa}
              onChangeText={setEtapa}
              placeholder="Ex: Serviços de alvenaria"
              placeholderTextColor="#c0b8b0"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>% previsto</Text>
              <TextInput
                style={styles.input}
                value={percentualPrevisto}
                onChangeText={setPercentualPrevisto}
                placeholder="0"
                placeholderTextColor="#c0b8b0"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>% executado</Text>
              <TextInput
                style={styles.input}
                value={percentualExecutado}
                onChangeText={setPercentualExecutado}
                placeholder="0"
                placeholderTextColor="#c0b8b0"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Valor medido (R$)</Text>
            <TextInput
              style={styles.input}
              value={valorMedido}
              onChangeText={setValorMedido}
              placeholder="0,00"
              placeholderTextColor="#c0b8b0"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Observações</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={observacoes}
              onChangeText={setObservacoes}
              placeholder="Observações sobre esta medição (opcional)..."
              placeholderTextColor="#c0b8b0"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
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
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 9, fontWeight: '600', color: '#b0a090', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  input: { backgroundColor: '#F4F0EC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1a1a1a' },
  inputMulti: { height: 80 },
})
