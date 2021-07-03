require('dotenv').config();
const chalk = require('chalk');
const { time } = require('@openzeppelin/test-helpers');

const UniswapPairOracle_ARTH_MAHA = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_MAHA");
const UniswapPairOracle_ARTH_ARTHX = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_ARTHX");
const UniswapPairOracle_ARTH_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_USDC");


module.exports = async function (deployer, network, accounts) {
  if (network === 'mainnet') return;

  const DEPLOYER_ADDRESS = accounts[0];

  const uniswapPairOracleARTHXARTH = await UniswapPairOracle_ARTH_ARTHX.deployed();
  const uniswapPairOracleARTHMAHA = await UniswapPairOracle_ARTH_MAHA.deployed();
  const uniswapPairOracleARTHUSDC = await UniswapPairOracle_ARTH_USDC.deployed();

  console.log(chalk.yellow(' - Setting period to 1 sec temporarily'));
  await Promise.all([
    uniswapPairOracleARTHXARTH.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    uniswapPairOracleARTHMAHA.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    uniswapPairOracleARTHUSDC.setPeriod(1, { from: DEPLOYER_ADDRESS }),
  ]);

  console.log(chalk.yellow('\nUpdating oracle prices...'));
  if (process.env.MIGRATION_MODE == 'ganache' || network == 'development') {
    await time.increase(5);
    await time.advanceBlock();
  } else {
    console.log(chalk.red.bold('\nYou need to wait atleast 1 sec here.'));
  }

  await uniswapPairOracleARTHXARTH.update({ from: DEPLOYER_ADDRESS });
  await uniswapPairOracleARTHMAHA.update({ from: DEPLOYER_ADDRESS });
  await uniswapPairOracleARTHUSDC.update({ from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('\nSetting the oracle period back to 24 hrs...'));
  if (process.env.MIGRATION_MODE == 'ganache') {
    await time.increase(5);
    await time.advanceBlock();
  } else {
    console.log(chalk.red.bold('You need to wait atleast 1 second here.'));
  }

  await uniswapPairOracleARTHXARTH.setPeriod(3600, { from: DEPLOYER_ADDRESS });
  await uniswapPairOracleARTHMAHA.setPeriod(3600, { from: DEPLOYER_ADDRESS });
  await uniswapPairOracleARTHUSDC.setPeriod(3600, { from: DEPLOYER_ADDRESS });
};
