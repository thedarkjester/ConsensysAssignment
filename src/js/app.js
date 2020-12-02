//let chainNetworkAddress = 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
//let chainNetworkAddress = 'https://goerli.infura.io/v3/d6695b90d8e34d278d34429fe07e73dd';
let chainNetworkAddress = 'http://127.0.0.1:8545';
let shopKeeperJsonFile = "ShopKeeper.json";
let shopJsonFile = "Shop.json";
let shopKeeperAddress = "0x0CA43f8E5f69dcc63229450e1F41f80237ebbFf4";

App = {
    changeTypes : ['none','Add Owner','Remove Owner','Activate','Deactivate','Owners Required To Approve Changes'],
    subscribedContractEventAddresses:[],
    web3Provider: null,
    currentShopAddress : null,
    isShopOwner : false,
    isShopKeeperOwner : false,
    shopKeeperIsActive : false,
    metaMask: {
      getProductsFromEvents: async function(events) {
        var JSONINFO = {
          "current":1,
          "rowCount": 10,
          "rows": [],
          "total" : events.length
        };
        
        var productCache = [];

          for(i=0;i<events.length;i++) {
            var price = new BigNumber(events[i].returnValues.pricePaid);
            var cost =price * new BigNumber(events[i].returnValues.quantity);
            var costString = cost/1000000000000000000;
            var priceString = price/1000000000000000000;
            
            var sku = events[i].returnValues.sku;
            var name = "";
            
            for(e=0;e<productCache.length;e++) {
                if(productCache[e].sku.toUpperCase() == sku.toUpperCase() ) {
                  name = productCache[e].name;
                  break;
                }
            }

            if(name == "") {
              var product = await App.contracts.Shop.methods.getProductByHash(sku).call();
              var newNameLookup = {
                sku : sku, name: product.name};
                name = newNameLookup.name;
                productCache.push(newNameLookup);
              }

            JSONINFO.rows.push({
              "id" : name,
              "quantity" : events[i].returnValues.quantity,
              "fullPrice" : String(priceString) + "Eth",
              "totalPrice" : String(costString) + "Eth"
            });
        }

        return JSONINFO;
      },
      loadEvents : function() {
            $('#purchaseHistoryModal').modal();
      },
      initWeb3: async function() {
      
        await App.metaMask.initEthereum();
       
        return App.metaMask.initialiseAllContracts();
       },
      initEthereum : async function() {
        if (window.ethereum) {
          App.web3Provider = window.ethereum;
          window.ethereum.autoRefreshOnNetworkChange= false;
        }
        // Legacy dapp browsers...
        else if (window.web3) {
          App.web3Provider = window.web3.currentProvider;
        }
        // If no injected web3 instance is detected, fall back to direct link
        else {
          App.web3Provider = new Web3.providers.HttpProvider(chainNetworkAddress);
        }
    
        web3 = new Web3(App.web3Provider);
    
        try {
          // Request account access
          await web3.eth.requestAccounts();
          $("#retryConnection").hide();
        } catch (error) {
          // User denied account access...
          $("#retryConnection").show();
          $("#accountSelected").text("An error occured retrieving your account");
          console.error(error)
        }
    
        $("#accountSelected").text(web3.currentProvider.selectedAddress);
        $("#accountSelected").html('<a class="text-warning" href="https://etherscan.io/address/' + web3.currentProvider.selectedAddress + '" target="_blank">' + web3.currentProvider.selectedAddress + '</a>');
    
        await web3.eth.net.getNetworkType()
        .then(function(data)
        {
          $("#currentNetwork").text(data);
          if(!window.ethereum) {
            $("#retryConnection").show();
          }
        });
      
        await App.metaMask.getBalance(web3.currentProvider.selectedAddress);
       },
      initialiseAllContracts: async function() {

        await App.contracts.initialiseShopKeeper();

        return App.bindEvents();
      },
      unlockAccounts : async function() {
        if (window.ethereum) {
            await App.metaMask.initEthereum();
        }
       },
      getBalance : async function(address) {
          try {
                await web3.eth.getBalance(address, function (error, wei) {
                if (!error) {
                    var balance = web3.utils.fromWei(wei, 'ether');
                    
                    $("#accountBalance").html(balance + " ETH");
                   
                    App.UI.setBalance(balance + " ETH", "success", "<BR><BR>Selected account has changed to " + $("#accountSelected").html());
                }
            });
        } catch (err) {
            App.UI.setBalance("n/a or err", "danger","Error occured getting balance");
          }
      },
    },
    contracts: {
      withdrawFunds : async function(contractType) {
      try{
           App.UI.startPendingTransaction("Withdrawing funds");
           if(contractType == "shop") {
              await App.contracts.Shop.methods.withdraw().send({from: web3.currentProvider.selectedAddress });  
           }
           else {
              await App.contracts.ShopKeeper.methods.withdraw().send({from: web3.currentProvider.selectedAddress });  
             }
          }
          catch(error) {
          App.UI.stopPendingTransactionWithError(error.message);
        }
      },
      distributeFunds : async function(contractType) {
        try{
             App.UI.startPendingTransaction("Distributing funds");
             if(contractType == "shop") {
                await App.contracts.Shop.methods.distributeUnallocatedFunds().send({from: web3.currentProvider.selectedAddress });  
             }
             else {
                  await App.contracts.ShopKeeper.methods.distributeUnallocatedFunds().send({from: web3.currentProvider.selectedAddress });  
               }
            }
            catch(error) {
            App.UI.stopPendingTransactionWithError(error.message);
          }
      },
      distributefunds : async function(contractType) {
          try{
              App.UI.startPendingTransaction("Distributing funds");
              if(contractType == "shop") {
                 await App.contracts.Shop.methods.distributeUnallocatedFunds().send({from: web3.currentProvider.selectedAddress });  
              }
              else {
                   await App.contracts.ShopKeeper.methods.distributeUnallocatedFunds().send({from: web3.currentProvider.selectedAddress });  
                }
             }
             catch(error) {
             App.UI.stopPendingTransactionWithError(error.message);
           }
          },
      getShopKeeperOwnerBalance : async function() {
        var ownerBalance = await App.contracts.ShopKeeper.methods.ownerBalances(web3.currentProvider.selectedAddress).call();       
        App.shopKeeperOwnerBalance = ownerBalance;
      },
      getShopOwnerBalance : async function() {
        var ownerBalance = await App.contracts.Shop.methods.ownerBalances(web3.currentProvider.selectedAddress).call();       
        App.shopOwnerBalance = ownerBalance;
      },
      addressEventsAlreadySubscribedTo : async function(address) {
          for(i=0;i<App.subscribedContractEventAddresses.length;i++) {
              if(address.toUpperCase() == App.subscribedContractEventAddresses[i].toUpperCase()) {
                return true;
              }
          }

          return false;
      },
      initialiseContract: async function(jsonFile, currentContractAddress) {

        var json = await $.getJSON(jsonFile);
        let abi = json.abi;
        const initialisedContract = new web3.eth.Contract(abi, currentContractAddress);
        
        initialisedContract.setProvider(App.web3Provider);

        return initialisedContract;
      },
      initialiseShopKeeper: async function() {
        try{
          App.contracts.ShopKeeper = await App.contracts.initialiseContract(shopKeeperJsonFile, shopKeeperAddress);
          await App.checkShopKeeperState();
          await App.checkShopState();
  
          if(!await App.contracts.addressEventsAlreadySubscribedTo(shopKeeperAddress)) {
            App.contracts.ShopKeeper.events.allEvents()
            .on('data', (event) => {
              App.checkShopKeeperState();
              App.checkShopState();
            })
            .on('error', console.error);
          }
        }
        catch(err) {
          console.log(err)
          App.UI.showLoadWarning();
        }
       
      },
      initialiseShop: async function(shopAddress) {
        App.contracts.Shop = await App.contracts.initialiseContract(shopJsonFile, shopAddress);
        await App.checkShopKeeperState();
        await App.checkShopState();
        
        if(!await App.contracts.addressEventsAlreadySubscribedTo(shopAddress)) {
          App.contracts.Shop.events.allEvents()
          .on('data', (event) => {
            App.checkShopKeeperState();
            App.checkShopState();
          })
          .on('error', console.error);

          App.subscribedContractEventAddresses.push(shopAddress);
        }
      },
      loadShopByName: async function(shopName) {

        let shopAddressAndHash = await App.contracts.ShopKeeper.methods.getShopLookupByName(shopName).call();
        App.shopOwnerBalance=0;
        App.currentShopName = shopName;
        App.currentShopAddress = shopAddressAndHash.shopAddress;
        App.currentShopHash = shopAddressAndHash.shopHash;

        await App.contracts.initialiseShop(App.currentShopAddress);

        App.UI.showShopName(shopName);
        App.UI.showShopBody();
      },
      addShop: async function(shopName) {
        try{
          App.UI.startPendingTransaction("Adding Shop");
          await App.contracts.ShopKeeper.methods.AddShopInstance(shopName).send({from: web3.currentProvider.selectedAddress });
        }
        catch(error) {
            App.UI.stopPendingTransactionWithError(error.message);
        }
      },
      CheckShopNameExists : async function (shopName) {
        let shopAddressAndHash = await App.contracts.ShopKeeper.methods.getShopLookupByName(shopName).call();
        if(shopAddressAndHash == null) {
          return false;
        }
        if(shopAddressAndHash.shopAddress == "0x0000000000000000000000000000000000000000") {
          return false;
        }
        return true;
      },
      loadShop: async function(shopIndex) {
        await App.contracts.loadShopByName(App.Shops[shopIndex]);
      },
    },
    UI : {
      loadBuyProduct: function(hash) {
        App.BuyProductHash = hash;

        $('#buyProductModalSkuHash').val(hash);
        $('#buyProductModal').modal();
      },
      loadEditProduct: function(hash) {
        App.EditedProductHash = hash;

        $('#editProductModalSkuHash').val(hash);
        $('#editProductModal').modal();
      },
      showLoadWarning: function() {
        $("#loadWarning").show();
        $("#mainNav").hide();
      },
      loadShopProducts: function(products) {

        var JSONINFO = {
          "current":1,
          "rowCount": 10,
          "rows": [],
          "total" : products.length
        };

        var buttonTemplate = "";
        
        if(App.isShopOwner) {
            buttonTemplate = "<button onclick='App.UI.loadEditProduct(\"~skuHash~\")' class='btn-primary'>Edit Product</a>";
        }
        else {
            buttonTemplate = "<button class='btn-primary' onclick='App.UI.loadBuyProduct(\"~skuHash~\")'>Buy Product</button>";
        }
        
        $.each(products.skus, function(i)
        {
           JSONINFO.rows.push({
            "id" : products.skus[i],
            "name" : products.names[i],
            "fullPrice" : window.web3.utils.fromWei(String(products.prices[i]), 'ether') + " Eth ",
            "commands" : buttonTemplate.replace("~skuHash~", products.skuHashes[i] ),
            "hash" : products.skuHashes[i],
          });
        });

        var grid = $("#products-grid").bootgrid("clear").bootgrid({
            ajax: false,
            searchSettings: {
                delay: 100,
                characters: 3
            },
            labels: {
              noResults: "There are no products in this shop."
          },
          
        });

        grid.bootgrid("append", JSONINFO.rows);

        $("#shopListDataHeader").show();
        $("#shopListData").show();

        App.UI.showShopBody();
      },
      cancelLoadPurchaseHistory: function() {
        Overlay.hide('loadingOverlay');
        $('#purchaseHistoryModal').modal('hide');
      },
      startLoadingOverlay: function(actionName) {
        Overlay.show('loadingOverlay', actionName);
      },
      stopLoadingOverlay: function() {
        Overlay.hide('loadingOverlay');
      },
      startPendingTransaction: function(actionName) {
        App.metaMask.hasPendingTransaction = true;
        Overlay.show('overlay', actionName + ' - Submit via metamask and wait for transaction to complete.');
      },
      stopPendingTransaction: function() {
        App.metaMask.hasPendingTransaction = false;
        Overlay.hide('overlay');
      },
      stopPendingTransactionWithError: function(error) {
        App.metaMask.hasPendingTransaction = false;
        Overlay.hide('overlay');
        $.toaster(error, 'Validation error', "danger");
      },
      setBalance : function(balance, level, message) {
        $("#accountBalance").html(balance);
      },
      accountChanged: async function(accounts) {
         if($("#accountSelected").html() != "n/a") {
          if(accounts.length == 0) {
            $("#retryConnection").show();
            $("#accountSelected").html("n/a");
            App.UI.setBalance("n/a", "warning", "Account no longer visible");
          }
          else {
            $("#accountSelected").html('<a class="text-warning" href="https://etherscan.io/address/' + web3.currentProvider.selectedAddress + '" target="_blank">' + web3.currentProvider.selectedAddress + '</a>');
            await App.metaMask.getBalance(accounts[0]);
            await App.checkShopKeeperState();
            await App.checkShopState();
          }
        }
      },
      setShopKeeperOptions : async function() {
          if(App.isShopKeeperOwner) {
            $("#shopKeeperOwnerWithdrawal").hide();
            $("#shopKeeperOptions").show();
          }
          else {
            $("#shopKeeperOptions").hide();
          }

          $("[shopKeeperBlockedOnPendingChange='true']").show();
          $("#shopKeeperPendingChange").hide();

          if(App.shopKeeperOwnerBalance > 0 ) {
            var ownerBalanceString = "Withdraw balance: " + String(App.shopKeeperOwnerBalance/1000000000000000000) + " Eth";
            $("#shopKeeperOwnerWithdrawal").text(ownerBalanceString);
            $("#shopKeeperOwnerWithdrawal").show();
          }

          if(new BigNumber(App.ShopKeeperUnallocatedFunds) > new BigNumber(0) ) {
            var unallocatedFunds = "Allocate unallocated funds: " + String(App.ShopKeeperUnallocatedFunds/1000000000000000000) + " Eth";
            $("#shopKeeperOwnerDistribute").text(unallocatedFunds);
            $("#shopKeeperOwnerDistribute").show();
          }
          else {
            $("#shopKeeperOwnerDistribute").hide();
          }

          if(App.shopKeeperIsActive) {
            $("#activeShopKeeperNav").hide();
            $("#deactiveShopKeeperNav").show();
            $(".shopKeeperFunction").show();
            $("#siteInactiveContent").hide();

            if(App.ShopKeeperOwnercount > 1) {
              $("#setShopKeeperOwnersRequired").show();
              $("#removeShopKeeperOwner").show();
            }
            else {
              $("#setShopKeeperOwnersRequired").hide();
              $("#removeShopKeeperOwner").hide();
            }
          }
          else {
            $("#siteInactiveContent").show();
            $("#activeShopKeeperNav").show();
            $("#deactiveShopKeeperNav").hide();
            $(".shopKeeperFunction").hide();
            $("#setShopKeeperOwnersRequired").hide();
            $("#shopKeeperPendingChange").hide();
          }

          if(App.ShopKeeperChange.changeType != 0 && Date.now() < new Date(App.ShopKeeperChange.abortAllowedAt * 1000)) {
            $("[shopKeeperBlockedOnPendingChange='true']").hide();
            $("#shopKeeperPendingChange").show();
          }
      },
      setShopOptions : async function() {
        if(App.currentShopAddress == null || !App.shopKeeperIsActive ) {
          $("#shopOptions").hide();
        }
        else {
          $("#shopOwnerWithdrawal").hide();

          if(App.isShopOwner) {
            $("#shopOptions").show();

            if(App.shopOwnerBalance > 0) {
                var ownerBalanceString = "Withdraw balance: " + String(App.shopOwnerBalance/1000000000000000000) + " Eth";
                $("#shopOwnerWithdrawal").text(ownerBalanceString);
                $("#shopOwnerWithdrawal").show();
            }

            if(new BigNumber(App.ShopUnallocatedFunds) >new BigNumber(0)) {
              var unallocatedFunds = "Allocate unallocated funds: " + String(App.ShopUnallocatedFunds/1000000000000000000) + " Eth";
              $("#shopOwnerDistribute").text(unallocatedFunds);
              $("#shopOwnerDistribute").show();
            }else {
              $("#shopOwnerDistribute").hide();
            }

            $("[shopBlockedOnPendingChange='true']").show();
            $("#shopPendingChange").hide();

            if(App.ShopOwnercount > 1) {
              $("#setShopOwnersRequired").show();
              $("#removeShopOwner").show();
            }
            else {
              $("#setShopOwnersRequired").hide();
              $("#removeShopOwner").hide();
            }

            $("#addProduct").show();

            if(App.currentShopIsActive) {
              $("#activeShopNav").hide();
              $("#deactiveShopNav").show();
            }
            else {
              $("#activeShopNav").show();
              $("#deactiveShopNav").hide();
              $("#shopPendingChange").hide();
            }

            if(App.ShopChange.changeType != 0&& Date.now() < new Date(App.ShopChange.abortAllowedAt * 1000)) {
              $("#shopPendingChange").show();
              $("[shopBlockedOnPendingChange='true']").hide();
            }
          }
          else {
            $("#shopOptions").hide();
          }
        }
      },
      setShops: async function() {
          if(App.Shops.length == 0) {
            $("#shopListData").hide();
            $("#shopListDataHeader").hide();
          }
          else {

            $("#shopListData").html("");
            $("#shopListData").append("<ul id='shopList'>");
            
            var cList = $('#shopListData')
      
            $.each(App.Shops, function(i)
              {
                 if(App.Shops[i]!="***") {
                  var li = $('<li/>')
                  .addClass('ui-menu-item')
                  .attr('role', 'menuitem')
                  .appendTo(cList);
                  var aaa = $('<a/>')
                  .addClass('ui-all')
                  .text(App.Shops[i])
                  .attr("href","javascript:App.contracts.loadShop("+i+")")
                  .appendTo(li);
                 }
              });

            $("#shopListData").show();
            $("#shopListDataHeader").show();
          }
      },
      setDefaultElements : function() {
        $("#shopData").hide();
        $("#shopListData").hide();
        $("#products-grid").hide();
        $("#inactiveShopData").hide();
        $("#shopListDataHeader").hide();
        $("#loadWarning").hide();
        $("#mainNav").show();
        
      },
      showShopBody: function() {
        if(!App.currentShopIsActive) {
          if(App.isShopOwner) {
            $("#inactiveShopData").hide();
            $("#products-grid").show();
          }
          else {
            $("#inactiveShopData").show();
            $("#products-grid").bootgrid("destroy");
            $("#products-grid").hide();
          }
        }
        else {
          $("#products-grid").show();
          $("#inactiveShopData").hide();
        }
      },
      showShopName : function(shopName) {
        
        $("#shopData").show();

        if(!App.currentShopIsActive) {
          $("#shopNameHeader").text(shopName + " [Inactive]");
        }
        else {
          $("#shopNameHeader").text(shopName);
        }

        $("#shopNameHeader").show();
      },
      deactivateSite : function() {
        $("#shopData").hide();
        $("#shopListData").hide();
        $("#shopListDataHeader").hide();
        $("#shopOptions").hide();
        $("#siteInactiveContent").show();
      },
      activateSite : function() {
        $("#siteInactiveContent").hide();
        $("#shopData").show();
        $("#shopListData").show();
        $("#shopListDataHeader").show();
        $("#shopOptions").show();
      },
      deactivateShop : function() {
        $("#products-grid").hide();
        $("#inactiveShopData").hide();
        $("#shopData").hide();
      },
      activateShop : function() {
        
      }
    },
    // contracts object - referenced by object key vs. collection iteration
    init: async function() {
      App.UI.setDefaultElements();

      return await App.metaMask.initWeb3();
    },
    bindEvents: function() {
      
      window.ethereum.on('message', async (providerMessage)=>  {
        
        if(providerMessage.data.result.event == undefined && App.metaMask.hasPendingTransaction) {
          if(App.metaMask.hasPendingTransaction){
            Overlay.show('overlay', 'Blockchain height: ' + providerMessage.data.result.number + ' - waiting for transaction confirmation.');
          }
        }
        else {
           App.UI.stopPendingTransaction();
        }
        if(providerMessage.data.result.event == "LogActivated") {
          $.toaster('<BR<BR> Activation completed', 'Metamask');
          if(providerMessage.data.result.address.toUpperCase() == shopKeeperAddress.toUpperCase()) {
            App.UI.activateSite();
            await App.checkShopKeeperState();
        }
        else {
            App.UI.activateShop();
            if(App.currentShopName != undefined) {
              await App.contracts.loadShopByName(App.currentShopName);
            }
            await App.checkShopState();
          }
        }

        if(providerMessage.data.result.event == "LogDeactivated") {
          $.toaster('<BR<BR> Deactivation completed', 'Metamask');

          if(providerMessage.data.result.address.toUpperCase() == shopKeeperAddress.toUpperCase()) {
              App.UI.deactivateSite();
              await App.checkShopKeeperState();
              await App.checkShopState();
          }
          else {
              App.UI.deactivateShop();
              if(App.currentShopName != undefined) {
                await App.contracts.loadShopByName(App.currentShopName);
              }
              await App.checkShopState();
          }
        }

        if(providerMessage.data.result.event == "ShopAdded") {
          $.toaster('<BR<BR>Shop Registration completed', 'Metamask');
        }

        if(providerMessage.data.result.event == "OwnerAdded") {
          $.toaster('<BR<BR>Owner Added', 'Metamask');
        }

        if(providerMessage.data.result.event == "OwnerRemoved") {
          $.toaster('<BR<BR>Owner Removed', 'Metamask');
        }

        if(providerMessage.data.result.event == "OwnersRequiredChanged") {
          $.toaster('<BR<BR>Owners Required Changed', 'Metamask');
        }

        if(providerMessage.data.result.event == "ChangeStarted") {
          $.toaster('<BR<BR>Change Request Started', 'Metamask');
        }

        if(providerMessage.data.result.event == "ProductAdded") {
          $.toaster('<BR<BR>Product Added', 'Metamask');
          await App.checkShopState();
        }

        if(providerMessage.data.result.event == "LogDepositWithdrawn") {
          $.toaster('<BR<BR>Balance withdrawn', 'Metamask');
          await App.checkShopState();
        }
        
        if(providerMessage.data.result.event == "ProductSold") {
          $.toaster('<BR<BR>Product purchased successfully', 'Metamask');
          await App.checkShopState();
        }

        if(providerMessage.data.result.event == "ProductUpdated") {
          $.toaster('<BR<BR>Product Updated', 'Metamask');
          App.EditedProductHash = "";
          await App.checkShopState();
        }

        App.UI.accountChanged([window.web3.currentProvider.selectedAddress]);
      });

      window.ethereum.on('chainChanged', (_chainId) => window.location.reload());

      window.ethereum.on('accountsChanged', function (accounts) {

      App.UI.accountChanged(accounts);

    })
   },
    checkShopKeeperState : async function() {
      let shopKeeperOwners =  await App.contracts.ShopKeeper.methods.getOwners().call();
      let state =  await App.contracts.ShopKeeper.methods.state().call();
      let shopKeeperIsActive =  state.isActive;
    
      App.ShopKeeperUnallocatedFunds = 0;
      App.ShopKeeperChange = state.change;
      App.isShopKeeperOwner = false;
      App.ShopKeeperOwnercount = shopKeeperOwners.length;
      App.shopKeeperIsActive = shopKeeperIsActive;
     
      for( i=0;i<shopKeeperOwners.length;i++) {
        if(window.web3.currentProvider.selectedAddress.toUpperCase() == shopKeeperOwners[i].toUpperCase()) {
          App.isShopKeeperOwner = true;
        }
      }
    
      if(App.isShopKeeperOwner) {
        let contractBalance = await App.contracts.ShopKeeper.methods.getBalance().call();
        let allocatedBalance = new BigNumber(0);
        
        for(p = 0;p<shopKeeperOwners.length;p++) {
            allocatedBalance += new BigNumber( await App.contracts.ShopKeeper.methods.ownerBalances(shopKeeperOwners[p]).call());
        }

        let remainder = new BigNumber(contractBalance) - new BigNumber(allocatedBalance);
    
        App.ShopKeeperUnallocatedFunds = remainder;
        App.shopKeeperBalance = 0;

        await App.contracts.getShopKeeperOwnerBalance();
      }

      await App.UI.setShopKeeperOptions();
     
      if(shopKeeperIsActive) {
        await App.getShops();
      }
    },   
    checkShopState : async function() {
      App.ShopOwnercount = 0;
      
      if(App.currentShopAddress != null) {
        let shopOwners =  await App.contracts.Shop.methods.getOwners().call();
        let state =  await App.contracts.Shop.methods.state().call();
      
        App.currentShopIsActive =  state.isActive;
        App.ShopUnallocatedFunds = 0;
        
        let contractBalance = await App.contracts.Shop.methods.getBalance().call();
        let allocatedBalance = new BigNumber(0);
        
        for(p = 0;p<shopOwners.length;p++) {
            var ownerAllocation = await App.contracts.Shop.methods.ownerBalances(shopOwners[p]).call();
            allocatedBalance += new BigNumber(ownerAllocation);
        }

        let remainder = new BigNumber(contractBalance)- new BigNumber(allocatedBalance);
        App.ShopUnallocatedFunds = remainder;
        App.isShopOwner = false;
        App.ShopChange = state.change;
        App.ShopOwnercount = shopOwners.length;

        for( i=0;i<shopOwners.length;i++) {
          if(web3.currentProvider.selectedAddress.toUpperCase() === shopOwners[i].toUpperCase()) {
            App.isShopOwner = true;
          }
        }

        if(App.isShopOwner) {
          App.shopOwnerBalance = 0;
          await App.contracts.getShopOwnerBalance();
        }

        if( App.currentShopIsActive || App.isShopOwner) {
             App.CurrentShop = { "Products" : {}};

             if(!App.shopKeeperIsActive){
                App.UI.deactivateSite();
             }
             else{
              let products =  await App.contracts.Shop.methods.getProducts().call();
              App.CurrentShop.Products = products;
 
              App.UI.loadShopProducts(products);
             }
        }
        else {
            App.UI.deactivateShop();
        }
      }
      
      App.UI.setShopOptions();
    },
    getShops : async function() {
      let shops =  await App.contracts.ShopKeeper.methods.getShops().call();
      
      var sortingArray = [];
      $.each(shops,function(i) {
        sortingArray.push(shops[i])
      });

      sortingArray.sort();

      App.Shops = sortingArray;

      App.UI.setShops();
    },
    activateSite : async function() {
       try{
        App.UI.startPendingTransaction("Activating site");
        await App.contracts.ShopKeeper.methods.activateState().send({from: web3.currentProvider.selectedAddress });
       }
       catch(error) {
        App.UI.stopPendingTransactionWithError(error.message);
       }
    },
    deactivateSite : async function() {
      try{
        App.UI.startPendingTransaction("Deactivating site");
        await App.contracts.ShopKeeper.methods.deactivateState().send({from: web3.currentProvider.selectedAddress });
      }
       catch(error) {
        App.UI.stopPendingTransactionWithError(error.message);
     }
    },
    activateShop: async function() {
      try{
      App.UI.startPendingTransaction("Activating shop");
      await App.contracts.Shop.methods.activateState().send({from: web3.currentProvider.selectedAddress });
        }
        catch(error) {
        App.UI.stopPendingTransactionWithError(error.message);
        }
    },
    deactivateShop : async function() {
      try{
      App.UI.startPendingTransaction("Deactivating shop");
      await App.contracts.Shop.methods.deactivateState().send({from: web3.currentProvider.selectedAddress });
     }
      catch(error) {
      App.UI.stopPendingTransactionWithError(error.message);
    }
   },
  };
  
