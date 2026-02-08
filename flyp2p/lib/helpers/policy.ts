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
  travelDate: string;
  predictedArrivalTime: string;
  premium: string;
  coverage: string;
  status: string;
};

const STATUS_MAP = ["Active", "Settled", "Expired"];

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
    travelDate: p.travelDate,
    predictedArrivalTime: p.predictedArrivalTime,
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
    travelDate: p.travelDate,
    predictedArrivalTime: p.predictedArrivalTime,
    premium: ethers.formatUnits(p.premium, Number(decimals)),
    coverage: ethers.formatUnits(p.coverage, Number(decimals)),
    status: STATUS_MAP[Number(p.status)] || "Unknown",
  };
}

/**
 * Fetches all policies for a specific holder address.
 */
export async function readPoliciesByHolder(
  holderAddress: string
): Promise<PolicyReadout[]> {
  const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
  const policyContract = new ethers.Contract(POLICY_ADDRESS, POLICY_ABI, provider);
  const fxrp = new ethers.Contract(FXRP_ADDRESS, ERC20_ABI, provider);

  const [decimals, rawPolicies] = await Promise.all([
    fxrp.decimals(),
    policyContract.getPoliciesByHolder(holderAddress),
  ]);

  return rawPolicies.map((p: any) => ({
    id: p.id.toString(),
    holder: p.holder,
    flightRef: p.flightRef,
    travelDate: p.travelDate,
    predictedArrivalTime: p.predictedArrivalTime,
    premium: ethers.formatUnits(p.premium, Number(decimals)),
    coverage: ethers.formatUnits(p.coverage, Number(decimals)),
    status: STATUS_MAP[Number(p.status)] || "Unknown",
  }));
}

/**
 * Resolves a policy on-chain using a Web2Json proof.
 */
export async function resolvePolicyOnChain(
  id: number | string,
  proof: unknown
) {
  if (!window.ethereum) throw new Error("MetaMask not found");

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const policyContract = new ethers.Contract(POLICY_ADDRESS, POLICY_ABI, signer);

  const tx = await policyContract.resolvePolicy(id, proof);
  await tx.wait();
  return tx.hash as string;
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
