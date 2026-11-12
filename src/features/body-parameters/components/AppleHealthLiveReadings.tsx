import React, { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';

import { HEALTH_CATEGORIES, type HealthCategory, type HealthReading } from '../domain/appleHealth';
import { observeAppleHealth, queryAppleHealth } from '../services/appleHealth';
import { watchHealthDay } from '../services/appleHealthDayWatcher';
import { createHealthSession } from '../services/appleHealthSession';

import BodyParameterListRow from './BodyParameterListRow';

export default function AppleHealthLiveReadings({ selected, onOpenHistory }: { selected: readonly HealthCategory[]; onOpenHistory?: (id: HealthCategory) => void }) {
  const [readings, setReadings] = useState<HealthReading[]>([]);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const selectionKey = selected.join(',');
  useEffect(() => {
    const categories = selectionKey.split(',').filter(Boolean) as HealthCategory[];
    let stop: (() => void) | undefined;
    function resume() {
      stop?.(); setReadings([]); setFailed(false); setLoading(true);
      const stopSession = createHealthSession({
        read: () => queryAppleHealth(categories),
        observe: changed => observeAppleHealth(categories, changed),
        publish: (values, error) => { setReadings(values); setFailed(!!error); setLoading(false); },
      });
      const stopDay = categories.includes('HKQuantityTypeIdentifierStepCount') ? watchHealthDay(resume) : () => {};
      stop = () => { stopSession(); stopDay(); };
    }
    if (AppState.currentState === 'active') resume();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') resume();
      else { stop?.(); stop = undefined; setReadings([]); setLoading(true); }
    });
    return () => { stop?.(); listener.remove(); };
  }, [selectionKey]);
  return <AppleHealthReadingsList selected={selected} readings={readings} loading={loading} failed={failed} onOpenHistory={onOpenHistory} />;
}

export function AppleHealthReadingsList({ selected, readings, loading, failed, onOpenHistory }: {
  selected: readonly HealthCategory[]; readings: readonly HealthReading[]; loading: boolean; failed: boolean; onOpenHistory?: (id: HealthCategory) => void;
}) {
  return <View testID="apple-health-pinned-readings">
    {HEALTH_CATEGORIES.filter(item => selected.includes(item.id)).map(category => <HealthReadingRow key={category.id} category={category} reading={readings.find(item => item.id === category.id)} loading={loading} failed={failed} onOpenHistory={onOpenHistory} />)}
  </View>;
}

function HealthReadingRow({ category, reading, loading, failed, onOpenHistory }: {
  category: typeof HEALTH_CATEGORIES[number]; reading?: HealthReading; loading: boolean; failed: boolean; onOpenHistory?: (id: HealthCategory) => void;
}) {
  const id = `apple-health-row-${category.id}`;
  const hasValue = !loading && !failed && !reading?.error && reading?.value !== undefined;
  const value = loading ? 'Consultando…' : failed || reading?.error ? 'No disponible' : !hasValue ? 'Sin lectura' : reading!.value!.toLocaleString('es-MX', { maximumFractionDigits: category.id === 'HKQuantityTypeIdentifierStepCount' ? 0 : 1 });
  const source = hasValue ? (reading?.source || 'Apple Salud') : 'Apple Salud';
  const date = hasValue && reading?.end ? new Date(reading.end).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : undefined;
  const dailySteps = category.id === 'HKQuantityTypeIdentifierStepCount';
  const interval = category.id === 'HKQuantityTypeIdentifierActiveEnergyBurned' || category.id === 'HKCategoryTypeIdentifierSleepAnalysis';
  const label = category.label.replace(' (último intervalo)', '');
  return <View>
    <BodyParameterListRow testID={id} label={label} icon={category.icon} source={source} sourceIcon={/watch/i.test(source) ? 'watch-outline' : 'heart-outline'}
      value={value} unit={hasValue ? category.displayUnit : undefined} metadata={[dailySteps ? `Hoy · total diario${reading?.updated ? ' · ' + new Date(reading.updated).toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'}) : ''}` : interval ? 'Último intervalo' : undefined, dailySteps ? undefined : date, hasValue ? reading?.stage : undefined].filter(Boolean).join(' · ')}
      onPress={() => onOpenHistory?.(category.id)} accessibilityLabel={`${label}, ${value}${hasValue ? ` ${category.displayUnit}` : ''}, ${source}${date ? `, ${date}` : ''}. Mostrar detalles de Apple Salud`} />
  </View>;
}
