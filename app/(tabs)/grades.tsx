import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function GradesScreen() {
  const [grades, setGrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGrades = async () => {
    const userData = await AsyncStorage.getItem('user');
    if (!userData) return;
    const user = JSON.parse(userData);
    try {
      const response = await fetch(`http://172.16.0.65:5000/api/grades/${user.id}`);
      const data = await response.json();
      setGrades(data);
    } catch (error) { console.error(error); } 
    finally { setIsLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchGrades(); }, []));

  const semesters = grades.reduce((acc: any, grade: any) => {
    (acc[grade.semester] = acc[grade.semester] || []).push(grade);
    return acc;
  }, {});

  if (isLoading) return <ActivityIndicator style={{flex: 1}} size="large" color="#a855f7" />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.mainTitle}>Βαθμολογίες</Text>
      
      {Object.keys(semesters).sort().map((sem) => (
        <View key={sem} style={styles.semContainer}>
          <View style={styles.semHeader}>
            <Text style={styles.semTitle}>{sem}ο Εξάμηνο</Text>
          </View>
          {semesters[sem].map((g: any) => (
            <View key={g.id} style={styles.gradeCard}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="school" size={20} color="#fbbf24" style={{marginRight: 10}} />
                <Text style={styles.courseName}>{g.course_name}</Text>
              </View>
              <Text style={styles.gradeText}>{g.grade}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121824' },
  mainTitle: { fontSize: 32, fontWeight: 'bold', color: '#f8fafc', marginBottom: 20, marginTop: 40 },
  semContainer: { marginBottom: 25 },
  semHeader: { marginBottom: 10, paddingHorizontal: 5 },
  semTitle: { fontSize: 20, fontWeight: 'bold', color: '#a855f7' },
  gradeCard: { backgroundColor: '#1e293b', padding: 15, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  courseName: { color: '#f8fafc', fontSize: 16 },
  gradeText: { color: '#fbbf24', fontSize: 16, fontWeight: 'bold' }
});