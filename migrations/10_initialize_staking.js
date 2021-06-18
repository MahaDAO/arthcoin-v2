const chalk = require('chalk');
require('dotenv').config();

const StakeARTHMAHA = artifacts.require("Staking/Variants/StakeARTHMAHA.sol");
const StakeARTH = artifacts.require("Staking/Variants/StakeARTH.sol");
const StakeARTHWETH = artifacts.require("Staking/Variants/StakeARTHWETH.sol");
const StakeARTHX = artifacts.require("Staking/Variants/StakeARTHX.sol");
const StakeARTHXWETH = artifacts.require("Staking/Variants/StakeARTHXWETH.sol");

module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  const stakeARTH = await StakeARTH.deployed();
  const stakeARTHMAHA = await StakeARTHMAHA.deployed();
  const stakeARTHWETH = await StakeARTHWETH.deployed();
  const stakeARTHX = await StakeARTHX.deployed();
  const stakeARTHXWETH = await StakeARTHXWETH.deployed();

  console.log(chalk.yellow.bold('\nInitializing the staking rewards...'));
  await Promise.all([
    stakeARTH.initializeDefault({ from: DEPLOYER_ADDRESS }),
    stakeARTHMAHA.initializeDefault({ from: DEPLOYER_ADDRESS }),
    stakeARTHWETH.initializeDefault({ from: DEPLOYER_ADDRESS }),
    stakeARTHX.initializeDefault({ from: DEPLOYER_ADDRESS }),
    stakeARTHXWETH.initializeDefault({ from: DEPLOYER_ADDRESS }),
  ]);
};
