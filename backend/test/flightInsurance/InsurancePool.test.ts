import { expect } from "chai";
import { ethers } from "hardhat";

const usdc = (value: string) => ethers.parseUnits(value, 6);

describe("InsurancePool", function () {
    async function deployPool() {
        const [owner, lp1, lp2, policy] = await ethers.getSigners();

        const TestERC20 = await ethers.getContractFactory("TestERC20");
        const token = await TestERC20.deploy("USD Coin", "USDC", 6, usdc("1000000"));

        const InsurancePool = await ethers.getContractFactory("InsurancePool");
        const pool = await InsurancePool.deploy(await token.getAddress());

        await pool.setPolicyContract(policy.address);

        await token.mint(lp1.address, usdc("1000"));
        await token.mint(lp2.address, usdc("1000"));

        return { owner, lp1, lp2, policy, token, pool };
    }

    it("mints shares 1:1 on first deposit and pro-rata after", async function () {
        const { lp1, lp2, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), usdc("100"));
        await pool.connect(lp1).deposit(usdc("100"));

        expect(await pool.totalShares()).to.equal(usdc("100"));
        expect(await pool.shares(lp1.address)).to.equal(usdc("100"));

        await token.connect(lp2).approve(await pool.getAddress(), usdc("50"));
        await pool.connect(lp2).deposit(usdc("50"));

        expect(await pool.totalShares()).to.equal(usdc("150"));
        expect(await pool.shares(lp2.address)).to.equal(usdc("50"));
    });

    it("withdraw burns shares and pays USDC", async function () {
        const { lp1, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), usdc("200"));
        await pool.connect(lp1).deposit(usdc("200"));

        const before = await token.balanceOf(lp1.address);
        await pool.connect(lp1).withdraw(usdc("50"));
        const after = await token.balanceOf(lp1.address);

        expect(await pool.shares(lp1.address)).to.equal(usdc("150"));
        expect(after - before).to.equal(usdc("50"));
    });

    it("respects locked coverage when withdrawing", async function () {
        const { lp1, policy, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), usdc("100"));
        await pool.connect(lp1).deposit(usdc("100"));

        await pool.connect(policy).lockCoverage(1, usdc("80"));

        await expect(pool.connect(lp1).withdraw(usdc("100"))).to.be.revertedWith(
            "Insufficient available liquidity"
        );

        await pool.connect(policy).releaseCoverage(1);
        await pool.connect(lp1).withdraw(usdc("100"));

        expect(await pool.shares(lp1.address)).to.equal(0);
    });

    it("sharesToAmount matches pool balance", async function () {
        const { lp1, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), usdc("123"));
        await pool.connect(lp1).deposit(usdc("123"));

        expect(await pool.sharesToAmount(usdc("123"))).to.equal(usdc("123"));
    });

    it("sharesOf and totalSharesSupply report balances", async function () {
        const { lp1, lp2, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), usdc("100"));
        await pool.connect(lp1).deposit(usdc("100"));
        await token.connect(lp2).approve(await pool.getAddress(), usdc("50"));
        await pool.connect(lp2).deposit(usdc("50"));

        expect(await pool.sharesOf(lp1.address)).to.equal(usdc("100"));
        expect(await pool.sharesOf(lp2.address)).to.equal(usdc("50"));
        expect(await pool.totalSharesSupply()).to.equal(usdc("150"));
    });

    it("setOwner is owner-only and updates owner", async function () {
        const { owner, lp1, pool } = await deployPool();

        await expect(pool.connect(lp1).setOwner(lp1.address)).to.be.revertedWith("Only owner");

        await pool.connect(owner).setOwner(lp1.address);
        expect(await pool.owner()).to.equal(lp1.address);
    });

    it("setPolicyContract is owner-only and updates policy contract", async function () {
        const { owner, lp1, pool } = await deployPool();

        await expect(pool.connect(lp1).setPolicyContract(lp1.address)).to.be.revertedWith("Only owner");

        await pool.connect(owner).setPolicyContract(lp1.address);
        expect(await pool.policyContract()).to.equal(lp1.address);
    });

    it("lockCoverage is policy-only and affects available liquidity", async function () {
        const { lp1, lp2, policy, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), usdc("200"));
        await pool.connect(lp1).deposit(usdc("200"));

        await expect(pool.connect(lp2).lockCoverage(1, usdc("50"))).to.be.revertedWith(
            "Only policy contract"
        );

        await pool.connect(policy).lockCoverage(1, usdc("50"));
        expect(await pool.lockedCoverage(1)).to.equal(usdc("50"));
        expect(await pool.availableLiquidity()).to.equal(usdc("150"));
    });

    it("releaseCoverage is policy-only and clears locked amount", async function () {
        const { lp1, policy, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), usdc("100"));
        await pool.connect(lp1).deposit(usdc("100"));
        await pool.connect(policy).lockCoverage(1, usdc("40"));

        await expect(pool.connect(lp1).releaseCoverage(1)).to.be.revertedWith("Only policy contract");

        await pool.connect(policy).releaseCoverage(1);
        expect(await pool.lockedCoverage(1)).to.equal(0);
    });

    it("payoutPolicy is policy-only and transfers coverage", async function () {
        const { lp1, policy, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), usdc("100"));
        await pool.connect(lp1).deposit(usdc("100"));
        await pool.connect(policy).lockCoverage(1, usdc("60"));

        const before = await token.balanceOf(lp1.address);
        await expect(pool.connect(lp1).payoutPolicy(1, lp1.address)).to.be.revertedWith(
            "Only policy contract"
        );

        await pool.connect(policy).payoutPolicy(1, lp1.address);
        const after = await token.balanceOf(lp1.address);
        expect(after - before).to.equal(usdc("60"));
        expect(await pool.lockedCoverage(1)).to.equal(0);
    });
});
