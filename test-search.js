/**
 * Simple Search API Test
 */

const API_BASE = 'http://localhost:3000';

async function testSearch() {
  console.log('🔍 Testing Literature Search API\n');

  // Test token (using test user from database)
  const token = 'test-token'; // You may need to get this from login

  // Test 1: Basic search
  console.log('Test 1: Basic Search (machine learning)');
  console.log('='.repeat(50));

  try {
    const response = await fetch(`${API_BASE}/api/literature/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: 'machine learning',
        source: 'all',
        maxResults: 5,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✓ Search successful!');
      console.log(`  Total papers: ${data.summary?.total || 0}`);
      console.log(`  Sources returned: ${data.results?.length || 0}`);

      if (data.results) {
        data.results.forEach(result => {
          console.log(`\n  ${result.source.toUpperCase()}:`);
          console.log(`    Papers: ${result.papers?.length || 0}`);

          if (result.papers && result.papers.length > 0) {
            const paper = result.papers[0];
            console.log(`    Sample: "${paper.title?.substring(0, 60)}..."`);
            console.log(`    Authors: ${paper.authors?.slice(0, 2).map(a => a.name).join(', ') || 'N/A'}...`);
          }
        });
      }
    } else {
      const error = await response.json();
      console.log(`✗ Search failed: ${error.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
  }

  // Test 2: Search with filters
  console.log('\n\nTest 2: Search with Filters (arxiv, 2020-2024)');
  console.log('='.repeat(50));

  try {
    const response = await fetch(`${API_BASE}/api/literature/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: 'deep learning',
        source: 'arxiv',
        field: 'title',
        yearStart: 2020,
        yearEnd: 2024,
        maxResults: 3,
        sortBy: 'date',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✓ Filtered search successful!');
      console.log(`  Total papers: ${data.summary?.total || 0}`);
      console.log(`  Sorted by: ${data.sortBy}`);
      console.log(`  Pagination: ${JSON.stringify(data.pagination)}`);

      if (data.results && data.results[0]?.papers) {
        console.log('\n  Sample papers:');
        data.results[0].papers.slice(0, 2).forEach((paper, i) => {
          console.log(`    ${i + 1}. ${paper.title?.substring(0, 50)}... (${paper.publishedDate?.substring(0, 4)})`);
        });
      }
    } else {
      const error = await response.json();
      console.log(`✗ Filtered search failed: ${error.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
  }

  // Test 3: Different sort options
  console.log('\n\nTest 3: Sort Options');
  console.log('='.repeat(50));

  const sortTests = ['relevance', 'date', 'citations'];

  for (const sortBy of sortTests) {
    try {
      const response = await fetch(`${API_BASE}/api/literature/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: 'neural networks',
          source: 'semantic-scholar',
          maxResults: 3,
          sortBy,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const count = data.summary?.total || 0;
        console.log(`✓ Sort by '${sortBy}': ${count} papers`);
      } else {
        console.log(`✗ Sort by '${sortBy}' failed`);
      }
    } catch (error) {
      console.log(`✗ Sort by '${sortBy}': ${error.message}`);
    }
  }

  // Test 4: Search history
  console.log('\n\nTest 4: Search History');
  console.log('='.repeat(50));

  try {
    const response = await fetch(`${API_BASE}/api/search-history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✓ Search history: ${data.total || 0} entries`);

      if (data.search_history && data.search_history.length > 0) {
        console.log('\n  Recent searches:');
        data.search_history.slice(0, 5).forEach((item, i) => {
          console.log(`    ${i + 1}. "${item.query}" (${item.source}) - ${new Date(item.created_at).toLocaleDateString()}`);
        });
      }
    } else {
      console.log('✗ Failed to get search history');
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
  }

  console.log('\n\n✅ Tests completed!');
}

testSearch();
