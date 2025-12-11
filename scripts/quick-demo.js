const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🎯 SHARPWALLET - QUICK DEMO\n");

  // Setup
  const [owner1, owner2, owner3, recipient] = await ethers.getSigners();
  const owners = [owner1.address, owner2.address, owner3.address];
  const requiredApprovals = 2;

  console.log("1️⃣  DEPLOY CONTRACT");
  const SharpWallet = await ethers.getContractFactory("SharpWallet");
  const wallet = await SharpWallet.deploy(owners, requiredApprovals);
  await wallet.deployed();
  console.log("   ✅ Deployed to:", wallet.address);
  console.log("   ✅ Owners:", owners.length);
  console.log("   ✅ Required Approvals:", requiredApprovals);

  console.log("\n2️⃣  FUND WALLET");
  await owner1.sendTransaction({
    to: wallet.address,
    value: ethers.utils.parseEther("10")
  });
  let balance = await wallet.getBalance();
  console.log("   ✅ Balance:", ethers.utils.formatEther(balance), "ETH");

  console.log("\n3️⃣  SUBMIT TRANSACTION (AUTO-APPROVAL) ⭐");
  const tx1 = await wallet.connect(owner1).newTransaction(
    recipient.address,
    ethers.utils.parseEther("1"),
    "0x"
  );
  const receipt1 = await tx1.wait();
  console.log("   ✅ Transaction 0 submitted: Send 1 ETH to recipient");
  
  // Check for auto-approval
  const autoApproveEvent = receipt1.events?.find(e => e.event === "TransactionApproved");
  if (autoApproveEvent) {
    console.log("   ⭐ Auto-approved by proposer!");
  }
  
  let approvals = await wallet.approvalCount(0);
  console.log("   📊 Current approvals:", approvals.toString(), "/ 2 (includes auto-approval)");

  console.log("\n4️⃣  GET APPROVERS (NEW FUNCTION) ⭐");
  let approvers = await wallet.getApprovers(0);
  console.log("   👥 Who approved:");
  approvers.forEach((addr, i) => {
    const ownerNum = addr === owner1.address ? "Owner 1" : 
                     addr === owner2.address ? "Owner 2" : "Owner 3";
    console.log(`      ${i + 1}. ${ownerNum}`);
  });

  console.log("\n5️⃣  SECOND OWNER APPROVES (Need 1 more)");
  await wallet.connect(owner2).approveTransaction(0);
  console.log("   ✅ Owner 2 approved");
  
  approvals = await wallet.approvalCount(0);
  console.log("   📊 Current approvals:", approvals.toString(), "/ 2");
  
  approvers = await wallet.getApprovers(0);
  console.log("   👥 Updated approvers:", approvers.length, "owners");
  console.log("   ✅ Enough approvals! Ready to execute");

  console.log("\n6️⃣  EXECUTE TRANSACTION");
  const recipientBefore = await ethers.provider.getBalance(recipient.address);
  await wallet.connect(owner1).executeTransaction(0);
  const recipientAfter = await ethers.provider.getBalance(recipient.address);
  
  console.log("   ✅ Transaction executed!");
  console.log("   📊 Recipient received:", ethers.utils.formatEther(recipientAfter.sub(recipientBefore)), "ETH");
  
  balance = await wallet.getBalance();
  console.log("   📊 Wallet balance now:", ethers.utils.formatEther(balance), "ETH");

  console.log("\n7️⃣  DELETE OWN TRANSACTION (NEW FUNCTION) ⭐");
  await wallet.connect(owner2).newTransaction(recipient.address, ethers.utils.parseEther("0.5"), "0x");
  console.log("   ✅ Owner 2 submitted transaction 1");
  
  approvers = await wallet.getApprovers(1);
  console.log("   👥 Approvers:", approvers.length, "(only proposer)");
  
  const tx2 = await wallet.connect(owner2).deleteTransaction(1);
  const receipt2 = await tx2.wait();
  
  const deleteEvent = receipt2.events?.find(e => e.event === "TransactionDeleted");
  if (deleteEvent) {
    console.log("   ✅ Transaction deleted by proposer!");
  }
  
  approvers = await wallet.getApprovers(1);
  console.log("   👥 Approvers after deletion:", approvers.length);

  console.log("\n8️⃣  CANNOT DELETE IF OTHERS APPROVED");
  await wallet.connect(owner1).newTransaction(recipient.address, ethers.utils.parseEther("0.3"), "0x");
  console.log("   ✅ Owner 1 submitted transaction 2");
  
  await wallet.connect(owner2).approveTransaction(2);
  console.log("   ✅ Owner 2 also approved");
  
  try {
    await wallet.connect(owner1).deleteTransaction(2);
    console.log("   ❌ Should not reach here!");
  } catch (error) {
    console.log("   ✅ Deletion blocked: Others already approved!");
  }

  console.log("\n9️⃣  REVOKE APPROVAL DEMO");
  await wallet.connect(owner3).newTransaction(recipient.address, ethers.utils.parseEther("0.2"), "0x");
  console.log("   ✅ Owner 3 submitted transaction 3");
  
  await wallet.connect(owner1).approveTransaction(3);
  console.log("   ✅ Owner 1 approved");
  
  approvers = await wallet.getApprovers(3);
  console.log("   👥 Approvers:", approvers.length);
  
  await wallet.connect(owner1).revokeApproval(3);
  console.log("   ✅ Owner 1 revoked approval");
  
  approvers = await wallet.getApprovers(3);
  console.log("   👥 Approvers after revoke:", approvers.length);

  console.log("\n🔟  DEMONSTRATE DEPOSIT EVENT");
  const depositAmount = ethers.utils.parseEther("2");
  const depositTx = await owner2.sendTransaction({
    to: wallet.address,
    value: depositAmount
  });
  const depositReceipt = await depositTx.wait();
  
  const depositEvent = depositReceipt.events?.find(e => e.event === "Deposit");
  if (depositEvent) {
    console.log("   ✅ Deposit received from:", depositEvent.args.sender === owner2.address ? "Owner 2" : "Unknown");
    console.log("   📊 Amount:", ethers.utils.formatEther(depositEvent.args.amount), "ETH");
  }
  
  const newBalance = await wallet.getBalance();
  console.log("   📊 New wallet balance:", ethers.utils.formatEther(newBalance), "ETH");

  console.log("\n✅ DEMO COMPLETE!");
  console.log("\n📊 SUMMARY:");
  console.log("   • Deployed multi-sig wallet with 3 owners");
  console.log("   • Required 2 approvals for transactions");
  console.log("   • Proposer automatically approves");
  console.log("   • Proposer can delete if alone");
  console.log("   • Submitted, approved, and executed transaction");
  console.log("   • Demonstrated approval revocation");
  console.log("   • Showed deposit event emission");
  console.log("   • All features working correctly!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });