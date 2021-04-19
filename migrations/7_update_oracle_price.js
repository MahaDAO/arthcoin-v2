require('dotenv').config()
const chalk = require('chalk')
const { time } = require('@openzeppelin/test-helpers')


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

  const oracleInstanceARTHWETH = await UniswapPairOracleARTHWETH.deployed()
  const oracleInstanceARTHUSDC = await UniswapPairOracleARTHUSDC.deployed()
  const oracleInstanceARTHUSDT = await UniswapPairOracleARTHUSDT.deployed()
  const oracleInstanceUSDCWETH = await UniswapPairOracleUSDCWETH.deployed()
  const oracleInstanceUSDTWETH = await UniswapPairOracleUSDTWETH.deployed()
  const oracleInstanceARTHARTHX = await UniswapPairOracleARTHARTHX.deployed()
  const oracleInstanceARTHXWETH = await UniswapPairOracleARTHXWETH.deployed()
  const oracleInstanceARTHXUSDC = await UniswapPairOracleARTHXUSDC.deployed()
  const oracleInstanceARTHXUSDT = await UniswapPairOracleARTHXUSDT.deployed()

  console.log(chalk.red.bold("\nNormally you'd need to wait 24 hrs here, but temporarily we set smaller duration"))
  // // Advance 24 hrs so the period can be computed.
  // await time.increase(86400 + 1)
  // await time.advanceBlock()

  console.log(chalk.yellow(' - Setting period to 1 sec temporarily'))
  await Promise.all([
    oracleInstanceARTHWETH.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHUSDC.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHUSDT.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHARTHX.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHXWETH.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHXUSDC.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHXUSDT.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    oracleInstanceUSDCWETH.setPeriod(1, { from: DEPLOYER_ADDRESS }),
    oracleInstanceUSDTWETH.setPeriod(1, { from: DEPLOYER_ADDRESS })
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
    oracleInstanceARTHWETH.update({ from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHUSDC.update({ from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHUSDT.update({ from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHARTHX.update({ from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHXWETH.update({ from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHXUSDC.update({ from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHXUSDT.update({ from: DEPLOYER_ADDRESS }),
    oracleInstanceUSDCWETH.update({ from: DEPLOYER_ADDRESS }),
    oracleInstanceUSDTWETH.update({ from: DEPLOYER_ADDRESS })
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
    oracleInstanceARTHWETH.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHUSDC.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHUSDT.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHARTHX.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHXWETH.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHXUSDC.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    oracleInstanceARTHXUSDT.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    oracleInstanceUSDCWETH.setPeriod(3600, { from: DEPLOYER_ADDRESS }),
    oracleInstanceUSDTWETH.setPeriod(3600, { from: DEPLOYER_ADDRESS })
  ])
}
