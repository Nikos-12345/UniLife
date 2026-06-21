import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ExamsScreen() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [userId, setUserId] = useState<number | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newCourse, setNewCourse] = useState('');
  const [priority, setPriority] = useState(3);
  
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateString, setDateString] = useState('');

  const fetchExams = async (uid: number) => {
    try {
      const response = await fetch(`https://unilife-backend-4xjo.onrender.com/api/dashboard/${uid}`);
      const data = await response.json();
      if (response.ok) setExams(data.exams);
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
          await fetchExams(user.id);
        } finally { setIsChecking(false); }
      };
      checkUser();
    }, [])
  );

  const handleAddExam = async () => {
    if (!newCourse.trim() || !dateString) return alert('Συμπλήρωσε μάθημα και ημερομηνία!');
    try {
      const response = await fetch('https://unilife-backend-4xjo.onrender.com/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, course_name: newCourse, exam_date: dateString, priority }),
      });
      if (response.ok) {
        setIsModalVisible(false);
        setNewCourse(''); setDateString(''); setPriority(3); setDate(new Date());
        if (userId) fetchExams(userId);
      } else alert('Σφάλμα αποθήκευσης.');
    } catch (error) { alert('Σφάλμα server.'); }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Διαγραφή", "Είσαι σίγουρος ότι θέλεις να διαγράψεις αυτή την εξέταση;", [
      { text: "Ακύρωση", style: "cancel" },
      { text: "Διαγραφή", style: "destructive", onPress: async () => {
          try {
            const response = await fetch(`https://unilife-backend-4xjo.onrender.com/api/exams/${id}`, { method: 'DELETE' });
            if (response.ok && userId) fetchExams(userId);
          } catch (error) { alert('Σφάλμα διαγραφής'); }
        }
      }
    ]);
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      setDateString(selectedDate.toISOString().split('T')[0]);
    }
  };

  const getPriorityColor = (level: number) => level === 3 ? '#ef4444' : level === 2 ? '#f59e0b' : '#22c55e';
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' });

  if (isChecking) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color="#f59e0b" /></View>;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.mainTitle}>Οι Εξετάσεις μου</Text>

        {exams.length === 0 ? (
          <Text style={styles.emptyText}>Δεν υπάρχει καμία προγραμματισμένη εξέταση. Καλές διακοπές! 🏖️</Text>
        ) : (
          exams.map((exam) => (
            <TouchableOpacity 
              key={exam.id} 
              style={[styles.card, { borderLeftColor: getPriorityColor(exam.priority) }]}
              onLongPress={() => handleDelete(exam.id)}
              delayLongPress={500}
            >
              <Text style={styles.cardTitle}>🎓 {exam.course_name}</Text>
              <Text style={[styles.cardSubContent, { color: getPriorityColor(exam.priority) }]}>
                📅 Ημερομηνία: {formatDate(exam.exam_date)}
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
            <Text style={styles.modalTitle}>Νέα Εξέταση</Text>
            
            <TextInput style={styles.input} placeholder="Μάθημα" placeholderTextColor="#64748b" value={newCourse} onChangeText={setNewCourse} />
            
            <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: dateString ? '#f8fafc' : '#64748b', fontSize: 16 }}>
                {dateString ? formatDate(dateString) : 'Επίλεξε Ημερομηνία 📅'}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker value={date} mode="date" display="default" onChange={onChangeDate} />
            )}

            <Text style={styles.label}>Δυσκολία / Σημαντικότητα:</Text>
            <View style={styles.priorityRow}>
              <TouchableOpacity style={[styles.priorityBtn, priority === 1 && { backgroundColor: '#22c55e', borderColor: '#22c55e' }]} onPress={() => setPriority(1)}>
                <Text style={styles.priorityText}>🟢 Εύκολο</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.priorityBtn, priority === 2 && { backgroundColor: '#f59e0b', borderColor: '#f59e0b' }]} onPress={() => setPriority(2)}>
                <Text style={styles.priorityText}>🟠 Μέτριο</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.priorityBtn, priority === 3 && { backgroundColor: '#ef4444', borderColor: '#ef4444' }]} onPress={() => setPriority(3)}>
                <Text style={styles.priorityText}>🔴 Δύσκολο</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Ακύρωση</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#f59e0b' }]} onPress={handleAddExam}>
                <Text style={[styles.saveButtonText, { color: '#f8fafc' }]}>Αποθήκευση</Text>
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
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 10 },
  cardSubContent: { fontSize: 15, fontWeight: 'bold' },
  emptyText: { fontSize: 16, color: '#94a3b8', backgroundColor: '#1e293b', borderRadius: 12, padding: 20, textAlign: 'center', marginTop: 20 },
  fab: { position: 'absolute', width: 60, height: 60, alignItems: 'center', justifyContent: 'center', right: 20, bottom: 20, backgroundColor: '#f59e0b', borderRadius: 30, elevation: 8 },
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
  saveButton: { flex: 1, padding: 15, borderRadius: 8, marginLeft: 10, alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: 'bold' }
});