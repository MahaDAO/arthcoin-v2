const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const constants = require(path.join(__dirname, '../src/types/constants'));

const BigNumber = require('bignumber.js');
// require('@openzeppelin/test-helpers/configure')({
//   provider: process.env.NETWORK_ENDPOINT,
// });

const { expectEvent, send, shouldFail, time } = require('@openzeppelin/test-helpers');
const BIG6 = new BigNumber("1e6");
const BIG12 = new BigNumber("1e12");
const BIG18 = new BigNumber("1e18");
const chalk = require('chalk');

const Address = artifacts.require("Utils/Address");
const BlockMiner = artifacts.require("Utils/BlockMiner");
const MigrationHelper = artifacts.require("Utils/MigrationHelper");
const StringHelpers = artifacts.require("Utils/StringHelpers");
const Math = artifacts.require("Math/Math");
const SafeMath = artifacts.require("Math/SafeMath");
const Babylonian = artifacts.require("Math/Babylonian");
const FixedPoint = artifacts.require("Math/FixedPoint");
const UQ112x112 = artifacts.require("Math/UQ112x112");
const Owned = artifacts.require("Staking/Owned");
const ERC20 = artifacts.require("ERC20/ERC20");
const ERC20Custom = artifacts.require("ERC20/ERC20Custom");
const SafeERC20 = artifacts.require("ERC20/SafeERC20");

// Uniswap related
const TransferHelper = artifacts.require("Uniswap/TransferHelper");
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");
const UniswapV2ERC20 = artifacts.require("Uniswap/UniswapV2ERC20");
const UniswapV2Factory = artifacts.require("Uniswap/UniswapV2Factory");
const UniswapV2Library = artifacts.require("Uniswap/UniswapV2Library");
const UniswapV2OracleLibrary = artifacts.require("Uniswap/UniswapV2OracleLibrary");
const UniswapV2Pair = artifacts.require("Uniswap/UniswapV2Pair");
const UniswapV2Router02 = artifacts.require("Uniswap/UniswapV2Router02");
const UniswapV2Router02_Modified = artifacts.require("Uniswap/UniswapV2Router02_Modified");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT");


// Collateral Pools
const ArthPoolLibrary = artifacts.require("Arth/Pools/ArthPoolLibrary");
const Pool_USDC = artifacts.require("Arth/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Arth/Pools/Pool_USDT");


// Oracles
const UniswapPairOracle_ARTH_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_WETH");
const UniswapPairOracle_ARTH_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_USDC");
const UniswapPairOracle_ARTH_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_USDT");

const UniswapPairOracle_ARTH_FXS = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_FXS");
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");
const UniswapPairOracle_FXS_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDT");

const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");
const UniswapPairOracle_USDT_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDT_WETH");


// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest");

// ARTH core
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");
const ARTHShares = artifacts.require("FXS/ARTHShares");
const TokenVesting = artifacts.require("FXS/TokenVesting");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// Staking contracts
const StakingRewards_ARTH_WETH = artifacts.require("Staking/Variants/Stake_ARTH_WETH.sol");
const StakingRewards_ARTH_USDC = artifacts.require("Staking/Variants/Stake_ARTH_USDC.sol");
const StakingRewards_ARTH_FXS = artifacts.require("Staking/Variants/Stake_ARTH_FXS.sol");
const StakingRewards_FXS_WETH = artifacts.require("Staking/Variants/Stake_FXS_WETH.sol");

const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";

