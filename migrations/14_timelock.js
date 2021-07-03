const Timelock = artifacts.require("Governance/Timelock");

module.exports = async function (deployer, network, accounts) {
  if (network === 'mainnet') return;

  const timelockInstance = await Timelock.deployed();

  timelock_admin_address = await timelockInstance.admin.call();
  console.log("NOTE: - timelock_admin [AFTER]: ", timelock_admin_address);
};
