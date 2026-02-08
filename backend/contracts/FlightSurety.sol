// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { IWeb2Json } from "@flarenetwork/flare-periphery-contracts/coston2/IWeb2Json.sol";
import { ContractRegistry } from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";

contract FlightSurety {
    struct FlightStatusDTO {
        string flight;
        string status;
        uint256 delayMinutes;
    }

    address public immutable BENEFICIARY;
    uint256 public constant PAYOUT_AMOUNT = 0.50 ether;
    uint256 public constant MIN_DELAY_MINUTES = 30;

    event PayoutExecuted(string flight, uint256 delay, address recipient);
    event FundsReceived(address sender, uint256 amount);

    constructor(address _beneficiary) {
        BENEFICIARY = _beneficiary;
    }

    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    function claimPayout(IWeb2Json.Proof calldata proof) public {
        require(ContractRegistry.getFdcVerification().verifyWeb2Json(proof), "Invalid Proof");

        FlightStatusDTO memory dto = abi.decode(proof.data.responseBody.abiEncodedData, (FlightStatusDTO));

        bool isDelayed = keccak256(bytes(dto.status)) == keccak256(bytes("Delayed"));

        require(isDelayed, "Claim Rejected: Flight is not delayed.");
        require(dto.delayMinutes >= MIN_DELAY_MINUTES, "Claim Rejected: Delay is too short.");
        require(address(this).balance >= PAYOUT_AMOUNT, "Error: Pool empty.");

        payable(BENEFICIARY).transfer(PAYOUT_AMOUNT);
        emit PayoutExecuted(dto.flight, dto.delayMinutes, BENEFICIARY);
    }
}
`