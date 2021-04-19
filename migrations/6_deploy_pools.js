const chalk = require('chalk')
const BigNumber = require('bignumber.js')

require('dotenv').config()
const helpers = require('./helpers')


const Timelock = artifacts.require("Timelock")
const PoolUSDC = artifacts.require("PoolUSDC")
const PoolUSDT = artifacts.require("PoolUSDT")
const ARTHShares = artifacts.require("ARTHShares")
const ARTHStablecoin = artifacts.require("ARTHStablecoin")
const ARTHController = artifacts.require("ARTHController")
const ARTHPoolLibrary = artifacts.require("ARTHPoolLibrary")
const UniswapPairOracleUSDCWETH = artifacts.require("UniswapPairOracleUSDCWETH")
const UniswapPairOracleUSDTWETH = artifacts.require("UniswapPairOracleUSDTWETH")


module.exports = async function (deployer, network, accounts) {

  const redemptionFee = 400 // 0.04%
  const mintingFee = 300 // 0.03%
  const DEPLOYER_ADDRESS = accounts[0]
  const TEN_MILLION = new BigNumber("1000000e6")
  const ONE_HUNDRED_MILLION = new BigNumber("100000000e6")

  const arthxInstance = await ARTHShares.deployed()
  const timelockInstance = await Timelock.deployed()
  const arthInstance = await ARTHStablecoin.deployed()
  const arthControllerInstance = await ARTHController.deployed()
  const mahaTokenInstance = await helpers.getMahaToken(network, deployer, artifacts)
  const arthMahaOracle = await helpers.getARTHMAHAOracle(network, deployer, artifacts)
  const wethInstance = await helpers.getWETH(network, deployer, artifacts, DEPLOYER_ADDRESS)
  const usdcCollateralInstance = await helpers.getUSDC(
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

  console.log(chalk.yellow('\nDeploying and linking Pools library...'))
  await deployer.deploy(ARTHPoolLibrary)
  await deployer.link(ARTHPoolLibrary, [PoolUSDC, PoolUSDT]);

  console.log(chalk.yellow('\nDeploying Pools...'))
  await Promise.all([
    deployer.deploy(
      PoolUSDC,
      arthInstance.address,
      arthxInstance.address,
      usdcCollateralInstance.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address,
      mahaTokenInstance.address,
      arthMahaOracle.address,
      arthControllerInstance.address,
      TEN_MILLION
    ),
    deployer.deploy(
      PoolUSDT,
      arthInstance.address,
      arthxInstance.address,
      usdtCollateralInstance.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address,
      mahaTokenInstance.address,
      arthMahaOracle.address,
      arthControllerInstance.address,
      TEN_MILLION
    )
  ])

  console.log(chalk.yellow('\nGetting deployed Pool instances...'))
  const poolInstanceUSDC = await PoolUSDC.deployed()
  const poolInstanceUSDT = await PoolUSDT.deployed()

  console.log(chalk.yellow('\nSetting minting and redemtion fee...'))
  await Promise.all([
    arthControllerInstance.setMintingFee(mintingFee, { from: DEPLOYER_ADDRESS }),
    arthControllerInstance.setRedemptionFee(redemptionFee, { from: DEPLOYER_ADDRESS })
  ])

  console.log(chalk.yellow('\nRefreshing pool params...'))
  await Promise.all([
    await poolInstanceUSDC.setPoolParameters(TEN_MILLION, 1, 7500, 7500, 7500, 7500, { from: DEPLOYER_ADDRESS }),
    await poolInstanceUSDT.setPoolParameters(TEN_MILLION, 1, 7500, 7500, 7500, 7500, { from: DEPLOYER_ADDRESS }),
  ])

  console.log(chalk.yellow('\nGetting ARTH and ARTHX oracles...'))
  const oracleInstanceUSDCWETH = await UniswapPairOracleUSDCWETH.deployed()
  const oracleInstanceUSDTWETH = await UniswapPairOracleUSDTWETH.deployed()

  console.log(chalk.yellow('\nLinking Collateral oracles...'))
  await Promise.all([
    poolInstanceUSDC.setCollatETHOracle(oracleInstanceUSDCWETH.address, wethInstance.address, { from: DEPLOYER_ADDRESS }),
    poolInstanceUSDT.setCollatETHOracle(oracleInstanceUSDTWETH.address, wethInstance.address, { from: DEPLOYER_ADDRESS })
  ])
}
