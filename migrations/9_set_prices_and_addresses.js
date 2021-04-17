const chalk = require('chalk')
const BigNumber = require('bignumber.js')

require('dotenv').config()
const helpers = require('./helpers')


const PoolUSDC = artifacts.require("PoolUSDC")
const PoolUSDT = artifacts.require("PoolUSDT")
const ARTHShares = artifacts.require("ARTHShares")
const ARTHController = artifacts.require("ARTHController")
const ARTHStablecoin = artifacts.require("ARTHStablecoin")
const UniswapPairOracleUSDCWETH = artifacts.require("UniswapPairOracleUSDCWETH")
const UniswapPairOracleARTHWETH = artifacts.require("UniswapPairOracleARTHWETH")
const UniswapPairOracleARTHUSDC = artifacts.require("UniswapPairOracleARTHUSDC")
const UniswapPairOracleARTHUSDT = artifacts.require("UniswapPairOracleARTHUSDT")
const UniswapPairOracleARTHARTHX = artifacts.require("UniswapPairOracleARTHARTHX")
const UniswapPairOracleARTHXWETH = artifacts.require("UniswapPairOracleARTHXWETH")


module.exports = async function (deployer, network, accounts) {

  const BIG6 = new BigNumber("1e6")
  const DEPLOYER_ADDRESS = accounts[0]

  const arthxInstance = await ARTHShares.deployed()
  const arthInstance = await ARTHStablecoin.deployed()
  const pool_instance_USDC = await PoolUSDC.deployed()
  const pool_instance_USDT = await PoolUSDT.deployed()
  const arthControllerInstance = await ARTHController.deployed()
  const oracle_instance_ARTH_WETH = await UniswapPairOracleARTHWETH.deployed()
  const oracle_instance_ARTH_USDC = await UniswapPairOracleARTHUSDC.deployed()
  const oracle_instance_ARTH_USDT = await UniswapPairOracleARTHUSDT.deployed()
  const oracle_instance_USDC_WETH = await UniswapPairOracleUSDCWETH.deployed()
  const oracle_instance_ARTH_ARTHX = await UniswapPairOracleARTHARTHX.deployed()
  const oracle_instance_ARTHX_WETH = await UniswapPairOracleARTHXWETH.deployed()
  const wethInstance = await helpers.getWETH(network, deployer, artifacts, DEPLOYER_ADDRESS)

  console.log(chalk.yellow('\nLinking collateral pools to arth contract...'))
  await arthInstance.addPool(pool_instance_USDC.address, { from: DEPLOYER_ADDRESS })
  await arthInstance.addPool(pool_instance_USDT.address, { from: DEPLOYER_ADDRESS })

  console.log(chalk.yellow('\nSetting ARTH address within ARTHX...'))
  await arthxInstance.setARTHAddress(arthInstance.address, { from: DEPLOYER_ADDRESS })

  console.log(chalk.yellow('\nSome oracle prices are: '))
  const arth_price_initial = new BigNumber(await arthControllerInstance.getARTHPrice({ from: DEPLOYER_ADDRESS })).div(BIG6)
  const arthx_price_initial = new BigNumber(await arthControllerInstance.getARTHXPrice({ from: DEPLOYER_ADDRESS })).div(BIG6)
  const arth_price_from_ARTH_WETH = (new BigNumber(await oracle_instance_ARTH_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6)

  const arth_price_from_ARTH_ARTHX = (new BigNumber(await oracle_instance_ARTH_ARTHX.consult.call(arthxInstance.address, 1e6))).div(BIG6)
  const arthx_price_from_ARTHX_WETH = (new BigNumber(await oracle_instance_ARTHX_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6)
  const arth_price_from_ARTH_USDC = (new BigNumber(await oracle_instance_ARTH_USDC.consult.call(arthInstance.address, new BigNumber("1e18")))).div(BIG6)
  const arth_price_from_ARTH_USDT = (new BigNumber(await oracle_instance_ARTH_USDT.consult.call(arthInstance.address, new BigNumber("1e18")))).div(BIG6)
  const USDC_price_from_USDC_WETH = (new BigNumber(await oracle_instance_USDC_WETH.consult.call(wethInstance.address, new BigNumber("1e18")))).div(BIG6)
  console.log(" NOTE: - arth_price_initial: ", arth_price_initial.toString(), "USD = 1 ARTH")
  console.log(" NOTE: - arthx_price_initial: ", arthx_price_initial.toString(), "USD = 1 ARTHX")
  console.log(" NOTE: - arth_price_from_ARTH_WETH: ", arth_price_from_ARTH_WETH.toString(), "ARTH = 1 WETH")
  console.log(" NOTE: - arth_price_from_ARTH_USDC: ", arth_price_from_ARTH_USDC.toString(), "ARTH = 1 USDC")
  console.log(" NOTE: - arth_price_from_ARTH_USDT: ", arth_price_from_ARTH_USDT.toString(), "ARTH = 1 USDT")
  console.log(" NOTE: - arth_price_from_ARTH_ARTHX: ", arth_price_from_ARTH_ARTHX.toString(), "ARTH = 1 ARTHX")
  console.log(" NOTE: - arthx_price_from_ARTHX_WETH: ", arthx_price_from_ARTHX_WETH.toString(), "ARTHX = 1 WETH")
  console.log(" NOTE: - USDC_price_from_USDC_WETH: ", USDC_price_from_USDC_WETH.toString(), "USDC = 1 WETH")

  console.log(chalk.yellow('\nTransferring some tokens and eth to metamask...'))
  await Promise.all([
    arthxInstance.transfer(DEPLOYER_ADDRESS, new BigNumber("1000e18"), { from: DEPLOYER_ADDRESS }),
    arthInstance.transfer(DEPLOYER_ADDRESS, new BigNumber("1000e18"), { from: DEPLOYER_ADDRESS })
  ])

  console.log(chalk.blue('\nRefreshing collateral ratio...'))
  await arthControllerInstance.refreshCollateralRatio()
}
