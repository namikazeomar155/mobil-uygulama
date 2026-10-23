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
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { Ionicons } from './src/components/Ionicons';
import * as Haptics from 'expo-haptics';
import { colors } from './src/theme/colors';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import TerminalScreen from './src/screens/TerminalScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const TABS = [
  { id: 'home', label: 'Sistem', iconOutline: 'desktop-outline', iconActive: 'desktop' },
  { id: 'chat', label: 'Komutan', iconOutline: 'sparkles-outline', iconActive: 'sparkles' },
  { id: 'terminal', label: 'Terminal', iconOutline: 'terminal-outline', iconActive: 'terminal' },
  { id: 'settings', label: 'Ayarlar', iconOutline: 'settings-outline', iconActive: 'settings' },
];

const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primaryLight,
    background: colors.background,
    surface: colors.surface,
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  const handleTabPress = (tabId) => {
    if (activeTab !== tabId) {
      try {
        Haptics.selectionAsync();
      } catch (e) {}
      setActiveTab(tabId);
    }
  };

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
    <PaperProvider theme={paperTheme}>
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
                onPress={() => handleTabPress(tab.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isActive ? tab.iconActive : tab.iconOutline}
                  size={21}
                  color={isActive ? colors.primaryLight : colors.textMuted}
                />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {tab.label}
                </Text>
                {isActive && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </PaperProvider>
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
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    minWidth: 70,
  },
  navTabActive: {
    backgroundColor: colors.primarySoft,
  },
  navLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 3,
  },
  navLabelActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primaryLight,
    marginTop: 3,
  },
});
