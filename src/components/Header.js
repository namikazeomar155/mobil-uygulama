import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function Header({ title, subtitle, rightElement }) {
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        {subtitle && <Text style={styles.subtitle}>{subtitle.toUpperCase()}</Text>}
        <Text style={styles.title}>{title}</Text>
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
  textContainer: {
    flex: 1,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  right: {
    marginLeft: 12,
  },
});
