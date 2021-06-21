const chalk = require('chalk');

const ARTHController = artifacts.require("ArthController");
const Pool_USDC = artifacts.require("Arth/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Arth/Pools/Pool_USDT");
const Pool_WBTC = artifacts.require("Arth/Pools/Pool_WBTC");
const Pool_WMATIC = artifacts.require("Arth/Pools/Pool_WMATIC");
const Pool_WETH = artifacts.require("Arth/Pools/Pool_WETH");

const GenesisUSDC = artifacts.require("GenesisUSDC");
const GenesisUSDT = artifacts.require("GenesisUSDT");
const GenesisWBTC = artifacts.require("GenesisWBTC");
const GenesisWMATIC = artifacts.require("GenesisWMATIC");
const GenesisWETH = artifacts.require("GenesisWETH");

module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  const arthControllerInstance = await ARTHController.deployed();

  const genesis_usdt = await GenesisUSDT.deployed();
  const genesis_usdc = await GenesisUSDC.deployed();
  const genesis_wbtc = await GenesisWBTC.deployed();
  const genesis_weth = await GenesisWETH.deployed();
  const genesis_wmatic = await GenesisWMATIC.deployed();

  const pool_instance_USDC = await Pool_USDC.deployed();
  const pool_instance_USDT = await Pool_USDT.deployed();
  const pool_instance_WBTC = await Pool_WBTC.deployed();
  const pool_instance_WETH = await Pool_WETH.deployed();
  const pool_instance_WMATIC = await Pool_WMATIC.deployed();

  console.log(chalk.yellow('\nLinking collateral pools to arth contract...'));

  await arthControllerInstance.addPools([
    pool_instance_USDC.address,
    pool_instance_USDT.address,
    pool_instance_WBTC.address,
    pool_instance_WMATIC.address,
    pool_instance_WETH.address,
    genesis_usdc.address,
    genesis_usdt.address,
    genesis_wbtc.address,
    genesis_weth.address,
    genesis_wmatic.address,
  ], { from: DEPLOYER_ADDRESS });
};
