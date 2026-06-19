import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function AssignmentsScreen() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [userId, setUserId] = useState<number | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [priority, setPriority] = useState(1);
  
  // States για το Ημερολόγιο
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateString, setDateString] = useState(''); // Κρατάει το YYYY-MM-DD

  const fetchAssignments = async (uid: number) => {
    try {
      const response = await fetch(`http://172.16.0.65:5000/api/dashboard/${uid}`);
      const data = await response.json();
      if (response.ok) setAssignments(data.assignments);
    } catch (error) { console.error(error); }
  };

  useFocusEffect(
    useCallback(() => {
      const checkUser = async () => {
        try {
          const userDataString = await AsyncStorage.getItem('user');
          if (!userDataString) return router.replace('/auth');
          const user = JSON.parse(userDataString);
          setUserId(user.id);
          await fetchAssignments(user.id);
        } finally { setIsChecking(false); }
      };
      checkUser();
    }, [])
  );

  const handleAddAssignment = async () => {
    if (!newTitle.trim() || !dateString) return alert('Συμπλήρωσε τίτλο και ημερομηνία!');
    try {
      const response = await fetch('http://172.16.0.65:5000/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, title: newTitle, description: newDesc, due_date: dateString, priority }),
      });
      if (response.ok) {
        setIsModalVisible(false);
        setNewTitle(''); setNewDesc(''); setDateString(''); setPriority(1); setDate(new Date());
        if (userId) fetchAssignments(userId);
      } else alert('Σφάλμα αποθήκευσης.');
    } catch (error) { alert('Σφάλμα server.'); }
  };

  // Η Συνάρτηση Διαγραφής με Επιβεβαίωση
  const handleDelete = (id: number) => {
    Alert.alert("Διαγραφή", "Είσαι σίγουρος ότι θέλεις να διαγράψεις αυτή την εργασία;", [
      { text: "Ακύρωση", style: "cancel" },
      { text: "Διαγραφή", style: "destructive", onPress: async () => {
          try {
            const response = await fetch(`http://172.16.0.65:5000/api/assignments/${id}`, { method: 'DELETE' });
            if (response.ok && userId) fetchAssignments(userId);
          } catch (error) { alert('Σφάλμα διαγραφής'); }
        }
      }
    ]);
  };

  const getPriorityColor = (level: number) => level === 3 ? '#ef4444' : level === 2 ? '#f59e0b' : '#22c55e';
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' });

  // Χειρισμός αλλαγής ημερομηνίας στο Picker
  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      setDateString(selectedDate.toISOString().split('T')[0]); // Μετατροπή σε YYYY-MM-DD
    }
  };

  if (isChecking) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color="#38bdf8" /></View>;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.mainTitle}>Οι Εργασίες μου</Text>

        {assignments.length === 0 ? (
          <Text style={styles.emptyText}>Δεν έχεις εκκρεμείς εργασίες! 🎉</Text>
        ) : (
          assignments.map((assignment) => (
            <TouchableOpacity 
              key={assignment.id} 
              style={[styles.card, { borderLeftColor: getPriorityColor(assignment.priority) }]}
              onLongPress={() => handleDelete(assignment.id)}
              delayLongPress={500}
            >
              <Text style={styles.cardTitle}>{assignment.title}</Text>
              <Text style={styles.cardContent}>{assignment.description}</Text>
              <Text style={[styles.cardSubContent, { color: getPriorityColor(assignment.priority) }]}>
                ⏳ Προθεσμία: {formatDate(assignment.due_date)}
              </Text>
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
            <Text style={styles.modalTitle}>Νέα Εργασία</Text>
            
            <TextInput style={styles.input} placeholder="Τίτλος" placeholderTextColor="#64748b" value={newTitle} onChangeText={setNewTitle} />
            <TextInput style={styles.input} placeholder="Περιγραφή..." placeholderTextColor="#64748b" value={newDesc} onChangeText={setNewDesc} />

            {/* Κουμπί που ανοίγει το Ημερολόγιο */}
            <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: dateString ? '#f8fafc' : '#64748b', fontSize: 16 }}>
                {dateString ? formatDate(dateString) : 'Επίλεξε Ημερομηνία 📅'}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker value={date} mode="date" display="default" onChange={onChangeDate} />
            )}

            <Text style={styles.label}>Σημαντικότητα:</Text>
            <View style={styles.priorityRow}>
              <TouchableOpacity style={[styles.priorityBtn, priority === 1 && { backgroundColor: '#22c55e', borderColor: '#22c55e' }]} onPress={() => setPriority(1)}>
                <Text style={styles.priorityText}>🟢 Χαμηλή</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.priorityBtn, priority === 2 && { backgroundColor: '#f59e0b', borderColor: '#f59e0b' }]} onPress={() => setPriority(2)}>
                <Text style={styles.priorityText}>🟠 Μεσαία</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.priorityBtn, priority === 3 && { backgroundColor: '#ef4444', borderColor: '#ef4444' }]} onPress={() => setPriority(3)}>
                <Text style={styles.priorityText}>🔴 Υψηλή</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Ακύρωση</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddAssignment}>
                <Text style={styles.saveButtonText}>Αποθήκευση</Text>
              </TouchableOpacity>
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
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 5 },
  cardContent: { fontSize: 15, color: '#cbd5e1', marginBottom: 10 },
  cardSubContent: { fontSize: 14, fontWeight: 'bold' },
  emptyText: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', width: 60, height: 60, alignItems: 'center', justifyContent: 'center', right: 20, bottom: 20, backgroundColor: '#38bdf8', borderRadius: 30, elevation: 8 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContainer: { backgroundColor: '#1e293b', padding: 25, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc', marginBottom: 20 },
  input: { backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: 8, padding: 15, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
  datePickerButton: { backgroundColor: '#0f172a', borderRadius: 8, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  label: { color: '#f8fafc', fontSize: 16, marginBottom: 10, fontWeight: 'bold' },
  priorityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  priorityBtn: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#334155', borderRadius: 8, alignItems: 'center', marginHorizontal: 3 },
  priorityText: { color: '#f8fafc', fontSize: 13, fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, padding: 15, borderRadius: 8, backgroundColor: '#334155', marginRight: 10, alignItems: 'center' },
  cancelButtonText: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  saveButton: { flex: 1, padding: 15, borderRadius: 8, backgroundColor: '#38bdf8', marginLeft: 10, alignItems: 'center' },
  saveButtonText: { color: '#121824', fontSize: 16, fontWeight: 'bold' }
});