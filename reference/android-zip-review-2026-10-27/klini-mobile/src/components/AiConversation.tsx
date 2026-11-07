import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { isSafeAiSourceUrl, type AiAction, type AiMessage, type AiSource } from '../domain/kliniAi';
import type { AiAttachment } from '../domain/kliniAiAttachments';
import { askKliniAi } from '../services/kliniAiRuntime';
import { useAppStore } from '../state/store';
import AiSparkles from './AiSparkles';
import { colors, Icon } from './ui';

let nextMessageId = 0;
type ChatMessage = AiMessage & { attachmentNames?: string[] };
export const AI_ATTACHMENT_QUESTION = 'Ayúdame a entender los archivos adjuntos.';
function message(role: AiMessage['role'], text: string, action?: AiAction, sources?: AiSource[], attachmentNames?: string[]): ChatMessage {
  return { id: `ai-${Date.now()}-${++nextMessageId}`, role, text, ...(action ? { action } : {}), ...(sources?.length ? { sources } : {}), ...(attachmentNames?.length ? { attachmentNames } : {}) };
}

/** Keep source navigation separate from clinical actions and require an explicit tap. */
function AssistantMessage({ text, sources = [] }: { text: string; sources?: AiSource[] }) {
  const [linkError, setLinkError] = useState('');
  const seenIds = new Set<string>();
  const safeSources = sources.filter(source => {
    if (!isSafeAiSourceUrl(source.url) || seenIds.has(source.id)) return false;
    seenIds.add(source.id);
    return true;
  }).slice(0, 10);
  const byId = new Map(safeSources.map(source => [source.id, source]));
  const openSource = (source: AiSource) => {
    if (!isSafeAiSourceUrl(source.url)) return;
    setLinkError('');
    const launch = async () => {
      // Expo Linking navigates the current browser tab; preserve the conversation on web.
      if (Platform.OS === 'web') window.open(source.url, '_blank', 'noopener,noreferrer');
      else await Linking.openURL(source.url);
    };
    void launch().catch(() => setLinkError('No pudimos abrir esta fuente. Inténtalo de nuevo.'));
  };
  const withCitations = (part: string, partKey: string) => part.split(/(\[[^\]\n]{1,80}\])/g).map((fragment, index) => {
    const source = byId.get(fragment.slice(1, -1));
    return source && fragment.startsWith('[') && fragment.endsWith(']')
      ? <Text key={`${partKey}-${index}`} testID={`ai-inline-source-${source.id}`} accessibilityRole="link" accessibilityLabel={`Fuente ${source.id}: ${source.title}`} onPress={() => openSource(source)} style={s.inlineSource}>{fragment}</Text>
      : fragment;
  });
  return <>
    <Text selectable style={s.message}>{text.split(/(\*\*[^*\n]+\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**')
      ? <Text key={index} style={s.strong}>{withCitations(part.slice(2, -2), String(index))}</Text>
      : <React.Fragment key={index}>{withCitations(part, String(index))}</React.Fragment>)}</Text>
    {safeSources.length > 0 && <View testID="ai-message-sources" style={s.sources}>
      <Text accessibilityRole="header" style={s.sourcesTitle}>Fuentes</Text>
      {safeSources.map(source => <Pressable key={source.id} testID={`ai-source-link-${source.id}`} accessibilityRole="link" accessibilityLabel={`Abrir fuente ${source.id}: ${source.title}`} onPress={() => openSource(source)} style={s.sourceTarget}>
        <Text style={s.sourceNumber}>[{source.id}]</Text>
        <View style={s.sourceDetails}>
          <Text style={s.sourceTitle}>{source.title}</Text>
          <Text style={s.sourceDomain}>{new URL(source.url).hostname.replace(/^www\./, '')}</Text>
        </View>
        <Icon name="chevronRight" size={13} color={colors.tealDark} />
      </Pressable>)}
    </View>}
    {!!linkError && <Text testID="ai-source-error" accessibilityRole="alert" style={s.sourceError}>{linkError}</Text>}
  </>;
}

