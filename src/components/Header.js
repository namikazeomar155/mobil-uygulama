import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';
import { LOGO_ICON_BASE64 } from '../theme/logoData';

export default function Header({ title, subtitle, rightElement }) {
  const isConnected = subtitle && (subtitle.includes('BAĞLI') || subtitle.includes('🟢'));
  const isDisconnected = subtitle && (subtitle.includes('🔴') || subtitle.includes('ARANIYOR') || subtitle.includes('YOK'));

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        <View style={styles.logoWrap}>
          <Image
            source={{ uri: LOGO_ICON_BASE64 }}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>
        <View style={styles.textContainer}>
          {subtitle ? (
            <View style={[
              styles.statusBadge,
              isConnected && styles.statusBadgeConnected,
              isDisconnected && styles.statusBadgeDisconnected,
            ]}>
              <View style={[
                styles.statusDot,
                isConnected && styles.statusDotConnected,
                isDisconnected && styles.statusDotDisconnected,
              ]} />
              <Text
                style={[
                  styles.subtitle,
                  isConnected && styles.subtitleConnected,
                  isDisconnected && styles.subtitleDisconnected,
                ]}
                numberOfLines={1}
              >
                {subtitle.replace(/[🟢🔴]/g, '').trim()}
              </Text>
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
      {rightElement && <View style={styles.right}>{rightElement}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  logoImg: {
    width: 36,
    height: 36,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  statusBadgeConnected: {
    backgroundColor: colors.successSoft,
  },
  statusBadgeDisconnected: {
    backgroundColor: colors.dangerSoft,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
    marginRight: 5,
  },
  statusDotConnected: {
    backgroundColor: colors.success,
  },
  statusDotDisconnected: {
    backgroundColor: colors.danger,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  subtitleConnected: {
    color: colors.success,
  },
  subtitleDisconnected: {
    color: colors.danger,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  right: {
    marginLeft: 12,
  },
});
