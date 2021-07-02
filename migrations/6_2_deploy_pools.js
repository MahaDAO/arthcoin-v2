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
  await Promise.all([
    deployer.deploy(
      Pool_USDC,
      arth.address,
      arthx.address,
      col_instance_USDC.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address,
      mahaTokenInstance.address,
      arthControllerInstance.address,
      TEN_MILLION
    ),
    deployer.deploy(
      Pool_USDT,
      arth.address,
      arthx.address,
      col_instance_USDT.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address,
      mahaTokenInstance.address,
      arthControllerInstance.address,
      TEN_MILLION
    ),
    deployer.deploy(
      Pool_WBTC,
      arth.address,
      arthx.address,
      col_instance_WBTC.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address,
      mahaTokenInstance.address,
      arthControllerInstance.address,
      TEN_MILLION
    ),
    deployer.deploy(
      Pool_WMATIC,
      arth.address,
      arthx.address,
      col_instance_WMATIC.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address,
      mahaTokenInstance.address,
      arthControllerInstance.address,
      TEN_MILLION
    ),
    deployer.deploy(
      Pool_WETH,
      arth.address,
      arthx.address,
      col_instance_WETH.address,
      DEPLOYER_ADDRESS,
      timelockInstance.address,
      mahaTokenInstance.address,
      arthControllerInstance.address,
      TEN_MILLION
    ),
  ]);

  console.log(chalk.yellow('\nGetting deployed Pool instances...'));
  const pool_instance_USDC = await Pool_USDC.deployed();
  const pool_instance_USDT = await Pool_USDT.deployed();
  const pool_instance_WBTC = await Pool_WBTC.deployed();
  const pool_instance_WMATIC = await Pool_WMATIC.deployed();
  const pool_instance_WETH = await Pool_WETH.deployed();

  console.log(chalk.yellow('\nRefreshing pool params...'));
  await Promise.all([
    await pool_instance_USDC.setPoolParameters(TEN_MILLION, 1, { from: DEPLOYER_ADDRESS }),
    await pool_instance_USDT.setPoolParameters(TEN_MILLION, 1, { from: DEPLOYER_ADDRESS }),
    await pool_instance_WBTC.setPoolParameters(TEN_MILLION, 1, { from: DEPLOYER_ADDRESS }),
    await pool_instance_WMATIC.setPoolParameters(TEN_MILLION, 1, { from: DEPLOYER_ADDRESS }),
    await pool_instance_WETH.setPoolParameters(TEN_MILLION, 1, { from: DEPLOYER_ADDRESS }),
  ]);

  console.log(chalk.yellow('\nGetting ARTH and ARTHX oracles...'));
  const usdc_oracle_instance = await helpers.getUSDCOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  const usdt_oracle_instance = await helpers.getUSDTOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  const wbtc_oracle_instance = await helpers.getWBTCOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  const wmatic_oracle_instance = await helpers.getWMATICOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  const weth_oracle_instance = await helpers.getWETHOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);

  console.log(chalk.yellow('\nLinking Collateral oracles...'));
  await Promise.all([
    pool_instance_USDC.setCollatGMUOracle(usdc_oracle_instance.address, { from: DEPLOYER_ADDRESS }),
    pool_instance_USDT.setCollatGMUOracle(usdt_oracle_instance.address, { from: DEPLOYER_ADDRESS }),
    pool_instance_WBTC.setCollatGMUOracle(wbtc_oracle_instance.address, { from: DEPLOYER_ADDRESS }),
    pool_instance_WMATIC.setCollatGMUOracle(wmatic_oracle_instance.address, { from: DEPLOYER_ADDRESS }),
    pool_instance_WETH.setCollatGMUOracle(weth_oracle_instance.address, { from: DEPLOYER_ADDRESS })
  ]);

  console.log(chalk.yellow('\nAdd the pools to tax whitelist'));
  await arthx.addToTaxWhiteListMultiple([
    pool_instance_USDC.address,
    pool_instance_USDT.address,
    pool_instance_WBTC.address,
    pool_instance_WMATIC.address,
    pool_instance_WETH.address,
  ])
};
