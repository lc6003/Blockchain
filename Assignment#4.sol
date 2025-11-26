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


    /*//////////////////////////////////////////////////////////////
                              FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Submit a transaction proposal.
    function submitTransactionProposal(
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


contract MultiSigWallet {

    event TransactionSubmitted(txId, proposer, to, value, data); // Emitted when an owner submits a new transaction
    event TransactionApproved(txId, owner); // Emitted when an owner approves a transaction
    event ApprovalRevoked(txId, owner); // Emitted when an owner removes their approval
    event TransactionExecuted(txId, executor); // Emitted when a transaction is fully approved and executed
    event OwnerAdded(newOwner); // Emitted when a new wallet owner is added
    event OwnerRemoved(oldOwner); // Emitted when an existing owner is removed
    event RequirementChanged(newRequirement); // Emitted when the required number of approvals is updated

    //Allows any owner to propose a new transaction
    function submitTransaction(to, value, data) public {

    }

    //Owner approves a pending transaction
    function approveTransaction(txId) public {

    }

    //Owner can revoke their approval before execution
    function revokeApproval(txId) public {

    }

    //Executes a transaction once it reaches required approvals
    function executeTransaction(txId) public {

    } 
    
}


