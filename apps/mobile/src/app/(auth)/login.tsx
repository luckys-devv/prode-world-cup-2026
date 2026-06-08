import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '../../constants/theme';
import * as authService from '../../services/auth.service';

export default function LoginScreen() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email || !password || (!isLoginMode && !displayName)) {
      setErrorMessage('Por favor, completa todos los campos.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (isLoginMode) {
        await authService.login({ email, password });
      } else {
        await authService.register({ email, password, displayName });
      }
    } catch (err: any) {
      // Tomamos el mensaje de error provisto por el backend
      setErrorMessage(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.light.background, Colors.light.backgroundElement]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Cabecera / Marca */}
          <View style={styles.headerContainer}>
            <Text style={styles.logoEmoji}>⚽</Text>
            <Text style={styles.appName}>Prode con Amigos</Text>
            <Text style={styles.appSubtitle}>Predicciones del Mundial 2026</Text>
          </View>

          {/* Tarjeta de Formulario (Glassmorphism sutil) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </Text>

            {errorMessage && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Inputs */}
            {!isLoginMode && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre de usuario</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre o apodo"
                  placeholderTextColor="#555B77"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#555B77"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#555B77"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Botón de envío */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLoginMode ? 'Ingresar' : 'Registrarse'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Selector de Modo */}
          <TouchableOpacity
            style={styles.toggleModeButton}
            onPress={() => {
              setIsLoginMode(!isLoginMode);
              setErrorMessage(null);
            }}
          >
            <Text style={styles.toggleModeText}>
              {isLoginMode
                ? '¿No tienes una cuenta? Registrate gratis'
                : '¿Ya tienes una cuenta? Inicia sesión'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  logoEmoji: {
    fontSize: 50,
    marginBottom: Spacing.two,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginTop: Spacing.one,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.four,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderWidth: 1,
    borderColor: Colors.light.error,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.four,
  },
  errorText: {
    color: '#FF8A8A',
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: Spacing.four,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: Spacing.two,
  },
  input: {
    backgroundColor: Colors.light.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    color: Colors.light.text,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: Colors.light.accentPrimary,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleModeButton: {
    marginTop: Spacing.four,
    alignItems: 'center',
  },
  toggleModeText: {
    color: Colors.light.accentSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});