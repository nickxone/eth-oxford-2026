// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract InsurancePool {
    IERC20 public immutable usdc;
    address public owner;
    address public policyContract;

    mapping(address => uint256) public shares;
    uint256 public totalShares;

    mapping(uint256 => uint256) public lockedCoverage;
    uint256 public totalLocked;

    event OwnerUpdated(address indexed previousOwner, address indexed newOwner);
    event PolicyContractUpdated(address indexed previousPolicy, address indexed newPolicy);
    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event SharesMinted(address indexed to, uint256 amount);
    event SharesBurned(address indexed from, uint256 amount);
    event CoverageLocked(uint256 indexed policyId, uint256 amount);
    event CoverageReleased(uint256 indexed policyId, uint256 amount);
    event Payout(uint256 indexed policyId, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyPolicy() {
        require(msg.sender == policyContract, "Only policy contract");
        _;
    }

    constructor(address usdcAddress) {
        require(usdcAddress != address(0), "USDC address required");
        usdc = IERC20(usdcAddress);
        owner = msg.sender;
        emit OwnerUpdated(address(0), msg.sender);
    }

    function setOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Owner address required");
        emit OwnerUpdated(owner, newOwner);
        owner = newOwner;
    }

    function setPolicyContract(address newPolicyContract) external onlyOwner {
        require(newPolicyContract != address(0), "Policy address required");
        emit PolicyContractUpdated(policyContract, newPolicyContract);
        policyContract = newPolicyContract;
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount required");
        uint256 poolBalance = usdc.balanceOf(address(this));
        uint256 mintedShares;
        if (totalShares == 0 || poolBalance == 0) {
            mintedShares = amount;
        } else {
            mintedShares = (amount * totalShares) / poolBalance;
            require(mintedShares > 0, "Deposit too small");
        }
        bool ok = usdc.transferFrom(msg.sender, address(this), amount);
        require(ok, "USDC transfer failed");
        shares[msg.sender] += mintedShares;
        totalShares += mintedShares;
        emit Deposited(msg.sender, amount);
        emit SharesMinted(msg.sender, mintedShares);
    }

    function withdraw(uint256 shareAmount) external {
        require(shareAmount > 0, "Share amount required");
        require(shares[msg.sender] >= shareAmount, "Insufficient shares");
        uint256 poolBalance = usdc.balanceOf(address(this));
        uint256 amount = (shareAmount * poolBalance) / totalShares;
        require(amount > 0, "Withdraw too small");
        require(availableLiquidity() >= amount, "Insufficient available liquidity");
        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;
        bool ok = usdc.transfer(msg.sender, amount);
        require(ok, "USDC transfer failed");
        emit Withdrawn(msg.sender, amount);
        emit SharesBurned(msg.sender, shareAmount);
    }

    function sharesToAmount(uint256 shareAmount) external view returns (uint256) {
        if (shareAmount == 0 || totalShares == 0) {
            return 0;
        }
        uint256 poolBalance = usdc.balanceOf(address(this));
        return (shareAmount * poolBalance) / totalShares;
    }

    function sharesOf(address lp) external view returns (uint256) {
        return shares[lp];
    }

    function totalSharesSupply() external view returns (uint256) {
        return totalShares;
    }

    function lockCoverage(uint256 policyId, uint256 amount) external onlyPolicy {
        require(amount > 0, "Amount required");
        require(lockedCoverage[policyId] == 0, "Coverage already locked");
        require(availableLiquidity() >= amount, "Insufficient available liquidity");
        lockedCoverage[policyId] = amount;
        totalLocked += amount;
        emit CoverageLocked(policyId, amount);
    }

    function releaseCoverage(uint256 policyId) external onlyPolicy {
        uint256 amount = lockedCoverage[policyId];
        require(amount > 0, "No coverage locked");
        lockedCoverage[policyId] = 0;
        totalLocked -= amount;
        emit CoverageReleased(policyId, amount);
    }

    function payoutPolicy(uint256 policyId, address to) external onlyPolicy {
        require(to != address(0), "Recipient required");
        uint256 amount = lockedCoverage[policyId];
        require(amount > 0, "No coverage locked");
        lockedCoverage[policyId] = 0;
        totalLocked -= amount;
        bool ok = usdc.transfer(to, amount);
        require(ok, "USDC transfer failed");
        emit Payout(policyId, to, amount);
    }

    function availableLiquidity() public view returns (uint256) {
        uint256 balance = usdc.balanceOf(address(this));
        if (balance <= totalLocked) {
            return 0;
        }
        return balance - totalLocked;
    }
}
