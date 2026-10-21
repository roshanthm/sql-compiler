/**
 * Table-driven predictive (LL(1)) parser: token stream -> parse tree, with located syntax errors.
 */
import { key } from './lexer.js';
import { A } from './grammar.js';

const dn = (x) => (x === 'id' ? 'identifier' : x === '$' ? 'end of input' : x),
  lst = (a) => (a.length > 1 ? a.slice(0, -1).map(dn).join(', ') + ' or ' + dn(a.at(-1)) : dn(a[0]));
const sugg = (e) =>
  e.includes('number')
    ? "Compare against a number or a quoted string such as 18 or 'John'"
    : e.includes('FROM') && e.includes(',')
      ? 'Separate columns with commas, then add the FROM clause'
      : e.includes('FROM')
        ? 'Did you forget the FROM clause?'
        : e.includes(';')
          ? "Terminate the statement with ';'"
          : e.includes('BY')
            ? 'ORDER must be followed by BY'
            : e.includes('=')
              ? 'Use a comparison operator: = > < >= <= <>'
              : e.includes('id')
                ? 'Provide a column or table name here'
                : e.includes('SELECT')
                  ? 'Every statement starts with SELECT'
                  : 'Check the Grammar tab for the allowed forms';
const synErr = (t, ex) => {
  const f = t.y === 'EOF' ? 'end of input' : `'${t.v}'`;
  const msg =
    ex[0] === '$'
      ? `Unexpected token ${f} after the end of the statement`
      : ex.includes(';') && t.y === 'EOF' && ex.length === 1
        ? "Missing semicolon: expected ';' at the end of the query"
        : ex.includes('id') && ex.length === 1 && t.y === 'KEYWORD'
          ? `Missing identifier: expected identifier, found ${f}`
          : `Expected ${lst(ex)}, found ${f}`;
  return {
    phase: 'Syntax',
    line: t.line,
    col: t.col,
    msg,
    fix: ex[0] === '$' ? 'Only one statement is allowed; remove the extra tokens' : sugg(ex),
    pos: t.y === 'EOF' ? undefined : t.start,
  };
};
function parse(toks) {
  const root = { l: 'Query', c: [] },
    st = [{ s: '$' }, { s: 'Query', n: root }];
  let i = 0;
  while (st.length) {
    const top = st.pop(),
      t = toks[i],
      k = key(t);
    if (top.s === '$') {
      if (k === '$') break;
      return { err: synErr(t, ['$']) };
    }
    if (A.NT.has(top.s)) {
      const row = A.T[top.s],
        pi = row[k];
      if (pi === undefined) return { err: synErr(t, Object.keys(row)) };
      const kids = A.g.P[top.s][pi].map((s) =>
        s === 'ε' ? { l: 'ε', eps: 1 } : { l: s, c: A.NT.has(s) ? [] : null },
      );
      top.n.c = kids;
      for (let j = kids.length - 1; j >= 0; j--) if (!kids[j].eps) st.push({ s: kids[j].l, n: kids[j] });
    } else {
      if (k !== top.s) return { err: synErr(t, [top.s]) };
      top.n.tok = t;
      i++;
    }
  }
  return { root };
}

export { parse };
