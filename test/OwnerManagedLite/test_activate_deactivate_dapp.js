let catchRevert = require("../exceptionsHelper.js").catchRevert

const { 
  createState,  createOwner,
  emptyAddress, 
  setRequiredOwners,  getState,
  deactivateState,  activateState
} = require("./shared_setup.js");

const ownerManaged = artifacts.require('../OwnerManagedLite');

contract('Activate state', (accounts) => {

  initialOwner = accounts[0]
  secondaryOwner = accounts[1];
  thirdOwner = accounts[2];

  beforeEach(async () => {
    instance = await ownerManaged.new();
    await createState(instance, initialOwner);
  })

  
  it('Fails activateState when the caller is not an owner', async () => {
    await catchRevert(instance.activateState( {from: secondaryOwner}));
  });

  it('Fails deactivateState when the caller is not an owner', async () => {
    await catchRevert(instance.deactivateState({from: secondaryOwner}));
  });

  it('Fails activateState when contract is already active', async () => {
    await catchRevert(activateState(instance, {from:accounts[0]}));
  });

  it('Deactivates the state', async () => {
    
    await deactivateState(instance, {from:accounts[0]});

    let retrievedState = await getState(instance);

    assert.isFalse(retrievedState.isActive, "state should be inactive");
  });

  it('Fails activateState when contract is already deactivated', async () => {
    await deactivateState(instance, {from:accounts[0]});
    await catchRevert(deactivateState(instance, {from:accounts[0]}));
  });

  it('Deactivates the state and LogDeactivated event is emitted', async () => {
    
    const deactivateTx = await deactivateState(instance, {from:accounts[0]});

    if (deactivateTx.logs[0].event == "LogDeactivated") {
       eventEmitted = true
    }
    
    assert.equal(eventEmitted, true,"LogDeactivated event was not emitted");
  });

  it('Deactivates and activates the state', async () => {
    await deactivateState(instance, {from:accounts[0]});
    await activateState(instance, {from:accounts[0]});

    let retrievedState = await getState(instance);

    assert.isTrue(retrievedState.isActive, "state should be active");
  });

  
  it('Deactivates and activates the state and LogActivated event is emitted', async () => {
    
    await deactivateState(instance, {from:accounts[0]});
    const activateTx =  await activateState(instance, {from:accounts[0]});

    if (activateTx.logs[0].event == "LogActivated") {
       eventEmitted = true
    }
    
    assert.equal(eventEmitted, true,"LogActivated event was not emitted");
  });

  it('Creates change when more than one owner required to deactivateState', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two at this point - first call puts it into an existing state
    await deactivateState(instance, {from:accounts[0]});
    let retrievedState = await getState(instance);

    const change = retrievedState.change;
    assert.equal(change.changeType, 4);
    assert.equal(change.ownerToAdd,emptyAddress);
    assert.equal(change.ownerToRemove,emptyAddress);
    assert.equal(change.ownersAcceptedStateChange.length, 1);
    assert.equal(change.ownersRequired,2);
    var timeHasBeenSet = change.abortAllowedAt > 0;

    assert.isTrue(timeHasBeenSet);
  });

  it('Creates change when more than one owner required to activateState', async () => {
    await createOwner(instance, accounts);
    await deactivateState(instance, {from:accounts[0]});
    await setRequiredOwners(instance, 2);

    // we should have two at this point - first call puts it into an existing state
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

  it('Fails when there is a blocking transaction on deactivate', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two at this point - first call puts it into an existing state
    await deactivateState(instance, {from:accounts[0]});

    await catchRevert(deactivateState(instance, {from:accounts[0]}));
  });

  it('Fails when there is a blocking transaction on activate', async () => {
    await deactivateState(instance, {from:accounts[0]});
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two at this point - first call puts it into an existing state
    await activateState(instance, {from:accounts[0]});

    await catchRevert(activateState(instance, {from:accounts[0]}));
  });

  it('Emits ChangeStarted when waiting for deactivate', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    const deactivateTx = await deactivateState(instance, {from:accounts[0]});
    if (deactivateTx.logs[0].event == "ChangeStarted") {
      eventEmitted = true
    }

    assert.equal(eventEmitted, true,"ChangeStarted event was not emitted");
  });

  it('Emits ChangeStarted when waiting for activate', async () => {
    await deactivateState(instance, {from:accounts[0]});
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    const activateTx = await activateState(instance, {from:accounts[0]});
    if (activateTx.logs[0].event == "ChangeStarted") {
      eventEmitted = true
    }

    assert.equal(eventEmitted, true,"ChangeStarted event was not emitted");
  });
});

