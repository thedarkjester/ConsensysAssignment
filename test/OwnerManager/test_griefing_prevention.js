let catchRevert = require("../exceptionsHelper.js").catchRevert

const { 
  createState,  createOwner,
  emptyAddress, setRequiredOwners, getState,
  increaseTimeInSeconds, dayInSeconds, deactivateState,
  activateState,createThirdOwner,removeSecondaryOwner

} = require("./shared_setup.js");

const ownerManaged = artifacts.require('../OwnerManagedLite');

contract('Change overwritten', (accounts) => {

  initialOwner = accounts[0]
  secondaryOwner = accounts[1];
  thirdOwner = accounts[2];

  beforeEach(async () => {
    instance = await ownerManaged.new();
    await createState(instance, initialOwner);
  })

  it('Resets change data to deactivateState operation data when timed out', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    await setRequiredOwners(instance, 1); // waiting for confirmation
 
    await increaseTimeInSeconds((dayInSeconds)+1); // Nobody agreed

    await deactivateState(instance, {from:accounts[0]});

    let retrievedState = await getState(instance);

    const change = retrievedState.change;
    assert.equal(change.changeType, 4);
    assert.equal(change.ownerToAdd,emptyAddress);
    assert.equal(change.ownerToRemove,emptyAddress);
    assert.equal(change.ownersAcceptedStateChange.length, 1);
    assert.equal(change.ownersRequired, 2);
    var timeHasBeenSet = change.abortAllowedAt > 0;

    assert.isTrue(timeHasBeenSet);
  });

  it('Resets change data to activateState operation data when timed out', async () => {
    await createOwner(instance, accounts);
    await deactivateState(instance, {from:accounts[0]});
    await setRequiredOwners(instance, 2);

    await setRequiredOwners(instance, 1); // waiting for confirmation
    await increaseTimeInSeconds((dayInSeconds)+1); // Nobody agreed
    await activateState(instance, {from:accounts[0]});

    let retrievedState = await getState(instance);

    const change = retrievedState.change;
    assert.equal(change.changeType, 3);
    assert.equal(change.ownerToAdd, emptyAddress);
    assert.equal(change.ownerToRemove, emptyAddress);
    assert.equal(change.ownersAcceptedStateChange.length, 1);
    assert.equal(change.ownersRequired, 2);
    var timeHasBeenSet = change.abortAllowedAt > 0;

    assert.isTrue(timeHasBeenSet);
  });

  it('Resets change data to remove owner operation data when timed out', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    await setRequiredOwners(instance, 1); // waiting for confirmation
     await increaseTimeInSeconds((dayInSeconds)+1); // Nobody agreed

    await removeSecondaryOwner(instance, accounts);

    let retrievedState = await getState(instance);

    const change = retrievedState.change;
    assert.equal(change.changeType, 2);
    assert.equal(change.ownerToAdd,emptyAddress);
    assert.equal(change.ownerToRemove, accounts[1]);
    assert.equal(change.ownersAcceptedStateChange.length, 1);
    assert.equal(change.ownersRequired, 2);
    var timeHasBeenSet = change.abortAllowedAt > 0;

    assert.isTrue(timeHasBeenSet);
  });

  it('Resets change data to add owner operation data when timed out', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    await setRequiredOwners(instance, 1); // waiting for confirmation
    await increaseTimeInSeconds((dayInSeconds)+1); // Nobody agreed
    
    await createThirdOwner(instance, accounts);
    let retrievedState = await getState(instance);

    const change = retrievedState.change;
    assert.equal(change.changeType, 1);
    assert.equal(change.ownersAcceptedStateChange.length, 1);
    assert.equal(change.ownersRequired, 2);
    assert.equal(change.ownerToAdd, accounts[2]);
    assert.equal(change.ownerToRemove,emptyAddress);
    var timeHasBeenSet = change.abortAllowedAt > 0;

    assert.isTrue(timeHasBeenSet);
  });

  it('Resets change data to owner required operation data when timed out', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    await createThirdOwner(instance, accounts); // waiting for confirmation
    await increaseTimeInSeconds((dayInSeconds)+1); // Nobody agreed
    
    await setRequiredOwners(instance, 1); 

    let retrievedState = await getState(instance);

    const change = retrievedState.change;
    assert.equal(change.changeType, 5);
    assert.equal(change.ownersAcceptedStateChange.length, 1);
    assert.equal(change.ownersRequired, 1); // we expect a change here
    assert.equal(change.ownerToAdd, emptyAddress);
    assert.equal(change.ownerToRemove,emptyAddress);
    var timeHasBeenSet = change.abortAllowedAt > 0;

    assert.isTrue(timeHasBeenSet);
  });
});