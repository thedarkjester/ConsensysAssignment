const ShopKeeper = artifacts.require("ShopKeeper");
const SafeMath = artifacts.require("SafeMath");

module.exports = async function (deployer,network,accounts) {
    await deployer.deploy(SafeMath);
    await deployer.link(SafeMath, ShopKeeper);
    await deployer.deploy(ShopKeeper);

    shopKeeperInstance = await ShopKeeper.deployed();
    await shopKeeperInstance.addDefaultState({from:accounts[0]});
};
