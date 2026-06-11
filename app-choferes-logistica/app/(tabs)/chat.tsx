import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { STORAGE_RUTA_ACTIVA_ID } from '@/src/components/ChoferSessionBar';
import {
  enviarChatMensajeRuta,
  fetchChatMensajesRuta,
  marcarChatRutaLeido,
  type ChatMensajeRuta,
} from '@/src/services/chatRutaService';

const POLL_MS = 5000;

function formatHora(value: string): string {
  try {
    return new Date(value).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [rutaId, setRutaId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<ChatMensajeRuta[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_RUTA_ACTIVA_ID);
      if (!cancelled) {
        setRutaId(stored?.trim() || null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cargarMensajes = useCallback(async (id: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchChatMensajesRuta(id);
      setMensajes(data);
      await marcarChatRutaLeido(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar chat');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!rutaId) return undefined;
    void cargarMensajes(rutaId);
    const interval = setInterval(() => {
      void cargarMensajes(rutaId, { silent: true });
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [rutaId, cargarMensajes]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [mensajes]);

  const handleEnviar = async () => {
    const contenido = texto.trim();
    if (!contenido || !rutaId || sending) return;

    setSending(true);
    setError(null);
    try {
      await enviarChatMensajeRuta(rutaId, contenido);
      setTexto('');
      await cargarMensajes(rutaId, { silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  if (!rutaId) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>Chat con operador</Text>
        <Text style={styles.emptyText}>
          Selecciona una ruta activa en la pestaña Home para conversar con el operador.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat con operador</Text>
        <Text style={styles.headerSub}>Ruta activa</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading && mensajes.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {mensajes.length === 0 ? (
            <Text style={styles.emptyText}>Sin mensajes. Envía el primero.</Text>
          ) : (
            mensajes.map((msg) => {
              const esConductor = msg.remitente_tipo === 'CONDUCTOR';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.bubble,
                    esConductor ? styles.bubbleConductor : styles.bubbleOperador,
                  ]}>
                  <Text style={styles.bubbleLabel}>
                    {esConductor ? 'Tú' : 'Operador'}
                  </Text>
                  <Text style={styles.bubbleText}>{msg.contenido}</Text>
                  <Text style={styles.bubbleTime}>{formatHora(msg.created_at)}</Text>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          value={texto}
          onChangeText={setTexto}
          editable={!sending}
          maxLength={2000}
          multiline
        />
        <Pressable
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          onPress={() => void handleEnviar()}
          disabled={sending || !texto.trim()}>
          <Text style={styles.sendBtnText}>{sending ? '…' : 'Enviar'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  headerSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 10 },
  bubble: {
    maxWidth: '85%',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  bubbleConductor: {
    alignSelf: 'flex-end',
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
    borderWidth: 1,
  },
  bubbleOperador: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
  },
  bubbleLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 },
  bubbleText: { fontSize: 15, color: '#0f172a' },
  bubbleTime: { fontSize: 11, color: '#94a3b8', marginTop: 6, alignSelf: 'flex-end' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#cbd5e1',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    fontSize: 15,
  },
  sendBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#fff', fontWeight: '700' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  errorBox: {
    margin: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: '#b91c1c', fontSize: 13 },
});
