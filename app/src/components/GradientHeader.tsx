import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, radius } from '../theme';

interface GradientHeaderProps {
  children: React.ReactNode;
  colors?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  rounded?: boolean;
}

/* A branded gradient surface used for heroes and headers. */
export function GradientHeader({
  children,
  colors = gradients.primary,
  style,
  rounded = true,
}: GradientHeaderProps) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.base, rounded && styles.rounded, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: { width: '100%' },
  rounded: { borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
});
