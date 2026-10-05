import { useState } from 'react';
import { Alert } from 'react-native';

import { PatientListCard, PatientPage, QueryState, formatDateTime } from '@/features/patient/patient-ui';
import { openPatientDocument } from '@/services/patient/document-service';
import { usePatientDocuments } from '@/services/patient/patient-queries';

export default function DocumentsScreen() {
  const query = usePatientDocuments();
  const [opening, setOpening] = useState<number | null>(null);
  const items = query.data?.items ?? [];
  async function open(id: number, name: string, mimeType: string | null) {
    setOpening(id);
    try { await openPatientDocument(id, name, mimeType); }
    catch (error) { Alert.alert('No pudimos abrir el documento', error instanceof Error ? error.message : 'Intenta nuevamente.'); }
    finally { setOpening(null); }
  }
  return <PatientPage title="Estudios y documentos" subtitle="Resultados y archivos incorporados a tu expediente." refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <QueryState pending={query.isPending} error={query.isError} empty={!query.isPending && items.length === 0} retry={() => void query.refetch()}>
      {items.map((item) => <PatientListCard key={item.id} title={item.name} caption={`${item.type} · ${item.status}`} detail={opening === item.id ? 'Descargando de forma segura…' : `Disponible desde ${formatDateTime(item.loaded_at)}`} onPress={() => void open(item.id, item.name, item.mime_type)} />)}
    </QueryState>
  </PatientPage>;
}
