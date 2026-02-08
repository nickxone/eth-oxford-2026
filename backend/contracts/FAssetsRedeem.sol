// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { ContractRegistry } from "flare-periphery-contracts-fassets-test/coston2/ContractRegistry.sol";
import { IAssetManager } from "flare-periphery-contracts-fassets-test/coston2/IAssetManager.sol";
import { AssetManagerSettings } from "flare-periphery-contracts-fassets-test/coston2/data/AssetManagerSettings.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { RedemptionRequestInfo } from "flare-periphery-contracts-fassets-test/coston2/data/RedemptionRequestInfo.sol";

contract FAssetsRedeem {
    // Function to fund this contract (just for clarity, though direct transfer works too)
    receive() external payable {}

    // 1. Payout directly to an XRP Address
    function payoutToXRP(uint256 _lots, string memory _targetXrpAddress) public returns (uint256) {
        IAssetManager assetManager = ContractRegistry.getAssetManagerFXRP();
        AssetManagerSettings.Data memory settings = assetManager.getSettings();

        // Calculate required fXRP
        uint256 amountToRedeem = settings.lotSizeAMG * _lots;
        IERC20 fAssetToken = IERC20(getFXRPAddress());

        // Check if this contract has enough money in the pool
        require(fAssetToken.balanceOf(address(this)) >= amountToRedeem, "Insufficient insurance pool balance");

        // CRITICAL CHANGE: Approve the AssetManager to burn OUR tokens
        fAssetToken.approve(address(assetManager), amountToRedeem);

        // Call redeem.
        // NOTE: The AssetManager will take fXRP from 'address(this)' and
        // send XRP to '_targetXrpAddress'.
        uint256 redeemedAmountUBA = assetManager.redeem(_lots, _targetXrpAddress, payable(address(0)));

        return redeemedAmountUBA;
    }

    function getFXRPAddress() public view returns (address) {
        IAssetManager assetManager = ContractRegistry.getAssetManagerFXRP();
        return address(assetManager.fAsset());
    }

    function getSettings() public view returns (uint256 lotSizeAMG, uint256 assetDecimals) {
        IAssetManager assetManager = ContractRegistry.getAssetManagerFXRP();
        AssetManagerSettings.Data memory settings = assetManager.getSettings();
        return (settings.lotSizeAMG, settings.assetDecimals);
    }

    function getRedemptionRequestInfo(
        uint256 _redemptionTicketId
    ) public view returns (RedemptionRequestInfo.Data memory) {
        IAssetManager assetManager = ContractRegistry.getAssetManagerFXRP();
        return assetManager.redemptionRequestInfo(_redemptionTicketId);
    }
}
