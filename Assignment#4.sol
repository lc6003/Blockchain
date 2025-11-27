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


contract MultiSigWallet is ISharpWallet {

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
    
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");
    
            isOwner[owner] = true;
            owners.push(owner);
        }
    
        requiredConfirmations = _requiredApprovals;
    }

    /*//////////////////////////////////////////////////////////////
                               EVENTS
    //////////////////////////////////////////////////////////////*/

    event TransactionSubmitted(
        uint256 indexed txId,
        address indexed proposer,
        address to,
        uint256 value,
        bytes data
    );

    event TransactionApproved(
        uint256 indexed txId,
        address indexed owner
    );

    event ApprovalRevoked(
        uint256 indexed txId,
        address indexed owner
    );

    event TransactionExecuted(
        uint256 indexed txId,
        address indexed executor
    );

    event OwnerAdded(address indexed newOwner);
    event OwnerRemoved(address indexed oldOwner);
    event RequirementChanged(uint256 newRequirement);

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function newTransaction(address to, uint256 value, bytes calldata data)
        external
        override
        returns (uint256 txId)
    {

    }

    function approveTransaction(uint256 txId) external override {
        
    }

    function revokeApproval(uint256 txId) external override {
        
    }

    function executeTransaction(uint256 txId) external override {
        
    }

    function isApproved(uint256 txId, address owner)
        external
        view
        override
        returns (bool)
    {
        
    }

    function approvalCount(uint256 txId)
        external
        view
        override
        returns (uint256)
    {
        
    }

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
        
    }

    function getOwners() external view override returns (address[] memory) {
        return owners;
    }

    function requiredApprovals() external view override returns (uint256) {
        return requiredConfirmations;
    }

    function addOwner(address newOwner) external override {
        
    }

    function removeOwner(address owner) external override {
        
    }

    function updateRequirement(uint256 newRequirement) external override {
        
    }
}


