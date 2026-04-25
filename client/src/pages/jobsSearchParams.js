export function updateJobSearchParams(currentParams, key, value) {
  const params = new URLSearchParams(currentParams);
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }

  if (key !== 'page') {
    params.set('page', '1');
  }

  return params;
}
