import React from 'react';
import { Text } from 'react-native';

// Yazı tipi (font) dosyası gerektirmeyen, her cihazda çalışan ikon seti.
// @expo/vector-icons fontları release/OTA sürümünde yüklenemediği için kare/boş görünüyordu.
const GLYPHS = {
  desktop: '🖥️', 'desktop-outline': '🖥️',
  sparkles: '✨', 'sparkles-outline': '✨',
  terminal: '⌨️', 'terminal-outline': '⌨️',
  settings: '⚙️', 'settings-outline': '⚙️',
  'refresh-outline': '🔄', 'refresh-circle': '🔄',
  'checkmark-circle': '✅',
  'alert-circle-outline': '⚠️',
  'laptop-outline': '💻',
  'hardware-chip-outline': '🧠',
  'speedometer-outline': '⚡',
  'battery-charging-outline': '🔌', 'battery-full-outline': '🔋',
  'camera-outline': '📸',
  'volume-low-outline': '🔉', 'volume-mute-outline': '🔇', 'volume-high-outline': '🔊',
  'play-skip-back-circle-outline': '⏮️', 'play-skip-forward-circle-outline': '⏭️',
  'lock-closed-outline': '🔒',
  'megaphone-outline': '📢',
  'notifications-outline': '🔔',
  'trash-outline': '🗑️', 'trash-bin-outline': '🗑️',
  'chevron-forward': '›', 'arrow-forward': '→',
  'logo-youtube': '▶️', 'logo-github': '🐙',
  'calculator-outline': '🧮',
  'document-text-outline': '📝',
  'folder-outline': '📁',
  'clipboard-outline': '📋',
  'wifi-outline': '📶',
  'disc-outline': '💾',
  'play': '▶',
  send: '➤',
  'close-circle-outline': '✖',
  'cloud-download-outline': '☁️',
  'link-outline': '🔗',
};

export function Ionicons({ name, size = 20, color, style }) {
  const glyph = GLYPHS[name] || '•';
  return (
    <Text
      allowFontScaling={false}
      style={[{ fontSize: size, lineHeight: Math.round(size * 1.25), color, textAlign: 'center' }, style]}
    >
      {glyph}
    </Text>
  );
}

export default Ionicons;
