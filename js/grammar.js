/**
 * Grammar engine: CFG, left-recursion detection/removal, left factoring, FIRST/FOLLOW, LL(1) table.
 */

const parseG = (t) => {
  const g = { order: [], P: {} };
  t.trim()
    .split('\n')
    .forEach((l) => {
      const [a, r] = l.split(' -> ');
      g.order.push(a);
      g.P[a] = r.split(' | ').map((x) => x.trim().split(/\s+/));
    });
  return g;
};
const showG = (g) => g.order.map((a) => `${a} → ${g.P[a].map((p) => p.join(' ')).join(' | ')}`).join('\n');
const clone = (g) => ({
  order: [...g.order],
  P: Object.fromEntries(g.order.map((a) => [a, g.P[a].map((p) => [...p])])),
});
const detectLR = (g) =>
  g.order.flatMap((a) =>
    g.P[a]
      .filter((p) => p[0] === a)
      .map((p) => `${a} → ${p.join(' ')}   (direct: ${a} derives ${a} ${p.slice(1).join(' ')})`),
  );
function elimLR(g0) {
  const g = clone(g0);
  for (const a of g0.order) {
    const al = g.P[a].filter((p) => p[0] === a),
      be = g.P[a].filter((p) => p[0] !== a);
    if (!al.length) continue;
    const n = a + 'Tail';
    g.P[a] = be.map((b) => (b[0] === 'ε' ? [n] : [...b, n]));
    g.P[n] = [...al.map((x) => [...x.slice(1), n]), ['ε']];
    g.order.splice(g.order.indexOf(a) + 1, 0, n);
  }
  return g;
}
function leftFactor(g0) {
  const g = clone(g0);
  for (const a of g0.order) {
    const grp = {};
    g.P[a].forEach((p) => (grp[p[0]] ??= []).push(p));
    const keep = [];
    for (const [f, L] of Object.entries(grp)) {
      if (L.length < 2 || f === 'ε') {
        keep.push(...L);
        continue;
      }
      let k = 1;
      while (L.every((p) => p[k] && p[k] === L[0][k])) k++;
      const n = a + 'Rest';
      keep.push([...L[0].slice(0, k), n]);
      g.P[n] = L.map((p) => (p.slice(k).length ? p.slice(k) : ['ε']));
      g.order.splice(g.order.indexOf(a) + 1, 0, n);
    }
    g.P[a] = keep;
  }
  return g;
}
function analyze(g) {
  const NT = new Set(g.order),
    F = {},
    Fo = {},
    T = {};
  g.order.forEach((a) => {
    F[a] = new Set();
    Fo[a] = new Set();
    T[a] = {};
  });
  const fs = (q) => {
    const r = new Set();
    let all = true;
    for (const s of q) {
      if (s === 'ε') continue;
      if (!NT.has(s)) {
        r.add(s);
        all = false;
        break;
      }
      F[s].forEach((x) => x !== 'ε' && r.add(x));
      if (!F[s].has('ε')) {
        all = false;
        break;
      }
    }
    if (all) r.add('ε');
    return r;
  };
  for (let ch = 1; ch; ) {
    ch = 0;
    for (const a of g.order)
      for (const p of g.P[a])
        fs(p).forEach((x) => {
          if (!F[a].has(x)) {
            F[a].add(x);
            ch = 1;
          }
        });
  }
  Fo[g.order[0]].add('$');
  for (let ch = 1; ch; ) {
    ch = 0;
    for (const a of g.order)
      for (const p of g.P[a])
        p.forEach((s, i) => {
          if (!NT.has(s)) return;
          const f = fs(p.slice(i + 1));
          f.forEach((x) => {
            if (x !== 'ε' && !Fo[s].has(x)) {
              Fo[s].add(x);
              ch = 1;
            }
          });
          if (f.has('ε'))
            Fo[a].forEach((x) => {
              if (!Fo[s].has(x)) {
                Fo[s].add(x);
                ch = 1;
              }
            });
        });
  }
  const conf = [];
  for (const a of g.order)
    g.P[a].forEach((p, i) => {
      const f = fs(p),
        ts = [...f].filter((x) => x !== 'ε');
      if (f.has('ε')) Fo[a].forEach((x) => ts.push(x));
      ts.forEach((t) => {
        if (T[a][t] !== undefined) conf.push(`${a}, ${t}`);
        else T[a][t] = i;
      });
    });
  const ts = [
    ...new Set(g.order.flatMap((a) => g.P[a].flat().filter((s) => !NT.has(s) && s !== 'ε'))),
  ].concat('$');
  return { g, NT, F, Fo, T, conf, ts };
}
const G0 = parseG(`Query -> SELECT SelectList FROM id WhereOpt OrderOpt ;
SelectList -> * | IdList
IdList -> IdList , id | id
WhereOpt -> WHERE Cond | ε
Cond -> Cond OR AndExpr | AndExpr
AndExpr -> AndExpr AND Pred | Pred
Pred -> id Op Val
Op -> = | > | < | >= | <= | <>
Val -> number | string
OrderOpt -> ORDER BY id Dir | ε
Dir -> ASC | DESC | ε`);
const G1 = elimLR(G0),
  GFin = parseG(`IdList -> id | id , IdList
Cond -> Pred | Pred AND Cond | Pred OR Cond`),
  GF = leftFactor(GFin),
  A = analyze(G1);

export { parseG, showG, detectLR, elimLR, leftFactor, analyze, G0, G1, GFin, GF, A };
