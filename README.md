# WNTR Dividend Calculator

A comprehensive dashboard to calculate and analyze dividend returns for the YieldMax MSTR Short Option Income Strategy ETF (WNTR).

## Overview

This web application provides investors with tools to:

- View real-time WNTR price data
- Track dividend history and yields
- Calculate potential returns based on investment amount
- Create custom dividend scenarios for forecasting
- Visualize historical and projected dividend data

## Features

- **Real-time Price Data**: Displays current WNTR price, daily changes, and market information
- **Dividend History**: Shows all historical dividends and yields
- **Dividend Calculator**: Calculate potential returns based on your investment amount
- **Custom Scenarios**: Create bullish, bearish, or custom dividend scenarios to project future income
- **Interactive Charts**: Visualize dividend history, yields, and projected returns
- **Dark Mode Support**: Toggle between light and dark themes for comfortable viewing

## Installation

1. Clone the repository:
```bash
git clone https://github.com/PaulieB14/wntr-dividend-calculator.git
cd wntr-dividend-calculator
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file for API key:
```bash
cp .env.example .env
```
Then edit the `.env` file to add your Finnhub API key. You can get a free API key at [finnhub.io](https://finnhub.io/).

4. Start the development server:
```bash
npm start
```

## Usage

- Enter your investment amount to see projected returns
- Use the "Dividend Scenario Builder" to create custom projections
- Toggle between dark and light mode using the icon in the top-right corner
- View historical data in the dividend history table
- See visualizations of dividend amounts, yields, and projected returns in the charts

## Updating Dividend Data

### Manual Updates
When WNTR announces a new dividend, update the dividend data in `src/services/financeService.js`:

1. Find the `fetchDividendHistory` function
2. Add the new dividend entry to the array:
```javascript
return [
  { month: "Jun", year: 2025, dividend: 2.1234, yield: 5.89, exDate: "2025-06-06" }, // New dividend
  { month: "May", year: 2025, dividend: 2.719, yield: 7.39, exDate: "2025-05-08" }  // Previous dividends
];
```

### Automated Updates (Recommended)
For automatic dividend data updates, consider:

1. **API Integration**: Use financial APIs like Alpha Vantage, Polygon.io, or IEX Cloud
2. **Web Scraping**: Set up automated scraping of financial websites
3. **GitHub Actions**: Create automated workflows to check for new dividends daily

## Data Sources

- **Price Data**: Finnhub API (with fallback to backup APIs)
- **Dividend Data**: Currently manual updates (see above for automation options)
- **Chart Data**: TradingView widget integration

## Technologies Used

- React
- Recharts for data visualization
- TradingView widget for stock charts
- Tailwind CSS for styling
- Finnhub API for real-time price data

## Deployment

The application can be deployed to Vercel, Netlify, or any other static site hosting service. To build for production:

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/dividend-api`)
3. Make your changes
4. Update dividend data when new payouts are announced
5. Submit a pull request

## Troubleshooting

### Dashboard Not Updating with New Dividends

If your dashboard isn't showing the latest dividend:

1. **Check the dividend data** in `src/services/financeService.js`
2. **Verify the date logic** in `checkForNewDividendData`
3. **Clear browser cache** and refresh the page
4. **Check console errors** in browser developer tools
5. **Verify API keys** are properly configured

### Price Data Issues

If price data isn't loading:

1. **Check your Finnhub API key** in the `.env` file
2. **Verify API limits** haven't been exceeded
3. **Check network connectivity** and CORS settings

## Disclaimer

This dashboard is for informational purposes only. Historical dividend payments may not be indicative of future returns. WNTR dividends can vary significantly month to month based on the fund's strategy of selling options on MicroStrategy (MSTR). The YieldMax MSTR Short Option Income Strategy ETF (WNTR) is an actively managed ETF that uses options strategies which may limit upside potential. Please consult with a financial advisor before making investment decisions.

## License

MIT

## Acknowledgements

- Based on the [MSTY Dividend Calculator](https://github.com/PaulieB14/msty-dividend-calculator)
- Dividend data sourced from [StockAnalysis.com](https://stockanalysis.com/etf/wntr/dividend/)
- Price data provided by [Finnhub.io](https://finnhub.io/)