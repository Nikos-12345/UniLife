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

  // 3. Δημιουργία Δεδομένων για τα 8 Εξάμηνα (Αλφαβητικά)
  const getSemesterChartData = () => {
    // Αρχικά, αθροίζουμε τα δεδομένα ανά εξάμηνο
    const semesterStats: { [key: string]: { points: number, ects: number } } = {};

    validPassedGrades.forEach(g => {
      const sem = String(g.semester);
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

    // Δημιουργούμε έναν σταθερό πίνακα με τα 8 εξάμηνα (Α έως Η)
    const greekSemesters = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'ΣΤ', 'Ζ', 'Η'];
    
    return greekSemesters.map((letter, index) => {
      const semNum = String(index + 1); // "1", "2", ... "8"
      const stats = semesterStats[semNum];
      return {
        label: letter,
        average: stats ? (stats.points / stats.ects) : 0 // Αν δεν έχει περασμένα, average = 0
      };
    });
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

      <Text style={styles.sectionTitle}>📅 Επόμενες Εξετάσεις</Text>
      {exams.map((e) => (
        <View key={e.id} style={styles.card}>
          <Text style={styles.cardTitle}>🎓 Μάθημα</Text>
          <Text style={styles.cardContent}>{e.course_name}</Text>
          <Text style={styles.cardSubContent}>Ημερομηνία: {formatDate(e.exam_date)}</Text>
        </View>
      ))}
      
      <Text style={styles.sectionTitle}>📝 Επόμενες Εργασίες</Text>
      {assignments.map((a) => (
        <View key={a.id} style={styles.card}>
          <Text style={styles.cardTitle}>🎯 {a.title}</Text>
          <Text style={styles.cardContent}>{a.description || 'Χωρίς περιγραφή'}</Text>
          <Text style={styles.cardSubContent}>Deadline: {formatDate(a.due_date)}</Text>
        </View>
      ))}

      {/* ΝΕΟ: Επαγγελματικό Ιστόγραμμα (8 Εξάμηνα με Y-Axis) */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>📊 Επιδόσεις ανά Εξάμηνο</Text>
        
        <View style={styles.chartWrapper}>
          {/* Κάθετος Άξονας (Y-Axis) */}
          <View style={styles.yAxis}>
            {[10, 8, 6, 4, 2, 0].map((val) => (
              <Text key={val} style={styles.yAxisText}>{val}</Text>
            ))}
          </View>

          {/* Μπάρες Γραφήματος */}
          <View style={styles.barsContainer}>
            {chartData.map((data, index) => {
              const barHeight = (data.average / 10) * 100; 
              return (
                <View key={index} style={styles.barColumn}>
                  {/* Εμφάνιση βαθμού πάνω από τη μπάρα μόνο αν είναι > 0 */}
                  <Text style={styles.barValueText}>
                    {data.average > 0 ? data.average.toFixed(1) : ''}
                  </Text>
                  
                  <View style={styles.barBackground}>
                    <View style={[styles.barFill, { height: `${barHeight}%` }]} />
                  </View>
                  
                  <Text style={styles.barLabel}>{data.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

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
  
  // Νέα Styles για το Αναβαθμισμένο Ιστόγραμμα
  chartCard: { backgroundColor: '#1e293b', borderRadius: 15, padding: 15, marginBottom: 20, elevation: 3 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', marginBottom: 20, paddingLeft: 5 },
  chartWrapper: { flexDirection: 'row', height: 180 }, // Ορίζει το ύψος όλου του γραφήματος
  yAxis: { justifyContent: 'space-between', paddingBottom: 25, paddingRight: 10, alignItems: 'flex-end', borderRightWidth: 1, borderColor: '#334155' },
  yAxisText: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
  barsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  barColumn: { alignItems: 'center', width: 28 },
  barValueText: { color: '#a855f7', fontSize: 10, fontWeight: 'bold', marginBottom: 4, height: 14 },
  barBackground: { height: 130, width: 20, backgroundColor: '#0f172a', borderRadius: 10, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: '#a855f7', borderRadius: 10 },
  barLabel: { color: '#94a3b8', fontSize: 12, marginTop: 8, fontWeight: 'bold', height: 16 },

  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#38bdf8', marginTop: 15, marginBottom: 10 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#38bdf8', marginBottom: 5 },
  cardContent: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 5 },
  cardSubContent: { fontSize: 13, color: '#94a3b8' },
});