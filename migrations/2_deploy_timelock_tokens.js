const chalk = require('chalk');
const helpers = require('./helpers');

const Timelock = artifacts.require("Governance/Timelock");
const ARTHController = artifacts.require("Arth/ArthController");

module.exports = async function (deployer, network, accounts) {
  const TIMELOCK_DELAY = 2 * 86400;
  const DEPLOYER_ADDRESS = accounts[0];

  console.log(chalk.yellow('\nDeploying timelock for tokens...'));
  await deployer.deploy(Timelock, DEPLOYER_ADDRESS, TIMELOCK_DELAY);
  const timelockInstance = await Timelock.deployed();

  console.log(chalk.yellow('\nDeploying tokens...'));
  const arth = await helpers.getARTH();
  const arthx = await helpers.getARTHX();

  console.log(` - NOTE: ARTH name: ${await arth.name.call()}`);
  console.log(` - NOTE: ARTHX name: ${await arthx.name.call()}`);

  const maha = await helpers.getMahaToken(network, deployer, artifacts);

  console.log(chalk.yellow(`\nDeploying ARTH controller...`));
  await deployer.deploy(
    ARTHController,
    arth.address,
    arthx.address,
    maha.address,
    DEPLOYER_ADDRESS,
    timelockInstance.address
  );

  const arthControllerInstance = await ARTHController.deployed();

  await helpers.getDAI(network, deployer, artifacts);
  await helpers.getWETH(network, deployer, artifacts);
  await helpers.getUSDC(network, deployer, artifacts);
  await helpers.getUSDT(network, deployer, artifacts);

  console.log(chalk.yellow('\nSetting appropriate token addresses...'));
  await arth.setArthController(arthControllerInstance.address, { from: DEPLOYER_ADDRESS });
  await arthx.setArthController(arthControllerInstance.address, { from: DEPLOYER_ADDRESS });
};
