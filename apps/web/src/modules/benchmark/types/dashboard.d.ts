declare interface Chain {
  id: string;
  name: string;
  logo: string;
  isComingSoon?: boolean;
}

declare interface ProviderStats {
  total_quotes: number;
  successful_quotes: number;
  error_count: number;
  participation_rate: number;
  win_rate: number;
  average_response_time: number;
  total_wins: number;
}

declare interface WinRateResponse {
  run_id: number;
  run_date: string | null;
  total_trades_analyzed: number;
  overall: Record<string, ProviderStats>;
  by_chain: Record<
    string,
    {
      total_trades_analyzed: number;
      provider_analytics: Record<string, ProviderStats>;
    }
  >;
}

declare interface DetailedTrade {
  chain: string;
  trading_pair: string;
  from_token: string | null;
  to_token: string | null;
  from_address: string;
  to_address: string;
  amount_usd: number;
  winner: string;
  output_diff: number | null;
  output_diff_usd: number | null;
  [k: string]: any;
}

declare interface DetailedRunResponse {
  run_id: number;
  run_date: string | null;
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  results: DetailedTrade[];
}

declare interface Provider {
  id: string;
  key: string;
  name: string;
  icon: string;
  winRate: number;
  participation: number;
  successfulTrades: number;
  totalTrades: number;
  avgResponse: number;
  totalQuotes: number;
  errors: number;
  wins: number;
}

declare interface TradeResult {
  id: string;
  chain: number;
  tradingPair: string;
  fromToken: string;
  toToken: string;
  input_amount: number | null; // USD value of input amount
  amount: number;
  providers: {
    [providerId: string]: {
      time: number;
      output: number | null;
      error?: string;
    };
  };
  winner: string;
  outputDiff: number;
}

declare interface BenchmarkData {
  topPerformer: { name: string; winRate: number };
  totalTrades: number;
  activeProviders: number;
  lastUpdated: { date: string | null; run: number };
  providers: Provider[];
  tradeResults: Array<{
    id: string;
    tradingPair: string;
    amount: number;
    providers: Record<string, { time: number | null; output: number | null }>;
    winner: string;
    outputDiff: number | null;
  }>;
}

declare interface DashboardState {
  selectedChain: string;
  data: BenchmarkData | null;
  loading: boolean;
  error: string | null;
}

declare type Theme = "light" | "dark";
