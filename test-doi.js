// Test DOI metadata fetching
async function testDOIFetch() {
  const doi = "10.1145/3555120";
  const cleanDoi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
  const crossrefUrl = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`;

  console.log('Fetching DOI metadata from:', crossrefUrl);

  try {
    const response = await fetch(crossrefUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Literature-Finder/1.0',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch:', response.status);
      return;
    }

    const data = await response.json();
    console.log('\n=== Crossref Response ===');
    console.log(JSON.stringify(data.message, null, 2));

    // Extract page info
    const work = data.message;
    console.log('\n=== Extracted Fields ===');
    console.log('Page:', work.page);
    console.log('Article Number:', work['article-number']);
    console.log('Page First:', work['page-first']);
    console.log('Page Last:', work['page-last']);
    console.log('Volume:', work.volume);
    console.log('Issue:', work.issue);
    console.log('Published:', work.published);
    console.log('Published Print:', work['published-print']);
    console.log('Published Online:', work['published-online']);
  } catch (error) {
    console.error('Error:', error);
  }
}

testDOIFetch();
