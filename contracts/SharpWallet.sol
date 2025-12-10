// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISharpWallet {
    /*//////////////////////////////////////////////////////////////
                               EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a new transaction is submitted.
    event TransactionSubmitted(
        uint256 indexed txId,
        address indexed proposer,
        address to,
        uint256 value,
        bytes data
    );

    /// @notice Emitted when an owner approves a transaction.
    event TransactionApproved(
        uint256 indexed txId,
        address indexed owner
    );

    /// @notice Emitted when an owner revokes their approval.
    event ApprovalRevoked(
        uint256 indexed txId,
        address indexed owner
    );

    /// @notice Emitted when a transaction is executed.
    event TransactionExecuted(
        uint256 indexed txId,
        address indexed executor
    );

    /// @notice Emitted when a new owner is added.
    event OwnerAdded(address indexed newOwner);

    /// @notice Emitted when an existing owner is removed.
    event OwnerRemoved(address indexed oldOwner);

    /// @notice Emitted when required confirmations are updated.
    event RequirementChanged(uint256 newRequirement);

    /// @notice Emitted when ETH is deposited into the wallet.
    event Deposit(address indexed sender, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                              FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Submit a transaction proposal.
    function newTransaction(
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (uint256 txId);

    /// @notice Approve a transaction proposal.
    function approveTransaction(uint256 txId) external;

    /// @notice Revoke approval for a transaction the owner previously approved.
    function revokeApproval(uint256 txId) external;

    /// @notice Execute a fully-approved transaction.
    function executeTransaction(uint256 txId) external;

    /*//////////////////////////////////////////////////////////////
                         READ / UTILITY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns whether an owner has approved a transaction.
    function isApproved(uint256 txId, address owner)
        external
        view
        returns (bool);

    /// @notice Get number of approvals for a transaction.
    function approvalCount(uint256 txId)
        external
        view
        returns (uint256);

    /// @notice Return details of a transaction.
    function getTransaction(uint256 txId)
        external
        view
        returns (
            address to,
            uint256 value,
            bool executed,
            uint256 numConfirmations,
            bytes memory data
        );

    /// @notice Returns list of all owners.
    function getOwners() external view returns (address[] memory);

    /// @notice Returns the number of required approvals.
    function requiredApprovals() external view returns (uint256);

    /// @notice Returns the contract's ETH balance.
    function getBalance() external view returns (uint256);

    /// @notice Returns the total number of transactions.
    function getTransactionCount() external view returns (uint256);

    /*//////////////////////////////////////////////////////////////
                         OWNER MANAGEMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Add a new owner to the wallet.
    function addOwner(address newOwner) external;

    /// @notice Remove an existing owner.
    function removeOwner(address owner) external;

    /// @notice Update the number of required confirmations.
    function updateRequirement(uint256 newRequirement) external;
}


contract SharpWallet is ISharpWallet {
    
    error NotOwner();
    error TxDoesNotExist();
    error TxAlreadyExecuted();
    error TxAlreadyApproved();

    /*//////////////////////////////////////////////////////////////
                               TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/

    struct Transaction {
        address to;
        uint256 value;
        bool executed;
        uint256 numConfirmations;
        bytes data;
    }

    /*//////////////////////////////////////////////////////////////
                               STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public requiredConfirmations;
    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public approved;

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyOwner() {
        if (!isOwner[msg.sender]) revert NotOwner();
        _;
    }

    modifier txExists(uint256 txId) {
        if (txId >= transactions.length) revert TxDoesNotExist();
        _;
    }

    modifier notExecuted(uint256 txId) {
        if (transactions[txId].executed) revert TxAlreadyExecuted();
        _;
    }

    modifier notApproved(uint256 txId) {
        if (approved[txId][msg.sender]) revert TxAlreadyApproved();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Initialize owners and required number of approvals
    /// @param _owners List of wallet owner addresses
    /// @param _requiredApprovals Number of approvals required to execute transaction
    constructor(address[] memory _owners, uint256 _requiredApprovals) {
        require(_owners.length > 0, "Owners required");
        require(
            _requiredApprovals > 0 && _requiredApprovals <= _owners.length,
            "Invalid approval requirement"
        );

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "Invalid owner address");
            require(!isOwner[owner], "Owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        requiredConfirmations = _requiredApprovals;
    }

    /*//////////////////////////////////////////////////////////////
                          RECEIVE FUNCTION
    //////////////////////////////////////////////////////////////*/

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Fallback function called when msg.data is not empty

    fallback() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    /*//////////////////////////////////////////////////////////////
                          TRANSACTION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Submit a transaction proposal
    /// @param to Destination address
    /// @param value Amount of ETH to send
    /// @param data Call data to execute
    /// @return txId The transaction ID
    function newTransaction(
        address to,
        uint256 value,
        bytes calldata data
    ) external override onlyOwner returns (uint256 txId) {
        require(to != address(0), "Invalid target address");

        txId = transactions.length;

        transactions.push(
            Transaction({
                to: to,
                value: value,
                executed: false,
                numConfirmations: 0,
                data: data
            })
        );

        emit TransactionSubmitted(txId, msg.sender, to, value, data);
    }

    /// @notice Approve a transaction proposal
    /// @param txId Transaction ID to approve
    function approveTransaction(uint256 txId)
        external
        override
        onlyOwner
        txExists(txId)
        notExecuted(txId)
        notApproved(txId)
    {
        approved[txId][msg.sender] = true;
        transactions[txId].numConfirmations += 1;

        emit TransactionApproved(txId, msg.sender);
    }

    /// @notice Revoke approval for a transaction
    /// @param txId Transaction ID to revoke approval for
    function revokeApproval(uint256 txId)
        external
        override
        onlyOwner
        txExists(txId)
        notExecuted(txId)
    {
        require(approved[txId][msg.sender], "Transaction not approved");

        approved[txId][msg.sender] = false;
        transactions[txId].numConfirmations -= 1;

        emit ApprovalRevoked(txId, msg.sender);
    }

    /// @notice Execute a fully-approved transaction
    /// @param txId Transaction ID to execute
    function executeTransaction(uint256 txId)
        external
        override
        onlyOwner
        txExists(txId)
        notExecuted(txId)
    {
        Transaction storage transaction = transactions[txId];

        require(
            transaction.numConfirmations >= requiredConfirmations,
            "Not enough approvals"
        );

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "Transaction execution failed");

        emit TransactionExecuted(txId, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                         READ / UTILITY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Check if an owner has approved a transaction
    /// @param txId Transaction ID
    /// @param owner Owner address
    /// @return True if approved, false otherwise
    function isApproved(uint256 txId, address owner)
        external
        view
        override
        returns (bool)
    {
        return approved[txId][owner];
    }

    /// @notice Get number of approvals for a transaction
    /// @param txId Transaction ID
    /// @return Number of approvals
    function approvalCount(uint256 txId)
        external
        view
        override
        returns (uint256)
    {
        return transactions[txId].numConfirmations;
    }

    /// @notice Get transaction details
    /// @param txId Transaction ID
    /// @return to Destination address
    /// @return value Amount of ETH
    /// @return executed Whether transaction was executed
    /// @return numConfirmations Number of confirmations
    /// @return data Call data
    function getTransaction(uint256 txId)
        external
        view
        override
        returns (
            address to,
            uint256 value,
            bool executed,
            uint256 numConfirmations,
            bytes memory data
        )
    {
        Transaction storage transaction = transactions[txId];
        return (
            transaction.to,
            transaction.value,
            transaction.executed,
            transaction.numConfirmations,
            transaction.data
        );
    }

    /// @notice Get list of all owners
    /// @return Array of owner addresses
    function getOwners() external view override returns (address[] memory) {
        return owners;
    }

    /// @notice Get required number of approvals
    /// @return Number of required approvals
    function requiredApprovals() external view override returns (uint256) {
        return requiredConfirmations;
    }

    /// @notice Get the contract's ETH balance
    /// @return The balance in wei
    function getBalance() external view override returns (uint256) {
        return address(this).balance;
    }

    /// @notice Get the total number of transactions
    /// @return The number of transactions
    function getTransactionCount() external view override returns (uint256) {
        return transactions.length;
    }

    /*//////////////////////////////////////////////////////////////
                         OWNER MANAGEMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Add a new owner (must be called via multi-sig transaction)
    /// @param newOwner Address of new owner
    function addOwner(address newOwner) external override {
        require(msg.sender == address(this), "Only wallet can add owner");
        require(newOwner != address(0), "Invalid owner address");
        require(!isOwner[newOwner], "Owner already exists");

        isOwner[newOwner] = true;
        owners.push(newOwner);

        emit OwnerAdded(newOwner);
    }

    /// @notice Remove an existing owner (must be called via multi-sig transaction)
    /// @param owner Address of owner to remove
    function removeOwner(address owner) external override {
        require(msg.sender == address(this), "Only wallet can remove owner");
        require(isOwner[owner], "Not an owner");
        require(owners.length > 1, "Cannot remove last owner");
        require(
            owners.length - 1 >= requiredConfirmations,
            "Would break requirement"
        );

        isOwner[owner] = false;

        // Remove from owners array
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == owner) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }

        emit OwnerRemoved(owner);
    }

    /// @notice Update required confirmations (must be called via multi-sig transaction)
    /// @param newRequirement New number of required confirmations
    function updateRequirement(uint256 newRequirement) external override {
        require(
            msg.sender == address(this),
            "Only wallet can update requirement"
        );
        require(newRequirement > 0, "Requirement must be positive");
        require(
            newRequirement <= owners.length,
            "Requirement exceeds owner count"
        );

        requiredConfirmations = newRequirement;

        emit RequirementChanged(newRequirement);
    }
}
