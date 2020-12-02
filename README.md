# ShopKeeper - a free market place where you can buidl yourself a shop

## What is it about
The ShopKeeper is a project to demonstrate learnings in the Consensys Academy Blockchain Developer bootcamp.

It serves to show, creation, compilation, testing and interface interaction with the Ethereum network via wallets such as MetaMask.

Technologies used include:

1. Truffle for testing, compilation and migration
2. Additional plugins for gas consumption and code coverage have been added.


### Site functionality

The premise of the dApp is to allow people to add their own shop in order to sell products. Limitations at this
point are that it is very text based with little interaction with visual elements such as images. 

Shop owners will be given a multi-sig wallet (ManagedOwnerLite) `there was a more complex version which if required I can show - it was to give function level access vs. entire contract/state access` that will allow them to add/remove owners, withdraw funds, allocate funds to owners sent to the contract via a fallback or direct receive as well as activate or deactivate the shop while they add products/complete logistics etc.

There is no integration with emailing or delivery etc. at present.

The owner of the site (`ShopKeeper admin`) will be able to activate/deactivate the site. At present each "Shop" is 
owned and controlled in its own contract instance. The ShopFactory of ShopKeeper creates that instance. The idea is
that should a Shop owner wish to host/move their contract elsewhere for other integration they should be able to. Currently however (due to my limited time I haven't made the shop UI available independently)

Some important things to note. While the site/shop itself has some text input validation, if you find some text
is showing up as "* * *" ( or not at all ) it is due to invalid unsupported characters being validated by the contracts to prevent site viewers indirectly being attacked with a Drive by Injection Attack. A write up and sample solution (logic is  also implemented in this project) can be seen at my other repository. [Dom XSS Attack via smart contract](https://github.com/thedarkjester/SolidityAttackVector/blob/main/YetAnotherAttackVector.md "Yet another attack vector")

Anyone can register a shop and manage their products.


## Directory structure

The folders are as follows:

1. build - generally not committed but when compile is run, is the json contract code (ABI etc.)
2. configs - this is where the site configuration is for the `lite-server` web server hosting the html and javascript
3. coverage - not committed, but when `truffle run coverage`is run outputs the reports there
4. docs - additional readme documents ( [Design pattern decisions](./docs/design_pattern_decisions.md "Design pattern decisions") ,  [Avoiding common attacks](./docs/avoiding_common_attacks.md "Avoiding common attacks") and [Deployed addresses](./docs/deployed_addresses.txt "deployed_addresses.txt") ) 
5. migrations - Truffle instructions on how to deploy the contracts
6. node_modules - not committed - created when `npm install`is run downloading components
7. src - all the source code for the UI 
	1. css - styling for the site
	2. js - all the javascript libraries (some not in modules)
	3. index.html file for the main page
8. test - all the javascript - mocha/chai tests for the contracts
	1. Library - an example safe text library (coded manually in the contracts for ease of use and cost saving)
	2. OwnerManagedLite - all the multi-sig tests for ownership, activation and financial actions
	3. Shop - all the tests for the shop creation, product management and purchasing 
	4. Note: the OwnerManagedLite is inherited by the Shop for ownership outside of the main contract
9. gasCosts - In there, there is a gasReporterOutput.html file that is generated when running tests - this will be used in future learnings to optimise gas usage


## Prerequisites knowledge and components required
1. Ubuntu Virtual machine
2. Node JS is installed - (everything was tested under `version 12.18.3`)
3. Git ( it is assumed you know how to use Git and have relevant HTTPS/SSH capability to clone)
4. A Browser with the MetaMask extension installed (and knowledge on how to use it)
5. Test Ether on the Rinkeby/Goerli network

## Download, install and build steps
### Downloading
1. Open a terminal window
2. Clone and pull down this repository into a branch via git - `git clone branch`
3. Go to the directory you cloned into - cd ShopKeeper

### Building the solution for the first time

1. In the terminal window type in the command `npm install`
2. This should install a fair amount of components
3. Type in ``npm audit fix` to fix known vulnerabilities in packages

### Confirm major required components are installed

1. Type in the terminal windows `ganache-cli --version. 
	1. This should produce a response like `Ganache CLI v6.10.2 (ganache-core: 2.11.3)`
2. In the `node_modules` folder there should be the following
	1. @openzeppelin
	2. @truffle
	3. @trufflesuite
	4. web3 (and many others with `web-3` prefix)
	5. eth-gas-reporter (for gas tweaking)
	6. solidity-coverage (for checking code coverage)
	
If some of these components are not installed you may need to run:

1. `npm install @openzeppelin/contracts`
2. `npm install @openzeppelin/truffle-upgrades`
3. `npm install truffle`
4. `npm install @truffle/hdwallet-provider`
5. `npm install solidity-coverage`
6. `npm install ganache-cli`
7. `npm install web3`

### Running the solution

1. In the main folder of the project run the following command `npm run dev`
2. This should open a browser with the main site hosted on the `lite-server` package
	1. Note: you should not have something else bound to port 8000
3. The site is pre-configured to use the Rinkeby deployed address (`/src/js/app.js`) as the current network specified in MetaMask.
	1. You may see an error message indicating an incorrect network - swap the network in MetaMask to Rinkeby
	2. Swapping networks should change the network and refresh the dApp to the correct network
4. Note: if there is no injected web3 it will fallback to the Rinkeby infura http address



### Testing the solution

1. Open 2 terminal windows
2. In the first one run the following command `ganache-cli -l 10000000` - this sets a similar block gas limit to the mainnet
3. In the second terminal run truffle `compile --all` and wait for compilation to complete
4. In the second terminal window run `truffle test --network development` to run against your ganache-cli instance in terminal 1
5. You will note the gas used per test - this includes a new instance of each of the contracts plus the command call
6. There are currently 125 tests that cover all aspects of the code including some particular edge cases and attacks. I prefer to test everything I possibly can.

### Viewing code coverage

1. Open a terminal window
2. In the terminal window run `truffle run coverage` - this will spin up an instance of the ganache-cli itself and run the tests
3. You will notice an output at the bottom of the terminal window when complete
4. A more comprehensive view is visible in the coverage folder - navigate there and view the index.html file in a browser for a better view

### Deploying and running against a local instance

1. Open 2 terminal windows
2. In the first one run the following command `ganache-cli -l 10000000` - this sets a similar block gas limit to the mainnet ( take note/copy of the mnemonic in the output window to import into metamask )
3. In the second terminal run truffle `compile --all` and wait for compilation to complete
4. In the second terminal window run `truffle migrate --network development --reset` to deploy the contracts locally 
5. Take note of of the Contract address for `ShopKeeper` in the output, copy it and replace the `shopKeeperAddress` near the top of the `/src/js/app.js` file
6. Comment line one and uncomment line 2 for the network fallback
7. Similar to `Running the solution` section - in a terminal window run `npm run dev`
8. Lock MetaMask if already open
	1. Import account using mnemonic copied in point 2
	2. Create a custom network (if not already there) pointing to `http://127.0.0.1:8545`
	3. Switch to this network
	4. This should change the network and refresh the dApp to the correct network
	5. Make sure to connect your first account to the dApp
	6. Create a second account in MetaMask (don't use a new seed phrase)
	7. Switch between accounts and note the change at the top of the page in the dApp
	8. See the demo video for some use cases
	9. Play around, have fun. My UI skills are average, so there may need to be an occasional refresh
	

Thanks for reading - and remember - if you don't hold the keys, it isn't yours!
