/**
 * Shared helpers: HTML escaping, sleep, edit distance for "did you mean" hints.
 */

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]),
  sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lev = (a, b) => {
  const d = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    let p = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1));
      p = t;
    }
  }
  return d[b.length];
};
const near = (w, l) => l.find((x) => lev(w.toLowerCase(), x.toLowerCase()) <= 2);
export { esc, sleep, lev, near };
