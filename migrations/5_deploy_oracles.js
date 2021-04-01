const chalk = require('chalk')
const BigNumber = require('bignumber.js')

require('dotenv').config()
const helpers = require('./helpers')


const ARTHShares = artifacts.require("ARTHS/ARTHShares")
const Timelock = artifacts.require("Governance/Timelock")
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin")
const UniswapPairOracle_ARTH_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_WETH")
const UniswapPairOracle_ARTH_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_USDC")
const UniswapPairOracle_ARTH_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_USDT")
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH")
const UniswapPairOracle_USDT_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDT_WETH")
const UniswapPairOracle_ARTH_ARTHS = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_ARTHS")
const UniswapPairOracle_ARTHS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHS_WETH")
const UniswapPairOracle_ARTHS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHS_USDC")
const UniswapPairOracle_ARTHS_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHS_USDT")


module.exports = async function (deployer, network, accounts) {

  const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS
  const ONE_HUNDRED_MILLION = new BigNumber("100000000e6")

  const arthsInstance = await ARTHShares.deployed()
  const timelockInstance = await Timelock.deployed()
  const arthInstance = await ARTHStablecoin.deployed()
  const wethInstance = await helpers.getWETH(network, deployer, artifacts, DEPLOYER_ADDRESS)
  const uniswapFactoryInstance = await helpers.getUniswapFactory(network, deployer, artifacts)
  const col_instance_USDC = await helpers.getUSDC(network, deployer, artifacts, DEPLOYER_ADDRESS, ONE_HUNDRED_MILLION, 'USDC', 6)
  const col_instance_USDT = await helpers.getUSDT(network, deployer, artifacts, DEPLOYER_ADDRESS, ONE_HUNDRED_MILLION, 'USDT', 6)

  console.log(chalk.yellow('\nDeploying uniswap oracles...'))
  console.log(chalk.blue(' - Starting ARTH oracle...'))
  await Promise.all([
    deployer.deploy(
      UniswapPairOracle_ARTH_WETH,
      uniswapFactoryInstance.address,
      arthInstance.address,
      wethInstance.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    ),
    deployer.deploy(
      UniswapPairOracle_ARTH_USDC,
      uniswapFactoryInstance.address,
      arthInstance.address,
      col_instance_USDC.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    ),
    deployer.deploy(
      UniswapPairOracle_ARTH_USDT,
      uniswapFactoryInstance.address,
      arthInstance.address,
      col_instance_USDT.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    ),
    deployer.deploy(
      UniswapPairOracle_ARTH_ARTHS,
      uniswapFactoryInstance.address,
      arthInstance.address,
      arthsInstance.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    )
  ])

  console.log(chalk.blue('- Starting ARTHS oracles...'))
  await Promise.all([
    deployer.deploy(
      UniswapPairOracle_ARTHS_WETH,
      uniswapFactoryInstance.address,
      arthsInstance.address,
      wethInstance.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    ),
    deployer.deploy(
      UniswapPairOracle_ARTHS_USDC,
      uniswapFactoryInstance.address,
      arthsInstance.address,
      col_instance_USDC.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    ),
    deployer.deploy(
      UniswapPairOracle_ARTHS_USDT,
      uniswapFactoryInstance.address,
      arthsInstance.address,
      col_instance_USDT.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    )
  ])

  console.log(chalk.blue('- Starting with collateral oracles...'))
  await Promise.all([
    deployer.deploy(
      UniswapPairOracle_USDT_WETH,
      uniswapFactoryInstance.address,
      col_instance_USDT.address,
      wethInstance.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    ),
    deployer.deploy(
      UniswapPairOracle_USDC_WETH,
      uniswapFactoryInstance.address,
      col_instance_USDC.address,
      wethInstance.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address
    ),
  ])

  await helpers.getGMUOracle()
  await helpers.getARTHMAHAOracle()
  const chainlinkETHUSDOracle = await helpers.getChainlinkETHUSDOracle(network, deployer, artifacts)

  console.log(chalk.yellow('\nSetting chainlink oracle...'))
  await arthInstance.setETHUSDOracle(chainlinkETHUSDOracle.address, { from: DEPLOYER_ADDRESS })

  console.log(chalk.yellow('\nSetting ARTHWETH oracle...'))
  const arthWETHOracle = await UniswapPairOracle_ARTH_WETH.deployed()
  arthInstance.setARTHEthOracle(arthWETHOracle.address, wethInstance.address, { from: DEPLOYER_ADDRESS })

  console.log(chalk.yellow('Linking ARTHS oracles...'))
  await arthInstance.setARTHSEthOracle(oracle_instance_ARTHS_WETH.address, wethInstance.address, { from: DEPLOYER_ADDRESS })
}
