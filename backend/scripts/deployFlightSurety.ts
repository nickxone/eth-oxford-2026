import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`\n👷 Deploying with account: ${deployer.address}`);

    // 1. DEPLOY (Standard Ethers.js)
    const FlightSurety = await ethers.getContractFactory("FlightSurety");

    // We deploy and fund it in one step!
    // The { value: ... } sends the initial pool money during deployment.
    const insurance = await FlightSurety.deploy({
        value: ethers.parseEther("1.0"),
    });

    await insurance.waitForDeployment(); // Wait for block confirmation

    const address = await insurance.getAddress();
    console.log(`\n✅ FlightSurety Deployed to: ${address}`);
    console.log(`💰 Pool Funded with 1.0 C2FLR`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
