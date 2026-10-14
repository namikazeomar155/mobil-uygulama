import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';
import { LOGO_ICON_BASE64 } from '../theme/logoData';

export default function Header({ title, subtitle, rightElement }) {
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
          {subtitle && <Text style={styles.subtitle}>{subtitle.toUpperCase()}</Text>}
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
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FAF1EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(232, 122, 74, 0.35)',
    overflow: 'hidden',
  },
  logoImg: {
    width: 34,
    height: 34,
  },
  textContainer: {
    flex: 1,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryLight,
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  right: {
    marginLeft: 12,
  },
});
