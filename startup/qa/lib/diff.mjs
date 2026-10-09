// Compares snapshot records shaped { elements: { [path]: { [property]: value } } }.
export function diffRecords(before, after, { limit = Infinity } = {}) {
  const differences = [];
  let total = 0;
  const report = (difference) => {
    total += 1;
    if (differences.length < limit) differences.push(difference);
  };
  const paths = new Set([...Object.keys(before.elements), ...Object.keys(after.elements)]);
  for (const path of [...paths].sort()) {
    const a = before.elements[path];
    const b = after.elements[path];
    if (!a || !b) {
      report({ path, property: '(element)', before: a ? 'present' : 'missing', after: b ? 'present' : 'missing' });
      continue;
    }
    const properties = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const property of [...properties].sort()) {
      if (a[property] !== b[property]) report({ path, property, before: a[property], after: b[property] });
    }
  }
  return { total, differences };
}

export function diffFileSets(beforeFiles, afterFiles) {
  const before = new Set(beforeFiles);
  const after = new Set(afterFiles);
  return {
    missing: [...before].filter((file) => !after.has(file)).sort(),
    added: [...after].filter((file) => !before.has(file)).sort(),
  };
}
