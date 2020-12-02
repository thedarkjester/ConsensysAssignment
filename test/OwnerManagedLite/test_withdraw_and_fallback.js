let catchRevert = require("../exceptionsHelper.js").catchRevert
const { 
  createState,createOwner,createThirdOwner
} = require("./shared_setup.js");

const ownerManaged = artifacts.require('../OwnerManagedLite');

contract('Withdraw, distribution and fallback', (accounts) => {
 
  initialOwner = accounts[0]
  secondaryOwner = accounts[1];
  thirdOwner = accounts[2];

  beforeEach(async () => {
    instance = await ownerManaged.new();
    await createState(instance, initialOwner);
  })

  it('Does not fail when data is sent with the value', async () => {
    await instance.sendTransaction(instance.sendTransaction({ from: accounts[0], value: 1000000000 , data: ''}));
    var balance = await instance.getBalance();

    assert.equal(balance, 1000000000);
  });

  it('Does not fail when data is sent with the value', async () => {
     await instance.sendTransaction({ from: accounts[0], value: 1000000000 });
     var balance = await instance.getBalance();

     assert.equal(balance, 1000000000);
  });

  it('throws error when balance is not linked', async () => {
    await instance.sendTransaction({ from: accounts[0], value: 10000000 });
    
    await catchRevert(instance.withdraw());
  });

  it('emits event on fund distribution', async () => {
    await instance.sendTransaction({ from: accounts[0], value: 10000000 });
    
    var withDrawTx = await instance.distributeUnallocatedFunds();
   
    if (withDrawTx.logs[0].event == "FundsDistributed") {
      eventEmitted = true
     }

     assert.isTrue(eventEmitted,"FundsDistributed event should have been sent");
  });

  it('emits event on multi-way distribution', async () => {
    await instance.sendTransaction({ from: accounts[0], value: 10000000 });
    await createOwner(instance, accounts);
    await createThirdOwner(instance, accounts);

    var withDrawTx = await instance.distributeUnallocatedFunds();
   
    if (withDrawTx.logs[0].event == "FundsDistributed") {
      eventEmitted = true
     }

     assert.isTrue(eventEmitted,"FundsDistributed event should have been sent");
  });

  it('fails fund distribution when not an owner', async () => {
    var withDrawTx = await instance.distributeUnallocatedFunds();
  });

  it('emits event on withdraw', async () => {
    await instance.sendTransaction({ from: accounts[0], value: 10000000 });
    
    var withDrawTx = await instance.distributeUnallocatedFunds();
    var withDrawTx = await instance.withdraw();
   
    if (withDrawTx.logs[0].event == "LogDepositWithdrawn") {
       eventEmitted = true
    }

     assert.isTrue(eventEmitted,"Withdraw event should have been sent");
  });

  it('allows owner to withdraw full balance', async () => {
    await instance.sendTransaction({ from: accounts[0], value: 10000000 });
    
    await instance.distributeUnallocatedFunds();
    var withDrawTx = await instance.withdraw();
    assert.equal(withDrawTx.logs[0].args.amount, 10000000);
  });

  it('distributes evenly with distributor getting the remainder', async () => {
    await instance.sendTransaction({ from: accounts[0], value: 10000000 });
    
    await createOwner(instance, accounts);
    await createThirdOwner(instance, accounts);

    await instance.distributeUnallocatedFunds();

    var owner1Withdraw = await instance.withdraw({from: accounts[0]});  
    var owner2Withdraw = await instance.withdraw({from: accounts[1]});
    var owner3Withdraw = await instance.withdraw({from: accounts[2]});

    assert.equal(owner1Withdraw.logs[0].args.amount, 3333334 );
    assert.equal(owner2Withdraw.logs[0].args.amount, 3333333 );
    assert.equal(owner3Withdraw.logs[0].args.amount, 3333333 );
  });

  it('Fails when a non-owner tries to withdraw', async () => {
    await instance.sendTransaction({ from: accounts[0], value: 10000000 });

    await catchRevert(instance.withdraw({ from: accounts[1]}));
  });

  it('Fails when balance is withdrawn', async () => {
    await instance.sendTransaction({ from: accounts[0], value: 10000000 });
    await instance.distributeUnallocatedFunds();
    var balance = await instance.ownerBalances(accounts[0]);
    assert.equal(balance, 10000000);

    await instance.withdraw({from: accounts[0]});
    balance = await instance.ownerBalances(accounts[0]);
    assert.equal(balance, 0);

    await catchRevert(instance.withdraw({from: accounts[0]}));
  });

  it('Fails when balance is zero', async () => {
    await catchRevert(instance.withdraw({from: accounts[0]}));
  });
});