$(function() {
  $("#msgid").text("Buidl yourself a shop");
  App.init();
});

window.onbeforeunload = function() {
  return "Prevent reload"
} 

$('#addShopModal').on('show.bs.modal', function (event) {
  var modal = $(this)
  $("#shopName").val("");
  modal.find('.modal-title').text('Register a new shop')
});

$('#addShopModal').on('click', '.btn-primary', async function() {
  var shopName = $('#shopName').val();
  if(shopName=="") {
    $.toaster("Please fill in a shop name", 'Validation error', "danger");
  }
  else {
    let shopExists = await App.contracts.CheckShopNameExists(shopName);
    if(shopExists) {
      $.toaster("This shop already exists", 'Validation error', "danger");
    }
    else {
      $('#shopName').val("");
      $('#addShopModal').modal('hide');
      await App.contracts.addShop(shopName);
    }
  }
});

$('#ownerModal').on('show.bs.modal', async function (e) {
  $('#ownerAddress').val("");
  $("#ownerModalOperationMode").val("");
  $("#ownerModalContractType").val("");
  $("#currentOwners").text("");
  
  var modal = $(this)
  var operationMode = $(e.relatedTarget).attr('data-operationMode');
  $("#ownerModalOperationMode").val(operationMode);
  var contractType = $(e.relatedTarget).attr('data-contractType');
  $("#ownerModalContractType").val(contractType);
  modal.find('.modal-title').text('Manage Owners')

  if( $("#ownerModalContractType").val() == "ShopKeeper") {
    contractToUse = App.contracts.ShopKeeper;
  }
  else {
    contractToUse = App.contracts.Shop;
  }

  let owners = await contractToUse.methods.getOwners().call();
  $("#currentOwners").text(owners);
});

