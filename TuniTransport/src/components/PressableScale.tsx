// ──────────────────────────────────────────────────────────────────────────
// PressableScale — retour tactile « premium » : léger scale au press.
// Utilise l'API Animated native (aucune dépendance ajoutée). À utiliser à la
// place de TouchableOpacity pour les actions principales (boutons, cartes).
// ──────────────────────────────────────────────────────────────────────────
import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';

type Props = Omit<PressableProps, 'style'> & {
  /** Facteur de réduction au press (défaut 0.96). */
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export default function PressableScale({
  scaleTo = 0.96,
  style,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  const handlePressIn = (e: GestureResponderEvent) => {
    animateTo(scaleTo);
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    animateTo(1);
    onPressOut?.(e);
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} {...rest}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
