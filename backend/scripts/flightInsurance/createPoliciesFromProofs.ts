import { ethers } from "hardhat";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getFXRPTokenAddress } from "../utils/fassets";

const fxrp = (value: string) => ethers.parseUnits(value, 6);

const DEFAULT_PREMIUM = "0.001";
const DEFAULT_COVERAGE = "0.02";
const DEFAULT_TRAVEL_DATE = "2026-02-10";
const DEFAULT_ARRIVAL_TIME = "18:30";

// TODO: Fill in holder addresses per flight if you want specific recipients.
const HOLDER_BY_FLIGHT: Record<string, string> = {
    "BF1234": "0x745487b8d78FcE9Fa7EABa5d564eD72E1E50fb8C",
    "BA001": "0x745487b8d78FcE9Fa7EABa5d564eD72E1E50fb8C",
    "LH888": "0x745487b8d78FcE9Fa7EABa5d564eD72E1E50fb8C",
    "AF777": "0x745487b8d78FcE9Fa7EABa5d564eD72E1E50fb8C",
    "QA999": "0x745487b8d78FcE9Fa7EABa5d564eD72E1E50fb8C"
};

type ProofEntry = {
    flight: string;
    responseHex: string;
    attestationType: string;
    merkleProof: string[];
};

function parseProofsTxt(contents: string): ProofEntry[] {
    const blocks = contents
        .split(/\n\s*\n+/)
        .map((b) => b.trim())
        .filter(Boolean);

    const entries: ProofEntry[] = [];
    for (const block of blocks) {
        const lines = block.split("\n").map((l) => l.trim());
        const flight = lines[0];
        if (!flight) continue;

        const responseHexMatch = block.match(/response_hex:\s*'([^']+)'/);
        const attestationMatch = block.match(/attestation_type:\s*'([^']+)'/);
        const proofSectionMatch = block.match(/proof:\s*\[([\s\S]*?)\]/);

        if (!responseHexMatch || !attestationMatch || !proofSectionMatch) {
            throw new Error(`Failed to parse proof block for flight ${flight}`);
        }

        const merkleProof = (proofSectionMatch[1].match(/0x[0-9a-fA-F]+/g) ?? []).map((p) => p);

        entries.push({
            flight,
            responseHex: responseHexMatch[1],
            attestationType: attestationMatch[1],
            merkleProof,
        });
    }

    return entries;
}

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const proofsPath = path.resolve(__dirname, "..", "..", "proofs.txt");
    const proofsTxt = await readFile(proofsPath, "utf8");
    const proofs = parseProofsTxt(proofsTxt);
    if (proofs.length === 0) {
        throw new Error("No proofs found in proofs.txt");
    }

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

    await (await pool.setPolicyContract(policyAddr)).wait();
    console.log("Policy contract set");

    const totalCoverage = proofs.reduce((sum) => sum + fxrp(DEFAULT_COVERAGE), 0n);
    const totalPremium = proofs.reduce((sum) => sum + fxrp(DEFAULT_PREMIUM), 0n);
    const requiredBalance = totalCoverage + totalPremium;

    const balance = await token.balanceOf(deployer.address);
    if (balance < requiredBalance) {
        throw new Error(
            `Insufficient FXRP balance. Need ${requiredBalance.toString()} but have ${balance.toString()}`
        );
    }

    await (await token.approve(poolAddr, totalCoverage)).wait();
    await (await pool.deposit(totalCoverage, { gasLimit: 10_000_000 })).wait();
    console.log("Deposited liquidity:", totalCoverage.toString());

    await (await token.transfer(policyAddr, totalPremium, { gasLimit: 10_000_000 })).wait();
    console.log("Funded policy contract with premiums:", totalPremium.toString());

    for (let i = 0; i < proofs.length; i++) {
        const entry = proofs[i];
        const holder = HOLDER_BY_FLIGHT[entry.flight] ?? deployer.address;

        console.log(`Creating policy for ${entry.flight} -> holder ${holder}`);
        await (
            await policy.createPolicy(
                holder,
                entry.flight,
                DEFAULT_TRAVEL_DATE,
                DEFAULT_ARRIVAL_TIME,
                fxrp(DEFAULT_PREMIUM),
                fxrp(DEFAULT_COVERAGE),
                fxrp(DEFAULT_PREMIUM),
                { gasLimit: 10_000_000 }
            )
        ).wait();
        console.log(`Created policy ${i} (${entry.flight})`);
    }

    console.log("\nDone. Policies created but not resolved.");
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
