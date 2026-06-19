import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs 
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
        tabBarActiveTintColor: '#38bdf8',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Αρχική',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="assignments" 
        options={{ 
          title: 'Εργασίες',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="notes" 
        options={{ 
          title: 'Σημειώσεις',
          tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size} color={color} />
        }} 
      />
      
      <Tabs.Screen 
        name="exams" 
        options={{ 
          title: 'Εξετάσεις',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />
        }} 
      />

      <Tabs.Screen 
        name="grades" 
        options={{ 
          title: 'Βαθμολογίες',
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} />
        }} 
      />
      
      {/* Κρυφή οθόνη Auth χωρίς μενού */}
      <Tabs.Screen 
        name="auth" 
        options={{ 
          href: null, 
          tabBarStyle: { display: 'none' } 
        }} 
      />
    </Tabs>
  );
}