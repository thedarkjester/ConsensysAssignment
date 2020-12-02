// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

/// @title A library to return save text if not in A-Z, 0-9, . , space
/// @author The Dark Jester
/// @notice You can use this library as per MIT license
/// @dev Currently a simple example of a library function
library SafeText {
    
    /// @notice Determine if the text is safe for use
    /// @dev Each character is individually checked 
    /// @param str The string to interrogate
    /// @return Boolean indicating if the text contains unexpected characters
    function isSafeString(string memory str) public pure returns (bool) {
       bytes memory b = bytes(str);
        
        for(uint i; i<b.length; i++) {
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
}