$('#ownerModal').on('click', '.btn-primary', async function() {
  var ownerAddress = $('#ownerAddress').val();
  var contractToUse;

  if( $("#ownerModalContractType").val() == "ShopKeeper") {
    contractToUse = App.contracts.ShopKeeper;
  }
  else {
    contractToUse = App.contracts.Shop;
  }

  if( $("#ownerModalOperationMode").val() == "add") {
    operationMode = "add";
  }
  else {
    operationMode = "remove";
  }

  if(ownerAddress=="") {
    $.toaster("Please fill in an address", 'Validation error', "danger");
  }
  else {
    if(operationMode == "add") {
      let owners = await contractToUse.methods.getOwners().call();
      let ownerExists = false;
      for(i=0;i<owners.length;i++) {
          if(owners[i].toUpperCase() == ownerAddress.toUpperCase()) {
            ownerExists = true;
          }
      }
      if(ownerExists) {
        $.toaster("This owner already exists", 'Validation error', "danger");
      }
      else {

        try{
          App.UI.startPendingTransaction("Adding " + $("#ownerModalContractType").val() + " state owner");

          $('#ownerAddress').val("");
          $("#ownerModalOperationMode").val("");
          $("#ownerModalContractType").val("");
          $('#ownerModal').modal('hide');
        
          await contractToUse.methods.addStateOwner(ownerAddress).send({from: web3.currentProvider.selectedAddress });
        }
          catch(error) {
          App.UI.stopPendingTransactionWithError(error.message);
        }
      }
    }

    if(operationMode == "remove") {
      let owners = await contractToUse.methods.getOwners().call();
      let ownerExists = false;
      for(i=0;i<owners.length;i++) {
          if(owners[i].toUpperCase() == ownerAddress.toUpperCase()) {
            ownerExists = true;
          }
      }
      if(!ownerExists) {
        $.toaster("This owner does not exist", 'Validation error', "danger");
      }
      else {
        try{
            $('#ownerAddress').val("");
            $("#ownerModalOperationMode").val("");
            $("#ownerModalContractType").val("");
            $("#currentOwners").text("");
            $('#ownerModal').modal('hide');
            
            App.UI.startPendingTransaction("Removing " + $("#ownerModalContractType").val() + " state owner");

            await contractToUse.methods.removeStateOwner(ownerAddress).send({from: web3.currentProvider.selectedAddress });
          }
          catch(error) {
          App.UI.stopPendingTransactionWithError(error.message);
        }
      }
    }
  }
});

