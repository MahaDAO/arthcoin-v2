const chalk = require('chalk');
const BigNumber = require('bignumber.js');

require('dotenv').config();
const helpers = require('./helpers');


const ARTHShares = artifacts.require("ARTHX/ARTHShares");
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");


module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  const arthx = await ARTHShares.deployed();
  const arth = await ARTHStablecoin.deployed();
  const maha = await helpers.getMahaToken(network, deployer, artifacts);
  const weth = await helpers.getWETH(network, deployer, artifacts);

  const uniswapRouter = await helpers.getUniswapRouter(network, deployer, artifacts);
  const uniswapFactory = await helpers.getUniswapFactory(network, deployer, artifacts);

  console.log(chalk.yellow('\nDeploying SwapToPrice'));
  await deployer.deploy(SwapToPrice, uniswapFactory.address, uniswapRouter.address);

  console.log(chalk.yellow('\nSetting uniswap pairs...'));
  console.log(chalk.yellow(' - Setting Pair including ARTH...'));

  await Promise.all([
    uniswapFactory.createPair(arth.address, weth.address, { from: DEPLOYER_ADDRESS }),
    uniswapFactory.createPair(arth.address, maha.address, { from: DEPLOYER_ADDRESS }),
    uniswapFactory.createPair(arthx.address, weth.address, { from: DEPLOYER_ADDRESS }),
  ]).catch(() => console.log('sdf'));

  console.log(chalk.yellow('\nApproving uniswap pairs....'));
  await Promise.all([
    weth.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
    maha.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
    arth.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS }),
    arthx.approve(uniswapRouter.address, new BigNumber(2000000e18), { from: DEPLOYER_ADDRESS })
  ]);

  await weth.deposit({ value: new BigNumber(1e17) })

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
      new BigNumber(1100e16),
      new BigNumber(1e16),
      new BigNumber(1100e16),
      new BigNumber(1e16),
      DEPLOYER_ADDRESS,
      new BigNumber(9999999999999),
      { from: DEPLOYER_ADDRESS }
    ),
    // ARTH / MAHA
    uniswapRouter.addLiquidity(
      arthx.address,
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
};
