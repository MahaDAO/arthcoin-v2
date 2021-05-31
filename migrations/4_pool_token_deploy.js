const { BigNumber } = require('@ethersproject/bignumber');

const helpers = require('./helpers');
const PoolToken = artifacts.require("PoolToken");
const ARTHShares = artifacts.require("ARTHX/ARTHShares");
const Timelock = artifacts.require("Governance/Timelock");
const ARTHXTaxController = artifacts.require("ARTHXTaxController");

module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  let arthx = await ARTHShares.deployed();

  const timelockInstance = await Timelock.deployed();
  const maha = await helpers.getMahaToken(network, deployer, artifacts);

  await deployer.deploy(
    PoolToken,
    [
      arthx.address,
      maha.address
    ],
    timelockInstance.address
  );

  let pool = await PoolToken.deployed();
  const decimals = BigNumber.from(10).pow(18);

  await arthx.transfer(pool.address, decimals.mul(1000), { from: DEPLOYER_ADDRESS });
  await maha.transfer(pool.address, decimals.mul(1000), { from: DEPLOYER_ADDRESS });

  console.log(`\nDeploying arthx tax controller...`);
  await deployer.deploy(
    ARTHXTaxController,
    arthx.address,
    (await helpers.getUniswapRouter(network, deployer, artifacts)).address
  );
  const taxController = await ARTHXTaxController.deployed();
  await taxController.setRewardsDestination(pool.address);
  await arthx.setTaxController(taxController.address);

  console.log('\nAdd the pool token to tax whitelist');
  await arthx.addToTaxWhiteList(pool.address);
};
