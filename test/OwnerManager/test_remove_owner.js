let catchRevert = require("../exceptionsHelper.js").catchRevert

const { 
  removeSecondaryOwner,
  createState,  createOwner, 
  emptyAddress, createThirdOwner,removeFirstOwner,removeThirdOwner,
  setRequiredOwners,getState,
} = require("./shared_setup.js");


const ownerManaged = artifacts.require('../OwnerManagedLite');

contract('Remove owner', (accounts) => {

  initialOwner = accounts[0]
  secondaryOwner = accounts[1];
  thirdOwner = accounts[2];

  beforeEach(async () => {
    instance = await ownerManaged.new();
    await createState(instance, initialOwner);
  })

  it('Fails when owner address is empty', async () => {
    await catchRevert(instance.removeStateOwner( emptyAddress));
  });

  it('Fails when the state does not exist', async () => {
    await catchRevert(instance.removeStateOwner( secondaryOwner));
  });

  it('Fails when the caller is not an owner', async () => {
    await catchRevert(instance.removeStateOwner( secondaryOwner,{from: secondaryOwner}));
  });

  it('Fails when the address to add is already an owner', async () => {
    await catchRevert(instance.removeStateOwner( initialOwner));
  });

  // single owner at this point
  it('Adds the owner and then removes the owner', async () => {
    
    await createOwner(instance, accounts);
    let owners = await instance.getOwners();
     
    assert.equal(owners.length, 2);
    assert.equal(owners[0].toLowerCase(), accounts[0].toLowerCase());
    assert.equal(owners[1].toLowerCase(), accounts[1].toLowerCase());

    await removeSecondaryOwner(instance, accounts);
    owners = await instance.getOwners();
     
    assert.equal(owners.length, 1);
    assert.equal(owners[0].toLowerCase(), accounts[0].toLowerCase());
  });

  it('Adds the owner and then removes the second owner', async () => {
    
    await createOwner(instance, accounts);
    await createThirdOwner(instance, accounts);
    let owners = await instance.getOwners();
     
    assert.equal(owners.length, 3);
    assert.equal(owners[0].toLowerCase(), accounts[0].toLowerCase());
    assert.equal(owners[1].toLowerCase(), accounts[1].toLowerCase());
    assert.equal(owners[2].toLowerCase(), accounts[2].toLowerCase());

    await removeSecondaryOwner(instance, accounts);
    owners = await instance.getOwners();
     
    assert.equal(owners.length, 2);
    assert.equal(owners[0].toLowerCase(), accounts[0].toLowerCase());
    assert.equal(owners[1].toLowerCase(), accounts[2].toLowerCase());
  });

  it('Adds the owner and then removes the first owner', async () => {
    
    await createOwner(instance, accounts);
    await createThirdOwner(instance, accounts);
    let owners = await instance.getOwners();
     
    assert.equal(owners.length, 3);
    assert.equal(owners[0].toLowerCase(), accounts[0].toLowerCase());
    assert.equal(owners[1].toLowerCase(), accounts[1].toLowerCase());
    assert.equal(owners[2].toLowerCase(), accounts[2].toLowerCase());

    await removeFirstOwner(instance, accounts);
    owners = await instance.getOwners();
     
    assert.equal(owners.length, 2);
    assert.equal(owners[0].toLowerCase(), accounts[1].toLowerCase());
    assert.equal(owners[1].toLowerCase(), accounts[2].toLowerCase());
  });

  it('Adds the owner and then removes the third owner', async () => {
    
    await createOwner(instance, accounts);
    await createThirdOwner(instance, accounts);
    let owners = await instance.getOwners();
     
    assert.equal(owners.length, 3);
    assert.equal(owners[0].toLowerCase(), accounts[0].toLowerCase());
    assert.equal(owners[1].toLowerCase(), accounts[1].toLowerCase());
    assert.equal(owners[2].toLowerCase(), accounts[2].toLowerCase());

    await removeThirdOwner(instance, accounts);
    owners = await instance.getOwners();
     
    assert.equal(owners.length, 2);
    assert.equal(owners[0].toLowerCase(), accounts[0].toLowerCase());
    assert.equal(owners[1].toLowerCase(), accounts[1].toLowerCase());
  });

  // Single owner removing a second should automatically succeed as the required owners is 1
  it('Removes the owner and emits event', async () => {
     await createOwner(instance, accounts);

    const ownerRemoveTx = await removeSecondaryOwner(instance, accounts);
    if (ownerRemoveTx.logs[0].event == "OwnerRemoved") {
       eventEmitted = true
    }
    
    assert.equal(eventEmitted, true,"OwnerRemoved event was not emitted");
  });

  it('Fails when there is only one owner and they try to remove themselves', async () => {
    await catchRevert(instance.addStateOwner( accounts[0]));
  });

  it('Creates change when more than one owner required', async () => {

    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two owners required at this point - first call puts it into an existing state
    await removeSecondaryOwner(instance, accounts);

    let retrievedState = await getState(instance);

    const change = retrievedState.change;
    assert.equal(change.changeType, 2);
    assert.equal(change.ownerToAdd, emptyAddress);
    assert.equal(change.ownerToRemove, accounts[1]);
    assert.equal(change.ownersAcceptedStateChange.length, 1);
    assert.equal(change.ownersRequired, 2);
    var timeHasBeenSet = change.abortAllowedAt > 0;

    assert.isTrue(timeHasBeenSet);
  });

  it('Fails when there is a blocking transaction', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two owners required at this point - first call puts it into an existing state
    await removeSecondaryOwner(instance, accounts);

    await catchRevert(removeSecondaryOwner(instance, accounts));
  });

  it('Emits ChangeStarted when waiting for removal acceptance', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    const removeTx = await removeSecondaryOwner(instance, accounts);

    if (removeTx.logs[0].event == "ChangeStarted") {
      eventEmitted = true
    }

    assert.equal(eventEmitted, true,"ChangeStarted event was not emitted");
  });
});