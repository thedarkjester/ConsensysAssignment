// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "./Shop.sol";

contract ShopFactory {
    mapping(bytes32=>address) private shopMapping;
    string[] private names;
    event ShopAdded(string name, address shopAddress);
  
    constructor() public {

    }

    /// @dev validates name is between 1 and 40 characters
    /// @dev 40 is a personal choice and could be something else
    modifier nameIsCorrectLength(string memory shopName) {
        bytes memory shopNameBytes = bytes(shopName);
        require(shopNameBytes.length != 0 && shopNameBytes.length < 41); 
        _;
    }

    /// @dev validates the name does not already exist
    modifier stringDoesNotExist(string memory shopName) {
        bytes32 hashToCheck =  keccak256(bytes(shopName));
        require(address(shopMapping[hashToCheck]) == 0x0000000000000000000000000000000000000000); 
        _;
    }

    /// @notice Retrieves a list of all the shop names
    /// @return shop names array
    function getShops() public view returns (string[] memory) {
        string[] memory safeNames = new string[](names.length);

        for(uint i=0;i<names.length;i++) {
            if(!isSafeString(names[i])) {
                safeNames[i] = "***";
            }
            else {
                safeNames[i] = names[i];
            }
        }
        return safeNames;
    }

    /// @notice Retrieves the requested shop's address from its name
    /// @param shopName the name of the shop
    /// @return shopAddress - the address of the shop
    /// @return shopHash - the hash of the shop name
    function getShopLookupByName(string memory shopName) public view returns (address shopAddress,bytes32 shopHash) {
        bytes32 shopHashed = keccak256(bytes(shopName));
        shopAddress = address(shopMapping[shopHashed]);
        shopHash = shopHashed;
    }

    /// @notice Retrieves the requested shop's address from its hash
    /// @param shopHashed the hash of the shop name
    /// @return shopAddress - the address of the shop
    function getShopAddressByHash(bytes32 shopHashed) public view returns (address shopAddress) {
        shopAddress = address(shopMapping[shopHashed]);
    }

    /// @notice Determine if the text is safe for use
    /// @dev Each character is individually checked 
    /// @param str The string to interrogate
    /// @return Boolean indicating if the text contains unexpected characters
    function isSafeString(string memory str) private pure returns (bool ) {
        bytes memory b = bytes(str);
        
        for(uint i; i < b.length; i++) {
            bytes1 char = b[i];
            if( !(char >= 0x30 && char <= 0x39) && //9-0
                !(char >= 0x41 && char <= 0x5A) && //A-Z
                !(char >= 0x61 && char <= 0x7A) && //a-z
                !(char == 0x2E) && !(char == 0x20) // ." "
            )
            return false;
        }
        return true;
    }

  function AddShopInstance(string memory shopName)  
      nameIsCorrectLength(shopName) 
      stringDoesNotExist(shopName)
      public 
  {
      require(names.length < 50," There are already 50 shops");
      
      bytes32 shopHashed = keccak256(bytes(shopName));
      Shop newShop = new Shop(msg.sender);

      names.push(shopName);
      shopMapping[shopHashed] = address(newShop);

      emit ShopAdded(shopName,address(newShop));
  }
}