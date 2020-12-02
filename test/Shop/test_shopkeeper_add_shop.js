const{
  catchRevert
} = require("../exceptionsHelper.js");

const ShopKeeper = artifacts.require('../ShopKeeper');

contract('Add shop', (accounts) => {

  beforeEach(async () => {
    instance = await ShopKeeper.new();
    await instance.addDefaultState();
  })

  it('Can set shopkeeper as inactive', async () => {
    let tx = await instance.deactivateState();
    let state = await instance.state();
    assert.isFalse(state.isActive ,"The shopkeeper should be active");
  });

  it('Can set shopkeeper as active', async () => {

    let tx = await instance.deactivateState();

    tx = await instance.activateState();
    
    let state = await instance.state();
    assert.isTrue(state.isActive ,"The shopkeeper should be active");
  });

  it('Cannot set shop as active', async () => {
    await catchRevert(instance.deactivateState({from:accounts[1]}));

    let state = await instance.state();
    assert.isTrue(state.isActive ,"The shopkeeper should be active");
  });
});