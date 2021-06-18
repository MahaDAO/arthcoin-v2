const BigNumber = require('bignumber.js');
const chalk = require('chalk');
const helpers = require('./helpers');

const ARTHShares = artifacts.require("ARTHX/ARTHShares");
const Timelock = artifacts.require("Governance/Timelock");
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");
const ARTHController = artifacts.require("ArthController");
const BondingCurve = artifacts.require("BondingCurve");
const UniswapPairOracleMAHAARTH = artifacts.require("UniswapPairOracle_MAHA_ARTH");
const UniswapPairOracleARTHWETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_WETH");
const UniswapPairOracleARTHXWETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHX_WETH");

module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  const timelockInstance = await Timelock.deployed();
  const arth = await ARTHStablecoin.deployed();
  const arthx = await ARTHShares.deployed();
  const arthController = await ARTHController.deployed();
  const maha = await helpers.getMahaToken(network, deployer, artifacts);
  const weth = await helpers.getWETH(network, deployer, artifacts);
  const uniswapFactoryInstance = await helpers.getUniswapFactory(network, deployer, artifacts);

  console.log(chalk.yellow('\nDeploying uniswap oracles...'));
  console.log(chalk.yellow(' - Starting ARTH oracle...'));
  await Promise.all([
    deployer.deploy(
      UniswapPairOracleARTHWETH,
      uniswapFactoryInstance.address,
      arth.address,
      weth.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    )
  ]);

  console.log(chalk.yellow('- Starting ARTHX oracles...'));
  await Promise.all([
    deployer.deploy(
      UniswapPairOracleARTHXWETH,
      uniswapFactoryInstance.address,
      arthx.address,
      weth.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    )
  ]);

  console.log(chalk.yellow('- Starting MAHA oracles...'));
  await Promise.all([
    deployer.deploy(
      UniswapPairOracleMAHAARTH,
      uniswapFactoryInstance.address,
      maha.address,
      arth.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    )
  ]);

  console.log(chalk.yellow('- Deploying bonding curve'));
  await deployer.deploy(BondingCurve, new BigNumber('1300e6')); // Fixed price.

  await helpers.getGMUOracle(network, deployer, artifacts);

  console.log(chalk.yellow('\nSetting chainlink oracle...'));
  const chainlinkETHUSDOracle = await helpers.getETHGMUOracle(network, deployer, artifacts);
  await arthController.setETHGMUOracle(chainlinkETHUSDOracle.address, { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('\nSetting ARTHWETH oracle...'));
  const arthWETHOracle = await UniswapPairOracleARTHWETH.deployed();
  await arthController.setARTHETHOracle(arthWETHOracle.address, weth.address, { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('\nLinking ARTHX oracles...'));
  const oracleARTHXWETH = await UniswapPairOracleARTHXWETH.deployed();
  await arthController.setARTHXETHOracle(oracleARTHXWETH.address, weth.address, { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('\nLinking MAHA oracles...'));
  const oracleMAHAARTH = await UniswapPairOracleMAHAARTH.deployed();
  await arthController.setMAHARTHOracle(oracleMAHAARTH.address, { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('- Linking genesis curve'));
  const bondingCurve = await BondingCurve.deployed();
  await arthController.setBondingCurve(bondingCurve.address);

  console.log(chalk.yellowBright('\nDeploying collateral oracles'))
  await helpers.getUSDCOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  await helpers.getUSDTOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  await helpers.getWBTCOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  await helpers.getWMATICOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  await helpers.getWETHOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
};
