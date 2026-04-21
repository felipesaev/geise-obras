import React from 'react'
import { View, Text, ScrollView } from 'react-native'

interface State {
  error: Error | null
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#1a1a1a', padding: 24, paddingTop: 60 }}>
          <Text style={{ color: '#c4956a', fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>ERRO DE INICIALIZAÇÃO</Text>
          <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>{this.state.error.message}</Text>
          <Text style={{ color: '#888', fontSize: 11, fontFamily: 'monospace' }}>{this.state.error.stack}</Text>
        </ScrollView>
      )
    }
    return this.props.children
  }
}
