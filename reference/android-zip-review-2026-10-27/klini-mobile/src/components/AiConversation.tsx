import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AiAction, AiMessage } from '../domain/kliniAi';
import { askKliniAi } from '../services/kliniAi';
import { useAppStore } from '../state/store';
import AiSparkles from './AiSparkles';
import { colors, Icon } from './ui';

let nextMessageId = 0;
function message(role: AiMessage['role'], text: string, action?: AiAction): AiMessage {
  return { id: `ai-${Date.now()}-${++nextMessageId}`, role, text, ...(action ? { action } : {}) };
}

export default function AiConversation({ initialQuestion, onClose, onAction, onManage }: {
  initialQuestion: string;
  onClose: () => void;
  onAction: (action: AiAction) => void;
  onManage: () => void;
}) {
  const { state } = useAppStore();
  const [messages, setMessages] = useState<AiMessage[]>(() => [message('user', initialQuestion)]);
  const [request, setRequest] = useState(() => ({ question: initialQuestion, history: [] as AiMessage[], state }));
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [source, setSource] = useState<'demo' | 'openai' | null>(null);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const locked = useRef(true);
  useEffect(() => {
    const controller = new AbortController();
    void askKliniAi({ ...request, signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      setMessages(current => [...current, message('assistant', result.text, result.action)]);
      setSource(result.source);
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No pudimos responder. Inténtalo de nuevo.');
    }).finally(() => {
      if (!controller.signal.aborted) { locked.current = false; setBusy(false); }
    });
    return () => controller.abort();
  }, [request]);
  const send = () => {
    const question = draft.trim();
    if (!question || locked.current) return;
    locked.current = true;
    const history = messages.slice(-12);
    setMessages(current => [...current, message('user', question)]);
    setDraft(''); setError(''); setBusy(true);
    setRequest({ question, history, state });
  };
  const retry = () => {
    if (locked.current) return;
    locked.current = true;
    setError(''); setBusy(true);
    setRequest({ ...request, state });
  };
  return <KeyboardAvoidingView testID="klini-ai-conversation" accessibilityViewIsModal style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
    <View style={s.card}>
      <View style={s.pointer} />
      <View style={s.header}>
        <AiSparkles /><Text accessibilityRole="header" style={s.title}>Klini IA</Text>
        <Pressable testID="ai-manage" accessibilityRole="button" accessibilityLabel="Gestionar Klini IA" onPress={onManage} style={s.headerTarget}><Icon name="settings" size={18} color={colors.muted} /></Pressable>
        <Pressable testID="ai-close" accessibilityRole="button" accessibilityLabel="Cerrar conversación" onPress={onClose} style={s.headerTarget}><View style={s.close}><Icon name="close" size={18} color={colors.muted} /></View></Pressable>
      </View>
      <Text testID="ai-mode" style={s.mode}>{source === 'openai' ? 'IA conectada · revisa las respuestas con tu médico' : source === 'demo' ? 'Demostración · información de tu perfil' : 'Información de tu perfil actual'}</Text>
      <ScrollView ref={scroll} testID="ai-messages" style={s.scroll} contentContainerStyle={s.messages} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        {messages.map(item => <View key={item.id} testID={`ai-message-${item.role}`} style={[s.bubble, item.role === 'user' ? s.user : s.assistant]}>
          <Text selectable style={s.message}>{item.text}</Text>
          {item.action && <Pressable testID="ai-message-action" accessibilityRole="button" onPress={() => onAction(item.action!)} style={s.action}><Text style={s.link}>{item.action.label}</Text><Icon name="chevronRight" size={14} color={colors.tealDark} /></Pressable>}
        </View>)}
        {busy && <View accessibilityLiveRegion="polite" style={s.thinking}><ActivityIndicator size="small" color={colors.teal} /><Text style={s.caption}>Consultando tu información…</Text></View>}
        {!!error && <View testID="ai-error" style={s.errorBox}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Pressable testID="ai-retry" accessibilityRole="button" onPress={retry} style={s.retry}><Text style={s.link}>Reintentar</Text></Pressable></View>}
      </ScrollView>
      <View style={s.composerArea}>
        <View style={s.composer}>
          <TextInput testID="ai-message-input" accessibilityLabel="Mensaje para Klini IA" placeholder="Escribe un mensaje…" placeholderTextColor="#7490A4" value={draft} onChangeText={setDraft} maxLength={1500} returnKeyType="send" onSubmitEditing={send} style={s.input} />
          <Pressable testID="ai-send" accessibilityRole="button" accessibilityLabel="Enviar mensaje" accessibilityState={{ disabled: busy || !draft.trim() }} disabled={busy || !draft.trim()} onPress={send} style={[s.send, (busy || !draft.trim()) && s.disabled]}><Icon name="arrow-up" size={21} color="white" /></Pressable>
        </View>
        <Text style={s.footer}>Explica tu información; no sustituye una consulta médica.</Text>
      </View>
    </View>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  card: { flex: 1, minHeight: 0, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E2EDF1', boxShadow: '0 2px 10px rgba(8,36,65,.06)' },
  pointer: { position: 'absolute', top: -6, left: '49%', width: 12, height: 12, backgroundColor: 'white', borderTopWidth: 1, borderLeftWidth: 1, borderColor: '#E2EDF1', transform: [{ rotate: '45deg' }] },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 2, minHeight: 47, gap: 5 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.navy },
  headerTarget: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  close: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#EFF7F9', alignItems: 'center', justifyContent: 'center' },
  mode: { color: colors.muted, fontSize: 9, paddingHorizontal: 13, lineHeight: 14, paddingBottom: 6 },
  scroll: { flex: 1, minHeight: 0 },
  messages: { padding: 12, paddingTop: 5, gap: 13, paddingBottom: 20 },
  bubble: { maxWidth: '90%', borderRadius: 12, padding: 11 },
  user: { alignSelf: 'flex-end', backgroundColor: '#E8F8FA', borderBottomRightRadius: 4 },
  assistant: { alignSelf: 'flex-start', backgroundColor: '#F7FAFD', borderWidth: 1, borderColor: '#E7EFF5', borderBottomLeftRadius: 4 },
  message: { fontSize: 12, lineHeight: 19, color: colors.navy },
  action: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 36, gap: 3, marginBottom: -5 },
  link: { color: colors.tealDark, fontSize: 11, fontWeight: '600' },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9 },
  caption: { fontSize: 11, color: colors.muted },
  errorBox: { padding: 11, borderRadius: 10, backgroundColor: '#FFF5F6' },
  error: { fontSize: 12, lineHeight: 18, color: colors.danger },
  retry: { minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' },
  composerArea: { padding: 10, paddingTop: 4 },
  composer: { backgroundColor: '#EFF7F8', borderRadius: 22, minHeight: 44, paddingLeft: 13, paddingRight: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  input: { flex: 1, minWidth: 0, minHeight: 44, fontSize: 12, color: colors.navy, paddingVertical: 8 },
  send: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.teal, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: .4 },
  footer: { fontSize: 8, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 12 },
});
