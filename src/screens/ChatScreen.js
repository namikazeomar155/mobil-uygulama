import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import Header from '../components/Header';
import { aiService } from '../services/aiService';
import { storageService } from '../services/storageService';

const SUGGESTIONS = [
  { label: 'Laptopta sesli "Selam Omar" de', icon: 'megaphone-outline' },
  { label: 'Masaüstündeki dosyaları listele', icon: 'folder-outline' },
  { label: 'Laptop ekranında bildirim göster', icon: 'notifications-outline' },
  { label: 'Panomda ne kopyalı göster', icon: 'clipboard-outline' },
  { label: 'Laptopta YouTube aç', icon: 'logo-youtube' },
  { label: 'Geri Dönüşüm Kutusunu temizle', icon: 'trash-outline' },
  { label: 'En çok RAM harcayan programlar', icon: 'speedometer-outline' },
  { label: 'Laptop ekranını kilitle', icon: 'lock-closed-outline' },
];

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadChat();
  }, []);

  const loadChat = async () => {
    const history = await storageService.getChatHistory();
    setMessages(history);
  };

  const handleSend = async (textToSend) => {
    const message = textToSend || inputText;
    if (!message || message.trim() === '' || loading) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: message.trim(),
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setLoading(true);

    try {
      const aiReply = await aiService.sendMessage(message, newHistory);
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      };
      const finalHistory = [...newHistory, aiMsg];
      setMessages(finalHistory);
      await storageService.saveChatHistory(finalHistory);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    const initial = [
      {
        id: Date.now().toString(),
        sender: 'ai',
        text: 'Sohbet temizlendi! Yeni bir görev veya soruyla başlayabilirsiniz.',
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      }
    ];
    setMessages(initial);
    await storageService.saveChatHistory(initial);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Header
        subtitle="Antigravity & PC Asistanı"
        title="AI Komutan"
        rightElement={
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Ionicons name="trash-bin-outline" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.clearBtnText}>Temizle</Text>
          </TouchableOpacity>
        }
      />

      {/* CHAT MESSAGES */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isUser = item.sender === 'user';
          return (
            <View style={[styles.bubbleWrap, isUser ? styles.bubbleWrapUser : styles.bubbleWrapAi]}>
              {!isUser && (
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={14} color={colors.primaryLight} />
                </View>
              )}
              <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
                <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAi]}>
                  {item.text}
                </Text>
                <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampAi]}>
                  {item.timestamp}
                </Text>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={colors.primaryLight} />
              <Text style={styles.loadingText}>Komut işleniyor ve laptopa iletiliyor...</Text>
            </View>
          ) : null
        }
      />

      {/* QUICK SUGGESTIONS */}
      <View style={styles.suggestionsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SUGGESTIONS}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chip}
              onPress={() => handleSend(item.label)}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon} size={14} color={colors.primaryLight} style={{ marginRight: 6 }} />
              <Text style={styles.chipText}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* INPUT BAR */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Komut ver veya bir soru sor..."
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || loading}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  clearBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleWrap: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bubbleWrapUser: {
    justifyContent: 'flex-end',
  },
  bubbleWrapAi: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  bubble: {
    maxWidth: '82%',
    padding: 14,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: '#FFF',
  },
  bubbleTextAi: {
    color: colors.text,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 6,
  },
  timestampUser: {
    color: 'rgba(255, 255, 255, 0.6)',
    alignSelf: 'flex-end',
  },
  timestampAi: {
    color: colors.textMuted,
    alignSelf: 'flex-start',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginLeft: 36,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginLeft: 8,
  },
  suggestionsContainer: {
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.inputBackground,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceElevated,
    opacity: 0.5,
  },
});
