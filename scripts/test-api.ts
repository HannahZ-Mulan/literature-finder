/**
 * Comprehensive API Test Script
 * Tests all backend endpoints systematically
 */

const BASE_URL = 'http://localhost:3004';

let authToken = '';
let userId = '';
let testLiteratureId = '';
let testCategoryId = '';
let testTagId = '';
let testReadingListId = '';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string, data?: any) {
  const result: TestResult = { name, passed, message, data };
  results.push(result);
  const icon = passed ? '✓' : '✗';
  console.log(`${icon} ${name}: ${message}`);
  if (data && !passed) {
    console.log('  Response:', JSON.stringify(data, null, 2));
  }
}

async function testAuth() {
  console.log('\n=== Testing Authentication APIs ===\n');

  // Test registration
  try {
    const randomEmail = `test${Date.now()}@example.com`;
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: randomEmail,
        password: 'test123456',
        name: 'Test User',
      }),
    });
    const data = await response.json();
    if (response.ok) {
      logTest('POST /api/auth/register', true, 'User registered successfully', data);
      userId = data.user.id;
    } else {
      logTest('POST /api/auth/register', false, data.error || 'Registration failed', data);
    }
  } catch (error: any) {
    logTest('POST /api/auth/register', false, error.message);
  }

  // Test login
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });
    const data = await response.json();
    if (response.ok) {
      authToken = data.token;
      userId = data.user.id;
      logTest('POST /api/auth/login', true, 'Login successful', { user: data.user });
    } else {
      logTest('POST /api/auth/login', false, data.error || 'Login failed', data);
    }
  } catch (error: any) {
    logTest('POST /api/auth/login', false, error.message);
  }
}

