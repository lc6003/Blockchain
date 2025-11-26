pragma solidity ^0.8.0;

contract MultiSigWallet {

    address[] public owners; //list of owners
    mapping(address => bool) public isOwner; //allow for quick lookup to check if they are owner
    uint public numConfirmationsRequired; 

    struct WithdrawalRequest {
        address recipient;
        unit value;
        bool executed;
        unit numConfirmations;
    }

    // holds the list of all withdrawal requests
    WithdrawalRequest[] public withdrawalRequests;

    // so we know in the specific transaction, 
    // which owner has confirmed the transaction
    mapping(unit => mapping(address => bool)) public isConfirmed;

    constructor(address[] memory _owners, uint _numConfirmationsRequired) {
        require(_owners.length > 0, "Owners required");
        require(_numConfirmationsRequired > 0 && _numConfirmationsRequired <= _owners.length, "Invalid number of required confirmations");

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0))
        }
    }
}

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
    function submitTransaction(
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
}
