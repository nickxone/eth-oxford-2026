import { ethers } from "hardhat";
import { getFXRPTokenAddress } from "../utils/fassets";

const fxrp = (value: string) => ethers.parseUnits(value, 6);

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const tokenAddr = await getFXRPTokenAddress();
    console.log("FXRP token:", tokenAddr);

    const token = await ethers.getContractAt("IERC20", tokenAddr);

    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    const pool = await InsurancePool.deploy(tokenAddr);
    await pool.waitForDeployment();
    const poolAddr = await pool.getAddress();
    console.log("InsurancePool:", poolAddr);

    const InsurancePolicy = await ethers.getContractFactory("InsurancePolicy");
    const policy = await InsurancePolicy.deploy(tokenAddr, poolAddr, ethers.ZeroAddress);
    await policy.waitForDeployment();
    const policyAddr = await policy.getAddress();
    console.log("InsurancePolicy:", policyAddr);

    const setPolicyTx = await pool.setPolicyContract(policyAddr);
    await setPolicyTx.wait();
    console.log("Policy contract set");

    // Fund pool liquidity (requires deployer to hold FXRP on Coston2)
    const depositAmount = fxrp("0.1");
    const balance = await token.balanceOf(deployer.address);
    if (balance < depositAmount) {
        throw new Error(
            `Insufficient FXRP balance. Have ${balance.toString()} need ${depositAmount.toString()}`
        );
    }
    await (await token.approve(poolAddr, depositAmount)).wait();
    await (await pool.deposit(depositAmount)).wait();
    console.log("Deposited liquidity:", depositAmount.toString());

    // Create and accept a sample policy
    const now = Math.floor(Date.now() / 1000);
    const startTs = now + 60;
    const endTs = now + 3600;
    const premium = fxrp("0.001");
    const coverage = fxrp("0.02");

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

    // Withdraw test is optional because FXRP may restrict transfers from contracts.
    const RUN_WITHDRAW = process.env.RUN_WITHDRAW === "true";
    if (RUN_WITHDRAW) {
        const shares = await pool.sharesOf(deployer.address);
        const withdrawShares = shares / 100n; // 1% of shares
        if (withdrawShares > 0n) {
            const amount = await pool.sharesToAmount(withdrawShares);
            const available = await pool.availableLiquidity();
            if (amount <= available) {
                try {
                    await pool.withdraw.staticCall(withdrawShares);
                    await (await pool.withdraw(withdrawShares)).wait();
                    console.log("Withdrew shares:", withdrawShares.toString());
                } catch (err) {
                    console.log("Skip withdraw: withdrawal reverted", err);
                }
            } else {
                console.log(
                    "Skip withdraw: available liquidity too low",
                    { amount: amount.toString(), available: available.toString() }
                );
            }
        } else {
            console.log("Skip withdraw: no shares minted");
        }
    } else {
        console.log("Skip withdraw: RUN_WITHDRAW not enabled");
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
