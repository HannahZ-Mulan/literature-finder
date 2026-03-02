// Add verbose logging to test citation generation
const { formatCitation } = require('./src/lib/citation/format-citation-js.ts');

async function test() {
  const testData = {
    title: "The Gift That Keeps on Giving: Generosity is Contagious in Multiplayer Online Games",
    authors: [
      { name: "Alexander J. Bisberg" },
      { name: "Julie Jiang" },
      { name: "Yilei Zeng" },
      { name: "Emily Chen" },
      { name: "Emilio Ferrara" }
    ],
    publication_date: "2022-11-07T00:00:00Z",
    journal: "PACM on Human-Computer Interaction 6, CSCW2, Article 395 (November 2022)",
    volume: "6",
    issue: "CSCW2",
    pages: null,
    doi: "10.1145/3555120"
  };

  console.log('Testing citation generation with DOI:', testData.doi);
  console.log('Initial pages:', testData.pages);

  const formats = ['apa', 'mla', 'chicago', 'harvard', 'vancouver'];
  for (const format of formats) {
    try {
      console.log(`\n=== ${format.toUpperCase()} ===`);
      const citation = await formatCitation(testData, format);
      console.log(citation);
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

test().catch(console.error);
