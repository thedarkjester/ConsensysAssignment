// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

/// @title Migration management 
/// @author Truffle
/// @notice You can use this library as per MIT license
/// @dev default migration code
contract Migrations {
  address public owner = msg.sender;
  uint public last_completed_migration;

  /// @notice used to label a method as restricted to the contract owner
  /// @dev this uses the owner store in state
  modifier restricted() {
    require(
      msg.sender == owner,
      "This function is restricted to the contract's owner"
    );
    _;
  }

  /// @notice Determine if the text is safe for use
  /// @dev this is restriced to the original owner
  /// @param completed sets the state of the last migration completed
  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }
}
