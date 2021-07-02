
const chalk = require('chalk');

const helpers = require('./helpers');

const ARTHController = artifacts.require("ArthController");
const Timelock = artifacts.require("Governance/Timelock");

const ArthPoolLibrary = artifacts.require("ArthPoolLibrary");
const LotteryRaffle = artifacts.require("LotteryRaffle");
const GenesisUSDC = artifacts.require("GenesisUSDC");
const GenesisUSDT = artifacts.require("GenesisUSDT");
const GenesisWBTC = artifacts.require("GenesisWBTC");
const GenesisWMATIC = artifacts.require("GenesisWMATIC");
const GenesisWETH = artifacts.require("GenesisWETH");

const Pool_USDC = artifacts.require("Arth/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Arth/Pools/Pool_USDT");
const Pool_WBTC = artifacts.require("Arth/Pools/Pool_WBTC");
const Pool_WMATIC = artifacts.require("Arth/Pools/Pool_WMATIC");
const Pool_WETH = artifacts.require("Arth/Pools/Pool_WETH");

module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  const timelockInstance = await Timelock.deployed();
  const arth = await helpers.getARTH();
  const arthx = await helpers.getARTHX();

  const arthControllerInstance = await ARTHController.deployed();

  const col_instance_USDC = await helpers.getUSDC(network, deployer, artifacts);
  const col_instance_USDT = await helpers.getUSDT(network, deployer, artifacts);
  const col_instance_WBTC = await helpers.getWBTC(network, deployer, artifacts);
  const col_instance_WMATIC = await helpers.getWMATIC(network, deployer, artifacts);
  const col_instance_WETH = await helpers.getWETH(network, deployer, artifacts);

  console.log(chalk.yellow('\nDeploying and linking Pools library...'));
  await deployer.deploy(ArthPoolLibrary);
  await deployer.link(
    ArthPoolLibrary, [
    GenesisUSDC,
    GenesisUSDT,
    GenesisWBTC,
    GenesisWMATIC,
    GenesisWETH,
  ]);

  console.log(chalk.yellow('\nGetting deployed Pool instances...'));
  const pool_instance_USDC = await Pool_USDC.deployed();
  const pool_instance_USDT = await Pool_USDT.deployed();
  const pool_instance_WBTC = await Pool_WBTC.deployed();
  const pool_instance_WMATIC = await Pool_WMATIC.deployed();
  const pool_instance_WETH = await Pool_WETH.deployed();

  console.log(chalk.yellow('\nDeploying RedeemAlgorithmic Genesis...'));
  const usdcGenesis = await deployer.deploy(
    GenesisUSDC,
    arth.address,
    arthx.address,
    arthControllerInstance.address,
    col_instance_USDC.address,
    DEPLOYER_ADDRESS,
    timelockInstance.address,
    pool_instance_USDC.address
  );

  const usdtGenesis = await deployer.deploy(
    GenesisUSDT,
    arth.address,
    arthx.address,
    arthControllerInstance.address,
    col_instance_USDT.address,
    DEPLOYER_ADDRESS,
    timelockInstance.address,
    pool_instance_USDT.address
  );

  const wbtcGenesis = await deployer.deploy(
    GenesisWBTC,
    arth.address,
    arthx.address,
    arthControllerInstance.address,
    col_instance_WBTC.address,
    DEPLOYER_ADDRESS,
    timelockInstance.address,
    pool_instance_WBTC.address
  );

  const wmaticGenesis = await deployer.deploy(
    GenesisWMATIC,
    arth.address,
    arthx.address,
    arthControllerInstance.address,
    col_instance_WMATIC.address,
    DEPLOYER_ADDRESS,
    timelockInstance.address,
    pool_instance_WMATIC.address
  );

  const wethGenesis = await deployer.deploy(
    GenesisWETH,
    arth.address,
    arthx.address,
    arthControllerInstance.address,
    col_instance_WETH.address,
    DEPLOYER_ADDRESS,
    timelockInstance.address,
    pool_instance_WETH.address
  );

  console.log(chalk.yellow('\nDeploying Lottery Contracts...'));
  const Lottery = await deployer.deploy(
    LotteryRaffle,
    [
      usdcGenesis.address,
      usdtGenesis.address,
      wbtcGenesis.address,
      wmaticGenesis.address,
      wethGenesis.address
    ]
  );

  console.log(chalk.yellow('\nSetting Lottery Contracts in genesis...'));
  await usdtGenesis.setLotteryContract(Lottery.address);
  await usdcGenesis.setLotteryContract(Lottery.address);
  await wbtcGenesis.setLotteryContract(Lottery.address);
  await wmaticGenesis.setLotteryContract(Lottery.address);
  await wethGenesis.setLotteryContract(Lottery.address);

  console.log(chalk.yellow('\nGetting GMU oracles...'));
  const usdc_oracle_instance = await helpers.getUSDCOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  const usdt_oracle_instance = await helpers.getUSDTOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  const wbtc_oracle_instance = await helpers.getWBTCOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  const wmatic_oracle_instance = await helpers.getWMATICOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  const weth_oracle_instance = await helpers.getWETHOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);

  console.log(chalk.yellow('\nLinking Collateral oracles...'));
  await Promise.all([
    usdcGenesis.setCollatGMUOracle(usdc_oracle_instance.address, { from: DEPLOYER_ADDRESS }),
    usdtGenesis.setCollatGMUOracle(usdt_oracle_instance.address, { from: DEPLOYER_ADDRESS }),
    wbtcGenesis.setCollatGMUOracle(wbtc_oracle_instance.address, { from: DEPLOYER_ADDRESS }),
    wmaticGenesis.setCollatGMUOracle(wmatic_oracle_instance.address, { from: DEPLOYER_ADDRESS }),
    wethGenesis.setCollatGMUOracle(weth_oracle_instance.address, { from: DEPLOYER_ADDRESS })
  ]);
};