// Make sure Ganache is running beforehand
module.exports = async function (deployer, network, accounts) {
  const IS_MAINNET = (process.env.MIGRATION_MODE == 'mainnet');

  // ======== Set the addresses ========

  const COLLATERAL_ARTH_AND_FXS_OWNER = accounts[1];
  const ORACLE_ADDRESS = accounts[2];
  const POOL_CREATOR = accounts[3];
  const TIMELOCK_ADMIN = accounts[4];
  const GOVERNOR_GUARDIAN_ADDRESS = accounts[5];
  const STAKING_OWNER = accounts[6];
  const STAKING_REWARDS_DISTRIBUTOR = accounts[7];
  // const COLLATERAL_ARTH_AND_FXS_OWNER = accounts[8];

  // ======== Set other constants ========

  const ONE_MILLION_DEC18 = new BigNumber("1000000e18");
  const FIVE_MILLION_DEC18 = new BigNumber("5000000e18");
  const TEN_MILLION_DEC18 = new BigNumber("10000000e18");
  const ONE_HUNDRED_MILLION_DEC18 = new BigNumber("100000000e18");
  const ONE_BILLION_DEC18 = new BigNumber("1000000000e18");
  const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);

  const REDEMPTION_FEE = 400; // 0.04%
  const MINTING_FEE = 300; // 0.03%
  const COLLATERAL_PRICE = 1040000; // $1.04
  const ARTH_PRICE = 980000; // $0.98
  const FXS_PRICE = 210000; // $0.21
  const TIMELOCK_DELAY = 86400 * 2; // 2 days
  const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
  const METAMASK_ADDRESS = process.env.METAMASK_ADDRESS;;

  // ================= Start Initializing =================

  // Get the necessary instances
  let CONTRACT_ADDRESSES;
  let timelockInstance;
  let migrationHelperInstance;
  let arthInstance;
  let fxsInstance;
  let tokenVestingInstance;
  let governanceInstance;
  let wethInstance;
  let col_instance_USDC;
  let col_instance_USDT;

  let routerInstance;
  let uniswapFactoryInstance;
  let swapToPriceInstance;
  let oracle_instance_ARTH_WETH;
  let oracle_instance_ARTH_USDC;
  let oracle_instance_ARTH_USDT;

  let oracle_instance_ARTH_FXS;
  let oracle_instance_FXS_WETH;
  let oracle_instance_FXS_USDC;
  let oracle_instance_FXS_USDT;

  let oracle_instance_USDC_WETH;
  let oracle_instance_USDT_WETH;

  let stakingInstance_ARTH_WETH;
  let stakingInstance_ARTH_USDC;
  let stakingInstance_ARTH_FXS;
  let stakingInstance_FXS_WETH;
  let pool_instance_USDC;
  let pool_instance_USDT;


  // Get the necessary instances
  if (process.env.MIGRATION_MODE == 'ganache') {
    timelockInstance = await Timelock.deployed();
    migrationHelperInstance = await MigrationHelper.deployed()
    governanceInstance = await GovernorAlpha.deployed();
    arthInstance = await ARTHStablecoin.deployed();
    fxsInstance = await ARTHShares.deployed();
    wethInstance = await WETH.deployed();
    col_instance_USDC = await FakeCollateral_USDC.deployed();
    col_instance_USDT = await FakeCollateral_USDT.deployed();

    routerInstance = await UniswapV2Router02_Modified.deployed();
    uniswapFactoryInstance = await UniswapV2Factory.deployed();
    swapToPriceInstance = await SwapToPrice.deployed();
    oracle_instance_ARTH_WETH = await UniswapPairOracle_ARTH_WETH.deployed();
    oracle_instance_ARTH_USDC = await UniswapPairOracle_ARTH_USDC.deployed();
    oracle_instance_ARTH_USDT = await UniswapPairOracle_ARTH_USDT.deployed();

    oracle_instance_ARTH_FXS = await UniswapPairOracle_ARTH_FXS.deployed();
    oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
    oracle_instance_FXS_USDC = await UniswapPairOracle_FXS_USDC.deployed();
    oracle_instance_FXS_USDT = await UniswapPairOracle_FXS_USDT.deployed();

    oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();
    oracle_instance_USDT_WETH = await UniswapPairOracle_USDT_WETH.deployed();

    stakingInstance_ARTH_WETH = await StakingRewards_ARTH_WETH.deployed();
    stakingInstance_ARTH_USDC = await StakingRewards_ARTH_USDC.deployed();
    stakingInstance_ARTH_FXS = await StakingRewards_ARTH_FXS.deployed();
    stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();
    pool_instance_USDC = await Pool_USDC.deployed();
    pool_instance_USDT = await Pool_USDT.deployed();

  }
  else {
    CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
    timelockInstance = await Timelock.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].misc.timelock);
    migrationHelperInstance = await MigrationHelper.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].misc.migration_helper);
    arthInstance = await ARTHStablecoin.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].main.ARTH);
    fxsInstance = await ARTHShares.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].main.FXS);
    governanceInstance = await GovernorAlpha.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].governance);
    wethInstance = await WETH.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].weth);
    col_instance_USDC = await FakeCollateral_USDC.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].collateral.USDC);
    col_instance_USDT = await FakeCollateral_USDT.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].collateral.USDT);

    routerInstance = await UniswapV2Router02.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].uniswap_other.router);
    uniswapFactoryInstance = await UniswapV2Factory.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].uniswap_other.factory);
    swapToPriceInstance = await SwapToPrice.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].pricing.swap_to_price);
    oracle_instance_ARTH_WETH = await UniswapPairOracle_ARTH_WETH.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.ARTH_WETH);
    oracle_instance_ARTH_USDC = await UniswapPairOracle_ARTH_USDC.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.ARTH_USDC);
    oracle_instance_ARTH_USDT = await UniswapPairOracle_ARTH_USDT.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.ARTH_USDT);

    oracle_instance_ARTH_FXS = await UniswapPairOracle_ARTH_FXS.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.ARTH_FXS);
    oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FXS_WETH);
    oracle_instance_FXS_USDC = await UniswapPairOracle_FXS_USDC.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FXS_USDC);
    oracle_instance_FXS_USDT = await UniswapPairOracle_FXS_USDT.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FXS_USDT);

    oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.USDC_WETH);
    oracle_instance_USDT_WETH = await UniswapPairOracle_USDT_WETH.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.USDT_WETH);

    stakingInstance_ARTH_WETH = await StakingRewards_ARTH_WETH.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].staking_contracts["Uniswap ARTH/WETH"]);
    stakingInstance_ARTH_USDC = await StakingRewards_ARTH_USDC.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].staking_contracts["Uniswap ARTH/USDC"]);
    stakingInstance_ARTH_FXS = await StakingRewards_ARTH_FXS.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].staking_contracts["Uniswap ARTH/FXS"]);
    stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].staking_contracts["Uniswap FXS/WETH"]);
    pool_instance_USDC = await Pool_USDC.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].pools.USDC);
    pool_instance_USDT = await Pool_USDT.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].pools.USDT);

  }

  const pair_addr_ARTH_WETH = await uniswapFactoryInstance.getPair(arthInstance.address, wethInstance.address, { from: COLLATERAL_ARTH_AND_FXS_OWNER });
  const pair_addr_ARTH_USDC = await uniswapFactoryInstance.getPair(arthInstance.address, col_instance_USDC.address, { from: COLLATERAL_ARTH_AND_FXS_OWNER });
  const pair_addr_ARTH_FXS = await uniswapFactoryInstance.getPair(arthInstance.address, fxsInstance.address, { from: COLLATERAL_ARTH_AND_FXS_OWNER });
  const pair_addr_FXS_WETH = await uniswapFactoryInstance.getPair(fxsInstance.address, wethInstance.address, { from: COLLATERAL_ARTH_AND_FXS_OWNER });

  // ======== Get various pair instances ========
  console.log(chalk.yellow('===== GET VARIOUS PAIR INSTANCES ====='));
  const pair_instance_ARTH_WETH = await UniswapV2Pair.at(pair_addr_ARTH_WETH);
  const pair_instance_ARTH_USDC = await UniswapV2Pair.at(pair_addr_ARTH_USDC);
  const pair_instance_ARTH_FXS = await UniswapV2Pair.at(pair_addr_ARTH_FXS);
  const pair_instance_FXS_WETH = await UniswapV2Pair.at(pair_addr_FXS_WETH);


  // CONTINUE MAIN DEPLOY CODE HERE
  // ====================================================================================================================
  // ====================================================================================================================

  // ======== Set ARTH collateral pools ========
  console.log(chalk.yellow('===== ARTH COLLATERAL POOL ====='));

  // Link the FAKE collateral pool to the ARTH contract
  await arthInstance.addPool(pool_instance_USDC.address, { from: COLLATERAL_ARTH_AND_FXS_OWNER });
  await arthInstance.addPool(pool_instance_USDT.address, { from: COLLATERAL_ARTH_AND_FXS_OWNER });

  // ======== Set the ARTH address inside of the FXS contract ========
  console.log(chalk.yellow('===== SET ARTH ADDRESS ====='));
  // Link the ARTH contract to the FXS contract
  await fxsInstance.setARTHAddress(arthInstance.address, { from: COLLATERAL_ARTH_AND_FXS_OWNER });

  // ======== Display prices ========
  console.log(chalk.yellow('===== DISPLAY PRICES ====='));

  // Get the prices
  let arth_price_from_ARTH_WETH = (new BigNumber(await oracle_instance_ARTH_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6);
  let arth_price_from_ARTH_USDC = (new BigNumber(await oracle_instance_ARTH_USDC.consult.call(arthInstance.address, new BigNumber("1e18")))).div(BIG6);
  let arth_price_from_ARTH_USDT = (new BigNumber(await oracle_instance_ARTH_USDT.consult.call(arthInstance.address, new BigNumber("1e18")))).div(BIG6);
  let arth_price_from_ARTH_FXS = (new BigNumber(await oracle_instance_ARTH_FXS.consult.call(fxsInstance.address, 1e6))).div(BIG6);

  let fxs_price_from_FXS_WETH = (new BigNumber(await oracle_instance_FXS_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6);
  let USDC_price_from_USDC_WETH = (new BigNumber(await oracle_instance_USDC_WETH.consult.call(wethInstance.address, new BigNumber("1e18")))).div(BIG6);

  const arth_price_initial = new BigNumber(await arthInstance.arth_price({ from: COLLATERAL_ARTH_AND_FXS_OWNER })).div(BIG6);
  const fxs_price_initial = new BigNumber(await arthInstance.fxs_price({ from: COLLATERAL_ARTH_AND_FXS_OWNER })).div(BIG6);

  // Print the new prices
  console.log("arth_price_initial: ", arth_price_initial.toString(), "USD = 1 ARTH");
  console.log("fxs_price_initial: ", fxs_price_initial.toString(), "USD = 1 FXS");
  console.log("arth_price_from_ARTH_WETH: ", arth_price_from_ARTH_WETH.toString(), "ARTH = 1 WETH");
  console.log("arth_price_from_ARTH_USDC: ", arth_price_from_ARTH_USDC.toString(), "ARTH = 1 USDC");
  console.log("arth_price_from_ARTH_USDT: ", arth_price_from_ARTH_USDT.toString(), "ARTH = 1 USDT");
  console.log("arth_price_from_ARTH_FXS: ", arth_price_from_ARTH_FXS.toString(), "ARTH = 1 FXS");
  console.log("fxs_price_from_FXS_WETH: ", fxs_price_from_FXS_WETH.toString(), "FXS = 1 WETH");
  console.log("USDC_price_from_USDC_WETH: ", USDC_price_from_USDC_WETH.toString(), "USDC = 1 WETH");

  // ======== Transfer some tokens and ETH to Metamask ========
  console.log(chalk.yellow('===== TRANSFER SOME TOKENS AND ETH TO METAMASK ====='));

  // ARTH and FXS
  await Promise.all([
    fxsInstance.transfer(METAMASK_ADDRESS, new BigNumber("1000e18"), { from: COLLATERAL_ARTH_AND_FXS_OWNER }),
    arthInstance.transfer(METAMASK_ADDRESS, new BigNumber("1000e18"), { from: COLLATERAL_ARTH_AND_FXS_OWNER })
  ])


  // // Collateral
  // if (!IS_MAINNET){
  // 	await wethInstance.transfer(METAMASK_ADDRESS, new BigNumber("10000e18"), { from: COLLATERAL_ARTH_AND_FXS_OWNER });
  // 	await col_instance_USDC.transfer(METAMASK_ADDRESS, new BigNumber("200000e18"), { from: COLLATERAL_ARTH_AND_FXS_OWNER });
  // 	await col_instance_USDT.transfer(METAMASK_ADDRESS, new BigNumber("200000e18"), { from: COLLATERAL_ARTH_AND_FXS_OWNER });
  // }

  // // Liquidity tokens
  // await Promise.all([
  // 	pair_instance_ARTH_WETH.transfer(METAMASK_ADDRESS, new BigNumber("15e18"), { from: COLLATERAL_ARTH_AND_FXS_OWNER }),
  // 	pair_instance_ARTH_USDC.transfer(METAMASK_ADDRESS, new BigNumber("5e18"), { from: COLLATERAL_ARTH_AND_FXS_OWNER }),
  // 	pair_instance_ARTH_FXS.transfer(METAMASK_ADDRESS, new BigNumber("5e18"), { from: COLLATERAL_ARTH_AND_FXS_OWNER }),
  // 	pair_instance_FXS_WETH.transfer(METAMASK_ADDRESS, new BigNumber("5e18"), { from: COLLATERAL_ARTH_AND_FXS_OWNER })
  // ])



  console.log(chalk.blue('Refreshing collateral ratio'))
  await arthInstance.refreshCollateralRatio();

  // ======== Try arth_info ========
  console.log(chalk.blue('Try arth_info'));
  await arthInstance.arth_info.call();

  // ======== Note the addresses ========
  // If you are testing the frontend, you need to copy-paste the output of CONTRACT_ADDRESSES to the frontend src/misc/constants.tsx
  const hasLibraries = CONTRACT_ADDRESSES && CONTRACT_ADDRESSES[process.env.MIGRATION_MODE] && CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].libraries;
  let CONTRACT_ADDRESSES_FINAL = {
    [process.env.MIGRATION_MODE]: {
      main: {
        ARTH: arthInstance.address,
        FXS: fxsInstance.address,
        vesting: "NOT_DEPLOYED_YET"
      },
      weth: wethInstance.address,
      oracles: {
        ARTH_WETH: oracle_instance_ARTH_WETH.address,
        ARTH_USDC: oracle_instance_ARTH_USDC.address,
        ARTH_USDT: oracle_instance_ARTH_USDT.address,
        ARTH_FXS: oracle_instance_ARTH_FXS.address,
        FXS_WETH: oracle_instance_FXS_WETH.address,
        FXS_USDC: oracle_instance_FXS_USDC.address,
        FXS_USDT: oracle_instance_FXS_USDT.address,
        USDC_WETH: oracle_instance_USDC_WETH.address,
        USDT_WETH: oracle_instance_USDT_WETH.address,
      },
      collateral: {
        USDC: col_instance_USDC.address,
        USDT: col_instance_USDT.address,
      },
      governance: governanceInstance.address,
      pools: {
        USDC: pool_instance_USDC.address,
        USDT: pool_instance_USDT.address,
      },
      uniswap_other: {
        router: routerInstance.address,
        factory: uniswapFactoryInstance.address,
      },
      pricing: {
        swap_to_price: swapToPriceInstance.address
      },
      misc: {
        timelock: timelockInstance.address,
        migration_helper: migrationHelperInstance.address
      },
      libraries: {
        UniswapV2OracleLibrary: (hasLibraries && CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].libraries.UniswapV2OracleLibrary) || "",
        UniswapV2Library: (hasLibraries && CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].libraries.UniswapV2Library) || "",
        ArthPoolLibrary: (hasLibraries && CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].libraries.ArthPoolLibrary) || "",
      },
      pair_tokens: {
        'Uniswap ARTH/WETH': pair_instance_ARTH_WETH.address,
        'Uniswap ARTH/USDC': pair_instance_ARTH_USDC.address,
        'Uniswap ARTH/FXS': pair_instance_ARTH_FXS.address,
        'Uniswap FXS/WETH': pair_instance_FXS_WETH.address,
      },
      staking_contracts: {
        'Uniswap ARTH/WETH': stakingInstance_ARTH_WETH.address,
        'Uniswap ARTH/USDC': stakingInstance_ARTH_USDC.address,
        'Uniswap ARTH/FXS': stakingInstance_ARTH_FXS.address,
        'Uniswap FXS/WETH': stakingInstance_FXS_WETH.address,
      }
    }
  }

  console.log("CONTRACT_ADDRESSES_FINAL: ", CONTRACT_ADDRESSES_FINAL);

  // deployer.deploy(UniswapPairOracle);
  console.log(`==========================================================`);

};
