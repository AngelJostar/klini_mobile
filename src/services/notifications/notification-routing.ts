const patientRoutes = ['/patient/appointments', '/patient/prescriptions', '/patient/documents', '/patient/notifications'];
const doctorRoutes = ['/doctor/appointments', '/doctor/requests', '/doctor/mixtures'];

export function isNotificationPathAllowed(role: 'patient' | 'doctor', path: string) {
  const allowed = role === 'patient' ? patientRoutes : doctorRoutes;
  return allowed.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
