/**
 * Result-tab renderers (one function per tab).
 */
import { esc } from './utils.js';
import { draw, astTree } from './ast.js';
import { execute } from './executor.js';
import { SCHEMA, DATA } from './catalog.js';
import { A, G0, G1, GFin, GF, showG, detectLR } from './grammar.js';
import { TESTS } from './testcases.js';
import { compile } from './compiler.js';

const empty = (r, s) =>
  `<p class="d">Not available: the <b>${r.st.lex === 'fail' ? 'lexer' : 'parser'}</b> reported an error, so this stage was skipped. Fix the error in the console and compile again.</p>`;
const pills = {
  KEYWORD: 'k',
  IDENTIFIER: 'i',
  NUMBER: 'n',
  STRING: 's',
  OPERATOR: 'o',
  COMMA: 'c',
  SEMICOLON: 'c',
  LPAREN: 'c',
  RPAREN: 'c',
  COMMENT: 'c',
  ERROR: 'e',
};
const V = {
  res: (r) => {
    if (r.status !== 'ok')
      return `<p class="d">The query was not executed because it has ${r.errors.length} ${r.status} error(s). Fix them in the error console and compile again.</p>`;
    const x = execute(r);
    return `<p class="d">Executed the AST over sample data in <b>${r.table}</b>: ${x.rows.length} row(s).</p><div class="sc"><table class="mono"><tr>${x.cols.map((c) => `<th>${c}</th>`).join('')}</tr>${x.rows.map((w) => `<tr>${x.cols.map((c) => `<td>${esc(w[c])}</td>`).join('')}</tr>`).join('') || `<tr><td class="d" colspan="${x.cols.length}">No rows match</td></tr>`}</table></div><h3>Source data (${r.table})</h3><div class="sc"><table class="mono"><tr>${Object.keys(
      SCHEMA[r.table],
    )
      .map((c) => `<th>${c}</th>`)
      .join('')}</tr>${DATA[r.table]
      .map(
        (w) =>
          `<tr>${Object.keys(SCHEMA[r.table])
            .map((c) => `<td class="d">${esc(w[c])}</td>`)
            .join('')}</tr>`,
      )
      .join('')}</table></div>`;
  },
  tok: (r) =>
    `<div class="sc"><table class="mono"><tr><th>#</th><th>Token</th><th>Type</th><th>Line:Col</th></tr>${r.tokens.map((t, i) => `<tr><td class="d">${i + 1}</td><td class="${pills[t.y]}">${esc(t.v)}</td><td class="${t.y === 'ERROR' ? 'bad' : ''}">${t.y}</td><td class="d">${t.line}:${t.col}</td></tr>`).join('') || '<tr><td colspan=4 class="d">No tokens</td></tr>'}</table></div>`,
  pt: (r) =>
    r.tree
      ? `<p class="d">Concrete derivation from the LL(1) grammar: every nonterminal, including ε-expansions.</p><pre class="tr">${draw(r.tree).join('\n')}</pre>`
      : empty(r),
  ast: (r) =>
    r.ast
      ? `<p class="d">Abstract syntax: nonterminals, keywords and punctuation are dropped; AND/OR fold into left-associative operator nodes.</p><pre class="tr">${draw(astTree(r.ast)).join('\n')}</pre>`
      : empty(r),
  sem: (r) =>
    r.ast
      ? `<table><tr><th>Check</th><th>Result</th><th>Detail</th></tr>${r.checks.map((c) => `<tr><td>${c.n}</td><td class="${{ ok: 'ok', fail: 'bad', skip: 'd' }[c.s]}">${{ ok: '✓ pass', fail: '✗ fail', skip: '– skipped' }[c.s]}</td><td class="d w">${esc(c.d)}</td></tr>`).join('')}</table>`
      : empty(r),
  sym: (r) =>
    `<p class="d">Catalog consulted by the semantic analyzer. Tables used by the current query are outlined.</p>` +
    Object.entries(SCHEMA)
      .map(
        ([t, c]) =>
          `<div class="tbl${r.table === t ? ' use' : ''}"><h5>TABLE ${t}</h5><table class="mono">${Object.entries(
            c,
          )
            .map(
              ([n, ty]) =>
                `<tr><td class="${r.refs.some((x) => x.c === n) && r.table === t ? 'n' : ''}">${n}</td><td class="d">${ty}</td></tr>`,
            )
            .join('')}</table></div>`,
      )
      .join('') +
    (r.refs.length
      ? `<h3>Resolved references</h3><table class="mono"><tr><th>Column</th><th>Type</th><th>Clause</th></tr>${[...new Map(r.refs.map((x) => [x.c + x.ctx, x])).values()].map((x) => `<tr><td>${x.c}</td><td>${x.ty}</td><td class="d">${x.ctx}</td></tr>`).join('')}</table>`
      : ''),
  gr: () => {
    const set = (s) => '{ ' + [...s].join(', ') + ' }',
      c = A.conf.length;
    return `<h3>1. Original CFG (G0)</h3><div class="box"><pre>${esc(showG(G0))}</pre></div><p class="d">Terminals are SELECT FROM WHERE ORDER BY ASC DESC AND OR id number string * , ; and the comparison operators. ε is the empty string. G0 is ambiguity-free but not LL(1).</p>
<h3>2. Left recursion detection</h3><div class="box"><pre>${esc(detectLR(G0).join('\n'))}</pre></div><p>A grammar with A ⇒⁺ Aα cannot be parsed top-down: the parser would call A forever without consuming input. IdList, Cond and AndExpr are all directly left-recursive. Because AndExpr sits below Cond, AND binds tighter than OR, as in standard SQL.</p>
<h3>3. Left recursion removal (G1)</h3><p>Rewrite A → Aα | β as A → βA′ and A′ → αA′ | ε.</p><div class="box"><pre>${esc(showG(G1))}</pre></div>
<h3>4. Left factoring</h3><p>Alternatives that share a prefix force a guess. Starting from the right-recursive form</p><div class="box"><pre>${esc(showG(GFin))}</pre></div><p>factoring the common prefix with A → αβ₁ | αβ₂ ⇒ A → αA′, A′ → β₁ | β₂ gives</p><div class="box"><pre>${esc(showG(GF))}</pre></div><p class="d">G1 is already factored, because left-recursion removal produced one alternative per prefix. G1 is the grammar the parser uses.</p>
<h3>5. FIRST sets</h3><div class="box"><pre>${A.g.order.map((a) => `FIRST(${a}) = ${set(A.F[a])}`).join('\n')}</pre></div>
<h3>6. FOLLOW sets</h3><div class="box"><pre>${A.g.order.map((a) => `FOLLOW(${a}) = ${set(A.Fo[a])}`).join('\n')}</pre></div>
<h3>7. LL(1) predictive parsing table</h3><div class="sc"><table class="mono"><tr><th>M[A, a]</th>${A.ts.map((t) => `<th>${esc(t)}</th>`).join('')}</tr>${A.g.order
      .map(
        (a) =>
          `<tr><td class="nt">${a}</td>${A.ts
            .map((t) => {
              const i = A.T[a][t];
              return `<td class="${i === undefined ? '' : 'tm'}">${i === undefined ? '' : esc(a + '→' + A.g.P[a][i].join(' '))}</td>`;
            })
            .join('')}</tr>`,
      )
      .join('')}</table></div>
<h3>8. Why LL(1) works here</h3><p>A grammar is LL(1) iff for every A → α | β: FIRST(α) ∩ FIRST(β) = ∅, and if ε ∈ FIRST(α) then FIRST(β) ∩ FOLLOW(A) = ∅. The table builder checked every cell: <b class="${c ? 'bad' : 'ok'}">${c ? c + ' conflict(s)' : '0 conflicts, so the grammar is LL(1)'}</b>. One token of lookahead always selects the production, giving a deterministic, backtrack-free parser that runs in linear time. The parser in this tool is table-driven and reads this very table.</p>`;
  },
  th: () => `<h3>Parse tree vs AST</h3><p>The <b>parse tree</b> records how the grammar derived the input: every nonterminal (SelectList, IdListTail, CondTail), every keyword and every ε-expansion. The <b>AST</b> keeps only meaning: columns, table, predicate and ordering. Helper nonterminals vanish, the tail chains become flat lists, and AND/OR become binary operator nodes. Semantic analysis walks the AST because it is smaller and independent of how the grammar was written.</p>
<h3>Algorithms</h3><ul><li><b>Lexer:</b> a single left-to-right scan with a line/column counter. The longest match wins (>= before >), and keywords are looked up in a set after reading a word. Bad input becomes an ERROR token plus a located message.</li><li><b>Parser:</b> a stack holds grammar symbols. A nonterminal on top is replaced using M[A, lookahead], and a terminal on top must equal the lookahead. A missing cell is a syntax error listing the cell’s row keys as the expected tokens.</li><li><b>AST construction:</b> a walk over the parse tree that unrolls IdListTail and folds CondTail left-to-right.</li><li><b>Semantic checking:</b> resolve the table in the catalog, then check every column reference, duplicates in the projection, and literal types against column types. Near-miss names are suggested using edit distance.</li><li><b>Symbol table:</b> the catalog maps table → column → type; each resolved reference is recorded with its clause.</li></ul>
<h3>Complexity (n = tokens, c = columns in table)</h3><table><tr><th>Phase</th><th>Time</th><th>Space</th></tr><tr><td>Lexing</td><td>O(n)</td><td>O(n)</td></tr><tr><td>LL(1) parsing</td><td>O(n)</td><td>O(n) stack and tree</td></tr><tr><td>AST build</td><td>O(n)</td><td>O(n)</td></tr><tr><td>Semantic analysis</td><td>O(n·c), or O(n) with a hash map</td><td>O(n)</td></tr><tr><td>FIRST/FOLLOW (one-time)</td><td>O(|G|²) fixpoint</td><td>O(|G|·|Σ|)</td></tr></table>
<h3>Code layout</h3><p class="d">This file is organized as modules in order: catalog, lexer, grammar engine, parser, AST, semantic analyzer, driver, tests, UI. Each is a pure function over plain data, so it can be split into separate files for a Node backend unchanged.</p>`,
  ts: () => {
    const rows = TESTS.map(([n, s, ex]) => {
      const a = compile(s).status;
      return `<tr><td>${n}</td><td class="${a === ex ? 'ok' : 'bad'}">${a === ex ? '✓' : '✗'}</td><td>${ex}</td><td>${a}</td></tr>`;
    });
    const p = rows.filter((x) => x.includes('✓')).length;
    return `<p>${p}/${TESTS.length} tests pass: valid queries, syntax, lexical and semantic errors, edge cases and a 500-condition stress input.</p><table><tr><th>Case</th><th></th><th>Expected</th><th>Actual</th></tr>${rows.join('')}</table>`;
  },
};

export { V };
