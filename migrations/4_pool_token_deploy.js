const helpers = require('./helpers');
const PoolToken = artifacts.require("PoolToken");
const ARTHShares = artifacts.require("ARTHX/ARTHShares");
const Timelock = artifacts.require("Governance/Timelock");
const { BigNumber } = require('@ethersproject/bignumber');

module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];
  const arthx = await ARTHShares.deployed();
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

  let pool = await PoolToken.deployed()
  const decimals = BigNumber.from(10).pow(18)

  await arthx.transfer(pool.address, decimals.mul(1000), { from: DEPLOYER_ADDRESS })
  await maha.transfer(pool.address, decimals.mul(1000), { from: DEPLOYER_ADDRESS })

  await arthx.setTaxDestination(PoolToken.address)
};
