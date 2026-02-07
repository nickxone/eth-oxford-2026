import { ethers } from "ethers";
import { ERC20_ABI, FXRP_ADDRESS, POOL_ABI, POOL_ADDRESS } from "@/lib/contracts";

async function getSigner() {
  if (!window.ethereum) {
    throw new Error("No injected wallet found (MetaMask).");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

async function getFxrpDecimals() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const fxrp = new ethers.Contract(FXRP_ADDRESS, ERC20_ABI, provider);
  const decimals: number = await fxrp.decimals();
  return decimals;
}

export async function approveFxrp(amount: string, spender = POOL_ADDRESS) {
  const signer = await getSigner();
  const fxrp = new ethers.Contract(FXRP_ADDRESS, ERC20_ABI, signer);
  const decimals = await getFxrpDecimals();
  const value = ethers.parseUnits(amount, decimals);
  const tx = await fxrp.approve(spender, value);
  return tx.wait();
}

export async function transferFxrp(to: string, amount: string) {
  const signer = await getSigner();
  const fxrp = new ethers.Contract(FXRP_ADDRESS, ERC20_ABI, signer);
  const decimals = await getFxrpDecimals();
  const value = ethers.parseUnits(amount, decimals);
  const tx = await fxrp.transfer(to, value);
  return tx.wait();
}

export async function depositToPool(amount: string) {
  const signer = await getSigner();
  const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, signer);
  const decimals = await getFxrpDecimals();
  const value = ethers.parseUnits(amount, decimals);
  const tx = await pool.deposit(value);
  return tx.wait();
}

export async function withdrawFromPool(shareAmount: string, shareDecimals = 18) {
  const signer = await getSigner();
  const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, signer);
  const value = ethers.parseUnits(shareAmount, shareDecimals);
  const tx = await pool.withdraw(value);
  return tx.wait();
}
