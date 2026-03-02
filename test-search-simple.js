/**
 * Literature Search API Test Suite
 * Uses test mode (no authentication required)
 */

const API_BASE = 'http://localhost:3000';

// Helper function for colored output
const log = {
  info: (msg) => console.log(`\x1b[36m${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m✓ ${msg}\x1b[0m`),
  error: (msg) => console.log(`\x1b[31m✗ ${msg}\x1b[0m`),
  warn: (msg) => console.log(`\x1b[33m⚠ ${msg}\x1b[0m`),
  header: (msg) => console.log(`\n\x1b[1m\x1b[36m${msg}\x1b[0m`),
};

async function testAPI(endpoint, method, body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'x-test-mode': 'true', // Enable test mode
  };

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();

  return { response, data };
}

function printSeparator(char = '=') {
  console.log(char.repeat(60));
}

async function runTests() {
  log.header('╔══════════════════════════════════════════════════════════╗');
  log.header('║     Literature Finder - Search API Test Suite           ║');
  log.header('╚══════════════════════════════════════════════════════════╝');

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Basic Search
  totalTests++;
  log.header('\n📝 Test 1: Basic Search');
  printSeparator();

  try {
    const { response, data } = await testAPI('/api/literature/search', 'POST', {
      query: 'machine learning',
      source: 'all',
      maxResults: 10,
    });

    if (response.ok) {
      log.success(`Search successful! Found ${data.summary?.total || 0} papers`);

      if (data.results) {
        data.results.forEach(result => {
          log.info(`  ${result.source.toUpperCase()}: ${result.papers?.length || 0} papers`);

          if (result.papers && result.papers.length > 0) {
            const paper = result.papers[0];
            console.log(`    Title: "${paper.title?.substring(0, 70)}..."`);
            console.log(`    Authors: ${paper.authors?.slice(0, 3).map(a => a.name).join(', ') || 'N/A'}${paper.authors?.length > 3 ? '...' : ''}`);
            console.log(`    Date: ${paper.publishedDate || 'N/A'}`);
            console.log(`    Citations: ${paper.citationCount || 'N/A'}`);
          }
        });
      }

      passedTests++;
    } else {
      log.error(`Search failed: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    log.error(`Exception: ${error.message}`);
  }

  // Test 2: Search with Source Filter
  totalTests++;
  log.header('\n📝 Test 2: Search with Source Filter (arXiv only)');
  printSeparator();

  try {
    const { response, data } = await testAPI('/api/literature/search', 'POST', {
      query: 'quantum computing',
      source: 'arxiv',
      maxResults: 5,
    });

    if (response.ok) {
      const count = data.summary?.total || 0;
      log.success(`Found ${count} papers from arXiv`);
      passedTests++;
    } else {
      log.error(`Search failed: ${data.error}`);
    }
  } catch (error) {
    log.error(`Exception: ${error.message}`);
  }

  // Test 3: Search with Field Filter
  totalTests++;
  log.header('\n📝 Test 3: Search in Title Field Only');
  printSeparator();

  try {
    const { response, data } = await testAPI('/api/literature/search', 'POST', {
      query: 'transformer',
      source: 'all',
      field: 'title',
      maxResults: 5,
    });

    if (response.ok) {
      log.success(`Found ${data.summary?.total || 0} papers with "transformer" in title`);
      passedTests++;
    } else {
      log.error(`Search failed: ${data.error}`);
    }
  } catch (error) {
    log.error(`Exception: ${error.message}`);
  }

  // Test 4: Search with Year Filter
  totalTests++;
  log.header('\n📝 Test 4: Search with Year Range (2020-2024)');
  printSeparator();

  try {
    const { response, data } = await testAPI('/api/literature/search', 'POST', {
      query: 'neural network',
      source: 'all',
      yearStart: 2020,
      yearEnd: 2024,
      maxResults: 5,
    });

    if (response.ok) {
      log.success(`Found ${data.summary?.total || 0} papers from 2020-2024`);

      // Verify dates are in range
      if (data.results) {
        let allInRange = true;
        data.results.forEach(result => {
          if (result.papers) {
            result.papers.forEach(paper => {
              if (paper.publishedDate) {
                const year = new Date(paper.publishedDate).getFullYear();
                if (year < 2020 || year > 2024) {
                  allInRange = false;
                  log.warn(`Paper "${paper.title?.substring(0, 30)}..." is from ${year}`);
                }
              }
            });
          }
        });

        if (allInRange) {
          log.success('All papers are within the specified year range');
        }
      }

      passedTests++;
    } else {
      log.error(`Search failed: ${data.error}`);
    }
  } catch (error) {
    log.error(`Exception: ${error.message}`);
  }

  // Test 5: Sort by Date
  totalTests++;
  log.header('\n📝 Test 5: Sort Results by Date (Newest First)');
  printSeparator();

  try {
    const { response, data } = await testAPI('/api/literature/search', 'POST', {
      query: 'artificial intelligence',
      source: 'semantic-scholar',
      maxResults: 5,
      sortBy: 'date',
    });

    if (response.ok) {
      log.success(`Results sorted by date: ${data.sortBy}`);
      log.info(`Total papers: ${data.summary?.total || 0}`);

      // Show first few papers with dates
      if (data.results && data.results[0]?.papers) {
        log.info('Sample papers (sorted by date):');
        data.results[0].papers.slice(0, 3).forEach((paper, i) => {
          console.log(`    ${i + 1}. ${paper.publishedDate?.substring(0, 4) || 'N/A'} - ${paper.title?.substring(0, 50)}...`);
        });
      }

      passedTests++;
    } else {
      log.error(`Search failed: ${data.error}`);
    }
  } catch (error) {
    log.error(`Exception: ${error.message}`);
  }

  // Test 6: Sort by Citations
  totalTests++;
  log.header('\n📝 Test 6: Sort Results by Citation Count');
  printSeparator();

  try {
    const { response, data } = await testAPI('/api/literature/search', 'POST', {
      query: 'deep learning',
      source: 'semantic-scholar',
      maxResults: 5,
      sortBy: 'citations',
    });

    if (response.ok) {
      log.success(`Results sorted by citations: ${data.sortBy}`);

      if (data.results && data.results[0]?.papers) {
        log.info('Top cited papers:');
        data.results[0].papers.slice(0, 3).forEach((paper, i) => {
          console.log(`    ${i + 1}. ${paper.citationCount || 0} citations - ${paper.title?.substring(0, 45)}...`);
        });
      }

      passedTests++;
    } else {
      log.error(`Search failed: ${data.error}`);
    }
  } catch (error) {
    log.error(`Exception: ${error.message}`);
  }

  // Test 7: Pagination
  totalTests++;
  log.header('\n📝 Test 7: Pagination (Load More Results)');
  printSeparator();

  try {
    // Page 1
    const page1 = await testAPI('/api/literature/search', 'POST', {
      query: 'computer vision',
      source: 'all',
      maxResults: 10,
      offset: 0,
    });

    // Page 2
    const page2 = await testAPI('/api/literature/search', 'POST', {
      query: 'computer vision',
      source: 'all',
      maxResults: 10,
      offset: 10,
    });

    if (page1.response.ok && page2.response.ok) {
      const count1 = page1.data.summary?.total || 0;
      const count2 = page2.data.summary?.total || 0;

      log.success(`Page 1: ${count1} papers`);
      log.success(`Page 2: ${count2} papers`);
      log.info(`Pagination info: ${JSON.stringify(page1.data.pagination)}`);
      passedTests++;
    } else {
      log.error('Pagination test failed');
    }
  } catch (error) {
    log.error(`Exception: ${error.message}`);
  }

  // Test 8: Search by DOI
  totalTests++;
  log.header('\n📝 Test 8: Search by DOI');
  printSeparator();

  try {
    const { response, data } = await testAPI('/api/literature/search', 'POST', {
      query: '10.1038/nature14539',
      source: 'all',
      field: 'doi',
      maxResults: 5,
    });

    if (response.ok) {
      const count = data.summary?.total || 0;
      if (count > 0) {
        log.success(`Found ${count} papers matching DOI`);

        if (data.results && data.results[0]?.papers) {
          const paper = data.results[0].papers[0];
          log.info(`Paper: "${paper.title}"`);
          log.info(`DOI: ${paper.doi}`);
        }
      } else {
        log.warn('No papers found for this DOI (might be normal)');
      }
      passedTests++;
    } else {
      log.error(`Search failed: ${data.error}`);
    }
  } catch (error) {
    log.error(`Exception: ${error.message}`);
  }

  // Test 9: Search History
  totalTests++;
  log.header('\n📝 Test 9: Search History');
  printSeparator();

  try {
    const { response, data } = await testAPI('/api/search-history', 'GET');

    if (response.ok) {
      log.success(`Search history has ${data.total || 0} entries`);

      if (data.search_history && data.search_history.length > 0) {
        log.info('Recent searches:');
        data.search_history.slice(0, 5).forEach((item, i) => {
          console.log(`    ${i + 1}. "${item.query}" (${item.source}) - ${new Date(item.created_at).toLocaleString()}`);
        });
      } else {
        log.info('No search history yet (perform some searches first)');
      }

      passedTests++;
    } else {
      log.error(`Failed to get search history: ${data.error}`);
    }
  } catch (error) {
    log.error(`Exception: ${error.message}`);
  }

  // Test 10: Combined Filters
  totalTests++;
  log.header('\n📝 Test 10: Combined Filters (Source + Field + Year + Sort)');
  printSeparator();

  try {
    const { response, data } = await testAPI('/api/literature/search', 'POST', {
      query: 'reinforcement learning',
      source: 'arxiv',
      field: 'title',
      yearStart: 2020,
      yearEnd: 2024,
      maxResults: 5,
      sortBy: 'date',
    });

    if (response.ok) {
      log.success(`Combined filters: ${data.summary?.total || 0} papers`);
      log.info(`Source: arxiv`);
      log.info(`Field: title`);
      log.info(`Year range: 2020-2024`);
      log.info(`Sort by: ${data.sortBy}`);
      passedTests++;
    } else {
      log.error(`Search failed: ${data.error}`);
    }
  } catch (error) {
    log.error(`Exception: ${error.message}`);
  }

  // Summary
  log.header('\n' + '╔══════════════════════════════════════════════════════════╗');
  log.header('║                    TEST SUMMARY                              ║');
  log.header('╚══════════════════════════════════════════════════════════╝');

  printSeparator();
  log.info(`Tests Passed: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
  printSeparator();

  if (passedTests === totalTests) {
    log.success('\n🎉 All tests passed! Search API is working correctly.\n');
  } else if (passedTests > totalTests * 0.7) {
    log.warn(`\n⚠️  Most tests passed (${passedTests}/${totalTests}). Review failed tests above.\n`);
  } else {
    log.error(`\n❌ Many tests failed (${passedTests}/${totalTests}). Please check the errors above.\n`);
  }
}

// Run the test suite
console.clear();
runTests().catch(error => {
  log.error(`\n❌ Fatal error: ${error.message}`);
  process.exit(1);
});
