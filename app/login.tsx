import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!email.trim() || !password) return
    setLoading(true)
    setError(null)
    const err = await signIn(email.trim().toLowerCase(), password)
    setLoading(false)
    if (err) {
      setError('E-mail ou senha incorretos.')
      return
    }
    router.replace('/obras')
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Título */}
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Área de obras</Text>
          <Text style={styles.subtitle}>Acesso restrito à equipe geise.arq</Text>
        </View>

        {/* Formulário */}
        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>E-MAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor="#c0b8b0"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.label}>SENHA</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#c0b8b0"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, (!email.trim() || !password || loading) && styles.btnDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={!email.trim() || !password || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnText}>Entrar</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F0EC' },
  container: { flexGrow: 1, paddingHorizontal: 28 },

  logo: { width: 140, height: 44, alignSelf: 'flex-start', marginBottom: 40 },

  titleWrap: { marginBottom: 40 },
  title: { fontSize: 30, color: '#1a1a1a', fontWeight: '200', letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#b0a090' },

  form: { gap: 20 },
  inputWrap: { gap: 6 },
  label: { fontSize: 9, fontWeight: '600', color: '#b0a090', letterSpacing: 1.6, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1a1a1a',
    shadowColor: '#a08060',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: { fontSize: 13, color: '#b91c1c' },

  btn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { backgroundColor: '#c0b8b0' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
})
