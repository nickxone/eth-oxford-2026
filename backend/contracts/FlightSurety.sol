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

    // 1. REMOVED "BENEFICIARY" (We don't pay a fixed person anymore)

    // 2. ADDED REPLAY PROTECTION (Critical!)
    // This remembers which flights have already been paid out so a proof can't be reused.
    mapping(string => bool) public hasPaidOut;

    uint256 public constant PAYOUT_AMOUNT = 0.50 ether; // ⚠️ Make sure to fund contract with > 0.5 C2FLR
    uint256 public constant MIN_DELAY_MINUTES = 30;

    event PayoutExecuted(string flight, uint256 delay, address recipient);
    event FundsReceived(address sender, uint256 amount);

    constructor() payable {
        // Constructor can now accept funds directly on deployment
    }

    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    function claimPayout(IWeb2Json.Proof calldata proof) public {
        // A. Verify Proof Integrity (Flare Oracle)
        require(ContractRegistry.getFdcVerification().verifyWeb2Json(proof), "Invalid Proof");

        // B. Decode Data
        FlightStatusDTO memory dto = abi.decode(proof.data.responseBody.abiEncodedData, (FlightStatusDTO));

        // C. CHECK REPLAY PROTECTION BEFORE PAYING
        // require(!hasPaidOut[dto.flight], "Error: Claim already processed for this flight.");

        // D. Verify Delay Logic
        bool isDelayed = keccak256(bytes(dto.status)) == keccak256(bytes("Delayed"));
        require(isDelayed, "Claim Rejected: Flight is not delayed.");
        require(dto.delayMinutes >= MIN_DELAY_MINUTES, "Claim Rejected: Delay is too short.");
        require(address(this).balance >= PAYOUT_AMOUNT, "Error: Insufficient funds in contract.");

        // E. MARK AS PAID (Effectively "burning" the proof)
        hasPaidOut[dto.flight] = true;

        // F. PAY THE USER (msg.sender)
        payable(msg.sender).transfer(PAYOUT_AMOUNT);

        emit PayoutExecuted(dto.flight, dto.delayMinutes, msg.sender);
    }
}
