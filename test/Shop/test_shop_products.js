const{
  catchRevert
} = require("../exceptionsHelper.js");

const emptyAddress = "0x0000000000000000000000000000000000000000";

const Shop = artifacts.require('../Shop');

contract('Managing products', (accounts) => {

  beforeEach(async () => {
    instance = await Shop.new(accounts[0]);
  })

  it('Cannot add product when not owner', async () => {
    await catchRevert( instance.addProduct( 100000, 0, "product1","my product1",{from:accounts[5]}));
  });

  it('Can add product when stocks are 0 ', async () => {
    await instance.addProduct( 100000, 0, "product1", "my product1");
    let products = await instance.getProducts();
    let product = await instance.getProductByHash(products.skuHashes[0]);
    assert.equal(products.skuHashes[0], product.skuHash);
  });

  it('Can set all fields on add', async () => {
    await instance.addProduct( 100000, 1, "product1","my product1");
    let products = await instance.getProducts();
    let product = await instance.getProductByHash(products.skuHashes[0]);
  
    assert.equal(100000, product.fullPrice);
    assert.equal(1, product.stockQuantity);
    assert.equal("product1", product.sku);
    assert.equal("my product1", product.name);
  });

  it('Cannot add product when price is 0 ', async () => {
    await catchRevert(instance.addProduct( 0, 1 ,"product1","my product1"));
  });

  it('Cannot add product when sku is empty', async () => {
    await catchRevert(instance.addProduct( 100000,  0 ,"","my product1"));
  });

  it('Cannot add product when name is empty', async () => {
    await catchRevert(instance.addProduct( 100000, 0 ,"product1",""));
  });

  it('Cannot add product when sku exists', async () => {
    await instance.addProduct( 100000, 0, "product1","my product1");
    await instance.addProduct( 100000, 0, "product2","my product2");
    await catchRevert(instance.addProduct( 100000, 0,  "product1","my product1"));
  });

  it('Can add multiple products', async () => {
    await instance.addProduct( 100000,1,"product1","my product1");
    await instance.addProduct( 100000,1,"product2","my product2");
    await instance.addProduct( 100000,1,"product3","my product3");
    await instance.addProduct( 100000,1,"product4","my product4");
    await instance.addProduct( 100000,1,"product5","my product5");

    let products = await instance.getProducts();
    let product = await instance.getProductByHash(products.skuHashes[0]);
    assert.equal(products.skuHashes[0], product.skuHash);

    product = await instance.getProductByHash(products.skuHashes[4]);
    assert.equal(products.skuHashes[4], product.skuHash);
  });

  it('Can add only add 50 products', async () => {

    for(i =1;i< 51 ;i++){
      await instance.addProduct( 100000,1,"product"+ i,"my product"+ i);
    }

    await catchRevert(instance.addProduct( 100000,1,"product51","my product51"));
  });

  it('returns *** on product list when unsupported data found', async () => {
    await instance.addProduct( 100000,1,"<script>alert('evil here');</script>","<script src='bitlytoevil.js'/>");

    let products = await instance.getProducts();
    assert.equal("***",products.skus[0]);
    assert.equal("***",products.names[0]);
  });

  it('returns *** on product when unsupported data found', async () => {
    await instance.addProduct( 100000,1,"<script>alert('evil here');</script>","<script src='bitlytoevil.js'/>");

    let products = await instance.getProducts();
    let product = await instance.getProductByHash(products.skuHashes[0]);
    assert.equal("***",product.sku);
    assert.equal("***",product.name);
  });

  it('Can set all fields on update product', async () => {
    await instance.addProduct( 100000, 1, "product1","my product1");
    
    let products = await instance.getProducts();
    let productHash = products.skuHashes[0];

    await instance.updateProduct( 5555, 2, productHash, "my product2");

    let product = await instance.getProductByHash(productHash);
  
    assert.equal(5555, product.fullPrice);
    assert.equal(2, product.stockQuantity);
    assert.equal("my product2", product.name);
  });

  it('fails update when the hash does not exist', async () => {
    await instance.addProduct( 100000, 1, "product1","my product1");
    
    await catchRevert(instance.updateProduct( 5555, 2, "0xaf5561ddc3bc474a2302c121e63725fd1157a11981449369234b04406d12f667", "my product2"));
  });

  it('fails update when the price is 0', async () => {
    await instance.addProduct( 100000, 1, "product1","my product1");
    
    let products = await instance.getProducts();
    let productHash = products.skuHashes[0];

    await catchRevert(instance.updateProduct( 0, 2, productHash, "my product2"));
  });

  it('fails update when the name is blank', async () => {
    await instance.addProduct( 100000, 1, "product1","my product1");
    
    let products = await instance.getProducts();
    let productHash = products.skuHashes[0];

    await catchRevert(instance.updateProduct( 100000, 2, productHash, ""));
  });
});