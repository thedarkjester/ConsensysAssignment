// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";

/// @title Multi signature contract for managing owners and contract state
/// @author The Dark Jester
/// @notice You can use this library as per MIT license
/// @dev includes activation/deactivation, owner management and owner count required for change
contract OwnerManager {
    using SafeMath for uint256;

    address private _ownerWallets;
    
    State public state;

    mapping(address => bool) private stateOwners;

    struct State {
      address[] owners;
      uint8 ownersRequired;
      bool isActive;
      uint abortSeconds; 
      Change change;
    }

    struct Change {
       uint8 ownersRequired;
       uint abortAllowedAt;
       address  ownerToAdd;
       address  ownerToRemove;
       address[] ownersAcceptedStateChange;
       ChangeType changeType;
    }

    enum ChangeType {
      none,
      addOwner,
      removeOwner,
      activate,
      deactivate,
      ownerRequired
    }

    event ChangeAgreed(address owner);
    event StateAdded(bool isActive);
    event ChangeStarted();
    event ChangeCompleted();
    event OwnerAdded(address ownerAddress);
    event OwnerRemoved(address ownerAddress);
    event LogActivated();
    event LogDeactivated();
    event OwnersRequiredChanged(uint8 ownersRequired);
    event LogDepositReceived(address sender);
    event LogDepositWithdrawn(address receiver, uint amount);
    event FundsDistributed();

    constructor(address ownerWallets) public {
        _ownerWallets = ownerWallets;
    }

    /// @notice Default fallback for non-data related deposits
    /// @dev no funds should be accepted to this contract
    fallback() external payable { 
    }

    /// @notice Default receive for non-data related deposits
    /// @dev no funds should be accepted to this contract
    receive() external payable { 
        emit LogDepositReceived(msg.sender); 
    }

    /// @dev validates the required number of owners to make a change
    modifier ownersRequiredIsWithinRange(uint8 ownersRequired) {
        require(ownersRequired > 0);
        require(state.owners.length >= ownersRequired);  
        _;
    }

    /// @dev validates the contract is active
    modifier contractIsActive(bool isActive) {
        require(state.isActive == isActive,"Contract not in expected state");
        _;
    }

    /// @dev validates no other pending change is in progress
    modifier noBlockingChangeOperation() {
        if(state.change.changeType != ChangeType.none)
        {
          require(block.timestamp >= state.change.abortAllowedAt,"Existing operation in progress");
        }
        else {
          require(state.change.changeType == ChangeType.none, "Existing operation in progress");
        }
        _;
    }

    /// @dev validates a change is progress
    modifier changeInProgress() {
        require(state.change.changeType != ChangeType.none,"Existing operation in progress");
        _;
    }

    /// @dev validates an address is not the default address
    modifier addressNotDefault(address addressToCheck) {
        require(addressToCheck != address(0),"Address is default");
        _;
    }

    /// @dev validates the address is an owner
    modifier isStateOwner(address addressToCheck) {
        require( stateOwners[addressToCheck] == true,"Address is not an owner");
        _;
    }

    /// @dev validates the address is not already an owner
    modifier isNotStateOwner(address addressToCheck) {
        require( stateOwners[addressToCheck] == false, "Address is an owner");
        _;
    }

    /// @dev validates the caller is a state owner
    modifier callerIsStateOwner() {
        require(stateOwners[msg.sender] == true, "caller is not state owner");
        _;
    }

    /// @dev validates that the caller cannot accept more than ocne
    modifier ownerHasNotAlreadyAccepted()  {
        require(addressInArray(msg.sender, state.change.ownersAcceptedStateChange) == false,"owner has already accepted");
        _;
    }

    /// @notice Gets the current change required on the state
    /// @dev sets a flag to "unpause" or activate the contract
    /// @return currentChangeOperation object - none is a valid return option
    function getChange() public view returns (Change memory currentChangeOperation) {
        currentChangeOperation = state.change;
    }

    function getOwners() public  view returns (address[] memory owners) {
          owners = state.owners;
    }

    /// @notice This returns the contract balance - TODO - use the real function
    /// @dev no funds should be accepted to this contract
    /// @return the balance as uint
    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    /// @notice Adds a default expected state of the contract
    /// @dev some contracts specify the active/inactive state by default
    /// @param ownerAddress sets the first owner of the state/contract
    /// @param isActive sets the active state of the contract
    function AddState(address ownerAddress, bool isActive) public addressNotDefault(ownerAddress) {
        require(state.ownersRequired == 0, "state already exists");
        
        state.abortSeconds = 3600;
        state.owners = new address[](0);
        state.isActive = isActive;
        state.ownersRequired = 1;

        state.change.changeType = ChangeType.none;
        state.change.ownersAcceptedStateChange = new address[](0);
        state.change.ownersRequired = 1;

        state.owners.push(ownerAddress);
        stateOwners[ownerAddress] = true;

        emit StateAdded(state.isActive);
   }

    /// @notice Withdraws the balance associated to the owner
    /// @dev deliberately not checking isOwner as you may have been removed but should still get your funds
    /// @dev setting balance to zero before send to prevent re-entry in case it is a contract address
    function withdraw() public { 
        (bool success, bytes memory data) = 

        _ownerWallets.delegatecall(abi.encodeWithSelector(bytes4(keccak256("withdraw(address)")), msg.sender));

    }

    /// @notice Distributes funds sent to the contract e.g. via receive/fallback to the current owners
    /// @dev this is so that owners once funds are taken can split the remaining contract balance
    /// @dev calls distribute funds with the amount post calculation
    function distributeUnallocatedFunds() public callerIsStateOwner() { 
        (bool success, bytes memory data) = 
        _ownerWallets.delegatecall(abi.encodeWithSignature("distributeUnallocatedFunds(address[])",state.ownersRequired));
    }

     /// @notice Distributes a specified amount to current owners
     /// @dev if the function is called by an owner, the remainder goes to them to offset gas costs, otherwise the last owner gets it
     /// @param amount the amount to distribute across the owners
     /// @param callerIsOwner deciding factor on owner getting remainder
     function distributeFunds(uint256 amount, bool callerIsOwner) internal { 
       (bool success, bytes memory data) = 
        _ownerWallets.delegatecall(abi.encodeWithSignature("distributeFunds(uint256,bool,address[])",amount, callerIsOwner , state.ownersRequired));
     }

    /// @notice Owner agrees to the requested state change
    /// @dev if the action meets the minimum required owners, the change is actioned via changeState
    function agreeToStateChange() 
        public 
        callerIsStateOwner()
        changeInProgress()
        ownerHasNotAlreadyAccepted()
    {
        if(state.change.ownersAcceptedStateChange.length + 1 == state.ownersRequired) {
           changeState();
           emit ChangeCompleted();
        }
        else {
          emit ChangeAgreed(msg.sender);
          state.change.ownersAcceptedStateChange.push(msg.sender);
        }
    }

    /// @notice Adds a new owner to the list of owners
    /// @dev if more than one owner is required, the state has a change added to it awaiting approval
    /// @param ownerAddress the owner to add
    function addStateOwner(address ownerAddress) 
        public 
        addressNotDefault(ownerAddress)
        noBlockingChangeOperation()
        callerIsStateOwner()
        isNotStateOwner(ownerAddress) 
    {
        resetChangeOnState();
        state.change.changeType = ChangeType.addOwner;
        state.change.ownerToAdd = ownerAddress;

        makeOrSetChange();
    }

    /// @notice Sets default override time for all types of changes
    /// @dev the timeout for when an overriding change is allowed is set at 1 hour to allow for the timestamp not being a risk factor
    function makeOrSetChange() private {
        if(state.ownersRequired == 1) {
            changeState();
        }
        else {
            state.change.abortAllowedAt = block.timestamp + state.abortSeconds;
            state.change.ownersAcceptedStateChange.push(msg.sender);
            emit ChangeStarted();
        }
    }

    /// @notice Removes an owner to the list of owners
    /// @dev if more than one owner is required, the state has a change added to it awaiting approval
    /// @param ownerAddress the owner to remove
    function removeStateOwner(address ownerAddress) 
        public   
        noBlockingChangeOperation()
        callerIsStateOwner() 
        isStateOwner(ownerAddress) 
    {     
       require(state.owners.length > 1);
      
       resetChangeOnState();

       state.change.changeType = ChangeType.removeOwner;
       state.change.ownerToRemove = ownerAddress;

       makeOrSetChange();
    }

    /// @notice Sets the number of owners required to make the change
    /// @dev if more than one owner is required, the state has a change added to it awaiting approval
    /// @param ownersRequired the numbers of owners required to make the change
    function setRequiredOwnersAmount(uint8 ownersRequired) 
        public 
        callerIsStateOwner()
        noBlockingChangeOperation()
        ownersRequiredIsWithinRange(ownersRequired)
    {
       resetChangeOnState();

       state.change.changeType = ChangeType.ownerRequired;
       state.change.ownersRequired = ownersRequired;

       makeOrSetChange();
    }

    /// @notice Deactivates the contract state
    /// @dev sets a flag to "pause" or deactivate the contract
    /// @dev contractIsActive modifier checks for both active/inactive via the boolean param
    function deactivateState() 
        public 
        callerIsStateOwner()
        noBlockingChangeOperation()
        contractIsActive(true)
    {
        resetChangeOnState();
    
        state.change.changeType = ChangeType.deactivate;

        makeOrSetChange();
    }

    /// @notice Activates the contract state
    /// @dev sets a flag to "unpause" or activate the contract
    /// @dev contractIsActive modifier checks for both active/inactive via the boolean param
    function activateState() 
        public 
        callerIsStateOwner()
        noBlockingChangeOperation()
        contractIsActive(false)
    {
      resetChangeOnState();
      
      state.change.changeType = ChangeType.activate;

      makeOrSetChange();
    }

    /// @notice Executes and makes the required state change
    /// @dev resets to the default state when complete
    /// @dev emits varied events depending on the change
    function changeState() private {
        
        if(state.change.changeType == ChangeType.addOwner) {
            stateOwners[state.change.ownerToAdd] = true;
            state.owners.push(state.change.ownerToAdd);
            emit OwnerAdded(state.change.ownerToAdd);
        }

        if(state.change.changeType == ChangeType.removeOwner) {
            stateOwners[state.change.ownerToRemove] = false;
            
            removeOwnerFromState(state.change.ownerToRemove);

            if(state.ownersRequired > state.owners.length) {
              state.ownersRequired--; 
            }
            
            emit OwnerRemoved(state.change.ownerToRemove);
        }

        if(state.change.changeType == ChangeType.activate) {
            state.isActive = true;
            emit LogActivated();
        }

        if(state.change.changeType == ChangeType.deactivate) {
            state.isActive = false;
            emit LogDeactivated();
        }

        if(state.change.changeType == ChangeType.ownerRequired) {
            state.ownersRequired = state.change.ownersRequired;
            emit OwnersRequiredChanged(state.change.ownersRequired);
        }

        emit ChangeCompleted();

        resetChangeOnState();
    }

    /// @notice Resets the state "change" to initial state
    /// @dev emits varied events depending on the change
    function resetChangeOnState() private {
        state.change.changeType = ChangeType.none;
        state.change.ownerToAdd = address(0);
        state.change.ownerToRemove = address(0);
        state.change.ownersAcceptedStateChange = new address[](0);
        state.change.ownersRequired = state.ownersRequired;
        state.change.abortAllowedAt = 0;
    }

    /// @notice Removes the owner from the array
    /// @dev if the owner is found in before the last entry, when found it shifts all of the next items back 1 overwriting and then removing the last entry
    /// @param ownerToRemove the owner to removed from state
    function removeOwnerFromState(address ownerToRemove) private {
        bool ownerToRemoveIsFound = false;
     
        for (uint i = 0; i < state.owners.length; i++) {
            if(state.owners[i] == ownerToRemove) {
                ownerToRemoveIsFound = true;
                continue;
            }

            if(ownerToRemoveIsFound) {
                state.owners[i-1] = state.owners[i];
            }
        }
        
        state.owners.pop(); 
    }

    /// @notice Finds out if an address is in an address array
    /// @param addressToFind the address to find
    /// @param addressArray the array to look in
    function addressInArray(address addressToFind,address [] memory addressArray) internal pure returns (bool isInArray) {
        isInArray = false;

        for(uint i=0; i < addressArray.length; i++) {
            if(addressArray[i] == addressToFind) {
              isInArray = true;
            }
        }
    }
}