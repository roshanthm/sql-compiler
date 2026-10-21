/**
 * Compiler driver: runs lexer -> parser -> AST -> semantic analysis and returns one report.
 */
import { lex } from './lexer.js';
import { parse } from './parser.js';
import { buildAST } from './ast.js';
import { semantic } from './semantic.js';

function compile(src) {
  const r = {
      src,
      errors: [],
      checks: [],
      refs: [],
      st: { lex: 'skip', parse: 'skip', tree: 'skip', ast: 'skip', sem: 'skip' },
    },
    { T, E, end } = lex(src);
  r.tokens = T;
  if (E.length) {
    r.errors = E;
    r.st.lex = 'fail';
    r.status = 'lexical';
    return r;
  }
  r.st.lex = 'ok';
  const toks = T.filter((t) => !t.skip).concat({
      y: 'EOF',
      v: '',
      line: end.line,
      col: end.col,
      start: end.pos,
    }),
    p = parse(toks);
  if (p.err) {
    r.errors = [p.err];
    r.st.parse = 'fail';
    r.status = 'syntax';
    return r;
  }
  r.st.parse = r.st.tree = 'ok';
  r.tree = p.root;
  r.ast = buildAST(p.root);
  r.st.ast = 'ok';
  const s = semantic(r.ast);
  r.checks = s.ch;
  r.refs = s.refs;
  r.table = s.tn;
  r.errors = s.er;
  r.st.sem = s.er.length ? 'fail' : 'ok';
  r.status = s.er.length ? 'semantic' : 'ok';
  return r;
}

export { compile };