async function testLiterature() {
  console.log('\n=== Testing Literature APIs ===\n');

  // Test save literature
  try {
    const response = await fetch(`${BASE_URL}/api/literature/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: 'Test Paper for API Testing',
        authors: [{ name: 'Test Author' }, { name: 'Second Author' }],
        abstract: 'This is a test abstract for API testing purposes. It contains important research findings.',
        doi: `10.test/${Date.now()}`,
        publication_date: '2024-01-15',
        journal: 'Journal of Testing',
        citation_count: 42,
        source: 'semantic-scholar',
        keywords: ['testing', 'api'],
        notes: 'Test notes',
      }),
    });
    const data = await response.json();
    if (response.ok) {
      testLiteratureId = data.literature.id;
      logTest('POST /api/literature/save', true, 'Literature saved', { id: data.literature.id, title: data.literature.title });
    } else {
      logTest('POST /api/literature/save', false, data.error || 'Save failed', data);
    }
  } catch (error: any) {
    logTest('POST /api/literature/save', false, error.message);
  }

  // Test get library
  try {
    const response = await fetch(`${BASE_URL}/api/literature/library?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const data = await response.json();
    if (response.ok) {
      logTest('GET /api/literature/library', true, `Retrieved ${data.literature.length} items`, {
        total: data.pagination.total,
      });
    } else {
      logTest('GET /api/literature/library', false, data.error || 'Failed', data);
    }
  } catch (error: any) {
    logTest('GET /api/literature/library', false, error.message);
  }

  // Test search
  try {
    const response = await fetch(`${BASE_URL}/api/literature/library?search=test&page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const data = await response.json();
    if (response.ok) {
      logTest('GET /api/literature/library (search)', true, `Found ${data.literature.length} results`);
    } else {
      logTest('GET /api/literature/library (search)', false, data.error || 'Failed', data);
    }
  } catch (error: any) {
    logTest('GET /api/literature/library (search)', false, error.message);
  }
}

async function testCategories() {
  console.log('\n=== Testing Category APIs ===\n');

  // Test create category
  try {
    const response = await fetch(`${BASE_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: 'API Test Category', sort_order: 1 }),
    });
    const data = await response.json();
    if (response.ok) {
      testCategoryId = data.category.id;
      logTest('POST /api/categories', true, 'Category created', { id: data.category.id, name: data.category.name });
    } else {
      logTest('POST /api/categories', false, data.error || 'Failed', data);
    }
  } catch (error: any) {
    logTest('POST /api/categories', false, error.message);
  }

  // Test get categories
  try {
    const response = await fetch(`${BASE_URL}/api/categories`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const data = await response.json();
    if (response.ok) {
      logTest('GET /api/categories', true, `Retrieved ${data.categories.length} categories`);
    } else {
      logTest('GET /api/categories', false, data.error || 'Failed', data);
    }
  } catch (error: any) {
    logTest('GET /api/categories', false, error.message);
  }

  // Test add literature to category
  if (testLiteratureId && testCategoryId) {
    try {
      const response = await fetch(`${BASE_URL}/api/literature/${testLiteratureId}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ category_id: testCategoryId }),
      });
      const data = await response.json();
      if (response.ok) {
        logTest('POST /api/literature/{id}/categories', true, 'Added to category');
      } else {
        logTest('POST /api/literature/{id}/categories', false, data.error || 'Failed', data);
      }
    } catch (error: any) {
      logTest('POST /api/literature/{id}/categories', false, error.message);
    }
  }
}

async function testTags() {
  console.log('\n=== Testing Tag APIs ===\n');

  // Test create tag
  try {
    const response = await fetch(`${BASE_URL}/api/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: 'API Test', color: '#FF5733' }),
    });
    const data = await response.json();
    if (response.ok) {
      testTagId = data.tag.id;
      logTest('POST /api/tags', true, 'Tag created', { id: data.tag.id, name: data.tag.name });
    } else {
      logTest('POST /api/tags', false, data.error || 'Failed', data);
    }
  } catch (error: any) {
    logTest('POST /api/tags', false, error.message);
  }

  // Test get tags
  try {
    const response = await fetch(`${BASE_URL}/api/tags`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const data = await response.json();
    if (response.ok) {
      logTest('GET /api/tags', true, `Retrieved ${data.tags.length} tags`);
    } else {
      logTest('GET /api/tags', false, data.error || 'Failed', data);
    }
  } catch (error: any) {
    logTest('GET /api/tags', false, error.message);
  }

  // Test add tag to literature
  if (testLiteratureId && testTagId) {
    try {
      const response = await fetch(`${BASE_URL}/api/literature/${testLiteratureId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ tag_id: testTagId }),
      });
      const data = await response.json();
      if (response.ok) {
        logTest('POST /api/literature/{id}/tags', true, 'Tag added to literature');
      } else {
        logTest('POST /api/literature/{id}/tags', false, data.error || 'Failed', data);
      }
    } catch (error: any) {
      logTest('POST /api/literature/{id}/tags', false, error.message);
    }
  }
}

async function testReadingLists() {
  console.log('\n=== Testing Reading List APIs ===\n');

  // Test create reading list
  try {
    const response = await fetch(`${BASE_URL}/api/reading-lists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: 'API Test Reading List', description: 'Created during API testing' }),
    });
    const data = await response.json();
    if (response.ok) {
      testReadingListId = data.reading_list.id;
      logTest('POST /api/reading-lists', true, 'Reading list created', { id: data.reading_list.id });
    } else {
      logTest('POST /api/reading-lists', false, data.error || 'Failed', data);
    }
  } catch (error: any) {
    logTest('POST /api/reading-lists', false, error.message);
  }

  // Test get reading lists
  try {
    const response = await fetch(`${BASE_URL}/api/reading-lists`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const data = await response.json();
    if (response.ok) {
      logTest('GET /api/reading-lists', true, `Retrieved ${data.reading_lists.length} reading lists`);
    } else {
      logTest('GET /api/reading-lists', false, data.error || 'Failed', data);
    }
  } catch (error: any) {
    logTest('GET /api/reading-lists', false, error.message);
  }

  // Test add literature to reading list
  if (testLiteratureId && testReadingListId) {
    try {
      const response = await fetch(`${BASE_URL}/api/literature/${testLiteratureId}/reading-lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ reading_list_id: testReadingListId }),
      });
      const data = await response.json();
      if (response.ok) {
        logTest('POST /api/literature/{id}/reading-lists', true, 'Added to reading list');
      } else {
        logTest('POST /api/literature/{id}/reading-lists', false, data.error || 'Failed', data);
      }
    } catch (error: any) {
      logTest('POST /api/literature/{id}/reading-lists', false, error.message);
    }
  }
}

async function testSearchHistory() {
  console.log('\n=== Testing Search History APIs ===\n');

  // Test save search
  try {
    const response = await fetch(`${BASE_URL}/api/search-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ query: 'machine learning', source: 'semantic-scholar' }),
    });
    const data = await response.json();
    if (response.ok) {
      logTest('POST /api/search-history', true, 'Search saved to history');
    } else {
      logTest('POST /api/search-history', false, data.error || 'Failed', data);
    }
  } catch (error: any) {
    logTest('POST /api/search-history', false, error.message);
  }

  // Test get search history
  try {
    const response = await fetch(`${BASE_URL}/api/search-history`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const data = await response.json();
    if (response.ok) {
      logTest('GET /api/search-history', true, `Retrieved ${data.total} search history entries`);
    } else {
      logTest('GET /api/search-history', false, data.error || 'Failed', data);
    }
  } catch (error: any) {
    logTest('GET /api/search-history', false, error.message);
  }
}

