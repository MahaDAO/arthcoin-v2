const chalk = require('chalk');

const StakeARTHMAHA = artifacts.require("Staking/Variants/StakeARTHMAHA.sol");
const StakeARTH = artifacts.require("Staking/Variants/StakeARTH.sol");
const StakeARTHX = artifacts.require("Staking/Variants/StakeARTHX.sol");
const StakeARTHXARTH = artifacts.require("Staking/Variants/StakeARTHXARTH.sol");
const StakeARTHUSDC = artifacts.require("Staking/Variants/StakeARTHUSDC.sol");
const StakeMAHA = artifacts.require("Staking/Variants/StakeMAHA.sol");

module.exports = async function (deployer, network, accounts) {
  if (network === 'mainnet') return;

  const DEPLOYER_ADDRESS = accounts[0];

  const stakeARTH = await StakeARTH.deployed();
  const stakeARTHMAHA = await StakeARTHMAHA.deployed();
  const stakeARTHX = await StakeARTHX.deployed();
  const stakeARTHXARTH = await StakeARTHXARTH.deployed();
  const stakeARTHUSDC = await StakeARTHUSDC.deployed();
  const stakeMAHA = await StakeMAHA.deployed();

  console.log(chalk.yellow.bold('\nInitializing the staking rewards...'));

  await stakeARTH.initializeDefault({ from: DEPLOYER_ADDRESS });
  await stakeARTHX.initializeDefault({ from: DEPLOYER_ADDRESS });
  await stakeMAHA.initializeDefault({ from: DEPLOYER_ADDRESS });
  await stakeARTHMAHA.initializeDefault({ from: DEPLOYER_ADDRESS });
  await stakeARTHXARTH.initializeDefault({ from: DEPLOYER_ADDRESS });
  await stakeARTHUSDC.initializeDefault({ from: DEPLOYER_ADDRESS });
};
