let catchRevert = require("../exceptionsHelper.js").catchRevert

const { 
  createState,  createOwner,
  emptyAddress, createThirdOwner,  setRequiredOwners,
  getState
} = require("./shared_setup.js");

const ownerManaged = artifacts.require('../OwnerManagedLite');

contract('Add owner', (accounts) => {

  initialOwner = accounts[0]
  secondaryOwner = accounts[1];
  thirdOwner = accounts[2];

  beforeEach(async () => {
    instance = await ownerManaged.new();
    await createState(instance,initialOwner);
  })

  it('Fails when owner address is empty', async () => {
    await catchRevert(instance.addStateOwner(emptyAddress));
  });

  it('Fails when the caller is not an owner', async () => {
    await catchRevert(instance.addStateOwner(secondaryOwner,{from: secondaryOwner}));
  });

  it('Fails when the address to add is already an owner', async () => {
    await catchRevert(instance.addStateOwner(initialOwner));
  });

  it('Adds the owner and is retrievable', async () => {
    
    await createOwner(instance, accounts);
    let owners = await instance.getOwners();
     
    assert.equal(owners.length, 2);
    assert.equal(owners[0].toLowerCase(), accounts[0].toLowerCase());
    assert.equal(owners[1].toLowerCase(), accounts[1].toLowerCase());
  });

  // Single owner adding a second should automatically succeed as the required owners is 1
  it('Adds the owner and emits event', async () => {
    const ownerAddTx = await createOwner(instance, accounts);

    if (ownerAddTx.logs[0].event == "OwnerAdded") {
       eventEmitted = true
    }
    
    assert.equal(eventEmitted, true,"OwnerAdded event was not emitted");
  });

  it('Creates change when more than one owner required', async () => {

    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two owners required at this point - first call puts it into an existing state
    await createThirdOwner(instance, accounts);

    let retrievedState = await getState(instance);

    const change = retrievedState.change;
    assert.equal(change.changeType, 1);
    assert.equal(change.ownerToAdd, accounts[2]);
    assert.equal(change.ownerToRemove,emptyAddress);
    assert.equal(change.ownersAcceptedStateChange.length, 1);
    assert.equal(change.ownersRequired, 2);
    var timeHasBeenSet = change.abortAllowedAt > 0;

    assert.isTrue(timeHasBeenSet);
  });

  it('Fails when there is a blocking transaction', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two owners required at this point - first call puts it into an existing state
    await createThirdOwner(instance, accounts);

    await catchRevert(createThirdOwner(instance, accounts));
  });

  it('Emits ChangeStarted when waiting for addition acceptance', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    const addTx = await createThirdOwner(instance, accounts);

    if (addTx.logs[0].event == "ChangeStarted") {
      eventEmitted = true
    }

    assert.equal(eventEmitted, true,"ChangeStarted event was not emitted");
  });
});