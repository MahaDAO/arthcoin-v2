require('dotenv').config()
const chalk = require('chalk')
const BigNumber = require('bignumber.js')

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
  const poolInstanceUSDC = await PoolUSDC.deployed()
  const poolInstanceUSDT = await PoolUSDT.deployed()
  const arthControllerInstance = await ARTHController.deployed()
  const oracleInstanceARTHWETH = await UniswapPairOracleARTHWETH.deployed()
  const oracleInstanceARTHUSDC = await UniswapPairOracleARTHUSDC.deployed()
  const oracleInstanceARTHUSDT = await UniswapPairOracleARTHUSDT.deployed()
  const oracleInstanceUSDCWETH = await UniswapPairOracleUSDCWETH.deployed()
  const oracleInstanceARTHARTHX = await UniswapPairOracleARTHARTHX.deployed()
  const oracleInstanceARTHXWETH = await UniswapPairOracleARTHXWETH.deployed()
  const wethInstance = await helpers.getWETH(network, deployer, artifacts, DEPLOYER_ADDRESS)

  console.log(chalk.yellow('\nLinking collateral pools to arth contract...'))
  await arthInstance.addPool(poolInstanceUSDC.address, { from: DEPLOYER_ADDRESS })
  await arthInstance.addPool(poolInstanceUSDT.address, { from: DEPLOYER_ADDRESS })

  console.log(chalk.yellow('\nSetting ARTH address within ARTHX...'))
  await arthxInstance.setARTHAddress(arthInstance.address, { from: DEPLOYER_ADDRESS })

  console.log(chalk.yellow('\nSome oracle prices are: '))
  const arthPriceInitial = new BigNumber(
    await arthControllerInstance.getARTHPrice({ from: DEPLOYER_ADDRESS })
  ).div(BIG6)
  const arthxPriceInitial = new BigNumber(
    await arthControllerInstance.getARTHXPrice({ from: DEPLOYER_ADDRESS })
  ).div(BIG6)
  const arthPriceFromARTHWETH = new BigNumber(
    await oracleInstanceARTHWETH.consult.call(wethInstance.address, 1e6)
  ).div(BIG6)

  const arthPriceFromARTHARTHX = new BigNumber(
    await oracleInstanceARTHARTHX.consult.call(arthxInstance.address, 1e6)
  ).div(BIG6)
  const arthxPriceFromARTHXWETH = new BigNumber(
    await oracleInstanceARTHXWETH.consult.call(wethInstance.address, 1e6)
  ).div(BIG6)
  const arthPriceFromARTHUSDC = new BigNumber(
    await oracleInstanceARTHUSDC.consult.call(arthInstance.address, new BigNumber("1e18"))
  ).div(BIG6)
  const arthPriceFromARTHUSDT = new BigNumber(
    await oracleInstanceARTHUSDT.consult.call(arthInstance.address, new BigNumber("1e18"))
  ).div(BIG6)
  const usdcPriceFromUSDCWETH = new BigNumber(
    await oracleInstanceUSDCWETH.consult.call(wethInstance.address, new BigNumber("1e18"))
  ).div(BIG6)

  console.log(" NOTE: - ARTH Price Initial: ", arthPriceInitial.toString(), "USD = 1 ARTH")
  console.log(" NOTE: - ARTHX Price Initial: ", arthxPriceInitial.toString(), "USD = 1 ARTHX")
  console.log(" NOTE: - ARTH Price From ARTHWETH: ", arthPriceFromARTHWETH.toString(), "ARTH = 1 WETH")
  console.log(" NOTE: - ARTH Price From ARTHUSDC: ", arthPriceFromARTHUSDC.toString(), "ARTH = 1 USDC")
  console.log(" NOTE: - ARTH Price From ARTHUSDT: ", arthPriceFromARTHUSDT.toString(), "ARTH = 1 USDT")
  console.log(" NOTE: - ARTH Price From ARTHARTHX: ", arthPriceFromARTHARTHX.toString(), "ARTH = 1 ARTHX")
  console.log(" NOTE: - ARTHX Price From ARTHXWETH: ", arthxPriceFromARTHXWETH.toString(), "ARTHX = 1 WETH")
  console.log(" NOTE: - USDC Price From USDCWETH: ", usdcPriceFromUSDCWETH.toString(), "USDC = 1 WETH")

  console.log(chalk.yellow('\nTransferring some tokens and eth to metamask...'))
  await Promise.all([
    arthxInstance.transfer(DEPLOYER_ADDRESS, new BigNumber("1000e18"), { from: DEPLOYER_ADDRESS }),
    arthInstance.transfer(DEPLOYER_ADDRESS, new BigNumber("1000e18"), { from: DEPLOYER_ADDRESS })
  ])

  console.log(chalk.blue('\nRefreshing collateral ratio...'))
  await arthControllerInstance.refreshCollateralRatio()
}
