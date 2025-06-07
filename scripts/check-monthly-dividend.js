const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const WNTR_SYMBOL = 'WNTR';
const SOURCES = {
  // Free APIs for dividend data
  POLYGON: process.env.POLYGON_API_KEY ? `https://api.polygon.io/v3/reference/dividends?ticker=${WNTR_SYMBOL}&limit=10&apikey=${process.env.POLYGON_API_KEY}` : null,
  ALPHA_VANTAGE: process.env.ALPHA_VANTAGE_API_KEY ? `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${WNTR_SYMBOL}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}` : null,
  
  // Web scraping sources (as backup)
  STOCKANALYSIS: 'https://stockanalysis.com/etf/wntr/dividend/',
  YAHOO_FINANCE: `https://finance.yahoo.com/quote/${WNTR_SYMBOL}/history?period1=1609459200&period2=9999999999&interval=1d&filter=div&frequency=1d`,
  SEEKING_ALPHA: `https://seekingalpha.com/symbol/${WNTR}/dividends`
};

/**
 * Get current dividend data from financeService.js
 */
async function getCurrentDividendData() {
  try {
    const financeServicePath = path.join(__dirname, '..', 'src', 'services', 'financeService.js');
    const content = await fs.readFile(financeServicePath, 'utf8');
    
    // Extract the dividend array from the return statement
    const match = content.match(/return \[([\s\S]*?)\];/);
    if (match) {
      const dividendArrayStr = match[1];
      // Parse the dividend objects (simplified parsing)
      const dividends = [];
      const dividendMatches = dividendArrayStr.match(/\{[^}]+\}/g);
      
      if (dividendMatches) {
        dividendMatches.forEach(div => {
          const monthMatch = div.match(/month:\s*"([^"]+)"/);
          const yearMatch = div.match(/year:\s*(\d+)/);
          const dividendMatch = div.match(/dividend:\s*([\d.]+)/);
          
          if (monthMatch && yearMatch && dividendMatch) {
            dividends.push({
              month: monthMatch[1],
              year: parseInt(yearMatch[1]),
              dividend: parseFloat(dividendMatch[1])
            });
          }
        });
      }
      
      return dividends;
    }
    
    return [];
  } catch (error) {
    console.error('Error reading current dividend data:', error);
    return [];
  }
}

/**
 * Check Polygon.io for new dividend data
 */
async function checkPolygonAPI() {
  if (!SOURCES.POLYGON) {
    console.log('Polygon API key not configured');
    return null;
  }

  try {
    console.log('Checking Polygon.io for WNTR dividends...');
    const response = await axios.get(SOURCES.POLYGON, {
      timeout: 10000
    });

    if (response.data && response.data.results && response.data.results.length > 0) {
      const latestDividend = response.data.results[0];
      const exDate = new Date(latestDividend.ex_dividend_date);
      
      return {
        month: exDate.toLocaleString('default', { month: 'short' }),
        year: exDate.getFullYear(),
        dividend: latestDividend.cash_amount,
        exDate: latestDividend.ex_dividend_date,
        source: 'Polygon.io'
      };
    }
  } catch (error) {
    console.error('Error checking Polygon API:', error.message);
  }
  
  return null;
}

/**
 * Scrape StockAnalysis.com for dividend data
 */
async function scrapeStockAnalysis() {
  try {
    console.log('Scraping StockAnalysis.com for WNTR dividends...');
    const response = await axios.get(SOURCES.STOCKANALYSIS, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Look for dividend table
    const dividendRows = $('table tr').slice(1); // Skip header
    const latestRow = dividendRows.first();
    
    if (latestRow.length > 0) {
      const cells = latestRow.find('td');
      if (cells.length >= 3) {
        const dateText = $(cells[0]).text().trim();
        const amountText = $(cells[1]).text().trim().replace('$', '');
        
        const date = new Date(dateText);
        if (!isNaN(date.getTime())) {
          return {
            month: date.toLocaleString('default', { month: 'short' }),
            year: date.getFullYear(),
            dividend: parseFloat(amountText),
            exDate: date.toISOString().split('T')[0],
            source: 'StockAnalysis.com'
          };
        }
      }
    }
  } catch (error) {
    console.error('Error scraping StockAnalysis:', error.message);
  }
  
  return null;
}

/**
 * Check if we have a new dividend compared to current data
 */
function isNewDividend(newDiv, currentDividends) {
  if (!newDiv) return false;
  
  return !currentDividends.some(existing => 
    existing.month === newDiv.month && 
    existing.year === newDiv.year
  );
}

/**
 * Update the financeService.js file with new dividend data
 */
async function updateFinanceService(newDividend, currentDividends) {
  try {
    const financeServicePath = path.join(__dirname, '..', 'src', 'services', 'financeService.js');
    let content = await fs.readFile(financeServicePath, 'utf8');
    
    // Calculate yield (rough estimate based on typical WNTR price ~$37)
    const estimatedPrice = 37; // You could fetch real price here
    const yieldPercent = ((newDividend.dividend / estimatedPrice) * 100).toFixed(2);
    
    // Create new dividend entry
    const newDividendEntry = `      { month: "${newDividend.month}", year: ${newDividend.year}, dividend: ${newDividend.dividend}, yield: ${yieldPercent}, exDate: "${newDividend.exDate}" },`;
    
    // Find the dividend array and add the new entry at the beginning
    const arrayMatch = content.match(/(return \[)([\s\S]*?)(\];)/);
    if (arrayMatch) {
      const beforeArray = arrayMatch[1];
      const existingArray = arrayMatch[2];
      const afterArray = arrayMatch[3];
      
      // Add new dividend at the beginning (most recent first)
      const updatedArray = beforeArray + '\n' + newDividendEntry + existingArray + afterArray;
      content = content.replace(arrayMatch[0], updatedArray);
      
      await fs.writeFile(financeServicePath, content);
      console.log(`✅ Added new ${newDividend.month} ${newDividend.year} dividend ($${newDividend.dividend}) from ${newDividend.source}`);
      return true;
    }
  } catch (error) {
    console.error('Error updating financeService.js:', error);
  }
  
  return false;
}

/**
 * Main function to check for new monthly dividends
 */
async function checkForNewMonthlyDividend() {
  console.log('🔍 Checking for new WNTR monthly dividend...');
  
  // Get current dividend data
  const currentDividends = await getCurrentDividendData();
  console.log(`Current dividend data: ${currentDividends.length} entries`);
  
  // Check multiple sources for new dividend data
  const sources = [
    checkPolygonAPI,
    scrapeStockAnalysis
  ];
  
  for (const checkSource of sources) {
    try {
      const newDividend = await checkSource();
      
      if (newDividend && isNewDividend(newDividend, currentDividends)) {
        console.log(`🎉 New dividend found: ${newDividend.month} ${newDividend.year} - $${newDividend.dividend}`);
        
        const updated = await updateFinanceService(newDividend, currentDividends);
        if (updated) {
          console.log('✅ Successfully updated dividend data!');
          process.exit(0); // Success
        }
      }
    } catch (error) {
      console.error(`Error checking source:`, error.message);
      continue; // Try next source
    }
  }
  
  console.log('ℹ️  No new dividend data found this check.');
  process.exit(0);
}

// Run the check
if (require.main === module) {
  checkForNewMonthlyDividend().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { checkForNewMonthlyDividend };