import React, { useEffect, useRef, memo } from 'react';

function TradingViewWidget({ darkMode }) {
  const container = useRef();

  useEffect(() => {
    // Clear container before adding new script
    if (container.current.childElementCount > 0) {
      container.current.innerHTML = '';
    }
    
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "autosize": true,
        "symbol": "CFI:WNTR",
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "${darkMode ? 'dark' : 'light'}",
        "style": "1",
        "locale": "en",
        "allow_symbol_change": true,
        "support_host": "https://www.tradingview.com"
      }`;
    container.current.appendChild(script);
    
    // Cleanup function
    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [darkMode]); // Re-run when darkMode changes

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
      <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }}></div>
      <div className="tradingview-widget-copyright">
        <a href="https://www.tradingview.com/" rel="noopener noreferrer" target="_blank">
          <span className={darkMode ? "text-blue-400" : "text-blue-600"}>Track all markets on TradingView</span>
        </a>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);