const BigNumber = require('bignumber.js');

const helpers = require('./helpers')
const Faucet = artifacts.require('Faucet');
const ARTHShares = artifacts.require("ARTHShares");
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");

module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  if (helpers.isMainnet(network)) {
    console.log('\nNot deploying faucet since mainnet\n');
    console.log('\nDeployments done\n');
    return;
  }

  const arthxInstance = await ARTHShares.deployed();
  const arthInstance = await ARTHStablecoin.deployed();
  const mahaInstance = await helpers.getMahaToken(network, deployer, artifacts);
  const usdcInstance = await helpers.getUSDC(network, deployer, artifacts);
  const usdtInstance = await helpers.getUSDT(network, deployer, artifacts);

  console.log('\nDeploying Faucet...')
  await deployer.deploy(
    Faucet,
    [
      arthInstance.address,
      arthxInstance.address,
      mahaInstance.address,
      usdcInstance.address,
      usdtInstance.address
    ]
  );

  const faucet = await Faucet.deployed();

  console.log('\nAdd the faucet to tax whitelist');
  arthxInstance.addToTaxWhiteList(faucet.address);

  console.log('\Transfering some tokens to faucet done\n');
  await Promise.all([
    arthInstance.transfer(faucet.address, new BigNumber(100000e18), { from: DEPLOYER_ADDRESS }),
    mahaInstance.transfer(faucet.address, new BigNumber(100000e18), { from: DEPLOYER_ADDRESS }),
    arthxInstance.transfer(faucet.address, new BigNumber(100000e18), { from: DEPLOYER_ADDRESS }),
    usdcInstance.transfer(faucet.address, new BigNumber(100000e6), { from: DEPLOYER_ADDRESS }),
    usdtInstance.transfer(faucet.address, new BigNumber(100000e6), { from: DEPLOYER_ADDRESS }),
  ]);

  console.log('\nDeployments done\n');
};
