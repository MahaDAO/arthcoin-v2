const chalk = require('chalk');
const BigNumber = require('bignumber.js');

require('dotenv').config();
const helpers = require('./helpers');

const ARTHShares = artifacts.require("ARTHX/ARTHShares");
const Timelock = artifacts.require("Governance/Timelock");
const ARTHController = artifacts.require("Arth/ArthController");
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");

module.exports = async function (deployer, network, accounts) {
  const TIMELOCK_DELAY = 2 * 86400;
  const DEPLOYER_ADDRESS = accounts[0];
  const MOCK_TOKEN_INITIAL_SUPPLY = new BigNumber(1000e18);

  console.log(chalk.yellow('\nDeploying timelock for tokens...'));
  await deployer.deploy(Timelock, DEPLOYER_ADDRESS, TIMELOCK_DELAY);
  const timelockInstance = await Timelock.deployed();

  console.log(chalk.yellow('\nDeploying tokens...'));
  await deployer.deploy(ARTHStablecoin);
  const arth = await ARTHStablecoin.deployed();

  await deployer.deploy(ARTHShares);
  const arthx = await ARTHShares.deployed();

  const arthx_name = await arthx.name.call();

  console.log(` - NOTE: ARTHX name: ${arthx_name}`);
  const arth_name = await arth.name.call();
  console.log(` - NOTE: ARTH name: ${arth_name}`);

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
