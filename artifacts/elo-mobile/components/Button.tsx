import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useColors } from '../hooks/useColors';
import designTokens from '../constants/colors';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface ButtonProps {
  onPress: () => void;
  title?: string;
  icon?: keyof typeof Feather.glyphMap;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'wine' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

export function Button({ onPress, title, icon, variant = 'primary', size = 'md', loading, disabled, style, textStyle, fullWidth, accessibilityLabel, testID }: ButtonProps) {
  const colors = useColors();
  
  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getBgColor = (pressed: boolean) => {
    if (variant === 'primary') return pressed ? colors.primary + 'E6' : colors.primary;
    if (variant === 'secondary') return pressed ? colors.secondary + 'E6' : colors.secondary;
    if (variant === 'wine') return pressed ? colors.accent + 'E6' : colors.accent;
    if (variant === 'destructive') return pressed ? colors.destructive + 'E6' : colors.destructive;
    if (variant === 'outline' || variant === 'ghost') return pressed ? colors.muted : 'transparent';
    return colors.primary;
  };

  const getTextColor = () => {
    if (disabled) return colors.mutedForeground;
    if (variant === 'primary' || variant === 'wine' || variant === 'destructive') return colors.primaryForeground;
    if (variant === 'secondary') return colors.secondaryForeground;
    return colors.primary; 
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
      }}
      testID={testID}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: getBgColor(pressed),
          borderColor: variant === 'outline' ? colors.border : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
          borderRadius: designTokens.radius,
          opacity: disabled ? 0.6 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        size === 'sm' && styles.sm,
        size === 'md' && styles.md,
        size === 'lg' && styles.lg,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={getTextColor()} size="small" />
        ) : (
          <>
            {icon && <Feather name={icon} size={size === 'sm' ? 16 : 20} color={getTextColor()} />}
            {title && (
              <Text style={[styles.text, { color: getTextColor() }, size === 'sm' && styles.textSm, size === 'lg' && styles.textLg, textStyle]}>
                {title}
              </Text>
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sm: { paddingVertical: 8, paddingHorizontal: 16 },
  md: { paddingVertical: 12, paddingHorizontal: 24 },
  lg: { paddingVertical: 16, paddingHorizontal: 32 },
  text: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  textSm: { fontSize: 14 },
  textLg: { fontSize: 18 },
});
