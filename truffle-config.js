require('dotenv').config();
const HDWalletProvider = require("truffle-hdwallet-provider");

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545, // 7545
      network_id: "*",
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
          'https://bitter-twilight-moon.quiknode.io/a7bc771b-a15c-49a6-9e23-a1106f86b2db/g9PahkWuM3pjJMRqNA39cUyZpov8PMSH5MbcKSJs4zrqyGwEsuUajCGSpWmFbvVU7HboSbF6lauR38Y0Zyr8NQ==/'
        );
      },
      networkCheckTimeout: 100000,
      network_id: 4,
      skipDryRun: true
    },
    maticMumbai: {
      network_id: 80001,
      gasPrice: 1100000000,  // 1.1 gwei
      provider: function () {
        return new HDWalletProvider(
          process.env.METAMASK_WALLET_SECRET,
          'https://matic-mumbai.chainstacklabs.com'
        );
      }
    },
    matic: {
      network_id: 137,
      gasPrice: 50100000000,  // 1.1 gwei
      provider: function () {
        return new HDWalletProvider(
          process.env.METAMASK_WALLET_SECRET,
          'https://summer-quiet-dust.matic.quiknode.pro/b1470518b1d4ac638e7b010090de0e9e0df1d656/',
          // 'https://polygon-mainnet.infura.io/v3/1f10246c2868483e9e73ddfabda3825f',
          // 'https://matic-mainnet-full-rpc.bwarelabs.com',
          // 'https://apis.ankr.com/0aa7b5a6761f4b87ae97c6b718d900ff/0a39ba8bf2c40d99b20fea4372ebaa68/polygon/full/main',
          // 'https://rpc-mainnet.maticvigil.com',
          // 'https://rpc-mainnet.matic.network
        );
      }
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
    etherscan: process.env.ETHERSCAN_API_KEY,
    polygonscan: process.env.MATICSCAN_API_KEY
  }
};
