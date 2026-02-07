import { ethers } from "hardhat";

async function main() {
  const Escrow = await ethers.getContractFactory("SimpleEscrow");
  console.log("Deploying SimpleEscrow...");
  const escrow = await Escrow.deploy();

  await escrow.waitForDeployment();
  const address = await escrow.getAddress();

  console.log(`SimpleEscrow deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});