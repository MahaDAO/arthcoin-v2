const { BigNumber } = require('@ethersproject/bignumber');
const chalk = require('chalk');
const helpers = require('./helpers');

const StakeARTHMAHA = artifacts.require("Staking/Variants/StakeARTHMAHA.sol");
const StakeARTH = artifacts.require("Staking/Variants/StakeARTH.sol");
const StakeARTHX = artifacts.require("Staking/Variants/StakeARTHX.sol");
const StakeARTHXARTH = artifacts.require("Staking/Variants/StakeARTHXARTH.sol");
const PoolToken = artifacts.require("PoolToken");

module.exports = async function (deployer, network, accounts) {
  if (network === 'mainnet') return;
  const DEPLOYER_ADDRESS = accounts[0];

  const poolToken = await PoolToken.deployed();

  const arth = await helpers.getARTH(network, deployer, artifacts);
  const arthx = await helpers.getARTHX(network, deployer, artifacts);

  const maha = await helpers.getMahaToken(network, deployer, artifacts);
  const uniswapFactory = await helpers.getUniswapFactory(network, deployer, artifacts);

  console.log(chalk.yellow('\nGetting created uniswap pair addresses...'));
  const pairARTHMAHA = await uniswapFactory.getPair(arth.address, maha.address);
  const pairARTHXWETH = await uniswapFactory.getPair(arthx.address, arth.address);

  console.log(chalk.yellow('\nDeploying staking contracts...'));
  await Promise.all([
    deployer.deploy(
      StakeARTHMAHA,
      DEPLOYER_ADDRESS,
      poolToken.address,
      pairARTHMAHA
    ),
    deployer.deploy(
      StakeARTHXARTH,
      DEPLOYER_ADDRESS,
      poolToken.address,
      pairARTHXWETH
    ),
    deployer.deploy(
      StakeARTH,
      DEPLOYER_ADDRESS,
      poolToken.address,
      arth.address
    ),
    deployer.deploy(
      StakeARTHX,
      DEPLOYER_ADDRESS,
      poolToken.address,
      arthx.address
    )
  ]);

  const stakeARTH = await StakeARTH.deployed();
  const stakeARTHMAHA = await StakeARTHMAHA.deployed();
  const stakeARTHX = await StakeARTHX.deployed();
  const stakeARTHXARTH = await StakeARTHXARTH.deployed();

  console.log(chalk.yellow('\nTransfering Pool tokens to staking contracts...'));

  const decimals = BigNumber.from(10).pow(18);
  await Promise.all([
    poolToken.transfer(stakeARTH.address, decimals.mul(1000), { from: DEPLOYER_ADDRESS }),
    poolToken.transfer(stakeARTHMAHA.address, decimals.mul(4000), { from: DEPLOYER_ADDRESS }),
    poolToken.transfer(stakeARTHX.address, decimals.mul(1000), { from: DEPLOYER_ADDRESS }),
    poolToken.transfer(stakeARTHXARTH.address, decimals.mul(4000), { from: DEPLOYER_ADDRESS }),
  ]);

  console.log(chalk.yellow('\nAdd the staking contracts to tax whitelist'));
  await Promise.all([
    await arthx.addToTaxWhiteList(stakeARTH.address),
    await arthx.addToTaxWhiteList(stakeARTHMAHA.address),
    await arthx.addToTaxWhiteList(stakeARTHX.address),
    await arthx.addToTaxWhiteList(stakeARTHXARTH.address),
  ]);
};
