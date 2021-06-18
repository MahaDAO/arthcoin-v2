require('dotenv').config();
const HDWalletProvider = require("truffle-hdwallet-provider");

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545, // 7545
      network_id: "*",
      // gas: 0xfffffffffff,	// <-- Use this high gas value
      // gasPrice: 0x01,	// <-- Use this low gas price
    },
    mainnet: {
      // provider: providerFactory(),
      network_id: 1,
      gas: 8000000,
      gasPrice: 115000000000,  // 115 gwei,
    },
    rinkeby: {
      provider: function () {
        return new HDWalletProvider(
          process.env.METAMASK_WALLET_SECRET,
          'https://rinkeby.infura.io/v3/7878a73efb1d48c294c33a0e5abd48d6',
          //'https://bitter-twilight-moon.quiknode.io/a7bc771b-a15c-49a6-9e23-a1106f86b2db/g9PahkWuM3pjJMRqNA39cUyZpov8PMSH5MbcKSJs4zrqyGwEsuUajCGSpWmFbvVU7HboSbF6lauR38Y0Zyr8NQ==/'
        )
      },
      networkCheckTimeout: 100000,
      network_id: 4,
      skipDryRun: true
    },
    maticMumbai: {
      network_id: 80001,
      provider: function () {
        return new HDWalletProvider(
          process.env.METAMASK_WALLET_SECRET,
          //'https://matic-testnet-archive-rpc.bwarelabs.com'
          'https://matic-mumbai.chainstacklabs.com'
          //'https://rpc-mumbai.maticvigil.com/v1/0509c2e8f6c4f7be3491c6e21dbf95df221dcae6'
          //`https://rpc-mumbai.matic.today`
        )
      }
  },
  compilers: {
    solc: {
      version: '0.8.0+commit.c7dfd78e',
      settings: {
        optimizer: {
          enabled: true,
          runs: 100000
        }
      }
    }
  },
  mocha: { useColors: true },
  plugins: ["truffle-contract-size", 'truffle-plugin-verify'],
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY
  }
};
