const{
  catchRevert
} = require("../exceptionsHelper.js");

const emptyAddress = "0x0000000000000000000000000000000000000000";

const ShopFactory = artifacts.require('../ShopFactory');

contract('Managing a shop', (accounts) => {

  beforeEach(async () => {
    instance = await ShopFactory.new();
  })

  it('Cannot add a shop with empty string', async () => {
    await catchRevert(instance.AddShopInstance(""));
  });

  it('Can add a shop', async () => {
    await instance.AddShopInstance("ShopKeeper");

    let existingShop = await instance.getShopLookupByName("ShopKeeper");

    assert.notEqual(emptyAddress, existingShop);
  });

  it('Can add a shop to collection', async () => {
    await instance.AddShopInstance("ShopKeeper");

    let existingShop = await instance.getShopAddressByHash("0xaf5561ddc3bc474a2302c121e63725fd1157a11981449369234b04406d12f667");
    assert.notEqual(emptyAddress,existingShop);
  });

  it('Can only add 50 shops to the collection', async () => {
    
    for(i =1 ;i < 51 ;i++){
      await instance.AddShopInstance("ShopKeeper" + i);
    }
    
    await catchRevert( instance.AddShopInstance("ShopKeeper51"));
  });

  it('Can retrieve shop by hash', async () => {
    await instance.AddShopInstance("ShopKeeper");
    await instance.AddShopInstance("ShopKeeper2");

    let existingShops = await instance.getShops();
    assert.equal(2, existingShops.length);

    let existingShop = await instance.getShopLookupByName(existingShops[0]);
    assert.notEqual(emptyAddress,existingShop);

    existingShop = await instance.getShopLookupByName("ShopKeeper2");
    assert.notEqual(emptyAddress,existingShops[1]);
  });

  it('returns *** when unsupported characters are found', async () => {
    await instance.AddShopInstance("<script>alert('tring DOM XSS');</script>");

    let existingShops = await instance.getShops();
    assert.equal(1, existingShops.length);
    assert.equal("***", existingShops[0]);
  });

  it('Cannot add a shop if the name exists', async () => {
    await instance.AddShopInstance("ShopKeeper");
    await catchRevert(instance.AddShopInstance("ShopKeeper"));
  });
});