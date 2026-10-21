/**
 * AST construction from the parse tree, plus tree rendering helpers.
 */
import { esc } from './utils.js';

function buildAST(q) {
  const [, sl, , tb, wh, od] = q.c,
    a = { table: tb.tok, cols: [], where: null, order: null };
  if (sl.c[0].l === '*') a.star = sl.c[0].tok;
  else {
    const il = sl.c[0];
    a.cols.push(il.c[0].tok);
    let t = il.c[1];
    while (t.c.length > 1) {
      a.cols.push(t.c[1].tok);
      t = t.c[2];
    }
  }
  const pred = (p) => ({ k: 'p', op: p.c[1].c[0].tok, l: p.c[0].tok, r: p.c[2].c[0].tok });
  if (wh.c[0].l !== 'ε') {
    const fold = (n, sub) => {
      let l = sub(n.c[0]),
        t = n.c[1];
      while (t.c.length > 1) {
        l = { k: 'l', op: t.c[0].tok, l, r: sub(t.c[1]) };
        t = t.c[2];
      }
      return l;
    };
    const and = (n) => fold(n, pred);
    a.where = fold(wh.c[1], and);
  }
  if (od.c[0].l !== 'ε') {
    const d = od.c[3].c[0];
    a.order = { col: od.c[2].tok, dir: d.l === 'ε' ? null : d.tok };
  }
  return a;
}
const lit = (t) => ({ l: t.v }),
  ex = (e) =>
    e.k === 'l' ? { l: e.op.v.toUpperCase(), c: [ex(e.l), ex(e.r)] } : { l: e.op.v, c: [lit(e.l), lit(e.r)] };
const astTree = (a) => ({
  l: 'SELECT',
  c: [
    { l: 'Columns', c: a.star ? [{ l: '*' }] : a.cols.map(lit) },
    { l: 'Table', c: [lit(a.table)] },
    a.where && { l: 'WHERE', c: [ex(a.where)] },
    a.order && {
      l: 'ORDER BY',
      c: [lit(a.order.col), { l: a.order.dir ? a.order.dir.v.toUpperCase() : 'ASC (default)' }],
    },
  ],
});
const label = (n) =>
  n.tok ? (['id', 'number', 'string'].includes(n.l) ? `${n.l}: ${n.tok.v}` : n.tok.v) : n.l;
function draw(n, pre = '', last = true, root = true, o = []) {
  const ks = (n.c || []).filter(Boolean),
    cls = n.eps ? 'eps' : ks.length || n.c ? 'nt' : 'tm';
  o.push(
    `<span class="br">${root ? '' : pre + (last ? '└── ' : '├── ')}</span><span class="${cls}">${esc(label(n))}</span>`,
  );
  ks.forEach((k, i) => draw(k, root ? '' : pre + (last ? '    ' : '│   '), i === ks.length - 1, false, o));
  return o;
}

export { buildAST, astTree, draw };
