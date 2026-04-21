import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../../lib/supabase'

const CLIMAS = [
  { key: 'ensolarado', label: 'Ensolarado', emoji: '☀️' },
  { key: 'parcialmente_nublado', label: 'Parcial. nublado', emoji: '🌤️' },
  { key: 'nublado', label: 'Nublado', emoji: '⛅' },
  { key: 'chuvoso', label: 'Chuvoso', emoji: '🌧️' },
]

export default function NovoDiario() {
  const { obra_id } = useLocalSearchParams<{ obra_id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [dataRegistro, setDataRegistro] = useState(new Date().toISOString().split('T')[0])
  const [clima, setClima] = useState<string>('ensolarado')
  const [atividadesRealizadas, setAtividadesRealizadas] = useState('')
  const [ocorrencias, setOcorrencias] = useState('')
  const [numFuncionarios, setNumFuncionarios] = useState('')
  const [fotos, setFotos] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult

      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync()
        if (!perm.granted) {
          Alert.alert('Permissão necessária', 'Permita o acesso à câmera nas configurações.')
          return
        }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] as any, quality: 0.8 })
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!perm.granted) {
          Alert.alert('Permissão necessária', 'Permita o acesso à galeria nas configurações.')
          return
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'] as any,
          allowsMultipleSelection: true,
          quality: 0.8,
          selectionLimit: 10,
        })
      }

      if (!result.canceled) {
        setFotos(prev => [...prev, ...result.assets.map(a => a.uri)])
      }
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível abrir a câmera/galeria.')
    }
  }

  const uploadFotos = async (): Promise<string[]> => {
    const urls: string[] = []
    for (const uri of fotos) {
      try {
        const ext = uri.split('.').pop() ?? 'jpg'
        const fileName = `diario/${obra_id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const response = await fetch(uri)
        const blob = await response.blob()
        const { data: up, error } = await supabase.storage.from('obra-fotos').upload(fileName, blob, { contentType: `image/${ext}` })
        if (!error && up) {
          const { data: { publicUrl } } = supabase.storage.from('obra-fotos').getPublicUrl(up.path)
          urls.push(publicUrl)
        }
      } catch (e: any) {
        console.warn('Erro ao enviar foto:', e?.message)
      }
    }
    return urls
  }

  const handleSalvar = async () => {
    if (!atividadesRealizadas.trim()) {
      Alert.alert('Campo obrigatório', 'Informe as atividades realizadas.')
      return
    }

    setSaving(true)

    try {
      let fotosUrls: string[] = []
      if (fotos.length > 0) fotosUrls = await uploadFotos()

      const { error } = await supabase.from('diario_obra').insert({
        obra_id,
        data_registro: dataRegistro,
        clima,
        atividades_realizadas: atividadesRealizadas.trim(),
        ocorrencias: ocorrencias.trim() || null,
        num_funcionarios: numFuncionarios ? parseInt(numFuncionarios) : 0,
        fotos_urls: fotosUrls,
      })

      if (error) {
        Alert.alert('Erro', 'Não foi possível salvar o registro. Tente novamente.')
        return
      }

      router.back()
    } catch (e: any) {
      Alert.alert('Erro', 'Ocorreu um erro inesperado. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diário de obra</Text>
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
          <Text style={styles.sectionTitle}>DATA E CLIMA</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Data</Text>
            <TextInput
              style={styles.input}
              value={dataRegistro}
              onChangeText={setDataRegistro}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#c0b8b0"
            />
          </View>

          <Text style={styles.label}>Condição climática</Text>
          <View style={styles.climaRow}>
            {CLIMAS.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.climaBtn, clima === c.key && styles.climaBtnActive]}
                onPress={() => setClima(c.key)}
              >
                <Text style={styles.climaEmoji}>{c.emoji}</Text>
                <Text style={[styles.climaLabel, clima === c.key && styles.climaLabelActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>REGISTRO DO DIA</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Atividades realizadas</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={atividadesRealizadas}
              onChangeText={setAtividadesRealizadas}
              placeholder="Descreva as atividades realizadas hoje..."
              placeholderTextColor="#c0b8b0"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Ocorrências / Problemas</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={ocorrencias}
              onChangeText={setOcorrencias}
              placeholder="Registre ocorrências, imprevistos ou problemas (opcional)..."
              placeholderTextColor="#c0b8b0"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nº de funcionários</Text>
            <TextInput
              style={styles.input}
              value={numFuncionarios}
              onChangeText={setNumFuncionarios}
              placeholder="0"
              placeholderTextColor="#c0b8b0"
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FOTOS</Text>
          <View style={styles.fotoBtns}>
            <TouchableOpacity style={styles.fotoBtn} onPress={() => pickImage('camera')}>
              <Feather name="camera" size={18} color="#c4956a" />
              <Text style={styles.fotoBtnText}>Câmera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fotoBtn} onPress={() => pickImage('gallery')}>
              <Feather name="image" size={18} color="#c4956a" />
              <Text style={styles.fotoBtnText}>Galeria</Text>
            </TouchableOpacity>
          </View>
          {fotos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {fotos.map((uri, idx) => (
                <View key={idx} style={styles.fotoWrap}>
                  <Image source={{ uri }} style={styles.fotoThumb} />
                  <TouchableOpacity style={styles.fotoRemove} onPress={() => setFotos(prev => prev.filter((_, i) => i !== idx))}>
                    <Feather name="x" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
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
  content: { paddingHorizontal: 16, gap: 8 },
  section: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8,
    shadowColor: '#a08060', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  sectionTitle: { fontSize: 9, fontWeight: '700', color: '#b0a090', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 },
  field: { marginBottom: 14 },
  label: { fontSize: 9, fontWeight: '600', color: '#b0a090', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  input: { backgroundColor: '#F4F0EC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1a1a1a' },
  inputMulti: { height: 90 },
  climaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  climaBtn: {
    flex: 1, minWidth: '40%', flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F4F0EC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#e8e4e0',
  },
  climaBtnActive: { backgroundColor: '#fdf6ee', borderColor: '#c4956a' },
  climaEmoji: { fontSize: 16 },
  climaLabel: { fontSize: 12, color: '#7a7270' },
  climaLabelActive: { color: '#c4956a', fontWeight: '600' },
  fotoBtns: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  fotoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fdf6ee', borderRadius: 10, paddingVertical: 14, borderWidth: 1, borderColor: '#f0e6d8',
  },
  fotoBtnText: { fontSize: 14, color: '#c4956a', fontWeight: '500' },
  fotoWrap: { marginRight: 8, position: 'relative' },
  fotoThumb: { width: 80, height: 80, borderRadius: 8 },
  fotoRemove: {
    position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
})
