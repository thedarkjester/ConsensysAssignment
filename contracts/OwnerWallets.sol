// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";

/// @title Multi signature contract for managing owners and contract state
/// @author The Dark Jester
/// @notice You can use this library as per MIT license
/// @dev includes activation/deactivation, owner management and owner count required for change
contract OwnerWallets {
    using SafeMath for uint256;

    mapping(address => uint256) public ownerBalances;

    event LogDepositReceived(address sender);
    event LogDepositWithdrawn(address receiver, uint amount);
    event FundsDistributed();

    constructor() public {

    }

    /// @notice Withdraws the balance associated to the owner
    /// @dev deliberately not checking isOwner as you may have been removed but should still get your funds
    /// @dev setting balance to zero before send to prevent re-entry in case it is a contract address
    function withdraw(address payable ownerAddress) public { 
        require(ownerBalances[ownerAddress] > 0);

        uint256 balanceToSend = ownerBalances[ownerAddress];
        ownerBalances[ownerAddress] = 0;
        
        ownerAddress.transfer(balanceToSend);

        emit LogDepositWithdrawn(ownerAddress, balanceToSend); 
    }

    /// @notice Distributes funds sent to the contract e.g. via receive/fallback to the current owners
    /// @dev this is so that owners once funds are taken can split the remaining contract balance
    /// @dev calls distribute funds with the amount post calculation
    function distributeUnallocatedFunds(address[] calldata owners) external { 
        uint256 allocatedBalances;

        for(uint i=0; i < owners.length; i++) {
          allocatedBalances = allocatedBalances.add(ownerBalances[owners[i]]);
        }

        uint256 amountToSplit = msg.sender.balance.sub(allocatedBalances);

        distributeFunds(amountToSplit, true, owners);
        
        emit FundsDistributed();
    }

     /// @notice Distributes a specified amount to current owners
     /// @dev if the function is called by an owner, the remainder goes to them to offset gas costs, otherwise the last owner gets it
     /// @param amount the amount to distribute across the owners
     function distributeFunds(uint256 amount, bool callerIsOwner, address[] memory owners) public { 
        uint256 split = amount.div(owners.length);
        uint256 remainder = amount.mod(owners.length);

        for(uint i=0; i < owners.length;i++) {
            ownerBalances[owners[i]] = ownerBalances[owners[i]].add(split);

            if(callerIsOwner) {
                if(owners[i] == msg.sender) {
                  ownerBalances[owners[i]] = ownerBalances[owners[i]].add(remainder);
                }
            }           
            else {
                if(i == (owners.length-1)) {
                    ownerBalances[owners[i]] = ownerBalances[owners[i]].add(remainder);
                }
            }
        }
     }
}