const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigWallet", function () {
    let multiSigWallet;
    let owner1, owner2, owner3, nonOwner;
    let owners;
    const requiredApprovals = 2;

    beforeEach(async function () {
        [owner1, owner2, owner3, nonOwner] = await ethers.getSigners();
        owners = [owner1.address, owner2.address, owner3.address];

        const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
        multiSigWallet = await MultiSigWallet.deploy(owners, requiredApprovals);
        await multiSigWallet.deployed();

        // Fund the wallet
        await owner1.sendTransaction({
            to: multiSigWallet.address,
            value: ethers.utils.parseEther("10")
        });
    });

    describe("Deployment", function () {
        it("Should set the correct owners", async function () {
            const contractOwners = await multiSigWallet.getOwners();
            expect(contractOwners).to.deep.equal(owners);
        });

        it("Should set the correct required approvals", async function () {
            expect(await multiSigWallet.requiredApprovals()).to.equal(requiredApprovals);
        });

        it("Should mark addresses as owners", async function () {
            expect(await multiSigWallet.isOwner(owner1.address)).to.be.true;
            expect(await multiSigWallet.isOwner(owner2.address)).to.be.true;
            expect(await multiSigWallet.isOwner(owner3.address)).to.be.true;
            expect(await multiSigWallet.isOwner(nonOwner.address)).to.be.false;
        });

        it("Should reject empty owners array", async function () {
            const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
            await expect(
                MultiSigWallet.deploy([], requiredApprovals)
            ).to.be.revertedWith("Owners required");
        });

        it("Should reject invalid approval requirement", async function () {
            const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
            await expect(
                MultiSigWallet.deploy(owners, 0)
            ).to.be.revertedWith("Invalid approval requirement");
            await expect(
                MultiSigWallet.deploy(owners, 4)
            ).to.be.revertedWith("Invalid approval requirement");
        });

        it("Should reject duplicate owners", async function () {
            const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
            await expect(
                MultiSigWallet.deploy([owner1.address, owner1.address], 1)
            ).to.be.revertedWith("Owner not unique");
        });

        it("Should reject zero address as owner", async function () {
            const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
            await expect(
                MultiSigWallet.deploy([ethers.constants.AddressZero], 1)
            ).to.be.revertedWith("Invalid owner");
        });
    });

    describe("Transaction Submission", function () {
        it("Should allow owner to submit transaction", async function () {
            const to = nonOwner.address;
            const value = ethers.utils.parseEther("1");
            const data = "0x";

            await expect(
                multiSigWallet.connect(owner1).newTransaction(to, value, data)
            )
                .to.emit(multiSigWallet, "TransactionSubmitted")
                .withArgs(0, owner1.address, to, value, data);
        });

        it("Should reject non-owner submission", async function () {
            await expect(
                multiSigWallet.connect(nonOwner).newTransaction(
                    nonOwner.address,
                    ethers.utils.parseEther("1"),
                    "0x"
                )
            ).to.be.revertedWith("Not owner");
        });

        it("Should increment transaction ID", async function () {
            await multiSigWallet.connect(owner1).newTransaction(
                nonOwner.address,
                0,
                "0x"
            );
            await multiSigWallet.connect(owner1).newTransaction(
                nonOwner.address,
                0,
                "0x"
            );

            const tx = await multiSigWallet.getTransaction(1);
            expect(tx[0]).to.equal(nonOwner.address);
        });
    });

    describe("Transaction Approval", function () {
        beforeEach(async function () {
            await multiSigWallet.connect(owner1).newTransaction(
                nonOwner.address,
                ethers.utils.parseEther("1"),
                "0x"
            );
        });

        it("Should allow owner to approve transaction", async function () {
            await expect(multiSigWallet.connect(owner1).approveTransaction(0))
                .to.emit(multiSigWallet, "TransactionApproved")
                .withArgs(0, owner1.address);

            expect(await multiSigWallet.isApproved(0, owner1.address)).to.be.true;
            expect(await multiSigWallet.approvalCount(0)).to.equal(1);
        });

        it("Should reject non-owner approval", async function () {
            await expect(
                multiSigWallet.connect(nonOwner).approveTransaction(0)
            ).to.be.revertedWith("Not owner");
        });

        it("Should reject double approval", async function () {
            await multiSigWallet.connect(owner1).approveTransaction(0);
            await expect(
                multiSigWallet.connect(owner1).approveTransaction(0)
            ).to.be.revertedWith("Transaction already approved");
        });

        it("Should reject approval of non-existent transaction", async function () {
            await expect(
                multiSigWallet.connect(owner1).approveTransaction(99)
            ).to.be.revertedWith("Transaction does not exist");
        });

        it("Should track multiple approvals", async function () {
            await multiSigWallet.connect(owner1).approveTransaction(0);
            await multiSigWallet.connect(owner2).approveTransaction(0);

            expect(await multiSigWallet.approvalCount(0)).to.equal(2);
            expect(await multiSigWallet.isApproved(0, owner1.address)).to.be.true;
            expect(await multiSigWallet.isApproved(0, owner2.address)).to.be.true;
        });
    });

    describe("Approval Revocation", function () {
        beforeEach(async function () {
            await multiSigWallet.connect(owner1).newTransaction(
                nonOwner.address,
                ethers.utils.parseEther("1"),
                "0x"
            );
            await multiSigWallet.connect(owner1).approveTransaction(0);
        });

        it("Should allow owner to revoke approval", async function () {
            await expect(multiSigWallet.connect(owner1).revokeApproval(0))
                .to.emit(multiSigWallet, "ApprovalRevoked")
                .withArgs(0, owner1.address);

            expect(await multiSigWallet.isApproved(0, owner1.address)).to.be.false;
            expect(await multiSigWallet.approvalCount(0)).to.equal(0);
        });

        it("Should reject revocation of non-approved transaction", async function () {
            await expect(
                multiSigWallet.connect(owner2).revokeApproval(0)
            ).to.be.revertedWith("Transaction not approved");
        });

        it("Should reject non-owner revocation", async function () {
            await expect(
                multiSigWallet.connect(nonOwner).revokeApproval(0)
            ).to.be.revertedWith("Not owner");
        });
    });

    describe("Transaction Execution", function () {
        beforeEach(async function () {
            await multiSigWallet.connect(owner1).newTransaction(
                nonOwner.address,
                ethers.utils.parseEther("1"),
                "0x"
            );
        });

        it("Should execute transaction with enough approvals", async function () {
            await multiSigWallet.connect(owner1).approveTransaction(0);
            await multiSigWallet.connect(owner2).approveTransaction(0);

            const balanceBefore = await ethers.provider.getBalance(nonOwner.address);

            await expect(multiSigWallet.connect(owner1).executeTransaction(0))
                .to.emit(multiSigWallet, "TransactionExecuted")
                .withArgs(0, owner1.address);

            const balanceAfter = await ethers.provider.getBalance(nonOwner.address);
            expect(balanceAfter.sub(balanceBefore)).to.equal(
                ethers.utils.parseEther("1")
            );

            const tx = await multiSigWallet.getTransaction(0);
            expect(tx[2]).to.be.true; // executed flag
        });

        it("Should reject execution without enough approvals", async function () {
            await multiSigWallet.connect(owner1).approveTransaction(0);

            await expect(
                multiSigWallet.connect(owner1).executeTransaction(0)
            ).to.be.revertedWith("Not enough approvals");
        });

        it("Should reject double execution", async function () {
            await multiSigWallet.connect(owner1).approveTransaction(0);
            await multiSigWallet.connect(owner2).approveTransaction(0);
            await multiSigWallet.connect(owner1).executeTransaction(0);

            await expect(
                multiSigWallet.connect(owner1).executeTransaction(0)
            ).to.be.revertedWith("Transaction already executed");
        });

        it("Should reject non-owner execution", async function () {
            await multiSigWallet.connect(owner1).approveTransaction(0);
            await multiSigWallet.connect(owner2).approveTransaction(0);

            await expect(
                multiSigWallet.connect(nonOwner).executeTransaction(0)
            ).to.be.revertedWith("Not owner");
        });

        it("Should reject approval of executed transaction", async function () {
            await multiSigWallet.connect(owner1).approveTransaction(0);
            await multiSigWallet.connect(owner2).approveTransaction(0);
            await multiSigWallet.connect(owner1).executeTransaction(0);

            await expect(
                multiSigWallet.connect(owner3).approveTransaction(0)
            ).to.be.revertedWith("Transaction already executed");
        });
    });

    describe("Owner Management", function () {
        it("Should add new owner via multi-sig", async function () {
            const addOwnerData = multiSigWallet.interface.encodeFunctionData(
                "addOwner",
                [nonOwner.address]
            );

            await multiSigWallet.connect(owner1).newTransaction(
                multiSigWallet.address,
                0,
                addOwnerData
            );
            await multiSigWallet.connect(owner1).approveTransaction(0);
            await multiSigWallet.connect(owner2).approveTransaction(0);

            await expect(multiSigWallet.connect(owner1).executeTransaction(0))
                .to.emit(multiSigWallet, "OwnerAdded")
                .withArgs(nonOwner.address);

            expect(await multiSigWallet.isOwner(nonOwner.address)).to.be.true;
            const contractOwners = await multiSigWallet.getOwners();
            expect(contractOwners).to.include(nonOwner.address);
        });

        it("Should remove owner via multi-sig", async function () {
            const removeOwnerData = multiSigWallet.interface.encodeFunctionData(
                "removeOwner",
                [owner3.address]
            );

            await multiSigWallet.connect(owner1).newTransaction(
                multiSigWallet.address,
                0,
                removeOwnerData
            );
            await multiSigWallet.connect(owner1).approveTransaction(0);
            await multiSigWallet.connect(owner2).approveTransaction(0);

            await expect(multiSigWallet.connect(owner1).executeTransaction(0))
                .to.emit(multiSigWallet, "OwnerRemoved")
                .withArgs(owner3.address);

            expect(await multiSigWallet.isOwner(owner3.address)).to.be.false;
        });

        it("Should update requirement via multi-sig", async function () {
            const updateReqData = multiSigWallet.interface.encodeFunctionData(
                "updateRequirement",
                [3]
            );

            await multiSigWallet.connect(owner1).newTransaction(
                multiSigWallet.address,
                0,
                updateReqData
            );
            await multiSigWallet.connect(owner1).approveTransaction(0);
            await multiSigWallet.connect(owner2).approveTransaction(0);

            await expect(multiSigWallet.connect(owner1).executeTransaction(0))
                .to.emit(multiSigWallet, "RequirementChanged")
                .withArgs(3);

            expect(await multiSigWallet.requiredApprovals()).to.equal(3);
        });

        it("Should reject direct owner addition", async function () {
            await expect(
                multiSigWallet.connect(owner1).addOwner(nonOwner.address)
            ).to.be.revertedWith("Only wallet can add owner");
        });

        it("Should reject removing last owner", async function () {
            const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
            const singleOwnerWallet = await MultiSigWallet.deploy(
                [owner1.address],
                1
            );

            const removeOwnerData = singleOwnerWallet.interface.encodeFunctionData(
                "removeOwner",
                [owner1.address]
            );

            await singleOwnerWallet.connect(owner1).newTransaction(
                singleOwnerWallet.address,
                0,
                removeOwnerData
            );
            await singleOwnerWallet.connect(owner1).approveTransaction(0);

            await expect(
                singleOwnerWallet.connect(owner1).executeTransaction(0)
            ).to.be.revertedWith("Cannot remove last owner");
        });
    });

    describe("View Functions", function () {
        it("Should return correct transaction details", async function () {
            const to = nonOwner.address;
            const value = ethers.utils.parseEther("1");
            const data = "0x1234";

            await multiSigWallet.connect(owner1).newTransaction(to, value, data);
            await multiSigWallet.connect(owner1).approveTransaction(0);

            const tx = await multiSigWallet.getTransaction(0);
            expect(tx[0]).to.equal(to);
            expect(tx[1]).to.equal(value);
            expect(tx[2]).to.be.false; // not executed
            expect(tx[3]).to.equal(1); // one confirmation
            expect(tx[4]).to.equal(data);
        });

        it("Should return all owners", async function () {
            const contractOwners = await multiSigWallet.getOwners();
            expect(contractOwners.length).to.equal(3);
            expect(contractOwners).to.deep.equal(owners);
        });
    });

    describe("Receive Function", function () {
        it("Should accept ETH deposits", async function () {
            const amount = ethers.utils.parseEther("5");
            await expect(
                owner1.sendTransaction({
                    to: multiSigWallet.address,
                    value: amount
                })
            ).to.changeEtherBalance(multiSigWallet, amount);
        });
    });
});