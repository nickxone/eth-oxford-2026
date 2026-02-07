import { ethers } from "hardhat";

const usdc = (value: string) => ethers.parseUnits(value, 6);

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const token = await TestERC20.deploy("USD Coin", "USDC", 6, usdc("1000000"));
    await token.waitForDeployment();
    const tokenAddr = await token.getAddress();
    console.log("Mock USDC:", tokenAddr);

    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    const pool = await InsurancePool.deploy(tokenAddr);
    await pool.waitForDeployment();
    const poolAddr = await pool.getAddress();
    console.log("InsurancePool:", poolAddr);

    const InsurancePolicy = await ethers.getContractFactory("InsurancePolicy");
    const policy = await InsurancePolicy.deploy(tokenAddr, poolAddr);
    await policy.waitForDeployment();
    const policyAddr = await policy.getAddress();
    console.log("InsurancePolicy:", policyAddr);

    const setPolicyTx = await pool.setPolicyContract(policyAddr);
    await setPolicyTx.wait();
    console.log("Policy contract set");

    // Fund pool liquidity
    const depositAmount = usdc("1000");
    await (await token.approve(poolAddr, depositAmount)).wait();
    await (await pool.deposit(depositAmount)).wait();
    console.log("Deposited liquidity:", depositAmount.toString());

    // Create and accept a sample policy
    const now = Math.floor(Date.now() / 1000);
    const startTs = now + 60;
    const endTs = now + 3600;
    const premium = usdc("10");
    const coverage = usdc("200");

    const createTx = await policy.createPolicy(
        "AA1234-2026-02-10",
        startTs,
        endTs,
        60,
        premium,
        coverage
    );
    await createTx.wait();
    console.log("Policy created");

    await (await token.approve(policyAddr, premium)).wait();
    const acceptTx = await policy.acceptPolicy(0);
    await acceptTx.wait();
    console.log("Policy accepted");

    const locked = await pool.lockedCoverage(0);
    console.log("Locked coverage:", locked.toString());
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
