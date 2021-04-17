const chalk = require('chalk')

require('dotenv').config()


const StakeARTHWETH = artifacts.require("StakeARTHWETH.sol")
const StakingRewards_ARTH_USDC = artifacts.require("StakeARTHUSDC.sol")
const StakingRewards_ARTH_ARTHX = artifacts.require("StakeARTHARTHX.sol")
const StakingRewards_ARTHX_WETH = artifacts.require("StakeARTHXWETH.sol")


module.exports = async function (deployer, network, accounts) {

  const DEPLOYER_ADDRESS = accounts[0]

  stakingInstance_ARTH_WETH = await StakeARTHWETH.deployed()
  stakingInstance_ARTH_USDC = await StakingRewards_ARTH_USDC.deployed()
  stakingInstance_ARTH_ARTHX = await StakingRewards_ARTH_ARTHX.deployed()
  stakingInstance_ARTHX_WETH = await StakingRewards_ARTHX_WETH.deployed()

  console.log(chalk.yellow.bold('\nInitializing the staking rewards...'))
  await Promise.all([
    stakingInstance_ARTH_WETH.initializeDefault({ from: DEPLOYER_ADDRESS }),
    stakingInstance_ARTH_USDC.initializeDefault({ from: DEPLOYER_ADDRESS }),
  ])
}
