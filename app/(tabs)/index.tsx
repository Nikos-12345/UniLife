import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export default function Dashboard() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          const userDataString = await AsyncStorage.getItem('user');
          if (!userDataString) { router.replace('/auth'); return; }
          const user = JSON.parse(userDataString);
          
          const [dashRes, gradesRes] = await Promise.all([
            fetch(`http://172.16.0.65:5000/api/dashboard/${user.id}`),
            fetch(`http://172.16.0.65:5000/api/grades/${user.id}`)
          ]);
          
          const dashData = await dashRes.json();
          const gradesData = await gradesRes.json();
          setAssignments(dashData.assignments);
          setExams(dashData.exams);
          setGrades(gradesData);
        } catch (error) { console.error(error); } 
        finally { setIsChecking(false); }
      };
      fetchData();
    }, [])
  );

  const calculateGPA = () => {
    if (grades.length === 0) return "0.00";
    const sum = grades.reduce((acc, curr) => acc + parseFloat(curr.grade), 0);
    return (sum / grades.length).toFixed(2);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    router.replace('/auth');
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' });

  if (isChecking) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color="#38bdf8" /></View>;

  const passed = grades.filter(g => parseFloat(g.grade) >= 5).length;
  const totalECTS = grades.reduce((acc, g) => acc + (g.ects || 0), 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.mainTitle}>UniLife</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}><Text style={styles.logoutText}>Αποσύνδεση</Text></TouchableOpacity>
      </View>
      
      <Text style={styles.subtitle}>Η εφαρμογή που σε ενημερώνει για όλα όσα αφορούν την σχολή σου</Text>

      {/* Νέα Κεντρική Κάρτα */}
      <View style={styles.dashboardCard}>
        <View style={styles.leftSide}>
          <Svg width={80} height={80}>
            <Circle stroke="#334155" cx="40" cy="40" r="35" strokeWidth="8" fill="transparent" />
            <Circle stroke="#38bdf8" cx="40" cy="40" r="35" strokeWidth="8" fill="transparent" strokeDasharray={`${(parseFloat(calculateGPA())/10)*220}, 220`} rotation="-90" origin="40, 40" />
          </Svg>
          <View style={styles.gpaTextOverlay}>
            <Text style={styles.gpaBig}>{calculateGPA()}</Text>
            <Text style={styles.gpaSmall}>GPA</Text>
          </View>
        </View>
        <View style={styles.rightSide}>
          <View><Text style={styles.statLabel}>ECTS</Text><Text style={styles.statValue}>{totalECTS}</Text></View>
          <View><Text style={styles.statLabel}>Passed</Text><Text style={styles.statValue}>{passed}</Text></View>
        </View>
      </View>
      
      <Text style={styles.sectionTitle}>📝 Επόμενες Εργασίες</Text>
      {assignments.map((a) => (
        <View key={a.id} style={styles.card}>
          <Text style={styles.cardTitle}>🎯 {a.title}</Text>
          <Text style={styles.cardContent}>{a.description || 'Χωρίς περιγραφή'}</Text>
          <Text style={styles.cardSubContent}>Deadline: {formatDate(a.due_date)}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>📅 Επόμενες Εξετάσεις</Text>
      {exams.map((e) => (
        <View key={e.id} style={styles.card}>
          <Text style={styles.cardTitle}>🎓 Μάθημα</Text>
          <Text style={styles.cardContent}>{e.course_name}</Text>
          <Text style={styles.cardSubContent}>Ημερομηνία: {formatDate(e.exam_date)}</Text>
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121824', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40 },
  mainTitle: { fontSize: 32, fontWeight: 'bold', color: '#f8fafc' },
  logoutButton: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  subtitle: { fontSize: 16, color: '#94a3b8', marginBottom: 15, marginTop: 10 },
  dashboardCard: { backgroundColor: '#1e293b', borderBottomRightRadius: 15, borderBottomLeftRadius: 60, borderTopRightRadius: 15, borderTopLeftRadius: 60, padding: 20, flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  leftSide: { alignItems: 'center', marginRight: 20 },
  gpaTextOverlay: { position: 'absolute', top: 25 },
  gpaBig: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  gpaSmall: { color: '#94a3b8', fontSize: 10 },
  rightSide: { flex: 1, flexDirection: 'row', gap: 60 },
  statLabel: { color: '#94a3b8', fontSize: 12 },
  statValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#38bdf8', marginTop: 15, marginBottom: 10 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#38bdf8', marginBottom: 5 },
  cardContent: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 5 },
  cardSubContent: { fontSize: 13, color: '#94a3b8' },
});