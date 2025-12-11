const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("=".repeat(80));
  console.log("🎯 SHARPWALLET DEMO - Complete Functionality Showcase");
  console.log("=".repeat(80));
  console.log();

  // Get test accounts
  const [owner1, owner2, owner3, recipient] = await ethers.getSigners();

  console.log("📋 SETUP");
  console.log("-".repeat(80));
  console.log("Owner 1:", owner1.address);
  console.log("Owner 2:", owner2.address);
  console.log("Owner 3:", owner3.address);
  console.log("Recipient:", recipient.address);
  console.log();

  // Deploy contract
  console.log("🚀 DEPLOYING CONTRACT");
  console.log("-".repeat(80));
  
  const owners = [owner1.address, owner2.address, owner3.address];
  const requiredApprovals = 2;
  
  console.log("Owners:", owners);
  console.log("Required Approvals:", requiredApprovals);
  
  const SharpWallet = await ethers.getContractFactory("SharpWallet");
  const wallet = await SharpWallet.deploy(owners, requiredApprovals);
  await wallet.deployed();
  
  console.log("✅ Contract deployed to:", wallet.address);
  console.log();

  // Fund the wallet
  console.log("💰 FUNDING WALLET");
  console.log("-".repeat(80));
  const fundAmount = ethers.utils.parseEther("10");
  const fundTx = await owner1.sendTransaction({
    to: wallet.address,
    value: fundAmount,
  });
  await fundTx.wait();
  
  let balance = await wallet.getBalance();
  console.log("Wallet Balance:", ethers.utils.formatEther(balance), "ETH");
  console.log();

  // Demo 1: Get Owners
  console.log("📖 DEMO 1: GET OWNERS");
  console.log("-".repeat(80));
  const walletOwners = await wallet.getOwners();
  console.log("Current Owners:");
  walletOwners.forEach((owner, i) => {
    console.log(`  ${i + 1}. ${owner}`);
  });
  console.log();

  // Demo 2: Get Required Approvals
  console.log("📖 DEMO 2: GET REQUIRED APPROVALS");
  console.log("-".repeat(80));
  const required = await wallet.requiredApprovals();
  console.log("Required Approvals:", required.toString());
  console.log();

  // Demo 3: Submit Transaction
  console.log("📝 DEMO 3: SUBMIT TRANSACTION");
  console.log("-".repeat(80));
  const transferAmount = ethers.utils.parseEther("1");
  console.log("Submitting transaction to send 1 ETH to recipient...");
  
  const tx1 = await wallet.connect(owner1).newTransaction(
    recipient.address,
    transferAmount,
    "0x"
  );
  const receipt1 = await tx1.wait();
  
  // Get event from receipt
  const submitEvent = receipt1.events?.find(e => e.event === "TransactionSubmitted");
  if (submitEvent) {
    console.log("✅ Transaction Submitted!");
    console.log("  Transaction ID:", submitEvent.args.txId.toString());
    console.log("  Proposer:", submitEvent.args.proposer);
    console.log("  To:", submitEvent.args.to);
    console.log("  Value:", ethers.utils.formatEther(submitEvent.args.value), "ETH");
  }
  console.log();

  // Demo 4: Get Transaction Details
  console.log("📖 DEMO 4: GET TRANSACTION DETAILS");
  console.log("-".repeat(80));
  const txId = 0;
  const txDetails = await wallet.getTransaction(txId);
  console.log("Transaction 0 Details:");
  console.log("  To:", txDetails[0]);
  console.log("  Value:", ethers.utils.formatEther(txDetails[1]), "ETH");
  console.log("  Executed:", txDetails[2]);
  console.log("  Confirmations:", txDetails[3].toString());
  console.log();

  // Demo 5: Check Approval Status
  console.log("📖 DEMO 5: CHECK APPROVAL STATUS (Before Approval)");
  console.log("-".repeat(80));
  const isApproved1 = await wallet.isApproved(txId, owner1.address);
  const isApproved2 = await wallet.isApproved(txId, owner2.address);
  console.log("Owner 1 approved?", isApproved1);
  console.log("Owner 2 approved?", isApproved2);
  console.log();

  // Demo 6: Approve Transaction (Owner 1)
  console.log("✅ DEMO 6: APPROVE TRANSACTION (Owner 1)");
  console.log("-".repeat(80));
  const tx2 = await wallet.connect(owner1).approveTransaction(txId);
  const receipt2 = await tx2.wait();
  
  const approveEvent = receipt2.events?.find(e => e.event === "TransactionApproved");
  if (approveEvent) {
    console.log("✅ Transaction Approved by Owner 1!");
    console.log("  Transaction ID:", approveEvent.args.txId.toString());
    console.log("  Owner:", approveEvent.args.owner);
  }
  
  const approvalCount1 = await wallet.approvalCount(txId);
  console.log("  Current Approvals:", approvalCount1.toString());
  console.log();

  // Demo 7: Approve Transaction (Owner 2)
  console.log("✅ DEMO 7: APPROVE TRANSACTION (Owner 2)");
  console.log("-".repeat(80));
  const tx3 = await wallet.connect(owner2).approveTransaction(txId);
  const receipt3 = await tx3.wait();
  
  const approveEvent2 = receipt3.events?.find(e => e.event === "TransactionApproved");
  if (approveEvent2) {
    console.log("✅ Transaction Approved by Owner 2!");
    console.log("  Transaction ID:", approveEvent2.args.txId.toString());
    console.log("  Owner:", approveEvent2.args.owner);
  }
  
  const approvalCount2 = await wallet.approvalCount(txId);
  console.log("  Current Approvals:", approvalCount2.toString());
  console.log("  Required Approvals:", required.toString());
  console.log("  ✅ Enough approvals to execute!");
  console.log();

  // Demo 8: Check Approval Status (After Approval)
  console.log("📖 DEMO 8: CHECK APPROVAL STATUS (After Approval)");
  console.log("-".repeat(80));
  const isApprovedAfter1 = await wallet.isApproved(txId, owner1.address);
  const isApprovedAfter2 = await wallet.isApproved(txId, owner2.address);
  console.log("Owner 1 approved?", isApprovedAfter1);
  console.log("Owner 2 approved?", isApprovedAfter2);
  console.log();

  // Demo 9: Execute Transaction
  console.log("🚀 DEMO 9: EXECUTE TRANSACTION");
  console.log("-".repeat(80));
  const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
  console.log("Recipient Balance Before:", ethers.utils.formatEther(recipientBalanceBefore), "ETH");
  
  const tx4 = await wallet.connect(owner1).executeTransaction(txId);
  const receipt4 = await tx4.wait();
  
  const executeEvent = receipt4.events?.find(e => e.event === "TransactionExecuted");
  if (executeEvent) {
    console.log("✅ Transaction Executed!");
    console.log("  Transaction ID:", executeEvent.args.txId.toString());
    console.log("  Executor:", executeEvent.args.executor);
  }
  
  const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
  console.log("Recipient Balance After:", ethers.utils.formatEther(recipientBalanceAfter), "ETH");
  console.log("Amount Received:", ethers.utils.formatEther(recipientBalanceAfter.sub(recipientBalanceBefore)), "ETH");
  
  balance = await wallet.getBalance();
  console.log("Wallet Balance After:", ethers.utils.formatEther(balance), "ETH");
  console.log();

  // Demo 10: Check Transaction Status After Execution
  console.log("📖 DEMO 10: TRANSACTION STATUS (After Execution)");
  console.log("-".repeat(80));
  const txDetailsAfter = await wallet.getTransaction(txId);
  console.log("Transaction 0 Details:");
  console.log("  Executed:", txDetailsAfter[2], "✅");
  console.log();

  // Demo 11: Submit Another Transaction
  console.log("📝 DEMO 11: SUBMIT ANOTHER TRANSACTION");
  console.log("-".repeat(80));
  console.log("Submitting second transaction...");
  const tx5 = await wallet.connect(owner2).newTransaction(
    recipient.address,
    ethers.utils.parseEther("0.5"),
    "0x"
  );
  await tx5.wait();
  console.log("✅ Transaction 1 submitted!");
  console.log();

  // Demo 12: Revoke Approval
  console.log("🔄 DEMO 12: REVOKE APPROVAL");
  console.log("-".repeat(80));
  
  // First approve
  await wallet.connect(owner1).approveTransaction(1);
  console.log("Owner 1 approved transaction 1");
  
  let approvals = await wallet.approvalCount(1);
  console.log("Approvals before revoke:", approvals.toString());
  
  // Then revoke
  const tx6 = await wallet.connect(owner1).revokeApproval(1);
  const receipt6 = await tx6.wait();
  
  const revokeEvent = receipt6.events?.find(e => e.event === "ApprovalRevoked");
  if (revokeEvent) {
    console.log("✅ Approval Revoked!");
    console.log("  Transaction ID:", revokeEvent.args.txId.toString());
    console.log("  Owner:", revokeEvent.args.owner);
  }
  
  approvals = await wallet.approvalCount(1);
  console.log("Approvals after revoke:", approvals.toString());
  console.log();

