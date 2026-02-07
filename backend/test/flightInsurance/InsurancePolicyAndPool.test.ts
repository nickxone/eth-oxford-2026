import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const fxrp = (value: string) => ethers.parseUnits(value, 6);

const abiCoder = ethers.AbiCoder.defaultAbiCoder();

function makeProof(dto: {
    flightRef: string;
    scheduledDepartureTs: bigint;
    actualDepartureTs: bigint;
    delayMins: bigint;
    status: string;
}) {
    const encoded = abiCoder.encode(
        [
            "tuple(string flightRef,uint256 scheduledDepartureTs,uint256 actualDepartureTs,uint256 delayMins,string status)",
        ],
        [dto]
    );

    return {
        merkleProof: [] as string[],
        data: {
            attestationType: ethers.ZeroHash,
            sourceId: ethers.ZeroHash,
            votingRound: 0,
            lowestUsedTimestamp: 0,
            requestBody: {
                url: "",
                httpMethod: "",
                headers: "",
                queryParams: "",
                body: "",
                postProcessJq: "",
                abiSignature: "",
            },
            responseBody: {
                abiEncodedData: encoded,
            },
        },
    };
}

describe("InsurancePolicy + InsurancePool", function () {
    async function deployAll() {
        const [owner, lp, holder] = await ethers.getSigners();

        const TestERC20 = await ethers.getContractFactory("TestERC20");
        const token = await TestERC20.deploy("FXRP", "FXRP", 6, fxrp("1000000"));

        const MockFdcVerifier = await ethers.getContractFactory("MockFdcVerifier");
        const verifier = await MockFdcVerifier.deploy();

        const InsurancePool = await ethers.getContractFactory("InsurancePool");
        const pool = await InsurancePool.deploy(await token.getAddress());

        const InsurancePolicy = await ethers.getContractFactory("InsurancePolicy");
        const policy = await InsurancePolicy.deploy(
            await token.getAddress(),
            await pool.getAddress(),
            await verifier.getAddress()
        );

        await pool.setPolicyContract(await policy.getAddress());

        await token.mint(lp.address, fxrp("2000"));
        await token.mint(holder.address, fxrp("2000"));

        return { owner, lp, holder, token, pool, policy, verifier };
    }

    it("accepts policy, transfers premium, and locks coverage", async function () {
        const { lp, holder, token, pool, policy } = await deployAll();

        await token.connect(lp).approve(await pool.getAddress(), fxrp("1000"));
        await pool.connect(lp).deposit(fxrp("1000"));

        const now = BigInt(await time.latest());
        const startTs = now + 600n;
        const endTs = startTs + 3600n;
        const premium = fxrp("10");
        const coverage = fxrp("200");

        await policy
            .connect(holder)
            .createPolicy("AA1234-2026-02-10", startTs, endTs, 60, premium, coverage);

        await token.connect(holder).approve(await policy.getAddress(), premium);
        await policy.acceptPolicy(0);

        expect(await pool.lockedCoverage(0)).to.equal(coverage);
        expect(await token.balanceOf(await pool.getAddress())).to.equal(fxrp("1010"));
    });

    it("pays out on valid proof", async function () {
        const { lp, holder, token, pool, policy } = await deployAll();

        await token.connect(lp).approve(await pool.getAddress(), fxrp("1000"));
        await pool.connect(lp).deposit(fxrp("1000"));

        const now = BigInt(await time.latest());
        const startTs = now + 10n;
        const endTs = startTs + 3600n;
        const premium = fxrp("10");
        const coverage = fxrp("200");

        await policy
            .connect(holder)
            .createPolicy("AA1234-2026-02-10", startTs, endTs, 60, premium, coverage);

        await token.connect(holder).approve(await policy.getAddress(), premium);
        await policy.acceptPolicy(0);

        await time.increaseTo(Number(startTs + 1n));

        const scheduled = startTs + 60n;
        const delayMins = 90n;
        const proof = makeProof({
            flightRef: "AA1234-2026-02-10",
            scheduledDepartureTs: scheduled,
            actualDepartureTs: scheduled + delayMins * 60n,
            delayMins,
            status: "DELAYED",
        });

        const before = await token.balanceOf(holder.address);
        await policy.resolvePolicy(0, proof);
        const after = await token.balanceOf(holder.address);

        expect(after - before).to.equal(coverage);
        expect(await pool.lockedCoverage(0)).to.equal(0);
    });

    it("expires policy and releases coverage", async function () {
        const { lp, holder, token, pool, policy } = await deployAll();

        await token.connect(lp).approve(await pool.getAddress(), fxrp("1000"));
        await pool.connect(lp).deposit(fxrp("1000"));

        const now = BigInt(await time.latest());
        const startTs = now + 10n;
        const endTs = startTs + 60n;
        const premium = fxrp("10");
        const coverage = fxrp("200");

        await policy
            .connect(holder)
            .createPolicy("AA1234-2026-02-10", startTs, endTs, 60, premium, coverage);

        await token.connect(holder).approve(await policy.getAddress(), premium);
        await policy.acceptPolicy(0);

        await time.increaseTo(Number(endTs + 1n));
        await policy.expirePolicy(0);

        expect(await pool.lockedCoverage(0)).to.equal(0);
        expect(await pool.availableLiquidity()).to.equal(await token.balanceOf(await pool.getAddress()));
    });
});
