import { DoctorListCard, DoctorPage, goDoctor } from '@/features/doctor/doctor-ui';

export default function MixturesScreen() { return <DoctorPage title="Solicitudes clínicas" subtitle="Selecciona un paciente desde su expediente para iniciar la solicitud."><DoctorListCard title="Nutrición parenteral" detail="Solicitud NPT con catálogo y prevalidación CBTA" onPress={() => goDoctor('/doctor/patients')} /><DoctorListCard title="Mezcla oncológica" detail="Medicamentos, dosis, diluyente, vía y fecha de entrega" onPress={() => goDoctor('/doctor/patients')} /></DoctorPage>; }
