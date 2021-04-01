const chalk = require('chalk')
const BigNumber = require('bignumber.js')

require('dotenv').config()
const helpers = require('./helpers')


const ARTHShares = artifacts.require("ARTHS/ARTHShares")
const Timelock = artifacts.require("Governance/Timelock")
const Pool_USDC = artifacts.require("Arth/Pools/Pool_USDC")
const Pool_USDT = artifacts.require("Arth/Pools/Pool_USDT")
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin")
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH")
const UniswapPairOracle_USDT_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDT_WETH")


module.exports = async function (deployer, network, accounts) {

  const REDEMPTION_FEE = 400 // 0.04%
  const MINTING_FEE = 300 // 0.03%
  const DEPLOYER_ADDRESS = accounts[0]
  const FIVE_MILLION = new BigNumber("500000e6")
  const ONE_HUNDRED_MILLION = new BigNumber("100000000e6")

  const arthsInstance = await ARTHShares.deployed()
  const timelockInstance = await Timelock.deployed()
  const arthInstance = await ARTHStablecoin.deployed()
  const mahaTokenInstance = await helpers.getMahaToken(network, deployer, artifacts)
  const arthMahaOracle = await helpers.getARTHMAHAOracle(network, deployer, artifacts)
  const wethInstance = await helpers.getWETH(network, deployer, artifacts, DEPLOYER_ADDRESS)
  const col_instance_USDC = await helpers.getUSDC(network, deployer, artifacts, DEPLOYER_ADDRESS, ONE_HUNDRED_MILLION, 'USDC', 6)
  const col_instance_USDT = await helpers.getUSDT(network, deployer, artifacts, DEPLOYER_ADDRESS, ONE_HUNDRED_MILLION, 'USDT', 6)

  console.log(chalk.yellow('\nDeploying Pools...'))
  await Promise.all([
    deployer.deploy(
      Pool_USDC,
      arthInstance.address,
      arthsInstance.address,
      col_instance_USDC.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address,
      mahaTokenInstance.address,
      arthMahaOracle.address,
      FIVE_MILLION
    ),
    deployer.deploy(
      Pool_USDT,
      arthInstance.address,
      arthsInstance.address,
      col_instance_USDT.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address,
      mahaTokenInstance.address,
      arthMahaOracle.address,
      FIVE_MILLION
    )
  ])

  console.log(chalk.yellow('\nGetting deployed Pool instances...'))
  const pool_instance_USDC = await Pool_USDC.deployed()
  const pool_instance_USDT = await Pool_USDT.deployed()

  console.log(chalk.yellow('\nSetting minting and redemtion fee...'))
  await Promise.all([
    arthInstance.setMintingFee(MINTING_FEE, { from: DEPLOYER_ADDRESS }),
    arthInstance.setRedemptionFee(REDEMPTION_FEE, { from: DEPLOYER_ADDRESS })
  ])

  console.log(chalk.yellow('\nRefreshing pool params...'))
  await Promise.all([
    await pool_instance_USDC.setPoolParameters(FIVE_MILLION_DEC6, 7500, 1, 1, 1, 1, 1, { from: DEPLOYER_ADDRESS }),
    await pool_instance_USDT.setPoolParameters(FIVE_MILLION_DEC6, 7500, 1, 1, 1, 1, 1, { from: DEPLOYER_ADDRESS }),
  ])

  console.log(chalk.yellow('\nGetting ARTH and ARTHS oracles...'))
  const oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed()
  const oracle_instance_USDT_WETH = await UniswapPairOracle_USDT_WETH.deployed()

  console.log(chalk.yellow('\nLinking Collateral oracles...'))
  await Promise.all([
    pool_instance_USDC.setCollatETHOracle(oracle_instance_USDC_WETH.address, wethInstance.address, { from: DEPLOYER_ADDRESS }),
    pool_instance_USDT.setCollatETHOracle(oracle_instance_USDT_WETH.address, wethInstance.address, { from: DEPLOYER_ADDRESS })
  ])
}
