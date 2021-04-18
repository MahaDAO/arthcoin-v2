require('dotenv').config()
const chalk = require('chalk')
const BigNumber = require('bignumber.js')

const helpers = require('./helpers')


const Timelock = artifacts.require("Timelock")
const ARTHShares = artifacts.require("ARTHShares")
const ARTHController = artifacts.require("ARTHController")
const ARTHStablecoin = artifacts.require("ARTHStablecoin")


module.exports = async function (deployer, network, accounts) {

  const TIMELOCK_DELAY = 2 * 86400
  const DEPLOYER_ADDRESS = accounts[0]
  const MOCK_TOKEN_INITIAL_SUPPLY = new BigNumber(10000000e18)

  console.log(chalk.yellow('\nDeploying timelock for tokens...'))
  await deployer.deploy(Timelock, DEPLOYER_ADDRESS, TIMELOCK_DELAY)
  const timelockInstance = await Timelock.deployed()

  console.log(chalk.yellow('\nDeploying tokens...'))

  await deployer.deploy(ARTHStablecoin)
  const arthInstance = await ARTHStablecoin.deployed()
  const arthName = await arthInstance.name.call()
  console.log(` - NOTE: ARTH name: ${arthName}`)
  console.log(` - NOTE: ARTH address: ${arthInstance.address}`)

  console.log(chalk.yellow(`\nDeploying ARTH controller...`))
  await deployer.deploy(
    ARTHController,
    DEPLOYER_ADDRESS,
    timelockInstance.address
  )
  const arthControllerInstance = await ARTHController.deployed()
  console.log(` - NOTE: ARTHController address: ${arthControllerInstance.address}`)

  await deployer.deploy(
    ARTHShares,
    "Arth Share",
    "ARTHX",
    DEPLOYER_ADDRESS,  // Temporary address until oracle is deployed.
    DEPLOYER_ADDRESS,
    timelockInstance.address
  )
  const arthxInstance = await ARTHShares.deployed()
  const arthxName = await arthxInstance.name.call()
  console.log(` - NOTE: ARTHX name: ${arthxName}`)
  console.log(` - NOTE: ARTHX address: ${arthxInstance.address}`)

  await helpers.getMahaToken(network, deployer, artifacts)
  await helpers.getDAI(network, deployer, artifacts, DEPLOYER_ADDRESS, MOCK_TOKEN_INITIAL_SUPPLY, 'DAI', 6)
  await helpers.getWETH(network, deployer, artifacts, DEPLOYER_ADDRESS, MOCK_TOKEN_INITIAL_SUPPLY, 'WETH', 6)
  await helpers.getUSDC(network, deployer, artifacts, DEPLOYER_ADDRESS, MOCK_TOKEN_INITIAL_SUPPLY, 'USDC', 6)
  await helpers.getUSDT(network, deployer, artifacts, DEPLOYER_ADDRESS, MOCK_TOKEN_INITIAL_SUPPLY, 'USDT', 6)

  console.log(chalk.yellow('\nSetting appropriate token addresses...'))
  await arthControllerInstance.setARTHXAddress(arthxInstance.address, { from: DEPLOYER_ADDRESS })
}
