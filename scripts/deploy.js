const hre = require("hardhat");

async function main() {
  console.log("Deploying MultiSigWallet...");

  // Get signers
  const [deployer, owner2, owner3] = await ethers.getSigners();

  console.log("Deploying contract with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Define owners and required approvals
  const owners = [
    deployer.address,
    owner2.address,
    owner3.address,
  ];
  const requiredApprovals = 2;

  console.log("\nOwners:");
  owners.forEach((owner, index) => {
    console.log(`  ${index + 1}. ${owner}`);
  });
  console.log(`\nRequired Approvals: ${requiredApprovals}`);

  // Deploy contract
  const MultiSigWallet = await hre.ethers.getContractFactory("MultiSigWallet");
  const multiSigWallet = await MultiSigWallet.deploy(owners, requiredApprovals);

  await multiSigWallet.deployed();

  console.log("\n✅ MultiSigWallet deployed to:", multiSigWallet.address);

  // Verify deployment
  const contractOwners = await multiSigWallet.getOwners();
  const contractRequirement = await multiSigWallet.requiredApprovals();

  console.log("\n📋 Deployment Verification:");
  console.log("  Owners count:", contractOwners.length);
  console.log("  Required approvals:", contractRequirement.toString());

  // Fund the wallet with some ETH
  const fundAmount = ethers.utils.parseEther("1");
  console.log("\n💰 Funding wallet with 1 ETH...");
  const tx = await deployer.sendTransaction({
    to: multiSigWallet.address,
    value: fundAmount,
  });
  await tx.wait();

  const balance = await ethers.provider.getBalance(multiSigWallet.address);
  console.log("  Wallet balance:", ethers.utils.formatEther(balance), "ETH");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: multiSigWallet.address,
    owners: owners,
    requiredApprovals: requiredApprovals,
    deploymentBlock: tx.blockNumber,
    deployer: deployer.address,
  };

  console.log("\n📄 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Wait for block confirmations before verification
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    await multiSigWallet.deployTransaction.wait(6);

    console.log("\n🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: multiSigWallet.address,
        constructorArguments: [owners, requiredApprovals],
      });
      console.log("✅ Contract verified!");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }

  console.log("\n✨ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });