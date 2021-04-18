require('dotenv').config()
const chalk = require('chalk')
const BigNumber = require('bignumber.js')

const helpers = require('./helpers')


const Timelock = artifacts.require("Timelock")
const ARTHShares = artifacts.require("ARTHShares")
const ARTHStablecoin = artifacts.require("ARTHStablecoin")
const ARTHController = artifacts.require("ArthController")
const UniswapPairOracleARTHWETH = artifacts.require("UniswapPairOracleARTHWETH")
const UniswapPairOracleARTHUSDC = artifacts.require("UniswapPairOracleARTHUSDC")
const UniswapPairOracleARTHUSDT = artifacts.require("UniswapPairOracleARTHUSDT")
const UniswapPairOracleUSDCWETH = artifacts.require("UniswapPairOracleUSDCWETH")
const UniswapPairOracleUSDTWETH = artifacts.require("UniswapPairOracleUSDTWETH")
const UniswapPairOracleARTHARTHX = artifacts.require("UniswapPairOracleARTHARTHX")
const UniswapPairOracleARTHXWETH = artifacts.require("UniswapPairOracleARTHXWETH")
const UniswapPairOracleARTHXUSDC = artifacts.require("UniswapPairOracleARTHXUSDC")
const UniswapPairOracleARTHXUSDT = artifacts.require("UniswapPairOracleARTHXUSDT")


module.exports = async function (deployer, network, accounts) {

  const DEPLOYER_ADDRESS = accounts[0]
  const ONE_HUNDRED_MILLION = new BigNumber("100000000e6")

  const arthxInstance = await ARTHShares.deployed()
  const timelockInstance = await Timelock.deployed()
  const arthInstance = await ARTHStablecoin.deployed()
  const arthController = await ARTHController.deployed()
  const wethInstance = await helpers.getWETH(network, deployer, artifacts, DEPLOYER_ADDRESS)
  const uniswapFactoryInstance = await helpers.getUniswapFactory(network, deployer, artifacts)

  const usdcInstanceCollateral = await helpers.getUSDC(
    network,
    deployer,
    artifacts,
    DEPLOYER_ADDRESS,
    ONE_HUNDRED_MILLION,
    'USDC',
    6
  )
  const usdtCollateralInstance = await helpers.getUSDT(
    network,
    deployer,
    artifacts,
    DEPLOYER_ADDRESS,
    ONE_HUNDRED_MILLION,
    'USDT',
    6
  )

  console.log(chalk.yellow('\nDeploying uniswap oracles...'))
  console.log(chalk.yellow(' - Starting ARTH oracle...'))
  await Promise.all([
    deployer.deploy(
      UniswapPairOracleARTHWETH,
      uniswapFactoryInstance.address,
      arthInstance.address,
      wethInstance.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    ),
    deployer.deploy(
      UniswapPairOracleARTHUSDC,
      uniswapFactoryInstance.address,
      arthInstance.address,
      usdcInstanceCollateral.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    ),
    deployer.deploy(
      UniswapPairOracleARTHUSDT,
      uniswapFactoryInstance.address,
      arthInstance.address,
      usdtCollateralInstance.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    ),
    deployer.deploy(
      UniswapPairOracleARTHARTHX,
      uniswapFactoryInstance.address,
      arthInstance.address,
      arthxInstance.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    )
  ])

  console.log(chalk.yellow('- Starting ARTHX oracles...'))
  await Promise.all([
    deployer.deploy(
      UniswapPairOracleARTHXWETH,
      uniswapFactoryInstance.address,
      arthxInstance.address,
      wethInstance.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    ),
    deployer.deploy(
      UniswapPairOracleARTHXUSDC,
      uniswapFactoryInstance.address,
      arthxInstance.address,
      usdcInstanceCollateral.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    ),
    deployer.deploy(
      UniswapPairOracleARTHXUSDT,
      uniswapFactoryInstance.address,
      arthxInstance.address,
      usdtCollateralInstance.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    )
  ])

  console.log(chalk.yellow('- Starting with collateral oracles...'))
  await Promise.all([
    deployer.deploy(
      UniswapPairOracleUSDTWETH,
      uniswapFactoryInstance.address,
      usdtCollateralInstance.address,
      wethInstance.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    ),
    deployer.deploy(
      UniswapPairOracleUSDCWETH,
      uniswapFactoryInstance.address,
      usdcInstanceCollateral.address,
      wethInstance.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    ),
  ])

  await helpers.getGMUOracle(network, deployer, artifacts)
  await helpers.getARTHMAHAOracle(network, deployer, artifacts)
  const chainlinkETHUSDOracle = await helpers.getChainlinkETHUSDOracle(network, deployer, artifacts)

  console.log(chalk.yellow('\nSetting chainlink oracle...'))
  await arthController.setETHGMUOracle(chainlinkETHUSDOracle.address, { from: DEPLOYER_ADDRESS })

  console.log(chalk.yellow('\nSetting ARTHWETH oracle...'))
  const arthWETHOracle = await UniswapPairOracleARTHWETH.deployed()
  await arthController.setARTHETHOracle(arthWETHOracle.address, wethInstance.address, { from: DEPLOYER_ADDRESS })

  const oracleinstanceARTHXWETH = await UniswapPairOracleARTHXWETH.deployed()
  console.log(chalk.yellow('\nLinking ARTHX oracles...'))
  await arthController.setARTHXETHOracle(oracleinstanceARTHXWETH.address, wethInstance.address, { from: DEPLOYER_ADDRESS })
}
