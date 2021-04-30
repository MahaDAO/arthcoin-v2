const helpers = require('./helpers')


const ARTHShares = artifacts.require("ARTHShares");
const ARTHPoolRouter = artifacts.require("ArthPoolRouter");
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");


module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  const arthxInstance = await ARTHShares.deployed();
  const arthInstance = await ARTHStablecoin.deployed();
  const wethInstance = await helpers.getWETH(network, deployer, artifacts, DEPLOYER_ADDRESS);
  const routerInstance = await helpers.getUniswapRouter(network, deployer, artifacts);

  console.log('Deploying ARTHPoolRouter vesting...')
  await deployer.deploy(
    ARTHPoolRouter,
    arthxInstance.address,
    arthInstance.address,
    wethInstance.address,
    routerInstance.address
  )

  console.log('\nDeployments done...\n')
}
