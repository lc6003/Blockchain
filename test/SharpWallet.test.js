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
        await sharpWallet.deployed(); // Ethers v5 syntax

        // Fund the wallet
        await owner1.sendTransaction({
            to: sharpWallet.address, // Ethers v5 syntax
            value: ethers.utils.parseEther("10") // Ethers v5 syntax
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

    describe("Transaction Submission", function () {
        it("Should allow owner to submit transaction", async function () {
            const to = nonOwner.address;
            const value = ethers.utils.parseEther("1");
            const data = "0x";

            await expect(
                sharpWallet.connect(owner1).newTransaction(to, value, data)
            )
                .to.emit(sharpWallet, "TransactionSubmitted")
                .withArgs(0, owner1.address, to, value, data);
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

    describe("Transaction Approval", function () {
        beforeEach(async function () {
            await sharpWallet.connect(owner1).newTransaction(
                nonOwner.address,
                ethers.utils.parseEther("1"),
                "0x"
            );
        });

        it("Should allow owner to approve transaction", async function () {
            await expect(sharpWallet.connect(owner1).approveTransaction(0))
                .to.emit(sharpWallet, "TransactionApproved")
                .withArgs(0, owner1.address);

            expect(await sharpWallet.isApproved(0, owner1.address)).to.be.true;
            expect(await sharpWallet.approvalCount(0)).to.equal(1);
        });

        it("Should reject non-owner approval", async function () {
            await expect(
                sharpWallet.connect(nonOwner).approveTransaction(0)
            ).to.be.reverted;
        });

        it("Should reject double approval", async function () {
            await sharpWallet.connect(owner1).approveTransaction(0);
            await expect(
                sharpWallet.connect(owner1).approveTransaction(0)
            ).to.be.reverted;
        });

        it("Should reject approval of non-existent transaction", async function () {
            await expect(
                sharpWallet.connect(owner1).approveTransaction(99)
            ).to.be.reverted;
        });

        it("Should track multiple approvals", async function () {
            await sharpWallet.connect(owner1).approveTransaction(0);
            await sharpWallet.connect(owner2).approveTransaction(0);

            expect(await sharpWallet.approvalCount(0)).to.equal(2);
            expect(await sharpWallet.isApproved(0, owner1.address)).to.be.true;
            expect(await sharpWallet.isApproved(0, owner2.address)).to.be.true;
        });
    });

    describe("Approval Revocation", function () {
        beforeEach(async function () {
            await sharpWallet.connect(owner1).newTransaction(
                nonOwner.address,
                ethers.utils.parseEther("1"),
                "0x"
            );
            await sharpWallet.connect(owner1).approveTransaction(0);
        });

        it("Should allow owner to revoke approval", async function () {
            await expect(sharpWallet.connect(owner1).revokeApproval(0))
                .to.emit(sharpWallet, "ApprovalRevoked")
                .withArgs(0, owner1.address);

            expect(await sharpWallet.isApproved(0, owner1.address)).to.be.false;
            expect(await sharpWallet.approvalCount(0)).to.equal(0);
        });

        it("Should reject revocation of non-approved transaction", async function () {
            await expect(
                sharpWallet.connect(owner2).revokeApproval(0)
            ).to.be.revertedWith("Transaction not approved");
        });

        it("Should reject non-owner revocation", async function () {
            await expect(
                sharpWallet.connect(nonOwner).revokeApproval(0)
            ).to.be.reverted;
        });
    });

    describe("Transaction Execution", function () {
        beforeEach(async function () {
            await sharpWallet.connect(owner1).newTransaction(
                nonOwner.address,
                ethers.utils.parseEther("1"),
                "0x"
            );
        });

        it("Should execute transaction with enough approvals", async function () {
            await sharpWallet.connect(owner1).approveTransaction(0);
            await sharpWallet.connect(owner2).approveTransaction(0);

            const balanceBefore = await ethers.provider.getBalance(nonOwner.address);

            await expect(sharpWallet.connect(owner1).executeTransaction(0))
                .to.emit(sharpWallet, "TransactionExecuted")
                .withArgs(0, owner1.address);

            const balanceAfter = await ethers.provider.getBalance(nonOwner.address);
            expect(balanceAfter.sub(balanceBefore)).to.equal(ethers.utils.parseEther("1"));

            const tx = await sharpWallet.getTransaction(0);
            expect(tx[2]).to.be.true; // executed flag
        });

        it("Should reject execution without enough approvals", async function () {
            await sharpWallet.connect(owner1).approveTransaction(0);

            await expect(
                sharpWallet.connect(owner1).executeTransaction(0)
            ).to.be.revertedWith("Not enough approvals");
        });

        it("Should reject double execution", async function () {
            await sharpWallet.connect(owner1).approveTransaction(0);
            await sharpWallet.connect(owner2).approveTransaction(0);
            await sharpWallet.connect(owner1).executeTransaction(0);

            await expect(
                sharpWallet.connect(owner1).executeTransaction(0)
            ).to.be.reverted;
        });

        it("Should reject non-owner execution", async function () {
            await sharpWallet.connect(owner1).approveTransaction(0);
            await sharpWallet.connect(owner2).approveTransaction(0);

            await expect(
                sharpWallet.connect(nonOwner).executeTransaction(0)
            ).to.be.reverted;
        });

        it("Should reject approval of executed transaction", async function () {
            await sharpWallet.connect(owner1).approveTransaction(0);
            await sharpWallet.connect(owner2).approveTransaction(0);
            await sharpWallet.connect(owner1).executeTransaction(0);

            await expect(
                sharpWallet.connect(owner3).approveTransaction(0)
            ).to.be.reverted;
        });
    });

    // describe("Owner Management", function () {
    //     it("Should add new owner via multi-sig", async function () {
    //         const addOwnerData = sharpWallet.interface.encodeFunctionData(
    //             "addOwner",
    //             [nonOwner.address]
    //         );

    //         await sharpWallet.connect(owner1).newTransaction(
    //             sharpWallet.address,
    //             0,
    //             addOwnerData
    //         );
    //         await sharpWallet.connect(owner1).approveTransaction(0);
    //         await sharpWallet.connect(owner2).approveTransaction(0);

    //         await expect(sharpWallet.connect(owner1).executeTransaction(0))
    //             .to.emit(sharpWallet, "OwnerAdded")
    //             .withArgs(nonOwner.address);

    //         expect(await sharpWallet.isOwner(nonOwner.address)).to.be.true;
    //         const contractOwners = await sharpWallet.getOwners();
    //         expect(contractOwners).to.include(nonOwner.address);
    //     });

    //     it("Should remove owner via multi-sig", async function () {
    //         const removeOwnerData = sharpWallet.interface.encodeFunctionData(
    //             "removeOwner",
    //             [owner3.address]
    //         );

    //         await sharpWallet.connect(owner1).newTransaction(
    //             sharpWallet.address,
    //             0,
    //             removeOwnerData
    //         );
    //         await sharpWallet.connect(owner1).approveTransaction(0);
    //         await sharpWallet.connect(owner2).approveTransaction(0);

    //         await expect(sharpWallet.connect(owner1).executeTransaction(0))
    //             .to.emit(sharpWallet, "OwnerRemoved")
    //             .withArgs(owner3.address);

    //         expect(await sharpWallet.isOwner(owner3.address)).to.be.false;
    //     });

    //     it("Should update requirement via multi-sig", async function () {
    //         const updateReqData = sharpWallet.interface.encodeFunctionData(
    //             "updateRequirement",
    //             [3]
    //         );

    //         await sharpWallet.connect(owner1).newTransaction(
    //             sharpWallet.address,
    //             0,
    //             updateReqData
    //         );
    //         await sharpWallet.connect(owner1).approveTransaction(0);
    //         await sharpWallet.connect(owner2).approveTransaction(0);

    //         await expect(sharpWallet.connect(owner1).executeTransaction(0))
    //             .to.emit(sharpWallet, "RequirementChanged")
    //             .withArgs(3);

    //         expect(await sharpWallet.requiredApprovals()).to.equal(3);
    //     });

    //     it("Should reject direct owner addition", async function () {
    //         await expect(
    //             sharpWallet.connect(owner1).addOwner(nonOwner.address)
    //         ).to.be.revertedWith("Only wallet can add owner");
    //     });

    //     it("Should reject removing last owner", async function () {
    //         const SharpWallet = await ethers.getContractFactory("SharpWallet");
    //         const singleOwnerWallet = await SharpWallet.deploy(
    //             [owner1.address],
    //             1
    //         );
    //         await singleOwnerWallet.deployed();

    //         const removeOwnerData = singleOwnerWallet.interface.encodeFunctionData(
    //             "removeOwner",
    //             [owner1.address]
    //         );

    //         await singleOwnerWallet.connect(owner1).newTransaction(
    //             singleOwnerWallet.address,
    //             0,
    //             removeOwnerData
    //         );
    //         await singleOwnerWallet.connect(owner1).approveTransaction(0);

    //         await expect(
    //             singleOwnerWallet.connect(owner1).executeTransaction(0)
    //         ).to.be.revertedWith("Transaction execution failed");
    //     });
    // });

    describe("View Functions", function () {
        it("Should return correct transaction details", async function () {
            const to = nonOwner.address;
            const value = ethers.utils.parseEther("1");
            const data = "0x1234";

            await sharpWallet.connect(owner1).newTransaction(to, value, data);
            await sharpWallet.connect(owner1).approveTransaction(0);

            const tx = await sharpWallet.getTransaction(0);
            expect(tx[0]).to.equal(to);
            expect(tx[1]).to.equal(value);
            expect(tx[2]).to.be.false; // not executed
            expect(tx[3]).to.equal(1); // one confirmation
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
});