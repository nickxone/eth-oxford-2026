import { ethers } from "hardhat";

async function main() {
    console.log("🔍 CHECKING FXRP BALANCE");

    // 1. Get the Asset Manager to find the Token Address
    const ASSET_MANAGER_ADDR = "0xc1Ca88b937d0b528842F95d5731ffB586f4fbDFA"; // The one we used
    const IAssetManager = artifacts.require("IAssetManager");
    const assetManager = await IAssetManager.at(ASSET_MANAGER_ADDR);

    // 2. Get the FXRP Token Contract
    const fAssetAddr = await assetManager.fAsset();
    console.log(`   🪙 FXRP Token Address: ${fAssetAddr}`);

    const IERC20 = await ethers.getContractAt("IERC20", fAssetAddr);

    // 3. Check Balance of your deployer wallet
    const [signer] = await ethers.getSigners();
    const balance = await IERC20.balanceOf(signer.address);

    console.log(`   👤 User: ${signer.address}`);
    console.log(`   💰 Balance: ${ethers.formatEther(balance)} FXRP`);
}

main().catch(console.error);
