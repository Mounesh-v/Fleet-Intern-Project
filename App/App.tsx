
import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, StatusBar } from 'react-native';
import LoginScreen from './src/screens/auth/LoginScreen';
import MainApp from './src/navigation/MainApp';

export default function App() {
  const [session, setSession] = useState(null);

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset access',
      'Ask your dispatcher to reset your Fleet Manager password.',
    );
  };

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
      />

      {session ? (
        <MainApp
          session={session}
          onLogout={() => setSession(null)}
        />
      ) : (
        <LoginScreen
          onLogin={setSession}
          onForgotPassword={handleForgotPassword}
        />
      )}
    </SafeAreaProvider>
  );
}
