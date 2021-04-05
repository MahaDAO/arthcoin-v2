const chalk = require('chalk')
const BigNumber = require('bignumber.js')

require('dotenv').config()
const helpers = require('./helpers')


const ARTHShares = artifacts.require("ARTHX/ARTHShares")
const Pool_USDC = artifacts.require("Arth/Pools/Pool_USDC")
const Pool_USDT = artifacts.require("Arth/Pools/Pool_USDT")
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin")
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH")
const UniswapPairOracle_ARTH_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_WETH")
const UniswapPairOracle_ARTH_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_USDC")
const UniswapPairOracle_ARTH_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_USDT")
const UniswapPairOracle_ARTH_ARTHX = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_ARTHS")
const UniswapPairOracle_ARTHS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHS_WETH")


module.exports = async function (deployer, network, accounts) {

  const BIG6 = new BigNumber("1e6")
  const DEPLOYER_ADDRESS = accounts[0]

  const arthxInstance = await ARTHShares.deployed()
  const arthInstance = await ARTHStablecoin.deployed()
  const pool_instance_USDC = await Pool_USDC.deployed()
  const pool_instance_USDT = await Pool_USDT.deployed()
  const oracle_instance_ARTH_WETH = await UniswapPairOracle_ARTH_WETH.deployed()
  const oracle_instance_ARTH_USDC = await UniswapPairOracle_ARTH_USDC.deployed()
  const oracle_instance_ARTH_USDT = await UniswapPairOracle_ARTH_USDT.deployed()
  const oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed()
  const oracle_instance_ARTH_ARTHX = await UniswapPairOracle_ARTH_ARTHS.deployed()
  const oracle_instance_ARTHS_WETH = await UniswapPairOracle_ARTHS_WETH.deployed()
  const wethInstance = await helpers.getWETH(network, deployer, artifacts, DEPLOYER_ADDRESS)

  console.log(chalk.yellow('\nLinking collateral pools to arth contract...'))
  await arthInstance.addPool(pool_instance_USDC.address, { from: DEPLOYER_ADDRESS })
  await arthInstance.addPool(pool_instance_USDT.address, { from: DEPLOYER_ADDRESS })

  console.log(chalk.yellow('\nSetting ARTH address within ARTHS...'))
  await arthxInstance.setARTHAddress(arthInstance.address, { from: DEPLOYER_ADDRESS })

  console.log(chalk.yellow('\nSome oracle prices are: '))
  const arth_price_initial = new BigNumber(await arthInstance.arth_price({ from: DEPLOYER_ADDRESS })).div(BIG6)
  const arthx_price_initial = new BigNumber(await arthInstance.arthx_price({ from: DEPLOYER_ADDRESS })).div(BIG6)
  const arth_price_from_ARTH_WETH = (new BigNumber(await oracle_instance_ARTH_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6)
  const arth_price_from_ARTH_ARTHX = (new BigNumber(await oracle_instance_ARTH_ARTHS.consult.call(arthxInstance.address, 1e6))).div(BIG6)
  const arthx_price_from_ARTHS_WETH = (new BigNumber(await oracle_instance_ARTHS_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6)
  const arth_price_from_ARTH_USDC = (new BigNumber(await oracle_instance_ARTH_USDC.consult.call(arthInstance.address, new BigNumber("1e18")))).div(BIG6)
  const arth_price_from_ARTH_USDT = (new BigNumber(await oracle_instance_ARTH_USDT.consult.call(arthInstance.address, new BigNumber("1e18")))).div(BIG6)
  const USDC_price_from_USDC_WETH = (new BigNumber(await oracle_instance_USDC_WETH.consult.call(wethInstance.address, new BigNumber("1e18")))).div(BIG6)
  console.log(" NOTE: - arth_price_initial: ", arth_price_initial.toString(), "USD = 1 ARTH")
  console.log(" NOTE: - arthx_price_initial: ", arthx_price_initial.toString(), "USD = 1 ARTHS")
  console.log(" NOTE: - arth_price_from_ARTH_WETH: ", arth_price_from_ARTH_WETH.toString(), "ARTH = 1 WETH")
  console.log(" NOTE: - arth_price_from_ARTH_USDC: ", arth_price_from_ARTH_USDC.toString(), "ARTH = 1 USDC")
  console.log(" NOTE: - arth_price_from_ARTH_USDT: ", arth_price_from_ARTH_USDT.toString(), "ARTH = 1 USDT")
  console.log(" NOTE: - arth_price_from_ARTH_ARTHS: ", arth_price_from_ARTH_ARTHS.toString(), "ARTH = 1 ARTHS")
  console.log(" NOTE: - arthx_price_from_ARTHS_WETH: ", arthx_price_from_ARTHS_WETH.toString(), "ARTHX = 1 WETH")
  console.log(" NOTE: - USDC_price_from_USDC_WETH: ", USDC_price_from_USDC_WETH.toString(), "USDC = 1 WETH")

  console.log(chalk.yellow('\nTransferring some tokens and eth to metamask...'))
  await Promise.all([
    arthxInstance.transfer(DEPLOYER_ADDRESS, new BigNumber("1000e18"), { from: DEPLOYER_ADDRESS }),
    arthInstance.transfer(DEPLOYER_ADDRESS, new BigNumber("1000e18"), { from: DEPLOYER_ADDRESS })
  ])

  console.log(chalk.blue('\nRefreshing collateral ratio...'))
  await arthInstance.refreshCollateralRatio()
}
