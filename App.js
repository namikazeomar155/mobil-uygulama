import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { colors } from './src/theme/colors';

// Ekranlar
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import TerminalScreen from './src/screens/TerminalScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const TABS = [
  { id: 'home', label: 'Sistem', icon: '🖥️' },
  { id: 'chat', label: 'Komutan', icon: '🤖' },
  { id: 'terminal', label: 'Terminal', icon: '💻' },
  { id: 'settings', label: 'Ayarlar', icon: '⚙️' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigate={setActiveTab} />;
      case 'chat':
        return <ChatScreen />;
      case 'terminal':
        return <TerminalScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen onNavigate={setActiveTab} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>

      <View style={styles.navBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.navTab, isActive && styles.navTabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.navIcon, isActive && styles.navIconActive]}>
                {tab.icon}
              </Text>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  screenContainer: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 14,
    minWidth: 68,
  },
  navTabActive: {
    backgroundColor: colors.surfaceLight,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.6,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  navLabelActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 3,
  },
});
