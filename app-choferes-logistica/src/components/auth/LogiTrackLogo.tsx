import { Image } from 'expo-image';
import React, { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AuthSpacing, AuthTypography } from '@/src/constants/authTheme';
import { useAuthTheme } from '@/src/hooks/use-auth-theme';

const iconSource = require('@/assets/images/icon.png');

type LogiTrackLogoProps = {
  /** Ej.: "Portal Chofer" o "Portal Cliente". */
  portalTitle?: string;
  /** Línea opcional bajo el portal (pantalla de selección de acceso). */
  helperText?: string;
  /** Muestra tagline corporativa (solo pantalla inicial). */
  showTagline?: boolean;
  compact?: boolean;
};

export function LogiTrackLogo({
  portalTitle,
  helperText,
  showTagline = false,
  compact = false,
}: LogiTrackLogoProps) {
  const { colors, scheme } = useAuthTheme();
  const { width } = useWindowDimensions();
  const [imageFailed, setImageFailed] = useState(false);

  const isNarrow = width < 360;
  const iconSize = compact || isNarrow
    ? AuthSpacing.logoIconSizeSmall
    : AuthSpacing.logoIconSize;

  return (
    <View style={styles.wrap}>
      {!imageFailed ? (
        <Image
          source={iconSource}
          style={[
            styles.icon,
            {
              width: iconSize,
              height: iconSize,
              borderRadius: scheme === 'light' ? 20 : iconSize / 5,
            },
          ]}
          contentFit="contain"
          onError={() => setImageFailed(true)}
          accessibilityLabel="LogiTrack"
        />
      ) : (
        <View
          style={[
            styles.iconFallback,
            {
              width: iconSize,
              height: iconSize,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Text style={styles.fallbackEmoji}>🚚</Text>
        </View>
      )}

      <View style={styles.brandRow}>
        <Text style={[styles.brand, { color: colors.brandLogi }]}>Logi</Text>
        <Text style={[styles.brand, { color: colors.brandTrack }]}>Track</Text>
      </View>

      {showTagline ? (
        <Text style={[styles.tagline, { color: colors.tagline }]}>
          SEGUIMIENTO · RUTAS · CONFIANZA
        </Text>
      ) : null}

      {portalTitle ? (
        <Text style={[styles.portal, { color: colors.textSecondary }]}>
          {portalTitle}
        </Text>
      ) : null}

      {helperText ? (
        <Text style={[styles.helper, { color: colors.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: AuthSpacing.heroGap,
    paddingHorizontal: 8,
  },
  icon: {},
  iconFallback: {
    borderWidth: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: { fontSize: 40 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brand: {
    ...AuthTypography.brand,
  },
  tagline: {
    ...AuthTypography.tagline,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: -4,
  },
  portal: {
    ...AuthTypography.portal,
    textAlign: 'center',
    marginTop: 2,
  },
  helper: {
    ...AuthTypography.helper,
    textAlign: 'center',
    maxWidth: 320,
  },
});
