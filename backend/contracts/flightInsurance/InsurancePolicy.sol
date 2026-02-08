// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
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
    string flight;
    string status;
    uint256 delayMinutes;
}

contract InsurancePolicy {
    using SafeERC20 for IERC20;

    enum PolicyStatus {
        Active,
        Settled,
        Expired
    }

    struct Policy {
        address holder;
        string flightRef;
        string travelDate;
        string predictedArrivalTime;
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
    event PolicySettled(uint256 indexed id);
    event PolicyExpired(uint256 indexed id);

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
        address holder,
        string memory flightRef,
        string memory travelDate,
        string memory predictedArrivalTime,
        uint256 premium,
        uint256 coverage,
        uint256 depositedAmount
    ) external {
        require(holder != address(0), "Holder address required");
        require(bytes(flightRef).length > 0, "Flight ref required");
        require(premium > 0, "Premium required");
        require(coverage > 0, "Coverage required");
        require(depositedAmount == premium, "Deposit mismatch");
        require(fxrp.balanceOf(address(this)) >= depositedAmount, "Insufficient deposited FXRP");

        fxrp.safeTransfer(address(pool), depositedAmount);
        pool.lockCoverage(registeredPolicies.length, coverage);

        Policy memory newPolicy = Policy({
            holder: holder,
            flightRef: flightRef,
            travelDate: travelDate,
            predictedArrivalTime: predictedArrivalTime,
            premium: premium,
            coverage: coverage,
            status: PolicyStatus.Active,
            id: registeredPolicies.length
        });

        registeredPolicies.push(newPolicy);
        emit PolicyCreated(newPolicy.id);
    }

    function resolvePolicy(uint256 id, IWeb2Json.Proof calldata proof) external {
        Policy memory policy = registeredPolicies[id];
        require(policy.status == PolicyStatus.Active, "Policy not active");

        require(isWeb2JsonProofValid(proof), "Invalid proof");
        FlightDelayDTO memory dto = abi.decode(proof.data.responseBody.abiEncodedData, (FlightDelayDTO));

        require(
            keccak256(bytes(dto.flight)) == keccak256(bytes(policy.flightRef)),
            string.concat("Flight ref mismatch: ", dto.flight)
        );

        if (_isDelayed(dto)) {
            policy.status = PolicyStatus.Settled;
            registeredPolicies[id] = policy;
            pool.payoutPolicy(id, policy.holder);
            emit PolicySettled(id);
        } else {
            policy.status = PolicyStatus.Expired;
            registeredPolicies[id] = policy;
            pool.releaseCoverage(id);
            emit PolicyExpired(id);
        }
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

    function _isDelayed(FlightDelayDTO memory dto) private pure returns (bool) {
        if (dto.delayMinutes > 0) {
            return true;
        }
        return keccak256(bytes(dto.status)) == keccak256(bytes("DELAYED"));
    }

    function isWeb2JsonProofValid(IWeb2Json.Proof calldata _proof) private view returns (bool) {
        if (useCustomVerifier) {
            return IFdcVerifier(fdcVerifier).verifyWeb2Json(_proof);
        }
        return ContractRegistry.getFdcVerification().verifyWeb2Json(_proof);
    }
}
