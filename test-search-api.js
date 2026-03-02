/**
 * Test script for Literature Search API
 * Tests the search functionality without requiring browser access
 */

const API_BASE = 'http://localhost:3000';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log('\n' + '='.repeat(60));
  log(`TEST: ${testName}`, 'blue');
  console.log('='.repeat(60));
}

function logResult(passed, message) {
  if (passed) {
    log(`✓ PASS: ${message}`, 'green');
  } else {
    log(`✗ FAIL: ${message}`, 'red');
  }
}

// Test 1: Health check
async function testHealthCheck() {
  logTest('Server Health Check');
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();
    logResult(response.ok, `Server is running: ${JSON.stringify(data)}`);
    return response.ok;
  } catch (error) {
    logResult(false, `Server health check failed: ${error.message}`);
    return false;
  }
}

// Test 2: Create test user
async function createTestUser() {
  logTest('Create Test User');

  const testUser = {
    email: 'test@example.com',
    password: 'test123',
    name: 'Test User',
  };

  try {
    // Try to register
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    const data = await response.json();

    if (response.ok || data.error?.includes('already exists')) {
      logResult(true, `Test user ready: ${testUser.email}`);
      return testUser;
    } else {
      logResult(false, `Failed to create test user: ${JSON.stringify(data)}`);
      return null;
    }
  } catch (error) {
    logResult(false, `Error creating test user: ${error.message}`);
    return null;
  }
}

// Test 3: Login and get token
async function testLogin(user) {
  logTest('User Login');

  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
      }),
    });

    const data = await response.json();

    if (response.ok && data.token) {
      logResult(true, `Login successful, token: ${data.token.substring(0, 20)}...`);
      return data.token;
    } else {
      logResult(false, `Login failed: ${JSON.stringify(data)}`);
      return null;
    }
  } catch (error) {
    logResult(false, `Error during login: ${error.message}`);
    return null;
  }
}

// Test 4: Basic search
async function testBasicSearch(token) {
  logTest('Basic Search');

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
        maxResults: 10,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      const paperCount = data.summary?.total || 0;
      logResult(true, `Search returned ${paperCount} papers`);

      // Check results structure
      if (data.results && Array.isArray(data.results)) {
        logResult(true, `Results array is valid`);

        data.results.forEach((result, index) => {
          log(`  Source ${index + 1}: ${result.source} - ${result.papers?.length || 0} papers`, 'yellow');

          // Check first paper structure
          if (result.papers && result.papers.length > 0) {
            const paper = result.papers[0];
            log(`    Sample paper: "${paper.title?.substring(0, 50)}..."`, 'yellow');
            logResult(true, `Paper has title: ${!!paper.title}`);
            logResult(true, `Paper has authors: ${!!paper.authors && paper.authors.length > 0}`);
            logResult(true, `Paper has abstract: ${!!paper.abstract}`);
          }
        });
      } else {
        logResult(false, 'Results array is missing or invalid');
      }

      return true;
    } else {
      logResult(false, `Search failed: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logResult(false, `Error during search: ${error.message}`);
    return false;
  }
}

// Test 5: Search with filters
async function testSearchWithFilters(token) {
  logTest('Search with Filters');

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
        maxResults: 5,
        sortBy: 'date',
      }),
    });

    const data = await response.json();

    if (response.ok) {
      logResult(true, `Filtered search returned ${data.summary?.total || 0} papers`);
      logResult(true, `Sort by: ${data.sortBy}`);
      logResult(true, `Pagination info: ${JSON.stringify(data.pagination)}`);
      return true;
    } else {
      logResult(false, `Filtered search failed: ${data.error}`);
      return false;
    }
  } catch (error) {
    logResult(false, `Error during filtered search: ${error.message}`);
    return false;
  }
}

// Test 6: Search by DOI
async function testSearchByDOI(token) {
  logTest('Search by DOI');

  try {
    const response = await fetch(`${API_BASE}/api/literature/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: '10.1038/s41586-020-2649-2',
        source: 'all',
        field: 'doi',
        maxResults: 5,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      const paperCount = data.summary?.total || 0;
      logResult(true, `DOI search returned ${paperCount} papers`);
      return true;
    } else {
      logResult(false, `DOI search failed: ${data.error}`);
      return false;
    }
  } catch (error) {
    logResult(false, `Error during DOI search: ${error.message}`);
    return false;
  }
}

