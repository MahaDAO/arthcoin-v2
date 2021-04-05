const chalk = require('chalk')
const BigNumber = require('bignumber.js')

require('dotenv').config()
const helpers = require('./helpers')


const ARTHShares = artifacts.require("ARTHX/ARTHShares")
const Timelock = artifacts.require("Governance/Timelock")
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin")


module.exports = async function (deployer, network, accounts) {

  const TIMELOCK_DELAY = 2 * 86400
  const DEPLOYER_ADDRESS = accounts[0]
  const MOCK_TOKEN_INITIAL_SUPPLY = new BigNumber(10000000e18)

  console.log(chalk.yellow('\nDeploying timelock for tokens...'))
  await deployer.deploy(Timelock, DEPLOYER_ADDRESS, TIMELOCK_DELAY)
  const timelockInstance = await Timelock.deployed()

  console.log(chalk.yellow('\nDeploying tokens...'))
  await deployer.deploy(ARTHStablecoin, "Arth", "ARTH", DEPLOYER_ADDRESS, timelockInstance.address)
  const arthInstance = await ARTHStablecoin.deployed()
  let arth_name = await arthInstance.name.call()
  console.log(` - NOTE: ARTH name: ${arth_name}`)

  await deployer.deploy(ARTHShares, "Arth Share", "ARTHX", DEPLOYER_ADDRESS, DEPLOYER_ADDRESS, timelockInstance.address)
  const arthxInstance = await ARTHShares.deployed()
  let arthx_name = await arthxInstance.name.call()
  console.log(` - NOTE: ARTHX name: ${arthx_name}`)

  await helpers.getMahaToken(network, deployer, artifacts)
  await helpers.getWETH(network, deployer, artifacts, DEPLOYER_ADDRESS)
  await helpers.getDAI(network, deployer, artifacts, DEPLOYER_ADDRESS, MOCK_TOKEN_INITIAL_SUPPLY, 'DAI', 6)
  await helpers.getUSDC(network, deployer, artifacts, DEPLOYER_ADDRESS, MOCK_TOKEN_INITIAL_SUPPLY, 'USDC', 6)
  await helpers.getUSDT(network, deployer, artifacts, DEPLOYER_ADDRESS, MOCK_TOKEN_INITIAL_SUPPLY, 'USDT', 6)

  console.log(chalk.yellow('\nSetting appropriate token addresses...'))
  await arthInstance.setARTHXAddress(arthxInstance.address, { from: DEPLOYER_ADDRESS })
}
