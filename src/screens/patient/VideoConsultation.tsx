// Video Consultation - Video call interface
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const VideoConsultation: React.FC = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="videocam" size={64} color="#ccc" />
        <Text style={styles.message}>Video Consultation</Text>
        <Text style={styles.submessage}>Video consultation interface will be implemented here</Text>
        <TouchableOpacity style={styles.endButton} onPress={() => navigation.goBack()}>
          <Text style={styles.endButtonText}>End Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  message: { fontSize: 18, fontWeight: 'bold', marginTop: 15, color: '#fff' },
  submessage: { fontSize: 14, color: '#ccc', marginTop: 5 },
  endButton: { backgroundColor: '#F44336', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5, marginTop: 20 },
  endButtonText: { color: 'white', fontWeight: 'bold' },
})

export default VideoConsultation