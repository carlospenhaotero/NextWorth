// Servicio para obtener listas de activos populares
// Todos los símbolos están en formato compatible con Yahoo Finance

// Lista de 100 acciones más comunes (S&P 500 y otras grandes empresas)
const POPULAR_STOCKS = [
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'BRK-B', name: 'Berkshire Hathaway Inc. Class B', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'MA', name: 'Mastercard Incorporated', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'PG', name: 'The Procter & Gamble Company', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'UNH', name: 'UnitedHealth Group Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'HD', name: 'The Home Depot, Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'DIS', name: 'The Walt Disney Company', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'BAC', name: 'Bank of America Corp.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'XOM', name: 'Exxon Mobil Corporation', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'LLY', name: 'Eli Lilly and Company', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'COST', name: 'Costco Wholesale Corporation', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'ABBV', name: 'AbbVie Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'CVX', name: 'Chevron Corporation', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'PEP', name: 'PepsiCo, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'ADBE', name: 'Adobe Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'KO', name: 'The Coca-Cola Company', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'MRK', name: 'Merck & Co., Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'CSCO', name: 'Cisco Systems, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'TMO', name: 'Thermo Fisher Scientific Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'NFLX', name: 'Netflix, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'ACN', name: 'Accenture plc', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'CMCSA', name: 'Comcast Corporation', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'LIN', name: 'Linde plc', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'COIN', name: 'Coinbase Global, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'WFC', name: 'Wells Fargo & Company', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'PM', name: 'Philip Morris International Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'INTU', name: 'Intuit Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'QCOM', name: 'QUALCOMM Incorporated', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'TXN', name: 'Texas Instruments Incorporated', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'HON', name: 'Honeywell International Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'AMGN', name: 'Amgen Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'UNP', name: 'Union Pacific Corporation', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'SPGI', name: 'S&P Global Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'CAT', name: 'Caterpillar Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'IBM', name: 'International Business Machines Corporation', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'ELV', name: 'Elevance Health Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'LOW', name: "Lowe's Companies, Inc.", exchange: 'NYSE', currency: 'USD' },
    { symbol: 'GS', name: 'The Goldman Sachs Group, Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'NKE', name: 'Nike, Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'AMAT', name: 'Applied Materials, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'RTX', name: 'RTX Corporation', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'BKNG', name: 'Booking Holdings Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'AXP', name: 'American Express Company', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'PLD', name: 'Prologis, Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'DE', name: 'Deere & Company', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'GE', name: 'General Electric Company', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'SYK', name: 'Stryker Corporation', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'ADI', name: 'Analog Devices, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'C', name: 'Citigroup Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'MDT', name: 'Medtronic plc', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'MU', name: 'Micron Technology, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'CB', name: 'Chubb Limited', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'AMT', name: 'American Tower Corporation', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'FI', name: 'Fiserv, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'SHW', name: 'The Sherwin-Williams Company', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'CME', name: 'CME Group Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'KLAC', name: 'KLA Corporation', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'BLK', name: 'BlackRock, Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'SNPS', name: 'Synopsys, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'ICE', name: 'Intercontinental Exchange, Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'LRCX', name: 'Lam Research Corporation', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'CDNS', name: 'Cadence Design Systems, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'ADP', name: 'Automatic Data Processing, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'CRWD', name: 'CrowdStrike Holdings, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'FTNT', name: 'Fortinet, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'PANW', name: 'Palo Alto Networks, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'NOW', name: 'ServiceNow, Inc.', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'ZS', name: 'Zscaler, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'MCHP', name: 'Microchip Technology Incorporated', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'APH', name: 'Amphenol Corporation', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'NXPI', name: 'NXP Semiconductors N.V.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'SWKS', name: 'Skyworks Solutions, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'QRVO', name: 'Qorvo, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'MPWR', name: 'Monolithic Power Systems, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'MRNA', name: 'Moderna, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'BNTX', name: 'BioNTech SE', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'GILD', name: 'Gilead Sciences, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'BIIB', name: 'Biogen Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'REGN', name: 'Regeneron Pharmaceuticals, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'VRTX', name: 'Vertex Pharmaceuticals Incorporated', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'ALGN', name: 'Align Technology, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'ISRG', name: 'Intuitive Surgical, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'DXCM', name: 'Dexcom, Inc.', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'BSX', name: 'Boston Scientific Corporation', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'EW', name: 'Edwards Lifesciences Corporation', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'BA', name: 'The Boeing Company', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'LMT', name: 'Lockheed Martin Corporation', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'NOC', name: 'Northrop Grumman Corporation', exchange: 'NYSE', currency: 'USD' },
    { symbol: 'GD', name: 'General Dynamics Corporation', exchange: 'NYSE', currency: 'USD' },
];