export type AiConversationHandle = { send: (question: string, attachments?: AiAttachment[]) => boolean };

const AiConversation = forwardRef<AiConversationHandle, {
  initialQuestion: string;
  attachments?: AiAttachment[];
  onClose: () => void;
  onAction: (action: AiAction) => void;
  onManage: () => void;
  onBusyChange?: (busy: boolean) => void;
}>(function AiConversation({ initialQuestion, attachments = [], onClose, onAction, onManage, onBusyChange }, ref) {
  const { state } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [message('user', initialQuestion, undefined, undefined, attachments.map(attachment => attachment.name))]);
  const [request, setRequest] = useState(() => ({ question: initialQuestion, history: [] as AiMessage[], state, attachments: [...attachments] }));
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [source, setSource] = useState<'demo' | 'openai' | null>(null);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const locked = useRef(true);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  useEffect(() => {
    const controller = new AbortController();
    void askKliniAi({ ...request, signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      setMessages(current => [...current, message('assistant', result.text, result.action, result.sources)]);
      setSource(result.source);
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No pudimos responder. Inténtalo de nuevo.');
    }).finally(() => {
      if (!controller.signal.aborted) { locked.current = false; setBusy(false); }
    });
    return () => controller.abort();
  }, [request]);
  const send = (text: string, nextAttachments: AiAttachment[] = []) => {
    const question = text.trim() || (nextAttachments.length ? AI_ATTACHMENT_QUESTION : '');
    if (!question || locked.current) return false;
    locked.current = true;
    const history = messages.slice(-12);
    setMessages(current => [...current, message('user', question, undefined, undefined, nextAttachments.map(attachment => attachment.name))]);
    setError(''); setBusy(true);
    setRequest({ question, history, state, attachments: [...nextAttachments] });
    return true;
  };
  // The home toolbar owns the sole composer, including follow-up questions.
  useImperativeHandle(ref, () => ({ send }));
  const retry = () => {
    if (locked.current) return;
    locked.current = true;
    setError(''); setBusy(true);
    setRequest({ ...request, state });
  };
  return <View testID="klini-ai-conversation" style={s.root}>
      <View style={s.handleSpace} />
      <Pressable testID="ai-collapse" accessibilityRole="button" accessibilityLabel="Bajar conversación" onPress={onClose} style={s.handleTarget}><View style={s.handle} /></Pressable>
      <View style={s.header}>
        <AiSparkles /><Text accessibilityRole="header" style={s.title}>Klini IA</Text>
        <Pressable testID="ai-manage" accessibilityRole="button" accessibilityLabel="Gestionar Klini IA" onPress={onManage} style={s.headerTarget}><Icon name="settings" size={18} color={colors.muted} /></Pressable>
        <Pressable testID="ai-close" accessibilityRole="button" accessibilityLabel="Cerrar conversación" onPress={onClose} style={s.headerTarget}><View style={s.close}><Icon name="close" size={18} color={colors.muted} /></View></Pressable>
      </View>
      <Text testID="ai-mode" style={s.mode}>{source === 'openai' ? 'IA conectada · conocimiento general y contexto de tu perfil' : source === 'demo' ? 'Demostración · información de tu perfil' : 'Klini IA · preparando respuesta'}</Text>
      <ScrollView ref={scroll} testID="ai-messages" style={s.scroll} contentContainerStyle={s.messages} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        {messages.map(item => <View key={item.id} testID={`ai-message-${item.role}`} style={[s.bubble, item.role === 'user' ? s.user : s.assistant]}>
          {item.role === 'assistant' ? <AssistantMessage text={item.text} sources={item.sources} /> : <Text selectable style={s.message}>{item.text}</Text>}
          {item.attachmentNames?.map((name, index) => <View key={`${name}-${index}`} testID="ai-message-attachment" style={s.messageAttachment}><Icon name="document" size={14} color={colors.tealDark} /><Text style={s.messageAttachmentName}>{name}</Text></View>)}
          {item.action && <Pressable testID="ai-message-action" accessibilityRole="button" onPress={() => onAction(item.action!)} style={s.action}><Text style={s.link}>{item.action.label}</Text><Icon name="chevronRight" size={14} color={colors.tealDark} /></Pressable>}
        </View>)}
        {busy && <View accessibilityLiveRegion="polite" style={s.thinking}><ActivityIndicator size="small" color={colors.teal} /><Text style={s.caption}>Preparando respuesta…</Text></View>}
        {!!error && <View testID="ai-error" style={s.errorBox}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Pressable testID="ai-retry" accessibilityRole="button" onPress={retry} style={s.retry}><Text style={s.link}>Reintentar</Text></Pressable></View>}
      </ScrollView>
      <Text style={s.footer}>Puede cometer errores. Para decisiones de salud, consulta a tu médico.</Text>
  </View>;
});

