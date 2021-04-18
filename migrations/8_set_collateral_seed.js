require('dotenv').config()
const chalk = require('chalk')
const BigNumber = require('bignumber.js')

const helpers = require('./helpers')


const PoolUSDC = artifacts.require("PoolUSDC")
const PoolUSDT = artifacts.require("PoolUSDT")


module.exports = async function (deployer, network, accounts) {

  const DEPLOYER_ADDRESS = accounts[0]
  const ONE_HUNDRED_DEC6 = new BigNumber("100e6")
  const COLLATERAL_SEED_DEC6 = new BigNumber(508500e6)
  const ONE_HUNDRED_MILLION = new BigNumber("100000000e6")

  const poolInstanceUSDC = await PoolUSDC.deployed()
  const poolInstanceUSDT = await PoolUSDT.deployed()
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

  console.log(chalk.yellow("\nSeeding the collateral pools some collateral to start off with..."))
  if (helpers.isMainnet(network)) {
    await Promise.all([
      await usdcCollateralInstance.transfer(poolInstanceUSDC.address, ONE_HUNDRED_DEC6, { from: DEPLOYER_ADDRESS }),
      await usdtCollateralInstance.transfer(poolInstanceUSDT.address, ONE_HUNDRED_DEC6, { from: DEPLOYER_ADDRESS }),
    ])
  }
  else {
    await usdcCollateralInstance.transfer(poolInstanceUSDC.address, COLLATERAL_SEED_DEC6, { from: DEPLOYER_ADDRESS })
    await usdtCollateralInstance.transfer(poolInstanceUSDT.address, COLLATERAL_SEED_DEC6, { from: DEPLOYER_ADDRESS })
  }
}