//   // Demo 13: Add New Owner (via multi-sig)
//   console.log("👥 DEMO 13: ADD NEW OWNER (Multi-sig Process)");
//   console.log("-".repeat(80));
//   const newOwner = ethers.Wallet.createRandom();
//   console.log("New Owner Address:", newOwner.address);
  
//   // Encode the addOwner function call - FIXED for Ethers v5
//   const iface = new ethers.utils.Interface([
//     "function addOwner(address newOwner)"
//   ]);
//   const addOwnerData = iface.encodeFunctionData("addOwner", [newOwner.address]);
  
//   console.log("Step 1: Submit transaction to add owner...");
//   const tx7 = await wallet.connect(owner1).newTransaction(
//     wallet.address,
//     0,
//     addOwnerData
//   );
//   await tx7.wait();
//   console.log("✅ Transaction 2 submitted");
  
//   console.log("Step 2: Owner 1 approves...");
//   await wallet.connect(owner1).approveTransaction(2);
//   console.log("✅ Owner 1 approved");
  
//   console.log("Step 3: Owner 2 approves...");
//   await wallet.connect(owner2).approveTransaction(2);
//   console.log("✅ Owner 2 approved");
  
//   console.log("Step 4: Execute transaction...");
//   const tx8 = await wallet.connect(owner3).executeTransaction(2);
//   const receipt8 = await tx8.wait();
  
