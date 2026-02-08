import { ethers } from "hardhat";

async function main() {
    const FXRP_ADDRESS = "0x0b6A3645c240605887a5532109323A3E12273dc7";

    console.log("DEPLOYING INSURANCE POOL");
    console.log("---------------------------");

    const InsurancePool = await ethers.getContractFactory("contracts/InsurancePool.sol:InsurancePool");
    const pool = await InsurancePool.deploy(FXRP_ADDRESS);

    await pool.waitForDeployment();

    console.log(`✅ InsurancePool deployed to: ${pool.target}`);
    console.log(`🔗 Token tracked: fXRP at ${FXRP_ADDRESS}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
