// Test if the citation module can be imported
import { formatCitation } from './src/lib/citation/format-citation-js.ts';

const testLit = {
  title: "Test Paper",
  authors: [{ name: "John Doe" }],
  publication_date: "2022-01-01",
  journal: "Test Journal",
  volume: "1",
  issue: "1",
  pages: "1-10",
  doi: "10.1234/test"
};

formatCitation(testLit, 'apa').then(console.log).catch(console.error);
