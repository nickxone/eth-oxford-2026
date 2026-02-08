import { ethers } from "ethers";
import { ERC20_ABI, FXRP_ADDRESS, POOL_ABI, POOL_ADDRESS } from "@/lib/contracts";

const COSTON2_RPC = "https://coston2-api.flare.network/ext/C/rpc";

export type PoolReadout = {
  rpcChainId: string;
  rpcBlock: number;
  fxrpSymbol: string;
  fxrpDecimals: number;
  poolAvailable: string;
  poolTotalLocked: string;
  poolTotalShares: string;
  walletFxrpBalance?: string;
  walletFxrpAllowance?: string;
  walletPoolShares?: string;
  walletPoolLiquidity?: string;
};

export async function readFxrpBalance(address: string) {
  const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
  const fxrp = new ethers.Contract(FXRP_ADDRESS, ERC20_ABI, provider);
  const [decimals, balance] = await Promise.all([
    fxrp.decimals(),
    fxrp.balanceOf(address),
  ]);
  return ethers.formatUnits(balance, Number(decimals));
}

export async function readFxrpAllowance(address: string, spender = POOL_ADDRESS) {
  const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
  const fxrp = new ethers.Contract(FXRP_ADDRESS, ERC20_ABI, provider);
  const [decimals, symbol, allowance] = await Promise.all([
    fxrp.decimals(),
    fxrp.symbol(),
    fxrp.allowance(address, spender),
  ]);
  return {
    allowance: allowance as bigint,
    allowanceFormatted: ethers.formatUnits(allowance, Number(decimals)),
    decimals: Number(decimals),
    symbol: symbol as string,
  };
}

export async function readAvailableStakeOf(address: string) {
  const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
  const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider);
  const fxrp = new ethers.Contract(FXRP_ADDRESS, ERC20_ABI, provider);

  const [decimals, availableStake] = await Promise.all([
    fxrp.decimals(),
    pool.availableStakeOf(address),
  ]);

  return ethers.formatUnits(availableStake, Number(decimals));
}

export async function readUserSharePercentage(address: string) {
  const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
  const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider);

  const [userShares, totalShares] = await Promise.all([
    pool.sharesOf(address),
    pool.totalSharesSupply(),
  ]);

  if (totalShares === BigInt(0)) {
    return "0.00";
  }

  const scaled = (userShares * BigInt(10000)) / totalShares;
  return (Number(scaled) / 100).toFixed(2);
}

export async function readPoolContracts(address?: string): Promise<PoolReadout> {
  const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
  const network = await provider.getNetwork();
  const block = await provider.getBlockNumber();

  const fxrp = new ethers.Contract(FXRP_ADDRESS, ERC20_ABI, provider);
  const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider);

  const [symbol, decimals] = await Promise.all([fxrp.symbol(), fxrp.decimals()]);

  const [
    availableLiquidity,
    totalLocked,
    totalShares,
    balanceOf,
    allowance,
    sharesOf,
  ] = await Promise.all([
    pool.availableLiquidity(),
    pool.totalLocked(),
    pool.totalSharesSupply(),
    address ? fxrp.balanceOf(address) : Promise.resolve(BigInt(0)),
    address ? fxrp.allowance(address, POOL_ADDRESS) : Promise.resolve(BigInt(0)),
    address ? pool.sharesOf(address) : Promise.resolve(BigInt(0)),
  ]);

  const format = (value: bigint) => ethers.formatUnits(value, Number(decimals));
  const sharesAmount = address ? await pool.sharesToAmount(sharesOf) : BigInt(0);

  return {
    rpcChainId: network.chainId.toString(),
    rpcBlock: block,
    fxrpSymbol: symbol,
    fxrpDecimals: Number(decimals),
    poolAvailable: format(availableLiquidity),
    poolTotalLocked: format(totalLocked),
    poolTotalShares: format(totalShares),
    walletFxrpBalance: address ? format(balanceOf) : undefined,
    walletFxrpAllowance: address ? format(allowance) : undefined,
    walletPoolShares: address ? format(sharesOf) : undefined,
    walletPoolLiquidity: address ? format(sharesAmount) : undefined,
  };
}

async function getWalletSigner() {
  if (!window.ethereum) {
    throw new Error("No injected wallet found (MetaMask).");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

async function getFxrpDecimalsWithWallet() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const fxrp = new ethers.Contract(FXRP_ADDRESS, ERC20_ABI, provider);
  const decimals: number = await fxrp.decimals();
  return decimals;
}

export async function withdrawFxrpAmount(amount: string) {
  const signer = await getWalletSigner();
  const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, signer);
  const decimals = await getFxrpDecimalsWithWallet();
  const value = ethers.parseUnits(amount, decimals);
  const tx = await pool.withdrawAmount(value);
  return tx.wait();
}
