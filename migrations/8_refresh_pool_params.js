const chalk = require('chalk');
const BigNumber = require('bignumber.js');

const helpers = require('./helpers');

const Pool_USDC = artifacts.require("Arth/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Arth/Pools/Pool_USDT");
const Pool_WBTC = artifacts.require("Arth/Pools/Pool_WBTC");
const Pool_WETH = artifacts.require("Arth/Pools/Pool_WETH");
const Pool_WMATIC = artifacts.require("Arth/Pools/Pool_WMATIC");

module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];
  const TEN_MILLION = new BigNumber("1000000e6");

  const arthx = await helpers.getARTHX(network, deployer, artifacts);

  console.log(chalk.yellow('\nGetting deployed Pool instances...'));
  const pool_instance_USDC = await Pool_USDC.deployed();
  const pool_instance_USDT = await Pool_USDT.deployed();
  const pool_instance_WBTC = await Pool_WBTC.deployed();
  const pool_instance_WETH = await Pool_WETH.deployed();
  const pool_instance_WMATIC = await Pool_WMATIC.deployed();

  console.log(chalk.yellow('\nRefreshing pool params...'));
  await pool_instance_USDC.setPoolParameters(TEN_MILLION, 1, { from: DEPLOYER_ADDRESS });
  await pool_instance_USDT.setPoolParameters(TEN_MILLION, 1, { from: DEPLOYER_ADDRESS });
  await pool_instance_WBTC.setPoolParameters(TEN_MILLION, 1, { from: DEPLOYER_ADDRESS });
  await pool_instance_WETH.setPoolParameters(TEN_MILLION, 1, { from: DEPLOYER_ADDRESS });
  await pool_instance_WMATIC.setPoolParameters(TEN_MILLION, 1, { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('\nGetting ARTH and ARTHX oracles...'));
  const usdc_oracle_instance = await helpers.getUSDCOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  const usdt_oracle_instance = await helpers.getUSDTOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  const wbtc_oracle_instance = await helpers.getWBTCOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  const weth_oracle_instance = await helpers.getWETHOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  const wmatic_oracle_instance = await helpers.getWMATICOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);

  console.log(chalk.yellow('\nLinking Collateral oracles...'));
  await pool_instance_USDC.setCollatGMUOracle(usdc_oracle_instance.address, { from: DEPLOYER_ADDRESS });
  await pool_instance_USDT.setCollatGMUOracle(usdt_oracle_instance.address, { from: DEPLOYER_ADDRESS });
  await pool_instance_WBTC.setCollatGMUOracle(wbtc_oracle_instance.address, { from: DEPLOYER_ADDRESS });
  await pool_instance_WETH.setCollatGMUOracle(weth_oracle_instance.address, { from: DEPLOYER_ADDRESS });
  await pool_instance_WMATIC.setCollatGMUOracle(wmatic_oracle_instance.address, { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('\nAdd the pools to tax whitelist'));
  await arthx.addToTaxWhiteListMultiple([
    pool_instance_USDC.address,
    pool_instance_USDT.address,
    pool_instance_WBTC.address,
    pool_instance_WETH.address,
    pool_instance_WMATIC.address
  ]);
};
