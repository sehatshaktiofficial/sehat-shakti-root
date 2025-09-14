// Profile Screen - User profile management
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const ProfileScreen: React.FC = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
      </View>
      <View style={styles.content}>
        <Ionicons name="person-circle" size={64} color="#ccc" />
        <Text style={styles.message}>User Profile</Text>
        <Text style={styles.submessage}>This screen will show user profile settings</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: 'white' },
  title: { fontSize: 20, fontWeight: 'bold', marginLeft: 15 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  message: { fontSize: 18, fontWeight: 'bold', marginTop: 15, color: '#333' },
  submessage: { fontSize: 14, color: '#666', marginTop: 5 },
})

export default ProfileScreen