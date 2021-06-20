const chalk = require('chalk');
const BigNumber = require('bignumber.js');

require('dotenv').config();
const helpers = require('./helpers');

const ARTHShares = artifacts.require("ARTHShares");
const SwapToPrice = artifacts.require("SwapToPrice");
const ARTHStablecoin = artifacts.require("ARTHStablecoin");

module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  const arthx = await ARTHShares.deployed();
  const arth = await ARTHStablecoin.deployed();

  const weth = await helpers.getWETH(network, deployer, artifacts);
  const maha = await helpers.getMahaToken(network, deployer, artifacts);
  const uniswapRouter = await helpers.getUniswapRouter(network, deployer, artifacts);
  const uniswapFactory = await helpers.getUniswapFactory(network, deployer, artifacts);

  console.log(chalk.yellow('\nDeploying SwapToPrice'));
  await deployer.deploy(SwapToPrice, uniswapFactory.address, uniswapRouter.address);

  console.log(chalk.yellow('\nCreating ARTH uniswap pairs...'));
  await Promise.all([
    uniswapFactory.createPair(arth.address, arthx.address, { from: DEPLOYER_ADDRESS }),
    uniswapFactory.createPair(arth.address, maha.address, { from: DEPLOYER_ADDRESS }),
  ])
    .catch(e => console.log('error', e))
    .then(() => console.log(chalk.green('\nDone creating ARTH uniswap pairs.')))

  console.log(chalk.yellow('\nApproving uniswap pairs....'));
  await Promise.all([
    maha.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
    arth.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
    arthx.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS })
  ])
    .catch(e => console.log('error', e))
    .then(() => console.log(chalk.green('\nDone approving uniswap pairs')))


  console.log(chalk.yellow('\nAdding liquidity to pairs...'));
  await Promise.all([
    // ARTHX / ARTH
    uniswapRouter.addLiquidity(
      arthx.address,
      arth.address,
      new BigNumber(100e18),
      new BigNumber(1e18),
      new BigNumber(100e18),
      new BigNumber(1e18),
      DEPLOYER_ADDRESS,
      new BigNumber(9999999999999),
      { from: DEPLOYER_ADDRESS }
    ),
    // ARTH / MAHA
    uniswapRouter.addLiquidity(
      arth.address,
      maha.address,
      new BigNumber(1e18),
      new BigNumber(10e18),
      new BigNumber(1e18),
      new BigNumber(10e18),
      DEPLOYER_ADDRESS,
      new BigNumber(9999999999999),
      { from: DEPLOYER_ADDRESS }
    )
  ]);

  /* For testnet's to deploy uniswap oracle */
  if (!helpers.isMainnet(network)) {
    const usdc = await helpers.getUSDC(network, deployer, artifacts);
    const usdt = await helpers.getUSDT(network, deployer, artifacts);
    const wbtc = await helpers.getWBTC(network, deployer, artifacts);
    const wmatic = await helpers.getWMATIC(network, deployer, artifacts);

    console.log(chalk.yellow('\nDepositing eth into weth'));
    await weth.deposit({ value: new BigNumber(4e16) });

    console.log(chalk.yellow('\nCreating collateral uniswap pairs....'));
    await Promise.all([
      uniswapFactory.createPair(usdc.address, weth.address, { from: DEPLOYER_ADDRESS }),
      uniswapFactory.createPair(usdt.address, weth.address, { from: DEPLOYER_ADDRESS }),
      uniswapFactory.createPair(wbtc.address, weth.address, { from: DEPLOYER_ADDRESS }),
      uniswapFactory.createPair(wmatic.address, weth.address, { from: DEPLOYER_ADDRESS }),
    ])
      .catch(e => console.log('error', e))
      .then(() => console.log(chalk.green('\nDone creating collateral uniswap pairs.')))

    console.log(chalk.yellow('\nApproving collateral uniswap pairs....'));
    await Promise.all([
      weth.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
      usdc.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
      usdt.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
      wbtc.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
      wmatic.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
    ])
      .catch(e => console.log('error', e))
      .then(() => console.log(chalk.green('\nDone approving collateral uniswap pairs.')))

    await Promise.all([
      // USDC/WETH
      uniswapRouter.addLiquidity(
        usdc.address,
        weth.address,
        new BigNumber(2200e4),
        new BigNumber(1e16),
        new BigNumber(2200e4),
        new BigNumber(1e16),
        DEPLOYER_ADDRESS,
        new BigNumber(9999999999999),
        { from: DEPLOYER_ADDRESS }
      ),
      // USDT/WETH
      uniswapRouter.addLiquidity(
        usdt.address,
        weth.address,
        new BigNumber(2200e4),
        new BigNumber(1e16),
        new BigNumber(2200e4),
        new BigNumber(1e16),
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