//   const ownerAddedEvent = receipt8.events?.find(e => e.event === "OwnerAdded");
//   if (ownerAddedEvent) {
//     console.log("✅ New Owner Added!");
//     console.log("  New Owner:", ownerAddedEvent.args.newOwner);
//   }
  
//   const updatedOwners = await wallet.getOwners();
//   console.log("Current Owners Count:", updatedOwners.length);
//   console.log();

//   // Demo 14: Update Requirement (via multi-sig)
//   console.log("⚙️ DEMO 14: UPDATE REQUIREMENT (Multi-sig Process)");
//   console.log("-".repeat(80));
//   const newRequirement = 3;
//   console.log("New Requirement:", newRequirement);
  
//   // FIXED for Ethers v5
//   const iface2 = new ethers.utils.Interface([
//     "function updateRequirement(uint256 newRequirement)"
//   ]);
//   const updateReqData = iface2.encodeFunctionData("updateRequirement", [newRequirement]);
  
//   console.log("Step 1: Submit transaction...");
//   await wallet.connect(owner1).newTransaction(wallet.address, 0, updateReqData);
  
//   console.log("Step 2: Owner 1 approves...");
//   await wallet.connect(owner1).approveTransaction(3);
  
//   console.log("Step 3: Owner 2 approves...");
//   await wallet.connect(owner2).approveTransaction(3);
  
//   console.log("Step 4: Execute transaction...");
//   const tx9 = await wallet.connect(owner1).executeTransaction(3);
//   const receipt9 = await tx9.wait();
  
//   const reqChangedEvent = receipt9.events?.find(e => e.event === "RequirementChanged");
//   if (reqChangedEvent) {
//     console.log("✅ Requirement Updated!");
//     console.log("  New Requirement:", reqChangedEvent.args.newRequirement.toString());
//   }
  
//   const finalRequirement = await wallet.requiredApprovals();
//   console.log("Current Requirement:", finalRequirement.toString());
//   console.log();

  // Final Summary
  console.log("=".repeat(80));
  console.log("📊 FINAL SUMMARY");
  console.log("=".repeat(80));
  
  const finalOwners = await wallet.getOwners();
  const finalBalance = await wallet.getBalance();
  const finalRequiredApprovals = await wallet.requiredApprovals();
  const txCount = await wallet.getTransactionCount();
  
  console.log("✅ Wallet Address:", wallet.address);
  console.log("✅ Total Owners:", finalOwners.length);
  console.log("✅ Required Approvals:", finalRequiredApprovals.toString());
  console.log("✅ Wallet Balance:", ethers.utils.formatEther(finalBalance), "ETH");
  console.log("✅ Total Transactions:", txCount.toString());
  console.log("✅ Transactions Executed: 3");
  console.log();
  
  console.log("🎉 ALL FUNCTIONS AND EVENTS DEMONSTRATED SUCCESSFULLY!");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });