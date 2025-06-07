/**
 * Finance Service for WNTR Dashboard
 * 
 * This service handles real-time price data and dividend information fetching
 * Auto-updated by GitHub Actions monthly
 */

// Configuration
const WNTR_SYMBOL = 'WNTR';
const FINNHUB_API_KEY = process.env.REACT_APP_FINANCE_API_KEY || '';

// API endpoints
const FINNHUB_API_URL = `https://finnhub.io/api/v1/quote?symbol=${WNTR_SYMBOL}&token=${FINNHUB_API_KEY}`;

/**
 * Fetches real-time price data for WNTR
 * @returns {Promise<Object>} Current price information
 */
export const fetchRealTimePrice = async () => {
  try {
    console.log('Fetching price data from Finnhub...');
    const response = await fetch(FINNHUB_API_URL);
    
    if (!response.ok) {
      throw new Error('Price data API response was not ok');
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Finnhub API error: ${data.error}`);
    }
    
    return {
      currentPrice: data.c, // Current price
      previousClose: data.pc, // Previous close
      change: data.c - data.pc, // Change
      percentChange: ((data.c - data.pc) / data.pc) * 100, // Percent change
      high: data.h, // Day high
      low: data.l, // Day low
      timestamp: new Date().toLocaleString(), // Current time
    };
  } catch (error) {
    console.error('Error fetching real-time price from Finnhub:', error);
    
    // Return fallback data if API fails
    return {
      currentPrice: 36.79, 
      previousClose: 36.66,
      change: 0.13,
      percentChange: 0.36,
      high: 37.05,
      low: 36.55,
      timestamp: new Date().toLocaleString() + ' (Fallback data)',
    };
  }
};

/**
 * Fetches dividend history data for WNTR
 * This data is automatically updated by GitHub Actions
 * @returns {Promise<Array>} Dividend history
 */
export const fetchDividendHistory = async () => {
  try {
    // In production, you could also fetch from external APIs here as backup
    console.log('Loading WNTR dividend history...');
    
    // WNTR Monthly Dividend History (Auto-updated by GitHub Actions)
    // DO NOT MANUALLY EDIT BELOW - Updated automatically by scripts/check-monthly-dividend.js
    return [
      { month: "Jun", year: 2025, dividend: 2.1234, yield: 5.89, exDate: "2025-06-06" },
      { month: "May", year: 2025, dividend: 2.719, yield: 7.39, exDate: "2025-05-08" }
    ];
    // END AUTO-UPDATE SECTION
    
  } catch (error) {
    console.error('Error fetching dividend history:', error);
    
    // Fallback to last known data
    return [
      { month: "May", year: 2025, dividend: 2.719, yield: 7.39, exDate: "2025-05-08" }
    ];
  }
};

/**
 * Calculates yield based on dividend amount and price
 * @param {number} dividendAmount - Dividend amount
 * @param {number} price - Current price
 * @returns {number} Calculated yield percentage
 */
export const calculateYield = (dividendAmount, price) => {
  return (dividendAmount / price) * 100;
};

/**
 * Calculates annualized yield based on monthly dividends
 * @param {Array} dividends - Array of dividend objects
 * @param {number} currentPrice - Current price
 * @returns {number} Annualized yield percentage
 */
export const calculateAnnualizedYield = (dividends, currentPrice) => {
  if (!dividends || dividends.length === 0 || !currentPrice) {
    return 0;
  }
  
  // Use up to 12 most recent months
  const recentDividends = dividends.slice(0, Math.min(12, dividends.length));
  const totalDividend = recentDividends.reduce((sum, item) => sum + item.dividend, 0);
  
  // If we have less than 12 months of data, annualize it
  const annualFactor = 12 / recentDividends.length;
  const annualizedDividend = totalDividend * annualFactor;
  
  return (annualizedDividend / currentPrice) * 100;
};

/**
 * Checks for and adds new dividend data
 * This function is primarily used by the automated system
 * @param {Array} currentDividends - Current dividend array
 * @param {number} currentPrice - Current stock price
 * @returns {Promise<Array>} Updated dividend array
 */
export const checkForNewDividendData = async (currentDividends, currentPrice) => {
  try {
    // The automated system handles updates, but we can still do basic checks
    const today = new Date();
    const currentMonth = today.toLocaleString('default', { month: 'short' });
    const currentYear = today.getFullYear();
    
    // Check if we already have the current month's dividend
    const hasCurrentMonth = currentDividends.some(
      div => div.month === currentMonth && div.year === currentYear
    );
    
    if (!hasCurrentMonth) {
      console.log(`No dividend found for ${currentMonth} ${currentYear} yet. Automated system will check soon.`);
    }
    
    // Return original array - automated system handles updates
    return currentDividends;
  } catch (error) {
    console.error('Error checking for new dividend data:', error);
    return currentDividends;
  }
};