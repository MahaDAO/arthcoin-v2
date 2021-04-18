require('dotenv').config()
const chalk = require('chalk')
const BigNumber = require('bignumber.js')

const helpers = require('./helpers')


const Timelock = artifacts.require("Timelock")
const ARTHShares = artifacts.require("ARTHShares")
const ARTHStablecoin = artifacts.require("ARTHStablecoin")
const StakeARTHWETH = artifacts.require("StakeARTHWETH.sol")
const StakeARTHUSDC = artifacts.require("StakeARTHUSDC.sol")
const StakeARTHARTHX = artifacts.require("StakeARTHARTHX.sol")
const StakeARTHXWETH = artifacts.require("StakeARTHXWETH.sol")


module.exports = async function (deployer, network, accounts) {

  const DEPLOYER_ADDRESS = accounts[0]
  const ONE_HUNDRED_MILLION = new BigNumber("100000000e6")

  const arthxInstance = await ARTHShares.deployed()
  const timelockInstance = await Timelock.deployed()
  const arthInstance = await ARTHStablecoin.deployed()
  const uniswapFactoryInstance = await helpers.getUniswapFactory(network, deployer, artifacts)
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

  console.log(chalk.yellow('\nGetting created uniswap pair addresses...'))
  const pairAddrARTHWETH = await uniswapFactoryInstance.getPair(
    arthInstance.address,
    wethInstance.address,
    { from: DEPLOYER_ADDRESS }
  )
  const pairAddrARTHARTHX = await uniswapFactoryInstance.getPair(
    arthInstance.address,
    arthxInstance.address,
    { from: DEPLOYER_ADDRESS }
  )
  const pairAddrARTHXWETH = await uniswapFactoryInstance.getPair(
    arthxInstance.address,
    wethInstance.address,
    { from: DEPLOYER_ADDRESS }
  )
  const pairAddrARTHUSDC = await uniswapFactoryInstance.getPair(
    arthInstance.address,
    usdcCollateralInstance.address,
    { from: DEPLOYER_ADDRESS }
  )

  console.log(chalk.yellow('\nDeploying staking contracts...'))
  await Promise.all([
    deployer.deploy(
      StakeARTHWETH,
      DEPLOYER_ADDRESS,
      DEPLOYER_ADDRESS,
      arthxInstance.address,
      pairAddrARTHWETH,
      arthInstance.address,
      timelockInstance.address,
      500000
    ),
    deployer.deploy(
      StakeARTHUSDC,
      DEPLOYER_ADDRESS,
      DEPLOYER_ADDRESS,
      arthxInstance.address,
      pairAddrARTHUSDC,
      arthInstance.address,
      timelockInstance.address,
      500000
    ),
    deployer.deploy(
      StakeARTHARTHX,
      DEPLOYER_ADDRESS,
      DEPLOYER_ADDRESS,
      arthxInstance.address,
      pairAddrARTHARTHX,
      arthInstance.address,
      timelockInstance.address,
      0
    ),
    deployer.deploy(
      StakeARTHXWETH,
      DEPLOYER_ADDRESS,
      DEPLOYER_ADDRESS,
      arthxInstance.address,
      pairAddrARTHXWETH,
      arthInstance.address,
      timelockInstance.address,
      0
    )
  ])

  const stakingInstanceARTHWETH = await StakeARTHWETH.deployed()
  const stakingInstanceARTHUSDC = await StakeARTHUSDC.deployed()
  const stakingInstanceARTHARTHX = await StakeARTHARTHX.deployed()
  const stakingInstanceARTHXWETH = await StakeARTHXWETH.deployed()

  console.log(chalk.yellow('\nTransfering ARTHX to staking contracts...'))
  await Promise.all([
    arthxInstance.transfer(
      stakingInstanceARTHWETH.address, ONE_HUNDRED_MILLION, { from: DEPLOYER_ADDRESS }),
    arthxInstance.transfer(stakingInstanceARTHUSDC.address, ONE_HUNDRED_MILLION, { from: DEPLOYER_ADDRESS }),
    arthxInstance.transfer(stakingInstanceARTHARTHX.address, ONE_HUNDRED_MILLION, { from: DEPLOYER_ADDRESS }),
    arthxInstance.transfer(stakingInstanceARTHXWETH.address, ONE_HUNDRED_MILLION, { from: DEPLOYER_ADDRESS })
  ])
}
