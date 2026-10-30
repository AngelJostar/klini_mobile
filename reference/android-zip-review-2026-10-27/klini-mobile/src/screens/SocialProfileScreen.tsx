import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ProfileDrawer from '../components/ProfileDrawer';
import ProfileInfoPopup from '../components/ProfileInfoPopup';
import ProfileEditPopup, { type EditableProfile } from '../components/ProfileEditPopup';
import { Button, Chip, Icon, TextField, colors } from '../components/ui';
import { useManagedProfiles, profileKinds, type ManagedProfile } from '../state/managedProfiles';
import { useAppStore } from '../state/store';

type Page = 'home' | 'edit' | 'logout' | 'managed';

export default function SocialProfileScreen({ onClose }: { onClose: () => void }) {
  return (
    <ProfileDrawer onClose={onClose}>{(close) => <ProfileContent onClose={close} />}</ProfileDrawer>
  );
}
function ProfileContent({ onClose }: { onClose: () => void }) {
  const { state, ownerProfile, selectProfile, editFamilyProfile } = useAppStore();
  const managed = useManagedProfiles(ownerProfile.id);
  const [managedDraft, setManagedDraft] = useState<ManagedProfile>({
    id: '',
    name: '',
    kind: 'Niño',
  });
  const [page, setPage] = useState<Page>('home');
  const [editing, setEditing] = useState<EditableProfile | null>(null);
  const [infoId, setInfoId] = useState<string | null>(null);
  const [name, setName] = useState(ownerProfile.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const back = () => {
    setError('');
    setPage('home');
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (page === 'home') onClose();
      else {
        setPage('home');
        setError('');
      }
      return true;
    });
    return () => sub.remove();
  }, [page, onClose]);
  async function changeName() {
    if (!name.trim()) {
      setError('Escribe tu nombre.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await editFamilyProfile(ownerProfile.id, { name: name.trim() });
      setPage('home');
    } catch {
      setError('No se pudo guardar el nombre. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }
  async function saveManaged() {
    setBusy(true);
    setError('');
    try {
      await managed.save({
        ...managedDraft,
        id:
          managedDraft.id ||
          'profile-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      });
      setPage('home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el perfil.');
    } finally {
      setBusy(false);
    }
  }
  async function chooseProfile(profile?: ManagedProfile) {
    setBusy(true); setError('');
    try { await selectProfile(profile); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cambiar de perfil.'); }
    finally { setBusy(false); }
  }
  async function saveProfile(profile: EditableProfile) {
    const { id, kind, ...patch } = profile;
    if (id !== ownerProfile.id) {
      await managed.save({ ...profile, kind: kind as ManagedProfile['kind'] });
    }
    await editFamilyProfile(id, { ...patch, kind });
  }
  const initials = ownerProfile.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();
  return (
    <View style={s.screen} testID="social-profile">
      <View style={s.header}>
        {page !== 'home' && (
          <Pressable
            testID="profile-back"
            accessibilityLabel="Volver a tu cuenta"
            accessibilityRole="button"
            onPress={back}
            style={s.close}
          >
            <Icon name="back" />
          </Pressable>
        )}
        <Text style={s.heading}>Tu cuenta</Text>
        <Pressable
          testID="profile-close"
          accessibilityLabel="Cerrar perfil"
          accessibilityRole="button"
          onPress={onClose}
          style={s.close}
        >
          <Icon name="close" />
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        {page === 'home' && (
          <>
            <View style={[s.account, state.profile.id === ownerProfile.id && s.principal]}>
              <Pressable style={s.avatar} testID="profile-info-avatar" accessibilityRole="button" accessibilityLabel={'Ver información de ' + ownerProfile.name} onPress={(event) => { event.stopPropagation(); setInfoId(ownerProfile.id); }}>
                <Text style={s.initials}>{initials}</Text>
              </Pressable>
              <Pressable style={s.profileSelect} testID="profile-select-owner" accessibilityRole="button" accessibilityLabel={'Seleccionar perfil de ' + ownerProfile.name} accessibilityState={{ selected: state.profile.id === ownerProfile.id, disabled: busy }} disabled={busy} onPress={() => void chooseProfile()}>
                <Text style={s.name}>{ownerProfile.name}</Text>
                <Text style={s.muted}>Perfil principal</Text>
              </Pressable>
              <Pressable
              testID="profile-edit"
              accessibilityRole="button"
              accessibilityLabel={'Editar perfil de ' + ownerProfile.name}
              accessibilityState={{ selected: state.profile.id === ownerProfile.id }}
              onPress={() => {
                setEditing({ ...ownerProfile, kind: 'Perfil principal' });
                setError('');
              }}
              style={s.profileActions}
            >

                <Icon name="edit" size={18} color={colors.tealDark} />
                <View style={s.selectedMark}>
                  {state.profile.id === ownerProfile.id && <Icon name="check" size={16} color={colors.tealDark} />}
                </View>
              </Pressable>
            </View>
            {managed.profiles.map((profile) => (
              <View key={profile.id} style={[s.account, state.profile.id === profile.id && s.principal]}>
                <Pressable style={s.avatar} testID={'profile-info-avatar-' + profile.id} accessibilityRole="button" accessibilityLabel={'Ver información de ' + profile.name} onPress={(event) => { event.stopPropagation(); setInfoId(profile.id); }}>
                  <Text style={s.initials}>
                    {profile.name
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((word) => word[0])
                      .join('')
                      .toUpperCase()}
                  </Text>
                </Pressable>
                <Pressable style={s.profileSelect} testID={'profile-select-' + profile.id} accessibilityRole="button" accessibilityLabel={'Seleccionar perfil de ' + profile.name} accessibilityState={{ selected: state.profile.id === profile.id, disabled: busy }} disabled={busy} onPress={() => void chooseProfile(profile)}>
                  <Text style={s.name}>{profile.name}</Text>
                  <Text style={s.muted}>{profile.kind}</Text>
                </Pressable>
              <Pressable
                testID={'managed-profile-' + profile.id}
                accessibilityRole="button"
                accessibilityLabel={'Editar perfil de ' + profile.name}
                accessibilityState={{ selected: state.profile.id === profile.id }}
                onPress={() => {
                  setEditing({ ...profile });
                  setError('');
                }}
                style={s.profileActions}
              >

                  <Icon name="edit" size={18} color={colors.tealDark} />
                  <View style={s.selectedMark}>{state.profile.id === profile.id && <Icon name="check" size={16} color={colors.tealDark} />}</View>
                </Pressable>
              </View>
            ))}
            {!!managed.error && (
              <Text accessibilityRole="alert" style={s.error}>
                {managed.error}
              </Text>
            )}
            <Pressable
              testID="profile-add"
              accessibilityRole="button"
              accessibilityState={{ disabled: !managed.ready }}
              style={s.simpleAction}
              disabled={!managed.ready}
              onPress={() => {
                setManagedDraft({ id: '', name: '', kind: 'Niño' });
                setError('');
                setPage('managed');
              }}
            >
              <Icon name="plus" size={19} color={colors.tealDark} />
              <Text style={s.actionLabel}>Agregar perfil</Text>
            </Pressable>
            <Pressable
              testID="profile-logout"
              accessibilityRole="button"
              style={s.simpleAction}
              onPress={() => {
                setPage('logout');
                setError('');
              }}
            >
              <Icon name="logout" size={19} color={colors.danger} />
              <Text style={[s.actionLabel, { color: colors.danger }]}>Cerrar sesión</Text>
            </Pressable>
          </>
        )}
        {page === 'managed' && (
          <View style={s.form}>
            <Text style={s.section}>{managedDraft.id ? 'Editar perfil' : 'Agregar perfil'}</Text>
            <TextField
              testID="managed-profile-name"
              label="Nombre"
              value={managedDraft.name}
              maxLength={255}
              onChangeText={(name) => setManagedDraft((d) => ({ ...d, name }))}
            />
            <Text style={s.name}>Tipo de perfil</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {profileKinds.map((kind) => (
                <Chip
                  key={kind}
                  label={kind}
                  selected={managedDraft.kind === kind}
                  onPress={() => setManagedDraft((d) => ({ ...d, kind }))}
                />
              ))}
            </View>
            <Button
              testID="managed-profile-save"
              title="Guardar perfil"
              disabled={busy}
              onPress={() => void saveManaged()}
            />
            <Button title="Cancelar" secondary onPress={back} />
          </View>
        )}
        {page === 'edit' && (
          <View style={s.form}>
            <Text style={s.section}>Cambiar perfil</Text>
            <TextField
              testID="profile-name"
              label="Nombre"
              value={name}
              onChangeText={setName}
              maxLength={255}
            />
            <Text style={s.muted}>Actualiza el nombre visible de tu propia cuenta.</Text>
            <Button
              testID="profile-save"
              title="Guardar cambios"
              onPress={() => void changeName()}
              disabled={busy}
            />
            <Button title="Cancelar" secondary onPress={back} />
          </View>
        )}
        {page === 'logout' && (
          <View style={s.form}>
            <Text style={s.section}>¿Quieres cerrar tu sesión?</Text>
            <Text style={s.muted}>
              La información guardada en este dispositivo permanecerá almacenada.
            </Text>
            <Button
              testID="profile-confirm-logout"
              title="Cerrar sesión"
              onPress={() =>
                setError(
                  'Esta app está en modo de demostración y no tiene una sesión de Laravel conectada. No hay una sesión autenticada que cerrar.',
                )
              }
            />
            <Button testID="profile-cancel-logout" title="Cancelar" secondary onPress={back} />
          </View>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
      </ScrollView>
      {editing && <ProfileEditPopup profile={editing} onClose={() => setEditing(null)} onSave={saveProfile} />}
      {infoId && <ProfileInfoPopup
        profile={infoId === ownerProfile.id ? { ...ownerProfile, kind: 'Perfil principal' } : managed.profiles.find(profile => profile.id === infoId)!}
        onClose={() => setInfoId(null)}
      />}
    </View>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  heading: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.navy },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 14, paddingTop: 2, paddingBottom: 12 },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 9,
    minHeight: 58,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E7EFF2',
  },
  principal: { backgroundColor: '#EAF7F7', borderRadius: 9, borderBottomWidth: 0 },
  profileActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectedMark: { width: 16, height: 18, alignItems: 'center', justifyContent: 'center' },
  simpleAction: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 8 },
  actionLabel: { fontSize: 12, color: colors.tealDark },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2F7F4',
  },
  initials: { color: colors.tealDark, fontSize: 12, fontWeight: '600' },
  flex: { flex: 1 },
  profileSelect: { flex: 1, minHeight: 40, justifyContent: 'center' },
  name: { fontSize: 12, fontWeight: '600', color: colors.navy },
  muted: { fontSize: 11, lineHeight: 16, color: colors.muted, marginTop: 2 },
  small: { fontSize: 10, color: colors.muted, marginTop: 5, lineHeight: 16 },
  requests: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  section: { fontSize: 17, fontWeight: '700', color: colors.navy },
  tabs: { flexDirection: 'row', justifyContent: 'space-between' },
  tab: { flex: 1, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  activeTab: { backgroundColor: '#EAF8F6' },
  empty: { alignItems: 'center', gap: 16, paddingVertical: 28 },
  center: { textAlign: 'center' },
  demo: { fontSize: 10, lineHeight: 16, color: colors.muted, marginTop: 18 },
  demoButton: { minHeight: 44, justifyContent: 'center' },
  link: { fontSize: 12, color: colors.tealDark, textDecorationLine: 'underline' },
  form: { gap: 18 },
  error: { color: colors.danger, lineHeight: 20, fontSize: 13 },
  requestList: { gap: 16 },
  request: { gap: 5 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  event: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  eventText: { fontSize: 12, color: colors.navy, lineHeight: 19 },
  group: { fontSize: 12, color: colors.muted, fontWeight: '700', marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.teal },
});
