// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "./ShopFactory.sol";
import "./OwnerManagedLite.sol";

contract ShopKeeper is OwnerManagedLite, ShopFactory {
    constructor() public  {
        
    }

    function addDefaultState() public {
        AddState( msg.sender , true); 
    }
}
