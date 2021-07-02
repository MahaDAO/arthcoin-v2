const { BigNumber } = require('@ethersproject/bignumber');
const chalk = require('chalk');
const helpers = require('./helpers');

const StakeARTHMAHA = artifacts.require("Staking/Variants/StakeARTHMAHA.sol");
const StakeARTH = artifacts.require("Staking/Variants/StakeARTH.sol");
const StakeARTHX = artifacts.require("Staking/Variants/StakeARTHX.sol");
const StakeARTHXARTH = artifacts.require("Staking/Variants/StakeARTHXARTH.sol");
const StakeARTHUSDC = artifacts.require("Staking/Variants/StakeARTHUSDC.sol");
const StakeMAHA = artifacts.require("Staking/Variants/StakeMAHA.sol");

const PoolToken = artifacts.require("PoolToken");

module.exports = async function (deployer, network, accounts) {
  // if (network === 'mainnet')
  const DEPLOYER_ADDRESS = accounts[0];

  const poolToken = await PoolToken.deployed();

  const arth = await helpers.getARTH(network, deployer, artifacts);
  const arthx = await helpers.getARTHX(network, deployer, artifacts);
  const usdc = await helpers.getUSDC(network, deployer, artifacts);

  const maha = await helpers.getMahaToken(network, deployer, artifacts);
  const uniswapFactory = await helpers.getUniswapFactory(network, deployer, artifacts);

  console.log(chalk.yellow('\nGetting created uniswap pair addresses...'));
  const pairARTHMAHA = await uniswapFactory.getPair(arth.address, maha.address);
  const pairARTHXARTH = await uniswapFactory.getPair(arthx.address, arth.address);
  const pairARTHUSDC = await uniswapFactory.getPair(usdc.address, arth.address);

  console.log(chalk.yellow('\nDeploying staking contracts...'));

  await deployer.deploy(
    StakeARTHMAHA,
    DEPLOYER_ADDRESS,
    poolToken.address,
    pairARTHMAHA
  );

  await deployer.deploy(
    StakeARTHXARTH,
    DEPLOYER_ADDRESS,
    poolToken.address,
    pairARTHXARTH
  );

  await deployer.deploy(
    StakeARTH,
    DEPLOYER_ADDRESS,
    poolToken.address,
    arth.address
  );

  await deployer.deploy(
    StakeARTHX,
    DEPLOYER_ADDRESS,
    poolToken.address,
    arthx.address
  );

  await deployer.deploy(
    StakeARTHUSDC,
    DEPLOYER_ADDRESS,
    poolToken.address,
    pairARTHUSDC
  );

  await deployer.deploy(
    StakeMAHA,
    DEPLOYER_ADDRESS,
    maha.address,
    pairARTHUSDC
  );

  const stakeARTH = await StakeARTH.deployed();
  const stakeARTHMAHA = await StakeARTHMAHA.deployed();
  const stakeARTHX = await StakeARTHX.deployed();
  const stakeARTHXARTH = await StakeARTHXARTH.deployed();
  const stakeARTHUSDC = await StakeARTHUSDC.deployed();
  const stakeMAHA = await StakeMAHA.deployed();

  console.log(chalk.yellow('\nTransfering Pool tokens to staking contracts...'));

  const decimals = BigNumber.from(10).pow(18);

  await poolToken.transfer(stakeARTH.address, decimals.mul(500), { from: DEPLOYER_ADDRESS });
  await poolToken.transfer(stakeARTHMAHA.address, decimals.mul(2000), { from: DEPLOYER_ADDRESS });
  await poolToken.transfer(stakeARTHUSDC.address, decimals.mul(4000), { from: DEPLOYER_ADDRESS });
  await poolToken.transfer(stakeARTHX.address, decimals.mul(1000), { from: DEPLOYER_ADDRESS });
  await poolToken.transfer(stakeARTHXARTH.address, decimals.mul(2000), { from: DEPLOYER_ADDRESS });
  await poolToken.transfer(stakeMAHA.address, decimals.mul(500), { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('\nAdd the staking contracts to tax whitelist'));

  await arthx.addToTaxWhiteListMultiple([ stakeARTHX.address, stakeARTHXARTH.address ]);
};
