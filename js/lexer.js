/**
 * Lexical analysis: source text -> token stream with line/column and lexical errors.
 */

const KW = new Set(['SELECT', 'FROM', 'WHERE', 'ORDER', 'BY', 'ASC', 'DESC', 'AND', 'OR']);
function lex(s) {
  const T = [],
    E = [];
  let i = 0,
    line = 1,
    col = 1;
  const adv = (n) => {
    while (n--) {
      if (s[i] === '\n') {
        line++;
        col = 1;
      } else col++;
      i++;
    }
  };
  const P = (y, st, L, C, x) => T.push({ y, v: s.slice(st, i), start: st, end: i, line: L, col: C, ...x });
  const bad = (st, L, C, msg, fix) => {
    P('ERROR', st, L, C);
    E.push({ phase: 'Lexical', line: L, col: C, msg, fix, pos: st });
  };
  const sm = { ',': 'COMMA', ';': 'SEMICOLON', '(': 'LPAREN', ')': 'RPAREN' };
  while (i < s.length) {
    const c = s[i],
      st = i,
      L = line,
      C = col,
      r = s.slice(i, i + 2);
    if (/\s/.test(c)) {
      adv(1);
      continue;
    }
    if (r === '--') {
      const j = s.indexOf('\n', i);
      adv((j < 0 ? s.length : j) - i);
      P('COMMENT', st, L, C, { skip: 1 });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = s.slice(i).match(/^\w+/)[0];
      adv(m.length);
      P(KW.has(m.toUpperCase()) ? 'KEYWORD' : 'IDENTIFIER', st, L, C);
      continue;
    }
    if (/\d/.test(c)) {
      const m = s.slice(i).match(/^[\w.]+/)[0];
      adv(m.length);
      if (/^\d+(\.\d+)?$/.test(m)) P('NUMBER', st, L, C);
      else if (/[A-Za-z_]/.test(m))
        bad(
          st,
          L,
          C,
          `Invalid identifier '${m}': identifiers cannot start with a digit`,
          'Rename it to start with a letter or underscore',
        );
      else bad(st, L, C, `Malformed number '${m}'`, 'Use digits with at most one decimal point');
      continue;
    }
    if (c === "'") {
      let j = i + 1;
      while (j < s.length && s[j] !== "'" && s[j] !== '\n') j++;
      if (s[j] === "'") {
        adv(j + 1 - i);
        P('STRING', st, L, C);
      } else {
        adv(j - i);
        bad(st, L, C, 'Unterminated string literal', 'Close the string with a single quote');
      }
      continue;
    }
    if (['>=', '<=', '<>'].includes(r)) {
      adv(2);
      P('OPERATOR', st, L, C);
      continue;
    }
    if (sm[c]) {
      adv(1);
      P(sm[c], st, L, C);
      continue;
    }
    if ('=<>+-*/'.includes(c)) {
      adv(1);
      P('OPERATOR', st, L, C);
      continue;
    }
    adv(1);
    bad(
      st,
      L,
      C,
      `Illegal symbol '${c}'`,
      'Remove or replace this character; it is not part of the language',
    );
  }
  return { T, E, end: { line, col, pos: s.length } };
}
const key = (t) =>
  ({ KEYWORD: t.v.toUpperCase(), IDENTIFIER: 'id', NUMBER: 'number', STRING: 'string', EOF: '$' })[t.y] ??
  t.v;

export { KW, lex, key };
