require('dotenv').config()
const chalk = require('chalk')
const BigNumber = require('bignumber.js')

const helpers = require('./helpers')


const ARTHShares = artifacts.require("ARTHShares")
const SwapToPrice = artifacts.require("SwapToPrice")
const ARTHStablecoin = artifacts.require("ARTHStablecoin")


module.exports = async function (deployer, network, accounts) {

  const DEPLOYER_ADDRESS = accounts[0]
  const ONE_HUNDRED_MILLION = new BigNumber("100000000e6")

  const arthxInstance = await ARTHShares.deployed()
  const arthInstance = await ARTHStablecoin.deployed()
  const routerInstance = await helpers.getUniswapRouter(network, deployer, artifacts)
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
  const usdtCollateralInstance = await helpers.getUSDT(
    network,
    deployer,
    artifacts,
    DEPLOYER_ADDRESS,
    ONE_HUNDRED_MILLION,
    'USDT',
    6
  )

  console.log(chalk.yellow('\nDeploying SwapToPrice'))
  await deployer.deploy(SwapToPrice, uniswapFactoryInstance.address, routerInstance.address);

  console.log(chalk.yellow('\nSetting uniswap pairs...'))
  console.log(chalk.yellow(' - Setting Pair including ARTH...'))

  await Promise.all([
    uniswapFactoryInstance.createPair(
      arthInstance.address,
      wethInstance.address,
      { from: DEPLOYER_ADDRESS }
    ),
    uniswapFactoryInstance.createPair(
      arthInstance.address,
      usdcCollateralInstance.address,
      { from: DEPLOYER_ADDRESS }
    ),
    uniswapFactoryInstance.createPair(
      arthInstance.address,
      usdtCollateralInstance.address,
      { from: DEPLOYER_ADDRESS }
    ),
    uniswapFactoryInstance.createPair(
      arthInstance.address,
      arthxInstance.address,
      { from: DEPLOYER_ADDRESS }
    )
  ])

  console.log(chalk.yellow(' - Setting Pair including ARTHX...'))
  await Promise.all([
    uniswapFactoryInstance.createPair(
      arthxInstance.address,
      wethInstance.address,
      { from: DEPLOYER_ADDRESS }
    ),
    uniswapFactoryInstance.createPair(
      arthxInstance.address,
      usdcCollateralInstance.address,
      { from: DEPLOYER_ADDRESS }
    ),
    uniswapFactoryInstance.createPair(
      arthxInstance.address,
      usdtCollateralInstance.address,
      { from: DEPLOYER_ADDRESS }
    )
  ])

  if (!helpers.isMainnet(network)) {
    await uniswapFactoryInstance.createPair(
      usdcCollateralInstance.address,
      wethInstance.address,
      { from: DEPLOYER_ADDRESS }
    )
    await uniswapFactoryInstance.createPair(
      usdtCollateralInstance.address,
      wethInstance.address,
      { from: DEPLOYER_ADDRESS }
    )
  }

  console.log(chalk.yellow('\nApproving uniswap pairs....'))
  await Promise.all([
    wethInstance.approve(routerInstance.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
    usdcCollateralInstance.approve(routerInstance.address, new BigNumber(2000000e6), { from: DEPLOYER_ADDRESS }),
    usdtCollateralInstance.approve(routerInstance.address, new BigNumber(2000000e6), { from: DEPLOYER_ADDRESS }),
    arthInstance.approve(routerInstance.address, new BigNumber(1000000e18), { from: DEPLOYER_ADDRESS }),
    arthxInstance.approve(routerInstance.address, new BigNumber(5000000e18), { from: DEPLOYER_ADDRESS })
  ])

  console.log(chalk.yellow('\nAdding liquidity to pairs...'))
  await Promise.all([
    // ARTH / WETH
    routerInstance.addLiquidity(
      arthInstance.address,
      wethInstance.address,
      new BigNumber(600e18),
      new BigNumber(1e18),
      new BigNumber(600e18),
      new BigNumber(1e18),
      DEPLOYER_ADDRESS,
      new BigNumber(2105300114),
      { from: DEPLOYER_ADDRESS }
    ),
    // ARTH / USDC
    routerInstance.addLiquidity(
      arthInstance.address,
      usdcCollateralInstance.address,
      new BigNumber(100e18),
      new BigNumber(100e6),
      new BigNumber(100e18),
      new BigNumber(100e6),
      DEPLOYER_ADDRESS,
      new BigNumber(2105300114),
      { from: DEPLOYER_ADDRESS }
    ),
    // ARTH / USDT
    routerInstance.addLiquidity(
      arthInstance.address,
      usdtCollateralInstance.address,
      new BigNumber(100e18),
      new BigNumber(100e6),
      new BigNumber(100e18),
      new BigNumber(100e6),
      DEPLOYER_ADDRESS,
      new BigNumber(2105300114),
      { from: DEPLOYER_ADDRESS }
    ),
    // ARTH / ARTHX.
    routerInstance.addLiquidity(
      arthxInstance.address,
      arthInstance.address,
      new BigNumber(133333e15),
      new BigNumber(100e18),
      new BigNumber(133333e15),
      new BigNumber(100e18),
      DEPLOYER_ADDRESS,
      new BigNumber(2105300114),
      { from: DEPLOYER_ADDRESS }
    ),
    // ARTHX / WETH
    routerInstance.addLiquidity(
      arthxInstance.address,
      wethInstance.address,
      new BigNumber(800e18),
      new BigNumber(1e18),
      new BigNumber(800e18),
      new BigNumber(1e18),
      DEPLOYER_ADDRESS,
      new BigNumber(2105300114),
      { from: DEPLOYER_ADDRESS }
    ),
    // ARTHX / USDC
    routerInstance.addLiquidity(
      arthxInstance.address,
      usdcCollateralInstance.address,
      new BigNumber(133333e15),
      new BigNumber(100e6),
      new BigNumber(133333e15),
      new BigNumber(100e6),
      DEPLOYER_ADDRESS,
      new BigNumber(2105300114),
      { from: DEPLOYER_ADDRESS }
    ),
    // ARTHX / USDT
    routerInstance.addLiquidity(
      arthxInstance.address,
      usdtCollateralInstance.address,
      new BigNumber(133333e15),
      new BigNumber(100e6),
      new BigNumber(133333e15),
      new BigNumber(100e6),
      DEPLOYER_ADDRESS,
      new BigNumber(2105300114),
      { from: DEPLOYER_ADDRESS }
    )
  ])

  if (!helpers.isMainnet(network)) {
    await routerInstance.addLiquidity(
      usdcCollateralInstance.address,
      wethInstance.address,
      new BigNumber(600000e6),
      new BigNumber(1000e18),
      new BigNumber(600000e6),
      new BigNumber(1000e18),
      DEPLOYER_ADDRESS,
      new BigNumber(2105300114),
      { from: DEPLOYER_ADDRESS }
    )

    await routerInstance.addLiquidity(
      usdtCollateralInstance.address,
      wethInstance.address,
      new BigNumber(600000e6),
      new BigNumber(1000e18),
      new BigNumber(600000e6),
      new BigNumber(1000e18),
      DEPLOYER_ADDRESS,
      new BigNumber(2105300114),
      { from: DEPLOYER_ADDRESS }
    )
  }
}