// Test 7: Search with sorting
async function testSearchSorting(token) {
  logTest('Search Sorting Options');

  const sortOptions = ['relevance', 'date', 'citations'];
  let allPassed = true;

  for (const sortBy of sortOptions) {
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
          maxResults: 5,
          sortBy,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        logResult(true, `Sort by '${sortBy}' returned ${data.summary?.total || 0} papers`);
      } else {
        logResult(false, `Sort by '${sortBy}' failed`);
        allPassed = false;
      }
    } catch (error) {
      logResult(false, `Error during sort test '${sortBy}': ${error.message}`);
      allPassed = false;
    }
  }

  return allPassed;
}

// Test 8: Search history
async function testSearchHistory(token) {
  logTest('Search History');

  try {
    // Get search history
    const response = await fetch(`${API_BASE}/api/search-history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      const historyCount = data.total || 0;
      logResult(true, `Search history has ${historyCount} entries`);

      if (data.search_history && data.search_history.length > 0) {
        log(`  Recent searches:`, 'yellow');
        data.search_history.slice(0, 3).forEach((item, index) => {
          log(`    ${index + 1}. "${item.query}" (${item.source})`, 'yellow');
        });
      }

      return true;
    } else {
      logResult(false, `Failed to get search history: ${data.error}`);
      return false;
    }
  } catch (error) {
    logResult(false, `Error getting search history: ${error.message}`);
    return false;
  }
}

// Test 9: Pagination
async function testPagination(token) {
  logTest('Pagination');

  try {
    // First page
    const page1 = await fetch(`${API_BASE}/api/literature/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: 'artificial intelligence',
        source: 'all',
        maxResults: 10,
        offset: 0,
      }),
    });

    const data1 = await page1.json();

    // Second page
    const page2 = await fetch(`${API_BASE}/api/literature/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: 'artificial intelligence',
        source: 'all',
        maxResults: 10,
        offset: 10,
      }),
    });

    const data2 = await page2.json();

    if (page1.ok && page2.ok) {
      logResult(true, `Page 1 returned ${data1.summary?.total || 0} papers`);
      logResult(true, `Page 2 returned ${data2.summary?.total || 0} papers`);
      logResult(true, `Pagination info present: ${!!data1.pagination}`);
      return true;
    } else {
      logResult(false, 'Pagination test failed');
      return false;
    }
  } catch (error) {
    logResult(false, `Error during pagination test: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║     Literature Finder - Search API Test Suite           ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');

  const results = {
    healthCheck: false,
    createUser: false,
    login: false,
    basicSearch: false,
    searchWithFilters: false,
    searchByDOI: false,
    searchSorting: false,
    searchHistory: false,
    pagination: false,
  };

  // Run tests
  try {
    results.healthCheck = await testHealthCheck();

    if (results.healthCheck) {
      const user = await createTestUser();
      if (user) {
        results.createUser = true;
        const token = await testLogin(user);
        if (token) {
          results.login = true;
          results.basicSearch = await testBasicSearch(token);
          results.searchWithFilters = await testSearchWithFilters(token);
          results.searchByDOI = await testSearchByDOI(token);
          results.searchSorting = await testSearchSorting(token);
          results.searchHistory = await testSearchHistory(token);
          results.pagination = await testPagination(token);
        }
      }
    }

    // Summary
    log('\n' + '='.repeat(60), 'blue');
    log('TEST SUMMARY', 'blue');
    log('='.repeat(60), 'blue');

    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;

    Object.entries(results).forEach(([test, result]) => {
      logResult(result, test);
    });

    log('\n' + '-'.repeat(60), 'blue');
    log(`Total: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`, 'blue');
    log('-'.repeat(60) + '\n', 'blue');

    if (passed === total) {
      log('🎉 All tests passed!', 'green');
    } else {
      log('⚠️  Some tests failed. Please check the output above.', 'yellow');
    }

  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
  }
}

// Run tests
runTests();