$('#pendingChangeModal').on('show.bs.modal', async function (e) {
  var modal = $(this);

  modal.find('.modal-title').text('Change management')

  var contractType = $(e.relatedTarget).attr('data-contractType');
  $("#pendingChangeContractType").val(contractType);

  if( $("#pendingChangeContractType").val() == "ShopKeeper") {
    contractToUse = App.contracts.ShopKeeper;
    changeToUse = App.ShopKeeperChange;
  }
  else {
    contractToUse = App.contracts.Shop;
    changeToUse = App.ShopChange;
  }

  $("#pendingChangeType").text(App.changeTypes[changeToUse.changeType]);

  $("#addressToAdd").text("n/a");
  $("#addressToRemove").text("n/a");
  $("#activating").text("n/a");
  $("#deactivating").text("n/a");
  $("#numberOfOwnersToSet").text("n/a");
  
  if(changeToUse.changeType == 1) {
    $("#addressToAdd").text(changeToUse.ownerToAdd);;
  }
  if(changeToUse.changeType == 2) {
    $("#addressToRemove").text(changeToUse.ownerToRemove);
  }
  if(changeToUse.changeType == 3) {
    $("#activating").text("Activation Requested");
  }
  if(changeToUse.changeType == 4) {
    $("#deactivating").text("Deactivation Requested");
  }
  if(changeToUse.changeType == 5) {
    $("#numberOfOwnersToSet").text(changeToUse.ownersRequired);
  }

  $("#approvedOwners").text(changeToUse.ownersAcceptedStateChange);

  $("#pendingChangeAcceptButton").show();

  for(i=0;i< changeToUse.ownersAcceptedStateChange.length;i++) {
    if(changeToUse.ownersAcceptedStateChange[i].toUpperCase() == web3.currentProvider.selectedAddress.toUpperCase()) {
      $("#pendingChangeAcceptButton").hide();
    }
  }

  $("#abortAllowedAt").text( new Date(changeToUse.abortAllowedAt * 1000));
});

