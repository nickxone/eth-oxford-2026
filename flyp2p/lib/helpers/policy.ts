import { ethers } from "ethers";
import { 
  ERC20_ABI, 
  FXRP_ADDRESS, 
  POLICY_ABI, 
  POLICY_ADDRESS 
} from "@/lib/contracts";

const COSTON2_RPC = "https://coston2-api.flare.network/ext/C/rpc";

export type PolicyReadout = {
  id: string;
  holder: string;
  flightRef: string;
  startTimestamp: number;
  expirationTimestamp: number;
  delayThresholdMins: number;
  premium: string;
  coverage: string;
  status: string;
};

const STATUS_MAP = ["Unclaimed", "Active", "Settled", "Expired", "Retired"];

/**
 * Fetches all policies from the contract and formats them for the UI.
 */
export async function readAllPolicies(): Promise<PolicyReadout[]> {
  const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
  const policyContract = new ethers.Contract(POLICY_ADDRESS, POLICY_ABI, provider);
  const fxrp = new ethers.Contract(FXRP_ADDRESS, ERC20_ABI, provider);

  const [decimals, rawPolicies] = await Promise.all([
    fxrp.decimals(),
    policyContract.getAllPolicies(),
  ]);

  return rawPolicies.map((p: any) => ({
    id: p.id.toString(),
    holder: p.holder,
    flightRef: p.flightRef,
    startTimestamp: Number(p.startTimestamp),
    expirationTimestamp: Number(p.expirationTimestamp),
    delayThresholdMins: Number(p.delayThresholdMins),
    premium: ethers.formatUnits(p.premium, Number(decimals)),
    coverage: ethers.formatUnits(p.coverage, Number(decimals)),
    status: STATUS_MAP[Number(p.status)] || "Unknown",
  }));
}

/**
 * Fetches a single policy by its ID.
 */
export async function readPolicyById(id: number): Promise<PolicyReadout> {
  const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
  const policyContract = new ethers.Contract(POLICY_ADDRESS, POLICY_ABI, provider);
  const fxrp = new ethers.Contract(FXRP_ADDRESS, ERC20_ABI, provider);

  const [decimals, p] = await Promise.all([
    fxrp.decimals(),
    policyContract.registeredPolicies(id),
  ]);

  return {
    id: p.id.toString(),
    holder: p.holder,
    flightRef: p.flightRef,
    startTimestamp: Number(p.startTimestamp),
    expirationTimestamp: Number(p.expirationTimestamp),
    delayThresholdMins: Number(p.delayThresholdMins),
    premium: ethers.formatUnits(p.premium, Number(decimals)),
    coverage: ethers.formatUnits(p.coverage, Number(decimals)),
    status: STATUS_MAP[Number(p.status)] || "Unknown",
  };
}

/**
 * Checks if the Policy contract is allowed to spend the holder's FXRP.
 * This is required before calling acceptPolicy.
 */
export async function checkPolicyAllowance(holderAddress: string) {
  const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
  const fxrp = new ethers.Contract(FXRP_ADDRESS, ERC20_ABI, provider);
  const allowance = await fxrp.allowance(holderAddress, POLICY_ADDRESS);
  return allowance as bigint;
}