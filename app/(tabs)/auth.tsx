import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function AuthScreen() {
  const router = useRouter();

  // Ξεκινάμε με το Login mode (true) ως προεπιλογή
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // State για τα input πεδία
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    // Έλεγχος αν κάποιο πεδίο είναι άδειο
    if (email.trim() === '' || password.trim() === '' || (!isLoginMode && name.trim() === '')) {
      alert('Παρακαλώ συμπληρώστε όλα τα πεδία!');
      return;
    }
    
    if (!isLoginMode) {
      // --- REGISTER MODE ---
      try {
        const response = await fetch('http://172.16.0.65:5000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();

        if (response.ok) {
          // 1. Αποθήκευση των στοιχείων στη μνήμη του κινητού
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
          
          // 2. Εμφάνιση μηνύματος και πλοήγηση
          alert('Επιτυχής εγγραφή! Καλώς ήρθες ' + data.user.name);
          router.replace('/'); 
        } else {
          alert(data.error || 'Κάτι πήγε λάθος!');
        }

      } catch (error) {
        console.error(error);
        alert('Αποτυχία σύνδεσης με τον server. Τσέκαρε το IP σου!');
      }
    } else {
      // --- LOGIN MODE ---
      try {
        const response = await fetch('http://172.16.0.65:5000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
          // 1. Αποθήκευση των στοιχείων στη μνήμη του κινητού
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
          
          // 2. Εμφάνιση μηνύματος και πλοήγηση
          alert('Επιτυχής σύνδεση! Καλώς ήρθες ' + data.user.name);
          router.replace('/'); 
        } else {
          alert(data.error || 'Λάθος στοιχεία!');
        }
      } catch (error) {
        console.error(error);
        alert('Αποτυχία σύνδεσης με τον server. Τσέκαρε το IP σου!');
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.innerContainer}>
          
          <Text style={styles.logo}>UniLife 🎓</Text>
          <Text style={styles.subtitle}>
            {isLoginMode ? 'Σύνδεση στο φοιτητικό σου λογαριασμό' : 'Δημιουργία νέου λογαριασμού'}
          </Text>

          {/* Εμφάνιση του πεδίου "Όνομα" ΜΟΝΟ στο Register */}
          {!isLoginMode && (
            <>
              <Text style={styles.inputLabel}>Όνομα / Επώνυμο</Text>
              <TextInput
                style={styles.input}
                placeholder="π.χ. Κωνσταντίνος"
                placeholderTextColor="#64748b"
                value={name}
                onChangeText={setName}
              />
            </>
          )}

          {/* Πεδίο Email */}
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="π.χ. student@uni.gr"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Πεδίο Password */}
          <Text style={styles.inputLabel}>Κωδικός πρόσβασης</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {/* Κουμπί Υποβολής */}
          <TouchableOpacity style={styles.button} onPress={handleSubmit} activeOpacity={0.8}>
            <Text style={styles.buttonText}>
              {isLoginMode ? 'Είσοδος' : 'Εγγραφή'}
            </Text>
          </TouchableOpacity>

          {/* Κουμπί για εναλλαγή μεταξύ Login και Register */}
          <TouchableOpacity 
            style={styles.switchButton} 
            onPress={() => setIsLoginMode(!isLoginMode)}
          >
            <Text style={styles.switchButtonText}>
              {isLoginMode ? 'Δεν έχεις λογαριασμό; Εγγραφή' : 'Έχεις ήδη λογαριασμό; Σύνδεση'}
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121824',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  innerContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputLabel: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#38bdf8',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 10,
    alignItems: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonText: {
    color: '#121824',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});