$('#pendingChangeModal').on('click', '.btn-primary', async function() {
  if( $("#pendingChangeContractType").val() == "ShopKeeper") {
    contractToUse = App.contracts.ShopKeeper;
  }
  else {
    contractToUse = App.contracts.Shop;
  }

  try{
     App.UI.startPendingTransaction("Agreeing to " + $("#ownerModalContractType").val() + " state change");
      await contractToUse.methods.agreeToStateChange().send({from: web3.currentProvider.selectedAddress });
  }
  catch(error) {
    App.UI.stopPendingTransactionWithError(error.message);
  }

  $('#pendingChangeModal').modal('hide');
});

$('#requiredOwnersModal').on('show.bs.modal', async function (e) {
  $('#requiredOwners').val(0);
  $("#requiredOwnersModalContractType").val("");
  
  var modal = $(this);

  var contractType = $(e.relatedTarget).attr('data-contractType');
  $("#requiredOwnersModalContractType").val(contractType);

  modal.find('.modal-title').text('Manage Owners')

  if( $("#requiredOwnersModalContractType").val() == "ShopKeeper") {
    contractToUse = App.contracts.ShopKeeper;
  }
  else {
    contractToUse = App.contracts.Shop;
  }

  let owners = await contractToUse.methods.getOwners().call();
  $("#requiredOwnersModalCurrentOwnerCount").val(parseInt(owners.length));

  let state = await contractToUse.methods.state().call();
  let currentValue = parseInt(state.ownersRequired);
  $("#requiredOwners").val(currentValue);
});