// Criptomonedas en formato Yahoo Finance (XXX-USD)
const POPULAR_CRYPTOS = [
    { symbol: 'BTC-USD', name: 'Bitcoin', displaySymbol: 'BTC', currency: 'USD' },
    { symbol: 'ETH-USD', name: 'Ethereum', displaySymbol: 'ETH', currency: 'USD' },
    { symbol: 'BNB-USD', name: 'BNB', displaySymbol: 'BNB', currency: 'USD' },
    { symbol: 'ADA-USD', name: 'Cardano', displaySymbol: 'ADA', currency: 'USD' },
    { symbol: 'SOL-USD', name: 'Solana', displaySymbol: 'SOL', currency: 'USD' },
    { symbol: 'XRP-USD', name: 'Ripple', displaySymbol: 'XRP', currency: 'USD' },
    { symbol: 'DOT-USD', name: 'Polkadot', displaySymbol: 'DOT', currency: 'USD' },
    { symbol: 'DOGE-USD', name: 'Dogecoin', displaySymbol: 'DOGE', currency: 'USD' },
    { symbol: 'AVAX-USD', name: 'Avalanche', displaySymbol: 'AVAX', currency: 'USD' },
    { symbol: 'MATIC-USD', name: 'Polygon', displaySymbol: 'MATIC', currency: 'USD' },
    { symbol: 'LINK-USD', name: 'Chainlink', displaySymbol: 'LINK', currency: 'USD' },
    { symbol: 'UNI-USD', name: 'Uniswap', displaySymbol: 'UNI', currency: 'USD' },
    { symbol: 'ATOM-USD', name: 'Cosmos', displaySymbol: 'ATOM', currency: 'USD' },
    { symbol: 'LTC-USD', name: 'Litecoin', displaySymbol: 'LTC', currency: 'USD' },
    { symbol: 'NEAR-USD', name: 'NEAR Protocol', displaySymbol: 'NEAR', currency: 'USD' },
];

const POPULAR_ETFS = [
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'IVV', name: 'iShares Core S&P 500 ETF', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'IEFA', name: 'iShares Core MSCI EAFE ETF', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'AGG', name: 'iShares Core U.S. Aggregate Bond ETF', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'GLD', name: 'SPDR Gold Shares', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'IJR', name: 'iShares Core S&P Small-Cap ETF', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'IJH', name: 'iShares Core S&P Mid-Cap ETF', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'VUG', name: 'Vanguard Growth ETF', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'VTV', name: 'Vanguard Value ETF', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'IWM', name: 'iShares Russell 2000 ETF', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'BNDX', name: 'Vanguard Total International Bond ETF', exchange: 'NASDAQ', currency: 'USD' },
    { symbol: 'EFA', name: 'iShares MSCI EAFE ETF', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'VIG', name: 'Vanguard Dividend Appreciation ETF', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'XLF', name: 'Financial Select Sector SPDR Fund', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'XLK', name: 'Technology Select Sector SPDR Fund', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'XLV', name: 'Health Care Select Sector SPDR Fund', exchange: 'NYSE Arca', currency: 'USD' },
    { symbol: 'XLE', name: 'Energy Select Sector SPDR Fund', exchange: 'NYSE Arca', currency: 'USD' },
];

