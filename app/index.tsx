import { Redirect } from 'expo-router'
import { useAuth } from '../context/AuthContext'
import { View, ActivityIndicator } from 'react-native'

export default function Index() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F4F0EC', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#d4b89b" />
      </View>
    )
  }

  return <Redirect href={session ? '/obras' : '/login'} />
}
