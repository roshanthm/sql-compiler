/**
 * Semantic analysis: table/column resolution, duplicate projection, type checking.
 */
import { SCHEMA } from './catalog.js';
import { near } from './utils.js';

const SE = (t, msg, fix) => ({ phase: 'Semantic', line: t.line, col: t.col, msg, fix, pos: t.start });
function semantic(a) {
  const er = [],
    ch = [],
    refs = [],
    add = (n, s, d) => ch.push({ n, s, d });
  const tn = Object.keys(SCHEMA).find((k) => k.toLowerCase() === a.table.v.toLowerCase());
  if (!tn) {
    const s = near(a.table.v, Object.keys(SCHEMA));
    er.push(
      SE(
        a.table,
        `Unknown table '${a.table.v}'`,
        s ? `Did you mean '${s}'?` : `Known tables: ${Object.keys(SCHEMA).join(', ')}`,
      ),
    );
    add('Table exists', 'fail', `'${a.table.v}' is not in the catalog`);
    ['Columns exist', 'Duplicate projection', 'Ambiguous column names', 'Type checking'].forEach((n) =>
      add(n, 'skip', 'Skipped: table not resolved'),
    );
    return { er, ch, refs, tn: null };
  }
  add('Table exists', 'ok', `'${tn}' found in catalog`);
  const tb = SCHEMA[tn];
  let unk = 0,
    dup = 0,
    mm = 0;
  const col = (t, ctx) => {
    const c = Object.keys(tb).find((k) => k.toLowerCase() === t.v.toLowerCase());
    if (!c) {
      unk++;
      const s = near(t.v, Object.keys(tb));
      er.push(
        SE(
          t,
          `Unknown column '${t.v}' in table '${tn}' (${ctx})`,
          s ? `Did you mean '${s}'?` : `Available columns: ${Object.keys(tb).join(', ')}`,
        ),
      );
      return null;
    }
    refs.push({ c, ty: tb[c], ctx });
    return tb[c];
  };
  if (a.star) Object.keys(tb).forEach((c) => refs.push({ c, ty: tb[c], ctx: 'SELECT *' }));
  else {
    const seen = new Set();
    a.cols.forEach((t) => {
      const k = t.v.toLowerCase();
      if (seen.has(k)) {
        dup++;
        er.push(SE(t, `Duplicate column '${t.v}' in SELECT list`, 'Remove the repeated column'));
      }
      seen.add(k);
      col(t, 'SELECT');
    });
  }
  const walk = (e) => {
    if (e.k === 'l') {
      walk(e.l);
      walk(e.r);
      return;
    }
    const ty = col(e.l, 'WHERE');
    if (!ty) return;
    const num = ty !== 'VARCHAR',
      ln = e.r.y === 'NUMBER';
    if (num !== ln) {
      mm++;
      er.push(
        SE(
          e.r,
          `Type mismatch: ${ty} column '${e.l.v}' compared with ${ln ? 'number' : 'string'} literal ${e.r.v}`,
          `Compare '${e.l.v}' with a ${num ? 'number' : 'quoted string'}`,
        ),
      );
    }
  };
  if (a.where) walk(a.where);
  if (a.order) col(a.order.col, 'ORDER BY');
  add(
    'Columns exist',
    unk ? 'fail' : 'ok',
    unk ? `${unk} unknown reference(s)` : 'All referenced columns resolve',
  );
  add(
    'Duplicate projection',
    dup ? 'fail' : 'ok',
    dup ? `${dup} duplicate(s)` : 'No repeated columns in SELECT',
  );
  add('Ambiguous column names', 'ok', 'Single FROM source: no ambiguity possible');
  add('Type checking', mm ? 'fail' : 'ok', mm ? `${mm} mismatch(es)` : 'Operand types are compatible');
  return { er, ch, refs, tn };
}

export { semantic };