$('#productModal').on('show.bs.modal', async function (e) {
  var modal = $(this);

  $("#productName").val("");
  $("#productSku").val("");
  $("#productPrice").val(100000000000000);
  $("#productStockQuantity").val(0);
  $("#productPriceEth").text(window.web3.utils.fromWei("100000000000000", 'ether') + " Eth ");

  modal.find('.modal-title').text('Manage Products (Add)')

  contractToUse = App.contracts.Shop;
});

$('#editProductModal').on('show.bs.modal', async function (e) {
  var modal = $(this);

  $("#editProductName").val("");
  $("#editProductSku").val("");
  $("#editProductPrice").val(0);
  $("#editProductStockQuantity").val(0);
  
  modal.find('.modal-title').text('Manage Products (Edit)')
  
  contractToUse = App.contracts.Shop;
  var existingProduct = await contractToUse.methods.getProductByHash($('#editProductModalSkuHash').val()).call();

  $("#editProductName").val(existingProduct.name);
  $("#editProductSku").val(existingProduct.sku);
  $("#editProductPrice").val(existingProduct.fullPrice);
  $("#editProductPriceEth").text(window.web3.utils.fromWei(String(existingProduct.fullPrice), 'ether') + " Eth ");
  $("#editProductStockQuantity").val(existingProduct.stockQuantity);
});

