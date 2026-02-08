import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`\n👷 Deploying FAssetsRedeem with account: ${deployer.address}`);

    // Get the contract factory
    const FAssetsRedeem = await ethers.getContractFactory("FAssetsRedeem");

    // Deploy
    const fAssetsRedeem = await FAssetsRedeem.deploy();
    await fAssetsRedeem.waitForDeployment();

    const address = await fAssetsRedeem.getAddress();

    console.log("-----------------------------------------------");
    console.log(`✅ FAssetsRedeem Deployed to: ${address}`);
    console.log("-----------------------------------------------");
    console.log(`👉 Next step: Fund this address with fXRP and run the payout script.`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
