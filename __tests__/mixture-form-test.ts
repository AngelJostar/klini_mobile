import { appendValue, catalogLabel, groupNptCatalog, requestKey } from '@/features/doctor/mixture-form';

describe('mixture form helpers', () => {
  test('serializes meaningful scalar values and skips empty values', () => {
    const append = jest.fn();
    const form = { append } as unknown as FormData;
    appendValue(form, 'boolean', false);
    appendValue(form, 'number', 12);
    appendValue(form, 'empty', '');
    expect(append.mock.calls).toEqual([['boolean', '0'], ['number', '12']]);
  });

  test('uses the best catalog label fallback', () => {
    expect(catalogLabel({ generic_name: 'Cisplatino', product_code: 'ONC-1' })).toBe('Cisplatino');
    expect(catalogLabel({ product_code: 'ONC-2' })).toBe('ONC-2');
  });

  test('creates distinct idempotency keys', () => {
    expect(requestKey()).not.toBe(requestKey());
    expect(requestKey()).toMatch(/^klini-\d+-[a-z0-9]+$/);
  });

  test('keeps every NPT component visible and groups it in clinical order', () => {
    const groups = groupNptCatalog([
      { product_code: 'ADD-1', presentation_code: 'P-1', generic_name: 'Insulina', category: 'Aditivos' },
      { product_code: 'ELE-1', presentation_code: 'P-2', generic_name: 'Cloruro de sodio', category: 'Electrolitos' },
      { product_code: 'AMI-1', presentation_code: 'P-3', generic_name: 'Aminoácidos 10%', category: 'Aminoácidos' },
      { product_code: 'LIP-1', presentation_code: 'P-4', generic_name: 'Emulsión lipídica', category: 'Lípidos' },
    ]);

    expect(groups.map((group) => group.label)).toEqual(['Aminoácidos', 'Lípidos', 'Electrolitos', 'Aditivos']);
    expect(groups.flatMap((group) => group.items)).toHaveLength(4);
  });
});