$('#productModal').on('click', '.btn-primary', async function() {
  var contractToUse = App.contracts.Shop;
  var products = $("#products-grid").bootgrid().data('.rs.jquery.bootgrid').rows;

  var productName = $("#productName").val();
  if( productName=="") {
    $.toaster("Please fill in the product name", 'Validation error', "danger");
    return;
  }

  for(k=0;k<products.length;k++) {
    if( products[k].name.toUpperCase() == productName.toUpperCase()) {
      $.toaster("The Product with name '" + productName + "' already exists", 'Validation error', "danger");
      return;
    }
  }

  var productSku = $("#productSku").val();
  if( productSku=="") {
    $.toaster("Please fill in the product SKU", 'Validation error', "danger");
    return;
  }

  for(k=0;k<products.length;k++) {
    if( products[k].id.toUpperCase() == productSku.toUpperCase()) {
      $.toaster("The SKU '" + productSku + "' already exists", 'Validation error', "danger");
      return;
    }
  }
 
    var quantity = parseInt($("#productStockQuantity").val());

    $('#productModal').modal('hide');

      try{
        App.UI.startPendingTransaction("Adding product");
        await contractToUse.methods.addProduct(
          $("#productPrice").val(),
          quantity , 
          productSku, 
          productName).send({from: web3.currentProvider.selectedAddress });
      }
        catch(error) {
         App.UI.stopPendingTransactionWithError(error.message);
      }
});

$('#editProductModal').on('click', '.btn-primary', async function() {
  
  var contractToUse = App.contracts.Shop;

  var products = $("#products-grid").bootgrid().data('.rs.jquery.bootgrid').rows;

  var productName = $("#editProductName").val();
  if( productName=="") {
    $.toaster("Please fill in the product name", 'Validation error', "danger");
    return;
  }

  for(k=0;k<products.length;k++) {
    if($("#editProductModalSkuHash").val().toUpperCase() != products[k].hash.toUpperCase()) {
      if( products[k].name.toUpperCase() == productName.toUpperCase()) {
        $.toaster("The Product with name '" + productName + "' already exists", 'Validation error', "danger");
        return;
      }
    }
  }

  var productSku = $("#editProductSku").val();
  if( productSku=="") {
    $.toaster("Please fill in the product SKU", 'Validation error', "danger");
    return;
  }

  for(k=0;k<products.length;k++) {
    if($("#editProductModalSkuHash").val().toUpperCase() != products[k].hash.toUpperCase()) {
      if( products[k].id.toUpperCase() == productSku.toUpperCase()) {
        $.toaster("The SKU '" + productSku + "' already exists", 'Validation error', "danger");
        return;
      }
   }
  }
  
  var price = window.web3.utils.toBN($("#editProductPrice").val());

  if( price == window.web3.utils.toBN(0)) {
    $.toaster("Please fill a price", 'Validation error', "danger");
    return;
  }

  $('#editProductModal').modal('hide');

  try{
    App.UI.startPendingTransaction("Updating product");
    await contractToUse.methods.updateProduct(
      $("#editProductPrice").val(),
      $("#editProductStockQuantity").val(), 
      $("#editProductModalSkuHash").val(),
      productName).send({from: web3.currentProvider.selectedAddress });
  }
    catch(error) {
     App.UI.stopPendingTransactionWithError(error.message);
  }
});


$('#purchaseHistoryModal').on('show.bs.modal', async function (e) {
  var modal = $(this);

  App.UI.startLoadingOverlay("Retrieving products from blockchain events");

  try{
    App.contracts.Shop.getPastEvents('ProductSold', {
      filter: {customer: web3.currentProvider.selectedAddress }, // Using an array means OR: e.g. 20 or 23
      fromBlock: 0,
      toBlock: 'latest'
    }, function(error, events) {
     if(error) {
       console.log(error);
     }
     else {
      var grid = $("#purchaseHistory-grid").bootgrid("clear").bootgrid({
        ajax: false,
        searchSettings: {
            delay: 100,
            characters: 3
        },
        labels: {
            noResults: "There are no products in this shop."
        },
      });

        App.metaMask.getProductsFromEvents(events).then(function(products) {
        grid.bootgrid("append", products.rows);
        App.UI.stopLoadingOverlay();
      });
     }                  
    });
  }
  catch(error) {
    App.UI.stopPendingTransactionWithError(error.message);
 }
});


