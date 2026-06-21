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
            fetch(`https://unilife-backend-4xjo.onrender.com/api/dashboard/${user.id}`),
            fetch(`https://unilife-backend-4xjo.onrender.com/api/grades/${user.id}`)
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

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    router.replace('/auth');
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' });

  // 1. Φιλτράρισμα: Κρατάμε ΜΟΝΟ τα περασμένα μαθήματα (βαθμός >= 5)
  const validPassedGrades = grades.filter((g) => {
    if (g.grade === null || g.grade === undefined || g.grade === '') return false;
    const gradeVal = parseFloat(g.grade);
    return !isNaN(gradeVal) && gradeVal >= 5;
  });

  // 2. Υπολογισμός Σταθμισμένου Μέσου Όρου (Γενικού)
  const calculateGPA = () => {
    if (validPassedGrades.length === 0) return "0.00";
    let totalPoints = 0;
    let totalEcts = 0;

    validPassedGrades.forEach((g) => {
      const gradeVal = parseFloat(g.grade);
      const ectsVal = parseInt(g.ects, 10);
      if (!isNaN(gradeVal) && !isNaN(ectsVal)) {
        totalPoints += gradeVal * ectsVal;
        totalEcts += ectsVal;
      }
    });

    return totalEcts === 0 ? "0.00" : (totalPoints / totalEcts).toFixed(2);
  };

  // 3. Υπολογισμός Δεδομένων για το Ιστόγραμμα (Μ.Ο. ανά Εξάμηνο)
  const getSemesterChartData = () => {
    const semesterStats: { [key: string]: { points: number, ects: number } } = {};

    validPassedGrades.forEach(g => {
      const sem = g.semester;
      const gradeVal = parseFloat(g.grade);
      const ectsVal = parseInt(g.ects, 10);
      
      if (!isNaN(gradeVal) && !isNaN(ectsVal)) {
        if (!semesterStats[sem]) {
          semesterStats[sem] = { points: 0, ects: 0 };
        }
        semesterStats[sem].points += gradeVal * ectsVal;
        semesterStats[sem].ects += ectsVal;
      }
    });

    // Δημιουργία πίνακα δεδομένων και ταξινόμηση ανά εξάμηνο
    return Object.keys(semesterStats)
      .map(sem => ({
        semester: sem,
        average: semesterStats[sem].points / semesterStats[sem].ects
      }))
      .sort((a, b) => parseInt(a.semester) - parseInt(b.semester));
  };

  const chartData = getSemesterChartData();

  // 4. Υπολογισμός Περασμένων & Συνολικών ECTS
  const passed = validPassedGrades.length;
  const totalECTS = validPassedGrades.reduce((acc, g) => acc + (parseInt(g.ects, 10) || 0), 0);

  if (isChecking) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color="#38bdf8" /></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.mainTitle}>UniLife</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}><Text style={styles.logoutText}>Αποσύνδεση</Text></TouchableOpacity>
      </View>
      
      <Text style={styles.subtitle}>Η εφαρμογή που σε ενημερώνει για όλα όσα αφορούν την σχολή σου</Text>

      {/* Κεντρική Κάρτα (Γενικά Στατιστικά) */}
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

      {/* ΝΕΟ: Ιστόγραμμα Μέσου Όρου ανά Εξάμηνο */}
      {chartData.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>📊 Επιδόσεις ανά Εξάμηνο</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartContainer}>
            {chartData.map((data, index) => {
              // Υπολογισμός ύψους μπάρας (max 100% για το 10)
              const barHeight = (data.average / 10) * 100; 
              return (
                <View key={index} style={styles.barWrapper}>
                  <Text style={styles.barValue}>{data.average.toFixed(2)}</Text>
                  <View style={styles.barBackground}>
                    <View style={[styles.barFill, { height: `${barHeight}%` }]} />
                  </View>
                  <Text style={styles.barLabel}>{data.semester}ο</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
      
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
  gpaTextOverlay: { position: 'absolute', top: 25, alignItems: 'center' },
  gpaBig: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  gpaSmall: { color: '#94a3b8', fontSize: 10 },
  rightSide: { flex: 1, flexDirection: 'row', gap: 60 },
  statLabel: { color: '#94a3b8', fontSize: 12 },
  statValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  
  // Νέα Styles για το Ιστόγραμμα
  chartCard: { backgroundColor: '#1e293b', borderRadius: 15, padding: 20, marginBottom: 20, elevation: 3 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', marginBottom: 20 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 10 },
  barWrapper: { alignItems: 'center', marginRight: 25, width: 40 },
  barValue: { color: '#a855f7', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  barBackground: { height: 120, width: 28, backgroundColor: '#0f172a', borderRadius: 14, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: '#a855f7', borderRadius: 14 },
  barLabel: { color: '#94a3b8', fontSize: 14, marginTop: 10, fontWeight: 'bold' },

  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#38bdf8', marginTop: 15, marginBottom: 10 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#38bdf8', marginBottom: 5 },
  cardContent: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 5 },
  cardSubContent: { fontSize: 13, color: '#94a3b8' },
});