import { ethers } from "hardhat";
import { getFXRPTokenAddress } from "../utils/fassets";

const fxrp = (value: string) => ethers.parseUnits(value, 6);

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const tokenAddr = await getFXRPTokenAddress();
    const token = await ethers.getContractAt("IERC20", tokenAddr);
    console.log("FXRP:", tokenAddr);

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

    const premium = fxrp("0.001");
    const coverage = fxrp("0.02");

    // Fund pool liquidity
    const depositAmount = fxrp("0.1");
    const balance = await token.balanceOf(deployer.address);
    if (balance < depositAmount + premium) {
        throw new Error(`Insufficient FXRP balance: ${balance.toString()}`);
    }
    await (await token.approve(poolAddr, depositAmount, )).wait();
    await (await pool.deposit(depositAmount, {gasLimit: 10000000})).wait();
    console.log("Deposited liquidity:", depositAmount.toString());

    // Create a sample policy

    await (await token.transfer(policyAddr, premium, {gasLimit: 10000000})).wait();
    const createTx = await policy.createPolicy(
        "AA1234",
        "2026-02-10",
        "18:30",
        premium,
        coverage,
        premium, {gasLimit: 10000000}
    );
    await createTx.wait();
    console.log("Policy created");

    const locked = await pool.lockedCoverage(0);
    console.log("Locked coverage:", locked.toString());

    // Withdraw test is optional because FXRP may restrict transfers from contracts.
    const shares = await pool.sharesOf(deployer.address);
    const withdrawShares = shares / 100n; // 1% of shares
    if (withdrawShares > 0n) {
        const amount = await pool.sharesToAmount(withdrawShares);
        const available = await pool.availableLiquidity();
        if (amount <= available) {
            try {
                await pool.withdraw.staticCall(withdrawShares);
                await (await pool.withdraw(withdrawShares, {gasLimit: 10000000})).wait();
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

    // Smoke test for withdrawAmount using a small portion of available liquidity.
    const available = await pool.availableLiquidity();
    const withdrawAmount = available / 100n; // 1% of available liquidity
    if (withdrawAmount > 0n) {
        try {
            await pool.withdrawAmount.staticCall(withdrawAmount);
            await (await pool.withdrawAmount(withdrawAmount, {gasLimit: 10000000})).wait();
            console.log("Withdrew amount:", withdrawAmount.toString());
        } catch (err) {
            console.log("Skip withdrawAmount: withdrawal reverted", err);
        }
    } else {
        console.log("Skip withdrawAmount: no available liquidity");
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
