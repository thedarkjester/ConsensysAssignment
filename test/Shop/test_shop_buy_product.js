const{
    catchRevert
  } = require("../exceptionsHelper.js");
  
const product1Hash = "0x70eb0813a2d7e8fb92c023fd9bf894812091e73f13d86ec8fba3649726507984";
const product2Hash = "0xef228e93764b515e8ac319fced7e6652064f59a0c4332d3494a163909f2ac2cc";

  const { 
    deactivateState,  activateState,
    createOwner,createThirdOwner
  } = require("../OwnerManagedLite/shared_setup.js");

  const Shop = artifacts.require('../Shop');
  
  contract('Buying from a shop', (accounts) => {
  
    beforeEach(async () => {
      instance = await Shop.new(accounts[0]);
      await activateState(instance, {from:accounts[0]});
    })

    it('Cannot buy when there are no products', async () => {
        await catchRevert( instance.buyProduct(1 ,product1Hash ,{value:100000,from:accounts[0]}));
    });

    it('Cannot buy non-existant product', async () => {
        await instance.addProduct( 100000, 1, "product1", "my product1");
        await catchRevert(instance.buyProduct( 1,'0xaf5561ddc3bc474a2302c121e63725fd1157a11981449369234b04406d12f667',{value:100000,from:accounts[0]}));
    });

    it('Cannot buy out of stock products', async () => {
        await instance.addProduct( 100000, 0, "product1", "my product1");
        await catchRevert(instance.buyProduct(1 , product1Hash,{value:100000}));
    });

    it('Cannot buy product with underpaying', async () => {
        await instance.addProduct( 100000, 1, "product1", "my product1");
        await catchRevert(instance.buyProduct(1,product1Hash,{value:99999}));
    });

    it('Cannot buy multiple product instances with underpaying', async () => {
        await instance.addProduct( 100000, 10, "product1", "my product1");
        await catchRevert(instance.buyProduct(3,product1Hash,{value:100000}));
    });

    it('Cannot buy product from inactive shop', async () => {
        await instance.addProduct( 100000, 1, "product1", "my product1");
        await deactivateState(instance, {from:accounts[0]});
        await catchRevert(instance.buyProduct(1,product1Hash,{value:99999}));
    });

    it('Can buy product from active shop', async () => {
        await instance.addProduct(100000, 1, "product1", "my product1", {from:accounts[0]});
        await instance.buyProduct(1,product1Hash,{value:100000});
    });

    it('Can buy product from active shop', async () => {
        await instance.addProduct(100000, 1, "product1", "my product1", {from:accounts[0]});
        await instance.addProduct(100000, 1, "product2", "my product2", {from:accounts[0]});
        
        await instance.buyProduct(1,product2Hash,{value:100000});
    });

    it('Can buy multiple products from active shop', async () => {
        await instance.addProduct(100000, 3, "product1", "my product1", {from:accounts[0]});
        await instance.buyProduct(3, product1Hash,{value:300000});
    });

    it('Buying products decrease stock', async () => {
        await instance.addProduct( 100000, 10, "product1", "my product1");
        await instance.buyProduct(1,product1Hash,{value:100000});
        
        var product = await instance.getProductByHash(product1Hash);

        assert.equal(9,product.stockQuantity,"Quantity was not decreased!");
    });

    it('Sale proceeds are distributed to single owner', async () => {
        await instance.addProduct(100000, 11, "product1", "my product1", {from:accounts[0]});
        await instance.buyProduct(3, product1Hash, { value:300000 });
        
        var balance = await instance.ownerBalances(accounts[0]);
        assert.equal(balance, 300000 );

        await instance.withdraw({from: accounts[0]});

        balance = await instance.ownerBalances(accounts[0]);
        assert.equal(balance, 0);
    });

    it('Sale proceeds are distributed to all owners', async () => {
        await instance.addProduct(100000, 11, "product1", "my product1", {from:accounts[0]});
        await createOwner(instance, accounts);
        await createThirdOwner(instance, accounts);

        await instance.buyProduct(3, product1Hash, { value:300000 });

        var balance = await instance.ownerBalances(accounts[0]);
        assert.equal(balance, 100000 );

        balance = await instance.ownerBalances(accounts[1]);
        assert.equal(balance, 100000 );

        var balance = await instance.ownerBalances(accounts[2]);
        assert.equal(balance, 100000 );
    });

    it('Sale proceeds are distributed to all owners with remainder to last account', async () => {
        await instance.addProduct(100000, 1, "product1", "my product1", {from:accounts[0]});
        await createOwner(instance, accounts);
        await createThirdOwner(instance, accounts);

        await instance.buyProduct(1, product1Hash, { value:100000 });

        var balance = await instance.ownerBalances(accounts[0]);
        assert.equal(balance, 33333 );

        balance = await instance.ownerBalances(accounts[1]);
        assert.equal(balance, 33333 );

        var balance = await instance.ownerBalances(accounts[2]);
        assert.equal(balance, 33334 );
    });

    it('Sale proceeds for multiple items are distributed to all owners with remainder to last account', async () => {
        await instance.addProduct(100000, 2, "product1", "my product1", {from:accounts[0]});
        await createOwner(instance, accounts);
        await createThirdOwner(instance, accounts);

        await instance.buyProduct(1, product1Hash, { value:200000 });

        var balance = await instance.ownerBalances(accounts[0]);
        assert.equal(balance, 66666 );

        balance = await instance.ownerBalances(accounts[1]);
        assert.equal(balance, 66666 );

        var balance = await instance.ownerBalances(accounts[2]);
        assert.equal(balance, 66668 );
    });
 });