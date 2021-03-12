// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.8.0;
pragma experimental ABIEncoderV2;

import "./OwnerManagedLite.sol";
import "./SafeText.sol";

/// @title Shop/Market place contract instance
contract Shop is OwnerManagedLite {
    mapping(bytes32=> uint256) private inventoryArrayIndex;
    Product[] private inventory;

    struct Product{
      bytes32 skuHash;
      string sku;
      string name;
      uint256 fullPrice;
      uint256 stockQuantity;
    }

    event ShopCreated();
    event ProductAdded(string sku);
    event ProductUpdated(string sku);
    event ProductSold(address indexed customer, bytes32 indexed sku,uint256 quantity, uint256 pricePaid);

    /// Contract constructor
    /// @dev defaults the contract to inactive to allow shop owners to add products
    /// @dev initial owner is construct
    constructor (address shopOwnerAddress)  public {
       
       AddState(shopOwnerAddress , false); 

       emit ShopCreated();
    }

    /// @dev validates the SKU exists
    modifier skuExists(bytes32 skuHash) {
      require(inventory.length > 0," There are no products");

      uint256 index = inventoryArrayIndex[skuHash];

      if(index == 0) {
          require(inventory[0].skuHash == skuHash,"sku does not exist");
      }
      else {
          require(inventory[index].skuHash == skuHash,"sku does not exist");
      }
      _;
    }

    /// @dev validates the SKU does not already exist
    modifier skuDoesNotExist(string memory sku) {
      bytes32 hashVal = keccak256(bytes(sku));

      if(inventoryArrayIndex[hashVal] == 0) {
          if(inventory.length > 0) {
              require(inventory[0].skuHash != hashVal,"sku exists");
          }
      }
      _;
    }

    /// @dev validates the SKU exists
    modifier hasPrice(uint256 value) {
      require(value > 0,"price < 0");
      _;
    }

    /// @dev validates both the name and SKU are not empty
     modifier productStringsNotEmpty(string memory name, string memory sku) {
      require(bytes(name).length > 0, "name is empty");
      require(bytes(sku).length > 0, "sku is empty");
      _;
    }

    /// @notice Adds a product to the collection of product
    /// @dev SKUs are to be unique and are never updated
    /// @dev there is no expensive string validation other than empty and 40 char length
    /// @dev 50 products is not a scientific amount but is to prevent shop owners DOS'ing themselves
    /// @param fullPrice the current price
    /// @param stockQuantity the available quantity
    /// @param sku the unique code for the product
    /// @param name an updated product name
    function addProduct (
        uint256 fullPrice,
        uint256 stockQuantity,
        string memory sku,
        string memory name
    ) 
        public  
        callerIsStateOwner()
        hasPrice(fullPrice)
        productStringsNotEmpty(name,sku)
        skuDoesNotExist(sku)
    {
        require(inventory.length < 50," There are already 50 products");

        Product memory newProduct;
        
        bytes32 hashedSku = keccak256(bytes(sku));
        newProduct.sku = sku;
        newProduct.skuHash = hashedSku ;
        newProduct.name = name;
        newProduct.fullPrice = fullPrice;
        newProduct.stockQuantity = stockQuantity ;

        inventoryArrayIndex[hashedSku] = inventory.length;
        inventory.push(newProduct);
        
        emit ProductAdded(sku);
    }

     /// @notice Updates an existing product
     /// @dev name, price and quantity can change, not SKU
     /// @param fullPrice the current price
     /// @param stockQuantity the available quantity
     /// @param skuHash the hash of the sku for looking the product up
     /// @param name an updated product name
     function updateProduct (
        uint256 fullPrice,
        uint256 stockQuantity,
        bytes32 skuHash,
        string memory name
    ) 
        public  
        callerIsStateOwner()
        skuExists(skuHash)
        hasPrice(fullPrice)
    {
        require(bytes(name).length > 0, "name is empty");
        
        uint256 arrayIndex = inventoryArrayIndex[skuHash];
    
        inventory[arrayIndex].name = name;
        inventory[arrayIndex].fullPrice = fullPrice;
        inventory[arrayIndex].stockQuantity = stockQuantity;

        emit ProductUpdated(inventory[arrayIndex].sku);
    }

     /// @notice Sells and notes an item has been sold
     /// @dev decreases quantity, emits indexed event for sold history
     /// @dev auto distributes sale funds to owners
     /// @param stockQuantity is the quantity available
     /// @param skuHash is the reference of the product
    function buyProduct(uint256 stockQuantity, bytes32 skuHash) 
        public  
        skuExists(skuHash) 
        contractIsActive(true) 
        payable 
    {
        uint256 productIndex = inventoryArrayIndex[skuHash] ;
        Product memory product = inventory[productIndex];
        uint256 expectedCost = product.fullPrice.mul(stockQuantity);

        require(msg.value >= expectedCost);
        require(product.stockQuantity >= stockQuantity);

        inventory[productIndex].stockQuantity = inventory[productIndex].stockQuantity.sub(stockQuantity);

        distributeSaleFunds();

        emit ProductSold(msg.sender, skuHash, stockQuantity, product.fullPrice);
    }

    /// @notice Distributes unallocated contract funds to the owners
    /// @dev uses inherited OwnerManagedLite allocation functionality with false for the isOwner call
    function distributeSaleFunds() private { 
         distributeFunds(msg.value, false);
     }

    /// @notice returns the product array
    /// @dev split into separate arrays for ease of change text if found to be unsafe
    /// @return skus - an array of all the product skus
    /// @return names - an array of all the product names
    /// @return prices - an array of all the product prices
    /// @return skuHashes - an array of all the product skuHashes
    function getProducts() public view returns (
        string[] memory skus, 
        string[] memory names, 
        uint256[] memory prices, 
        bytes32[] memory skuHashes) 
    {
        string[] memory skuArr = new string[](inventory.length);
        string[] memory nameArr = new string[](inventory.length);
        uint256[] memory priceArr = new uint256[](inventory.length);
        bytes32[] memory skuHashesArr = new bytes32[](inventory.length);

        for(uint i=0;i<inventory.length;i++) {
            if(!isSafeString(inventory[i].sku)) {
                skuArr[i] = "***";
            }
            else {
                skuArr[i] = inventory[i].sku;
            }

            if(!isSafeString(inventory[i].name)) {
                nameArr[i] = "***";
            }
            else {
                nameArr[i] = inventory[i].name;
            }
            
            priceArr[i] = inventory[i].fullPrice;
            skuHashesArr[i]= inventory[i].skuHash;
          }
        
         skus =  skuArr;
         names = nameArr;
         prices = priceArr;
         skuHashes = skuHashesArr;
    }  

    /// @notice Determine if the text is safe for use
    /// @dev Each character is individually checked 
    /// @param str The string to interrogate
    /// @return Boolean indicating if the text contains unexpected characters
    function isSafeString(string memory str) private pure returns (bool) {
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

    /// @notice returns the product array
    /// @dev replaces name with *** if found to not matched expected char values
    /// @return Product - a product object 
    function getProductByHash(bytes32 skuHash) public view returns (Product memory) {
        Product memory storedProduct = inventory[inventoryArrayIndex[skuHash]];

        if(!isSafeString(storedProduct.name))
        {
            storedProduct.name = "***";
        }

          if(!isSafeString(storedProduct.sku))
        {
            storedProduct.sku = "***";
        }

        return storedProduct;
    }
}