$('#buyProductModal').on('show.bs.modal', async function (e) {
  var modal = $(this);

  $("#buyProductPrice").val(0);
  $("#buyProductStockQuantity").val(1);
  
  modal.find('.modal-title').text('Buy a product')
  
  contractToUse = App.contracts.Shop;
  var existingProduct = await contractToUse.methods.getProductByHash($('#buyProductModalSkuHash').val()).call();

  $("#buyProductPrice").val(existingProduct.fullprice);
  $("#buyProductName").text(existingProduct.name);
  $("#buyProductSku").text(existingProduct.sku);

  if(parseInt(existingProduct.stockQuantity) == 0)
{
    $("#buyProductModalBody").hide();
    $("#buyProductModalBuyButton").hide();
    $("#buyModalNoStock").show();
}
else {
    $("#buyModalNoStock").hide();
    $("#buyProductPrice").val(existingProduct.fullPrice);
    $("#buyProductSaleCost").val(expandScientificNumber(existingProduct.fullPrice));
    $("#buyProductPriceEth").text(window.web3.utils.fromWei(String(existingProduct.fullPrice), 'ether') + " Eth ");
    $("#buyProductStockQuantity").attr("max", existingProduct.stockQuantity);
    $("#buyProductStockQuantityAvailable").text("Available:" + existingProduct.stockQuantity);
    $("#buyProductModalBody").show();
    $("#buyProductModalBuyButton").show();
  }
});

$('#buyProductModal').on('click', '.btn-primary', async function() {
  
  var contractToUse = App.contracts.Shop;

  $('#buyProductModal').modal('hide');

  try{
    App.UI.startPendingTransaction("Purchasing product");
    await contractToUse.methods.buyProduct(
      parseInt($("#buyProductStockQuantity").val()),
      $("#buyProductModalSkuHash").val()
      ).send({value: window.web3.utils.toBN($("#buyProductSaleCost").val()), from: web3.currentProvider.selectedAddress });
  }
    catch(error) {
     App.UI.stopPendingTransactionWithError(error.message);
  }
});


$('#removeOwnerModal').on('show.bs.modal', function (event) {
  var modal = $(this)
  modal.find('.modal-title').text('Remove an owner')
});

$('#requiredOwnersModal').on('click', '.btn-primary', async function() {
  var contractToUse;

  if( $("#requiredOwnersModalContractType").val() == "ShopKeeper") {
    contractToUse = App.contracts.ShopKeeper;
  }
  else {
    contractToUse = App.contracts.Shop;
  }

  if( $("#requiredOwners").val()==0 ||  $("#requiredOwners").val() >  $("#requiredOwnersModalCurrentOwnerCount").val()) {
    $.toaster("Please select an amount between 1 and " +  $("#requiredOwnersModalCurrentOwnerCount").val(), 'Validation error', "danger");
  }
  else {
        var requiredOwners = parseInt($("#requiredOwners").val());

        try{
        App.UI.startPendingTransaction("Changing " + $("#requiredOwnersModalContractType").val() + " required owners");

        $('#requiredOwners').val();
        $("#requiredOwnersModalContractType").val("");
        $('#requiredOwnersModal').modal('hide');

        await contractToUse.methods.setRequiredOwnersAmount(requiredOwners).send({from: web3.currentProvider.selectedAddress });
        }
        catch(error) {
        App.UI.stopPendingTransactionWithError(error.message);
       }
  }
});

(function($) {
  $.fn.inputFilter = function(inputFilter) {
    return this.on("input keydown keyup mousedown mouseup select contextmenu drop", function() {
      if (inputFilter(this.value)) {
        this.oldValue = this.value;
        this.oldSelectionStart = this.selectionStart;
        this.oldSelectionEnd = this.selectionEnd;
      } else if (this.hasOwnProperty("oldValue")) {
        this.value = this.oldValue;
        this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
      } else {
        this.value = "";
      }
    });
  };
}(jQuery));

$("#productPrice").keyup(function() {
  $("#productPriceEth").text(window.web3.utils.fromWei($("#productPrice").val(), 'ether') + " Eth ");
})

$("#buyProductStockQuantity").change(function() {
  var price = new BigNumber($("#buyProductPrice").val());
  var cost =price * new BigNumber($("#buyProductStockQuantity").val());
  var costString = cost/1000000000000000000;

  $("#buyProductPriceEth").text(costString + " Eth ");
  $("#buyProductSaleCost").val(expandScientificNumber(cost));
})

function expandScientificNumber(x) {
  if (Math.abs(x) < 1.0) {
    var e = parseInt(x.toString().split('e-')[1]);
    if (e) {
        x *= Math.pow(10,e-1);
        x = '0.' + (new Array(e)).join('0') + x.toString().substring(2);
    }
  } else {
    var e = parseInt(x.toString().split('+')[1]);
    if (e > 20) {
        e -= 20;
        x /= Math.pow(10,e);
        x += (new Array(e+1)).join('0');
    }
  }
  return x;
}

$("#shopName").inputFilter(function(value) {
  if(value == "") {return true;}

  return /^[a-z0-9. ]+$/i.test(value);    
});
$("#productPrice").inputFilter(function(value) {
  return /^\d*$/.test(value);    
});
$("#editProductPrice").inputFilter(function(value) {
  return /^\d*$/.test(value);   
});

$("#editProductPrice").keyup(function() {
  $("#editProductPriceEth").text(window.web3.utils.fromWei($("#editProductPrice").val(), 'ether') + " Eth ");
})