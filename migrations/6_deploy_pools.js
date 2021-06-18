require('dotenv').config();
const chalk = require('chalk');
const BigNumber = require('bignumber.js');

const helpers = require('./helpers');

const ARTHShares = artifacts.require("ARTHX/ARTHShares");
const ARTHController = artifacts.require("ArthController");
const Timelock = artifacts.require("Governance/Timelock");
const Pool_USDC = artifacts.require("Arth/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Arth/Pools/Pool_USDT");
const ArthPoolLibrary = artifacts.require("ArthPoolLibrary");
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");
const GenesisUSDC = artifacts.require("GenesisUSDC");
const GenesisUSDT = artifacts.require("GenesisUSDT");
const LotteryRaffle = artifacts.require("LotteryRaffle");

module.exports = async function (deployer, network, accounts) {
  const redemptionFee = 400;  // 0.04%
  const mintingFee = 300;  // 0.03%
  const buybackFee = 300;  // 0.03%

  const DEPLOYER_ADDRESS = accounts[0];
  const TEN_MILLION = new BigNumber("1000000e6");

  const timelockInstance = await Timelock.deployed();
  const arth = await ARTHStablecoin.deployed();
  const arthx = await ARTHShares.deployed();
  const arthControllerInstance = await ARTHController.deployed();
  const mahaTokenInstance = await helpers.getMahaToken(network, deployer, artifacts);
  const col_instance_USDC = await helpers.getUSDC(network, deployer, artifacts);
  const col_instance_USDT = await helpers.getUSDT(network, deployer, artifacts);

  console.log(chalk.yellow('\nDeploying and linking Pools library...'));
  await deployer.deploy(ArthPoolLibrary);
  await deployer.link(ArthPoolLibrary, [Pool_USDC, Pool_USDT, GenesisUSDC, GenesisUSDT]);

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
    )
  ]);

  console.log(chalk.yellow('\nGetting deployed Pool instances...'));
  const pool_instance_USDC = await Pool_USDC.deployed();
  const pool_instance_USDT = await Pool_USDT.deployed();

  console.log(chalk.yellow('\nSetting minting and redemtion fee...'));
  await Promise.all([
    arthControllerInstance.setFeesParameters(mintingFee, buybackFee, redemptionFee, { from: DEPLOYER_ADDRESS })
  ]);

  console.log(chalk.yellow('\nRefreshing pool params...'));
  await Promise.all([
    await pool_instance_USDC.setPoolParameters(TEN_MILLION, 1, { from: DEPLOYER_ADDRESS }),
    await pool_instance_USDT.setPoolParameters(TEN_MILLION, 1, { from: DEPLOYER_ADDRESS }),
  ]);

  console.log(chalk.yellow('\nGetting ARTH and ARTHX oracles...'));
  const usdc_oracle_instance = await helpers.getUSDCOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);
  const usdt_oracle_instance = await helpers.getUSDTOracle(network, deployer, artifacts, DEPLOYER_ADDRESS);

  console.log(chalk.yellow('\nLinking Collateral oracles...'));
  await Promise.all([
    pool_instance_USDC.setCollatGMUOracle(usdc_oracle_instance.address, { from: DEPLOYER_ADDRESS }),
    pool_instance_USDT.setCollatGMUOracle(usdt_oracle_instance.address, { from: DEPLOYER_ADDRESS })
  ]);

  console.log(chalk.yellow('\nAdd the pools to tax whitelist'));
  await Promise.all([
    await arthx.addToTaxWhiteList(pool_instance_USDC.address),
    await arthx.addToTaxWhiteList(pool_instance_USDT.address)
  ]);

  const usdc = await helpers.getUSDC(network, deployer, artifacts);
  const usdt = await helpers.getUSDT(network, deployer, artifacts);

  console.log(chalk.yellow('\nDeploying RedeemAlgorithmic Genesis...'));
  const usdcGenesis = await deployer.deploy(
    GenesisUSDC,
    arth.address,
    arthx.address,
    arthControllerInstance.address,
    usdc.address,
    DEPLOYER_ADDRESS,
    timelockInstance.address,
    pool_instance_USDC.address
  );

  const usdtGenesis = await deployer.deploy(
    GenesisUSDT,
    arth.address,
    arthx.address,
    arthControllerInstance.address,
    usdt.address,
    DEPLOYER_ADDRESS,
    timelockInstance.address,
    pool_instance_USDT.address
  );

  console.log(chalk.yellow('\nDeploying Lottery Contracts...'));
  const Lottery = await deployer.deploy(
    LotteryRaffle,
    [usdcGenesis.address, usdtGenesis.address]
  )

  console.log(chalk.yellow('\nSetting Lottery Contracts in genesis...'))
  await usdtGenesis.setLotteryContract(Lottery.address);
  await usdcGenesis.setLotteryContract(Lottery.address);

  console.log(chalk.yellow('\nLinking Collateral oracles...'));
  await Promise.all([
    usdcGenesis.setCollatGMUOracle(usdc_oracle_instance.address, { from: DEPLOYER_ADDRESS }),
    usdtGenesis.setCollatGMUOracle(usdt_oracle_instance.address, { from: DEPLOYER_ADDRESS })
  ]);
};
