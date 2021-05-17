const { BigNumber } = require('@ethersproject/bignumber');
const chalk = require('chalk');

require('dotenv').config();
const helpers = require('./helpers');

const ARTHShares = artifacts.require("ARTHX/ARTHShares");
const Timelock = artifacts.require("Governance/Timelock");
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");
const ARTHController = artifacts.require("Arth/ArthController");
const StakeARTHMAHA = artifacts.require("Staking/Variants/StakeARTHMAHA.sol");
const StakeARTH = artifacts.require("Staking/Variants/StakeARTH.sol");
const StakeARTHWETH = artifacts.require("Staking/Variants/StakeARTHWETH.sol");
const StakeARTHX = artifacts.require("Staking/Variants/StakeARTHX.sol");
const StakeARTHXWETH = artifacts.require("Staking/Variants/StakeARTHXWETH.sol");
const PoolToken = artifacts.require("PoolToken");



module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  const poolToken = await PoolToken.deployed();
  const timelockInstance = await Timelock.deployed();

  let arth = await ARTHStablecoin.deployed();
  let arthx = await ARTHShares.deployed();

  const maha = await helpers.getMahaToken(network, deployer, artifacts);
  const arthController = await ARTHController.deployed();
  const uniswapFactory = await helpers.getUniswapFactory(network, deployer, artifacts);
  const weth = await helpers.getWETH(network, deployer, artifacts);

  console.log(chalk.yellow('\nGetting created uniswap pair addresses...'));
  console.log(arth.address, weth.address, uniswapFactory.address)

  console.log(await uniswapFactory.getPair(arth.address, weth.address))
  console.log(await uniswapFactory.getPair(arth.address, maha.address))
  console.log(await uniswapFactory.getPair(arthx.address, weth.address))

  const pairARTHWETH = await uniswapFactory.getPair(arth.address, weth.address);
  const pairARTHMAHA = await uniswapFactory.getPair(arth.address, maha.address);
  const pairARTHXWETH = await uniswapFactory.getPair(arthx.address, weth.address);

  console.log(chalk.yellow('\nDeploying staking contracts...'));
  await Promise.all([
    deployer.deploy(
      StakeARTHWETH,
      DEPLOYER_ADDRESS,
      DEPLOYER_ADDRESS,
      poolToken.address,
      pairARTHWETH,
      arthController.address,
      timelockInstance.address,
      1e6
    ),
    deployer.deploy(
      StakeARTHMAHA,
      DEPLOYER_ADDRESS,
      DEPLOYER_ADDRESS,
      poolToken.address,
      pairARTHMAHA,
      arthController.address,
      timelockInstance.address,
      1e6
    ),
    deployer.deploy(
      StakeARTHXWETH,
      DEPLOYER_ADDRESS,
      DEPLOYER_ADDRESS,
      poolToken.address,
      pairARTHXWETH,
      arthController.address,
      timelockInstance.address,
      1e6
    ),
    deployer.deploy(
      StakeARTH,
      DEPLOYER_ADDRESS,
      DEPLOYER_ADDRESS,
      poolToken.address,
      arth.address,
      arthController.address,
      timelockInstance.address,
      1e6
    ),
    deployer.deploy(
      StakeARTHX,
      DEPLOYER_ADDRESS,
      DEPLOYER_ADDRESS,
      poolToken.address,
      arthx.address,
      arthController.address,
      timelockInstance.address,
      1e6
    )
  ]);

  const stakeARTH = await StakeARTH.deployed();
  const stakeARTHMAHA = await StakeARTHMAHA.deployed();
  const stakeARTHWETH = await StakeARTHWETH.deployed();
  const stakeARTHX = await StakeARTHX.deployed();
  const stakeARTHXWETH = await StakeARTHXWETH.deployed();

  console.log(chalk.yellow('\nTransfering Pool tokens to staking contracts...'));

  const decimals = BigNumber.from(10).pow(18)
  await Promise.all([
    poolToken.transfer(stakeARTH.address, decimals.mul(1000), { from: DEPLOYER_ADDRESS }),
    poolToken.transfer(stakeARTHMAHA.address, decimals.mul(2000), { from: DEPLOYER_ADDRESS }),
    poolToken.transfer(stakeARTHWETH.address, decimals.mul(3000), { from: DEPLOYER_ADDRESS }),
    poolToken.transfer(stakeARTHX.address, decimals.mul(1000), { from: DEPLOYER_ADDRESS }),
    poolToken.transfer(stakeARTHXWETH.address, decimals.mul(3000), { from: DEPLOYER_ADDRESS }),
  ]);
};
