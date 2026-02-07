// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { IWeb2Json } from "@flarenetwork/flare-periphery-contracts/coston2/IWeb2Json.sol";
import { ContractRegistry } from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";

interface IFdcVerifier {
    function verifyWeb2Json(IWeb2Json.Proof calldata proof) external view returns (bool);
}

interface IInsurancePool {
    function lockCoverage(uint256 policyId, uint256 amount) external;
    function releaseCoverage(uint256 policyId) external;
    function payoutPolicy(uint256 policyId, address to) external;
}

struct FlightDelayDTO {
    string flightRef;
    uint256 scheduledDepartureTs;
    uint256 actualDepartureTs;
    uint256 delayMins;
    string status;
}

contract InsurancePolicy {
    using SafeERC20 for IERC20;

    enum PolicyStatus {
        Unclaimed,
        Active,
        Settled,
        Expired,
        Retired
    }

    struct Policy {
        address holder;
        string flightRef;
        uint256 startTimestamp;
        uint256 expirationTimestamp;
        uint256 delayThresholdMins;
        uint256 premium;
        uint256 coverage;
        PolicyStatus status;
        uint256 id;
    }

    IERC20 public immutable fxrp;
    IInsurancePool public immutable pool;
    address public immutable fdcVerifier;
    bool public immutable useCustomVerifier;

    Policy[] public registeredPolicies;

    event PolicyCreated(uint256 indexed id);
    event PolicyAccepted(uint256 indexed id);
    event PolicySettled(uint256 indexed id);
    event PolicyExpired(uint256 indexed id);
    event PolicyRetired(uint256 indexed id);

    constructor(address fxrpAddress, address poolAddress, address customFdcVerifier) {
        require(fxrpAddress != address(0), "FXRP address required");
        require(poolAddress != address(0), "Pool address required");
        fxrp = IERC20(fxrpAddress);
        pool = IInsurancePool(poolAddress);
        if (customFdcVerifier != address(0)) {
            fdcVerifier = customFdcVerifier;
            useCustomVerifier = true;
        }
    }

    function createPolicy(
        string memory flightRef,
        uint256 startTimestamp,
        uint256 expirationTimestamp,
        uint256 delayThresholdMins,
        uint256 premium,
        uint256 coverage
    ) external {
        require(bytes(flightRef).length > 0, "Flight ref required");
        require(startTimestamp < expirationTimestamp, "Invalid timestamps");
        require(premium > 0, "Premium required");
        require(coverage > 0, "Coverage required");

        Policy memory newPolicy = Policy({
            holder: msg.sender,
            flightRef: flightRef,
            startTimestamp: startTimestamp,
            expirationTimestamp: expirationTimestamp,
            delayThresholdMins: delayThresholdMins,
            premium: premium,
            coverage: coverage,
            status: PolicyStatus.Unclaimed,
            id: registeredPolicies.length
        });

        registeredPolicies.push(newPolicy);
        emit PolicyCreated(newPolicy.id);
    }

    function acceptPolicy(uint256 id) external {
        Policy memory policy = registeredPolicies[id];
        require(policy.status == PolicyStatus.Unclaimed, "Policy not unclaimed");
        if (block.timestamp > policy.startTimestamp) {
            retireUnclaimedPolicy(id);
            return;
        }

        pool.lockCoverage(id, policy.coverage);
        fxrp.safeTransferFrom(policy.holder, address(pool), policy.premium);

        policy.status = PolicyStatus.Active;
        registeredPolicies[id] = policy;

        emit PolicyAccepted(id);
    }

    function resolvePolicy(uint256 id, IWeb2Json.Proof calldata proof) external {
        Policy memory policy = registeredPolicies[id];
        require(policy.status == PolicyStatus.Active, "Policy not active");

        if (block.timestamp > policy.expirationTimestamp) {
            expirePolicy(id);
            return;
        }

        require(isWeb2JsonProofValid(proof), "Invalid proof");
        FlightDelayDTO memory dto = abi.decode(proof.data.responseBody.abiEncodedData, (FlightDelayDTO));

        require(
            keccak256(bytes(dto.flightRef)) == keccak256(bytes(policy.flightRef)),
            string.concat("Flight ref mismatch: ", dto.flightRef)
        );

        require(
            dto.scheduledDepartureTs >= policy.startTimestamp && dto.scheduledDepartureTs <= policy.expirationTimestamp,
            string.concat(
                "Scheduled time out of range: ",
                Strings.toString(dto.scheduledDepartureTs),
                " vs. ",
                Strings.toString(policy.startTimestamp),
                "-",
                Strings.toString(policy.expirationTimestamp)
            )
        );

        require(
            dto.delayMins >= policy.delayThresholdMins,
            string.concat(
                "Delay below threshold: ",
                Strings.toString(dto.delayMins),
                " vs. ",
                Strings.toString(policy.delayThresholdMins)
            )
        );

        policy.status = PolicyStatus.Settled;
        registeredPolicies[id] = policy;

        pool.payoutPolicy(id, policy.holder);
        emit PolicySettled(id);
    }

    function expirePolicy(uint256 id) public {
        Policy memory policy = registeredPolicies[id];
        require(policy.status == PolicyStatus.Active, "Policy not active");
        require(block.timestamp > policy.expirationTimestamp, "Policy not expired");
        policy.status = PolicyStatus.Expired;
        registeredPolicies[id] = policy;
        pool.releaseCoverage(id);
        emit PolicyExpired(id);
    }

    function retireUnclaimedPolicy(uint256 id) public {
        Policy memory policy = registeredPolicies[id];
        require(policy.status == PolicyStatus.Unclaimed, "Policy not unclaimed");
        require(block.timestamp > policy.startTimestamp, "Policy not started");
        policy.status = PolicyStatus.Retired;
        registeredPolicies[id] = policy;
        emit PolicyRetired(id);
    }

    function getAllPolicies() external view returns (Policy[] memory) {
        return registeredPolicies;
    }

    function getPoliciesByHolder(address holder) external view returns (Policy[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < registeredPolicies.length; i++) {
            if (registeredPolicies[i].holder == holder) {
                count++;
            }
        }
        Policy[] memory result = new Policy[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < registeredPolicies.length; i++) {
            if (registeredPolicies[i].holder == holder) {
                result[idx] = registeredPolicies[i];
                idx++;
            }
        }
        return result;
    }

    function activePoliciesCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < registeredPolicies.length; i++) {
            if (registeredPolicies[i].status == PolicyStatus.Active) {
                count++;
            }
        }
        return count;
    }

    

    function abiSignatureHack(FlightDelayDTO memory dto) public pure {}

    function isWeb2JsonProofValid(IWeb2Json.Proof calldata _proof) private view returns (bool) {
        if (useCustomVerifier) {
            return IFdcVerifier(fdcVerifier).verifyWeb2Json(_proof);
        }
        return ContractRegistry.getFdcVerification().verifyWeb2Json(_proof);
    }
}
