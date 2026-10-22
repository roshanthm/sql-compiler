# Mini SQL Compiler

A compiler front-end for a restricted SQL subset (`SELECT`, `FROM`, `WHERE`, `ORDER BY`) with a dark IDE-style web UI.
It implements the full front-end pipeline and shows every stage visually.

``` 
SQL text -> Lexer -> Tokens -> LL(1) Parser -> Parse tree -> AST -> Semantic analysis -> Report (+ execution on sample data)
```

## Quick start

Requires Node 18+. No dependencies to install.

```bash
npm run dev      # http://localhost:3000  (development mode with auto-reload)
npm start        # http://localhost:3000  (serves the UI and POST /api/compile)
npm test         # 22 automated tests (valid, syntax, lexical, semantic, edge, stress)
npm run build    # regenerates docs and verifies test suite (used by Netlify / CI)
npm run docs     # regenerates docs/GRAMMAR.md from the live grammar engine
```

ES modules cannot be opened by double-clicking `index.html`; use `npm start` (or any static server).

## Project structure

```
index.html            page shell
css/styles.css        dark IDE theme (light theme via prefers-color-scheme)
js/catalog.js         symbol table (schema) + sample data
js/lexer.js           lexical analysis, token types, lexical errors
js/grammar.js         CFG, left-recursion removal, left factoring, FIRST/FOLLOW, LL(1) table
js/parser.js          table-driven predictive parser -> parse tree, syntax errors
js/ast.js             parse tree -> AST, tree rendering
js/semantic.js        semantic checks
js/executor.js        runs the AST on sample rows
js/compiler.js        pipeline driver
js/utils.js           helpers (escaping, edit distance)
js/testcases.js       shared test cases
js/views.js, main.js  UI tabs and application wiring
server/server.js      static server + JSON API
tests/                Node test suite (node:test)
scripts/gen-docs.js   documentation generator
docs/GRAMMAR.md       generated grammar report
```

## Compiler design

**Final grammar (LL(1))** after removing left recursion (full derivation in `docs/GRAMMAR.md` and the Grammar tab):

```
Query      -> SELECT SelectList FROM id WhereOpt OrderOpt ;
SelectList -> * | IdList
IdList     -> id IdListTail          IdListTail -> , id IdListTail | e
WhereOpt   -> WHERE Cond | e
Cond       -> AndExpr CondTail       CondTail   -> OR AndExpr CondTail | e
AndExpr    -> Pred AndExprTail       AndExprTail-> AND Pred AndExprTail | e
Pred       -> id Op Val              Op -> = | > | < | >= | <= | <>      Val -> number | string
OrderOpt   -> ORDER BY id Dir | e    Dir -> ASC | DESC | e
```

Why predictive parsing works: for every `A -> alpha | beta`, FIRST(alpha) and FIRST(beta) are disjoint, and when alpha can derive e, FIRST(beta) and FOLLOW(A) are disjoint. The table builder verifies this (0 conflicts), so one token of lookahead picks the production with no backtracking.

**Parse tree vs AST:** the parse tree contains every nonterminal and e-expansion; the AST keeps only meaning (columns, table, predicate tree, ordering). `AND` binds tighter than `OR`, both left-associative.

**Semantic checks:** table exists, columns exist (SELECT/WHERE/ORDER BY), duplicate projection, ambiguous names (single source), type compatibility, with "did you mean" suggestions.

**Errors** carry type (lexical/syntax/semantic), line, column, description and a suggested fix.

| Phase | Time | Space |
|---|---|---|
| Lexer | O(n) | O(n) |
| LL(1) parser | O(n) | O(n) |
| AST build | O(n) | O(n) |
| Semantic | O(n*c) | O(n) |

## API

`POST /api/compile` with `{"sql": "SELECT ..."}` returns `{status, stages, errors, tokens, ast}`.

## Limitations and future work

Single table, no joins or aggregates, direct left recursion only in the transformation engine, sample data instead of a storage engine. Possible next steps: JOINs, `LIMIT`, `IN`/`LIKE`, error recovery to report several syntax errors, graphical tree rendering, Monaco editor.

## References

Aho, Lam, Sethi, Ullman - *Compilers: Principles, Techniques, and Tools* (2nd ed.). Cooper and Torczon - * Engineering a Compiler *. Appel - *Modern Compiler Implementation*.
