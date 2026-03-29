export interface CatalogAsset {
  symbol: string;
  name: string;
  displaySymbol?: string;
  exchange?: string;
  currency: string;
  unit?: string;
  assetType?: string;
}

export const POPULAR_STOCKS: CatalogAsset[] = [
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", currency: "USD" },
  { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", currency: "USD" },
  { symbol: "GOOGL", name: "Alphabet Inc. Class A", exchange: "NASDAQ", currency: "USD" },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ", currency: "USD" },
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", currency: "USD" },
  { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ", currency: "USD" },
  { symbol: "TSLA", name: "Tesla, Inc.", exchange: "NASDAQ", currency: "USD" },
  { symbol: "BRK-B", name: "Berkshire Hathaway Inc. Class B", exchange: "NYSE", currency: "USD" },
  { symbol: "V", name: "Visa Inc.", exchange: "NYSE", currency: "USD" },
  { symbol: "JNJ", name: "Johnson & Johnson", exchange: "NYSE", currency: "USD" },
  { symbol: "WMT", name: "Walmart Inc.", exchange: "NYSE", currency: "USD" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE", currency: "USD" },
  { symbol: "MA", name: "Mastercard Incorporated", exchange: "NYSE", currency: "USD" },
  { symbol: "PG", name: "The Procter & Gamble Company", exchange: "NYSE", currency: "USD" },
  { symbol: "UNH", name: "UnitedHealth Group Inc.", exchange: "NYSE", currency: "USD" },
  { symbol: "HD", name: "The Home Depot, Inc.", exchange: "NYSE", currency: "USD" },
  { symbol: "DIS", name: "The Walt Disney Company", exchange: "NYSE", currency: "USD" },
  { symbol: "BAC", name: "Bank of America Corp.", exchange: "NYSE", currency: "USD" },
  { symbol: "XOM", name: "Exxon Mobil Corporation", exchange: "NYSE", currency: "USD" },
  { symbol: "AVGO", name: "Broadcom Inc.", exchange: "NASDAQ", currency: "USD" },
  { symbol: "LLY", name: "Eli Lilly and Company", exchange: "NYSE", currency: "USD" },
  { symbol: "COST", name: "Costco Wholesale Corporation", exchange: "NASDAQ", currency: "USD" },
  { symbol: "NFLX", name: "Netflix, Inc.", exchange: "NASDAQ", currency: "USD" },
  { symbol: "AMD", name: "Advanced Micro Devices, Inc.", exchange: "NASDAQ", currency: "USD" },
  { symbol: "COIN", name: "Coinbase Global, Inc.", exchange: "NASDAQ", currency: "USD" },
  { symbol: "BA", name: "The Boeing Company", exchange: "NYSE", currency: "USD" },
  { symbol: "GS", name: "The Goldman Sachs Group, Inc.", exchange: "NYSE", currency: "USD" },
  { symbol: "NKE", name: "Nike, Inc.", exchange: "NYSE", currency: "USD" },
  { symbol: "ADBE", name: "Adobe Inc.", exchange: "NASDAQ", currency: "USD" },
  { symbol: "KO", name: "The Coca-Cola Company", exchange: "NYSE", currency: "USD" },
];

export const POPULAR_CRYPTOS: CatalogAsset[] = [
  { symbol: "BTC-USD", name: "Bitcoin", displaySymbol: "BTC", currency: "USD" },
  { symbol: "ETH-USD", name: "Ethereum", displaySymbol: "ETH", currency: "USD" },
  { symbol: "BNB-USD", name: "BNB", displaySymbol: "BNB", currency: "USD" },
  { symbol: "ADA-USD", name: "Cardano", displaySymbol: "ADA", currency: "USD" },
  { symbol: "SOL-USD", name: "Solana", displaySymbol: "SOL", currency: "USD" },
  { symbol: "XRP-USD", name: "Ripple", displaySymbol: "XRP", currency: "USD" },
  { symbol: "DOT-USD", name: "Polkadot", displaySymbol: "DOT", currency: "USD" },
  { symbol: "DOGE-USD", name: "Dogecoin", displaySymbol: "DOGE", currency: "USD" },
  { symbol: "AVAX-USD", name: "Avalanche", displaySymbol: "AVAX", currency: "USD" },
  { symbol: "MATIC-USD", name: "Polygon", displaySymbol: "MATIC", currency: "USD" },
  { symbol: "LINK-USD", name: "Chainlink", displaySymbol: "LINK", currency: "USD" },
  { symbol: "UNI-USD", name: "Uniswap", displaySymbol: "UNI", currency: "USD" },
  { symbol: "ATOM-USD", name: "Cosmos", displaySymbol: "ATOM", currency: "USD" },
  { symbol: "LTC-USD", name: "Litecoin", displaySymbol: "LTC", currency: "USD" },
  { symbol: "NEAR-USD", name: "NEAR Protocol", displaySymbol: "NEAR", currency: "USD" },
];

export const POPULAR_ETFS: CatalogAsset[] = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", exchange: "NYSE Arca", currency: "USD" },
  { symbol: "IVV", name: "iShares Core S&P 500 ETF", exchange: "NYSE Arca", currency: "USD" },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", exchange: "NYSE Arca", currency: "USD" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", exchange: "NASDAQ", currency: "USD" },
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF", exchange: "NYSE Arca", currency: "USD" },
  { symbol: "VEA", name: "Vanguard FTSE Developed Markets ETF", exchange: "NYSE Arca", currency: "USD" },
  { symbol: "VWO", name: "Vanguard FTSE Emerging Markets ETF", exchange: "NYSE Arca", currency: "USD" },
  { symbol: "AGG", name: "iShares Core U.S. Aggregate Bond ETF", exchange: "NYSE Arca", currency: "USD" },
  { symbol: "GLD", name: "SPDR Gold Shares", exchange: "NYSE Arca", currency: "USD" },
  { symbol: "IWM", name: "iShares Russell 2000 ETF", exchange: "NYSE Arca", currency: "USD" },
];

export const POPULAR_COMMODITIES: CatalogAsset[] = [
  { symbol: "GC=F", name: "Gold", displaySymbol: "GOLD", currency: "USD", unit: "oz (troy)" },
  { symbol: "SI=F", name: "Silver", displaySymbol: "SILVER", currency: "USD", unit: "oz (troy)" },
  { symbol: "CL=F", name: "Crude Oil (WTI)", displaySymbol: "WTI", currency: "USD", unit: "barrel" },
  { symbol: "BZ=F", name: "Brent Crude Oil", displaySymbol: "BRENT", currency: "USD", unit: "barrel" },
  { symbol: "NG=F", name: "Natural Gas", displaySymbol: "NATGAS", currency: "USD", unit: "MMBtu" },
  { symbol: "HG=F", name: "Copper", displaySymbol: "COPPER", currency: "USD", unit: "lbs" },
  { symbol: "PL=F", name: "Platinum", displaySymbol: "PLATINUM", currency: "USD", unit: "oz (troy)" },
  { symbol: "ZC=F", name: "Corn", displaySymbol: "CORN", currency: "USD", unit: "bushel" },
  { symbol: "ZW=F", name: "Wheat", displaySymbol: "WHEAT", currency: "USD", unit: "bushel" },
  { symbol: "KC=F", name: "Coffee", displaySymbol: "COFFEE", currency: "USD", unit: "lbs" },
];

export const POPULAR_BONDS: CatalogAsset[] = [
  { symbol: "^TNX", name: "US Treasury 10 Year Yield", displaySymbol: "US10Y", currency: "USD" },
  { symbol: "^TYX", name: "US Treasury 30 Year Yield", displaySymbol: "US30Y", currency: "USD" },
  { symbol: "^IRX", name: "US Treasury 13 Week Bill", displaySymbol: "US3M", currency: "USD" },
  { symbol: "^FVX", name: "US Treasury 5 Year Yield", displaySymbol: "US5Y", currency: "USD" },
];

export function getAllAssets(): (CatalogAsset & { assetType: string })[] {
  return [
    ...POPULAR_STOCKS.map((a) => ({ ...a, assetType: "stock" })),
    ...POPULAR_ETFS.map((a) => ({ ...a, assetType: "etf" })),
    ...POPULAR_CRYPTOS.map((a) => ({ ...a, assetType: "crypto" })),
    ...POPULAR_COMMODITIES.map((a) => ({ ...a, assetType: "commodity" })),
    ...POPULAR_BONDS.map((a) => ({ ...a, assetType: "bond" })),
  ];
}

export function getAssetsByType(type: string): CatalogAsset[] {
  switch (type) {
    case "stock": return POPULAR_STOCKS;
    case "crypto": return POPULAR_CRYPTOS;
    case "etf": return POPULAR_ETFS;
    case "commodity": return POPULAR_COMMODITIES;
    case "bond": return POPULAR_BONDS;
    default: return [];
  }
}
