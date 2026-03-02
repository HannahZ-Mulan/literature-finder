// Test script for citation formatting
const testData = {
  title: "The Gift That Keeps on Giving: Generosity is Contagious in Multiplayer Online Games",
  authors: [
    { name: "Alexander J. Bisberg" },
    { name: "Julie Jiang" },
    { name: "Yilei Zeng" },
    { name: "Emily Chen" },
    { name: "Emilio Ferrara" }
  ],
  publication_date: "2022-11-11T00:00:00Z",
  journal: "PACM on Human-Computer Interaction 6, CSCW2, Article 395 (November 2022)",
  volume: "6",
  issue: "CSCW2",
  pages: null, // Simulating missing pages
  doi: "10.1145/3555120"
};

async function testCitationFormats() {
  const formats = ['apa', 'mla', 'chicago', 'harvard', 'vancouver'];

  for (const format of formats) {
    try {
      const response = await fetch(`http://localhost:3005/api/literature/16/export?format=${format}`);
      const citation = await response.text();
      console.log(`\n=== ${format.toUpperCase()} ===`);
      console.log(citation);
    } catch (error) {
      console.error(`Error testing ${format}:`, error.message);
    }
  }
}

testCitationFormats();
