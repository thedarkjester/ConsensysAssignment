const{
  catchRevert
} = require("../exceptionsHelper.js");

const Shop = artifacts.require('../Shop');

contract('Add shop', (accounts) => {

  beforeEach(async () => {
    instance = await Shop.new(accounts[0]);
  })

  it('Can set shop as inactive', async () => {

    let tx = await instance.activateState();
    let state = await instance.state();
    
    assert.isTrue(state.isActive ,"The shop should be active");
  });

  it('Cannot set shop as active', async () => {
    await catchRevert(instance.activateState({from:accounts[1]}));

    let state = await instance.state();
    assert.isFalse(state.isActive ,"The shop should be active");
  });
});