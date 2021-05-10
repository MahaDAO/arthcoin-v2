const helpers = require('./helpers')


const ARTHShares = artifacts.require("ARTHShares");
const ARTHPoolRouter = artifacts.require("ArthPoolRouter");
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");
const MockArth = artifacts.require("MockArth")

module.exports = async function (deployer, network) {
  const arthx = await ARTHShares.deployed();

  let arth
  if (network != 'mainnet') {
    arth = await MockArth.deployed();
  } else {
    arth = await ARTHStablecoin.deployed();
  }

  const weth = await helpers.getWETH(network, deployer, artifacts);
  const routerInstance = await helpers.getUniswapRouter(network, deployer, artifacts);

  console.log('Deploying ARTHPoolRouter vesting...')
  await deployer.deploy(
    ARTHPoolRouter,
    arthx.address,
    arth.address,
    weth.address,
    routerInstance.address
  )

  console.log('\nDeployments done...\n')
}
