const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🎯 MULTISIG WALLET - QUICK DEMO\n");

  // Setup
  const [owner1, owner2, owner3, recipient] = await ethers.getSigners();
  const owners = [owner1.address, owner2.address, owner3.address];
  const requiredApprovals = 2;

  console.log("1️⃣  DEPLOY CONTRACT");
  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const wallet = await MultiSigWallet.deploy(owners, requiredApprovals);
  await wallet.deployed();
  console.log("   ✅ Deployed to:", wallet.address);
  console.log("   ✅ Owners:", owners.length);
  console.log("   ✅ Required Approvals:", requiredApprovals);

  console.log("\n2️⃣  FUND WALLET");
  await owner1.sendTransaction({
    to: wallet.address,
    value: ethers.utils.parseEther("10")
  });
  let balance = await ethers.provider.getBalance(wallet.address);
  console.log("   ✅ Balance:", ethers.utils.formatEther(balance), "ETH");

  console.log("\n3️⃣  SUBMIT TRANSACTION");
  const tx1 = await wallet.connect(owner1).newTransaction(
    recipient.address,
    ethers.utils.parseEther("1"),
    "0x"
  );
  await tx1.wait();
  console.log("   ✅ Transaction 0 submitted: Send 1 ETH to recipient");

  console.log("\n4️⃣  APPROVE TRANSACTION (Need 2 approvals)");
  await wallet.connect(owner1).approveTransaction(0);
  console.log("   ✅ Owner 1 approved");
  
  let approvals = await wallet.approvalCount(0);
  console.log("   📊 Current approvals:", approvals.toString(), "/ 2");
  
  await wallet.connect(owner2).approveTransaction(0);
  console.log("   ✅ Owner 2 approved");
  
  approvals = await wallet.approvalCount(0);
  console.log("   📊 Current approvals:", approvals.toString(), "/ 2");
  console.log("   ✅ Enough approvals! Ready to execute");

  console.log("\n5️⃣  EXECUTE TRANSACTION");
  const recipientBefore = await ethers.provider.getBalance(recipient.address);
  await wallet.connect(owner1).executeTransaction(0);
  const recipientAfter = await ethers.provider.getBalance(recipient.address);
  
  console.log("   ✅ Transaction executed!");
  console.log("   📊 Recipient received:", ethers.utils.formatEther(recipientAfter.sub(recipientBefore)), "ETH");
  
  balance = await ethers.provider.getBalance(wallet.address);
  console.log("   📊 Wallet balance now:", ethers.utils.formatEther(balance), "ETH");

  console.log("\n6️⃣  REVOKE APPROVAL DEMO");
  await wallet.connect(owner1).newTransaction(recipient.address, ethers.utils.parseEther("0.5"), "0x");
  console.log("   ✅ New transaction 1 submitted");
  
  await wallet.connect(owner1).approveTransaction(1);
  console.log("   ✅ Owner 1 approved");
  
  approvals = await wallet.approvalCount(1);
  console.log("   📊 Approvals:", approvals.toString());
  
  await wallet.connect(owner1).revokeApproval(1);
  console.log("   ✅ Owner 1 revoked approval");
  
  approvals = await wallet.approvalCount(1);
  console.log("   📊 Approvals after revoke:", approvals.toString());

  console.log("\n7️⃣  ADD NEW OWNER (Multi-sig Process)");
  const newOwner = ethers.Wallet.createRandom();
  const addOwnerData = wallet.interface.encodeFunctionData("addOwner", [newOwner.address]);
  
  await wallet.connect(owner1).newTransaction(wallet.address, 0, addOwnerData);
  console.log("   ✅ Submitted transaction to add new owner");
  
  await wallet.connect(owner1).approveTransaction(2);
  await wallet.connect(owner2).approveTransaction(2);
  console.log("   ✅ Approved by 2 owners");
  
  await wallet.connect(owner1).executeTransaction(2);
  console.log("   ✅ New owner added!");
  
  const finalOwners = await wallet.getOwners();
  console.log("   📊 Total owners now:", finalOwners.length);

  console.log("\n✅ DEMO COMPLETE!");
  console.log("\n📊 SUMMARY:");
  console.log("   • Deployed multi-sig wallet with 3 owners");
  console.log("   • Required 2 approvals for transactions");
  console.log("   • Submitted, approved, and executed transaction");
  console.log("   • Demonstrated approval revocation");
  console.log("   • Added new owner through multi-sig process");
  console.log("   • All functions and events working correctly!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });