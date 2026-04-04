import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'

const TIPOS = [
  { key: 'prazo', label: 'Prazo', icon: 'calendar', desc: 'Extensão de prazo', color: '#3b82f6' },
  { key: 'valor', label: 'Valor', icon: 'dollar-sign', desc: 'Acréscimo de valor', color: '#22c55e' },
  { key: 'ambos', label: 'Prazo + Valor', icon: 'layers', desc: 'Ambos', color: '#c4956a' },
]

export default function NovoAditivo() {
  const { obra_id } = useLocalSearchParams<{ obra_id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [tipo, setTipo] = useState<string>('prazo')
  const [descricao, setDescricao] = useState('')
  const [dataAditivo, setDataAditivo] = useState(new Date().toISOString().split('T')[0])
  const [diasAdicionados, setDiasAdicionados] = useState('')
  const [valorAditivo, setValorAditivo] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [saving, setSaving] = useState(false)

  const tipoSelecionado = TIPOS.find(t => t.key === tipo)

  const handleSalvar = async () => {
    if (!descricao.trim()) {
      Alert.alert('Campo obrigatório', 'Informe a descrição do aditivo.')
      return
    }
    if ((tipo === 'prazo' || tipo === 'ambos') && !diasAdicionados) {
      Alert.alert('Campo obrigatório', 'Informe os dias adicionados.')
      return
    }
    if ((tipo === 'valor' || tipo === 'ambos') && !valorAditivo) {
      Alert.alert('Campo obrigatório', 'Informe o valor do aditivo.')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('aditivos_obra').insert({
      obra_id,
      tipo,
      descricao: descricao.trim(),
      data_aditivo: dataAditivo,
      dias_adicionados: diasAdicionados ? parseInt(diasAdicionados) : 0,
      valor_aditivo: valorAditivo ? parseFloat(valorAditivo.replace(',', '.')) : 0,
      justificativa: justificativa.trim() || null,
    })

    setSaving(false)

    if (error) {
      Alert.alert('Erro', 'Não foi possível salvar o aditivo. Tente novamente.')
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
        <Text style={styles.headerTitle}>Novo aditivo</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSalvar}
          disabled={saving}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>

        {/* Tipo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TIPO DE ADITIVO</Text>
          <View style={styles.tipoRow}>
            {TIPOS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tipoBtn, tipo === t.key && { borderColor: t.color, backgroundColor: t.color + '12' }]}
                onPress={() => setTipo(t.key)}
              >
                <Feather name={t.icon as any} size={18} color={tipo === t.key ? t.color : '#b0a090'} />
                <Text style={[styles.tipoLabel, tipo === t.key && { color: t.color }]}>{t.label}</Text>
                <Text style={styles.tipoDesc}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dados */}
        <View style={styles.section}>
          <View style={styles.field}>
            <Text style={styles.label}>Data do aditivo</Text>
            <TextInput
              style={styles.input}
              value={dataAditivo}
              onChangeText={setDataAditivo}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#c0b8b0"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Descreva o motivo e escopo do aditivo..."
              placeholderTextColor="#c0b8b0"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {(tipo === 'prazo' || tipo === 'ambos') && (
            <View style={styles.field}>
              <Text style={styles.label}>Dias adicionados</Text>
              <View style={styles.inputWithUnit}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={diasAdicionados}
                  onChangeText={setDiasAdicionados}
                  placeholder="0"
                  placeholderTextColor="#c0b8b0"
                  keyboardType="number-pad"
                />
                <View style={styles.unitBadge}>
                  <Text style={styles.unitText}>dias</Text>
                </View>
              </View>
            </View>
          )}

          {(tipo === 'valor' || tipo === 'ambos') && (
            <View style={styles.field}>
              <Text style={styles.label}>Valor do aditivo (R$)</Text>
              <TextInput
                style={styles.input}
                value={valorAditivo}
                onChangeText={setValorAditivo}
                placeholder="0,00"
                placeholderTextColor="#c0b8b0"
                keyboardType="decimal-pad"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Justificativa técnica</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={justificativa}
              onChangeText={setJustificativa}
              placeholder="Justificativa técnica ou contratual (opcional)..."
              placeholderTextColor="#c0b8b0"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Preview */}
        {(diasAdicionados || valorAditivo) && tipoSelecionado && (
          <View style={[styles.preview, { borderColor: tipoSelecionado.color + '40' }]}>
            <View style={styles.previewHeader}>
              <Feather name={tipoSelecionado.icon as any} size={14} color={tipoSelecionado.color} />
              <Text style={[styles.previewTitle, { color: tipoSelecionado.color }]}>Resumo do aditivo</Text>
            </View>
            {diasAdicionados ? (
              <Text style={styles.previewLine}>+{diasAdicionados} dias no prazo</Text>
            ) : null}
            {valorAditivo ? (
              <Text style={styles.previewLine}>
                +R$ {parseFloat(valorAditivo.replace(',', '.')).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no valor
              </Text>
            ) : null}
          </View>
        )}
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
  content: { paddingHorizontal: 16, gap: 10 },
  section: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 2,
    shadowColor: '#a08060', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  sectionTitle: { fontSize: 9, fontWeight: '700', color: '#b0a090', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 },
  field: { marginBottom: 16 },
  label: { fontSize: 9, fontWeight: '600', color: '#b0a090', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  input: { backgroundColor: '#F4F0EC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1a1a1a' },
  inputMulti: { height: 80 },
  inputWithUnit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitBadge: { backgroundColor: '#e8e4e0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  unitText: { fontSize: 13, color: '#7a7270' },

  tipoRow: { flexDirection: 'row', gap: 8 },
  tipoBtn: {
    flex: 1, alignItems: 'center', gap: 6, padding: 12,
    backgroundColor: '#F9F6F3', borderRadius: 12, borderWidth: 1.5, borderColor: '#e8e4e0',
  },
  tipoLabel: { fontSize: 12, color: '#7a7270', fontWeight: '600', textAlign: 'center' },
  tipoDesc: { fontSize: 10, color: '#b0a090', textAlign: 'center' },

  preview: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, marginBottom: 8,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  previewTitle: { fontSize: 11, fontWeight: '700' },
  previewLine: { fontSize: 14, color: '#1a1a1a', marginBottom: 4 },
})
