let catchRevert = require("../exceptionsHelper.js").catchRevert

const { 
  createState,  emptyAddress
} = require("./shared_setup.js");

const ownerManaged = artifacts.require('../OwnerManagedLite');

contract('Add state', (accounts) => {

  initialOwner = accounts[0]
  secondaryOwner = accounts[1];
  thirdOwner = accounts[2]

  beforeEach(async () => {
    instance = await ownerManaged.new()
  })

  it('Fails when the owner is empty', async () => {
    await catchRevert(instance.AddState(
      emptyAddress,
      true    
      ));
  });

  it('Fails when the state has already been created', async () => {

    // success
    await createState(instance, initialOwner);

    // duplicate fail
    await catchRevert(createState(instance, initialOwner));
  });

  it('Succeeds when all parameters are correct and is retrievable', async () => {
      await createState(instance, initialOwner);

      let state = await instance.state();
      let owners = await instance.getOwners();
     
      assert.equal(owners.length, 1);
      assert.equal(owners[0].toLowerCase(), accounts[0].toLowerCase());

      // initial fields
      assert.equal(state.isActive,true);

      // initial state change
      const change = state.change;
      assert.equal(change.changeType, 0);
      assert.equal(change.ownerToAdd, emptyAddress);
      assert.equal(change.ownerToRemove, emptyAddress);
      assert.equal(change.ownersAcceptedStateChange.length, 0);
      assert.equal(change.ownersRequired,1);
      assert.equal(change.abortAllowedAt,0);
  });

  it('Event is emitted', async () => {
    let eventEmitted = false;

    const stateAddTx =  await createState(instance,initialOwner);
      
      if (stateAddTx.logs[0].event == "StateAdded") {
        eventEmitted = true
    }

    assert.equal(eventEmitted, true, 'adding a state should emit a StateAdded event')
  });
});