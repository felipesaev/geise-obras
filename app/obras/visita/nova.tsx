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

interface FotoLocal {
  uri: string
  descricao: string
}

export default function NovaVisita() {
  const { obra_id } = useLocalSearchParams<{ obra_id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [dataVisita, setDataVisita] = useState(new Date().toISOString().split('T')[0])
  const [fotos, setFotos] = useState<FotoLocal[]>([])
  const [resumo, setResumo] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult

      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync()
        if (!perm.granted) {
          Alert.alert('Permissão necessária', 'Permita o acesso à câmera nas configurações.')
          return
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'] as any,
          quality: 0.8,
        })
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
          selectionLimit: 20,
        })
      }

      if (!result.canceled) {
        const novas = result.assets.map(a => ({ uri: a.uri, descricao: '' }))
        setFotos(prev => [...prev, ...novas])
      }
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível abrir a câmera/galeria.')
    }
  }

  const uploadFotos = async (): Promise<{ item: number; foto_url: string; descricao: string; ok: boolean }[]> => {
    const resultado = []
    for (let i = 0; i < fotos.length; i++) {
      const { uri, descricao } = fotos[i]
      try {
        const ext = (uri.split('.').pop() ?? 'jpg').toLowerCase()
        const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
        const fileName = `${obra_id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

        const fileResponse = await fetch(uri)
        const blob = await fileResponse.blob()

        const { error } = await supabase.storage
          .from('obra-fotos')
          .upload(fileName, blob, { contentType: mime, upsert: false })

        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('obra-fotos').getPublicUrl(fileName)
          resultado.push({ item: i + 1, foto_url: publicUrl, descricao: descricao.trim(), ok: true })
        } else {
          console.warn('Upload falhou:', error.message)
        }
      } catch (e: any) {
        console.warn('Erro ao enviar foto:', e?.message)
      }
    }
    return resultado
  }

  const handleSalvar = async () => {
    setSaving(true)

    try {
      const [obraRes, countRes] = await Promise.all([
        supabase.from('obras').select('escritorio_id').eq('id', obra_id).single(),
        supabase.from('visitas_tecnicas').select('numero').eq('obra_id', obra_id).order('numero', { ascending: false }).limit(1),
      ])

      if (obraRes.error || !obraRes.data) {
        Alert.alert('Erro', 'Não foi possível carregar a obra.')
        return
      }

      const escritorio_id = obraRes.data.escritorio_id
      const numero = (countRes.data?.[0]?.numero ?? 0) + 1

      let fotosUpload: { item: number; foto_url: string; descricao: string; ok: boolean }[] = []
      if (fotos.length > 0) {
        setUploadingFoto(true)
        fotosUpload = await uploadFotos()
        setUploadingFoto(false)
      }

      const anotacoesJson = resumo.trim()
        ? [{ item: 1, tipo_servico: 'Resumo', fornecedor: '', anotacoes: resumo.trim() }]
        : []

      const { error } = await supabase.from('visitas_tecnicas').insert({
        obra_id,
        escritorio_id,
        numero,
        data_visita: dataVisita,
        local_obra: null,
        cliente_nome: null,
        etapas: [],
        anotacoes: anotacoesJson,
        fotos: fotosUpload,
      })

      if (error) {
        console.warn('Erro ao salvar visita:', JSON.stringify(error))
        Alert.alert('Erro', error.message || 'Não foi possível salvar a visita.')
        return
      }

      router.back()
    } catch (e: any) {
      Alert.alert('Erro', 'Ocorreu um erro inesperado. Tente novamente.')
    } finally {
      setSaving(false)
      setUploadingFoto(false)
    }
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova visita técnica</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSalvar}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveBtnText}>Salvar</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>

        {/* Informações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMAÇÕES</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Data</Text>
            <TextInput
              style={styles.input}
              value={dataVisita}
              onChangeText={setDataVisita}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#c0b8b0"
            />
          </View>

        </View>

        {/* Fotos */}
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

          {fotos.length === 0 && (
            <View style={styles.fotosEmpty}>
              <Feather name="camera-off" size={24} color="#d4c8be" />
              <Text style={styles.fotosEmptyText}>Nenhuma foto adicionada</Text>
            </View>
          )}

          {fotos.map((foto, idx) => (
            <View key={idx} style={styles.fotoItem}>
              <Image source={{ uri: foto.uri }} style={styles.fotoThumb} />
              <TouchableOpacity
                style={styles.fotoRemove}
                onPress={() => setFotos(prev => prev.filter((_, i) => i !== idx))}
              >
                <Feather name="x" size={12} color="#fff" />
              </TouchableOpacity>
              <TextInput
                style={styles.fotoDesc}
                value={foto.descricao}
                onChangeText={v => setFotos(prev => prev.map((f, i) => i === idx ? { ...f, descricao: v } : f))}
                placeholder="Descreva o que aparece nesta foto..."
                placeholderTextColor="#c0b8b0"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          ))}

          {uploadingFoto && (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color="#c4956a" />
              <Text style={styles.uploadingText}>Enviando fotos...</Text>
            </View>
          )}
        </View>

        {/* Resumo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COMO FOI A VISITA HOJE?</Text>
          <TextInput
            style={[styles.input, styles.inputResumo]}
            value={resumo}
            onChangeText={setResumo}
            placeholder="Descreva o andamento geral da obra, observações, próximos passos..."
            placeholderTextColor="#c0b8b0"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F0EC' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
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
  sectionTitle: {
    fontSize: 9, fontWeight: '700', color: '#b0a090',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14,
  },

  field: { marginBottom: 14 },
  label: { fontSize: 9, fontWeight: '600', color: '#b0a090', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  input: { backgroundColor: '#F4F0EC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1a1a1a' },
  inputResumo: { height: 120 },

  fotoBtns: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  fotoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#fdf6ee', borderRadius: 10, paddingVertical: 14,
    borderWidth: 1, borderColor: '#f0e6d8',
  },
  fotoBtnText: { fontSize: 14, color: '#c4956a', fontWeight: '500' },

  fotosEmpty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  fotosEmptyText: { fontSize: 13, color: '#c0b8b0' },

  fotoItem: { marginBottom: 14 },
  fotoThumb: { width: '100%', height: 200, borderRadius: 10, marginBottom: 8 },
  fotoRemove: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  fotoDesc: {
    backgroundColor: '#F4F0EC', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 13, color: '#1a1a1a', minHeight: 60,
  },

  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
  uploadingText: { fontSize: 13, color: '#b0a090' },
})
