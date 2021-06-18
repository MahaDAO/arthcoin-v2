require('dotenv').config();
const chalk = require('chalk');
const { time } = require('@openzeppelin/test-helpers');

const UniswapPairOracleMAHAARTH = artifacts.require("UniswapPairOracle_MAHA_ARTH");
const UniswapPairOracleARTHWETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_WETH");
const UniswapPairOracleARTHXWETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHX_WETH");
const UniswapPairOracleUSDCWETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");
const UniswapPairOracleUSDTWETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDT_WETH");
const UniswapPairOracleWBTCWETH = artifacts.require("Oracle/Variants/UniswapPairOracle_WBTC_WETH");
const UniswapPairOracleWMATICWETH = artifacts.require("Oracle/Variants/UniswapPairOracle_WMATIC_WETH");

module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  const uniswapPairOracleARTHXWETH = await UniswapPairOracleARTHXWETH.deployed();
  const uniswapPairOracleARTHWETH = await UniswapPairOracleARTHWETH.deployed();
  const uniswapPairOracleMAHAARTH = await UniswapPairOracleMAHAARTH.deployed();
  const uniswapPairOracleUSDCWETH = await UniswapPairOracleUSDCWETH.deployed();
  const uniswapPairOracleUSDTWETH = await UniswapPairOracleUSDTWETH.deployed();
  const uniswapPairOracleWBTCWETH = await UniswapPairOracleWBTCWETH.deployed();
  const uniswapPairOracleWMATICWETH = await UniswapPairOracleWMATICWETH.deployed();

  console.log(chalk.yellow(' - Setting period to 1 sec temporarily'));
  await Promise.all([
    uniswapPairOracleARTHXWETH.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    uniswapPairOracleARTHWETH.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    uniswapPairOracleMAHAARTH.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    uniswapPairOracleUSDCWETH.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    uniswapPairOracleUSDTWETH.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    uniswapPairOracleWBTCWETH.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    uniswapPairOracleWMATICWETH.setPeriod(1, { from: DEPLOYER_ADDRESS }),
  ]);

  console.log(chalk.yellow('\nUpdating oracle prices...'));
  if (process.env.MIGRATION_MODE == 'ganache' || network == 'development') {
    await time.increase(5);
    await time.advanceBlock();
  } else {
    console.log(chalk.red.bold('\nYou need to wait atleast 1 sec here.'));
  }

  await Promise.all([
    uniswapPairOracleARTHXWETH.update({ from: DEPLOYER_ADDRESS }),
    uniswapPairOracleARTHWETH.update({ from: DEPLOYER_ADDRESS }),
    uniswapPairOracleMAHAARTH.update({ from: DEPLOYER_ADDRESS }),
    uniswapPairOracleUSDCWETH.update({ from: DEPLOYER_ADDRESS }),
    uniswapPairOracleUSDTWETH.update({ from: DEPLOYER_ADDRESS }),
    uniswapPairOracleWBTCWETH.update({ from: DEPLOYER_ADDRESS }),
    uniswapPairOracleWMATICWETH.update({ from: DEPLOYER_ADDRESS }),

  ]);

  console.log(chalk.yellow('\nSetting the oracle period back to 24 hrs...'));
  if (process.env.MIGRATION_MODE == 'ganache') {
    await time.increase(5);
    await time.advanceBlock();
  } else {
    console.log(chalk.red.bold('You need to wait atleast 1 second here.'));
  }

  await Promise.all([
    uniswapPairOracleARTHXWETH.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    uniswapPairOracleARTHWETH.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    uniswapPairOracleMAHAARTH.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    uniswapPairOracleUSDCWETH.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    uniswapPairOracleUSDTWETH.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    uniswapPairOracleWBTCWETH.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    uniswapPairOracleWMATICWETH.setPeriod(3600, { from: DEPLOYER_ADDRESS })
  ]);
};
