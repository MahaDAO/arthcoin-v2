const helpers = require('./helpers');
const PoolToken = artifacts.require("PoolToken");
const ARTHShares = artifacts.require("ARTHX/ARTHShares");
const Timelock = artifacts.require("Governance/Timelock");


module.exports = async function (deployer, network) {
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
};
