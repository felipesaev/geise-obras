import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { supabase } from '../../../lib/supabase'

interface EtapaVisita {
  nome: string
  ordem: number
  fornecedor: string
  percentual: number
}

interface Anotacao {
  item: number
  tipo_servico: string
  fornecedor: string
  anotacoes: string
}

interface Visita {
  id: string
  obra_id: string
  numero: number
  data_visita: string
  local_obra: string | null
  cliente_nome: string | null
  etapas: EtapaVisita[]
  anotacoes: Anotacao[]
  fotos: { item: number; foto_url: string; descricao: string; ok: boolean }[]
  obra: { nome: string; endereco: string | null } | null
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

export default function VisitaDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [visita, setVisita] = useState<Visita | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [fotoSelecionada, setFotoSelecionada] = useState<string | null>(null)

  useFocusEffect(useCallback(() => {
    if (!id) return
    supabase
      .from('visitas_tecnicas')
      .select('*, obra:obras(nome, endereco)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setVisita(data as unknown as Visita)
        setLoading(false)
      })
  }, [id]))

  const handleExportPDF = async () => {
    if (!visita) return
    setExporting(true)

    const etapasHtml = (visita.etapas ?? []).map(e => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f0ebe5;">${e.nome}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f0ebe5; text-align: center;">
          <span style="background: #fdf6ee; color: #c4956a; padding: 2px 8px; border-radius: 10px; font-weight: 600;">${e.percentual}%</span>
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f0ebe5;">${e.fornecedor || '—'}</td>
      </tr>
    `).join('')

    const fotosHtml = (visita.fotos ?? []).filter(f => f.foto_url).length > 0
      ? `<div style="margin-top: 24px;">
          <h3 style="color: #b0a090; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">FOTOS</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${visita.fotos.filter(f => f.foto_url).map(f => `<img src="${f.foto_url}" style="width: 200px; height: 150px; object-fit: cover; border-radius: 8px;" />`).join('')}
          </div>
        </div>`
      : ''

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, sans-serif; color: #1a1a1a; margin: 0; padding: 32px; background: #fff; }
          h1 { font-size: 22px; font-weight: 300; letter-spacing: -0.5px; margin: 0 0 4px; }
          .subtitle { color: #b0a090; font-size: 12px; margin-bottom: 32px; }
          .info-grid { display: flex; gap: 24px; margin-bottom: 28px; }
          .info-cell { flex: 1; }
          .info-label { font-size: 9px; font-weight: 700; color: #b0a090; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px; }
          .info-value { font-size: 13px; color: #1a1a1a; }
          h3 { color: #b0a090; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; margin: 24px 0 12px; }
          table { width: 100%; border-collapse: collapse; }
          th { padding: 8px 12px; text-align: left; font-size: 9px; font-weight: 700; color: #b0a090; letter-spacing: 1px; text-transform: uppercase; background: #f9f6f3; border-bottom: 2px solid #e8e4e0; }
          .obs-box { background: #f9f6f3; border-radius: 10px; padding: 16px; margin-bottom: 8px; font-size: 13px; color: #555; line-height: 1.6; }
          .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e8e4e0; font-size: 11px; color: #b0a090; }
        </style>
      </head>
      <body>
        <h1>Relatório de Visita Técnica</h1>
        <p class="subtitle">${visita.obra?.nome ?? ''}</p>

        <div class="info-grid">
          <div class="info-cell">
            <div class="info-label">Data</div>
            <div class="info-value">${formatDate(visita.data_visita)}</div>
          </div>
          ${visita.cliente_nome ? `
          <div class="info-cell">
            <div class="info-label">Cliente</div>
            <div class="info-value">${visita.cliente_nome}</div>
          </div>` : ''}
          ${visita.local_obra ? `
          <div class="info-cell">
            <div class="info-label">Local</div>
            <div class="info-value">${visita.local_obra}</div>
          </div>` : ''}
        </div>

        ${(visita.anotacoes ?? []).length > 0 ? `
          <h3>Anotações</h3>
          ${visita.anotacoes.map(a => `<div class="obs-box">${a.texto}</div>`).join('')}
        ` : ''}

        ${(visita.etapas ?? []).length > 0 ? `
          <h3>Etapas vistoriadas</h3>
          <table>
            <thead>
              <tr>
                <th>Etapa</th>
                <th style="text-align: center;">Progresso</th>
                <th>Fornecedor</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>${etapasHtml}</tbody>
          </table>
        ` : ''}

        ${fotosHtml}

        <div class="footer">Geise Arquitetura · geise.arq · Relatório gerado automaticamente</div>
      </body>
      </html>
    `

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false })
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar relatório' })
      }
    } catch (e) {
      // silently fail
    } finally {
      setExporting(false)
    }
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

  if (!visita) return null

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visita técnica</Text>
        <TouchableOpacity style={styles.pdfBtn} onPress={handleExportPDF} disabled={exporting}>
          {exporting
            ? <ActivityIndicator size="small" color="#c4956a" />
            : <Feather name="share" size={16} color="#c4956a" />
          }
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroDate}>Visita #{visita.numero} · {formatDate(visita.data_visita)}</Text>
          <Text style={styles.heroResponsavel}>{visita.cliente_nome || visita.obra?.nome || 'Visita técnica'}</Text>
          {(visita.local_obra || visita.obra?.endereco) && (
            <View style={styles.heroDetail}>
              <Feather name="map-pin" size={11} color="#b0a090" />
              <Text style={styles.heroDetailText}>{visita.local_obra || visita.obra?.endereco}</Text>
            </View>
          )}
        </View>

        {/* Resumo */}
        {(visita.anotacoes ?? []).filter(a => a.anotacoes).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>COMO FOI A VISITA</Text>
            {visita.anotacoes.filter(a => a.anotacoes).map((a, idx) => (
              <Text key={idx} style={styles.obsText}>{a.anotacoes}</Text>
            ))}
          </View>
        )}

        {/* Fotos com descrição */}
        {(visita.fotos ?? []).filter(f => f.foto_url).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>FOTOS ({visita.fotos.filter(f => f.foto_url).length})</Text>
            {visita.fotos.filter(f => f.foto_url).map((f, idx) => (
              <View key={idx} style={[styles.fotoItem, idx > 0 && { marginTop: 14 }]}>
                <TouchableOpacity onPress={() => setFotoSelecionada(f.foto_url)} activeOpacity={0.9}>
                  <Image source={{ uri: f.foto_url }} style={styles.fotoThumb} />
                </TouchableOpacity>
                {!!f.descricao && (
                  <Text style={styles.fotoDescText}>{f.descricao}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Full-screen photo viewer */}
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 16, color: '#1a1a1a', fontWeight: '500' },
  pdfBtn: { padding: 8, backgroundColor: '#fdf6ee', borderRadius: 10 },

  content: { paddingHorizontal: 16 },

  hero: { paddingVertical: 16, paddingHorizontal: 4, marginBottom: 8 },
  heroDate: { fontSize: 13, color: '#b0a090', marginBottom: 4, textTransform: 'capitalize' },
  heroResponsavel: { fontSize: 22, color: '#1a1a1a', fontWeight: '300', marginBottom: 8 },
  heroDetail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroDetailText: { fontSize: 12, color: '#b0a090' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#a08060',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardLabel: { fontSize: 9, fontWeight: '700', color: '#b0a090', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 },
  obsText: { fontSize: 14, color: '#1a1a1a', lineHeight: 22 },

  etapaRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 10 },
  etapaRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0ebe5' },
  etapaLeft: { flex: 1, marginRight: 12 },
  etapaNome: { fontSize: 13, color: '#1a1a1a', fontWeight: '400', marginBottom: 2 },
  etapaFornecedor: { fontSize: 11, color: '#c4956a', marginBottom: 2 },
  etapaObs: { fontSize: 12, color: '#9a9088', lineHeight: 18 },
  etapaPctPill: {
    backgroundColor: '#fdf6ee',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 48,
    alignItems: 'center',
  },
  etapaPctText: { fontSize: 12, color: '#c4956a', fontWeight: '700' },

  fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fotoItem: {},
  fotoThumb: { width: '100%', height: 220, borderRadius: 10 },
  fotoDescText: { fontSize: 13, color: '#7a7270', marginTop: 8, lineHeight: 19 },

  fotoViewer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  fotoFull: { width: '100%', height: '80%' },
  fotoClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
