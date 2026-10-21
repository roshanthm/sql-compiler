/**
 * Shared test cases: [name, sql, expected status]. Used by the UI Tests tab and the Node test suite.
 */

const TESTS = [
  ['Valid: full query', 'SELECT name, age\nFROM students\nWHERE age > 18\nORDER BY age DESC;', 'ok'],
  ['Valid: star', 'SELECT * FROM students;', 'ok'],
  [
    'Valid: AND / OR',
    "SELECT name FROM students WHERE age >= 18 AND salary < 5000.5 OR department = 'CS';",
    'ok',
  ],
  ['Valid: comment', '-- list courses\nSELECT title FROM courses ORDER BY credits;', 'ok'],
  ['Syntax: missing FROM', 'SELECT name WHERE age > 1;', 'syntax'],
  ['Syntax: missing semicolon', 'SELECT name FROM students', 'syntax'],
  ['Syntax: empty select list', 'SELECT FROM students;', 'syntax'],
  ['Syntax: ORDER without BY', 'SELECT name FROM students ORDER age;', 'syntax'],
  ['Syntax: missing comma', 'SELECT name age FROM students;', 'syntax'],
  ['Syntax: empty input', '', 'syntax'],
  ['Lexical: illegal symbol', 'SELECT name FROM students WHERE age > 18 @;', 'lexical'],
  ['Lexical: bad identifier', 'SELECT 12abc FROM students;', 'lexical'],
  ['Lexical: unterminated string', "SELECT name FROM students WHERE name = 'John;", 'lexical'],
  ['Semantic: unknown table', 'SELECT name FROM employee;', 'semantic'],
  ['Semantic: unknown column', 'SELECT height FROM students;', 'semantic'],
  ['Semantic: type mismatch', "SELECT name FROM students WHERE age > 'John';", 'semantic'],
  ['Semantic: duplicate column', 'SELECT age, age FROM students;', 'semantic'],
  [
    'Stress: 500 conditions',
    'SELECT name FROM students WHERE ' + Array(500).fill('age > 1').join(' AND ') + ';',
    'ok',
    1,
  ],
];

export { TESTS };
