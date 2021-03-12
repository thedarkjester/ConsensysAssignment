let catchRevert = require("../exceptionsHelper.js").catchRevert

const { 
  createState,  createOwner,
  emptyAddress, 
  setRequiredOwners, getState
} = require("./shared_setup.js");

const ownerManaged = artifacts.require('../OwnerManagedLite');

contract('Required owners', (accounts) => {

  initialOwner = accounts[0]
  secondaryOwner = accounts[1];
  thirdOwner = accounts[2];

  beforeEach(async () => {
    instance = await ownerManaged.new();
    await createState(instance, initialOwner);
  })

  it('Fails when the caller is not an owner', async () => {
    await catchRevert(instance.setRequiredOwnersAmount( 2, {from: secondaryOwner}));
  });

  it('Fails when higher than number of owners', async () => {
    await catchRevert(instance.setRequiredOwnersAmount( 2));
  });

  it('Fails when required owners is zero', async () => {
    await catchRevert(instance.setRequiredOwnersAmount(0));
  });

  it('Adds the owner, changes required owners amount and is retrievable', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance,2);

    let retrievedState = await getState(instance);

    assert.equal(retrievedState.ownersRequired, 2,"ownersRequired was not the correct amount");
  });

  // Single owner adding a second should automatically succeed as the required owners is 1
  it('Adds the owner, changes required owners amount and emits event', async () => {
    await createOwner(instance, accounts);

    const setOwnersRequiredTx =  await setRequiredOwners(instance,2);

    if (setOwnersRequiredTx.logs[0].event == "OwnersRequiredChanged") {
       eventEmitted = true
    }
    
    assert.equal(eventEmitted, true,"OwnersRequiredChanged event was not emitted");
  });

  it('Creates change when more than one owner required', async () => {

    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two at this point - first call puts it into an existing state
    await setRequiredOwners(instance,1);
    let retrievedState = await getState(instance);

    const change = retrievedState.change;
    assert.equal(change.changeType, 5);
    assert.equal(change.ownerToAdd,emptyAddress);
    assert.equal(change.ownerToRemove,emptyAddress);
    assert.equal(change.ownersAcceptedStateChange.length, 1);
    assert.equal(change.ownersRequired,1);
    var timeHasBeenSet = change.abortAllowedAt > 0;

    assert.isTrue(timeHasBeenSet);
  });

  it('Fails when there is a blocking transaction', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance,2);

    // we should have two at this point - first call puts it into an existing state
    await setRequiredOwners(instance,1);
    await catchRevert(setRequiredOwners(instance, 2));
  });
});