// Commodities en formato Yahoo Finance (XX=F para futuros)
const POPULAR_COMMODITIES = [
    { symbol: 'GC=F', name: 'Gold', displaySymbol: 'GOLD', currency: 'USD', unit: 'oz (troy)' },
    { symbol: 'SI=F', name: 'Silver', displaySymbol: 'SILVER', currency: 'USD', unit: 'oz (troy)' },
    { symbol: 'CL=F', name: 'Crude Oil (WTI)', displaySymbol: 'WTI', currency: 'USD', unit: 'barrel' },
    { symbol: 'BZ=F', name: 'Brent Crude Oil', displaySymbol: 'BRENT', currency: 'USD', unit: 'barrel' },
    { symbol: 'NG=F', name: 'Natural Gas', displaySymbol: 'NATGAS', currency: 'USD', unit: 'MMBtu' },
    { symbol: 'HG=F', name: 'Copper', displaySymbol: 'COPPER', currency: 'USD', unit: 'lbs' },
    { symbol: 'PL=F', name: 'Platinum', displaySymbol: 'PLATINUM', currency: 'USD', unit: 'oz (troy)' },
    { symbol: 'PA=F', name: 'Palladium', displaySymbol: 'PALLADIUM', currency: 'USD', unit: 'oz (troy)' },
    { symbol: 'ZC=F', name: 'Corn', displaySymbol: 'CORN', currency: 'USD', unit: 'bushel' },
    { symbol: 'ZW=F', name: 'Wheat', displaySymbol: 'WHEAT', currency: 'USD', unit: 'bushel' },
    { symbol: 'ZS=F', name: 'Soybeans', displaySymbol: 'SOYB', currency: 'USD', unit: 'bushel' },
    { symbol: 'KC=F', name: 'Coffee', displaySymbol: 'COFFEE', currency: 'USD', unit: 'lbs' },
    { symbol: 'SB=F', name: 'Sugar', displaySymbol: 'SUGAR', currency: 'USD', unit: 'lbs' },
    { symbol: 'CT=F', name: 'Cotton', displaySymbol: 'COTTON', currency: 'USD', unit: 'lbs' },
    { symbol: 'CC=F', name: 'Cocoa', displaySymbol: 'COCOA', currency: 'USD', unit: 'metric ton' },
    { symbol: 'LE=F', name: 'Live Cattle', displaySymbol: 'CATTLE', currency: 'USD', unit: 'lbs' },
    { symbol: 'HE=F', name: 'Lean Hogs', displaySymbol: 'HOGS', currency: 'USD', unit: 'lbs' },
];

// Bonos en formato Yahoo Finance (^XXX para índices de treasury yields)
const POPULAR_BONDS = [
    { symbol: '^TNX', name: 'US Treasury 10 Year Yield', displaySymbol: 'US10Y', currency: 'USD' },
    { symbol: '^TYX', name: 'US Treasury 30 Year Yield', displaySymbol: 'US30Y', currency: 'USD' },
    { symbol: '^IRX', name: 'US Treasury 13 Week Bill', displaySymbol: 'US3M', currency: 'USD' },
    { symbol: '^FVX', name: 'US Treasury 5 Year Yield', displaySymbol: 'US5Y', currency: 'USD' },
];

export const assetService = {
    /**
     * Obtiene lista de acciones populares
     */
    async getPopularStocks() {
        return POPULAR_STOCKS;
    },

    /**
     * Obtiene lista de criptomonedas populares
     */
    async getPopularCryptos() {
        return POPULAR_CRYPTOS;
    },

    /**
     * Obtiene lista de ETFs populares
     */
    async getPopularEtfs() {
        return POPULAR_ETFS;
    },

    /**
     * Obtiene lista de commodities populares
     */
    async getPopularCommodities() {
        return POPULAR_COMMODITIES;
    },

    /**
     * Obtiene lista de bonos populares
     */
    async getPopularBonds() {
        return POPULAR_BONDS;
    },

    /**
     * Obtiene una lista de activos según el tipo
     */
    async getPopularAssets(assetType) {
        switch (assetType) {
            case 'stock':
                return await this.getPopularStocks();
            case 'crypto':
                return await this.getPopularCryptos();
            case 'etf':
                return await this.getPopularEtfs();
            case 'commodity':
                return await this.getPopularCommodities();
            case 'bond':
                return await this.getPopularBonds();
            default:
                return [];
        }
    },
};

// Mantener compatibilidad con el nombre antiguo
export const finnhubService = assetService;
