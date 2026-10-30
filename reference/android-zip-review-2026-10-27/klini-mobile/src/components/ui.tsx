import React, { PropsWithChildren, ReactNode } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import type { Doctor } from "../domain/types";

export const colors = {
  navy: "#082441",
  teal: "#00AAA5",
  tealDark: "#007D79",
  mint: "#DDF3EF",
  muted: "#6E8195",
  line: "#DFE8EE",
  background: "#F5F8FA",
  white: "#FFFFFF",
  danger: "#C84959",
};
const icons: Record<string, string> = {
  more: "ellipsis-vertical",
  grid: "grid-outline",
  hospital: "bed-outline",
  vaccine: "bandage-outline",
  diagnostics: "clipboard-outline",
  people: "people-outline",
  devices: "hardware-chip-outline",
  chevronUp: "chevron-up",
  calendar: "calendar-outline",
  doctor: "medical-outline",
  medical: "medical-outline",
  stethoscope: "medkit-outline",
  video: "videocam-outline",
  shield: "shield-checkmark-outline",
  search: "search-outline",
  filter: "options-outline",
  filters: "options-outline",
  close: "close",
  back: "chevron-back",
  chevron: "chevron-forward",
  chevronRight: "chevron-forward",
  arrow: "chevron-forward",
  check: "checkmark",
  checkmark: "checkmark",
  plus: "add",
  add: "add",
  user: "person-outline",
  person: "person-outline",
  clock: "time-outline",
  time: "time-outline",
  location: "location-outline",
  pin: "location-outline",
  star: "star",
  heart: "heart-outline",
  heartFilled: "heart",
  file: "document-text-outline",
  document: "document-text-outline",
  attachment: "attach-outline",
  attach: "attach-outline",
  download: "download-outline",
  upload: "cloud-upload-outline",
  edit: "create-outline",
  trash: "trash-outline",
  phone: "call-outline",
  mail: "mail-outline",
  camera: "camera-outline",
  mic: "mic-outline",
  micOff: "mic-off-outline",
  cameraOff: "videocam-off-outline",
  chat: "chatbubble-ellipses-outline",
  send: "send-outline",
  settings: "settings-outline",
  info: "information-circle-outline",
  alert: "alert-circle-outline",
  lock: "lock-closed-outline",
  wallet: "wallet-outline",
  card: "card-outline",
  creditCard: "card-outline",
  logout: "log-out-outline",
  refresh: "refresh-outline",
  pill: "bandage-outline",
  medicine: "bandage-outline",
  activity: "pulse-outline",
  book: "folder-outline",
  folder: "folder-outline",
  home: "home-outline",
  copy: "copy-outline",
  external: "open-outline",
  call: "call-outline",
  checkCircle: "checkmark-circle-outline",
  chevronDown: "chevron-down",
  chevronLeft: "chevron-back",
  insurance: "shield-checkmark-outline",
  notifications: "notifications-outline",
};
export function Icon({
  name,
  size = 21,
  color = colors.navy,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const n =
    icons[name] || (name in Ionicons.glyphMap ? name : "ellipse-outline");
  return (
    <Ionicons
      name={n as keyof typeof Ionicons.glyphMap}
      size={size}
      color={color}
    />
  );
}
export function notify(title: string, message: string) {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else
    Alert.alert(title, message, [
      { text: "Volver", style: "cancel" },
      { text: "Confirmar", style: "destructive", onPress: onConfirm },
    ]);
}
export function Button({
  title,
  onPress,
  disabled,
  secondary,
  danger,
  icon,
  testID,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
  icon?: string;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        danger && { backgroundColor: colors.danger },
        disabled && { opacity: 0.38 },
        pressed && !disabled && { opacity: 0.75, transform: [{ scale: 0.99 }] },
      ]}
    >
      {icon && (
        <Icon
          name={icon}
          size={19}
          color={secondary ? colors.tealDark : colors.white}
        />
      )}
      <Text
        style={[styles.buttonText, secondary && { color: colors.tealDark }]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function TextField({
  label,
  multiline,
  ...props
}: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 6, marginBottom: 12 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        accessibilityLabel={label || props.placeholder}
        placeholderTextColor="#8295A6"
        autoCapitalize={
          props.keyboardType === "email-address" ? "none" : "sentences"
        }
        {...props}
        multiline={multiline}
        style={[
          styles.input,
          multiline && { minHeight: 88, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
}
export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          selected && { color: colors.tealDark, fontWeight: "700" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function SectionTitle({ children }: PropsWithChildren) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}
export function Row({
  title,
  subtitle,
  icon,
  onPress,
  right,
  danger,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
}) {
  const content = (
    <>
      {icon && (
        <View style={styles.rowIcon}>
          <Icon name={icon} color={danger ? colors.danger : colors.tealDark} />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.rowTitle, danger && { color: colors.danger }]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.small}>{subtitle}</Text>}
      </View>
      {right ||
        (onPress && <Icon name="chevron" size={17} color={colors.muted} />)}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}
export function Avatar({
  doctor,
  size = 54,
}: {
  doctor: Doctor;
  size?: number;
}) {
  return (
    <LinearGradient
      colors={[doctor.avatarColor || colors.tealDark, colors.navy]}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: colors.white,
          fontSize: size * 0.32,
          fontWeight: "600",
        }}
      >
        {doctor.initials}
      </Text>
    </LinearGradient>
  );
}
export function Empty({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ padding: 28, gap: 14, alignItems: "center" }}>
      <View
        style={[styles.rowIcon, { width: 56, height: 56, borderRadius: 28 }]}
      >
        <Icon name="search" size={26} />
      </View>
      <Text style={[styles.rowTitle, { textAlign: "center" }]}>{title}</Text>
      {description && (
        <Text style={[styles.body, { textAlign: "center" }]}>
          {description}
        </Text>
      )}
      {action && onAction && (
        <Button title={action} onPress={onAction} secondary />
      )}
    </View>
  );
}
export function Sheet({
  title,
  onClose,
  onBack,
  children,
  footer,
  step,
}: PropsWithChildren<{
  title: string;
  onClose: () => void;
  onBack?: () => void;
  footer?: ReactNode;
  step?: number;
}>) {
  return (
    <View style={styles.sheetOuter}>
      <BlurView intensity={80} tint="light" style={styles.sheet}>
        <View style={styles.sheetSurface}>
          <View style={styles.sheetHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={onBack ? "Volver" : "Cerrar ventana"}
              onPress={onBack || onClose}
              style={styles.circle}
            >
              <Icon name="back" size={20} />
            </Pressable>
            <Text numberOfLines={2} style={styles.sheetTitle}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={onClose}
              style={styles.circle}
            >
              <Icon name="close" size={20} />
            </Pressable>
          </View>
          {step !== undefined && (
            <View style={styles.progress}>
              {["Buscar", "Elegir", "Reservar"].map((s, i) => (
                <View key={s} style={{ alignItems: "center", flex: 1, gap: 5 }}>
                  <View
                    style={[
                      styles.progressDot,
                      i <= Math.floor(step / 3) && {
                        backgroundColor: colors.teal,
                        borderColor: colors.teal,
                      },
                    ]}
                  >
                    {i < Math.floor(step / 3) && (
                      <Icon name="check" color="white" size={10} />
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 10,
                      color:
                        i === Math.floor(step / 3)
                          ? colors.tealDark
                          : colors.muted,
                    }}
                  >
                    {s}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
            <Text style={styles.demo}>
              Datos de ejemplo · Guardado en este dispositivo
            </Text>
          </ScrollView>
          {footer && <View style={styles.sheetFooter}>{footer}</View>}
        </View>
      </BlurView>
    </View>
  );
}
export const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 21, color: colors.muted },
  small: { fontSize: 12, lineHeight: 18, color: colors.muted },
  label: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: colors.navy,
  },
  subtitle: { fontSize: 16, fontWeight: "600", color: colors.navy },
  rowTitle: { fontSize: 14, fontWeight: "600", color: colors.navy },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.muted,
    marginTop: 18,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  button: {
    minHeight: 48,
    borderRadius: 25,
    backgroundColor: colors.tealDark,
    paddingHorizontal: 19,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginVertical: 5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
    textAlign: "center",
  },
  secondary: {
    backgroundColor: "#E2F4F2",
    borderWidth: 1,
    borderColor: "#C8EBE7",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.75)",
    minHeight: 47,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.line,
    fontSize: 14,
    color: colors.navy,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.73)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
    padding: 15,
    marginBottom: 11,
  },
  chip: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#F8FBFD",
    marginRight: 7,
    marginBottom: 7,
  },
  chipSelected: { backgroundColor: "#BEEFEF", borderColor: "#AFE9E6" },
  chipText: { fontSize: 12, color: colors.muted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    minHeight: 52,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#E6F7F5",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetOuter: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 17,
    paddingVertical: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 540,
    maxHeight: "100%",
    borderRadius: 31,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.85)",
    backgroundColor: "#EEF7F9",
    boxShadow: "0 20px 65px rgba(8,36,65,0.15)",
  },
  sheetSurface: { backgroundColor: "rgba(247,252,255,0.83)", flexShrink: 1 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 17,
    paddingTop: 17,
    paddingBottom: 12,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,.82)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.navy,
    flex: 1,
    textAlign: "center",
  },
  sheetContent: { paddingHorizontal: 17, paddingBottom: 16 },
  sheetFooter: {
    paddingHorizontal: 17,
    paddingTop: 8,
    paddingBottom: 15,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  progress: {
    flexDirection: "row",
    marginHorizontal: 33,
    marginBottom: 18,
    marginTop: 4,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#A8BDD0",
    alignItems: "center",
    justifyContent: "center",
  },
  demo: { fontSize: 9, color: "#8A9CAA", marginTop: 16 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  gap: { gap: 12 },
  center: { alignItems: "center", justifyContent: "center" },
  error: { color: colors.danger, fontSize: 12, marginBottom: 10 },
  link: { color: colors.tealDark, fontSize: 13, fontWeight: "500" },
  badge: {
    fontSize: 11,
    color: colors.tealDark,
    fontWeight: "600",
    backgroundColor: colors.mint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: "hidden",
  },
});
