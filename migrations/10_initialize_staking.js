const chalk = require('chalk')

require('dotenv').config()


const StakeARTHWETH = artifacts.require("StakeARTHWETH.sol")
const StakeARTHUSDC = artifacts.require("StakeARTHUSDC.sol")
const StakeARTHARTHX = artifacts.require("StakeARTHARTHX.sol")
const StakeARTHXWETH = artifacts.require("StakeARTHXWETH.sol")


module.exports = async function (deployer, network, accounts) {

  const DEPLOYER_ADDRESS = accounts[0]

  stakingInstance_ARTH_WETH = await StakeARTHWETH.deployed()
  stakingInstance_ARTH_USDC = await StakeARTHUSDC.deployed()
  stakingInstance_ARTH_ARTHX = await StakeARTHARTHX.deployed()
  stakingInstance_ARTHX_WETH = await StakeARTHXWETH.deployed()

  console.log(chalk.yellow.bold('\nInitializing the staking rewards...'))
  await Promise.all([
    stakingInstance_ARTH_WETH.initializeDefault({ from: DEPLOYER_ADDRESS }),
    stakingInstance_ARTH_USDC.initializeDefault({ from: DEPLOYER_ADDRESS }),
  ])
}
