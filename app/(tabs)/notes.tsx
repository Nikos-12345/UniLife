import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function NotesScreen() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [notes, setNotes] = useState<any[]>([]);
  const [userId, setUserId] = useState<number | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [priority, setPriority] = useState(1);

  const fetchNotes = async (uid: number) => {
    try {
      const response = await fetch(`http://172.16.0.65:5000/api/notes/${uid}`);
      const data = await response.json();
      if (response.ok) setNotes(data);
    } catch (error) {
      console.error(error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const checkUserAndFetch = async () => {
        try {
          const userDataString = await AsyncStorage.getItem('user');
          if (!userDataString) return router.replace('/auth');
          const user = JSON.parse(userDataString);
          setUserId(user.id);
          await fetchNotes(user.id);
        } finally {
          setIsChecking(false);
        }
      };
      checkUserAndFetch();
    }, [])
  );

  const handleAddNote = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      alert('Συμπλήρωσε και τα δύο πεδία!');
      return;
    }
    try {
      const response = await fetch('http://172.16.0.65:5000/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, title: newTitle, content: newContent, priority }),
      });
      if (response.ok) {
        setIsModalVisible(false);
        setNewTitle(''); setNewContent(''); setPriority(1);
        if (userId) fetchNotes(userId);
      } else alert('Σφάλμα αποθήκευσης.');
    } catch (error) { alert('Σφάλμα σύνδεσης.'); }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Διαγραφή", "Είσαι σίγουρος ότι θέλεις να διαγράψεις τη σημείωση;", [
      { text: "Ακύρωση", style: "cancel" },
      { text: "Διαγραφή", style: "destructive", onPress: async () => {
          try {
            const response = await fetch(`http://172.16.0.65:5000/api/notes/${id}`, { method: 'DELETE' });
            if (response.ok && userId) fetchNotes(userId);
          } catch (error) { alert('Σφάλμα διαγραφής'); }
        }
      }
    ]);
  };

  const getPriorityColor = (level: number) => level === 3 ? '#ef4444' : level === 2 ? '#f59e0b' : '#22c55e';
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' });

  if (isChecking) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color="#a855f7" /></View>;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.mainTitle}>Οι Σημειώσεις μου</Text>

        {notes.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>Δεν υπάρχουν σημειώσεις. 📝</Text></View>
        ) : (
          notes.map((note) => (
            <TouchableOpacity 
              key={note.id} 
              style={[styles.card, { borderLeftColor: getPriorityColor(note.priority) }]}
              onLongPress={() => handleDelete(note.id)}
              delayLongPress={500}
            >
              <Text style={styles.cardTitle}>📌 {note.title}</Text>
              <Text style={styles.cardContent}>{note.content}</Text>
              <View style={styles.footerInfo}>
                <Text style={styles.cardSubContent}>Δημιουργήθηκε: {formatDate(note.created_at)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setIsModalVisible(true)} activeOpacity={0.8}>
        <Ionicons name="add" size={32} color="#f8fafc" />
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Νέα Σημείωση</Text>
            <TextInput style={styles.input} placeholder="Τίτλος" placeholderTextColor="#64748b" value={newTitle} onChangeText={setNewTitle} />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Περιεχόμενο..." placeholderTextColor="#64748b" value={newContent} onChangeText={setNewContent} multiline />

            <Text style={styles.label}>Σημαντικότητα:</Text>
            <View style={styles.priorityRow}>
              <TouchableOpacity style={[styles.priorityBtn, priority === 1 && { backgroundColor: '#22c55e', borderColor: '#22c55e' }]} onPress={() => setPriority(1)}><Text style={styles.priorityText}>🟢 Απλή</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.priorityBtn, priority === 2 && { backgroundColor: '#f59e0b', borderColor: '#f59e0b' }]} onPress={() => setPriority(2)}><Text style={styles.priorityText}>🟠 Σημαντική</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.priorityBtn, priority === 3 && { backgroundColor: '#ef4444', borderColor: '#ef4444' }]} onPress={() => setPriority(3)}><Text style={styles.priorityText}>🔴 SOS</Text></TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsModalVisible(false)}><Text style={styles.cancelButtonText}>Ακύρωση</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddNote}><Text style={styles.saveButtonText}>Αποθήκευση</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121824' },
  mainTitle: { fontSize: 32, fontWeight: 'bold', color: '#f8fafc', marginTop: 40 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 18, marginTop: 15, borderLeftWidth: 5 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 8 },
  cardContent: { fontSize: 15, color: '#cbd5e1', marginBottom: 12 },
  footerInfo: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 10 },
  cardSubContent: { fontSize: 13, color: '#94a3b8' },
  emptyCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 25, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#94a3b8' },
  fab: { position: 'absolute', width: 60, height: 60, alignItems: 'center', justifyContent: 'center', right: 20, bottom: 20, backgroundColor: '#a855f7', borderRadius: 30, elevation: 8 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContainer: { backgroundColor: '#1e293b', padding: 25, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc', marginBottom: 20 },
  input: { backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: 8, padding: 15, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
  textArea: { height: 120 },
  label: { color: '#f8fafc', fontSize: 16, marginBottom: 10, fontWeight: 'bold' },
  priorityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  priorityBtn: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#334155', borderRadius: 8, alignItems: 'center', marginHorizontal: 3 },
  priorityText: { color: '#f8fafc', fontSize: 13, fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, padding: 15, borderRadius: 8, backgroundColor: '#334155', marginRight: 10, alignItems: 'center' },
  cancelButtonText: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  saveButton: { flex: 1, padding: 15, borderRadius: 8, backgroundColor: '#a855f7', marginLeft: 10, alignItems: 'center' },
  saveButtonText: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' }
});