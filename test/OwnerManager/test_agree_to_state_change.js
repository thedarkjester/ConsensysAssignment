const { 
  removeSecondaryOwner,
  createState,  createOwner,
  emptyAddress, 
  createThirdOwner,  setRequiredOwners,
  getState,  agreeToStateChange,
  deactivateState,  activateState
} = require("./shared_setup.js");

let catchRevert = require("../exceptionsHelper.js").catchRevert;

const ownerManaged = artifacts.require('../OwnerManagedLite');

contract('Agree to state change', (accounts) => {

  initialOwner = accounts[0]
  secondaryOwner = accounts[1];
  thirdOwner = accounts[2];

  beforeEach(async () => {
    instance = await ownerManaged.new();
    await createState(instance, initialOwner);
  })

  it('Fails when the state does not exist', async () => {
    await catchRevert(instance.agreeToStateChange());
  });

  it('Fails when the caller is not an owner', async () => {
    await catchRevert(agreeToStateChange(instance, {from: secondaryOwner}));
  });

  it('Fails when there is no change in progress', async () => {
    await catchRevert(agreeToStateChange(instance, {from: accounts[0]}));
  });
  
  it('Fails when the current owner has already accepted', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two owners required at this point - first call puts it into an existing state
    await createThirdOwner(instance, accounts);

    await catchRevert(agreeToStateChange(instance, {from : accounts[0]}));
  });

  it('Adds owner and owner is in the list of owners', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two owners required at this point - first call puts it into an existing state
    await createThirdOwner(instance, accounts);

    await agreeToStateChange(instance, {from : accounts[1]});

    let owners = await instance.getOwners();
     
    assert.equal(owners.length, 3);
    assert.equal(owners[0].toLowerCase(), accounts[0].toLowerCase());
    assert.equal(owners[1].toLowerCase(), accounts[1].toLowerCase());
    assert.equal(owners[2].toLowerCase(), accounts[2].toLowerCase());
  });

  it('Adds the owner and emits event', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two owners required at this point - first call puts it into an existing state
    await createThirdOwner(instance, accounts);

    const agreeTx = await agreeToStateChange(instance, {from : accounts[1]});
    
    if (agreeTx.logs[0].event == "OwnerAdded" && agreeTx.logs[1].event == "ChangeCompleted" ) 
    {
       eventsEmitted = true
    }

    assert.equal(eventsEmitted, true,"OwnerAdded event was not emitted");
  });

  it('Adds the owner and change state is cleared', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two owners required at this point - first call puts it into an existing state
    await createThirdOwner(instance, accounts);

    await agreeToStateChange(instance, {from : accounts[1]});

    let retrievedState = await getState(instance);

    assertChangeIsDefault(retrievedState, 2);
  });

  it('Removes owner and owner is not in the list of owners', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two owners required at this point - first call puts it into an existing state
    await removeSecondaryOwner(instance, accounts);

    await agreeToStateChange(instance, {from : accounts[1]});

    let owners = await instance.getOwners();
     
    assert.equal(owners.length, 1);
    assert.equal(owners[0].toLowerCase(), accounts[0].toLowerCase());
  });

  it('Removes the owner and emits event', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two owners required at this point - first call puts it into an existing state
    await removeSecondaryOwner(instance, accounts);

    const agreeTx = await agreeToStateChange(instance, {from : accounts[1]});

    if (agreeTx.logs[0].event == "OwnerRemoved") {
       eventEmitted = true
    }
    
    assert.equal(eventEmitted, true,"OwnerRemoved event was not emitted");
  });

  it('Removes the owner and change state is cleared, adjusting required owner count', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two owners required at this point - first call puts it into an existing state
    await removeSecondaryOwner(instance, accounts);

    await agreeToStateChange(instance, {from : accounts[1]});

    let retrievedState = await getState(instance);

    // this is an auto-decrement if there won't be enough owners feature to not lock the state
    assert.equal(retrievedState.ownersRequired, 1);

    assertChangeIsDefault(retrievedState, 1);
  });

  it('Set required amount of owners', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two owners required at this point - first call puts it into an existing state
    await setRequiredOwners(instance, 1);

    await agreeToStateChange(instance, {from : accounts[1]});

    let retrievedState = await getState(instance);
     
    assert.equal(retrievedState.ownersRequired, 1);
  });

  it('Sets required amount of owners and emits event', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two owners required at this point - first call puts it into an existing state
    await setRequiredOwners(instance, 1);

    const agreeTx = await agreeToStateChange(instance, {from : accounts[1]});

    if (agreeTx.logs[0].event == "OwnersRequiredChanged") {
       eventEmitted = true
    }
    
    assert.equal(eventEmitted, true,"OwnersRequiredChanged event was not emitted");
  });

  it('Sets required amount of owners and change state is cleared', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two owners required at this point - first call puts it into an existing state
    await setRequiredOwners(instance, 1);

    await agreeToStateChange(instance, {from : accounts[1]});

    let retrievedState = await getState(instance);
    assertChangeIsDefault(retrievedState, 1);
  });

  it('Deactivates State', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two at this point - first call puts it into an existing state
    await deactivateState(instance, {from:accounts[0]});
    await agreeToStateChange(instance, {from : accounts[1]});

    let retrievedState = await getState(instance);
     
    assert.isFalse(retrievedState.isActive, "State should be inactive");
  });

  it('Deactivates State and emits event', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two at this point - first call puts it into an existing state
    await deactivateState(instance, {from:accounts[0]});
    const agreeTx = await agreeToStateChange(instance, {from : accounts[1]});

    if (agreeTx.logs[0].event == "LogDeactivated") {
       eventEmitted = true
    }

    assert.isTrue(eventEmitted, "LogDeactivated was not emitted");
  });

  it('Deactivates State and change is default', async () => {
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two at this point - first call puts it into an existing state
    await deactivateState(instance, {from:accounts[0]});
    await agreeToStateChange(instance, {from : accounts[1]});

    let retrievedState =  await getState(instance);
    assertChangeIsDefault(retrievedState, 2);
  });

  it('Activates State', async () => {
    await deactivateState(instance, {from:accounts[0]});
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two at this point - first call puts it into an existing state
    await activateState(instance, {from:accounts[0]});
    await agreeToStateChange(instance, {from : accounts[1]});

    let retrievedState = await getState(instance);
    
    assert.isTrue(retrievedState.isActive, "State should be inactive");
  });

  it('Can retrieve state change', async () => {
    await deactivateState(instance, {from:accounts[0]});
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    let retrievedState = await getState(instance);
    let change = await instance.getChange();
    
    assert.equal(retrievedState.change.ChangeType ,change.ChangeType ,"Change ChangeType does not match");
    assert.equal(retrievedState.change.abortAllowedAt ,change.abortAllowedAt ,"Change abortAllowedAt does not match");
    assert.equal(retrievedState.change.ownersRequired ,change.ownersRequired ,"Change ownersRequired does not match");
    assert.equal(retrievedState.change.ownersAcceptedStateChange.length ,change.ownersAcceptedStateChange.length ,"Change ownersAcceptedStateChange count does not match");
    for(i = 0;i<retrievedState.change.ownersAcceptedStateChange.length;i++) {
        assert.equal(retrievedState.change.ownersAcceptedStateChange[i].toLowerCase() ,change.ownersAcceptedStateChange[i].toLowerCase() ,"Change owner does not match");
    }
    assert.equal(retrievedState.change.ownerToAdd ,change.ownerToAdd ,"Change ownerToAdd does not match");
    assert.equal(retrievedState.change.ownerToRemove ,change.ownerToRemove ,"Change ownerToRemove does not match");
  });


  it('Activates State and emits event', async () => {
    await deactivateState(instance, {from:accounts[0]});
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two at this point - first call puts it into an existing state
    await activateState(instance, {from:accounts[0]});
    const agreeTx = await agreeToStateChange(instance, {from : accounts[1]});

    if (agreeTx.logs[0].event == "LogActivated") {
       eventEmitted = true
    }

    assert.isTrue(eventEmitted, "LogActivated was not emitted");
  });

  it('Activates State and change is default', async () => {
    await deactivateState(instance, {from:accounts[0]});
    await createOwner(instance, accounts);
    await setRequiredOwners(instance, 2);

    // we should have two at this point - first call puts it into an existing state
    await activateState(instance, {from:accounts[0]});
    await agreeToStateChange(instance, {from : accounts[1]});

    let retrievedState =  await getState(instance);
    assertChangeIsDefault(retrievedState, 2);
  });

  it('It does not change state or change when not enough owners required', async () => {
    await createOwner(instance, accounts);
    await createThirdOwner(instance, accounts);
    await setRequiredOwners(instance, 3);

    // we should have two owners required at this point - first call puts it into an existing state
    await setRequiredOwners(instance, 1);

    await agreeToStateChange(instance, {from : accounts[1]});

    let retrievedState =  await getState(instance);
    assert.equal(retrievedState.ownersRequired, 3);

    let change = retrievedState.change;
    assert.equal(change.changeType, 5);
    assert.equal(change.ownersAcceptedStateChange.length, 2);
    assert.equal(change.ownersRequired, 1);
  });

  it('Only change agreed emitted when not enough owners required', async () => {
    await createOwner(instance, accounts);
    await createThirdOwner(instance, accounts);
    await setRequiredOwners(instance, 3);

    // we should have two owners required at this point - first call puts it into an existing state
    await setRequiredOwners(instance, 1);

    const agreeTx = await agreeToStateChange(instance, {from : accounts[1]});

    if (agreeTx.logs[0].event == "ChangeAgreed") {
       eventEmitted = true
    }

    assert.isTrue(eventEmitted, "ChangeAgreed was not emitted");
  });

  function assertChangeIsDefault(retrievedState, ownerCount) {
    const change = retrievedState.change;
    assert.equal(change.changeType, 0);
    assert.equal(change.ownerToAdd, emptyAddress);
    assert.equal(change.ownerToRemove,emptyAddress);
    assert.equal(change.ownersAcceptedStateChange.length, 0);
    assert.equal(change.ownersRequired, ownerCount); 
  }
});