const chalk = require('chalk');
const BigNumber = require('bignumber.js');

require('dotenv').config();
const helpers = require('./helpers');

const ARTHShares = artifacts.require("ARTHX/ARTHShares");
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");

module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  const arth = await ARTHStablecoin.deployed();
  const arthx = await ARTHShares.deployed();
  const maha = await helpers.getMahaToken(network, deployer, artifacts);
  const weth = await helpers.getWETH(network, deployer, artifacts);
  const uniswapRouter = await helpers.getUniswapRouter(network, deployer, artifacts);
  const uniswapFactory = await helpers.getUniswapFactory(network, deployer, artifacts);

  console.log(chalk.yellow('\nDeploying SwapToPrice'));
  await deployer.deploy(SwapToPrice, uniswapFactory.address, uniswapRouter.address);

  console.log(chalk.yellow('\nCreating uniswap pairs...'));
  await Promise.all([
    uniswapFactory.createPair(arth.address, weth.address, { from: DEPLOYER_ADDRESS }),
    uniswapFactory.createPair(arth.address, maha.address, { from: DEPLOYER_ADDRESS }),
    uniswapFactory.createPair(arthx.address, weth.address, { from: DEPLOYER_ADDRESS }),
  ])
    .catch(e => console.log('error', e))
    .then(() => console.log(chalk.green('\nDone')))

  console.log(chalk.yellow('\nApproving uniswap pairs....'));
  await Promise.all([
    weth.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
    maha.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
    arth.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
    arthx.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS })
  ])
    .catch(e => console.log('error', e))
    .then(() => console.log(chalk.green('\nDone')))

  await weth.deposit({ value: new BigNumber(2e18) })

  console.log(chalk.yellow('\nAdding liquidity to pairs...'));
  await Promise.all([
    // ARTH / WETH
    uniswapRouter.addLiquidity(
      arth.address,
      weth.address,
      new BigNumber(2200e16),
      new BigNumber(1e16),
      new BigNumber(2200e16),
      new BigNumber(1e16),
      DEPLOYER_ADDRESS,
      new BigNumber(9999999999999),
      { from: DEPLOYER_ADDRESS }
    ),
    // ARTHX / WETH
    uniswapRouter.addLiquidity(
      arthx.address,
      weth.address,
      new BigNumber(2200e16),
      new BigNumber(1e16),
      new BigNumber(2200e16),
      new BigNumber(1e16),
      DEPLOYER_ADDRESS,
      new BigNumber(9999999999999),
      { from: DEPLOYER_ADDRESS }
    ),
    // ARTH / MAHA
    uniswapRouter.addLiquidity(
      arth.address,
      maha.address,
      new BigNumber(1000e18),
      new BigNumber(1000e18),
      new BigNumber(1000e18),
      new BigNumber(1000e18),
      DEPLOYER_ADDRESS,
      new BigNumber(9999999999999),
      { from: DEPLOYER_ADDRESS }
    )
  ]);

  /* For testnet's to deploy uniswap oracle */
  if (network != 'mainnet') {
    const usdc = await helpers.getUSDC(network, deployer, artifacts);
    const usdt = await helpers.getUSDT(network, deployer, artifacts);
    const wbtc = await helpers.getWBTC(network, deployer, artifacts);
    const wmatic = await helpers.getWMATIC(network, deployer, artifacts);

    console.log(chalk.yellow('\nCreating USDC/USDT uniswap pairs....'));

    await Promise.all([
      uniswapFactory.createPair(usdc.address, weth.address, { from: DEPLOYER_ADDRESS }),
      uniswapFactory.createPair(usdt.address, weth.address, { from: DEPLOYER_ADDRESS }),
      uniswapFactory.createPair(wbtc.address, weth.address, { from: DEPLOYER_ADDRESS }),
      uniswapFactory.createPair(wmatic.address, weth.address, { from: DEPLOYER_ADDRESS }),
    ])
      .catch(e => console.log('error', e))
      .then(() => console.log(chalk.green('\nDone')))
    console.log(chalk.yellow('\nApproving USDC/USDT uniswap pairs....'));

    await Promise.all([
      weth.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
      usdc.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
      usdt.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
      wbtc.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
      wmatic.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
    ])
      .catch(e => console.log('error', e))
      .then(() => console.log(chalk.green('\nDone')))

    await Promise.all([
      // USDC/WETH
      uniswapRouter.addLiquidity(
        usdc.address,
        weth.address,
        new BigNumber(2200e4),
        new BigNumber(1e4),
        new BigNumber(2200e4),
        new BigNumber(1e4),
        DEPLOYER_ADDRESS,
        new BigNumber(9999999999999),
        { from: DEPLOYER_ADDRESS }
      ),
      // USDT/WETH
      uniswapRouter.addLiquidity(
        usdt.address,
        weth.address,
        new BigNumber(2200e4),
        new BigNumber(1e4),
        new BigNumber(2200e4),
        new BigNumber(1e4),
        DEPLOYER_ADDRESS,
        new BigNumber(9999999999999),
        { from: DEPLOYER_ADDRESS }
      ),
      uniswapRouter.addLiquidity(
        wbtc.address,
        weth.address,
        new BigNumber(2200e6),
        new BigNumber(1e16),
        new BigNumber(2200e6),
        new BigNumber(1e16),
        DEPLOYER_ADDRESS,
        new BigNumber(9999999999999),
        { from: DEPLOYER_ADDRESS }
      ),
      uniswapRouter.addLiquidity(
        wmatic.address,
        weth.address,
        new BigNumber(2200e16),
        new BigNumber(1e16),
        new BigNumber(2200e16),
        new BigNumber(1e16),
        DEPLOYER_ADDRESS,
        new BigNumber(9999999999999),
        { from: DEPLOYER_ADDRESS }
      ),
    ]);
  }
};
