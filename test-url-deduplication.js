// Test script to demonstrate URL deduplication functionality
// This script can be run to test the new URL caching and deduplication system

const SUPABASE_URL = 'https://xjjjvefsrkcszhuwtoss.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqamp2ZWZzcmtjc3podXd0b3NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNDQxMzQsImV4cCI6MjA0OTkyMDEzNH0.KXnWfyY8mWWN5ktCMFAPKGgCE1F3SFlAhUIBxJtF5tE';

async function testUrlDeduplication() {
  console.log('🧪 Testing URL Deduplication System');
  console.log('====================================');

  try {
    // Test 1: First research for Google Software Engineer
    console.log('\n📊 Test 1: Initial research for Google Software Engineer (should scrape fresh URLs)');
    const firstSearch = await testCompanyResearch('Google', 'Software Engineer', 'US');
    console.log(`✅ First search completed. Sources: ${firstSearch.research_sources}, Optimization: ${JSON.stringify(firstSearch.optimization_info)}`);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Same research again (should use cached content)
    console.log('\n🔄 Test 2: Same research again (should use cached URLs and skip fresh search)');
    const secondSearch = await testCompanyResearch('Google', 'Software Engineer', 'US');
    console.log(`✅ Second search completed. Sources: ${secondSearch.research_sources}, Optimization: ${JSON.stringify(secondSearch.optimization_info)}`);

    // Test 3: Similar role at Google (should reuse some URLs)
    console.log('\n🔍 Test 3: Similar role at Google - Senior Software Engineer (should reuse some content)');
    const thirdSearch = await testCompanyResearch('Google', 'Senior Software Engineer', 'US');
    console.log(`✅ Third search completed. Sources: ${thirdSearch.research_sources}, Optimization: ${JSON.stringify(thirdSearch.optimization_info)}`);

    // Test 4: Different company (should start fresh)
    console.log('\n🏢 Test 4: Different company - Microsoft (should start fresh but may exclude some domains)');
    const fourthSearch = await testCompanyResearch('Microsoft', 'Software Engineer', 'US');
    console.log(`✅ Fourth search completed. Sources: ${fourthSearch.research_sources}, Optimization: ${JSON.stringify(fourthSearch.optimization_info)}`);

    console.log('\n🎉 All tests completed! Check the optimization_info in each response to see how the system:');
    console.log('   - Reused cached URLs when possible');
    console.log('   - Skipped fresh searches when enough cached content was available');
    console.log('   - Excluded domains with low-quality content');
    console.log('   - Optimized API usage and reduced costs');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function testCompanyResearch(company, role, country) {
  // Create a dummy search ID for this test
  const searchId = generateUUID();
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/company-research`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      company,
      role,
      country,
      searchId
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Run the test
testUrlDeduplication();