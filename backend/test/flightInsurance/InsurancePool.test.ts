import { expect } from "chai";
import { ethers } from "hardhat";

const fxrp = (value: string) => ethers.parseUnits(value, 6);

describe("InsurancePool", function () {
    async function deployPool() {
        const [owner, lp1, lp2, policy] = await ethers.getSigners();

        const TestERC20 = await ethers.getContractFactory("TestERC20");
        const tokenDeployed = await TestERC20.deploy("FXRP", "FXRP", 6, fxrp("1000000"));
        await tokenDeployed.waitForDeployment();
        const token = await ethers.getContractAt("TestERC20", await tokenDeployed.getAddress());

        const InsurancePool = await ethers.getContractFactory("InsurancePool");
        const poolDeployed = await InsurancePool.deploy(await token.getAddress());
        await poolDeployed.waitForDeployment();
        const pool = await ethers.getContractAt("InsurancePool", await poolDeployed.getAddress());

        await pool.setPolicyContract(policy.address);

        await token.mint(lp1.address, fxrp("1000"));
        await token.mint(lp2.address, fxrp("1000"));

        return { owner, lp1, lp2, policy, token, pool };
    }

    it("mints shares 1:1 on first deposit and pro-rata after", async function () {
        const { lp1, lp2, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), fxrp("100"));
        await pool.connect(lp1).deposit(fxrp("100"));

        expect(await pool.totalShares()).to.equal(fxrp("100"));
        expect(await pool.shares(lp1.address)).to.equal(fxrp("100"));

        await token.connect(lp2).approve(await pool.getAddress(), fxrp("50"));
        await pool.connect(lp2).deposit(fxrp("50"));

        expect(await pool.totalShares()).to.equal(fxrp("150"));
        expect(await pool.shares(lp2.address)).to.equal(fxrp("50"));
    });

    it("withdraw burns shares and pays FXRP", async function () {
        const { lp1, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), fxrp("200"));
        await pool.connect(lp1).deposit(fxrp("200"));

        const before = await token.balanceOf(lp1.address);
        await pool.connect(lp1).withdraw(fxrp("50"));
        const after = await token.balanceOf(lp1.address);

        expect(await pool.shares(lp1.address)).to.equal(fxrp("150"));
        expect(after - before).to.equal(fxrp("50"));
    });

    it("withdrawAmount burns shares and pays FXRP", async function () {
        const { lp1, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), fxrp("200"));
        await pool.connect(lp1).deposit(fxrp("200"));

        const before = await token.balanceOf(lp1.address);
        await pool.connect(lp1).withdrawAmount(fxrp("50"));
        const after = await token.balanceOf(lp1.address);

        expect(await pool.shares(lp1.address)).to.equal(fxrp("150"));
        expect(after - before).to.equal(fxrp("50"));
    });

    it("withdrawAmount rounds up required shares when pool balance shrinks", async function () {
        const { lp1, policy, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), fxrp("100"));
        await pool.connect(lp1).deposit(fxrp("100"));

        await pool.connect(policy).lockCoverage(1, fxrp("1"));
        await pool.connect(policy).payoutPolicy(1, lp1.address);

        const before = await token.balanceOf(lp1.address);
        await pool.connect(lp1).withdrawAmount(fxrp("1"));
        const after = await token.balanceOf(lp1.address);

        const poolBalance = fxrp("99");
        const totalShares = fxrp("100");
        const expectedBurned = (fxrp("1") * totalShares + poolBalance - 1n) / poolBalance;
        const expectedRemaining = totalShares - expectedBurned;

        expect(after - before).to.equal(fxrp("1"));
        expect(await pool.shares(lp1.address)).to.equal(expectedRemaining);
        expect(await pool.totalShares()).to.equal(expectedRemaining);
    });

    it("withdrawAmount respects locked coverage", async function () {
        const { lp1, policy, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), fxrp("100"));
        await pool.connect(lp1).deposit(fxrp("100"));

        await pool.connect(policy).lockCoverage(1, fxrp("80"));

        await expect(pool.connect(lp1).withdrawAmount(fxrp("30"))).to.be.revertedWith(
            "Insufficient available liquidity"
        );

        await pool.connect(policy).releaseCoverage(1);
        await pool.connect(lp1).withdrawAmount(fxrp("30"));
        expect(await pool.shares(lp1.address)).to.equal(fxrp("70"));
    });

    it("respects locked coverage when withdrawing", async function () {
        const { lp1, policy, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), fxrp("100"));
        await pool.connect(lp1).deposit(fxrp("100"));

        await pool.connect(policy).lockCoverage(1, fxrp("80"));

        await expect(pool.connect(lp1).withdraw(fxrp("100"))).to.be.revertedWith(
            "Insufficient available liquidity"
        );

        await pool.connect(policy).releaseCoverage(1);
        await pool.connect(lp1).withdraw(fxrp("100"));

        expect(await pool.shares(lp1.address)).to.equal(0);
    });

    it("sharesToAmount matches pool balance", async function () {
        const { lp1, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), fxrp("123"));
        await pool.connect(lp1).deposit(fxrp("123"));

        expect(await pool.sharesToAmount(fxrp("123"))).to.equal(fxrp("123"));
    });

    it("sharesOf and totalSharesSupply report balances", async function () {
        const { lp1, lp2, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), fxrp("100"));
        await pool.connect(lp1).deposit(fxrp("100"));
        await token.connect(lp2).approve(await pool.getAddress(), fxrp("50"));
        await pool.connect(lp2).deposit(fxrp("50"));

        expect(await pool.sharesOf(lp1.address)).to.equal(fxrp("100"));
        expect(await pool.sharesOf(lp2.address)).to.equal(fxrp("50"));
        expect(await pool.totalSharesSupply()).to.equal(fxrp("150"));
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

        await token.connect(lp1).approve(await pool.getAddress(), fxrp("200"));
        await pool.connect(lp1).deposit(fxrp("200"));

        await expect(pool.connect(lp2).lockCoverage(1, fxrp("50"))).to.be.revertedWith(
            "Only policy contract"
        );

        await pool.connect(policy).lockCoverage(1, fxrp("50"));
        expect(await pool.lockedCoverage(1)).to.equal(fxrp("50"));
        expect(await pool.availableLiquidity()).to.equal(fxrp("150"));
    });

    it("releaseCoverage is policy-only and clears locked amount", async function () {
        const { lp1, policy, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), fxrp("100"));
        await pool.connect(lp1).deposit(fxrp("100"));
        await pool.connect(policy).lockCoverage(1, fxrp("40"));

        await expect(pool.connect(lp1).releaseCoverage(1)).to.be.revertedWith("Only policy contract");

        await pool.connect(policy).releaseCoverage(1);
        expect(await pool.lockedCoverage(1)).to.equal(0);
    });

    it("payoutPolicy is policy-only and transfers coverage", async function () {
        const { lp1, policy, token, pool } = await deployPool();

        await token.connect(lp1).approve(await pool.getAddress(), fxrp("100"));
        await pool.connect(lp1).deposit(fxrp("100"));
        await pool.connect(policy).lockCoverage(1, fxrp("60"));

        const before = await token.balanceOf(lp1.address);
        await expect(pool.connect(lp1).payoutPolicy(1, lp1.address)).to.be.revertedWith(
            "Only policy contract"
        );

        await pool.connect(policy).payoutPolicy(1, lp1.address);
        const after = await token.balanceOf(lp1.address);
        expect(after - before).to.equal(fxrp("60"));
        expect(await pool.lockedCoverage(1)).to.equal(0);
    });
});
