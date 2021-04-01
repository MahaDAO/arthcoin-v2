const chalk = require('chalk')

require('dotenv').config()


const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH")
const UniswapPairOracle_USDT_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDT_WETH")
const UniswapPairOracle_ARTH_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_WETH")
const UniswapPairOracle_ARTH_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_USDC")
const UniswapPairOracle_ARTH_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_USDT")
const UniswapPairOracle_ARTH_ARTHS = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_ARTHS")
const UniswapPairOracle_ARTHS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHS_WETH")
const UniswapPairOracle_ARTHS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHS_USDC")
const UniswapPairOracle_ARTHS_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHS_USDT")


module.exports = async function (deployer, network, accounts) {

  const METAMASK_ADDRESS = accounts[0]

  const oracle_instance_ARTH_WETH = await UniswapPairOracle_ARTH_WETH.deployed()
  const oracle_instance_ARTH_USDC = await UniswapPairOracle_ARTH_USDC.deployed()
  const oracle_instance_ARTH_USDT = await UniswapPairOracle_ARTH_USDT.deployed()
  const oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed()
  const oracle_instance_USDT_WETH = await UniswapPairOracle_USDT_WETH.deployed()
  const oracle_instance_ARTH_ARTHS = await UniswapPairOracle_ARTH_ARTHS.deployed()
  const oracle_instance_ARTHS_WETH = await UniswapPairOracle_ARTHS_WETH.deployed()
  const oracle_instance_ARTHS_USDC = await UniswapPairOracle_ARTHS_USDC.deployed()
  const oracle_instance_ARTHS_USDT = await UniswapPairOracle_ARTHS_USDT.deployed()

  if (process.env.MIGRATION_MODE == 'ganache' || network == 'development') {
    // Advance a few seconds.
    await time.increase(86400 + 10 * 60)
    await time.advanceBlock()
  }
  else {
    console.log(chalk.red.bold('\nYou need to wait atleast 1 sec here'))

    // TODO: add a wait of 1 sec.
  }

  await Promise.all([
    oracle_instance_ARTH_WETH.update({ from: METAMASK_ADDRESS }),
    oracle_instance_ARTH_USDC.update({ from: METAMASK_ADDRESS }),
    oracle_instance_ARTH_USDT.update({ from: METAMASK_ADDRESS }),
    oracle_instance_ARTH_ARTHS.update({ from: METAMASK_ADDRESS }),
    oracle_instance_ARTHS_WETH.update({ from: METAMASK_ADDRESS }),
    oracle_instance_ARTHS_USDC.update({ from: METAMASK_ADDRESS }),
    oracle_instance_ARTHS_USDT.update({ from: METAMASK_ADDRESS }),
    oracle_instance_USDC_WETH.update({ from: METAMASK_ADDRESS }),
    oracle_instance_USDT_WETH.update({ from: METAMASK_ADDRESS })
  ])


  if (process.env.MIGRATION_MODE == 'ganache' || network == 'development') {
    // Advance 1 hr to catch things up.
    await time.increase(3600 + 1)
    await time.advanceBlock()
  }
  else {
    console.log(chalk.red.bold('\nYou need to wait atleast 2 days here.'))
  }

  await arthInstance.refreshCollateralRatio()
}
