const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SharpWallet", function () {
    let sharpWallet;
    let owner1, owner2, owner3, nonOwner;
    let owners;
    const requiredApprovals = 2;

    beforeEach(async function () {
        [owner1, owner2, owner3, nonOwner] = await ethers.getSigners();
        owners = [owner1.address, owner2.address, owner3.address];

        const SharpWallet = await ethers.getContractFactory("SharpWallet");
        sharpWallet = await SharpWallet.deploy(owners, requiredApprovals);
        await sharpWallet.deployed();

        await owner1.sendTransaction({
            to: sharpWallet.address,
            value: ethers.utils.parseEther("10")
        });
    });

    describe("Deployment", function () {
        it("Should set the correct owners", async function () {
            const contractOwners = await sharpWallet.getOwners();
            expect(contractOwners).to.deep.equal(owners);
        });

        it("Should set the correct required approvals", async function () {
            expect(await sharpWallet.requiredApprovals()).to.equal(requiredApprovals);
        });

        it("Should mark addresses as owners", async function () {
            expect(await sharpWallet.isOwner(owner1.address)).to.be.true;
            expect(await sharpWallet.isOwner(owner2.address)).to.be.true;
            expect(await sharpWallet.isOwner(owner3.address)).to.be.true;
            expect(await sharpWallet.isOwner(nonOwner.address)).to.be.false;
        });

        it("Should reject empty owners array", async function () {
            const SharpWallet = await ethers.getContractFactory("SharpWallet");
            await expect(
                SharpWallet.deploy([], requiredApprovals)
            ).to.be.revertedWith("Owners required");
        });

        it("Should reject invalid approval requirement", async function () {
            const SharpWallet = await ethers.getContractFactory("SharpWallet");
            await expect(
                SharpWallet.deploy(owners, 0)
            ).to.be.revertedWith("Invalid approval requirement");
            await expect(
                SharpWallet.deploy(owners, 4)
            ).to.be.revertedWith("Invalid approval requirement");
        });

        it("Should reject duplicate owners", async function () {
            const SharpWallet = await ethers.getContractFactory("SharpWallet");
            await expect(
                SharpWallet.deploy([owner1.address, owner1.address], 1)
            ).to.be.revertedWith("Owner not unique");
        });

        it("Should reject zero address as owner", async function () {
            const SharpWallet = await ethers.getContractFactory("SharpWallet");
            await expect(
                SharpWallet.deploy([ethers.constants.AddressZero], 1)
            ).to.be.revertedWith("Invalid owner address");
        });
    });

    // ============================================================
    // CHANGED FOR AUTO-APPROVAL: Transaction now starts with 1 approval
    // ============================================================
    describe("Transaction Submission - AUTO-APPROVAL", function () {
        it("Should allow owner to submit transaction", async function () {
            const to = nonOwner.address;
            const value = ethers.utils.parseEther("1");
            const data = "0x";

            // Should emit BOTH events now
            const tx = await sharpWallet.connect(owner1).newTransaction(to, value, data);
            const receipt = await tx.wait();
            
            // Check both events are emitted
            expect(receipt.events.some(e => e.event === "TransactionSubmitted")).to.be.true;
            expect(receipt.events.some(e => e.event === "TransactionApproved")).to.be.true;
        });

        it("Should auto-approve for proposer", async function () {
            // CHANGED: Transaction now starts with 1 approval
            await sharpWallet.connect(owner1).newTransaction(
                nonOwner.address,
                ethers.utils.parseEther("1"),
                "0x"
            );

            expect(await sharpWallet.approvalCount(0)).to.equal(1); // CHANGED from 0 to 1
            expect(await sharpWallet.isApproved(0, owner1.address)).to.be.true; // CHANGED to true
        });

        it("Should reject non-owner submission", async function () {
            await expect(
                sharpWallet.connect(nonOwner).newTransaction(
                    nonOwner.address,
                    ethers.utils.parseEther("1"),
                    "0x"
                )
            ).to.be.reverted;
        });

        it("Should increment transaction ID", async function () {
            await sharpWallet.connect(owner1).newTransaction(nonOwner.address, 0, "0x");
            await sharpWallet.connect(owner1).newTransaction(nonOwner.address, 0, "0x");

            const tx = await sharpWallet.getTransaction(1);
            expect(tx[0]).to.equal(nonOwner.address);
        });
    });

    // ============================================================
    // CHANGED FOR AUTO-APPROVAL: Now need N-1 additional approvals
    // ============================================================
    describe("Transaction Approval", function () {
        beforeEach(async function () {
            // Transaction already has 1 approval from proposer
            await sharpWallet.connect(owner1).newTransaction(
                nonOwner.address,
                ethers.utils.parseEther("1"),
                "0x"
            );
        });

        it("Should allow second owner to approve transaction", async function () {
            // CHANGED: Now owner2 approves (owner1 already approved)
            await expect(sharpWallet.connect(owner2).approveTransaction(0))
                .to.emit(sharpWallet, "TransactionApproved")
                .withArgs(0, owner2.address);

            expect(await sharpWallet.isApproved(0, owner2.address)).to.be.true;
            expect(await sharpWallet.approvalCount(0)).to.equal(2); // CHANGED: 1 (proposer) + 1 (owner2)
        });

        it("Should reject proposer approving again", async function () {
            // CHANGED: Owner1 already approved when submitting
            await expect(
                sharpWallet.connect(owner1).approveTransaction(0)
            ).to.be.reverted;
        });

        it("Should reject non-owner approval", async function () {
            await expect(
                sharpWallet.connect(nonOwner).approveTransaction(0)
            ).to.be.reverted;
        });

        it("Should reject approval of non-existent transaction", async function () {
            await expect(
                sharpWallet.connect(owner1).approveTransaction(99)
            ).to.be.reverted;
        });

        it("Should track multiple approvals", async function () {
            // CHANGED: Owner1 already approved, so we use owner2 and owner3
            await sharpWallet.connect(owner2).approveTransaction(0);
            await sharpWallet.connect(owner3).approveTransaction(0);

            expect(await sharpWallet.approvalCount(0)).to.equal(3); // CHANGED: 1+2=3
            expect(await sharpWallet.isApproved(0, owner1.address)).to.be.true;
            expect(await sharpWallet.isApproved(0, owner2.address)).to.be.true;
            expect(await sharpWallet.isApproved(0, owner3.address)).to.be.true;
        });
    });

    describe("Approval Revocation", function () {
        beforeEach(async function () {
            await sharpWallet.connect(owner1).newTransaction(
                nonOwner.address,
                ethers.utils.parseEther("1"),
                "0x"
            );
            // CHANGED: Owner1 already approved via auto-approval, so add owner2
            await sharpWallet.connect(owner2).approveTransaction(0);
        });

        it("Should allow owner to revoke approval", async function () {
            // CHANGED: Now owner2 revokes (owner1 auto-approved)
            await expect(sharpWallet.connect(owner2).revokeApproval(0))
                .to.emit(sharpWallet, "ApprovalRevoked")
                .withArgs(0, owner2.address);

            expect(await sharpWallet.isApproved(0, owner2.address)).to.be.false;
            expect(await sharpWallet.approvalCount(0)).to.equal(1); // CHANGED: Back to just proposer
        });

        it("Should reject revocation of non-approved transaction", async function () {
            await expect(
                sharpWallet.connect(owner3).revokeApproval(0)
            ).to.be.revertedWith("Transaction not approved");
        });

        it("Should reject non-owner revocation", async function () {
            await expect(
                sharpWallet.connect(nonOwner).revokeApproval(0)
            ).to.be.reverted;
        });
    });

    // ============================================================
    // CHANGED FOR AUTO-APPROVAL: Now need only 1 more approval
    // ============================================================
    describe("Transaction Execution", function () {
        beforeEach(async function () {
            // Transaction starts with 1 approval from proposer
            await sharpWallet.connect(owner1).newTransaction(
                nonOwner.address,
                ethers.utils.parseEther("1"),
                "0x"
            );
        });

        it("Should execute transaction with enough approvals", async function () {
            // CHANGED: Only need 1 more approval (already have 1 from proposer)
            await sharpWallet.connect(owner2).approveTransaction(0);

            const balanceBefore = await ethers.provider.getBalance(nonOwner.address);

            await expect(sharpWallet.connect(owner1).executeTransaction(0))
                .to.emit(sharpWallet, "TransactionExecuted")
                .withArgs(0, owner1.address);

            const balanceAfter = await ethers.provider.getBalance(nonOwner.address);
            expect(balanceAfter.sub(balanceBefore)).to.equal(ethers.utils.parseEther("1"));

            const tx = await sharpWallet.getTransaction(0);
            expect(tx[2]).to.be.true;
        });

        it("Should reject execution without enough approvals", async function () {
            // CHANGED: Now have 1 approval (proposer), need 2 total
            await expect(
                sharpWallet.connect(owner1).executeTransaction(0)
            ).to.be.revertedWith("Not enough approvals");
        });

        it("Should reject double execution", async function () {
            await sharpWallet.connect(owner2).approveTransaction(0);
            await sharpWallet.connect(owner1).executeTransaction(0);

            await expect(
                sharpWallet.connect(owner1).executeTransaction(0)
            ).to.be.reverted;
        });

        it("Should reject non-owner execution", async function () {
            await sharpWallet.connect(owner2).approveTransaction(0);

            await expect(
                sharpWallet.connect(nonOwner).executeTransaction(0)
            ).to.be.reverted;
        });

        it("Should reject approval of executed transaction", async function () {
            await sharpWallet.connect(owner2).approveTransaction(0);
            await sharpWallet.connect(owner1).executeTransaction(0);

            await expect(
                sharpWallet.connect(owner3).approveTransaction(0)
            ).to.be.reverted;
        });
    });

    describe("View Functions", function () {
        it("Should return correct transaction details", async function () {
            const to = nonOwner.address;
            const value = ethers.utils.parseEther("1");
            const data = "0x1234";

            await sharpWallet.connect(owner1).newTransaction(to, value, data);

            const tx = await sharpWallet.getTransaction(0);
            expect(tx[0]).to.equal(to);
            expect(tx[1]).to.equal(value);
            expect(tx[2]).to.be.false;
            expect(tx[3]).to.equal(1); // CHANGED: Now starts with 1 (proposer)
            expect(tx[4]).to.equal(data);
        });

        it("Should return all owners", async function () {
            const contractOwners = await sharpWallet.getOwners();
            expect(contractOwners.length).to.equal(3);
            expect(contractOwners).to.deep.equal(owners);
        });

        it("Should return correct balance", async function () {
            const balance = await sharpWallet.getBalance();
            expect(balance).to.equal(ethers.utils.parseEther("10"));
        });

        it("Should return transaction count", async function () {
            expect(await sharpWallet.getTransactionCount()).to.equal(0);
            
            await sharpWallet.connect(owner1).newTransaction(
                nonOwner.address,
                ethers.utils.parseEther("1"),
                "0x"
            );
            
            expect(await sharpWallet.getTransactionCount()).to.equal(1);
        });
    });

    describe("Receive Function", function () {
        it("Should accept ETH deposits and emit event", async function () {
            const amount = ethers.utils.parseEther("5");
            await expect(
                owner1.sendTransaction({
                    to: sharpWallet.address,
                    value: amount
                })
            )
                .to.emit(sharpWallet, "Deposit")
                .withArgs(owner1.address, amount);
        });

        it("Should update balance after deposit", async function () {
            const balanceBefore = await sharpWallet.getBalance();
            const amount = ethers.utils.parseEther("3");
            
            await owner1.sendTransaction({
                to: sharpWallet.address,
                value: amount
            });
            
            const balanceAfter = await sharpWallet.getBalance();
            expect(balanceAfter.sub(balanceBefore)).to.equal(amount);
        });
    });

    describe("Delete Transaction Function", function () {
        beforeEach(async function () {
            // Create a transaction (auto-approved by owner1)
            await sharpWallet.connect(owner1).newTransaction(
                nonOwner.address,
                ethers.utils.parseEther("1"),
                "0x"
            );
        });

        it("Should allow proposer to delete their own transaction if alone", async function () {
            // Transaction has only 1 approval (proposer's auto-approval)
            await expect(sharpWallet.connect(owner1).deleteTransaction(0))
                .to.emit(sharpWallet, "TransactionDeleted")
                .withArgs(0, owner1.address);

            // Approval count should be 0
            expect(await sharpWallet.approvalCount(0)).to.equal(0);
            
            // Proposer should no longer be approved
            expect(await sharpWallet.isApproved(0, owner1.address)).to.be.false;
        });

        it("Should reject deletion if others already approved", async function () {
            // Add another approval
            await sharpWallet.connect(owner2).approveTransaction(0);

            // Now transaction has 2 approvals, can't delete
            await expect(
                sharpWallet.connect(owner1).deleteTransaction(0)
            ).to.be.revertedWith("Others already approved");
        });

        it("Should reject deletion by non-proposer", async function () {
            // Owner2 tries to delete owner1's transaction
            await expect(
                sharpWallet.connect(owner2).deleteTransaction(0)
            ).to.be.revertedWith("You didn't propose this");
        });

        it("Should reject operations on deleted transaction", async function () {
            // Delete the transaction
            await sharpWallet.connect(owner1).deleteTransaction(0);

            // Try to approve deleted transaction
            await expect(
                sharpWallet.connect(owner2).approveTransaction(0)
            ).to.be.reverted; // Will revert with TxDeleted error

            // Try to execute deleted transaction
            await expect(
                sharpWallet.connect(owner1).executeTransaction(0)
            ).to.be.reverted;
        });

        it("Should reject deletion of executed transaction", async function () {
            // Get enough approvals and execute
            await sharpWallet.connect(owner2).approveTransaction(0);
            await sharpWallet.connect(owner1).executeTransaction(0);

            // Try to delete executed transaction
            await expect(
                sharpWallet.connect(owner1).deleteTransaction(0)
            ).to.be.reverted; // Will revert with TxAlreadyExecuted
        });

        it("Should reject deletion of non-existent transaction", async function () {
            await expect(
                sharpWallet.connect(owner1).deleteTransaction(99)
            ).to.be.reverted; // Will revert with TxDoesNotExist
        });

        it("Should allow deletion and creation of new transaction", async function () {
            // Delete first transaction
            await sharpWallet.connect(owner1).deleteTransaction(0);

            // Create a new transaction (will have ID 1)
            await sharpWallet.connect(owner2).newTransaction(
                nonOwner.address,
                ethers.utils.parseEther("2"),
                "0x"
            );

            // New transaction should work normally
            expect(await sharpWallet.getTransactionCount()).to.equal(2);
            expect(await sharpWallet.approvalCount(1)).to.equal(1); // Owner2's auto-approval
        });
    });
});