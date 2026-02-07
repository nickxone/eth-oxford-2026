// ============================================
// 1. CONFIGURATION (Update these after deploy)
// ============================================

// Make sure these match your Flare Coston2 deployment
export const FXRP_ADDRESS = "0x0b6A3645c240605887a5532109323A3E12273dc7"; 
export const POOL_ADDRESS = "0x58D3fF8b6d1A3C8f985609cf62c93e53da117a0C"; 
export const POLICY_ADDRESS = "0x4E6f06d3604B87699eEA88a171135981BbAB3466";

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
  // Events
  "event Deposited(address indexed from, uint256 amount)",
  "event Withdrawn(address indexed to, uint256 amount)",
  "event CoverageLocked(uint256 indexed policyId, uint256 amount)"
];

export const POLICY_ABI = [
  // Read-Only
  "function registeredPolicies(uint256) view returns (address holder, string flightRef, uint256 startTimestamp, uint256 expirationTimestamp, uint256 delayThresholdMins, uint256 premium, uint256 coverage, uint8 status, uint256 id)",
  "function getAllPolicies() view returns ((address holder, string flightRef, uint256 startTimestamp, uint256 expirationTimestamp, uint256 delayThresholdMins, uint256 premium, uint256 coverage, uint8 status, uint256 id)[])",
  "function fxrp() view returns (address)",
  "function pool() view returns (address)",
  // Write
  "function createPolicy(string flightRef, uint256 startTimestamp, uint256 expirationTimestamp, uint256 delayThresholdMins, uint256 premium, uint256 coverage)",
  "function acceptPolicy(uint256 id)",
  "function resolvePolicy(uint256 id, ((bytes32[] checkableBlockHashes, uint32 protocolId, uint32 votingRoundId, bool isFinal), (string url, string postData, string requestHeaders, string responseBodyABI, ((string responseBody, bytes abiEncodedData) responseBody))) proof)",
  "function expirePolicy(uint256 id)",
  "function retireUnclaimedPolicy(uint256 id)",
  // Events
  "event PolicyCreated(uint256 indexed id)",
  "event PolicyAccepted(uint256 indexed id)",
  "event PolicySettled(uint256 indexed id)",
  "event PolicyExpired(uint256 indexed id)",
  "event PolicyRetired(uint256 indexed id)"
];