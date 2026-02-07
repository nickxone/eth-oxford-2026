// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract SimpleEscrow {
    address public sender;
    address public recipient;
    uint256 public amount;

    event Deposited(address indexed from, uint256 value);
    event Withdrawn(address indexed to, uint256 value);

    // Person A calls this and sends C2FLR with the transaction
    function deposit(address _recipient) external payable {
        require(msg.value > 0, "Must send some C2FLR");
        sender = msg.sender;
        recipient = _recipient;
        amount = msg.value;

        emit Deposited(msg.sender, msg.value);
    }

    // Person B calls this to pull the money out
    function withdraw() external {
        require(msg.sender == recipient, "Only the designated recipient can withdraw");
        require(amount > 0, "No funds available");

        uint256 balance = amount;
        amount = 0; // Reset before transfer to prevent re-entrancy

        (bool success, ) = payable(recipient).call{value: balance}("");
        require(success, "Transfer failed");

        emit Withdrawn(recipient, balance);
    }

    // Helper to check contract balance
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}