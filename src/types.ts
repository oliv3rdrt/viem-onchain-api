export interface ApiResponse<T = unknown> {
  ok: true;
  data: T;
  meta: ResponseMeta;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
  };
  meta: ResponseMeta;
}

export interface ResponseMeta {
  chain: string;
  cached: boolean;
  latency_ms: number;
  timestamp: number;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Domain types
export interface EthBalance {
  address: string;
  wei: string;
  ether: string;
  gwei: string;
}

export interface BlockInfo {
  number: string;
  hash: string;
  timestamp: number;
  transactions: number;
  baseFeePerGas: string | null;
  gasUsed: string;
  gasLimit: string;
  miner: string;
}

export interface EnsResult {
  input: string;
  address: string | null;
  name: string | null;
  avatar: string | null;
}

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  totalSupplyFormatted: string;
}

export interface TokenBalance {
  holder: string;
  token: string;
  symbol: string;
  decimals: number;
  raw: string;
  formatted: string;
}

export interface TransferEvent {
  blockNumber: string;
  transactionHash: string;
  from: string;
  to: string;
  value: string;
  valueFormatted: string;
}

export interface SimulateResult {
  success: boolean;
  result: string | null;
  gasEstimate: string | null;
  revertReason: string | null;
}
