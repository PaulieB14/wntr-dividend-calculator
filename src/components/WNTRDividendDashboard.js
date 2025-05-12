import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  fetchRealTimePrice, 
  fetchDividendHistory,
  calculateAnnualizedYield,
  checkForNewDividendData
} from '../services/financeService';
import TradingViewWidget from './TradingViewWidget';

const WNTRDividendDashboard = () => {
  // State for price, dividend data, and loading status
  const [priceData, setPriceData] = useState({
    currentPrice: 0,
    previousClose: 0,
    change: 0,
    percentChange: 0,
    timestamp: ''
  });
  const [dividendHistory, setDividendHistory] = useState([]);
  const [averageMonthlyDividend, setAverageMonthlyDividend] = useState(0);
  const [annualYield, setAnnualYield] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [darkMode, setDarkMode] = useState(false);

  // State for user input
  const [investmentAmount, setInvestmentAmount] = useState(20000);
  const [customDividendAmount, setCustomDividendAmount] = useState('');
  const [useCustomDividend, setUseCustomDividend] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [calculatedResults, setCalculatedResults] = useState(null);
  
  // Function to load all data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch real-time price data
      const price = await fetchRealTimePrice();
      setPriceData(price);
      
      // Fetch dividend history
      let dividends = await fetchDividendHistory();
      
      // Check for new dividend data
      dividends = await checkForNewDividendData(dividends, price.currentPrice);
      
      // Sort by date (newest first)
      dividends.sort((a, b) => {
        const dateA = new Date(b.year, getMonthNumber(b.month));
        const dateB = new Date(a.year, getMonthNumber(a.month));
        return dateA - dateB;
      });
      
      setDividendHistory(dividends);
      
      // Calculate average monthly dividend
      const totalDividends = dividends.reduce((sum, item) => sum + item.dividend, 0);
      const avgDividend = totalDividends / dividends.length;
      setAverageMonthlyDividend(avgDividend);
      
      // Calculate annualized yield
      const yield12Month = calculateAnnualizedYield(dividends, price.currentPrice);
      setAnnualYield(yield12Month);
      
      // Update last updated timestamp
      setLastUpdated(new Date().toLocaleString());
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError(`Failed to load data: ${err.message || 'Unknown error'}. Please check your API key configuration.`);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to convert month name to number
  const getMonthNumber = (monthName) => {
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    return months[monthName] || 0;
  };

  // Initial data load
  useEffect(() => {
    loadData();
    
    // Set up periodic refresh every 5 minutes (300000 ms)
    const refreshInterval = setInterval(() => {
      setRefreshCounter(prev => prev + 1);
    }, 300000);
    
    // Check if dark mode preference exists in localStorage
    const savedDarkMode = localStorage.getItem('wntrDarkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    } else {
      // Check if user prefers dark mode at the system level
      const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDarkMode);
    }
    
    return () => clearInterval(refreshInterval);
  }, []);
  
  // Refresh data when refresh counter changes
  useEffect(() => {
    if (refreshCounter > 0) {
      loadData();
    }
  }, [refreshCounter]);

  // Update body class and localStorage when dark mode changes
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('wntrDarkMode', darkMode);
  }, [darkMode]);

  // Function to calculate returns
  const calculateReturns = (amount) => {
    if (!priceData.currentPrice || priceData.currentPrice === 0) {
      return null;
    }
    
    const sharesOwned = amount / priceData.currentPrice;
    
    // Determine which dividend amount to use based on user selection
    const effectiveDividendAmount = useCustomDividend && customDividendAmount 
      ? parseFloat(customDividendAmount) 
      : averageMonthlyDividend;
    
    // Expected monthly dividend based on selected amount
    const expectedMonthlyDividend = effectiveDividendAmount * sharesOwned;
    
    // Expected annual dividend
    const expectedAnnualDividend = expectedMonthlyDividend * 12;
    
    // Calculate annualized yield based on custom or average dividend
    const effectiveAnnualYield = (effectiveDividendAmount * 12 / priceData.currentPrice) * 100;
    
    // Calculate historical returns if invested one year ago
    // Use up to 12 most recent months
    const lastYearDividends = dividendHistory.slice(0, Math.min(12, dividendHistory.length));
    const historicalDividendTotal = lastYearDividends.reduce((sum, item) => sum + item.dividend, 0);
    const historicalReturn = historicalDividendTotal * sharesOwned;
    
    // Calculate historical monthly returns
    const monthlyReturns = dividendHistory.map(item => ({
      label: `${item.month} ${item.year}`,
      dividend: item.dividend,
      return: (item.dividend * sharesOwned).toFixed(2)
    }));
    
    // For scenarios with custom dividend, create projected returns for next 12 months
    let projectedReturns = [];
    if (useCustomDividend && customDividendAmount) {
      const today = new Date();
      for (let i = 0; i < 12; i++) {
        const futureDate = new Date(today);
        futureDate.setMonth(today.getMonth() + i);
        projectedReturns.push({
          label: `${futureDate.toLocaleString('default', { month: 'short' })} ${futureDate.getFullYear()}`,
          dividend: parseFloat(customDividendAmount),
          return: (parseFloat(customDividendAmount) * sharesOwned).toFixed(2),
          isProjected: true
        });
      }
    }
    
    return {
      sharesOwned: sharesOwned.toFixed(2),
      expectedMonthlyDividend: expectedMonthlyDividend.toFixed(2),
      expectedAnnualDividend: expectedAnnualDividend.toFixed(2),
      expectedAnnualYieldPercentage: effectiveAnnualYield.toFixed(2),
      historicalReturn: historicalReturn.toFixed(2),
      monthlyReturns,
      projectedReturns,
      isCustomScenario: useCustomDividend && customDividendAmount ? true : false,
      scenarioName: scenarioName || (useCustomDividend ? 'Custom Scenario' : 'Historical Average')
    };
  };

  // Calculate results when investment amount or price/dividend data changes
  useEffect(() => {
    if (!loading && !error) {
      setCalculatedResults(calculateReturns(investmentAmount));
    }
  }, [investmentAmount, priceData, dividendHistory, averageMonthlyDividend, annualYield, loading, error, useCustomDividend, customDividendAmount, scenarioName]);

  // Handle input change
  const handleAmountChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setInvestmentAmount(value);
    }
  };

  // Handle custom dividend amount change
  const handleCustomDividendChange = (e) => {
    const value = e.target.value;
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      setCustomDividendAmount(value);
    }
  };

  // Handle checkbox change for using custom dividend
  const handleUseCustomDividendChange = (e) => {
    setUseCustomDividend(e.target.checked);
  };

  // Handle scenario name change
  const handleScenarioNameChange = (e) => {
    setScenarioName(e.target.value);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Apply preset dividend scenarios
  const applyPresetScenario = (type) => {
    switch(type) {
      case 'bullish':
        // Bullish scenario - 50% higher than average
        const bullishAmount = (averageMonthlyDividend * 1.5).toFixed(4);
        setCustomDividendAmount(bullishAmount);
        setScenarioName('Bullish Scenario (+50%)');
        setUseCustomDividend(true);
        break;
      case 'bearish':
        // Bearish scenario - 50% lower than average
        const bearishAmount = (averageMonthlyDividend * 0.5).toFixed(4);
        setCustomDividendAmount(bearishAmount);
        setScenarioName('Bearish Scenario (-50%)');
        setUseCustomDividend(true);
        break;
      case 'highest':
        // Use highest historical dividend
        const highestDividend = Math.max(...dividendHistory.map(item => item.dividend));
        setCustomDividendAmount(highestDividend.toFixed(4));
        setScenarioName('Peak Performance');
        setUseCustomDividend(true);
        break;
      case 'lowest':
        // Use lowest historical dividend
        const lowestDividend = Math.min(...dividendHistory.map(item => item.dividend));
        setCustomDividendAmount(lowestDividend.toFixed(4));
        setScenarioName('Minimum Performance');
        setUseCustomDividend(true);
        break;
      case 'reset':
        // Reset to historical average
        setUseCustomDividend(false);
        setCustomDividendAmount('');
        setScenarioName('');
        break;
      default:
        break;
    }
  };

  // Function to handle preset amount buttons
  const handlePresetAmount = (amount) => {
    setInvestmentAmount(amount);
  };
  
  // Handle manual refresh
  const handleRefresh = () => {
    loadData();
  };

  // Format chart data
  const chartData = dividendHistory.map(item => ({
    ...item,
    label: `${item.month} ${item.year}`
  }));

  // Format class names based on dark mode
  const getThemeClasses = {
    container: darkMode 
      ? "bg-gray-900 text-white p-6 rounded-lg shadow-lg max-w-6xl mx-auto" 
      : "bg-slate-50 p-6 rounded-lg shadow-lg max-w-6xl mx-auto",
    card: darkMode 
      ? "bg-gray-800 p-6 rounded-lg shadow-md" 
      : "bg-white p-6 rounded-lg shadow-md",
    statsCard: darkMode 
      ? "bg-gray-800 p-4 rounded-lg shadow-md" 
      : "bg-white p-4 rounded-lg shadow-md",
    button: darkMode 
      ? "bg-indigo-900 text-indigo-100 px-3 py-1 rounded-md hover:bg-indigo-800" 
      : "bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200",
    refreshButton: darkMode 
      ? "bg-indigo-900 text-indigo-100 px-3 py-1 rounded-md hover:bg-indigo-800 flex items-center" 
      : "bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 flex items-center",
    scenario: darkMode 
      ? "mb-6 p-4 border border-dashed border-gray-600 rounded-md bg-gray-800" 
      : "mb-6 p-4 border border-dashed border-gray-300 rounded-md bg-gray-50",
    bullishBtn: darkMode 
      ? "bg-green-900 text-green-100 px-3 py-1 rounded-md hover:bg-green-800" 
      : "bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200",
    bearishBtn: darkMode 
      ? "bg-red-900 text-red-100 px-3 py-1 rounded-md hover:bg-red-800" 
      : "bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200",
    peakBtn: darkMode 
      ? "bg-purple-900 text-purple-100 px-3 py-1 rounded-md hover:bg-purple-800" 
      : "bg-purple-100 text-purple-700 px-3 py-1 rounded-md hover:bg-purple-200",
    minimumBtn: darkMode 
      ? "bg-amber-900 text-amber-100 px-3 py-1 rounded-md hover:bg-amber-800" 
      : "bg-amber-100 text-amber-700 px-3 py-1 rounded-md hover:bg-amber-200",
    resetBtn: darkMode 
      ? "bg-gray-700 text-gray-200 px-3 py-1 rounded-md hover:bg-gray-600" 
      : "bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200",
    input: darkMode 
      ? "border border-gray-600 bg-gray-700 rounded-md px-4 py-2 w-full text-white" 
      : "border border-gray-300 rounded-md px-4 py-2 w-full",
    checkbox: darkMode 
      ? "mr-2 h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600" 
      : "mr-2 h-4 w-4 text-blue-600",
    title: darkMode 
      ? "text-3xl font-bold text-indigo-400 mb-2" 
      : "text-3xl font-bold text-blue-800 mb-2",
    subtitle: darkMode 
      ? "text-2xl font-bold text-gray-200 mb-4" 
      : "text-2xl font-bold text-gray-800 mb-4",
    chartTitle: darkMode 
      ? "text-xl font-bold text-gray-200 mb-4" 
      : "text-xl font-bold text-gray-800 mb-4",
    scenarioBanner: darkMode 
      ? "mb-4 p-3 bg-indigo-900 border-l-4 border-indigo-500 rounded-md" 
      : "mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-md",
    scenarioText: darkMode 
      ? "text-indigo-100 font-medium" 
      : "text-blue-800 font-medium",
    sharesCard: darkMode 
      ? "bg-indigo-900 p-4 rounded-md" 
      : "bg-blue-50 p-4 rounded-md",
    sharesText: darkMode 
      ? "text-2xl font-bold text-indigo-200" 
      : "text-2xl font-bold text-blue-700",
    monthlyCard: darkMode 
      ? "bg-green-900 p-4 rounded-md" 
      : "bg-green-50 p-4 rounded-md",
    monthlyText: darkMode 
      ? "text-2xl font-bold text-green-200" 
      : "text-2xl font-bold text-green-700",
    annualCard: darkMode 
      ? "bg-purple-900 p-4 rounded-md" 
      : "bg-purple-50 p-4 rounded-md",
    annualText: darkMode 
      ? "text-2xl font-bold text-purple-200" 
      : "text-2xl font-bold text-purple-700",
    returnCard: darkMode 
      ? "bg-amber-900 p-4 rounded-md" 
      : "bg-amber-50 p-4 rounded-md",
    returnText: darkMode 
      ? "text-2xl font-bold text-amber-200" 
      : "text-2xl font-bold text-amber-700",
    tableHeader: darkMode 
      ? "bg-gray-900" 
      : "bg-gray-100",
    tableRow: darkMode 
      ? "even:bg-gray-800 odd:bg-gray-900" 
      : "even:bg-white odd:bg-gray-50",
    errorBanner: darkMode 
      ? "bg-red-900 border-l-4 border-red-600 text-red-100 p-4 mb-6 rounded-md" 
      : "bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md",
    warningBanner: darkMode 
      ? "bg-yellow-900 border-l-4 border-yellow-600 text-yellow-100 p-4 mb-6 rounded-md" 
      : "bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-md",
  };

  return (
    <div className={getThemeClasses.container}>
      <div className="mb-6 text-center relative">
        <h1 className={getThemeClasses.title}>WNTR Dividend Calculator Dashboard</h1>
        <p className={darkMode ? "text-gray-400" : "text-gray-600"}>Calculate expected returns from WNTR based on real-time data</p>
        
        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleDarkMode} 
          className="absolute right-0 top-0 p-2 rounded-full"
          aria-label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
        
        {/* Refresh status and button */}
        <div className="mt-3 flex justify-center items-center space-x-2">
          <span className={darkMode ? "text-sm text-gray-400" : "text-sm text-gray-500"}>
            Last updated: {lastUpdated || 'Never'}
          </span>
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className={getThemeClasses.refreshButton}
          >
            <svg 
              className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>
      
      {/* Environment variable check notice */}
      {!process.env.REACT_APP_FINANCE_API_KEY && (
        <div className={getThemeClasses.warningBanner}>
          <p className="font-bold">API Key Not Found</p>
          <p>Finnhub API key environment variable (REACT_APP_FINANCE_API_KEY) is not configured. The dashboard will use fallback data.</p>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className={getThemeClasses.errorBanner}>
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <button 
            onClick={handleRefresh}
            className={darkMode ? "mt-2 text-red-200 underline hover:no-underline" : "mt-2 text-red-700 underline hover:no-underline"}
          >
            Try again
          </button>
        </div>
      )}
      
      {/* Loading state */}
      {loading && !error && (
        <div className="flex justify-center items-center p-8">
          <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${darkMode ? 'border-indigo-400' : 'border-blue-500'}`}></div>
          <p className={darkMode ? "ml-3 text-gray-300" : "ml-3 text-gray-600"}>Loading latest data...</p>
        </div>
      )}
      
      {/* Main content (shown when not loading and no error) */}
      {!loading && !error && (
        <>
          {/* TradingView Chart Section */}
          <div className={`${getThemeClasses.card} mb-8`}>
            <h2 className={getThemeClasses.chartTitle}>WNTR Price Chart</h2>
            <div className="h-96 mt-4">
              <TradingViewWidget darkMode={darkMode} />
            </div>
          </div>
          
          {/* Key stats section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className={`${getThemeClasses.statsCard} border-l-4 border-blue-500`}>
              <h2 className={darkMode ? "text-lg font-semibold text-gray-300" : "text-lg font-semibold text-gray-700"}>Current Price</h2>
              <div className="flex items-baseline">
                <p className={darkMode ? "text-3xl font-bold text-blue-300" : "text-3xl font-bold text-blue-700"}>
                  ${priceData.currentPrice.toFixed(2)}
                </p>
                <span className={`ml-2 text-sm ${priceData.change >= 0 ? (darkMode ? 'text-green-300' : 'text-green-600') : (darkMode ? 'text-red-300' : 'text-red-600')}`}>
                  {priceData.change >= 0 ? '+' : ''}{priceData.change.toFixed(2)} ({priceData.percentChange.toFixed(2)}%)
                </span>
              </div>
              <p className={darkMode ? "text-gray-400 text-xs mt-1" : "text-gray-500 text-xs mt-1"}>As of {priceData.timestamp}</p>
            </div>
            
            <div className={`${getThemeClasses.statsCard} border-l-4 border-green-500`}>
              <h2 className={darkMode ? "text-lg font-semibold text-gray-300" : "text-lg font-semibold text-gray-700"}>Avg Monthly Dividend</h2>
              <p className={darkMode ? "text-3xl font-bold text-green-300" : "text-3xl font-bold text-green-700"}>
                ${averageMonthlyDividend.toFixed(4)}
              </p>
              <p className={darkMode ? "text-gray-400 text-xs mt-1" : "text-gray-500 text-xs mt-1"}>Per share</p>
            </div>
            
            <div className={`${getThemeClasses.statsCard} border-l-4 border-purple-500`}>
              <h2 className={darkMode ? "text-lg font-semibold text-gray-300" : "text-lg font-semibold text-gray-700"}>Annual Yield</h2>
              <p className={darkMode ? "text-3xl font-bold text-purple-300" : "text-3xl font-bold text-purple-700"}>
                {annualYield.toFixed(2)}%
              </p>
              <p className={darkMode ? "text-gray-400 text-xs mt-1" : "text-gray-500 text-xs mt-1"}>Based on current price</p>
            </div>
            
            <div className={`${getThemeClasses.statsCard} border-l-4 border-amber-500`}>
              <h2 className={darkMode ? "text-lg font-semibold text-gray-300" : "text-lg font-semibold text-gray-700"}>Latest Dividend</h2>
              <p className={darkMode ? "text-3xl font-bold text-amber-300" : "text-3xl font-bold text-amber-700"}>
                ${dividendHistory.length > 0 ? dividendHistory[0].dividend.toFixed(4) : '0.00'}
              </p>
              <p className={darkMode ? "text-gray-400 text-xs mt-1" : "text-gray-500 text-xs mt-1"}>
                {dividendHistory.length > 0 
                  ? `${dividendHistory[0].month} ${dividendHistory[0].year} (${dividendHistory[0].yield.toFixed(2)}%)`
                  : 'No data available'}
              </p>
            </div>
          </div>
          
          {/* Calculator section */}
          <div className={`mb-8 ${getThemeClasses.card}`}>
            <h2 className={getThemeClasses.subtitle}>Dividend Calculator</h2>
            
            <div className="mb-6">
              <label className={darkMode ? "block text-gray-300 font-semibold mb-2" : "block text-gray-700 font-semibold mb-2"}>
                Investment Amount ($)
              </label>
              <input
                type="number"
                value={investmentAmount}
                onChange={handleAmountChange}
                className={getThemeClasses.input}
                min="1"
              />
              
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => handlePresetAmount(1000)} className={getThemeClasses.button}>$1,000</button>
                <button onClick={() => handlePresetAmount(5000)} className={getThemeClasses.button}>$5,000</button>
                <button onClick={() => handlePresetAmount(10000)} className={getThemeClasses.button}>$10,000</button>
                <button onClick={() => handlePresetAmount(25000)} className={getThemeClasses.button}>$25,000</button>
                <button onClick={() => handlePresetAmount(50000)} className={getThemeClasses.button}>$50,000</button>
              </div>
            </div>
            
            {/* Custom dividend scenario section */}
            <div className={getThemeClasses.scenario}>
              <h3 className={darkMode ? "text-lg font-bold text-gray-200 mb-3" : "text-lg font-bold text-gray-800 mb-3"}>
                Dividend Scenario Builder
              </h3>
              
              <div className="mb-4">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="useCustomDividend"
                    checked={useCustomDividend}
                    onChange={handleUseCustomDividendChange}
                    className={getThemeClasses.checkbox}
                  />
                  <label htmlFor="useCustomDividend" className={darkMode ? "text-gray-300 font-medium" : "text-gray-700 font-medium"}>
                    Use custom monthly dividend amount
                  </label>
                </div>
                
                {useCustomDividend && (
                  <div className="space-y-3">
                    <div>
                      <label className={darkMode ? "block text-gray-300 text-sm mb-1" : "block text-gray-700 text-sm mb-1"}>
                        Custom Monthly Dividend ($)
                      </label>
                      <input
                        type="number"
                        value={customDividendAmount}
                        onChange={handleCustomDividendChange}
                        step="0.0001"
                        min="0"
                        placeholder={`Average: ${averageMonthlyDividend.toFixed(4)}`}
                        className={getThemeClasses.input}
                      />
                    </div>
                    
                    <div>
                      <label className={darkMode ? "block text-gray-300 text-sm mb-1" : "block text-gray-700 text-sm mb-1"}>
                        Scenario Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={scenarioName}
                        onChange={handleScenarioNameChange}
                        placeholder="e.g., Bull Market, Bear Market"
                        className={getThemeClasses.input}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => applyPresetScenario('bullish')} 
                  className={getThemeClasses.bullishBtn}
                >
                  Bullish (+50%)
                </button>
                <button 
                  onClick={() => applyPresetScenario('bearish')} 
                  className={getThemeClasses.bearishBtn}
                >
                  Bearish (-50%)
                </button>
                <button 
                  onClick={() => applyPresetScenario('highest')} 
                  className={getThemeClasses.peakBtn}
                >
                  Peak Performance
                </button>
                <button 
                  onClick={() => applyPresetScenario('lowest')} 
                  className={getThemeClasses.minimumBtn}
                >
                  Minimum Performance
                </button>
                <button 
                  onClick={() => applyPresetScenario('reset')} 
                  className={getThemeClasses.resetBtn}
                >
                  Reset to Average
                </button>
              </div>
            </div>
            
            {calculatedResults && (
              <>
                {/* Scenario banner if using custom dividend */}
                {calculatedResults.isCustomScenario && (
                  <div className={getThemeClasses.scenarioBanner}>
                    <p className={getThemeClasses.scenarioText}>
                      <span className="mr-2">📊</span>
                      {calculatedResults.scenarioName}: Using ${parseFloat(customDividendAmount).toFixed(4)} monthly dividend per share 
                      {averageMonthlyDividend > 0 ? 
                        ` (${((parseFloat(customDividendAmount) / averageMonthlyDividend) * 100 - 100).toFixed(0)}% vs historical average)` 
                        : ''}
                    </p>
                  </div>
                )}
              
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={getThemeClasses.sharesCard}>
                    <h3 className={darkMode ? "text-gray-300 font-semibold" : "text-gray-700 font-semibold"}>Shares Owned</h3>
                    <p className={getThemeClasses.sharesText}>{calculatedResults.sharesOwned}</p>
                  </div>
                  
                  <div className={getThemeClasses.monthlyCard}>
                    <h3 className={darkMode ? "text-gray-300 font-semibold" : "text-gray-700 font-semibold"}>Expected Monthly Income</h3>
                    <p className={getThemeClasses.monthlyText}>${calculatedResults.expectedMonthlyDividend}</p>
                  </div>
                  
                  <div className={getThemeClasses.annualCard}>
                    <h3 className={darkMode ? "text-gray-300 font-semibold" : "text-gray-700 font-semibold"}>Expected Annual Income</h3>
                    <p className={getThemeClasses.annualText}>${calculatedResults.expectedAnnualDividend}</p>
                  </div>
                  
                  <div className={getThemeClasses.returnCard}>
                    <h3 className={darkMode ? "text-gray-300 font-semibold" : "text-gray-700 font-semibold"}>
                      {calculatedResults.isCustomScenario ? 'Projected Annual Yield' : '12-Month Historical Return'}
                    </h3>
                    <p className={getThemeClasses.returnText}>
                      {calculatedResults.isCustomScenario 
                        ? `${calculatedResults.expectedAnnualYieldPercentage}%` 
                        : `$${calculatedResults.historicalReturn}`}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Charts section - only shown if we have enough dividend history */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Dividend history chart */}
              <div className={getThemeClasses.card}>
                <h2 className={getThemeClasses.chartTitle}>WNTR Monthly Dividend History</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#e5e7eb"} />
                      <XAxis 
                        dataKey="label" 
                        angle={-45} 
                        textAnchor="end" 
                        height={60} 
                        tick={{ fill: darkMode ? "#9CA3AF" : "#4B5563" }}
                      />
                      <YAxis 
                        domain={[0, 'auto']}
                        tick={{ fill: darkMode ? "#9CA3AF" : "#4B5563" }}
                      />
                      <Tooltip 
                        formatter={(value) => [`$${value}`, 'Dividend']} 
                        contentStyle={{ 
                          backgroundColor: darkMode ? '#374151' : '#fff', 
                          borderColor: darkMode ? '#4B5563' : '#e5e7eb',
                          color: darkMode ? '#F3F4F6' : '#111827'
                        }}
                      />
                      <ReferenceLine 
                        y={averageMonthlyDividend} 
                        stroke={darkMode ? "#EF4444" : "red"} 
                        strokeDasharray="3 3" 
                        label={{ 
                          value: "Average", 
                          fill: darkMode ? "#F87171" : "#B91C1C",
                          position: 'insideBottomRight'
                        }} 
                      />
                      {useCustomDividend && customDividendAmount && (
                        <ReferenceLine 
                          y={parseFloat(customDividendAmount)} 
                          stroke={darkMode ? "#60A5FA" : "blue"} 
                          strokeDasharray="3 3" 
                          label={{ 
                            value: "Custom", 
                            fill: darkMode ? "#93C5FD" : "#1D4ED8",
                            position: 'insideTopRight'
                          }} 
                        />
                      )}
                      <Bar dataKey="dividend" fill={darkMode ? "#6366F1" : "#4F46E5"} name="Dividend" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Dividend yield chart */}
              <div className={getThemeClasses.card}>
                <h2 className={getThemeClasses.chartTitle}>WNTR Monthly Yield % History</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#e5e7eb"} />
                      <XAxis 
                        dataKey="label" 
                        angle={-45} 
                        textAnchor="end" 
                        height={60} 
                        tick={{ fill: darkMode ? "#9CA3AF" : "#4B5563" }}
                      />
                      <YAxis 
                        domain={[0, 'auto']}
                        tick={{ fill: darkMode ? "#9CA3AF" : "#4B5563" }}
                      />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Yield']} 
                        contentStyle={{ 
                          backgroundColor: darkMode ? '#374151' : '#fff', 
                          borderColor: darkMode ? '#4B5563' : '#e5e7eb',
                          color: darkMode ? '#F3F4F6' : '#111827'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="yield" 
                        stroke={darkMode ? "#A78BFA" : "#7E22CE"} 
                        name="Yield %" 
                        dot={{ r: 3, fill: darkMode ? "#A78BFA" : "#7E22CE" }} 
                        strokeWidth={2} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
          
          {/* Returns chart (based on investment) */}
          {calculatedResults && (
            <div className={getThemeClasses.card + " mb-8"}>
              <h2 className={getThemeClasses.chartTitle}>
                {calculatedResults.isCustomScenario 
                  ? `Projected Monthly Returns (${calculatedResults.scenarioName})` 
                  : `Expected Monthly Returns`} 
                (${investmentAmount.toLocaleString()})
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={calculatedResults.isCustomScenario 
                      ? calculatedResults.projectedReturns 
                      : calculatedResults.monthlyReturns}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#e5e7eb"} />
                    <XAxis 
                      dataKey="label" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60} 
                      tick={{ fill: darkMode ? "#9CA3AF" : "#4B5563" }}
                    />
                    <YAxis 
                      domain={[0, 'auto']}
                      tick={{ fill: darkMode ? "#9CA3AF" : "#4B5563" }}
                    />
                    <Tooltip 
                      formatter={(value) => [`$${value}`, 'Return']} 
                      contentStyle={{ 
                        backgroundColor: darkMode ? '#374151' : '#fff', 
                        borderColor: darkMode ? '#4B5563' : '#e5e7eb',
                        color: darkMode ? '#F3F4F6' : '#111827'
                      }}
                    />
                    <Bar 
                      dataKey="return" 
                      fill={calculatedResults.isCustomScenario ? (darkMode ? "#0E7490" : "#0891B2") : (darkMode ? "#059669" : "#16A34A")} 
                      name="Monthly Return" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {calculatedResults.isCustomScenario && (
                <div className={darkMode ? "mt-2 text-xs text-gray-400 italic" : "mt-2 text-xs text-gray-500 italic"}>
                  Note: This chart shows projected returns based on the custom dividend amount of ${parseFloat(customDividendAmount).toFixed(4)} per share.
                </div>
              )}
            </div>
          )}
          
          {/* Dividend history table */}
          <div className={getThemeClasses.card + " mb-8"}>
            <h2 className={getThemeClasses.chartTitle}>Dividend History</h2>
            <div className="overflow-x-auto">
              <table className={darkMode ? "min-w-full bg-gray-800" : "min-w-full bg-white"}>
                <thead className={getThemeClasses.tableHeader}>
                  <tr>
                    <th className={darkMode ? "py-2 px-4 border-b border-gray-700 text-left text-gray-300" : "py-2 px-4 border-b text-left"}>Date</th>
                    <th className={darkMode ? "py-2 px-4 border-b border-gray-700 text-right text-gray-300" : "py-2 px-4 border-b text-right"}>Amount</th>
                    <th className={darkMode ? "py-2 px-4 border-b border-gray-700 text-right text-gray-300" : "py-2 px-4 border-b text-right"}>Yield</th>
                    <th className={darkMode ? "py-2 px-4 border-b border-gray-700 text-left text-gray-300" : "py-2 px-4 border-b text-left"}>Ex-Dividend Date</th>
                  </tr>
                </thead>
                <tbody>
                  {dividendHistory.map((dividend, index) => (
                    <tr key={index} className={index % 2 === 0 ? (darkMode ? 'bg-gray-900' : 'bg-gray-50') : ''}>
                      <td className={darkMode ? "py-2 px-4 border-b border-gray-700 text-gray-300" : "py-2 px-4 border-b"}>{dividend.month} {dividend.year}</td>
                      <td className={darkMode ? "py-2 px-4 border-b border-gray-700 text-right text-gray-300" : "py-2 px-4 border-b text-right"}>
                        ${dividend.dividend.toFixed(4)}
                      </td>
                      <td className={darkMode ? "py-2 px-4 border-b border-gray-700 text-right text-gray-300" : "py-2 px-4 border-b text-right"}>
                        {dividend.yield.toFixed(2)}%
                      </td>
                      <td className={darkMode ? "py-2 px-4 border-b border-gray-700 text-gray-300" : "py-2 px-4 border-b"}>
                        {dividend.exDate || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Disclaimer section */}
          <div className={getThemeClasses.card}>
            <h2 className={getThemeClasses.chartTitle}>Important Disclaimer</h2>
            <p className={darkMode ? "text-gray-300 text-sm" : "text-gray-700 text-sm"}>
              This dashboard is for informational purposes only. Historical dividend payments may not be indicative of future returns. WNTR dividends can vary significantly month to month based on the fund's strategy of selling options on MicroStrategy (MSTR). The YieldMax MSTR Short Option Income Strategy ETF (WNTR) is an actively managed ETF that uses options strategies which may limit upside potential. Please consult with a financial advisor before making investment decisions.
            </p>
            <p className={darkMode ? "text-gray-300 text-sm mt-2" : "text-gray-700 text-sm mt-2"}>
              Data is refreshed automatically every 5 minutes or when you click the refresh button. Price data is in real-time, while dividend information may be delayed.
            </p>
            <p className={darkMode ? "text-gray-300 text-sm mt-2" : "text-gray-700 text-sm mt-2"}>
              Custom dividend scenarios are for projection purposes only and do not guarantee actual returns.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default WNTRDividendDashboard;