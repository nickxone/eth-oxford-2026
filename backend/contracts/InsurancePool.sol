// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract InsurancePool {
    IERC20 public fxrpToken;

    // Maps User Address -> their fXRP balance inside this pool
    mapping(address => uint256) public contributions;

    event DepositTracked(address indexed user, uint256 amount);

    constructor(address _fxrpToken) {
        fxrpToken = IERC20(_fxrpToken);
    }

    /**
     * @notice This function is called by the Smart Account logic
     * after fXRP is minted and transferred here.
     */
    function recordDeposit(address _user, uint256 _amount) external {
        // Note: In a real app, you'd add a 'require' here to ensure
        // only the Smart Account Controller can call this.
        contributions[_user] += _amount;
        emit DepositTracked(_user, _amount);
    }

    // Check how much fXRP the pool currently holds
    function poolTotalBalance() external view returns (uint256) {
        return fxrpToken.balanceOf(address(this));
    }
}
