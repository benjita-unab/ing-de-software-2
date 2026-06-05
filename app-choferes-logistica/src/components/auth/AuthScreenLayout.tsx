import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthSpacing } from '@/src/constants/authTheme';
import { useAuthTheme } from '@/src/hooks/use-auth-theme';

type AuthScreenLayoutProps = {
  children: ReactNode;
  /** Centra el contenido verticalmente (pantalla de acceso). */
  centered?: boolean;
};

export function AuthScreenLayout({
  children,
  centered = false,
}: AuthScreenLayoutProps) {
  const { colors } = useAuthTheme();
  const { width } = useWindowDimensions();
  const horizontalPad =
    width >= 400 ? AuthSpacing.screenPaddingWide : AuthSpacing.screenPadding;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            centered && styles.scrollCentered,
            { paddingHorizontal: horizontalPad },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, { maxWidth: AuthSpacing.contentMaxWidth }]}>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  scrollCentered: {
    justifyContent: 'center',
    minHeight: '100%',
  },
  content: {
    width: '100%',
    alignSelf: 'center',
  },
});
