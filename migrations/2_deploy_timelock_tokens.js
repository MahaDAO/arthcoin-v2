const chalk = require('chalk');
const BigNumber = require('bignumber.js');

require('dotenv').config();
const helpers = require('./helpers');


const ARTHShares = artifacts.require("ARTHX/ARTHShares");
const Timelock = artifacts.require("Governance/Timelock");
const ARTHController = artifacts.require("Arth/ArthController");
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");
const Genesis = artifacts.require("Genesis")

module.exports = async function (deployer, network, accounts) {

  const TIMELOCK_DELAY = 2 * 86400;
  const DEPLOYER_ADDRESS = accounts[0];
  const MOCK_TOKEN_INITIAL_SUPPLY = new BigNumber(1000e18);

  console.log(chalk.yellow('\nDeploying timelock for tokens...'));
  await deployer.deploy(Timelock, DEPLOYER_ADDRESS, TIMELOCK_DELAY);
  const timelockInstance = await Timelock.deployed();

  console.log(chalk.yellow('\nDeploying tokens...'));
  let arth;
  let arthxInstance //= await ARTHShares.deployed();


  await deployer.deploy(ARTHStablecoin);
  arth = await ARTHStablecoin.deployed();

  await deployer.deploy(
    ARTHShares,
    DEPLOYER_ADDRESS, // Temporary address until oracle is deployed.
    DEPLOYER_ADDRESS,
    timelockInstance.address
  );
  arthxInstance = await ARTHShares.deployed()

  let arthx_name = await arthxInstance.name.call();
  console.log(` - NOTE: ARTHX name: ${arthx_name}`);

  let arth_name = await arth.name.call();
  console.log(` - NOTE: ARTH name: ${arth_name}`);

  console.log(chalk.yellow(`\nDeploying ARTH controller...`));
  await deployer.deploy(
    ARTHController,
    arth.address,
    DEPLOYER_ADDRESS,
    timelockInstance.address
  );

  const arthControllerInstance = await ARTHController.deployed();

  await helpers.getMahaToken(network, deployer, artifacts);
  await helpers.getDAI(network, deployer, artifacts);
  await helpers.getWETH(network, deployer, artifacts);
  await helpers.getUSDC(network, deployer, artifacts);
  await helpers.getUSDT(network, deployer, artifacts);

  console.log(chalk.yellow('\nSetting appropriate token addresses...'));
  await arthControllerInstance.setARTHXAddress(arthxInstance.address, { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('\nDeploying RedeemAlgorithmic Genesis...'));
  // await deployer.deploy(
  //   Genesis,
  //   arth.address,
  //   arthxInstance.address,
  //   arthControllerInstance.address
  // )
};