async function testSettings() {
  console.log('\n=== Testing Settings APIs ===\n');

  // Test get settings
  try {
    const response = await fetch(`${BASE_URL}/api/settings`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const data = await response.json();
    if (response.ok) {
      logTest('GET /api/settings', true, 'Settings retrieved', data.settings);
    } else {
      logTest('GET /api/settings', false, data.error || 'Failed', data);
    }
  } catch (error: any) {
    logTest('GET /api/settings', false, error.message);
  }

  // Test update settings
  try {
    const response = await fetch(`${BASE_URL}/api/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        summary_length_level: 'short',
        default_export_format: 'apa',
      }),
    });
    const data = await response.json();
    if (response.ok) {
      logTest('POST /api/settings', true, 'Settings updated', data.settings);
    } else {
      logTest('POST /api/settings', false, data.error || 'Failed', data);
    }
  } catch (error: any) {
    logTest('POST /api/settings', false, error.message);
  }
}

async function testCitationExport() {
  console.log('\n=== Testing Citation Export APIs ===\n');

  if (!testLiteratureId) {
    logTest('GET /api/literature/{id}/export', false, 'No literature to test with');
    return;
  }

  const formats = ['bibtex', 'apa', 'mla', 'chicago'];

  for (const format of formats) {
    try {
      const response = await fetch(`${BASE_URL}/api/literature/${testLiteratureId}/export?format=${format}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (response.ok) {
        const text = await response.text();
        logTest(`GET /api/literature/{id}/export?format=${format}`, true, `Exported as ${format.toUpperCase()}`);
      } else {
        const data = await response.json();
        logTest(`GET /api/literature/{id}/export?format=${format}`, false, data.error || 'Failed', data);
      }
    } catch (error: any) {
      logTest(`GET /api/literature/{id}/export?format=${format}`, false, error.message);
    }
  }
}

async function testSummaries() {
  console.log('\n=== Testing AI Summary APIs ===\n');

  if (!testLiteratureId) {
    logTest('POST /api/literature/{id}/summary', false, 'No literature to test with');
    return;
  }

  // Test generate summary
  try {
    const response = await fetch(`${BASE_URL}/api/literature/${testLiteratureId}/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ length_level: 'short' }),
    });
    const data = await response.json();
    if (response.ok) {
      logTest('POST /api/literature/{id}/summary', true, `Summary generated (${data.length_level})`, {
        cached: data.cached,
        preview: data.summary.substring(0, 100) + '...',
      });
    } else {
      logTest('POST /api/literature/{id}/summary', false, data.error || 'Failed', data);
    }
  } catch (error: any) {
    logTest('POST /api/literature/{id}/summary', false, error.message);
  }

  // Test get existing summary
  try {
    const response = await fetch(`${BASE_URL}/api/literature/${testLiteratureId}/summary?length_level=short`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const data = await response.json();
    if (response.ok) {
      logTest('GET /api/literature/{id}/summary', true, 'Summary retrieved (cached)');
    } else if (response.status === 404) {
      logTest('GET /api/literature/{id}/summary', true, 'Correctly returns 404 when not found');
    } else {
      logTest('GET /api/literature/{id}/summary', false, data.error || 'Failed', data);
    }
  } catch (error: any) {
    logTest('GET /api/literature/{id}/summary', false, error.message);
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        Literature Finder API Test Suite                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  await testAuth();
  if (!authToken) {
    console.error('\n❌ Authentication failed. Cannot continue tests.');
    return;
  }

  await testLiterature();
  await testCategories();
  await testTags();
  await testReadingLists();
  await testSearchHistory();
  await testSettings();
  await testCitationExport();
  await testSummaries();

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Test Summary                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ✗ ${r.name}: ${r.message}`);
      });
    console.log('');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
