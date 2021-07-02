const chalk = require('chalk');
const BigNumber = require('bignumber.js');

const helpers = require('./helpers');

const ARTHController = artifacts.require("ArthController");
const Timelock = artifacts.require("Governance/Timelock");
const Pool_USDC = artifacts.require("Arth/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Arth/Pools/Pool_USDT");
const Pool_WBTC = artifacts.require("Arth/Pools/Pool_WBTC");
const Pool_WMATIC = artifacts.require("Arth/Pools/Pool_WMATIC");
const Pool_WETH = artifacts.require("Arth/Pools/Pool_WETH");
const ArthPoolLibrary = artifacts.require("ArthPoolLibrary");

module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];
  const TEN_MILLION = new BigNumber("1000000e6");

  const timelockInstance = await Timelock.deployed();
  const arth = await helpers.getARTH(network, deployer, artifacts);
  const arthx = await helpers.getARTHX(network, deployer, artifacts);

  const arthControllerInstance = await ARTHController.deployed();
  const mahaTokenInstance = await helpers.getMahaToken(network, deployer, artifacts);
  const col_instance_USDC = await helpers.getUSDC(network, deployer, artifacts);
  const col_instance_USDT = await helpers.getUSDT(network, deployer, artifacts);
  const col_instance_WBTC = await helpers.getWBTC(network, deployer, artifacts);
  const col_instance_WMATIC = await helpers.getWMATIC(network, deployer, artifacts);
  const col_instance_WETH = await helpers.getWETH(network, deployer, artifacts);

  console.log(chalk.yellow('\nDeploying and linking Pools library...'));
  await deployer.deploy(ArthPoolLibrary);
  await deployer.link(
    ArthPoolLibrary, [
    Pool_USDC,
    Pool_USDT,
    Pool_WBTC,
    Pool_WMATIC,
    Pool_WETH,
  ]);

  console.log(chalk.yellow('\nDeploying Pools...'));

  await deployer.deploy(
    Pool_USDC,
    arth.address,
    arthx.address,
    col_instance_USDC.address,
    DEPLOYER_ADDRESS,
    timelockInstance.address,
    mahaTokenInstance.address,
    arthControllerInstance.address,
    TEN_MILLION
  );

  await deployer.deploy(
    Pool_USDT,
    arth.address,
    arthx.address,
    col_instance_USDT.address,
    DEPLOYER_ADDRESS,
    timelockInstance.address,
    mahaTokenInstance.address,
    arthControllerInstance.address,
    TEN_MILLION
  );

  await deployer.deploy(
    Pool_WBTC,
    arth.address,
    arthx.address,
    col_instance_WBTC.address,
    DEPLOYER_ADDRESS,
    timelockInstance.address,
    mahaTokenInstance.address,
    arthControllerInstance.address,
    TEN_MILLION
  );

  await deployer.deploy(
    Pool_WMATIC,
    arth.address,
    arthx.address,
    col_instance_WMATIC.address,
    DEPLOYER_ADDRESS,
    timelockInstance.address,
    mahaTokenInstance.address,
    arthControllerInstance.address,
    TEN_MILLION
  );

  await deployer.deploy(
    Pool_WETH,
    arth.address,
    arthx.address,
    col_instance_WETH.address,
    DEPLOYER_ADDRESS,
    timelockInstance.address,
    mahaTokenInstance.address,
    arthControllerInstance.address,
    TEN_MILLION
  );
};
