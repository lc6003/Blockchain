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
