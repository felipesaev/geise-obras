import React, { useRef, useState } from 'react'
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

  const [logLines, setLogLines] = useState<{ msg: string; level: 'info' | 'warn' | 'error' }[]>([])
  const [logVisible, setLogVisible] = useState(false)
  const logScrollRef = useRef<ScrollView>(null)

  const addLog = (msg: string, level: 'info' | 'warn' | 'error' = 'info') => {
    const ts = new Date().toTimeString().slice(0, 8)
    const line = `[${ts}] ${msg}`
    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    else console.log(line)
    setLogLines(prev => [...prev, { msg: line, level }])
    setTimeout(() => logScrollRef.current?.scrollToEnd({ animated: true }), 50)
  }

  const pickImage = async (source: 'camera' | 'gallery') => {
    addLog(`pickImage iniciado — source: ${source}`)
    try {
      let result: ImagePicker.ImagePickerResult

      if (source === 'camera') {
        addLog('Solicitando permissão de câmera...')
        let perm: ImagePicker.CameraPermissionResponse
        try {
          perm = await ImagePicker.requestCameraPermissionsAsync()
          addLog(`Permissão câmera: status=${perm.status} granted=${perm.granted}`)
        } catch (permErr: any) {
          addLog(`ERRO ao solicitar permissão câmera: ${permErr?.message ?? permErr}`, 'error')
          Alert.alert('Erro de Permissão', `${permErr?.message ?? permErr}`)
          return
        }

        if (!perm.granted) {
          addLog(`Permissão negada: ${perm.status}`, 'warn')
          Alert.alert('Permissão necessária', `Permita o acesso à câmera nas configurações.\nStatus: ${perm.status}`)
          return
        }

        addLog('Abrindo câmera nativa...')
        try {
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'] as any,
            quality: 0.8,
          })
          addLog(`Câmera retornou — canceled: ${result.canceled}, assets: ${result.assets?.length ?? 0}`)
        } catch (launchErr: any) {
          addLog(`ERRO ao abrir câmera: ${launchErr?.message ?? launchErr}`, 'error')
          Alert.alert('Erro ao abrir câmera', `${launchErr?.message ?? launchErr}`)
          return
        }
      } else {
        addLog('Solicitando permissão de galeria...')
        let perm: ImagePicker.MediaLibraryPermissionResponse
        try {
          perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
          addLog(`Permissão galeria: status=${perm.status} granted=${perm.granted}`)
        } catch (permErr: any) {
          addLog(`ERRO ao solicitar permissão galeria: ${permErr?.message ?? permErr}`, 'error')
          Alert.alert('Erro de Permissão', `${permErr?.message ?? permErr}`)
          return
        }

        if (!perm.granted) {
          addLog(`Permissão galeria negada: ${perm.status}`, 'warn')
          Alert.alert('Permissão necessária', `Permita o acesso à galeria nas configurações.\nStatus: ${perm.status}`)
          return
        }

        addLog('Abrindo galeria...')
        try {
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any,
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: 20,
          })
          addLog(`Galeria retornou — canceled: ${result.canceled}, assets: ${result.assets?.length ?? 0}`)
        } catch (launchErr: any) {
          addLog(`ERRO ao abrir galeria: ${launchErr?.message ?? launchErr}`, 'error')
          Alert.alert('Erro ao abrir galeria', `${launchErr?.message ?? launchErr}`)
          return
        }
      }

      if (!result.canceled) {
        result.assets.forEach((a, i) => {
          addLog(`Asset ${i + 1}: ${a.uri?.slice(-40)} | ${a.width}x${a.height} | ${a.fileSize ?? '?'} bytes`)
        })
        const novas = result.assets.map(a => ({ uri: a.uri, descricao: '' }))
        setFotos(prev => [...prev, ...novas])
        addLog(`${novas.length} foto(s) adicionada(s) ao estado`)
      } else {
        addLog('Usuário cancelou a seleção')
      }
    } catch (e: any) {
      addLog(`ERRO inesperado em pickImage: ${e?.message ?? JSON.stringify(e)}`, 'error')
      Alert.alert('Erro inesperado', `${e?.message ?? JSON.stringify(e)}`)
    }
  }

  const uploadFotos = async (): Promise<{ item: number; foto_url: string; descricao: string; ok: boolean }[]> => {
    addLog(`Iniciando upload de ${fotos.length} foto(s)`)
    const resultado = []
    for (let i = 0; i < fotos.length; i++) {
      const { uri, descricao } = fotos[i]
      addLog(`Foto ${i + 1}/${fotos.length} — uri: ...${uri?.slice(-40)}`)
      try {
        const ext = (uri.split('.').pop() ?? 'jpg').toLowerCase()
        const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
        const fileName = `${obra_id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        addLog(`ext: ${ext} | mime: ${mime}`)

        addLog('Lendo arquivo local (fetch)...')
        const fileResponse = await fetch(uri)
        addLog(`fetch status: ${fileResponse.status}`)
        const blob = await fileResponse.blob()
        addLog(`blob: ${blob.size} bytes | type: ${blob.type}`)

        addLog('Enviando para Supabase...')
        const { error } = await supabase.storage
          .from('obra-fotos')
          .upload(fileName, blob, { contentType: mime, upsert: false })

        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('obra-fotos').getPublicUrl(fileName)
          addLog(`Upload OK — url: ...${publicUrl?.slice(-40)}`)
          resultado.push({ item: i + 1, foto_url: publicUrl, descricao: descricao.trim(), ok: true })
        } else {
          addLog(`Upload falhou: ${error.message}`, 'error')
          Alert.alert('Erro no upload', `Foto ${i + 1}: ${error.message}`)
        }
      } catch (e: any) {
        addLog(`EXCEÇÃO ao enviar foto ${i + 1}: ${e?.message ?? JSON.stringify(e)}`, 'error')
        Alert.alert('Erro ao enviar foto', `Foto ${i + 1}: ${e?.message ?? JSON.stringify(e)}`)
      }
    }
    addLog(`Upload concluído: ${resultado.length}/${fotos.length} enviadas`)
    return resultado
  }

  const handleSalvar = async () => {
    addLog('handleSalvar iniciado')
    setSaving(true)

    try {
      addLog('Buscando dados da obra...')
      const [obraRes, countRes] = await Promise.all([
        supabase.from('obras').select('escritorio_id').eq('id', obra_id).single(),
        supabase.from('visitas_tecnicas').select('numero').eq('obra_id', obra_id).order('numero', { ascending: false }).limit(1),
      ])

      if (obraRes.error || !obraRes.data) {
        addLog(`Erro ao buscar obra: ${obraRes.error?.message}`, 'error')
        Alert.alert('Erro', 'Não foi possível carregar a obra.')
        return
      }

      const escritorio_id = obraRes.data.escritorio_id
      const numero = (countRes.data?.[0]?.numero ?? 0) + 1
      addLog(`escritorio_id: ${escritorio_id} | numero visita: ${numero}`)

      let fotosUpload: { item: number; foto_url: string; descricao: string; ok: boolean }[] = []
      if (fotos.length > 0) {
        setUploadingFoto(true)
        fotosUpload = await uploadFotos()
        setUploadingFoto(false)
      }

      addLog('Inserindo visita no banco...')
      const { error } = await supabase.from('visitas_tecnicas').insert({
        obra_id,
        escritorio_id,
        numero,
        data_visita: dataVisita,
        local_obra: null,
        cliente_nome: null,
        etapas: [],
        anotacoes: resumo.trim()
          ? [{ item: 1, tipo_servico: 'Resumo', fornecedor: '', anotacoes: resumo.trim() }]
          : [],
        fotos: fotosUpload,
      })

      if (error) {
        addLog(`Erro ao salvar visita: ${error.message}`, 'error')
        Alert.alert('Erro', error.message || 'Não foi possível salvar a visita.')
        return
      }

      addLog('Visita salva com sucesso!')
      router.back()
    } catch (e: any) {
      addLog(`EXCEÇÃO em handleSalvar: ${e?.message ?? JSON.stringify(e)}`, 'error')
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

      {/* Painel de log — toggle com botão flutuante */}
      <View style={[styles.logContainer, { bottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[styles.logToggle, logLines.some(l => l.level === 'error') && styles.logToggleError]}
          onPress={() => setLogVisible(v => !v)}
        >
          <Feather name="terminal" size={14} color="#fff" />
          <Text style={styles.logToggleText}>
            LOG ({logLines.length}){logLines.some(l => l.level === 'error') ? ' !' : ''}
          </Text>
          <Feather name={logVisible ? 'chevron-down' : 'chevron-up'} size={14} color="#fff" />
        </TouchableOpacity>

        {logVisible && (
          <View style={styles.logPanel}>
            <View style={styles.logHeader}>
              <Text style={styles.logHeaderText}>Log de diagnóstico</Text>
              <TouchableOpacity onPress={() => setLogLines([])}>
                <Text style={styles.logClear}>Limpar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              ref={logScrollRef}
              style={styles.logScroll}
              contentContainerStyle={{ padding: 8 }}
            >
              {logLines.length === 0
                ? <Text style={styles.logEmpty}>Nenhum log ainda. Use câmera ou galeria.</Text>
                : logLines.map((l, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.logLine,
                      l.level === 'error' && styles.logLineError,
                      l.level === 'warn' && styles.logLineWarn,
                    ]}
                  >
                    {l.msg}
                  </Text>
                ))
              }
            </ScrollView>
          </View>
        )}
      </View>
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

  // Log panel
  logContainer: {
    position: 'absolute', left: 12, right: 12,
  },
  logToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1a1a1a', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    alignSelf: 'flex-end',
  },
  logToggleError: { backgroundColor: '#c0392b' },
  logToggleText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  logPanel: {
    backgroundColor: '#111', borderRadius: 12, marginTop: 6,
    maxHeight: 220,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  logHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#333',
  },
  logHeaderText: { color: '#888', fontSize: 11, fontWeight: '600' },
  logClear: { color: '#c0392b', fontSize: 11 },
  logScroll: { maxHeight: 180 },
  logEmpty: { color: '#555', fontSize: 11, fontStyle: 'italic' },
  logLine: { color: '#a0e080', fontSize: 10, fontFamily: 'monospace', marginBottom: 2, lineHeight: 16 },
  logLineError: { color: '#ff6b6b' },
  logLineWarn: { color: '#ffd93d' },
})
