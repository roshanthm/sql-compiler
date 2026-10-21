/**
 * Executor: evaluates a checked AST against the sample data in the catalog.
 */
import { SCHEMA, DATA } from './catalog.js';

function execute(r) {
  const tb = r.table,
    S = SCHEMA[tb],
    cn = (t) => Object.keys(S).find((k) => k.toLowerCase() === t.v.toLowerCase()),
    val = (t) => (t.y === 'NUMBER' ? parseFloat(t.v) : t.v.slice(1, -1));
  const cols = r.ast.star ? Object.keys(S) : r.ast.cols.map(cn);
  const ev = (e, w) => {
    if (e.k === 'l') {
      const a = ev(e.l, w),
        b = ev(e.r, w);
      return e.op.v.toUpperCase() === 'AND' ? a && b : a || b;
    }
    const x = w[cn(e.l)],
      y = val(e.r);
    switch (e.op.v) {
      case '=':
        return x == y;
      case '>':
        return x > y;
      case '<':
        return x < y;
      case '>=':
        return x >= y;
      case '<=':
        return x <= y;
      default:
        return x != y;
    }
  };
  let out = DATA[tb].filter((w) => !r.ast.where || ev(r.ast.where, w));
  if (r.ast.order) {
    const c = cn(r.ast.order.col),
      d = r.ast.order.dir && r.ast.order.dir.v.toUpperCase() === 'DESC' ? -1 : 1;
    out = [...out].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * d);
  }
  return { cols, rows: out };
}

export { execute };
