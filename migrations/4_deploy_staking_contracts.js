const chalk = require('chalk')
const BigNumber = require('bignumber.js')

require('dotenv').config()
const helpers = require('./helpers')


const ARTHShares = artifacts.require("ARTHS/ARTHShares")
const Timelock = artifacts.require("Governance/Timelock")
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin")
const StakingRewards_ARTH_WETH = artifacts.require("Staking/Variants/Stake_ARTH_WETH.sol")
const StakingRewards_ARTH_USDC = artifacts.require("Staking/Variants/Stake_ARTH_USDC.sol")
const StakingRewards_ARTH_ARTHS = artifacts.require("Staking/Variants/Stake_ARTH_ARTHS.sol")
const StakingRewards_ARTHS_WETH = artifacts.require("Staking/Variants/Stake_ARTHS_WETH.sol")


module.exports = async function (deployer, network, accounts) {

  const DEPLOYER_ADDRESS = accounts[0]
  const ONE_HUNDRED_MILLION = new BigNumber("100000000e6")

  const arthsInstance = await ARTHShares.deployed()
  const timelockInstance = await Timelock.deployed()
  const arthInstance = await ARTHStablecoin.deployed()
  const uniswapFactoryInstance = helpers.getUniswapFactory(network, deployer, artifacts)
  const wethInstance = await helpers.getWETH(network, deployer, artifacts, DEPLOYER_ADDRESS)
  const col_instance_USDC = await helpers.getUSDC(network, deployer, artifacts, DEPLOYER_ADDRESS, ONE_HUNDRED_MILLION, 'USDC', 6)

  console.log(chalk.yellow('\nGetting created uniswap pair addresses...'))
  const pair_addr_ARTH_WETH = await uniswapFactoryInstance.getPair(arthInstance.address, wethInstance.address, { from: DEPLOYER_ADDRESS })
  const pair_addr_ARTH_ARTHS = await uniswapFactoryInstance.getPair(arthInstance.address, arthsInstance.address, { from: DEPLOYER_ADDRESS })
  const pair_addr_ARTHS_WETH = await uniswapFactoryInstance.getPair(arthsInstance.address, wethInstance.address, { from: DEPLOYER_ADDRESS })
  const pair_addr_ARTH_USDC = await uniswapFactoryInstance.getPair(arthInstance.address, col_instance_USDC.address, { from: DEPLOYER_ADDRESS })

  console.log(chalk.yellow('\nDeploying staking contracts...'))
  await Promise.all([
    deployer.deploy(
      StakingRewards_ARTH_WETH,
      DEPLOYER_ADDRESS,
      DEPLOYER_ADDRESS,
      arthsInstance.address,
      pair_addr_ARTH_WETH,
      ARTHStablecoin.address,
      timelockInstance.address,
      500000
    ),
    deployer.deploy(
      StakingRewards_ARTH_USDC,
      DEPLOYER_ADDRESS,
      DEPLOYER_ADDRESS,
      arthsInstance.address,
      pair_addr_ARTH_USDC,
      ARTHStablecoin.address,
      timelockInstance.address,
      500000
    ),
    deployer.deploy(
      StakingRewards_ARTH_ARTHS,
      DEPLOYER_ADDRESS,
      DEPLOYER_ADDRESS,
      arthsInstance.address,
      pair_addr_ARTH_ARTHS,
      ARTHStablecoin.address,
      timelockInstance.address,
      0
    ),
    deployer.deploy(
      StakingRewards_ARTHS_WETH,
      DEPLOYER_ADDRESS,
      DEPLOYER_ADDRESS,
      arthsInstance.address,
      pair_addr_ARTHS_WETH,
      ARTHStablecoin.address,
      timelockInstance.address,
      0
    )
  ])

  const stakingInstance_ARTH_WETH = await StakingRewards_ARTH_WETH.deployed()
  const stakingInstance_ARTH_USDC = await StakingRewards_ARTH_USDC.deployed()
  const stakingInstance_ARTH_ARTHS = await StakingRewards_ARTH_ARTHS.deployed()
  const stakingInstance_ARTHS_WETH = await StakingRewards_ARTHS_WETH.deployed()

  console.log(chalk.yellow('\nTransfering ARTHS to staking contracts...'))
  await Promise.all([
    arthsInstance.transfer(stakingInstance_ARTH_WETH.address, ONE_HUNDRED_MILLION, { from: METAMASK_ADDRESS }),
    arthsInstance.transfer(stakingInstance_ARTH_USDC.address, ONE_HUNDRED_MILLION, { from: METAMASK_ADDRESS }),
    arthsInstance.transfer(stakingInstance_ARTH_ARTHS.address, ONE_HUNDRED_MILLION, { from: METAMASK_ADDRESS }),
    arthsInstance.transfer(stakingInstance_ARTHS_WETH.address, ONE_HUNDRED_MILLION, { from: METAMASK_ADDRESS })
  ])
}
