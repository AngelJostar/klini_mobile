import type { Doctor } from './types';

export type Destination = {
  section: string;
  doctorId?: string;
  recordType?: 'Estudio' | 'Receta';
};
export type MenuItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  keywords?: string;
  pending?: boolean;
  destination: Destination;
};

export const menuItems: MenuItem[] = [
  {
    id: 'wallet',
    title: 'Billetera y suscripción',
    subtitle: 'Pagos, saldo y tu plan',
    icon: 'wallet',
    destination: { section: 'wallet' },
  },
  {
    id: 'requests',
    title: 'Solicitudes',
    icon: 'person',
    pending: true,
    destination: { section: 'requests' },
  },
  {
    id: 'messages',
    title: 'Mensajes',
    icon: 'chat',
    pending: true,
    destination: { section: 'messages' },
  },
  {
    id: 'alerts',
    title: 'Alertas',
    icon: 'notifications',
    pending: true,
    destination: { section: 'alerts' },
  },
  {
    id: 'insurance',
    title: 'Mi seguro',
    icon: 'shield',
    keywords: 'poliza cobertura',
    destination: { section: 'insurance' },
  },
  {
    id: 'studies',
    title: 'Análisis clínicos',
    icon: 'activity',
    keywords: 'estudios laboratorio',
    destination: { section: 'archive', recordType: 'Estudio' },
  },
  {
    id: 'prescriptions',
    title: 'Recetas',
    icon: 'document',
    keywords: 'medicamentos',
    destination: { section: 'archive', recordType: 'Receta' },
  },
  {
    id: 'directory',
    title: 'Médicos y terapeutas',
    icon: 'doctor',
    keywords: 'directorio especialista',
    destination: { section: 'directory' },
  },
  {
    id: 'devices',
    title: 'Dispositivos médicos',
    icon: 'devices',
    pending: true,
    destination: { section: 'devices' },
  },
  {
    id: 'communities',
    title: 'Comunidad',
    icon: 'people',
    keywords: 'comunidades social',
    pending: true,
    destination: { section: 'communities' },
  },
  {
    id: 'agenda',
    title: 'Mi agenda',
    icon: 'calendar',
    keywords: 'citas reservar agendar',
    destination: { section: 'agenda' },
  },
  {
    id: 'profile',
    title: 'Mi perfil',
    icon: 'user',
    keywords: 'cuenta datos personales',
    destination: { section: 'profile' },
  },
  {
    id: 'teleconsult',
    title: 'Teleconsulta',
    icon: 'video',
    keywords: 'videollamada consulta virtual',
    destination: { section: 'teleconsult' },
  },
  {
    id: 'archive',
    title: 'Archivo',
    icon: 'folder',
    keywords: 'historial expediente',
    destination: { section: 'archive' },
  },
];

export const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim()
    .replace(/\s+/g, ' ');

export function searchHome(query: string, doctors: Doctor[]): MenuItem[] {
  const terms = normalizeSearch(query).split(' ').filter(Boolean);
  if (!terms.length)
    return menuItems.filter((item) =>
      ['directory', 'agenda', 'studies', 'prescriptions'].includes(item.id),
    );
  const matches = (value: string) => terms.every((term) => normalizeSearch(value).includes(term));
  const sections = menuItems.filter((item) => matches(`${item.title} ${item.keywords ?? ''}`));
  const people = doctors
    .filter((doctor) => matches(`${doctor.name} ${doctor.specialty} ${doctor.city}`))
    .map((doctor) => ({
      id: doctor.id,
      title: doctor.name,
      subtitle: doctor.specialty,
      icon: 'doctor',
      destination: { section: 'directory', doctorId: doctor.id },
    }));
  return [...sections, ...people];
}
