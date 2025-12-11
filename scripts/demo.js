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

  // Demo 3: Submit Transaction (AUTO-APPROVAL) ⭐
  console.log("📝 DEMO 3: SUBMIT TRANSACTION (AUTO-APPROVAL) ⭐");
  console.log("-".repeat(80));
  const transferAmount = ethers.utils.parseEther("1");
  console.log("Submitting transaction to send 1 ETH to recipient...");
  
  const tx1 = await wallet.connect(owner1).newTransaction(
    recipient.address,
    transferAmount,
    "0x"
  );
  const receipt1 = await tx1.wait();
  
  // Get events from receipt
  const submitEvent = receipt1.events?.find(e => e.event === "TransactionSubmitted");
  const autoApproveEvent = receipt1.events?.find(e => e.event === "TransactionApproved");
  
  if (submitEvent) {
    console.log("✅ Transaction Submitted!");
    console.log("  Transaction ID:", submitEvent.args.txId.toString());
    console.log("  Proposer:", submitEvent.args.proposer);
    console.log("  To:", submitEvent.args.to);
    console.log("  Value:", ethers.utils.formatEther(submitEvent.args.value), "ETH");
  }
  
  if (autoApproveEvent) {
    console.log("⭐ AUTO-APPROVED by proposer!");
    console.log("  Auto-Approver:", autoApproveEvent.args.owner);
  }
  
  let approvalCount = await wallet.approvalCount(0);
  console.log("  Current Approvals:", approvalCount.toString(), "/ 2");
  console.log();

  // Demo 4: Get Approvers (NEW FUNCTION) ⭐
  console.log("👥 DEMO 4: GET APPROVERS (NEW FUNCTION) ⭐");
  console.log("-".repeat(80));
  let approvers = await wallet.getApprovers(0);
  console.log("Who approved transaction 0:");
  approvers.forEach((addr, i) => {
    const ownerNum = addr === owner1.address ? "Owner 1" : 
                     addr === owner2.address ? "Owner 2" : "Owner 3";
    console.log(`  ${i + 1}. ${ownerNum} (${addr})`);
  });
  console.log();

  // Demo 5: Get Transaction Details
  console.log("📖 DEMO 5: GET TRANSACTION DETAILS");
  console.log("-".repeat(80));
  const txId = 0;
  const txDetails = await wallet.getTransaction(txId);
  console.log("Transaction 0 Details:");
  console.log("  To:", txDetails[0]);
  console.log("  Value:", ethers.utils.formatEther(txDetails[1]), "ETH");
  console.log("  Executed:", txDetails[2]);
  console.log("  Confirmations:", txDetails[3].toString(), "(includes auto-approval)");
  console.log();

  // Demo 6: Approve Transaction (Owner 2)
  console.log("✅ DEMO 6: SECOND OWNER APPROVES");
  console.log("-".repeat(80));
  const tx2 = await wallet.connect(owner2).approveTransaction(txId);
  const receipt2 = await tx2.wait();
  
  const approveEvent = receipt2.events?.find(e => e.event === "TransactionApproved");
  if (approveEvent) {
    console.log("✅ Transaction Approved by Owner 2!");
    console.log("  Transaction ID:", approveEvent.args.txId.toString());
    console.log("  Owner:", approveEvent.args.owner);
  }
  
  approvers = await wallet.getApprovers(0);
  console.log("Updated approvers:");
  approvers.forEach((addr, i) => {
    const ownerNum = addr === owner1.address ? "Owner 1" : 
                     addr === owner2.address ? "Owner 2" : "Owner 3";
    console.log(`  ${i + 1}. ${ownerNum}`);
  });
  
  approvalCount = await wallet.approvalCount(txId);
  console.log("  Current Approvals:", approvalCount.toString(), "/ 2");
  console.log("  ✅ Enough approvals to execute!");
  console.log();

  // Demo 7: Execute Transaction
  console.log("🚀 DEMO 7: EXECUTE TRANSACTION");
  console.log("-".repeat(80));
  const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
  console.log("Recipient Balance Before:", ethers.utils.formatEther(recipientBalanceBefore), "ETH");
  
  const tx3 = await wallet.connect(owner1).executeTransaction(txId);
  const receipt3 = await tx3.wait();
  
  const executeEvent = receipt3.events?.find(e => e.event === "TransactionExecuted");
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

  // Demo 8: Delete Transaction (NEW FUNCTION) ⭐
  console.log("🗑️  DEMO 8: DELETE OWN TRANSACTION (NEW FUNCTION) ⭐");
  console.log("-".repeat(80));
  console.log("Owner 2 submits a new transaction...");
  await wallet.connect(owner2).newTransaction(
    recipient.address,
    ethers.utils.parseEther("0.5"),
    "0x"
  );
  
  approvers = await wallet.getApprovers(1);
  console.log("Transaction 1 approvers:", approvers.length, "(only proposer via auto-approval)");
  
  console.log("Owner 2 decides to delete it (changed their mind)...");
  const tx4 = await wallet.connect(owner2).deleteTransaction(1);
  const receipt4 = await tx4.wait();
  
  const deleteEvent = receipt4.events?.find(e => e.event === "TransactionDeleted");
  if (deleteEvent) {
    console.log("✅ Transaction Deleted!");
    console.log("  Transaction ID:", deleteEvent.args.txId.toString());
    console.log("  Deleted by:", deleteEvent.args.deleter);
  }
  
  const deletedApprovalCount = await wallet.approvalCount(1);
  console.log("  Approvals after deletion:", deletedApprovalCount.toString());
  
  approvers = await wallet.getApprovers(1);
  console.log("  Approvers after deletion:", approvers.length);
  console.log();

  // Demo 9: Cannot Delete If Others Approved
  console.log("🛑 DEMO 9: CANNOT DELETE IF OTHERS APPROVED");
  console.log("-".repeat(80));
  console.log("Owner 1 submits transaction 2...");
  await wallet.connect(owner1).newTransaction(
    recipient.address,
    ethers.utils.parseEther("0.3"),
    "0x"
  );
  
  console.log("Owner 2 also approves...");
  await wallet.connect(owner2).approveTransaction(2);
  
  approvers = await wallet.getApprovers(2);
  console.log("Transaction 2 approvers:", approvers.length);
  
  console.log("Owner 1 tries to delete...");
  try {
    await wallet.connect(owner1).deleteTransaction(2);
    console.log("❌ Should not reach here!");
  } catch (error) {
    console.log("✅ Deletion prevented: Others already approved!");
  }
  console.log();

  // Demo 10: Revoke Approval
  console.log("🔄 DEMO 10: REVOKE APPROVAL");
  console.log("-".repeat(80));
  console.log("Owner 3 submits transaction 3...");
  await wallet.connect(owner3).newTransaction(
    recipient.address,
    ethers.utils.parseEther("0.2"),
    "0x"
  );
  
  console.log("Owner 1 approves...");
  await wallet.connect(owner1).approveTransaction(3);
  
  approvers = await wallet.getApprovers(3);
  console.log("Approvers before revoke:", approvers.length);
  approvers.forEach((addr, i) => {
    const ownerNum = addr === owner1.address ? "Owner 1" : 
                     addr === owner2.address ? "Owner 2" : "Owner 3";
    console.log(`  ${i + 1}. ${ownerNum}`);
  });
  
  console.log("Owner 1 revokes their approval...");
  const tx5 = await wallet.connect(owner1).revokeApproval(3);
  const receipt5 = await tx5.wait();
  
  const revokeEvent = receipt5.events?.find(e => e.event === "ApprovalRevoked");
  if (revokeEvent) {
    console.log("✅ Approval Revoked!");
    console.log("  Transaction ID:", revokeEvent.args.txId.toString());
    console.log("  Owner:", revokeEvent.args.owner);
  }
  
  approvers = await wallet.getApprovers(3);
  console.log("Approvers after revoke:", approvers.length);
  console.log("Remaining approver:", approvers[0] === owner3.address ? "Owner 3 (proposer)" : "Unknown");
  console.log();

  // Demo 11: Check Deposit Event
  console.log("💵 DEMO 11: DEPOSIT EVENT");
  console.log("-".repeat(80));
  const depositAmount = ethers.utils.parseEther("2");
  const depositTx = await owner2.sendTransaction({
    to: wallet.address,
    value: depositAmount
  });
  const depositReceipt = await depositTx.wait();
  
  const depositEvent = depositReceipt.events?.find(e => e.event === "Deposit");
  if (depositEvent) {
    console.log("✅ Deposit received!");
    console.log("  From:", depositEvent.args.sender);
    console.log("  Amount:", ethers.utils.formatEther(depositEvent.args.amount), "ETH");
  }
  
  balance = await wallet.getBalance();
  console.log("  Amount Deposited:", ethers.utils.formatEther(depositAmount), "ETH");
  console.log("  New wallet balance:", ethers.utils.formatEther(balance), "ETH");
  console.log();

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