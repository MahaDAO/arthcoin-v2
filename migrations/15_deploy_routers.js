const helpers = require('./helpers');

const ARTHShares = artifacts.require("ARTHShares");
const ARTHPoolRouter = artifacts.require("ArthPoolRouter");
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");

module.exports = async function (deployer, network) {
  if (network === 'mainnet') return;

  const arth = await ARTHStablecoin.deployed();
  const arthx = await ARTHShares.deployed();
  const weth = await helpers.getWETH(network, deployer, artifacts);
  const routerInstance = await helpers.getUniswapRouter(network, deployer, artifacts);

  console.log('Deploying ARTHPoolRouter vesting...');
  await deployer.deploy(
    ARTHPoolRouter,
    arthx.address,
    arth.address,
    weth.address,
    routerInstance.address
  );

  // TODO: deploy other routers and add them to whitelists.

  const arthPoolRouter = await ARTHPoolRouter.deployed();
  console.log('\nAdd the routers to tax whitelist');
  await Promise.all([
    await arthx.addToTaxWhiteList(arthPoolRouter.address)
  ]);
};