export default AiConversation;

const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  handleSpace: { height: 14 },
  handleTarget: { position: 'absolute', top: 0, alignSelf: 'center', width: 84, height: 44, alignItems: 'center', zIndex: 1 },
  handle: { width: 42, height: 4, backgroundColor: '#A5B3C5', borderRadius: 4, alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 22, paddingRight: 12, minHeight: 53, gap: 6 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.navy },
  headerTarget: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EDF2F6', alignItems: 'center', justifyContent: 'center' },
  mode: { color: colors.muted, fontSize: 9, paddingHorizontal: 24, lineHeight: 14, paddingBottom: 6 },
  scroll: { flex: 1, minHeight: 0 },
  messages: { paddingHorizontal: 24, paddingTop: 5, gap: 13, paddingBottom: 20 },
  bubble: { maxWidth: '90%', borderRadius: 12, padding: 11 },
  user: { alignSelf: 'flex-end', backgroundColor: '#E8F8FA', borderBottomRightRadius: 4 },
  assistant: { alignSelf: 'flex-start', backgroundColor: '#F7FAFD', borderWidth: 1, borderColor: '#E7EFF5', borderBottomLeftRadius: 4 },
  message: { fontSize: 12, lineHeight: 19, color: colors.navy },
  messageAttachment: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 7, paddingTop: 7, borderTopWidth: 1, borderTopColor: '#D8ECEE' },
  messageAttachmentName: { flex: 1, minWidth: 0, fontSize: 10, lineHeight: 15, color: colors.navy },
  strong: { fontWeight: '700' },
  inlineSource: { color: colors.tealDark, textDecorationLine: 'underline', fontWeight: '700' },
  sources: { borderTopWidth: 1, borderTopColor: '#DFEAF0', marginTop: 10, paddingTop: 8, alignSelf: 'stretch' },
  sourcesTitle: { color: colors.navy, fontSize: 11, fontWeight: '700', marginBottom: 3 },
  sourceTarget: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingVertical: 5 },
  sourceNumber: { color: colors.tealDark, fontSize: 10, fontWeight: '600', alignSelf: 'flex-start', paddingTop: 2 },
  sourceDetails: { flex: 1, minWidth: 0 },
  sourceTitle: { color: colors.tealDark, fontSize: 11, lineHeight: 16, textDecorationLine: 'underline', flexShrink: 1 },
  sourceDomain: { color: colors.muted, fontSize: 9, lineHeight: 14, flexShrink: 1 },
  sourceError: { color: colors.danger, fontSize: 10, lineHeight: 15, marginTop: 6 },
  action: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 36, gap: 3, marginBottom: -5 },
  link: { color: colors.tealDark, fontSize: 11, fontWeight: '600' },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9 },
  caption: { fontSize: 11, color: colors.muted },
  errorBox: { padding: 11, borderRadius: 10, backgroundColor: '#FFF5F6' },
  error: { fontSize: 12, lineHeight: 18, color: colors.danger },
  retry: { minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' },
  footer: { fontSize: 8, color: colors.muted, textAlign: 'center', paddingHorizontal: 24, paddingBottom: 6, lineHeight: 12 },
});
