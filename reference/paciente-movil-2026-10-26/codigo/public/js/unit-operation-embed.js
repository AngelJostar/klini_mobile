(() => {
  if (!document.body.classList.contains('operational-native-body')) return;
  const unit = new URL(location.href).searchParams.get('unit');
  if (!unit) return;
  const operationalPaths = ['/operational', '/outpatient', '/external-pharmacy'];
  const inScope = url => url.origin === location.origin && operationalPaths.some(path => url.pathname === path || url.pathname.startsWith(path + '/'));
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || link.target === '_top') return;
    const url = new URL(link.href, location.href);
    if (!inScope(url)) return;
    url.searchParams.set('unit', unit);
    link.href = url.href;
  }, true);
  document.querySelectorAll('form').forEach(form => {
    if (!inScope(new URL(form.action, location.href))) return;
    if (!form.querySelector('[name="unit"]')) {
      const field = document.createElement('input');
      field.type = 'hidden'; field.name = 'unit'; field.value = unit; form.append(field);
    }
  });
})();
