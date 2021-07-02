const BigNumber = require('bignumber.js');

const helpers = require('./helpers')
const Faucet = artifacts.require('Faucet');

module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  if (helpers.isMainnet(network)) {
    console.log('\nNot deploying faucet since mainnet\n');
    console.log('\nDeployments done\n');
    return;
  }

  const arth = await helpers.getARTH(network, deployer, artifacts);
  const arthx = await helpers.getARTHX(network, deployer, artifacts);
  const maha = await helpers.getMahaToken(network, deployer, artifacts);
  const usdc = await helpers.getUSDC(network, deployer, artifacts);
  const usdt = await helpers.getUSDT(network, deployer, artifacts);

  console.log('\nDeploying Faucet...');
  await deployer.deploy(
    Faucet,
    [
      arth.address,
      arthx.address,
      maha.address,
      usdc.address,
      usdt.address
    ]
  );

  const faucet = await Faucet.deployed();

  console.log('\nAdd the faucet to tax whitelist');
  arthx.addToTaxWhiteList(faucet.address);

  console.log('\Transfering some tokens to faucet done\n');
  await Promise.all([
    arth.transfer(faucet.address, new BigNumber(10000e18), { from: DEPLOYER_ADDRESS }),
    maha.transfer(faucet.address, new BigNumber(10000e18), { from: DEPLOYER_ADDRESS }),
    arthx.transfer(faucet.address, new BigNumber(10000e18), { from: DEPLOYER_ADDRESS }),
    usdc.transfer(faucet.address, new BigNumber(10000e6), { from: DEPLOYER_ADDRESS }),
    usdt.transfer(faucet.address, new BigNumber(10000e6), { from: DEPLOYER_ADDRESS }),
  ]);

  console.log('\nDeployments done\n');
};
