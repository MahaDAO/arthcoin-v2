const chalk = require('chalk')
const { time } = require('@openzeppelin/test-helpers')

require('dotenv').config()


// const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin")
// const ARTHController = artifacts.require('ArthController')
// const UniswapPairOracleUSDCWETH = artifacts.require("Oracle/Variants/UniswapPairOracleUSDCWETH")
// const UniswapPairOracleUSDTWETH = artifacts.require("Oracle/Variants/UniswapPairOracleUSDTWETH")
// const UniswapPairOracleARTHWETH = artifacts.require("Oracle/Variants/UniswapPairOracleARTHWETH")
// const UniswapPairOracleARTHUSDC = artifacts.require("Oracle/Variants/UniswapPairOracleARTHUSDC")
// const UniswapPairOracleARTHUSDT = artifacts.require("Oracle/Variants/UniswapPairOracleARTHUSDT")
// const UniswapPairOracleARTHARTHX = artifacts.require("Oracle/Variants/UniswapPairOracleARTHARTHX")
// const UniswapPairOracleARTHXWETH = artifacts.require("Oracle/Variants/UniswapPairOracleARTHXWETH")
// const UniswapPairOracleARTHXUSDC = artifacts.require("Oracle/Variants/UniswapPairOracleARTHXUSDC")
// const UniswapPairOracleARTHXUSDT = artifacts.require("Oracle/Variants/UniswapPairOracleARTHXUSDT")


module.exports = async function (deployer, network, accounts) {

  // const DEPLOYER_ADDRESS = accounts[0]

  // const arthInstance = await ARTHStablecoin.deployed()
  // const arthCollateralInstance = await ARTHController.deployed()
  // const oracle_instance_ARTH_WETH = await UniswapPairOracleARTHWETH.deployed()
  // const oracle_instance_ARTH_USDC = await UniswapPairOracleARTHUSDC.deployed()
  // const oracle_instance_ARTH_USDT = await UniswapPairOracleARTHUSDT.deployed()
  // const oracle_instance_USDC_WETH = await UniswapPairOracleUSDCWETH.deployed()
  // const oracle_instance_USDT_WETH = await UniswapPairOracleUSDTWETH.deployed()
  // const oracle_instance_ARTH_ARTHX = await UniswapPairOracleARTHARTHX.deployed()
  // const oracle_instance_ARTHX_WETH = await UniswapPairOracleARTHXWETH.deployed()
  // const oracle_instance_ARTHX_USDC = await UniswapPairOracleARTHXUSDC.deployed()
  // const oracle_instance_ARTHX_USDT = await UniswapPairOracleARTHXUSDT.deployed()

  // // if (process.env.MIGRATION_MODE == 'ganache' || network == 'development') {
  // //   // Advance a few seconds.
  // //   await time.increase(86400 + 10 * 60)
  // //   await time.advanceBlock()
  // // }
  // // else {
  // //   console.log(chalk.red.bold('\nYou need to wait atleast 1 sec here'))

  // //   // TODO: add a wait of 1 sec.
  // // }

  // await Promise.all([
  //   oracle_instance_ARTH_WETH.update({ from: DEPLOYER_ADDRESS }),
  //   oracle_instance_ARTH_USDC.update({ from: DEPLOYER_ADDRESS }),
  //   oracle_instance_ARTH_USDT.update({ from: DEPLOYER_ADDRESS }),
  //   oracle_instance_ARTH_ARTHX.update({ from: DEPLOYER_ADDRESS }),
  //   oracle_instance_ARTHX_WETH.update({ from: DEPLOYER_ADDRESS }),
  //   oracle_instance_ARTHX_USDC.update({ from: DEPLOYER_ADDRESS }),
  //   oracle_instance_ARTHX_USDT.update({ from: DEPLOYER_ADDRESS }),
  //   oracle_instance_USDC_WETH.update({ from: DEPLOYER_ADDRESS }),
  //   oracle_instance_USDT_WETH.update({ from: DEPLOYER_ADDRESS })
  // ])


  // // if (process.env.MIGRATION_MODE == 'ganache' || network == 'development') {
  // //   // Advance 1 hr to catch things up.
  // //   await time.increase(3600 + 1)
  // //   await time.advanceBlock()
  // // }
  // // else {
  // //   console.log(chalk.red.bold('\nYou need to wait atleast 2 days here.'))
  // // }

  // await arthCollateralInstance.refreshCollateralRatio()
}
