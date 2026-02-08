// ============================================
// 1. CONFIGURATION (Update these after deploy)
// ============================================

// Make sure these match your Flare Coston2 deployment
export const FXRP_ADDRESS = "0x0b6A3645c240605887a5532109323A3E12273dc7"; 
export const POOL_ADDRESS = "0xfa2D700aAf28984c4bDb25C2eBB972561A868040"; 
export const POLICY_ADDRESS = "0x8A62DCC0a2578c2c51b42E7522334EA3e7bA7093";

// ============================================
// 2. HUMAN-READABLE ABIs
// ============================================

export const ERC20_ABI = [
  // Read-Only
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  // Write
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
];

export const POOL_ABI = [
  // Read-Only
  "function sharesOf(address lp) view returns (uint256)",
  "function totalSharesSupply() view returns (uint256)",
  "function availableLiquidity() view returns (uint256)",
  "function sharesToAmount(uint256 shareAmount) view returns (uint256)",
  "function totalLocked() view returns (uint256)",
  // Write
  "function deposit(uint256 amount)",
  "function withdraw(uint256 shareAmount)",
  "function withdrawAmount(uint256 amount)",
  // Events
  "event Deposited(address indexed from, uint256 amount)",
  "event Withdrawn(address indexed to, uint256 amount)",
  "event CoverageLocked(uint256 indexed policyId, uint256 amount)"
];

export const POLICY_ABI = [
  // Read-Only
  "function registeredPolicies(uint256) view returns (address holder, string flightRef, string travelDate, string predictedArrivalTime, uint256 premium, uint256 coverage, uint8 status, uint256 id)",
  "function getAllPolicies() view returns ((address holder, string flightRef, string travelDate, string predictedArrivalTime, uint256 premium, uint256 coverage, uint8 status, uint256 id)[])",
  "function getPoliciesByHolder(address holder) view returns ((address holder, string flightRef, string travelDate, string predictedArrivalTime, uint256 premium, uint256 coverage, uint8 status, uint256 id)[])",
  "function activePoliciesCount() view returns (uint256)",
  "function fxrp() view returns (address)",
  "function pool() view returns (address)",
  "function fdcVerifier() view returns (address)",
  "function useCustomVerifier() view returns (bool)",
  // Write
  "function createPolicy(address holder, string flightRef, string travelDate, string predictedArrivalTime, uint256 premium, uint256 coverage, uint256 depositedAmount)",
  "function resolvePolicy(uint256 id, (bytes32[] merkleProof, (bytes32 attestationType, bytes32 sourceId, uint64 votingRound, uint64 lowestUsedTimestamp, (string url, string httpMethod, string headers, string queryParams, string body, string postProcessJq, string abiSignature) requestBody, (bytes abiEncodedData) responseBody) data) proof)",
  // Events
  "event PolicyCreated(uint256 indexed id)",
  "event PolicySettled(uint256 indexed id)",
  "event PolicyExpired(uint256 indexed id)"
];
