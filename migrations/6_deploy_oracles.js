const BigNumber = require('bignumber.js');
const chalk = require('chalk');
const helpers = require('./helpers');

const ARTHShares = artifacts.require("ARTHX/ARTHShares");
const Timelock = artifacts.require("Governance/Timelock");
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");
const ARTHController = artifacts.require("ArthController");
const BondingCurve = artifacts.require("BondingCurve");
const UniswapPairOracle_ARTH_ARTHX = artifacts.require("UniswapPairOracle_ARTH_ARTHX");
const UniswapPairOracle_MAHA_ARTH = artifacts.require("UniswapPairOracle_MAHA_ARTH");

module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  const timelockInstance = await Timelock.deployed();
  const arth = await ARTHStablecoin.deployed();
  const arthx = await ARTHShares.deployed();
  const arthController = await ARTHController.deployed();
  const maha = await helpers.getMahaToken(network, deployer, artifacts);
  const uniswapFactoryInstance = await helpers.getUniswapFactory(network, deployer, artifacts);

  console.log(chalk.yellow('\nDeploying uniswap oracles...'));
  console.log(chalk.yellow(' - Starting MAHA/ARTH oracle...'));
  await Promise.all([
    deployer.deploy(
      UniswapPairOracle_MAHA_ARTH,
      uniswapFactoryInstance.address,
      arth.address,
      maha.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    )
  ]);

  console.log(chalk.yellow('- Starting ARTHX/ARTH oracles...'));
  await Promise.all([
    deployer.deploy(
      UniswapPairOracle_ARTH_ARTHX,
      uniswapFactoryInstance.address,
      arth.address,
      arthx.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    )
  ]);


  console.log(chalk.yellow('- Deploying bonding curve'));
  await deployer.deploy(BondingCurve, new BigNumber('1300e6')); // Fixed price.

  await helpers.getGMUOracle(network, deployer, artifacts);

  console.log(chalk.yellow('\nLinking ARTHX oracles...'));
  const oracleARTHXWETH = await UniswapPairOracle_ARTH_ARTHX.deployed();
  await arthController.setARTHXGMUOracle(oracleARTHXWETH.address, { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('\nLinking MAHA oracles...'));
  const oracleMAHAARTH = await UniswapPairOracle_MAHA_ARTH.deployed();
  await arthController.setMAHAGMUOracle(oracleMAHAARTH.address, { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('- Linking genesis curve'));
  const bondingCurve = await BondingCurve.deployed();
  await arthController.setBondingCurve(bondingCurve.address);

  // todo: need to set this to use GMU oracles
  // console.log(chalk.yellowBright('\nDeploying collateral oracles'))
  // await helpers.getUSDCOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  // await helpers.getUSDTOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  // await helpers.getWBTCOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  // await helpers.getWMATICOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  // await helpers.getWETHOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
};
