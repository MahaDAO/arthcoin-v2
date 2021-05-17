const BigNumber = require('bignumber.js');


const helpers = require('./helpers')


// const Genesis = artifacts.require("Genesis");
// const ARTHShares = artifacts.require("ARTHShares");
const BondingCurve = artifacts.require('BondingCurve');
const ArthController = artifacts.require('ArthController');
// const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");


module.exports = async function (deployer, network) {
  // const arthInstance = await ARTHStablecoin.deployed();
  // const arthxInstance = await ARTHShares.deployed();
  const arthControllerInstance = await ArthController.deployed();
  const bondingCurveInstance = await BondingCurve.deployed();
  // const wethInstance = await helpers.getWETH(network, deployer, artifacts);
  // const mahaInstance = await helpers.getMahaToken(network, deployer, artifacts);
  // const routerInstance = await helpers.getUniswapRouter(network, deployer, artifacts);
  // const ethGmuOracleInstance = await helpers.getChainlinkETHUSDOracle(network, deployer, artifacts);

  console.log('Linking genesis oracle...')
  await arthControllerInstance.setBondingCurve(bondingCurveInstance.address);

  // console.log('Deploying Genesis...')
  // await deployer.deploy(
  //   Genesis,
  //   wethInstance.address,
  //   arthInstance.address,
  //   arthxInstance.address,
  //   mahaInstance.address,
  //   routerInstance.address,
  //   ethGmuOracleInstance.address,
  //   bondingCurveInstance.address,
  //   new BigNumber('100e18'), // Soft cap.
  //   new BigNumber('200e18'), // Hard cap.
  //   Math.floor(Date.now() / 1000), // Start time.
  //   24 * 60 * 60 // Duration.
  // );
}
