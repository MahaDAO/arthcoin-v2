require('dotenv').config();
const chalk = require('chalk');
const { time } = require('@openzeppelin/test-helpers');

const UniswapPairOracleARTHWETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_WETH");
const UniswapPairOracleARTHXWETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHX_WETH");


module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  const uniswapPairOracleARTHXWETH = await UniswapPairOracleARTHXWETH.deployed();
  const uniswapPairOracleARTHWETH = await UniswapPairOracleARTHWETH.deployed();

  console.log(chalk.red.bold("\nNormally you'd need to wait 24 hrs here, but temporarily we set smaller duration"));
  // // Advance 24 hrs so the period can be computed.
  // await time.increase(86400 + 1)
  // await time.advanceBlock()

  console.log(chalk.yellow(' - Setting period to 1 sec temporarily'));
  await Promise.all([
    uniswapPairOracleARTHXWETH.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    uniswapPairOracleARTHWETH.setPeriod(1, { from: DEPLOYER_ADDRESS })
  ]);

  console.log(chalk.yellow('\nUpdating oracle prices...'));
  if (process.env.MIGRATION_MODE == 'ganache' || network == 'development') {
    // Advance a few seconds.
    await time.increase(5);
    await time.advanceBlock();
  } else {
    console.log(chalk.red.bold('\nYou need to wait atleast 1 sec here.'));
    // TODO: add a wait time of 1 sec.
  }

  await Promise.all([
    uniswapPairOracleARTHXWETH.update({ from: DEPLOYER_ADDRESS }),
    uniswapPairOracleARTHWETH.update({ from: DEPLOYER_ADDRESS })
  ]);

  console.log(chalk.yellow('\nSetting the oracle period back to 24 hrs...'));
  if (process.env.MIGRATION_MODE == 'ganache') {
    // Advance a few seconds.
    await time.increase(5);
    await time.advanceBlock();
  } else {
    console.log(chalk.red.bold('You need to wait atleast 1 second here.'));
    // TODO: add a wait time of 1 sec.
  }

  await Promise.all([
    uniswapPairOracleARTHXWETH.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    uniswapPairOracleARTHWETH.setPeriod(3600, { from: DEPLOYER_ADDRESS })
  ]);
};
