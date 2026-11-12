/** Display catalog only. Membership does not establish a doctor's accepted coverage. */
export const directoryInsurers = [
  { id: 'allianz', name: 'Allianz' },
  { id: 'axa', name: 'AXA Seguros' },
  { id: 'bupa', name: 'Bupa' },
  { id: 'gnp', name: 'GNP Seguros' },
  { id: 'mapfre', name: 'MAPFRE' },
  { id: 'metlife', name: 'MetLife México' },
  { id: 'plan-seguro', name: 'Plan Seguro' },
  { id: 'atlas', name: 'Seguros Atlas' },
  { id: 'banorte', name: 'Seguros Banorte' },
  { id: 'inbursa', name: 'Seguros Inbursa' },
  { id: 'monterrey', name: 'Seguros Monterrey New York Life' },
  { id: 'zurich', name: 'Zurich' },
] as const;

export type DirectoryInsurerId = (typeof directoryInsurers)[number]['id'];
