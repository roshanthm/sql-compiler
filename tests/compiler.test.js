import test from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '../js/compiler.js';
import { execute } from '../js/executor.js';
import { TESTS } from '../js/testcases.js';
import { A } from '../js/grammar.js';

for (const [name, sql, expected] of TESTS) {
  test(name, () => assert.equal(compile(sql).status, expected));
}

test('grammar is LL(1) (no table conflicts)', () => assert.equal(A.conf.length, 0));

test('AND binds tighter than OR', () => {
  const r = compile('SELECT name FROM students WHERE age > 1 OR age < 5 AND salary > 2;');
  assert.equal(r.ast.where.op.v.toUpperCase(), 'OR');
  assert.equal(r.ast.where.r.op.v.toUpperCase(), 'AND');
});

test('syntax error reports line, column and expected token', () => {
  const e = compile('SELECT name\nWHERE age > 1;').errors[0];
  assert.deepEqual([e.phase, e.line, e.col], ['Syntax', 2, 1]);
  assert.match(e.msg, /Expected/);
});

test('executor filters and sorts', () => {
  const x = execute(compile('SELECT name, age FROM students WHERE age > 18 ORDER BY age DESC;'));
  assert.deepEqual(
    x.rows.map((r) => r.name),
    ['Liam', 'Ravi', 'Nina', 'John', 'Meera'],
  );
});
