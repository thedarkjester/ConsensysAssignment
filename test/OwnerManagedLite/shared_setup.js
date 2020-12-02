module.exports = {
    createState : async function(contractInstance, ownerAddress) {
        return await contractInstance.AddState(
            ownerAddress,
            true);
    },
    createOwner : async function(contractInstance, accounts) {
        return await contractInstance.addStateOwner(
            accounts[1]);
    },
    createThirdOwner : async function(contractInstance, accounts) {
        return await contractInstance.addStateOwner(
            accounts[2]);
    },
    removeSecondaryOwner : async function(contractInstance, accounts) {
        return await contractInstance.removeStateOwner(
            accounts[1]);
    },
    removeFirstOwner : async function(contractInstance, accounts) {
        return await contractInstance.removeStateOwner(
            accounts[0]);
    },
    removeThirdOwner : async function(contractInstance, accounts) {
        return await contractInstance.removeStateOwner(
            accounts[2]);
    },
    getState : async function(contractInstance) {
        return await contractInstance.state();
    },
    setRequiredOwners : async function(contractInstance,amount) {
        return contractInstance.setRequiredOwnersAmount( amount);
    },
    agreeToStateChange : async function(contractInstance, accountParam) {
        return contractInstance.agreeToStateChange(accountParam);
    },
    activateState : async function(contractInstance, accountParam) {
        return contractInstance.activateState( accountParam);
    },
    deactivateState : async function(contractInstance, accountParam) {
        return contractInstance.deactivateState( accountParam);
    },
    //getCurrentTime and used under"CC-BY-SA 4.0" license
    //https://kauri.io/truffle-testing-your-smart-contract/f95f956261494090be1aaa8227464773/a
    getCurrentTime : async function() {
        return new Promise(function(resolve) { web3.eth.getBlock("latest").then(function(block) { resolve(block.timestamp) }); }) 
    },
    increaseTimeInSeconds : function increaseTimeInSeconds(increaseInSeconds) {
        return new Promise(function(resolve) {
            web3.currentProvider.send({
                jsonrpc: "2.0",
                method: "evm_increaseTime",
                params: [increaseInSeconds],
                id: new Date().getTime()
            }, resolve);
        });
    },
    dayInSeconds : 86400,
    emptyAddress : '0x0000000000000000000000000000000000000000'
}