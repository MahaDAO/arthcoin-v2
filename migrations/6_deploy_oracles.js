const chalk = require('chalk');
const helpers = require('./helpers');

const ARTHShares = artifacts.require("ARTHX/ARTHShares");
const Timelock = artifacts.require("Governance/Timelock");
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");
const ARTHController = artifacts.require("ArthController");
const UniswapPairOracleARTHWETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_WETH");
const UniswapPairOracleARTHXWETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHX_WETH");

module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  const timelockInstance = await Timelock.deployed();
  //const arthx = await ARTHShares.deployed();

  let arth = await ARTHStablecoin.deployed();
  let arthx = await ARTHShares.deployed();

  const arthController = await ARTHController.deployed();
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

  await helpers.getGMUOracle(network, deployer, artifacts);
  await helpers.getARTHMAHAOracle(network, deployer, artifacts);

  console.log(chalk.yellow('\nSetting chainlink oracle...'));
  const chainlinkETHUSDOracle = await helpers.getChainlinkETHUSDOracle(network, deployer, artifacts);
  await arthController.setETHGMUOracle(chainlinkETHUSDOracle.address, { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('\nSetting ARTHWETH oracle...'));
  const arthWETHOracle = await UniswapPairOracleARTHWETH.deployed();
  await arthController.setARTHETHOracle(arthWETHOracle.address, weth.address, { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('\nLinking ARTHX oracles...'));
  const oracleARTHXWETH = await UniswapPairOracleARTHXWETH.deployed();
  await arthController.setARTHXETHOracle(oracleARTHXWETH.address, weth.address, { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellowBright('\nDeploying collateral oracles'))
  await helpers.getUSDCOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  await helpers.getUSDTOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
};
