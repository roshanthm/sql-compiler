/**
 * Catalog: the symbol table (schema) and the sample rows used by the executor.
 */

const SCHEMA = {
  students: { id: 'INT', name: 'VARCHAR', age: 'INT', department: 'VARCHAR', salary: 'FLOAT' },
  courses: { course_id: 'INT', title: 'VARCHAR', credits: 'INT' },
};
const DATA = {
  students: [
    { id: 1, name: 'John', age: 20, department: 'CS', salary: 4200.5 },
    { id: 2, name: 'Asha', age: 17, department: 'Math', salary: 0 },
    { id: 3, name: 'Ravi', age: 22, department: 'CS', salary: 5600 },
    { id: 4, name: 'Meera', age: 19, department: 'Physics', salary: 3100 },
    { id: 5, name: 'Liam', age: 25, department: 'Math', salary: 7200.75 },
    { id: 6, name: 'Sara', age: 18, department: 'CS', salary: 4800 },
    { id: 7, name: 'Omar', age: 16, department: 'Physics', salary: 0 },
    { id: 8, name: 'Nina', age: 21, department: 'Math', salary: 5000.5 },
  ],
  courses: [
    { course_id: 101, title: 'Compilers', credits: 4 },
    { course_id: 102, title: 'Databases', credits: 3 },
    { course_id: 103, title: 'Algebra', credits: 2 },
    { course_id: 104, title: 'Networks', credits: 3 },
  ],
};
export { SCHEMA, DATA };
