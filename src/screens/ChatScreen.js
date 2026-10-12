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
import { colors } from '../theme/colors';
import Header from '../components/Header';
import { aiService } from '../services/aiService';
import { storageService } from '../services/storageService';

const SUGGESTIONS = [
  'Günün 3 önceliğini belirle 🎯',
  'Bugün biraz moralsizim 🌿',
  'Su içmeyi neden unutuyorum? 💧',
  'Daha iyi odaklanma taktiği ver ⚡',
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
    const initial = [
      {
        id: Date.now().toString(),
        sender: 'ai',
        text: 'Sohbet temizlendi! Yeni bir konuyla başlayalım, bugün aklında ne var?',
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
        subtitle="Yapay Zeka Koçu"
        title="Aura Chat 🤖"
        rightElement={
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Temizle</Text>
          </TouchableOpacity>
        }
      />

      {/* MESAJ LİSTESİ */}
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
              <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
                <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAi]}>
                  {item.text}
                </Text>
                <Text style={styles.timestamp}>{item.timestamp}</Text>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={colors.primaryLight} />
              <Text style={styles.loadingText}>Aura düşünüyor...</Text>
            </View>
          ) : null
        }
      />

      {/* HIZLI ÖNERİ BALONCUKLARI */}
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
              onPress={() => handleSend(item)}
            >
              <Text style={styles.chipText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* METİN GİRİŞ ALANI */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Aura'ya bir şeyler sor..."
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || loading}
        >
          <Text style={styles.sendIcon}>➤</Text>
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
    paddingHorizontal: 12,
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
  },
  bubbleWrapUser: {
    justifyContent: 'flex-end',
  },
  bubbleWrapAi: {
    justifyContent: 'flex-start',
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
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextUser: {
    color: '#FFF',
  },
  bubbleTextAi: {
    color: colors.text,
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginLeft: 4,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
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
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceLight,
    opacity: 0.5,
  },
  sendIcon: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
