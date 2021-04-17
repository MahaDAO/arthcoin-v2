const chalk = require('chalk')
const { time } = require('@openzeppelin/test-helpers')

require('dotenv').config()
const helpers = require('./helpers')


const UniswapPairOracleARTHWETH = artifacts.require("Oracle/Variants/UniswapPairOracleARTHWETH")
const UniswapPairOracleARTHUSDC = artifacts.require("Oracle/Variants/UniswapPairOracleARTHUSDC")
const UniswapPairOracleARTHUSDT = artifacts.require("Oracle/Variants/UniswapPairOracleARTHUSDT")
const UniswapPairOracleUSDCWETH = artifacts.require("Oracle/Variants/UniswapPairOracleUSDCWETH")
const UniswapPairOracleUSDTWETH = artifacts.require("Oracle/Variants/UniswapPairOracleUSDTWETH")
const UniswapPairOracleARTHARTHX = artifacts.require("Oracle/Variants/UniswapPairOracleARTHARTHX")
const UniswapPairOracleARTHXWETH = artifacts.require("Oracle/Variants/UniswapPairOracleARTHXWETH")
const UniswapPairOracleARTHXUSDC = artifacts.require("Oracle/Variants/UniswapPairOracleARTHXUSDC")
const UniswapPairOracleARTHXUSDT = artifacts.require("Oracle/Variants/UniswapPairOracleARTHXUSDT")


module.exports = async function (deployer, network, accounts) {

  const DEPLOYER_ADDRESS = accounts[0]


  const oracle_instance_ARTH_WETH = await UniswapPairOracleARTHWETH.deployed()
  const oracle_instance_ARTH_USDC = await UniswapPairOracleARTHUSDC.deployed()
  const oracle_instance_ARTH_USDT = await UniswapPairOracleARTHUSDT.deployed()
  const oracle_instance_USDC_WETH = await UniswapPairOracleUSDCWETH.deployed()
  const oracle_instance_USDT_WETH = await UniswapPairOracleUSDTWETH.deployed()
  const oracle_instance_ARTH_ARTHX = await UniswapPairOracleARTHARTHX.deployed()
  const oracle_instance_ARTHX_WETH = await UniswapPairOracleARTHXWETH.deployed()
  const oracle_instance_ARTHX_USDC = await UniswapPairOracleARTHXUSDC.deployed()
  const oracle_instance_ARTHX_USDT = await UniswapPairOracleARTHXUSDT.deployed()

  console.log(chalk.red.bold("\nNormally you'd need to wait 24 hrs here, but temporarily we set smaller duration"))
  // // Advance 24 hrs so the period can be computed.
  // await time.increase(86400 + 1)
  // await time.advanceBlock()

  console.log(chalk.yellow(' - Setting period to 1 sec temporarily'))
  await Promise.all([
    oracle_instance_ARTH_WETH.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTH_USDC.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTH_USDT.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTH_ARTHX.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTHX_WETH.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTHX_USDC.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTHX_USDT.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    oracle_instance_USDC_WETH.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    oracle_instance_USDT_WETH.setPeriod(1, { from: DEPLOYER_ADDRESS })
  ])

  console.log(chalk.yellow('\nUpdating oracle prices...'))
  if (process.env.MIGRATION_MODE == 'ganache' || network == 'development') {
    // Advance a few seconds.
    await time.increase(5)
    await time.advanceBlock()
  }
  else {
    console.log(chalk.red.bold('\nYou need to wait atleast 1 sec here.'))

    // TODO: add a wait time of 1 sec.
  }

  await Promise.all([
    oracle_instance_ARTH_WETH.update({ from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTH_USDC.update({ from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTH_USDT.update({ from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTH_ARTHX.update({ from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTHX_WETH.update({ from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTHX_USDC.update({ from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTHX_USDT.update({ from: DEPLOYER_ADDRESS }),
    oracle_instance_USDC_WETH.update({ from: DEPLOYER_ADDRESS }),
    oracle_instance_USDT_WETH.update({ from: DEPLOYER_ADDRESS })
  ])

  console.log(chalk.yellow('\nSetting the oracle period back to 24 hrs...'))
  if (process.env.MIGRATION_MODE == 'ganache') {
    // Advance a few seconds.
    await time.increase(5)
    await time.advanceBlock()
  }
  else {
    console.log(chalk.red.bold('You need to wait atleast 1 second here.'))

    // TODO: add a wait time of 1 sec.
  }

  await Promise.all([
    oracle_instance_ARTH_WETH.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTH_USDC.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTH_USDT.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTH_ARTHX.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTHX_WETH.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTHX_USDC.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    oracle_instance_ARTHX_USDT.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    oracle_instance_USDC_WETH.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    oracle_instance_USDT_WETH.setPeriod(3600, { from: DEPLOYER_ADDRESS })
  ])
}
