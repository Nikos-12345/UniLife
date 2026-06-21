import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function GradesScreen() {
  const [grades, setGrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // States για το Modal (Φόρμα)
  const [modalVisible, setModalVisible] = useState(false);
  const [newGrade, setNewGrade] = useState({ course_name: '', grade: '', semester: '', ects: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGrades = async () => {
    const userData = await AsyncStorage.getItem('user');
    if (!userData) return;
    const user = JSON.parse(userData);
    try {
      const response = await fetch(`https://unilife-backend-4xjo.onrender.com/api/grades/${user.id}`);
      const data = await response.json();
      setGrades(data);
    } catch (error) { 
      console.error(error); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useFocusEffect(useCallback(() => { fetchGrades(); }, []));

  // Υπολογισμός Σταθμισμένου Μέσου Όρου
  const calculateAverage = (gradesArray: any[]) => {
    const validGrades = gradesArray.filter((g) => g.grade !== null && g.grade !== '');
    if (validGrades.length === 0) return '-';

    let totalPoints = 0;
    let totalEcts = 0;

    validGrades.forEach((g) => {
      const gradeVal = parseFloat(g.grade);
      const ectsVal = parseInt(g.ects, 10);
      if (!isNaN(gradeVal) && !isNaN(ectsVal)) {
        totalPoints += gradeVal * ectsVal;
        totalEcts += ectsVal;
      }
    });

    return totalEcts === 0 ? '-' : (totalPoints / totalEcts).toFixed(2);
  };

  // Μέτρηση Περασμένων Μαθημάτων
  const passedCoursesCount = grades.filter((g) => {
    const val = parseFloat(g.grade);
    return !isNaN(val) && val >= 5;
  }).length;

  // Ομαδοποίηση ανά Εξάμηνο
  const semesters = grades.reduce((acc: any, grade: any) => {
    (acc[grade.semester] = acc[grade.semester] || []).push(grade);
    return acc;
  }, {});

  // Αποθήκευση Νέου Βαθμού
  const handleSaveGrade = async () => {
    if (!newGrade.course_name || !newGrade.semester || !newGrade.ects) {
      Alert.alert('Προσοχή', 'Συμπλήρωσε όνομα, εξάμηνο και ECTS!');
      return;
    }

    setIsSubmitting(true);
    const userData = await AsyncStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    try {
      const response = await fetch('https://unilife-backend-4xjo.onrender.com/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          course_name: newGrade.course_name,
          semester: parseInt(newGrade.semester, 10),
          ects: parseInt(newGrade.ects, 10),
          grade: newGrade.grade ? parseFloat(newGrade.grade) : null,
        }),
      });

      if (response.ok) {
        setModalVisible(false);
        setNewGrade({ course_name: '', grade: '', semester: '', ects: '' });
        fetchGrades(); // Ανανέωση της λίστας
      } else {
        Alert.alert('Σφάλμα', 'Αποτυχία αποθήκευσης.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Σφάλμα', 'Πρόβλημα σύνδεσης με τον server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <ActivityIndicator style={{flex: 1, backgroundColor: '#121824'}} size="large" color="#a855f7" />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header με Κουμπί Προσθήκης */}
        <View style={styles.headerRow}>
          <Text style={styles.mainTitle}>Βαθμολογίες</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Στατιστικά */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Περασμένα</Text>
            <Text style={styles.statValue}>{passedCoursesCount}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Γενικός Μ.Ο.</Text>
            <Text style={styles.statValue}>{calculateAverage(grades)}</Text>
          </View>
        </View>
        
        {/* Λίστα ανά Εξάμηνο */}
        {Object.keys(semesters).sort().map((sem) => {
          const semGrades = semesters[sem];
          return (
            <View key={sem} style={styles.semContainer}>
              <View style={styles.semHeader}>
                <Text style={styles.semTitle}>{sem}ο Εξάμηνο</Text>
                <View style={styles.semAvgBadge}>
                  <Text style={styles.semAvgText}>Μ.Ο: {calculateAverage(semGrades)}</Text>
                </View>
              </View>
              {semGrades.map((g: any) => (
                <View key={g.id} style={styles.gradeCard}>
                  <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                    <Ionicons name={g.grade && parseFloat(g.grade) >= 5 ? "checkmark-circle" : "ellipse-outline"} size={20} color={g.grade && parseFloat(g.grade) >= 5 ? "#22c55e" : "#64748b"} style={{marginRight: 10}} />
                    <View>
                      <Text style={styles.courseName}>{g.course_name}</Text>
                      <Text style={styles.ectsText}>{g.ects} ECTS</Text>
                    </View>
                  </View>
                  <Text style={[styles.gradeText, { color: g.grade && parseFloat(g.grade) < 5 ? '#ef4444' : '#fbbf24' }]}>
                    {g.grade ? g.grade : '-'}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* Αναδυόμενο Παράθυρο Προσθήκης */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Νέα Βαθμολογία</Text>

            <Text style={styles.inputLabel}>Όνομα Μαθήματος</Text>
            <TextInput
              style={styles.input}
              placeholder="π.χ. Βάσεις Δεδομένων"
              placeholderTextColor="#64748b"
              value={newGrade.course_name}
              onChangeText={(t) => setNewGrade({...newGrade, course_name: t})}
            />

            <Text style={styles.inputLabel}>Εξάμηνο</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.semesterChips}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <TouchableOpacity 
                  key={num} 
                  style={[styles.chip, newGrade.semester === String(num) && styles.chipActive]}
                  onPress={() => setNewGrade({...newGrade, semester: String(num)})}
                >
                  <Text style={[styles.chipText, newGrade.semester === String(num) && styles.chipTextActive]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.rowInputs}>
              <View style={{flex: 1, marginRight: 10}}>
                <Text style={styles.inputLabel}>ECTS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="π.χ. 5"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={newGrade.ects}
                  onChangeText={(t) => setNewGrade({...newGrade, ects: t})}
                />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.inputLabel}>Βαθμός (Προαιρετικό)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="π.χ. 8.5"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={newGrade.grade}
                  onChangeText={(t) => setNewGrade({...newGrade, grade: t})}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Ακύρωση</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGrade} disabled={isSubmitting}>
                <Text style={styles.saveBtnText}>{isSubmitting ? 'Αποθήκευση...' : 'Προσθήκη'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121824' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 40 },
  mainTitle: { fontSize: 32, fontWeight: 'bold', color: '#f8fafc' },
  addButton: { backgroundColor: '#a855f7', width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  statCard: { backgroundColor: '#1e293b', flex: 1, marginHorizontal: 5, padding: 15, borderRadius: 12, alignItems: 'center' },
  statLabel: { color: '#94a3b8', fontSize: 14, marginBottom: 5 },
  statValue: { color: '#a855f7', fontSize: 24, fontWeight: 'bold' },
  semContainer: { marginBottom: 25 },
  semHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 5 },
  semTitle: { fontSize: 20, fontWeight: 'bold', color: '#a855f7' },
  semAvgBadge: { backgroundColor: '#334155', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  semAvgText: { color: '#cbd5e1', fontSize: 12, fontWeight: 'bold' },
  gradeCard: { backgroundColor: '#1e293b', padding: 15, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  courseName: { color: '#f8fafc', fontSize: 16, fontWeight: '500' },
  ectsText: { color: '#64748b', fontSize: 12, marginTop: 2 },
  gradeText: { fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc', marginBottom: 20, textAlign: 'center' },
  inputLabel: { color: '#94a3b8', fontSize: 14, marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#0f172a', color: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', fontSize: 16 },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  semesterChips: { flexDirection: 'row', marginTop: 5, marginBottom: 15 },
  chip: { backgroundColor: '#0f172a', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#a855f7', borderColor: '#a855f7' },
  chipText: { color: '#94a3b8', fontSize: 16, fontWeight: 'bold' },
  chipTextActive: { color: '#ffffff' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 30 },
  cancelBtn: { padding: 12, marginRight: 15 },
  cancelBtnText: { color: '#94a3b8', fontSize: 16, fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#a855f7', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});