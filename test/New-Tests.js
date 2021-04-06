const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:7545');

global.artifacts = artifacts;
global.web3 = web3;

const Address = artifacts.require("Utils/Address");
const BlockMiner = artifacts.require("Utils/BlockMiner");
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
const UniswapV2Router02_Modified = artifacts.require("Uniswap/UniswapV2Router02_Modified");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT");


// Collateral Pools
const Pool_USDC = artifacts.require("Arth/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Arth/Pools/Pool_USDT");


// Oracles
const UniswapPairOracle_ARTH_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_WETH");
const UniswapPairOracle_ARTH_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_USDT");
const UniswapPairOracle_ARTH_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_USDC");

const UniswapPairOracle_ARTHS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHS_WETH");
const UniswapPairOracle_ARTHS_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHS_USDT");
const UniswapPairOracle_ARTHS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHS_USDC");

const UniswapPairOracle_USDT_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDT_WETH");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");


// Chainlink Price Consumer
//const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest");

// ARTH core
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");
const ARTHShares = artifacts.require("ARTHX/ARTHShares");
const StakingRewards_ARTH_WETH = artifacts.require("Staking/Variants/Stake_ARTH_WETH.sol");
const StakingRewards_ARTH_USDC = artifacts.require("Staking/Variants/Stake_ARTH_USDC.sol");
//const StakingRewards_ARTH_USDT = artifacts.require("Staking/Variants/Stake_ARTH_USDT.sol");
// const StakingRewards_ARTH_yUSD = artifacts.require("Staking/Variants/Stake_ARTH_yUSD.sol");
const StakingRewards_ARTHS_WETH = artifacts.require("Staking/Variants/Stake_ARTHS_WETH.sol");
//const StakingRewards_ARTHS_USDC = artifacts.require("Staking/Variants/Stake_ARTHS_USDC.sol");
//const StakingRewards_ARTHS_USDT = artifacts.require("Staking/Variants/Stake_ARTHS_USDT.sol");
// const StakingRewards_ARTHS_yUSD = artifacts.require("Staking/Variants/Stake_ARTHS_yUSD.sol");

// Token vesting
const TokenVesting = artifacts.require("ARTHS/TokenVesting.sol");
// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

const ONE_MILLION_DEC18 = new BigNumber(1000000e18);
const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);
const COLLATERAL_SEED_DEC6 = new BigNumber(508500e6);
const ONE_THOUSAND_DEC18 = new BigNumber(1000e18);
const THREE_THOUSAND_DEC18 = new BigNumber(3000e18);
const THREE_THOUSAND_DEC6 = new BigNumber(3000e6);
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6A24A4EcA5Ed225CeaE6895e071a74344E2853F5";

const REWARDS_DURATION = 7 * 86400; // 7 days

let totalSupplyARTH;
let totalSupplyARTHS;
let globalCollateralRatio;
let globalCollateralValue;

contract('ARTH', async (accounts) => {
  // Constants
  let COLLATERAL_ARTH_AND_ARTHS_OWNER;
  let ORACLE_ADDRESS;
  let POOL_CREATOR;
  let TIMELOCK_ADMIN;
  let GOVERNOR_GUARDIAN_ADDRESS;
  let STAKING_OWNER;
  let STAKING_REWARDS_DISTRIBUTOR;
  // let COLLATERAL_ARTH_AND_ARTHS_OWNER;

  // Initialize core contract instances
  let arthInstance;
  let arthxInstance;

  let vestingInstance;

  // Initialize collateral instances
  let wethInstance;
  let col_instance_USDC;
  let col_instance_USDT;


  // Initialize the Uniswap Router Instance
  let routerInstance;

  // Initialize the Uniswap Factory Instance
  let factoryInstance;

  // Initialize the Uniswap Libraries
  let uniswapLibraryInstance;
  let uniswapOracleLibraryInstance;

  // Initialize the Timelock instance
  let timelockInstance;

  // Initialize the swap to price contract
  let swapToPriceInstance;

  // Initialize oracle instances
  let oracle_instance_ARTH_WETH;
  let oracle_instance_ARTH_USDC;
  let oracle_instance_ARTH_USDT;

  let oracle_instance_ARTHS_WETH;
  let oracle_instance_ARTHS_USDC;
  let oracle_instance_ARTHS_USDT;

  // Initialize ETH-USD Chainlink Oracle too
  let oracle_chainlink_ETH_USD;

  // Initialize the governance contract
  let governanceInstance;

  // Initialize pool instances
  let pool_instance_USDC;
  let pool_instance_USDT;


  // Initialize pair addresses
  let pair_addr_ARTH_WETH;
  let pair_addr_ARTH_USDC;
  let pair_addr_ARTH_USDT;
  let pair_addr_ARTHS_WETH;
  let pair_addr_ARTHS_USDC;
  let pair_addr_ARTHS_USDT;

  // Initialize pair contracts
  let pair_instance_ARTH_WETH;
  let pair_instance_ARTH_USDC;
  let pair_instance_ARTH_USDT;
  let pair_instance_ARTHS_WETH;
  let pair_instance_ARTHS_USDC;
  let pair_instance_ARTHS_USDT;

  // Initialize pair orders
  let artharthx_first_ARTH_WETH;
  let artharthx_first_ARTH_USDC;
  let artharthx_first_ARTH_USDT;
  let artharthx_first_ARTHS_WETH;
  let artharthx_first_ARTHS_USDC;
  let artharthx_first_ARTHS_USDT;

  // Initialize staking instances
  let stakingInstance_ARTH_WETH;
  let stakingInstance_ARTH_USDC;
  //let stakingInstance_ARTH_USDT;
  // let stakingInstance_ARTH_yUSD;
  let stakingInstance_ARTHS_WETH;
  //let stakingInstance_ARTHS_USDC;
  //let stakingInstance_ARTHS_USDT;
  // let stakingInstance_ARTHS_yUSD;

  // Initialize running balances
  let bal_arth = 0;
  let bal_arthx = 0;
  let col_bal_usdc = 0;
  let col_rat = 1;
  let pool_bal_usdc = 0;
  let global_collateral_value = 0;

  beforeEach(async () => {
    // Constants
    COLLATERAL_ARTH_AND_ARTHS_OWNER = accounts[1];
    ORACLE_ADDRESS = accounts[2];
    POOL_CREATOR = accounts[3];
    TIMELOCK_ADMIN = accounts[4];
    GOVERNOR_GUARDIAN_ADDRESS = accounts[5];
    STAKING_OWNER = accounts[6];
    STAKING_REWARDS_DISTRIBUTOR = accounts[7];
    // COLLATERAL_ARTH_AND_ARTHS_OWNER = accounts[8];

    // Fill core contract instances
    arthInstance = await ARTHStablecoin.deployed();
    arthxInstance = await ARTHShares.deployed();

    vestingInstance = await TokenVesting.deployed();

    // Fill collateral instances
    wethInstance = await WETH.deployed();
    col_instance_USDC = await FakeCollateral_USDC.deployed();
    col_instance_USDT = await FakeCollateral_USDT.deployed();

    // Fill the Uniswap Router Instance
    routerInstance = await UniswapV2Router02_Modified.deployed();

    // Fill the Timelock instance
    timelockInstance = await Timelock.deployed();

    // Fill oracle instances
    oracle_instance_ARTH_WETH = await UniswapPairOracle_ARTH_WETH.deployed();
    oracle_instance_ARTH_USDC = await UniswapPairOracle_ARTH_USDC.deployed();
    oracle_instance_ARTH_USDT = await UniswapPairOracle_ARTH_USDT.deployed();

    oracle_instance_ARTHS_WETH = await UniswapPairOracle_ARTHS_WETH.deployed();
    oracle_instance_ARTHS_USDC = await UniswapPairOracle_ARTHS_USDC.deployed();
    oracle_instance_ARTHS_USDT = await UniswapPairOracle_ARTHS_USDT.deployed();

    oracle_instance_USDT_WETH = await UniswapPairOracle_USDT_WETH.deployed();
    oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();


    // Initialize ETH-USD Chainlink Oracle too
    //oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumer.deployed();
    oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumerTest.deployed();

    // Initialize the governance contract
    governanceInstance = await GovernorAlpha.deployed();

    // Fill pool instances
    pool_instance_USDC = await Pool_USDC.deployed();
    pool_instance_USDT = await Pool_USDT.deployed();


    // Initialize the Uniswap Factory Instance
    uniswapFactoryInstance = await UniswapV2Factory.deployed();

    // Initialize the Uniswap Libraries
    uniswapLibraryInstance = await UniswapV2OracleLibrary.deployed();
    uniswapOracleLibraryInstance = await UniswapV2Library.deployed();

    // Initialize the swap to price contract
    swapToPriceInstance = await SwapToPrice.deployed();

    // Get the addresses of the pairs
    pair_addr_ARTH_WETH = await uniswapFactoryInstance.getPair(arthInstance.address, WETH.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    pair_addr_ARTH_USDC = await uniswapFactoryInstance.getPair(arthInstance.address, FakeCollateral_USDC.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    pair_addr_ARTH_USDT = await uniswapFactoryInstance.getPair(arthInstance.address, FakeCollateral_USDT.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    pair_addr_ARTHS_WETH = await uniswapFactoryInstance.getPair(arthxInstance.address, WETH.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    pair_addr_ARTHS_USDC = await uniswapFactoryInstance.getPair(arthxInstance.address, FakeCollateral_USDC.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    pair_addr_ARTHS_USDT = await uniswapFactoryInstance.getPair(arthxInstance.address, FakeCollateral_USDT.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    pair_addr_USDT_WETH = await uniswapFactoryInstance.getPair(FakeCollateral_USDT.address, WETH.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    pair_addr_USDC_WETH = await uniswapFactoryInstance.getPair(FakeCollateral_USDC.address, WETH.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Get instances of the pairs
    pair_instance_ARTH_WETH = await UniswapV2Pair.at(pair_addr_ARTH_WETH);
    pair_instance_ARTH_USDC = await UniswapV2Pair.at(pair_addr_ARTH_USDC);
    pair_instance_ARTH_USDT = await UniswapV2Pair.at(pair_addr_ARTH_USDT);
    pair_instance_ARTHS_WETH = await UniswapV2Pair.at(pair_addr_ARTHS_WETH);
    pair_instance_ARTHS_USDC = await UniswapV2Pair.at(pair_addr_ARTHS_USDC);
    pair_instance_ARTHS_USDT = await UniswapV2Pair.at(pair_addr_ARTHS_USDT);
    pair_instance_USDT_WETH = await UniswapV2Pair.at(pair_addr_USDT_WETH);
    pair_instance_USDC_WETH = await UniswapV2Pair.at(pair_addr_USDC_WETH);

    // Get the pair order results
    artharthx_first_ARTH_WETH = await oracle_instance_ARTH_WETH.token0();
    artharthx_first_ARTH_USDC = await oracle_instance_ARTH_USDC.token0();
    artharthx_first_ARTH_USDT = await oracle_instance_ARTH_USDT.token0();
    artharthx_first_ARTHS_WETH = await oracle_instance_ARTHS_WETH.token0();
    artharthx_first_ARTHS_USDC = await oracle_instance_ARTHS_USDC.token0();
    artharthx_first_ARTHS_USDT = await oracle_instance_ARTHS_USDT.token0();

    artharthx_first_ARTH_WETH = arthInstance.address == artharthx_first_ARTH_WETH;
    artharthx_first_ARTH_USDC = arthInstance.address == artharthx_first_ARTH_USDC;
    artharthx_first_ARTH_USDT = arthInstance.address == artharthx_first_ARTH_USDT;
    artharthx_first_ARTHS_WETH = arthxInstance.address == artharthx_first_ARTHS_WETH;
    artharthx_first_ARTHS_USDC = arthxInstance.address == artharthx_first_ARTHS_USDC;
    artharthx_first_ARTHS_USDT = arthxInstance.address == artharthx_first_ARTHS_USDT;

    // Fill the staking rewards instances
    stakingInstance_ARTH_WETH = await StakingRewards_ARTH_WETH.deployed();
    stakingInstance_ARTH_USDC = await StakingRewards_ARTH_USDC.deployed();
    //stakingInstance_ARTH_USDT = await StakingRewards_ARTH_USDT.deployed();
    // stakingInstance_ARTH_yUSD = await StakingRewards_ARTH_yUSD.deployed();
    stakingInstance_ARTHS_WETH = await StakingRewards_ARTHS_WETH.deployed();
    //stakingInstance_ARTHS_USDC = await StakingRewards_ARTHS_USDC.deployed();
    //stakingInstance_ARTHS_USDT = await StakingRewards_ARTHS_USDT.deployed();
    // stakingInstance_ARTHS_yUSD = await StakingRewards_ARTHS_yUSD.deployed();
  });

  // INITIALIZATION
  // ================================================================
  it('Check up on the oracles and make sure the prices are set', async () => {
    // Advance 24 hrs so the period can be computed
    await time.increase(86400 + 1);
    await time.advanceBlock();

    // Make sure the prices are updated
    await oracle_instance_ARTH_WETH.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await oracle_instance_ARTH_USDC.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await oracle_instance_ARTH_USDT.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await oracle_instance_ARTHS_WETH.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await oracle_instance_ARTHS_USDC.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await oracle_instance_ARTHS_USDT.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    await oracle_instance_USDT_WETH.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await oracle_instance_USDC_WETH.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Get the prices
    // Price is in collateral needed for 1 ARTH
    let arth_price_from_ARTH_WETH = (new BigNumber(await oracle_instance_ARTH_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
    let arth_price_from_ARTH_USDC = (new BigNumber(await oracle_instance_ARTH_USDC.consult.call(arthInstance.address, new BigNumber("1e18")))).div(BIG6);
    let arth_price_from_ARTH_USDT = (new BigNumber(await oracle_instance_ARTH_USDT.consult.call(arthInstance.address, new BigNumber("1e18")))).div(BIG6);
    let arthxPrice_from_ARTHS_WETH = (new BigNumber(await oracle_instance_ARTHS_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
    let arthxPrice_from_ARTHS_USDC = (new BigNumber(await oracle_instance_ARTHS_USDC.consult.call(arthxInstance.address, new BigNumber("1e18")))).div(BIG6);
    let arthxPrice_from_ARTHS_USDT = (new BigNumber(await oracle_instance_ARTHS_USDT.consult.call(arthxInstance.address, new BigNumber("1e18")))).div(BIG6);
    let USDT_price_from_USDT_WETH = (new BigNumber(await oracle_instance_USDT_WETH.consult.call(WETH.address, new BigNumber("1e18")))).div(BIG6);
    let USDC_price_from_USDC_WETH = (new BigNumber(await oracle_instance_USDC_WETH.consult.call(WETH.address, new BigNumber("1e18")))).div(BIG6);

    // Print the prices
    console.log("arth_price_from_ARTH_WETH: ", arth_price_from_ARTH_WETH.toString(), " ARTH = 1 WETH");
    console.log("arth_price_from_ARTH_USDC: ", arth_price_from_ARTH_USDC.toString(), " ARTH = 1 USDC");
    console.log("arth_price_from_ARTH_USDT: ", arth_price_from_ARTH_USDT.toString(), " ARTH = 1 USDT");
    console.log("arthxPrice_from_ARTHS_WETH: ", arthxPrice_from_ARTHS_WETH.toString(), " ARTHX = 1 WETH");
    console.log("arthxPrice_from_ARTHS_USDC: ", arthxPrice_from_ARTHS_USDC.toString(), " ARTHX = 1 USDC");
    console.log("arthxPrice_from_ARTHS_USDT: ", arthxPrice_from_ARTHS_USDT.toString(), " ARTHX = 1 USDT");
    console.log("USDT_price_from_USDT_WETH: ", USDT_price_from_USDT_WETH.toString(), " USDT = 1 WETH");
    console.log("USDC_price_from_USDC_WETH: ", USDC_price_from_USDC_WETH.toString(), " USDC = 1 WETH");

    // Add allowances to the Uniswap Router
    await wethInstance.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await col_instance_USDC.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await col_instance_USDT.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await arthInstance.approve(routerInstance.address, new BigNumber(1000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await arthxInstance.approve(routerInstance.address, new BigNumber(5000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Add allowances to the swapToPrice contract
    await wethInstance.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await col_instance_USDC.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await col_instance_USDT.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await arthInstance.approve(swapToPriceInstance.address, new BigNumber(1000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await arthxInstance.approve(swapToPriceInstance.address, new BigNumber(5000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Get the prices
    arth_price_from_ARTH_WETH = (new BigNumber(await oracle_instance_ARTH_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
    arth_price_from_ARTH_USDC = (new BigNumber(await oracle_instance_ARTH_USDC.consult.call(FakeCollateral_USDC.address, 1e6))).div(BIG6).toNumber();
    arth_price_from_ARTH_USDT = (new BigNumber(await oracle_instance_ARTH_USDT.consult.call(FakeCollateral_USDT.address, 1e6))).div(BIG6).toNumber();
    arthxPrice_from_ARTHS_WETH = (new BigNumber(await oracle_instance_ARTHS_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
    arthxPrice_from_ARTHS_USDC = (new BigNumber(await oracle_instance_ARTHS_USDC.consult.call(FakeCollateral_USDC.address, 1e6))).div(BIG6).toNumber();
    arthxPrice_from_ARTHS_USDT = (new BigNumber(await oracle_instance_ARTHS_USDT.consult.call(FakeCollateral_USDT.address, 1e6))).div(BIG6).toNumber();
    USDT_price_from_USDT_WETH = (new BigNumber(await oracle_instance_USDT_WETH.consult.call(WETH.address, new BigNumber("1e18")))).div(BIG6);
    USDC_price_from_USDC_WETH = (new BigNumber(await oracle_instance_USDC_WETH.consult.call(WETH.address, new BigNumber("1e18")))).div(BIG6);

    console.log(chalk.blue("==================PRICES=================="));
    // Print the new prices
    console.log("ETH-USD price from Chainlink:", (new BigNumber((await arthInstance.arth_info.call())['7'])).div(1e6).toString(), "USD = 1 ETH");
    console.log("arth_price_from_ARTH_WETH: ", arth_price_from_ARTH_WETH.toString(), "ARTH = 1 WETH");
    console.log("ARTH-USD price from Chainlink, Uniswap:", (new BigNumber(await arthInstance.arth_price.call())).div(1e6).toString(), "ARTH = 1 USD");
    //console.log("arth_price_from_ARTH_USDC: ", arth_price_from_ARTH_USDC.toString(), "ARTH = 1 USDC");
    //console.log("arth_price_from_ARTH_USDT: ", arth_price_from_ARTH_USDT.toString(), "ARTH = 1 USDT");
    console.log("arthxPrice_from_ARTHS_WETH: ", arthxPrice_from_ARTHS_WETH.toString(), "ARTHX = 1 WETH");
    //console.log("arthxPrice_from_ARTHS_USDC: ", arthxPrice_from_ARTHS_USDC.toString(), "ARTHX = 1 USDC");
    //console.log("arthxPrice_from_ARTHS_USDT: ", arthxPrice_from_ARTHS_USDT.toString(), "ARTHX = 1 USDT");
    console.log("USDT_price_from_USDT_WETH: ", USDT_price_from_USDT_WETH.toString(), "USDT = 1 WETH");
    console.log("USDC_price_from_USDC_WETH: ", USDC_price_from_USDC_WETH.toString(), "USDC = 1 WETH");
    console.log("USDT_price_from_pool: ", (new BigNumber(await pool_instance_USDT.getCollateralPrice.call())).div(1e6).toString(), "USDT = 1 USD");
    console.log("USDC_price_from_pool: ", (new BigNumber(await pool_instance_USDC.getCollateralPrice.call())).div(1e6).toString(), "USDC = 1 USD");


  });


  // [DEPRECATED] SEEDED IN THE MIGRATION FLOW
  // it('Seed the collateral pools some collateral to start off with', async () => {
  // 	console.log("========================Collateral Seed========================");

  // 	// Link the FAKE collateral pool to the ARTH contract
  // 	await col_instance_USDC.transfer(pool_instance_USDC.address, COLLATERAL_SEED_DEC18, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
  // 	await col_instance_USDT.transfer(pool_instance_USDT.address, COLLATERAL_SEED_DEC18, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

  // 	// Refresh the collateral ratio
  // 	const totalCollateralValue = new BigNumber(await arthInstance.globalCollateralValue.call()).div(BIG18);
  // 	console.log("totalCollateralValue: ", totalCollateralValue.toNumber());

  // 	const collateral_ratio_refreshed = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
  // 	console.log("collateral_ratio_refreshed: ", collateral_ratio_refreshed.toNumber());
  // 	col_rat = collateral_ratio_refreshed;
  // });


  it("Deploys a vesting contract and then executes a governance proposal to revoke it", async () => {
    console.log("======== Setup vestingInstance ========");
    await vestingInstance.setTimelockAddress(timelockInstance.address, { from: accounts[0] });
    await vestingInstance.setARTHSAddress(arthxInstance.address, { from: accounts[0] });
    await arthxInstance.approve(vestingInstance.address, new BigNumber("100000e18"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await arthxInstance.transfer(vestingInstance.address, new BigNumber("100000e18"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    const initial_ARTHS_balance = new BigNumber(await arthxInstance.balanceOf(accounts[0]));
    const initial_ARTHS_balance_5 = new BigNumber(await arthxInstance.balanceOf(accounts[5]));

    const timelock_delay = (await timelockInstance.delay.call()).toNumber();

    // Temporarily set the voting period to 10 blocks
    await governanceInstance.__setVotingPeriod(10, { from: GOVERNOR_GUARDIAN_ADDRESS });

    console.log("timelock_delay:", timelock_delay);
    console.log("votingPeriod (denoted in blocks):", (await governanceInstance.votingPeriod()).toNumber());

    // Determine the latest block
    const latestBlock = (new BigNumber(await time.latestBlock())).toNumber();
    console.log("Latest block: ", latestBlock);

    // Print the revoked status beforehand
    let revoked_status_before = await vestingInstance.getRevoked();
    console.log("revoked_status_before:", revoked_status_before);;

    console.log("======== Create proposal ========");
    // https://github.com/compound-finance/compound-protocol/blob/master/tests/Governance/GovernorAlpha/ProposeTest.js

    await governanceInstance.propose(
      [vestingInstance.address],
      [0],
      ['revoke()'],
      ['0x00'],
      "vestingInstance revoke()",
      "I hereby propose to revoke the vestingInstance owner's unvested ARTHS",
      { from: COLLATERAL_ARTH_AND_ARTHS_OWNER }
    );


    // Advance one block so the voting can begin
    await time.increase(15);
    await time.advanceBlock();

    // Print the proposal count
    let proposal_id = await governanceInstance.latestProposalIds.call(COLLATERAL_ARTH_AND_ARTHS_OWNER);

    console.log("proposal_id:", proposal_id.toNumber());
    // Print the proposal before
    let proposal_details = await governanceInstance.proposals.call(proposal_id);
    // console.log(util.inspect(proposal_details, false, null, true));
    console.log("id: ", proposal_details.id.toNumber());
    console.log("forVotes: ", new BigNumber(proposal_details.forVotes).div(BIG18).toNumber());
    console.log("againstVotes: ", new BigNumber(proposal_details.againstVotes).div(BIG18).toNumber());
    console.log("startBlock: ", proposal_details.startBlock.toString());
    console.log("endBlock: ", proposal_details.endBlock.toString());

    // Print the proposal state
    let proposal_state_during_voting = await governanceInstance.state.call(proposal_id);
    console.log("proposal_state_during_voting: ", new BigNumber(proposal_state_during_voting).toNumber());

    // Have at least 4% of ARTHX holders vote (so the quorum is reached)
    await governanceInstance.castVote(proposal_id, true, { from: POOL_CREATOR });
    await governanceInstance.castVote(proposal_id, true, { from: TIMELOCK_ADMIN });
    await governanceInstance.castVote(proposal_id, true, { from: GOVERNOR_GUARDIAN_ADDRESS });
    await governanceInstance.castVote(proposal_id, true, { from: STAKING_OWNER });
    await governanceInstance.castVote(proposal_id, true, { from: STAKING_REWARDS_DISTRIBUTOR });

    // Print the proposal after votes
    proposal_details = await governanceInstance.proposals.call(proposal_id);
    // console.log(util.inspect(proposal_details, false, null, true));
    console.log("id: ", proposal_details.id.toString());
    console.log("forVotes: ", new BigNumber(proposal_details.forVotes).div(BIG18).toNumber());
    console.log("againstVotes: ", new BigNumber(proposal_details.againstVotes).div(BIG18).toNumber());
    console.log("startBlock: ", proposal_details.startBlock.toString());
    console.log("endBlock: ", proposal_details.endBlock.toString());

    // Print the proposal state
    let proposal_state_before = await governanceInstance.state.call(proposal_id);
    console.log("proposal_state_before: ", new BigNumber(proposal_state_before).toNumber());

    // Advance 10 blocks so the voting ends
    await time.increase(10 * 15); // ~15 sec per block
    await time.advanceBlockTo(latestBlock + 10 + 5);

    // Print the proposal state
    let proposal_state_after = await governanceInstance.state.call(proposal_id);
    console.log("proposal_state_after: ", new BigNumber(proposal_state_after).toNumber());

    console.log("======== Queue proposal ========");
    // Queue the execution
    console.log(chalk.blue('=== QUEUING EXECUTION ==='));
    await governanceInstance.queue(proposal_id, { from: TIMELOCK_ADMIN });

    // Advance timelock_delay until the timelock is done
    await time.increase(timelock_delay + 1);
    await time.advanceBlock();

    // Have accounts[5] release() from the vestingInstance
    console.log(chalk.blue('=== VESTING INSTANCE RELEASE ==='));
    await vestingInstance.release({ from: accounts[5] });

    let proposal_state_after_queue = await governanceInstance.state.call(proposal_id);
    console.log("proposal_state_after_queue: ", new BigNumber(proposal_state_after_queue).toNumber());

    await time.increase(86400);
    await time.advanceBlock();

    console.log("======== Execute proposal ========");
    // Execute the proposal
    await governanceInstance.execute(proposal_id, { from: TIMELOCK_ADMIN });

    // Print the minting fee afterwards
    let revoked_status_after = await vestingInstance.getRevoked();
    console.log("revoked_status_after", revoked_status_after);

    // Set the voting period back to 17280 blocks
    await governanceInstance.__setVotingPeriod(17280, { from: GOVERNOR_GUARDIAN_ADDRESS });

    const acc_0_ARTHS_balance_change = (new BigNumber(await arthxInstance.balanceOf(accounts[0]))).minus(initial_ARTHS_balance).div(BIG18);
    const acc_5_ARTHS_balance_change = (new BigNumber(await arthxInstance.balanceOf(accounts[5]))).minus(initial_ARTHS_balance_5).div(BIG18);

    console.log("accounts[0] ARTHX balance change:", acc_0_ARTHS_balance_change.toNumber());
    console.log("accounts[5] ARTHX balance change:", acc_5_ARTHS_balance_change.toNumber());

    console.log("accounts[5] attempts to release more tokens");
    await vestingInstance.release({ from: accounts[5] });
    console.log("accounts[5] ARTHX balance change:", (new BigNumber(await arthxInstance.balanceOf(accounts[5])).minus(initial_ARTHS_balance_5).div(BIG18)).toNumber());
  });

  // GOVERNANCE TEST [PART 0]
  it('PART 0: Normal stakes at CR = 100%', async () => {
    console.log("=========================Normal Stakes [CR = 100%]=========================");
    // Give some Uniswap Pool tokens to another user so they can stake too
    await pair_instance_ARTH_USDC.transfer(accounts[9], new BigNumber("10e6"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    console.log("give accounts[9] 10 ARTH-USDC Uniswap pool tokens");

    const cr_boost_multiplier = new BigNumber(await stakingInstance_ARTH_USDC.crBoostMultiplier()).div(BIG6);
    console.log("pool cr_boost_multiplier (div 1e6): ", cr_boost_multiplier.toNumber());

    // Note the Uniswap Pool Token and ARTHX amounts after staking
    let uni_pool_tokens_1 = new BigNumber("75e5");
    await pair_instance_ARTH_USDC.approve(stakingInstance_ARTH_USDC.address, uni_pool_tokens_1, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    console.log("accounts[1] approve ARTH_USDC staking pool for 7.5 (E6) LP tokens");
    const uni_pool_1st_stake_1 = new BigNumber(await pair_instance_ARTH_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const arthx_1st_stake_1 = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const rewards_balance_1st_stake_1 = new BigNumber(await stakingInstance_ARTH_USDC.rewards.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);

    await stakingInstance_ARTH_USDC.stake(uni_pool_tokens_1, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    console.log("accounts[1] staking 7.5 LP (E6) tokens into ARTH_USDC staking pool");
    console.log("accounts[1] LP token balance:", uni_pool_1st_stake_1.toString());
    console.log("accounts[1] ARTHX balance:", arthx_1st_stake_1.toString());
    console.log("accounts[1] staking rewards():", rewards_balance_1st_stake_1.toString());
    console.log("accounts[1] balanceOf:", (new BigNumber(await stakingInstance_ARTH_USDC.balanceOf(COLLATERAL_ARTH_AND_ARTHS_OWNER))).div(BIG6).toNumber());
    console.log("accounts[1] boostedBalanceOf:", (new BigNumber(await stakingInstance_ARTH_USDC.boostedBalanceOf(COLLATERAL_ARTH_AND_ARTHS_OWNER))).div(BIG6).toNumber());
    console.log("");

    let uni_pool_tokens_9 = new BigNumber("25e5");
    await pair_instance_ARTH_USDC.approve(stakingInstance_ARTH_USDC.address, uni_pool_tokens_9, { from: accounts[9] });
    console.log("accounts[9] approve ARTH_USDC staking pool for 2.5 (E6) LP tokens");
    const uni_pool_1st_stake_9 = new BigNumber(await pair_instance_ARTH_USDC.balanceOf.call(accounts[9])).div(BIG6);
    const arthx_1st_stake_9 = new BigNumber(await arthxInstance.balanceOf.call(accounts[9])).div(BIG18);
    const rewards_balance_1st_stake_9 = new BigNumber(await stakingInstance_ARTH_USDC.rewards(accounts[9])).div(BIG18);

    await stakingInstance_ARTH_USDC.stake(uni_pool_tokens_9, { from: accounts[9] });
    console.log("accounts[9] staking 2.5 (E6) LP tokens into ARTH_USDC staking pool");
    console.log("accounts[9] LP token balance:", uni_pool_1st_stake_9.toString());
    console.log("accounts[9] ARTHX balance:", arthx_1st_stake_9.toString());
    console.log("accounts[9] staking rewards():", rewards_balance_1st_stake_9.toString());
    console.log("accounts[9] balanceOf:", (new BigNumber(await stakingInstance_ARTH_USDC.balanceOf(accounts[9]))).div(BIG6).toNumber());
    console.log("accounts[9] boostedBalanceOf:", (new BigNumber(await stakingInstance_ARTH_USDC.boostedBalanceOf(accounts[9]))).div(BIG6).toNumber());
    console.log("");

    // Note the last update time
    const block_time_before = (await time.latest()).toNumber();
    console.log("current block time (in seconds):", block_time_before);

    // Note the total lastUpdateTime
    let rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_ARTH_USDC.lastUpdateTime.call());
    console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toString());

    // Note the total periodFinish
    let rewards_contract_periodFinish = new BigNumber(await stakingInstance_ARTH_USDC.periodFinish.call());
    console.log("pool periodFinish:", rewards_contract_periodFinish.toString());

    // Note the total lastTimeRewardApplicable
    let rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstance_ARTH_USDC.lastTimeRewardApplicable.call());
    console.log("pool lastTimeRewardApplicable():", rewards_contract_lastTimeRewardApplicable.toString());

    console.log("====================================================================");
    console.log("advance one week (one rewardsDuration period)");
    // Advance 7 days so the reward can be claimed
    await time.increase((7 * 86400) + 1);
    await time.advanceBlock();
    //await arthInstance.refreshCollateralRatio();
    console.log("");

    const cr_boost_multiplier_2 = new BigNumber(await stakingInstance_ARTH_USDC.crBoostMultiplier()).div(BIG6);
    console.log("pool cr_boost_multiplier (div 1e6): ", cr_boost_multiplier_2.toNumber());

    // Note the last update time
    let block_time_after = (await time.latest()).toNumber();
    console.log("block time after waiting one week (in seconds):", block_time_after);

    // Make sure there is a valid period for the contract
    await stakingInstance_ARTH_USDC.renewIfApplicable({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Note the total lastUpdateTime
    rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_ARTH_USDC.lastUpdateTime.call());
    console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toString());

    // Note the total periodFinish
    rewards_contract_periodFinish = new BigNumber(await stakingInstance_ARTH_USDC.periodFinish.call());
    console.log("pool periodFinish:", rewards_contract_periodFinish.toString());

    // Note the total lastTimeRewardApplicable
    rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstance_ARTH_USDC.lastTimeRewardApplicable.call());
    console.log("pool lastTimeRewardApplicable():", rewards_contract_lastTimeRewardApplicable.toString());

    // Note the total ARTH supply
    const rewards_contract_stored_uni_pool = new BigNumber(await stakingInstance_ARTH_USDC.totalSupply.call()).div(BIG6);
    console.log("pool totalSupply() (of LP tokens):", rewards_contract_stored_uni_pool.toString());

    // Print the decimals
    const staking_token_decimal = new BigNumber(await stakingInstance_ARTH_USDC.stakingDecimals.call())
    console.log("pool stakingDecimals():", staking_token_decimal.toString());

    console.log("");
    // Show the reward
    const staking_arthx_earned_1 = new BigNumber(await stakingInstance_ARTH_USDC.earned.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const staking_arthx_earned_9 = new BigNumber(await stakingInstance_ARTH_USDC.earned.call(accounts[9])).div(BIG18);
    console.log("accounts[1] earnings after 1 week:", staking_arthx_earned_1.toString());
    console.log("accounts[9] earnings after 1 week:", staking_arthx_earned_9.toString());
    const reward_week_1 = (staking_arthx_earned_1).plus(staking_arthx_earned_9);
    const effective_yearly_reward_at_week_1 = reward_week_1.multipliedBy(52.1429)
    console.log("Effective weekly reward at week 1: ", reward_week_1.toString());
    console.log("Effective yearly reward at week 1: ", effective_yearly_reward_at_week_1.toString());

    const duration_reward_1 = new BigNumber(await stakingInstance_ARTH_USDC.getRewardForDuration.call()).div(BIG18);
    console.log("Expected yearly reward: ", duration_reward_1.multipliedBy(52.1429).toString());

    // await stakingInstance_ARTH_USDC.getReward({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Note the UNI POOL and ARTHX amounts after the reward
    const uni_pool_post_reward_1 = new BigNumber(await pair_instance_ARTH_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const arthx_post_reward_1 = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    console.log("accounts[1] LP token balance:", uni_pool_post_reward_1.toString());
    console.log("accounts[1] ARTHX balance:", arthx_post_reward_1.toString());

    console.log("====================================================================");
    console.log("accounts[1] claims and withdraws");
    console.log("");
    await time.advanceBlock();
    const uni_pool_balance_1 = new BigNumber(await pair_instance_ARTH_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const staking_arthx_ew_earned_1 = new BigNumber(await stakingInstance_ARTH_USDC.earned.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    console.log("accounts[1] LP token balance:", uni_pool_balance_1.toString());
    console.log("accounts[1] staking earned():", staking_arthx_ew_earned_1.toString());
    console.log("");

    console.log("accounts[1] claims getReward()");
    await stakingInstance_ARTH_USDC.getReward({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await time.advanceBlock();
    console.log("accounts[1] withdraws");
    await stakingInstance_ARTH_USDC.withdraw(uni_pool_tokens_1, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await time.advanceBlock();
    console.log("");

    const arthx_after_withdraw_0 = (new BigNumber(await arthxInstance.balanceOf(COLLATERAL_ARTH_AND_ARTHS_OWNER))).div(BIG18);
    console.log("accounts[1] ARTHX balance change:", (arthx_after_withdraw_0).minus(arthx_1st_stake_1).toNumber());
    console.log("====================================================================");

    console.log("wait two weeks so account[9] can earn more");
    // Advance a few days
    await time.increase(2 * (7 * 86400) + 1);
    await time.advanceBlock();

    // Make sure there is a valid period for the contract and sync it
    await stakingInstance_ARTH_USDC.renewIfApplicable({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Note the last update time
    block_time_after = (await time.latest()).toNumber();
    console.log("current block time (in seconds):", block_time_after);

    // Note the total lastUpdateTime
    rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_ARTH_USDC.lastUpdateTime.call());
    console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toString());

    // Note the total periodFinish
    rewards_contract_periodFinish = new BigNumber(await stakingInstance_ARTH_USDC.periodFinish.call()).toNumber();
    console.log("pool periodFinish: ", rewards_contract_periodFinish.toString());

    // Note the total lastTimeRewardApplicable
    rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstance_ARTH_USDC.lastTimeRewardApplicable.call()).toNumber();
    console.log("pool lastTimeRewardApplicable: ", rewards_contract_lastTimeRewardApplicable.toString());

    // Show the reward
    const staking_arthx_part2_earned_1 = new BigNumber(await stakingInstance_ARTH_USDC.earned.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const staking_arthx_part2_earned_9 = new BigNumber(await stakingInstance_ARTH_USDC.earned.call(accounts[9])).div(BIG18);
    console.log("accounts[1] staking earned():", staking_arthx_part2_earned_1.toString());

    const uni_pool_2nd_time_balance = new BigNumber(await pair_instance_ARTH_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const arthx_2nd_time_balance = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    console.log("accounts[1] LP token balance:", uni_pool_2nd_time_balance.toString());
    console.log("accounts[1] ARTHX balance:", arthx_2nd_time_balance.toString());
    console.log("");

    console.log("accounts[9] staking earned():", staking_arthx_part2_earned_9.toString());
    console.log("accounts[9] withdrawing");
    await stakingInstance_ARTH_USDC.withdraw(uni_pool_tokens_9, { from: accounts[9] });
    console.log("accounts[9] getReward()");
    await stakingInstance_ARTH_USDC.getReward({ from: accounts[9] });
    await time.advanceBlock();

    const reward_week_3 = ((staking_arthx_part2_earned_1).plus(staking_arthx_part2_earned_9)).plus(staking_arthx_ew_earned_1);
    const effective_yearly_reward_at_week_3 = reward_week_3.multipliedBy(52.1429 / 3.0); // Total over 3 weeks
    console.log("Effective weekly reward at week 3: ", reward_week_3.div(3).toString()); // Total over 3 weeks
    console.log("Effective yearly reward at week 3: ", effective_yearly_reward_at_week_3.toString());

    const duration_reward_3 = new BigNumber(await stakingInstance_ARTH_USDC.getRewardForDuration.call()).div(BIG18);
    console.log("Expected yearly reward: ", duration_reward_3.multipliedBy(52.1429).toString());

    const acc_9_ARTHS_balance_after = (new BigNumber(await arthxInstance.balanceOf(accounts[9]))).div(BIG18);
    console.log("accounts[9] ARTHX balance change:", acc_9_ARTHS_balance_after.minus(arthx_1st_stake_9).toNumber());
    console.log("crBoostMultiplier():", new BigNumber(await stakingInstance_ARTH_USDC.crBoostMultiplier()).toNumber());
  });

  // GOVERNANCE TEST [PART 1]
  // ================================================================
  it('Propose changing the minting fee', async () => {
    console.log("======== Minting fee 0.03% -> 0.1% ========");
    const timelock_delay = (await timelockInstance.delay.call()).toNumber();

    // Temporarily set the voting period to 10 blocks
    await governanceInstance.__setVotingPeriod(10, { from: GOVERNOR_GUARDIAN_ADDRESS });

    // Determine the latest block
    const latestBlock = (new BigNumber(await time.latestBlock())).toNumber();
    console.log("Latest block: ", latestBlock);

    // Print the minting fee beforehand
    let mintingFee_before = (new BigNumber(await arthInstance.mintingFee.call())).div(BIG6).toNumber();
    console.log("mintingFee_before: ", mintingFee_before);

    // https://github.com/compound-finance/compound-protocol/blob/master/tests/Governance/GovernorAlpha/ProposeTest.js
    await governanceInstance.propose(
      [arthInstance.address],
      [0],
      ['setMintingFee(uint256)'],
      [web3.eth.abi.encodeParameters(['uint256'], [1000])], // 0.1%
      "Minting fee change",
      "I hereby propose to increase the minting fee from 0.03% to 0.1%",
      { from: COLLATERAL_ARTH_AND_ARTHS_OWNER }
    );

    // Advance one block so the voting can begin
    await time.increase(15);
    await time.advanceBlock();

    // Print the proposal count
    let proposal_id = await governanceInstance.latestProposalIds.call(COLLATERAL_ARTH_AND_ARTHS_OWNER);

    // Print the proposal before
    let proposal_details = await governanceInstance.proposals.call(proposal_id);
    // console.log(util.inspect(proposal_details, false, null, true));
    console.log("id: ", proposal_details.id.toNumber());
    console.log("forVotes: ", new BigNumber(proposal_details.forVotes).div(BIG18).toNumber());
    console.log("againstVotes: ", new BigNumber(proposal_details.againstVotes).div(BIG18).toNumber());
    console.log("startBlock: ", proposal_details.startBlock.toString());
    console.log("endBlock: ", proposal_details.endBlock.toString());

    // Print the proposal state
    let proposal_state_during_voting = await governanceInstance.state.call(proposal_id);
    console.log("proposal_state_during_voting: ", new BigNumber(proposal_state_during_voting).toNumber());

    // Have at least 4% of ARTHX holders vote (so the quorum is reached)
    await governanceInstance.castVote(proposal_id, true, { from: POOL_CREATOR });
    await governanceInstance.castVote(proposal_id, true, { from: TIMELOCK_ADMIN });
    await governanceInstance.castVote(proposal_id, true, { from: GOVERNOR_GUARDIAN_ADDRESS });
    await governanceInstance.castVote(proposal_id, true, { from: STAKING_OWNER });
    await governanceInstance.castVote(proposal_id, true, { from: STAKING_REWARDS_DISTRIBUTOR });

    // Print the proposal after votes
    proposal_details = await governanceInstance.proposals.call(proposal_id);
    // console.log(util.inspect(proposal_details, false, null, true));
    console.log("id: ", proposal_details.id.toString());
    console.log("forVotes: ", new BigNumber(proposal_details.forVotes).div(BIG18).toNumber());
    console.log("againstVotes: ", new BigNumber(proposal_details.againstVotes).div(BIG18).toNumber());
    console.log("startBlock: ", proposal_details.startBlock.toString());
    console.log("endBlock: ", proposal_details.endBlock.toString());

    // Print the proposal state
    let proposal_state_before = await governanceInstance.state.call(proposal_id);
    console.log("proposal_state_before: ", new BigNumber(proposal_state_before).toNumber());

    // Advance 10 blocks so the voting ends
    await time.increase(10 * 15); // ~15 sec per block
    await time.advanceBlockTo(latestBlock + 10 + 5);

    // Print the proposal state
    let proposal_state_after = await governanceInstance.state.call(proposal_id);
    console.log("proposal_state_after: ", new BigNumber(proposal_state_after).toNumber());

    // Queue the execution
    await governanceInstance.queue(proposal_id, { from: TIMELOCK_ADMIN });

    // Advance timelock_delay until the timelock is done
    await time.increase(timelock_delay + 1);
    await time.advanceBlock();

    let proposal_state_after_queue = await governanceInstance.state.call(proposal_id);
    console.log("proposal_state_after_queue: ", new BigNumber(proposal_state_after_queue).toNumber());

    // Execute the proposal
    await governanceInstance.execute(proposal_id, { from: TIMELOCK_ADMIN });

    // Advance one block to sync
    await time.increase(15);
    await time.advanceBlock();

    // Print the minting fee afterwards
    let mintingFee_after = (new BigNumber(await arthInstance.mintingFee.call())).div(BIG6).toNumber();
    console.log("mintingFee_after: ", mintingFee_after);

    // Set the voting period back to 17280 blocks
    await governanceInstance.__setVotingPeriod(17280, { from: GOVERNOR_GUARDIAN_ADDRESS });

  });


  // GOVERNANCE TEST [PART 2]
  // ================================================================
  it('Change the minting fee back to 0.03%', async () => {
    console.log("======== Minting fee 0.1% -> 0.03% ========");
    const timelock_delay = (await timelockInstance.delay.call()).toNumber();

    // Temporarily set the voting period to 10 blocks
    await governanceInstance.__setVotingPeriod(10, { from: GOVERNOR_GUARDIAN_ADDRESS });

    // Determine the latest block
    const latestBlock = (new BigNumber(await time.latestBlock())).toNumber();
    console.log("Latest block: ", latestBlock);

    // Print the minting fee beforehand
    let mintingFee_before = (new BigNumber(await arthInstance.mintingFee.call())).div(BIG6).toNumber();
    console.log("mintingFee_before: ", mintingFee_before);

    // https://github.com/compound-finance/compound-protocol/blob/master/tests/Governance/GovernorAlpha/ProposeTest.js
    await governanceInstance.propose(
      [arthInstance.address],
      [0],
      ['setMintingFee(uint256)'],
      [web3.eth.abi.encodeParameters(['uint256'], [300])], // 0.03%
      "Minting fee revert back to old value",
      "I hereby propose to decrease the minting fee back to 0.03% from 0.1%",
      { from: COLLATERAL_ARTH_AND_ARTHS_OWNER }
    );

    // Advance one block so the voting can begin
    await time.increase(15);
    await time.advanceBlock();

    // Print the proposal count
    let proposal_id = await governanceInstance.latestProposalIds.call(COLLATERAL_ARTH_AND_ARTHS_OWNER);

    // Print the proposal before
    let proposal_details = await governanceInstance.proposals.call(proposal_id);
    // console.log(util.inspect(proposal_details, false, null, true));
    console.log("id: ", proposal_details.id.toNumber());
    console.log("forVotes: ", new BigNumber(proposal_details.forVotes).div(BIG18).toNumber());
    console.log("againstVotes: ", new BigNumber(proposal_details.againstVotes).div(BIG18).toNumber());
    console.log("startBlock: ", proposal_details.startBlock.toString());
    console.log("endBlock: ", proposal_details.endBlock.toString());

    // Print the proposal state
    let proposal_state_during_voting = await governanceInstance.state.call(proposal_id);
    console.log("proposal_state_during_voting: ", new BigNumber(proposal_state_during_voting).toNumber());

    // Have at least 4% of ARTHX holders vote (so the quorum is reached)
    await governanceInstance.castVote(proposal_id, true, { from: POOL_CREATOR });
    await governanceInstance.castVote(proposal_id, true, { from: TIMELOCK_ADMIN });
    await governanceInstance.castVote(proposal_id, true, { from: GOVERNOR_GUARDIAN_ADDRESS });
    await governanceInstance.castVote(proposal_id, true, { from: STAKING_OWNER });
    await governanceInstance.castVote(proposal_id, true, { from: STAKING_REWARDS_DISTRIBUTOR });

    // Print the proposal after votes
    proposal_details = await governanceInstance.proposals.call(proposal_id);
    // console.log(util.inspect(proposal_details, false, null, true));
    console.log("id: ", proposal_details.id.toString());
    console.log("forVotes: ", new BigNumber(proposal_details.forVotes).div(BIG18).toNumber());
    console.log("againstVotes: ", new BigNumber(proposal_details.againstVotes).div(BIG18).toNumber());
    console.log("startBlock: ", proposal_details.startBlock.toString());
    console.log("endBlock: ", proposal_details.endBlock.toString());

    // Print the proposal state
    let proposal_state_before = await governanceInstance.state.call(proposal_id);
    console.log("proposal_state_before: ", new BigNumber(proposal_state_before).toNumber());

    // Advance 10 blocks so the voting ends
    await time.increase(10 * 15); // ~15 sec per block
    await time.advanceBlockTo(latestBlock + 10 + 5);

    // Print the proposal state
    let proposal_state_after = await governanceInstance.state.call(proposal_id);
    console.log("proposal_state_after: ", new BigNumber(proposal_state_after).toNumber());

    // Queue the execution
    await governanceInstance.queue(proposal_id, { from: TIMELOCK_ADMIN });

    // Advance timelock_delay until the timelock is done
    await time.increase(timelock_delay + 1);
    await time.advanceBlock();

    let proposal_state_after_queue = await governanceInstance.state.call(proposal_id);
    console.log("proposal_state_after_queue: ", new BigNumber(proposal_state_after_queue).toNumber());

    // Execute the proposal
    await governanceInstance.execute(proposal_id, { from: TIMELOCK_ADMIN });

    // Advance one block to sync
    await time.increase(15);
    await time.advanceBlock();

    // Print the minting fee afterwards
    let mintingFee_after = (new BigNumber(await arthInstance.mintingFee.call())).div(BIG6).toNumber();
    console.log("mintingFee_after: ", mintingFee_after);

    // Set the voting period back to 17280 blocks
    await governanceInstance.__setVotingPeriod(17280, { from: GOVERNOR_GUARDIAN_ADDRESS });

  });


  it('Mint some ARTH using USDC as collateral (collateral ratio = 1) [mint1t1ARTH]', async () => {
    console.log("=========================mint1t1ARTH=========================");
    totalSupplyARTH = new BigNumber(await arthInstance.totalSupply.call()).div(BIG18).toNumber();
    totalSupplyARTHX = new BigNumber(await arthxInstance.totalSupply.call()).div(BIG18).toNumber();
    globalCollateralRatio = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6).toNumber();
    globalCollateralValue = new BigNumber(await arthInstance.globalCollateralValue.call()).div(BIG18).toNumber();
    console.log("ARTH price (USD): ", (new BigNumber(await arthInstance.arth_price.call()).div(BIG6)).toNumber());
    console.log("ARTHX price (USD): ", (new BigNumber(await arthInstance.arthxPrice.call()).div(BIG6)).toNumber());
    console.log("totalSupplyARTH: ", totalSupplyARTH);
    console.log("totalSupplyARTHS: ", totalSupplyARTHS);
    console.log("globalCollateralRatio: ", globalCollateralRatio);
    console.log("globalCollateralValue: ", globalCollateralValue);
    console.log("");

    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

    // Note the collateral and ARTH amounts before minting
    const arth_before = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const pool_collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);

    bal_arth = arth_before;
    col_bal_usdc = collateral_before;
    pool_bal_usdc = pool_collateral_before;
    console.log("bal_arth: ", bal_arth.toNumber());
    console.log("col_bal_usdc: ", col_bal_usdc.toNumber());
    console.log("pool_bal_usdc: ", pool_bal_usdc.toNumber());

    // Need to approve first so the pool contract can use transferFrom
    const collateral_amount = new BigNumber("100e6");
    await col_instance_USDC.approve(pool_instance_USDC.address, collateral_amount, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    // Mint some ARTH
    console.log("accounts[1] mint1t1ARTH() with 100 USDC; slippage limit of 1%");
    const collateral_price = (new BigNumber(await pool_instance_USDC.getCollateralPrice.call()).div(BIG6)).toNumber()
    const ARTH_out_min = new BigNumber(collateral_amount.times(collateral_price).times(0.99)); // 1% slippage
    await pool_instance_USDC.mint1t1ARTH(collateral_amount, ARTH_out_min, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Note the collateral and ARTH amounts after minting
    const arth_after = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const pool_collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
    // assert.equal(arth_after, 103.9584);
    // assert.equal(collateral_after, 8999900);
    // assert.equal(pool_collateral_after, 1000100);
    console.log("accounts[1] arth change: ", arth_after.toNumber() - arth_before.toNumber());
    console.log("accounts[1] collateral change: ", collateral_after.toNumber() - collateral_before.toNumber());
    console.log("ARTH_pool_USDC collateral change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

    // Note the new collateral ratio
    const collateral_ratio_after = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());

  });

  it('Redeem some ARTH for USDC (collateral ratio >= 1) [redeem1t1ARTH]', async () => {
    console.log("=========================redeem1t1ARTH=========================");
    // Advance 1 hr so the collateral ratio can be recalculated
    totalSupplyARTH = new BigNumber(await arthInstance.totalSupply.call()).div(BIG18).toNumber();
    totalSupplyARTHX = new BigNumber(await arthxInstance.totalSupply.call()).div(BIG18).toNumber();
    globalCollateralRatio = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6).toNumber();
    globalCollateralValue = new BigNumber(await arthInstance.globalCollateralValue.call()).div(BIG18).toNumber();
    console.log("ARTH price (USD): ", (new BigNumber(await arthInstance.arth_price.call()).div(BIG6)).toNumber());
    console.log("ARTHX price (USD): ", (new BigNumber(await arthInstance.arthxPrice.call()).div(BIG6)).toNumber());
    console.log("totalSupplyARTH: ", totalSupplyARTH);
    console.log("totalSupplyARTHS: ", totalSupplyARTHS);
    console.log("globalCollateralRatio: ", globalCollateralRatio);
    console.log("globalCollateralValue: ", globalCollateralValue);
    console.log("");

    // Deposit some collateral to move the collateral ratio above 1
    await col_instance_USDC.transfer(pool_instance_USDC.address, THREE_THOUSAND_DEC6, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await col_instance_USDT.transfer(pool_instance_USDT.address, THREE_THOUSAND_DEC6, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

    // Note the collateral and ARTH amounts before redeeming
    const collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const pool_collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
    const arth_before = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    bal_arth = arth_before;
    col_bal_usdc = collateral_before;
    pool_bal_usdc = pool_collateral_before;
    console.log("bal_arth: ", bal_arth.toNumber());
    console.log("col_bal_usdc: ", col_bal_usdc.toNumber());
    console.log("pool_bal_usdc: ", pool_bal_usdc.toNumber());
    console.log("ARTH price (USD): ", new BigNumber(await arthInstance.arth_price.call()).div(BIG6).toNumber());

    // Need to approve first so the pool contract can use transfer
    const arth_amount = new BigNumber("100e18");
    await arthInstance.approve(pool_instance_USDC.address, arth_amount, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Redeem some ARTH
    await pool_instance_USDC.redeem1t1ARTH(arth_amount, new BigNumber("10e6"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER }); // Get at least 10 USDC out, roughly 90% slippage limit (testing purposes)
    console.log("accounts[1] redeem1t1() with 100 ARTH");
    // Collect redemption
    await time.advanceBlock();
    await time.advanceBlock();
    await time.advanceBlock();
    await pool_instance_USDC.collectRedemption({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Note the collateral and ARTH amounts after redeeming
    const collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const arth_after = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const pool_collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
    console.log("accounts[1] ARTH change: ", arth_after.toNumber() - arth_before.toNumber());
    console.log("accounts[1] USDC change: ", collateral_after.toNumber() - collateral_before.toNumber());
    console.log("ARTH_pool_USDC change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

    // Note the new collateral ratio
    const collateral_ratio_after = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());
  });



  // REDUCE COLLATERAL RATIO
  it("Reduces the collateral ratio: 1-to-1 Phase => Fractional Phase", async () => {
    console.log("=========================Reducing the collateral ratio=========================")
    // const tokensToMint = new BigNumber(1000000e18);
    // await arthInstance.mint(tokensToMint, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    // totalSupplyARTH = new BigNumber(await arthInstance.totalSupply.call()).div(BIG18).toNumber();
    // console.log("totalSupplyARTH: ", totalSupplyARTH);


    // Add allowances to the swapToPrice contract
    await wethInstance.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await arthInstance.approve(swapToPriceInstance.address, new BigNumber(1000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Print the current ARTH price
    arth_price_from_ARTH_WETH = (new BigNumber(await oracle_instance_ARTH_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
    console.log("arth_price_from_ARTH_WETH (before): ", arth_price_from_ARTH_WETH.toString(), " ARTH = 1 WETH");
    console.log("arth_price:", new BigNumber(await arthInstance.arth_price.call()).div(BIG6).toNumber());

    // Swap the ARTH price upwards
    // Targeting 10 ARTH / 1 WETH
    await swapToPriceInstance.swapToPrice(
      arthInstance.address,
      wethInstance.address,
      new BigNumber(10e6),
      new BigNumber(1e6),
      new BigNumber(100000e18),
      new BigNumber(100000e18),
      COLLATERAL_ARTH_AND_ARTHS_OWNER,
      new BigNumber(2105300114),
      { from: COLLATERAL_ARTH_AND_ARTHS_OWNER }
    )

    // Advance 24 hrs so the period can be computed
    await time.increase(86400 + 1);
    await time.advanceBlock();

    // Make sure the price is updated
    await oracle_instance_ARTH_WETH.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Print the new ARTH price
    arth_price_from_ARTH_WETH = (new BigNumber(await oracle_instance_ARTH_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
    console.log("arth_price_from_ARTH_WETH (after): ", arth_price_from_ARTH_WETH.toString(), " ARTH = 1 WETH");
    console.log("arth_price:", new BigNumber(await arthInstance.arth_price.call()).div(BIG6).toNumber());

    for (let i = 0; i < 13; i++) { // Drop the collateral ratio by 13 * 0.25%
      await time.increase(3600 + 1);
      await time.advanceBlock();
      await arthInstance.refreshCollateralRatio();
      console.log("globalCollateralRatio:", (new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6)).toNumber());
    }

  });


  // MINTING PART 2
  // ================================================================

  it('Mint some ARTH using ARTHX and USDC (collateral ratio between .000001 and .999999) [mintFractionalARTH]', async () => {
    console.log("=========================mintFractionalARTH=========================");
    totalSupplyARTH = new BigNumber(await arthInstance.totalSupply.call()).div(BIG18).toNumber();
    totalSupplyARTHX = new BigNumber(await arthxInstance.totalSupply.call()).div(BIG18).toNumber();
    globalCollateralRatio = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6).toNumber();
    globalCollateralValue = new BigNumber(await arthInstance.globalCollateralValue.call()).div(BIG18).toNumber();
    console.log("ARTH price (USD): ", (new BigNumber(await arthInstance.arth_price.call()).div(BIG6)).toNumber());
    console.log("ARTHX price (USD): ", (new BigNumber(await arthInstance.arthxPrice.call()).div(BIG6)).toNumber());
    console.log("totalSupplyARTH: ", totalSupplyARTH);
    console.log("totalSupplyARTHS: ", totalSupplyARTHS);
    console.log("globalCollateralRatio: ", globalCollateralRatio);
    console.log("globalCollateralValue: ", globalCollateralValue);
    console.log("");

    console.log("accounts[1] votes initial:", (new BigNumber(await arthxInstance.getCurrentVotes(COLLATERAL_ARTH_AND_ARTHS_OWNER))).div(BIG18).toString());
    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

    // Note the ARTHS, ARTH, and FAKE amounts before minting
    const arthx_before = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const arth_before = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const pool_collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
    bal_arthx = arthx_before;
    bal_arth = arth_before;
    col_bal_usdc = collateral_before;
    pool_bal_usdc = pool_collateral_before;
    console.log("bal_arthx: ", bal_arthx.toNumber());
    console.log("bal_arth: ", bal_arth.toNumber());
    console.log("col_bal_usdc: ", col_bal_usdc.toNumber());
    console.log("pool_bal_usdc: ", pool_bal_usdc.toNumber());

    // Need to approve first so the pool contract can use transferFrom
    const arthx_amount = new BigNumber("500e18");
    await arthxInstance.approve(pool_instance_USDC.address, arthx_amount, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    const collateral_amount = new BigNumber("100e6");
    await col_instance_USDC.approve(pool_instance_USDC.address, collateral_amount, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    await pool_instance_USDC.mintFractionalARTH(collateral_amount, arthx_amount, new BigNumber("10e6"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    console.log("accounts[1] mintFractionalARTH() with 100 USDC and 500 ARTHS");

    // Note the ARTHS, ARTH, and FAKE amounts after minting
    const arthx_after = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const arth_after = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const pool_collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
    console.log("accounts[1] USDC balance change: ", collateral_after.toNumber() - collateral_before.toNumber());
    console.log("accounts[1] ARTHX balance change: ", arthx_after.toNumber() - arthx_before.toNumber());
    console.log("accounts[1] votes final:", (new BigNumber(await arthxInstance.getCurrentVotes(COLLATERAL_ARTH_AND_ARTHS_OWNER))).div(BIG18).toString());
    console.log("accounts[1] ARTH balance change: ", arth_after.toNumber() - arth_before.toNumber());
    console.log("ARTH_pool_USDC balance change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

    // Note the new collateral ratio
    const collateral_ratio_after = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());

  });

  it("Set the pool ceiling and try to mint above it", async () => {
    console.log("=========================Pool Ceiling Test=========================");
    await pool_instance_USDC.setPoolParameters(new BigNumber("100e6"), 7500, 1, { from: POOL_CREATOR });
    await arthxInstance.approve(pool_instance_USDC.address, new BigNumber("1000e18"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await col_instance_USDC.approve(pool_instance_USDC.address, new BigNumber("1000e6"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await expectRevert.unspecified(pool_instance_USDC.mintFractionalARTH(new BigNumber("1000e18"), new BigNumber("1000e18"), 0, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER }));
    await pool_instance_USDC.setPoolParameters(new BigNumber("5000000e18"), 7500, 1, { from: POOL_CREATOR });
  })



  it('SHOULD FAIL: Mint some ARTH using ARTHX and USDC, but doesn\'t send in enough ARTHX [mintFractionalARTH]', async () => {
    console.log("=========================mintFractionalARTH=========================");

    totalSupplyARTH = new BigNumber(await arthInstance.totalSupply.call()).div(BIG18).toNumber();
    totalSupplyARTHX = new BigNumber(await arthxInstance.totalSupply.call()).div(BIG18).toNumber();
    globalCollateralRatio = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6).toNumber();
    globalCollateralValue = new BigNumber(await arthInstance.globalCollateralValue.call()).div(BIG18).toNumber();
    console.log("ARTH price (USD): ", (new BigNumber(await arthInstance.arth_price.call()).div(BIG6)).toNumber());
    console.log("ARTHX price (USD): ", (new BigNumber(await arthInstance.arthxPrice.call()).div(BIG6)).toNumber());
    console.log("totalSupplyARTH: ", totalSupplyARTH);
    console.log("totalSupplyARTHS: ", totalSupplyARTHS);
    console.log("globalCollateralRatio: ", globalCollateralRatio);
    console.log("globalCollateralValue: ", globalCollateralValue);
    console.log("");

    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

    // Note the ARTHS, ARTH, and FAKE amounts before minting
    const arthx_before = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const arth_before = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const pool_collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
    bal_arthx = arthx_before;
    bal_arth = arth_before;
    col_bal_usdc = collateral_before;
    pool_bal_usdc = pool_collateral_before;
    console.log("bal_arthx: ", bal_arthx.toNumber());
    console.log("bal_arth: ", bal_arth.toNumber());
    console.log("col_bal_usdc: ", col_bal_usdc.toNumber());
    console.log("pool_bal_usdc: ", pool_bal_usdc.toNumber());

    // Need to approve first so the pool contract can use transferFrom
    const arthx_amount = new BigNumber("1e18");
    await arthxInstance.approve(pool_instance_USDC.address, arthx_amount, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    const collateral_amount = new BigNumber("100e6");
    await col_instance_USDC.approve(pool_instance_USDC.address, collateral_amount, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });


    await expectRevert.unspecified(pool_instance_USDC.mintFractionalARTH(collateral_amount, arthx_amount, new BigNumber("10e18"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER }));
    console.log("accounts[1] mintFractionalARTH() with 100 USDC and 5 ARTHS");

    // Note the ARTHS, ARTH, and FAKE amounts after minting
    const arthx_after = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const arth_after = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const pool_collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
    console.log("accounts[1] USDC balance change: ", collateral_after.toNumber() - collateral_before.toNumber());
    console.log("accounts[1] ARTHX balance change: ", arthx_after.toNumber() - arthx_before.toNumber());
    console.log("accounts[1] ARTH balance change: ", arth_after.toNumber() - arth_before.toNumber());
    console.log("ARTH_pool_USDC balance change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

    // Note the new collateral ratio
    const collateral_ratio_after = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());

  });

  it('Redeem some ARTH for ARTHX and USDC (collateral ratio between .000001 and .999999) [redeemFractionalARTH]', async () => {
    console.log("=========================redeemFractionalARTH=========================");
    totalSupplyARTH = new BigNumber(await arthInstance.totalSupply.call()).div(BIG18).toNumber();
    totalSupplyARTHX = new BigNumber(await arthxInstance.totalSupply.call()).div(BIG18).toNumber();
    globalCollateralRatio = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6).toNumber();
    globalCollateralValue = new BigNumber(await arthInstance.globalCollateralValue.call()).div(BIG18).toNumber();
    console.log("ARTH price (USD): ", (new BigNumber(await arthInstance.arth_price.call()).div(BIG6)).toNumber());
    console.log("ARTHX price (USD): ", (new BigNumber(await arthInstance.arthxPrice.call()).div(BIG6)).toNumber());
    console.log("totalSupplyARTH: ", totalSupplyARTH);
    console.log("totalSupplyARTHS: ", totalSupplyARTHS);
    console.log("globalCollateralRatio: ", globalCollateralRatio);
    console.log("globalCollateralValue: ", globalCollateralValue);
    console.log("");

    console.log("accounts[1] votes initial:", (new BigNumber(await arthxInstance.getCurrentVotes(COLLATERAL_ARTH_AND_ARTHS_OWNER))).div(BIG18).toString());

    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

    // Note the ARTHS, ARTH, and FAKE amounts before redeeming
    const arthx_before = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const arth_before = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const pool_collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
    bal_arthx = arthx_before;
    bal_arth = arth_before;
    col_bal_usdc = collateral_before;
    pool_bal_usdc = pool_collateral_before;
    console.log("accounts[1] ARTHX balance:", bal_arth.toNumber());
    console.log("accounts[1] ARTH balance:", bal_arth.toNumber());
    console.log("accounts[1] USDC balance", col_bal_usdc.toNumber());
    console.log("ARTH_pool_USDC balance:", pool_bal_usdc.toNumber());

    // Need to approve first so the pool contract can use transfer
    const arth_amount = new BigNumber("135242531948024e6");
    await arthInstance.approve(pool_instance_USDC.address, arth_amount, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Redeem some ARTH
    await pool_instance_USDC.redeemFractionalARTH(arth_amount, new BigNumber("5e18"), new BigNumber("125e6"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    console.log("accounts[1] redeemFractionalARTH() with 135.24253 ARTH");
    // Collect redemption
    await time.advanceBlock();
    await time.advanceBlock();
    await time.advanceBlock();
    await pool_instance_USDC.collectRedemption({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Note the ARTHS, ARTH, and FAKE amounts after redeeming
    const arthx_after = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const arth_after = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const pool_collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
    console.log("accounts[1] ARTHX balance change:", arthx_after.toNumber() - arthx_before.toNumber());
    console.log("accounts[1] votes final:", (new BigNumber(await arthxInstance.getCurrentVotes(COLLATERAL_ARTH_AND_ARTHS_OWNER))).div(BIG18).toString());
    console.log("accounts[1] ARTH balance change:", arth_after.toNumber() - arth_before.toNumber());
    console.log("accounts[1] USDC balance change:", collateral_after.toNumber() - collateral_before.toNumber());
    console.log("ARTH_pool_USDC balance change:", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

    // Note the new collateral ratio
    const collateral_ratio_after = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());

  });

  it('Mint some ARTH using ARTHX and USDC (collateral ratio between .000001 and .999999) [mintFractionalARTH]', async () => {
    console.log("=========================mintFractionalARTH=========================");
    totalSupplyARTH = new BigNumber(await arthInstance.totalSupply.call()).div(BIG18).toNumber();
    totalSupplyARTHX = new BigNumber(await arthxInstance.totalSupply.call()).div(BIG18).toNumber();
    globalCollateralRatio = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6).toNumber();
    globalCollateralValue = new BigNumber(await arthInstance.globalCollateralValue.call()).div(BIG18).toNumber();
    console.log("ARTH price (USD): ", (new BigNumber(await arthInstance.arth_price.call()).div(BIG6)).toNumber());
    console.log("ARTHX price (USD): ", (new BigNumber(await arthInstance.arthxPrice.call()).div(BIG6)).toNumber());
    console.log("totalSupplyARTH: ", totalSupplyARTH);
    console.log("totalSupplyARTHS: ", totalSupplyARTHS);
    console.log("globalCollateralRatio: ", globalCollateralRatio);
    console.log("globalCollateralValue: ", globalCollateralValue);
    console.log("");

    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

    // Note the ARTHS, ARTH, and FAKE amounts before minting
    const arthx_before = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const arth_before = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const pool_collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
    bal_arthx = arthx_before;
    bal_arth = arth_before;
    col_bal_usdc = collateral_before;
    pool_bal_usdc = pool_collateral_before;
    console.log("bal_arthx: ", bal_arthx.toNumber());
    console.log("bal_arth: ", bal_arth.toNumber());
    console.log("col_bal_usdc: ", col_bal_usdc.toNumber());
    console.log("pool_bal_usdc: ", pool_bal_usdc.toNumber());

    // Need to approve first so the pool contract can use transferFrom
    const arthx_amount = new BigNumber("50000e18");
    await arthxInstance.approve(pool_instance_USDC.address, arthx_amount, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    const collateral_amount = new BigNumber("10000e6");
    await col_instance_USDC.approve(pool_instance_USDC.address, collateral_amount, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    await pool_instance_USDC.mintFractionalARTH(collateral_amount, arthx_amount, new BigNumber("10e18"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    console.log("accounts[1] mintFractionalARTH() with 10,000 USDC and 50,000 ARTHS");

    // Note the ARTHS, ARTH, and FAKE amounts after minting
    const arthx_after = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const arth_after = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const pool_collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
    console.log("accounts[1] USDC balance change: ", collateral_after.toNumber() - collateral_before.toNumber());
    console.log("accounts[1] ARTHX balance change: ", arthx_after.toNumber() - arthx_before.toNumber());
    console.log("accounts[1] ARTH balance change: ", arth_after.toNumber() - arth_before.toNumber());
    console.log("ARTH_pool_USDC balance change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

    // Note the new collateral ratio
    const collateral_ratio_after = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());
  });



  it('Recollateralizes the system using recollateralizeARTH()', async () => {
    console.log("=========================recollateralizeARTH=========================");
    let totalSupplyARTH = new BigNumber(await arthInstance.totalSupply.call()).div(BIG18).toNumber();
    let totalSupplyARTHX = new BigNumber(await arthxInstance.totalSupply.call()).div(BIG18).toNumber();
    let globalCollateralRatio = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6).toNumber();
    let globalCollateralValue = new BigNumber(await arthInstance.globalCollateralValue.call()).div(BIG18).toNumber();
    console.log("ARTH price (USD): ", (new BigNumber(await arthInstance.arth_price.call()).div(BIG6)).toNumber());
    console.log("ARTHX price (USD): ", (new BigNumber(await arthInstance.arthxPrice.call()).div(BIG6)).toNumber());
    console.log("totalSupplyARTH: ", totalSupplyARTH);
    console.log("totalSupplyARTHS: ", totalSupplyARTHS);
    console.log("globalCollateralRatio: ", globalCollateralRatio);
    console.log("globalCollateralValue: ", globalCollateralValue);
    console.log("");

    // Note the new collateral ratio
    totalSupplyARTH = new BigNumber(await arthInstance.totalSupply.call()).div(BIG18).toNumber();
    totalSupplyARTHX = new BigNumber(await arthxInstance.totalSupply.call()).div(BIG18).toNumber();
    globalCollateralRatio = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6).toNumber();
    globalCollateralValue = new BigNumber(await arthInstance.globalCollateralValue.call()).div(BIG18).toNumber();

    console.log("effective collateral ratio before:", globalCollateralValue / totalSupplyARTH);

    // Note the ARTHS, ARTH, and FAKE amounts before redeeming
    const arthx_before = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const arth_before = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const pool_collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
    bal_arthx = arthx_before;
    bal_arth = arth_before;
    col_bal_usdc = collateral_before;
    pool_bal_usdc = pool_collateral_before;
    console.log("accounts[1] ARTHX balance:", bal_arth.toNumber());
    console.log("accounts[1] ARTH balance:", bal_arth.toNumber());
    console.log("accounts[1] USDC balance", col_bal_usdc.toNumber());
    console.log("ARTH_pool_USDC balance:", pool_bal_usdc.toNumber());

    // Get the amount of recollateralization available
    const arth_info = await arthInstance.arth_info.call();
    const arth_total_supply = (new BigNumber(arth_info[2]));
    const globalCollateralRatio = (new BigNumber(arth_info[3]));
    const globalCollatValue = (new BigNumber(arth_info[4]));
    const effective_collateral_ratio_E6 = (globalCollatValue.multipliedBy(1e6).div(arth_total_supply)).toNumber(); // Returns it in 1e6
    const effective_collateral_ratio = effective_collateral_ratio_E6 / 1e6;
    let available_to_recollat = ((globalCollateralRatio.multipliedBy(arth_total_supply).minus(arth_total_supply.multipliedBy(effective_collateral_ratio_E6))).div(1e6).div(1e18)).toNumber();
    if (available_to_recollat < 0) available_to_recollat = 0;
    console.log("AVAILABLE TO RECOLLATERALIZE: ", available_to_recollat);

    console.log("pool_USDC getCollateralPrice() (divided by 1e6):", (new BigNumber(await pool_instance_USDC.getCollateralPrice.call()).div(BIG6)).toNumber());

    // Need to approve first so the pool contract can use transfer
    const USDC_amount = new BigNumber("10000e6");
    await col_instance_USDC.approve(pool_instance_USDC.address, USDC_amount, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Redeem some ARTH
    await pool_instance_USDC.recollateralizeARTH(USDC_amount, new BigNumber("10e6"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    console.log("accounts[1] recollateralizeARTH() with 10,000 USDC");

    // Note the ARTHS, ARTH, and FAKE amounts after redeeming
    const arthx_after = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const arth_after = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const pool_collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
    console.log("accounts[1] ARTHX balance change:", arthx_after.toNumber() - arthx_before.toNumber());
    console.log("accounts[1] ARTH balance change:", arth_after.toNumber() - arth_before.toNumber());
    console.log("accounts[1] USDC balance change:", collateral_after.toNumber() - collateral_before.toNumber());
    console.log("ARTH_pool_USDC balance change:", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

    // Note the new collateral ratio
    totalSupplyARTH = new BigNumber(await arthInstance.totalSupply.call()).div(BIG18).toNumber();
    totalSupplyARTHX = new BigNumber(await arthxInstance.totalSupply.call()).div(BIG18).toNumber();
    globalCollateralRatio = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6).toNumber();
    globalCollateralValue = new BigNumber(await arthInstance.globalCollateralValue.call()).div(BIG18).toNumber();

    console.log("effective collateral ratio after:", globalCollateralValue / totalSupplyARTH);

  });


  // MINTING AND REDEMPTION [CR = 0]
  // ================================================================

  it('Mint some ARTH using ARTHX (collateral ratio = 0) [mintAlgorithmicARTH]', async () => {
    console.log("=========================mintAlgorithmicARTH=========================");
    for (let i = 0; i < 4 * 96; i++) { //drop by 96%
      await time.increase(3600 + 1);
      await time.advanceBlock();
      await arthInstance.refreshCollateralRatio();
      if (i % 20 == 0) {
        console.log("globalCollateralRatio:", (new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6)).toNumber());
      }
    }

    // drop it 3 more times
    await time.increase(3600 + 1);
    await time.advanceBlock();
    await arthInstance.refreshCollateralRatio();
    await time.increase(3600 + 1);
    await time.advanceBlock();
    await arthInstance.refreshCollateralRatio();
    await time.increase(3600 + 1);
    await time.advanceBlock();
    await arthInstance.refreshCollateralRatio();

    totalSupplyARTH = new BigNumber(await arthInstance.totalSupply.call()).div(BIG18).toNumber();
    totalSupplyARTHX = new BigNumber(await arthxInstance.totalSupply.call()).div(BIG18).toNumber();
    globalCollateralRatio = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6).toNumber();
    globalCollateralValue = new BigNumber(await arthInstance.globalCollateralValue.call()).div(BIG18).toNumber();
    console.log("ARTH price (USD): ", (new BigNumber(await arthInstance.arth_price.call()).div(BIG6)).toNumber());
    console.log("ARTHX price (USD): ", (new BigNumber(await arthInstance.arthxPrice.call()).div(BIG6)).toNumber());
    console.log("totalSupplyARTH: ", totalSupplyARTH);
    console.log("totalSupplyARTHS: ", totalSupplyARTHS);
    console.log("globalCollateralRatio: ", globalCollateralRatio);
    console.log("globalCollateralValue: ", globalCollateralValue);
    console.log("");

    // IF YOU ARE RUNNING TESTS, YOU NEED TO COMMENT OUT THE RELEVANT PART IN THE DEPLOY SCRIPT!
    // IF YOU ARE RUNNING TESTS, YOU NEED TO COMMENT OUT THE RELEVANT PART IN THE DEPLOY SCRIPT!
    // IF YOU ARE RUNNING TESTS, YOU NEED TO COMMENT OUT THE RELEVANT PART IN THE DEPLOY SCRIPT!
    //console.log(chalk.red("IF YOU ARE RUNNING TESTS, YOU NEED TO COMMENT OUT THE RELEVANT PART IN THE DEPLOY SCRIPT!"));

    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

    // Note the ARTHX and ARTH amounts before minting
    const arthx_before = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const arth_before = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    bal_arthx = arthx_before;
    bal_arth = arth_before;
    console.log("accounts[1] ARTHX balance before:", arthx_before.toNumber());
    console.log("accounts[1] ARTH balance before:", arth_before.toNumber());

    // Need to approve first so the pool contract can use transferFrom
    const arthx_amount = new BigNumber("10000e18");
    await arthxInstance.approve(pool_instance_USDC.address, arthx_amount, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Mint some ARTH
    await pool_instance_USDC.mintAlgorithmicARTH(arthx_amount, new BigNumber("10e18"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    console.log("accounts[1] mintAlgorithmicARTH() using 10,000 ARTHS");

    // Note the ARTHX and ARTH amounts after minting
    const arthx_after = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const arth_after = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    console.log("accounts[1] ARTHX balance after:", arthx_after.toNumber() - arthx_before.toNumber());
    console.log("accounts[1] ARTH balance after:", arth_after.toNumber() - arth_before.toNumber());

    // Note the new collateral ratio
    const collateral_ratio_after = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());
  });

  // MINTING AND REDEMPTION [Other CRs]
  // ================================================================

  it('Redeem some ARTH for ARTHX (collateral ratio = 0) [redeemAlgorithmicARTH]', async () => {
    console.log("=========================redeemAlgorithmicARTH=========================");
    // Advance 1 hr so the collateral ratio can be recalculated
    totalSupplyARTH = new BigNumber(await arthInstance.totalSupply.call()).div(BIG18).toNumber();
    totalSupplyARTHX = new BigNumber(await arthxInstance.totalSupply.call()).div(BIG18).toNumber();
    globalCollateralRatio = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6).toNumber();
    globalCollateralValue = new BigNumber(await arthInstance.globalCollateralValue.call()).div(BIG18).toNumber();
    console.log("ARTH price (USD): ", (new BigNumber(await arthInstance.arth_price.call()).div(BIG6)).toNumber());
    console.log("ARTHX price (USD): ", (new BigNumber(await arthInstance.arthxPrice.call()).div(BIG6)).toNumber());
    console.log("totalSupplyARTH: ", totalSupplyARTH);
    console.log("totalSupplyARTHS: ", totalSupplyARTHS);
    console.log("globalCollateralRatio: ", globalCollateralRatio);
    console.log("globalCollateralValue: ", globalCollateralValue);
    console.log("");

    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

    // Note the ARTHS, ARTH, and FAKE amounts before minting
    const arthx_before = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const arth_before = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    console.log("accounts[1] ARTHX balance before:", arthx_before.toNumber());
    console.log("accounts[1] ARTH balance before:", arth_before.toNumber());

    // Need to approve first so the pool contract can use transfer
    const arth_amount = new BigNumber("1000e18");
    await arthInstance.approve(pool_instance_USDC.address, arth_amount, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Redeem some ARTH
    await pool_instance_USDC.redeemAlgorithmicARTH(arth_amount, new BigNumber("10e6"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    console.log("accounts[1] redeemAlgorithmicARTH() using 1,000 ARTH");

    // Collect redemption
    await time.advanceBlock();
    await time.advanceBlock();
    await time.advanceBlock();
    await pool_instance_USDC.collectRedemption({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Note the ARTHS, ARTH, and FAKE amounts after minting
    const arthx_after = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const arth_after = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    //const arthx_unclaimed = new BigNumber(await pool_instance_USDC.getRedeemARTHSBalance.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    //console.log("bal_arthx change: ", arthx_after.toNumber() - bal_arthx);
    //console.log("bal_arthx sitting inside Pool_USDC waiting to be claimed by COLLATERAL_ARTH_AND_ARTHS_OWNER: ", arthx_unclaimed);
    //console.log("bal_arth change: ", arth_after.toNumber() - bal_arth);
    console.log("accounts[1] ARTHX change:", arthx_after.toNumber() - arthx_before.toNumber());
    console.log("accounts[1] ARTH change:", arth_after.toNumber() - arth_before.toNumber());
  });


  it("Buys back collateral using ARTHX [should fail if CR = 0]", async () => {
    console.log("=========================buyBackARTHX=========================");
    // Advance 1 hr so the collateral ratio can be recalculated
    totalSupplyARTH = new BigNumber(await arthInstance.totalSupply.call()).div(BIG18).toNumber();
    totalSupplyARTHX = new BigNumber(await arthxInstance.totalSupply.call()).div(BIG18).toNumber();
    globalCollateralRatio = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6).toNumber();
    globalCollateralValue = new BigNumber(await arthInstance.globalCollateralValue.call()).div(BIG18).toNumber();
    console.log("ARTH price (USD): ", (new BigNumber(await arthInstance.arth_price.call()).div(BIG6)).toNumber());
    console.log("ARTHX price (USD): ", (new BigNumber(await arthInstance.arthxPrice.call()).div(BIG6)).toNumber());
    console.log("totalSupplyARTH: ", totalSupplyARTH);
    console.log("totalSupplyARTHS: ", totalSupplyARTHS);
    console.log("globalCollateralRatio: ", globalCollateralRatio);
    console.log("globalCollateralValue: ", globalCollateralValue);
    console.log("");

    // This will push the collateral ratio below 1
    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

    // Note the ARTHX and FAKE amounts before buying back
    const arthx_before = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const pool_collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
    const global_pool_collateral_before = new BigNumber(await arthInstance.globalCollateralValue.call()).div(BIG18);
    bal_arthx = arthx_before;
    col_bal_usdc = collateral_before;
    pool_bal_usdc = pool_collateral_before;
    global_collateral_value = global_pool_collateral_before;
    console.log("accounts[1] ARTHX balance: ", bal_arthx.toNumber());
    console.log("accounts[1] USDC balance: ", col_bal_usdc.toNumber());
    console.log("ARTH_pool_USDC balance: ", pool_bal_usdc.toNumber());
    console.log("global_collateral_value: ", global_collateral_value.toNumber());

    // Available to buyback
    const buyback_available = new BigNumber(await pool_instance_USDC.availableExcessCollatDV.call()).div(BIG18);
    // const buyback_available_in_arthx = new BigNumber(await pool_instance_USDC.availableExcessCollatDVInARTHS.call()).div(BIG18);
    console.log("buyback_available: $", buyback_available.toNumber());
    // console.log("buyback_available_in_arthx: ", buyback_available_in_arthx.toNumber(), " ARTHS");

    // Need to approve first so the pool contract can use transfer
    const arthx_amount = new BigNumber("40000e18");
    await arthxInstance.approve(pool_instance_USDC.address, arthx_amount, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // ARTHX price
    const arthxPrice = new BigNumber(await arthInstance.arthxPrice()).div(BIG6);
    console.log("arthxPrice: $", arthxPrice.toNumber());

    // Buy back some ARTH
    console.log("accounts[1] buyBackARTHX() using 40,000 ARTHS");
    await pool_instance_USDC.buyBackARTHX(arthx_amount, new BigNumber("10e6"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Note the ARTHX and FAKE amounts after buying back
    const arthx_after = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const pool_collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG6);
    const global_pool_collateral_after = new BigNumber(await arthInstance.globalCollateralValue.call()).div(BIG18);
    console.log("accounts[1] ARTHX balance change: ", arthx_after.toNumber() - arthx_before.toNumber());
    console.log("accounts[1] USDC balance change: ", collateral_after.toNumber() - collateral_before.toNumber());
    console.log("ARTH_pool_USDC balance change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());
    console.log("global_collateral_value change: ", global_pool_collateral_after.toNumber() - global_pool_collateral_before.toNumber());

    // Note the new collateral ratio
    const collateral_ratio_after = new BigNumber(await arthInstance.globalCollateralRatio.call()).div(BIG6);
    console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());
    console.log("getCollateralPrice() from ARTH_pool_USDC: ", (new BigNumber(await pool_instance_USDC.getCollateralPrice.call()).div(BIG6)).toNumber());
  });


  // STAKING
  // ================================================================

  it('Make sure the StakingRewards (ARTH/USDC) are initialized', async () => {
    await stakingInstance_ARTH_USDC.renewIfApplicable();
    const pre_period_finish = new BigNumber(await stakingInstance_ARTH_USDC.periodFinish());
    const pre_block_timestamp = new BigNumber(await time.latest());

    console.log("pre-periodFinish:", pre_period_finish.toNumber());
    console.log("block.timestamp:", pre_block_timestamp.toNumber());

    console.log("moving forward rest of period & renewing");
    await time.increase((pre_period_finish.minus(pre_block_timestamp)).toNumber() + 1);
    await time.advanceBlock();
    await stakingInstance_ARTH_USDC.renewIfApplicable();

    let rewards_contract_periodFinish = new BigNumber(await stakingInstance_ARTH_USDC.periodFinish.call()).toNumber();
    let rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_ARTH_USDC.lastUpdateTime.call()).toNumber();

    console.log("periodFinish:", rewards_contract_periodFinish);
    console.log("lastUpdateTime:", rewards_contract_lastUpdateTime);
    console.log("block.timestamp:", new BigNumber(await time.latest()).toNumber());

    // assert.equal(rewards_contract_periodFinish - rewards_contract_lastUpdateTime, REWARDS_DURATION);
    assert.equal(((rewards_contract_periodFinish - rewards_contract_lastUpdateTime) / REWARDS_DURATION) >= .9999, true);
  });

  it('PART 1: Normal stakes at CR = 0', async () => {
    console.log("=========================Normal Stakes [CR = 0]=========================");
    // Give some Uniswap Pool tokens to another user so they can stake too
    await pair_instance_ARTH_USDC.transfer(accounts[9], new BigNumber("10e6"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    console.log("give accounts[9] 10 ARTH-USDC Uniswap pool tokens");

    const cr_boost_multiplier = new BigNumber(await stakingInstance_ARTH_USDC.crBoostMultiplier()).div(BIG6);
    console.log("pool cr_boost_multiplier (div 1e6): ", cr_boost_multiplier.toNumber());

    // Note the Uniswap Pool Token and ARTHX amounts after staking
    let uni_pool_tokens_1 = new BigNumber("75e5");
    await pair_instance_ARTH_USDC.approve(stakingInstance_ARTH_USDC.address, uni_pool_tokens_1, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    console.log("accounts[1] approve ARTH_USDC staking pool for 7.5 (E6) LP tokens");
    const uni_pool_1st_stake_1 = new BigNumber(await pair_instance_ARTH_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const arthx_1st_stake_1 = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const rewards_balance_1st_stake_1 = new BigNumber(await stakingInstance_ARTH_USDC.rewards.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);

    await stakingInstance_ARTH_USDC.stake(uni_pool_tokens_1, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    console.log("accounts[1] staking 7.5 (E6) LP tokens into ARTH_USDC staking pool");
    console.log("accounts[1] LP token balance:", uni_pool_1st_stake_1.toString());
    console.log("accounts[1] ARTHX balance:", arthx_1st_stake_1.toString());
    console.log("accounts[1] staking rewards():", rewards_balance_1st_stake_1.toString());
    console.log("accounts[1] balanceOf:", (new BigNumber(await stakingInstance_ARTH_USDC.balanceOf(COLLATERAL_ARTH_AND_ARTHS_OWNER))).div(BIG6).toNumber());
    console.log("accounts[1] boostedBalanceOf:", (new BigNumber(await stakingInstance_ARTH_USDC.boostedBalanceOf(COLLATERAL_ARTH_AND_ARTHS_OWNER))).div(BIG6).toNumber());
    console.log("");

    let uni_pool_tokens_9 = new BigNumber("25e5");
    await pair_instance_ARTH_USDC.approve(stakingInstance_ARTH_USDC.address, uni_pool_tokens_9, { from: accounts[9] });
    console.log("accounts[9] approve ARTH_USDC staking pool for 2.5 (E6) LP tokens");
    const uni_pool_1st_stake_9 = new BigNumber(await pair_instance_ARTH_USDC.balanceOf.call(accounts[9])).div(BIG6);
    const arthx_1st_stake_9 = new BigNumber(await arthxInstance.balanceOf.call(accounts[9])).div(BIG18);
    const rewards_balance_1st_stake_9 = new BigNumber(await stakingInstance_ARTH_USDC.rewards(accounts[9])).div(BIG18);

    await stakingInstance_ARTH_USDC.stake(uni_pool_tokens_9, { from: accounts[9] });
    console.log("accounts[9] staking 2.5 (E6) LP tokens into ARTH_USDC staking pool");
    console.log("accounts[9] LP token balance:", uni_pool_1st_stake_9.toString());
    console.log("accounts[9] ARTHX balance:", arthx_1st_stake_9.toString());
    console.log("accounts[9] staking rewards():", rewards_balance_1st_stake_9.toString());
    console.log("accounts[9] balanceOf:", (new BigNumber(await stakingInstance_ARTH_USDC.balanceOf(accounts[9]))).div(BIG6).toNumber());
    console.log("accounts[9] boostedBalanceOf:", (new BigNumber(await stakingInstance_ARTH_USDC.boostedBalanceOf(accounts[9]))).div(BIG6).toNumber());
    console.log("");

    // Note the last update time
    const block_time_before = (await time.latest()).toNumber();
    console.log("current block time (in seconds):", block_time_before);

    // Note the total lastUpdateTime
    let rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_ARTH_USDC.lastUpdateTime.call());
    console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toString());

    // Note the total periodFinish
    let rewards_contract_periodFinish = new BigNumber(await stakingInstance_ARTH_USDC.periodFinish.call());
    console.log("pool periodFinish:", rewards_contract_periodFinish.toString());

    // Note the total lastTimeRewardApplicable
    let rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstance_ARTH_USDC.lastTimeRewardApplicable.call());
    console.log("pool lastTimeRewardApplicable():", rewards_contract_lastTimeRewardApplicable.toString());

    console.log("====================================================================");
    console.log("advance one week (one rewardsDuration period)");
    // Advance 7 days so the reward can be claimed
    await time.increase((7 * 86400) + 1);
    await time.advanceBlock();
    //await arthInstance.refreshCollateralRatio();
    console.log("");

    const cr_boost_multiplier_2 = new BigNumber(await stakingInstance_ARTH_USDC.crBoostMultiplier()).div(BIG6);
    console.log("pool cr_boost_multiplier (div 1e6): ", cr_boost_multiplier_2.toNumber());

    // Note the last update time
    let block_time_after = (await time.latest()).toNumber();
    console.log("block time after waiting one week (in seconds):", block_time_after);

    // Make sure there is a valid period for the contract
    await stakingInstance_ARTH_USDC.renewIfApplicable({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Note the total lastUpdateTime
    rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_ARTH_USDC.lastUpdateTime.call());
    console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toString());

    // Note the total periodFinish
    rewards_contract_periodFinish = new BigNumber(await stakingInstance_ARTH_USDC.periodFinish.call());
    console.log("pool periodFinish:", rewards_contract_periodFinish.toString());

    // Note the total lastTimeRewardApplicable
    rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstance_ARTH_USDC.lastTimeRewardApplicable.call());
    console.log("pool lastTimeRewardApplicable():", rewards_contract_lastTimeRewardApplicable.toString());

    // Note the total ARTH supply
    const rewards_contract_stored_uni_pool = new BigNumber(await stakingInstance_ARTH_USDC.totalSupply.call()).div(BIG6);
    console.log("pool totalSupply() (of LP tokens):", rewards_contract_stored_uni_pool.toString());

    // Print the decimals
    const staking_token_decimal = new BigNumber(await stakingInstance_ARTH_USDC.stakingDecimals.call())
    console.log("pool stakingDecimals():", staking_token_decimal.toString());

    console.log("");
    // Show the reward
    const staking_arthx_earned_1 = new BigNumber(await stakingInstance_ARTH_USDC.earned.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const staking_arthx_earned_9 = new BigNumber(await stakingInstance_ARTH_USDC.earned.call(accounts[9])).div(BIG18);

    console.log("accounts[1] earnings after 1 week:", staking_arthx_earned_1.toString());
    console.log("accounts[9] earnings after 1 week:", staking_arthx_earned_9.toString());
    const reward_week_1 = (staking_arthx_earned_1).plus(staking_arthx_earned_9);
    const effective_yearly_reward_at_week_1 = reward_week_1.multipliedBy(52.1429)
    console.log("Effective weekly reward at week 1: ", reward_week_1.toString());
    console.log("Effective yearly reward at week 1: ", effective_yearly_reward_at_week_1.toString());

    const duration_reward_1 = new BigNumber(await stakingInstance_ARTH_USDC.getRewardForDuration.call()).div(BIG18);
    console.log("Expected yearly reward: ", duration_reward_1.multipliedBy(52.1429).toString());

    // await stakingInstance_ARTH_USDC.getReward({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Note the UNI POOL and ARTHX amounts after the reward
    const uni_pool_post_reward_1 = new BigNumber(await pair_instance_ARTH_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const arthx_post_reward_1 = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    console.log("accounts[1] LP token balance:", uni_pool_post_reward_1.toString());
    console.log("accounts[1] ARTHX balance:", arthx_post_reward_1.toString());

    console.log("====================================================================");
    console.log("accounts[1] claim and withdrawal...");
    console.log("");
    await time.advanceBlock();
    const uni_pool_balance_1 = new BigNumber(await pair_instance_ARTH_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const staking_arthx_ew_earned_1 = new BigNumber(await stakingInstance_ARTH_USDC.earned.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    console.log("accounts[1] LP token balance:", uni_pool_balance_1.toString());
    console.log("accounts[1] staking earned():", staking_arthx_ew_earned_1.toString());
    console.log("");

    console.log("accounts[1] claims getReward()");
    await stakingInstance_ARTH_USDC.getReward({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await time.advanceBlock();

    console.log("accounts[1] performs withdraw()");
    await stakingInstance_ARTH_USDC.withdraw(uni_pool_tokens_1, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await time.advanceBlock();
    console.log("");

    const arthx_after_withdraw_0 = (new BigNumber(await arthxInstance.balanceOf(COLLATERAL_ARTH_AND_ARTHS_OWNER))).div(BIG18);
    console.log("accounts[1] ARTHX balance change:", (arthx_after_withdraw_0).minus(arthx_1st_stake_1).toNumber());
    console.log("accounts[1] vote balance:", new BigNumber(await arthxInstance.getCurrentVotes(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18).toNumber());
    console.log("accounts[1] ARTHX balance:", new BigNumber(await arthxInstance.balanceOf(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18).toNumber());
    console.log("====================================================================");

    console.log("wait two weeks so accounts[9] can earn more");
    // Advance a few days
    await time.increase(2 * (7 * 86400) + 1);
    await time.advanceBlock();

    // Make sure there is a valid period for the contract
    await stakingInstance_ARTH_USDC.renewIfApplicable({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Note the last update time
    block_time_after = (await time.latest()).toNumber();
    console.log("current block time (in seconds):", block_time_after);

    // Note the total lastUpdateTime
    rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_ARTH_USDC.lastUpdateTime.call());
    console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toString());

    // Note the total periodFinish
    rewards_contract_periodFinish = new BigNumber(await stakingInstance_ARTH_USDC.periodFinish.call()).toNumber();
    console.log("pool periodFinish: ", rewards_contract_periodFinish.toString());

    // Note the total lastTimeRewardApplicable
    rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstance_ARTH_USDC.lastTimeRewardApplicable.call()).toNumber();
    console.log("pool lastTimeRewardApplicable: ", rewards_contract_lastTimeRewardApplicable.toString());

    // Show the reward
    const staking_arthx_part2_earned_1 = new BigNumber(await stakingInstance_ARTH_USDC.earned.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const staking_arthx_part2_earned_9 = new BigNumber(await stakingInstance_ARTH_USDC.earned.call(accounts[9])).div(BIG18);
    console.log("accounts[1] staking earned():", staking_arthx_part2_earned_1.toString());
    console.log("accounts[9] staking earned():", staking_arthx_part2_earned_9.toString());

    const uni_pool_2nd_time_balance = new BigNumber(await pair_instance_ARTH_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const arthx_2nd_time_balance = new BigNumber(await arthxInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const rewards_earned_2nd_time = new BigNumber(await stakingInstance_ARTH_USDC.earned.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    console.log("accounts[1] LP token balance:", uni_pool_2nd_time_balance.toString());
    console.log("accounts[1] ARTHX balance:", arthx_2nd_time_balance.toString());
    console.log("accounts[1] staking earned():", rewards_earned_2nd_time.toString());
    console.log("");

    console.log("accounts[9] getReward()");
    await stakingInstance_ARTH_USDC.getReward({ from: accounts[9] });

    console.log("accounts[9] withdrawing");
    await stakingInstance_ARTH_USDC.withdraw(uni_pool_tokens_9, { from: accounts[9] });
    await time.advanceBlock();

    const reward_week_3 = ((staking_arthx_part2_earned_1).plus(staking_arthx_part2_earned_9)).plus(staking_arthx_ew_earned_1);
    const effective_yearly_reward_at_week_3 = reward_week_3.multipliedBy(52.1429 / 3.0); // Total over 3 weeks
    console.log("Effective weekly reward at week 3: ", reward_week_3.div(3).toString()); // Total over 3 weeks
    console.log("Effective yearly reward at week 3: ", effective_yearly_reward_at_week_3.toString());

    const duration_reward_3 = new BigNumber(await stakingInstance_ARTH_USDC.getRewardForDuration.call()).div(BIG18);
    console.log("Expected yearly reward: ", duration_reward_3.multipliedBy(52.1429).toString());

    const acc_9_ARTHS_balance_after = (new BigNumber(await arthxInstance.balanceOf(accounts[9]))).div(BIG18);
    console.log("accounts[9] ARTHX balance change:", acc_9_ARTHS_balance_after.minus(arthx_1st_stake_9).toNumber());
  });

  it("blocks a greylisted address which tries to stake; SHOULD FAIL", async () => {
    console.log("greylistAddress(accounts[9])");
    await stakingInstance_ARTH_USDC.greylistAddress(accounts[9], { from: STAKING_OWNER });
    console.log("");
    console.log("this should fail");
    await pair_instance_ARTH_USDC.approve(stakingInstance_ARTH_USDC.address, new BigNumber("1e6"), { from: accounts[9] });

    await expectRevert.unspecified(stakingInstance_ARTH_USDC.stake(new BigNumber("1e6"), { from: accounts[9] }));
  });

  it("ungreylists a greylisted address which tries to stake; SHOULD SUCCEED", async () => {
    console.log("greylistAddress(accounts[9])");
    await stakingInstance_ARTH_USDC.greylistAddress(accounts[9], { from: STAKING_OWNER });
    console.log("");
    console.log("this should succeed");
    await pair_instance_ARTH_USDC.approve(stakingInstance_ARTH_USDC.address, new BigNumber("1e6"), { from: accounts[9] });
    await stakingInstance_ARTH_USDC.stake(new BigNumber("1e6"), { from: accounts[9] });
  });


  it('PART 2: Locked stakes', async () => {
    console.log("====================================================================");
    console.log("NOW TRY TESTS WITH LOCKED STAKES.");
    console.log("[1] AND [9] HAVE WITHDRAWN EVERYTHING AND ARE NOW AT 0");

    // Need to approve first so the staking can use transfer
    const uni_pool_normal_1 = new BigNumber("15e5");
    const uni_pool_normal_9 = new BigNumber("5e5");
    await pair_instance_ARTH_USDC.approve(stakingInstance_ARTH_USDC.address, uni_pool_normal_1, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await pair_instance_ARTH_USDC.approve(stakingInstance_ARTH_USDC.address, uni_pool_normal_9, { from: accounts[9] });

    // Stake Normal
    await stakingInstance_ARTH_USDC.stake(uni_pool_normal_1, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await stakingInstance_ARTH_USDC.stake(uni_pool_normal_9, { from: accounts[9] });
    await time.advanceBlock();

    // Need to approve first so the staking can use transfer
    const uni_pool_locked_1 = new BigNumber("75e5");
    const uni_pool_locked_1_sum = new BigNumber("10e6");
    const uni_pool_locked_9 = new BigNumber("25e5");
    await pair_instance_ARTH_USDC.approve(stakingInstance_ARTH_USDC.address, uni_pool_locked_1_sum, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await pair_instance_ARTH_USDC.approve(stakingInstance_ARTH_USDC.address, uni_pool_locked_9, { from: accounts[9] });

    // // Note the ARTH amounts before
    // const arth_before_1_locked = new BigNumber(await arthInstance.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    // const arth_before_9_locked = new BigNumber(await arthInstance.balanceOf.call(accounts[9])).div(BIG18);
    // console.log("ARTH_USDC Uniswap Liquidity Tokens BEFORE [1]: ", arth_before_1_locked.toString());
    // console.log("ARTH_USDC Uniswap Liquidity Tokens BEFORE [9]: ", arth_before_9_locked.toString());

    console.log("accounts[1] ARTHX balance:", new BigNumber(await arthxInstance.balanceOf(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18).toNumber());

    // Stake Locked
    // account[1]
    await stakingInstance_ARTH_USDC.stakeLocked(uni_pool_locked_1, 7 * 86400, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER }); // 15 days
    await stakingInstance_ARTH_USDC.stakeLocked(new BigNumber("25e5"), 548 * 86400, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER }); // 270 days

    // account[9]
    await stakingInstance_ARTH_USDC.stakeLocked(uni_pool_locked_9, 28 * 86400, { from: accounts[9] }); // 6 months
    await time.advanceBlock();

    // Show the stake structs
    const locked_stake_structs_1 = await stakingInstance_ARTH_USDC.lockedStakesOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER);
    const locked_stake_structs_9 = await stakingInstance_ARTH_USDC.lockedStakesOf.call(accounts[9]);
    console.log("LOCKED STAKES [1]: ", locked_stake_structs_1);
    console.log("LOCKED STAKES [9]: ", locked_stake_structs_9);

    // Note the UNI POOL and ARTHX amount after staking
    const regular_balance_1 = new BigNumber(await stakingInstance_ARTH_USDC.balanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const boosted_balance_1 = new BigNumber(await stakingInstance_ARTH_USDC.boostedBalanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const unlocked_balance_1 = new BigNumber(await stakingInstance_ARTH_USDC.unlockedBalanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const locked_balance_1 = new BigNumber(await stakingInstance_ARTH_USDC.lockedBalanceOf.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG6);
    const regular_balance_9 = new BigNumber(await stakingInstance_ARTH_USDC.balanceOf.call(accounts[9])).div(BIG6);
    const boosted_balance_9 = new BigNumber(await stakingInstance_ARTH_USDC.boostedBalanceOf.call(accounts[9])).div(BIG6);
    const unlocked_balance_9 = new BigNumber(await stakingInstance_ARTH_USDC.unlockedBalanceOf.call(accounts[9])).div(BIG6);
    const locked_balance_9 = new BigNumber(await stakingInstance_ARTH_USDC.lockedBalanceOf.call(accounts[9])).div(BIG6);
    console.log("REGULAR BALANCE [1]: ", regular_balance_1.toString());
    console.log("BOOSTED BALANCE [1]: ", boosted_balance_1.toString());
    console.log("---- UNLOCKED [1]: ", unlocked_balance_1.toString());
    console.log("---- LOCKED [1]: ", locked_balance_1.toString());
    console.log("REGULAR BALANCE [9]: ", regular_balance_9.toString());
    console.log("BOOSTED BALANCE [9]: ", boosted_balance_9.toString());
    console.log("---- UNLOCKED [9]: ", unlocked_balance_9.toString());
    console.log("---- LOCKED [9]: ", locked_balance_9.toString());

    console.log("TRY AN EARLY WITHDRAWAL (SHOULD FAIL)");
    await expectRevert.unspecified(stakingInstance_ARTH_USDC.withdrawLocked(locked_stake_structs_1[0].kek_id, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER }));
    await expectRevert.unspecified(stakingInstance_ARTH_USDC.withdrawLocked(locked_stake_structs_9[0].kek_id, { from: accounts[9] }));
    await time.advanceBlock();

    console.log("====================================================================");
    console.log("WAIT 7 DAYS");



    // Advance 7 days
    await time.increase((7 * 86400) + 1);
    await time.advanceBlock();

    // Make sure there is a valid period for the contract and sync it
    await stakingInstance_ARTH_USDC.renewIfApplicable({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    const staking_arthx_earned_1 = new BigNumber(await stakingInstance_ARTH_USDC.earned.call(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18);
    const staking_arthx_earned_9 = new BigNumber(await stakingInstance_ARTH_USDC.earned.call(accounts[9])).div(BIG18);
    console.log("accounts[1] earnings after 1 week:", staking_arthx_earned_1.toString());
    console.log("accounts[9] earnings after 1 week:", staking_arthx_earned_9.toString());
    const reward_week_1 = (staking_arthx_earned_1).plus(staking_arthx_earned_9);
    const effective_yearly_reward_at_week_1 = reward_week_1.multipliedBy(52.1429)
    console.log("Effective weekly reward at week 1: ", reward_week_1.toString());
    console.log("Effective yearly reward at week 1: ", effective_yearly_reward_at_week_1.toString());

    const duration_reward_1 = new BigNumber(await stakingInstance_ARTH_USDC.getRewardForDuration.call()).div(BIG18);
    console.log("Expected yearly reward: ", duration_reward_1.multipliedBy(52.1429).toString());

    console.log("TRY WITHDRAWING AGAIN");
    console.log("[1] SHOULD SUCCEED, [9] SHOULD FAIL");
    await stakingInstance_ARTH_USDC.withdrawLocked(locked_stake_structs_1[0].kek_id, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await expectRevert.unspecified(stakingInstance_ARTH_USDC.withdrawLocked(locked_stake_structs_9[0].kek_id, { from: accounts[9] }));

    console.log("====================================================================");
    console.log("ADVANCING 28 DAYS");

    // Advance 28 days
    await time.increase((28 * 86400) + 1);
    await time.advanceBlock();

    // Make sure there is a valid period for the contract and sync it
    await stakingInstance_ARTH_USDC.renewIfApplicable({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    const staking_arthx_earned_28_1 = new BigNumber(await stakingInstance_ARTH_USDC.earned.call(accounts[1])).div(BIG18);
    const staking_arthx_earned_28_9 = new BigNumber(await stakingInstance_ARTH_USDC.earned.call(accounts[9])).div(BIG18);
    console.log("accounts[1] earnings after 5 weeks:", staking_arthx_earned_28_1.toString());
    console.log("accounts[9] earnings after 5 weeks:", staking_arthx_earned_28_9.toString());
    const reward_week_5 = (staking_arthx_earned_28_1).plus(staking_arthx_earned_28_9);
    const effective_yearly_reward_at_week_5 = reward_week_5.multipliedBy(52.1429 / 5.0)
    console.log("Effective weekly reward at week 5: ", reward_week_5.div(5).toString());
    console.log("Effective yearly reward at week 5: ", effective_yearly_reward_at_week_5.toString());

    const duration_reward_3 = new BigNumber(await stakingInstance_ARTH_USDC.getRewardForDuration.call()).div(BIG18);
    console.log("Expected yearly reward: ", duration_reward_3.multipliedBy(52.1429).toString());

    // Account 9 withdraws and claims its locked stake
    await stakingInstance_ARTH_USDC.withdrawLocked(locked_stake_structs_9[0].kek_id, { from: accounts[9] });
    await stakingInstance_ARTH_USDC.getReward({ from: accounts[9] });
    await expectRevert.unspecified(stakingInstance_ARTH_USDC.withdrawLocked(locked_stake_structs_1[1].kek_id, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER }));

    console.log("UNLOCKING ALL STAKES");
    await stakingInstance_ARTH_USDC.unlockStakes({ from: STAKING_OWNER });
    await stakingInstance_ARTH_USDC.withdrawLocked(locked_stake_structs_1[1].kek_id, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });




    await arthxInstance.transfer(stakingInstance_ARTH_USDC.address, new BigNumber("100000e18"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    console.log("stakingInstance ARTHX balance:", new BigNumber(await arthxInstance.balanceOf(stakingInstance_ARTH_USDC.address)).div(BIG18).toNumber());
    await stakingInstance_ARTH_USDC.getReward({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    console.log("accounts[1] ARTHX balance:", new BigNumber(await arthxInstance.balanceOf(COLLATERAL_ARTH_AND_ARTHS_OWNER)).div(BIG18).toNumber());
  });

  it("ArthPool security tests; SHOULD FAIL", async () => {
    console.log("Try to call various things on the pool contract that should fail");
    await expectRevert.unspecified(pool_instance_USDC.setCollatETHOracle(DUMP_ADDRESS, DUMP_ADDRESS, { from: accounts[6] }));
    await expectRevert.unspecified(pool_instance_USDC.toggleMinting({ from: accounts[6] }));
    await expectRevert.unspecified(pool_instance_USDC.toggleRedeeming({ from: accounts[6] }));
    await expectRevert.unspecified(pool_instance_USDC.toggleRecollateralize({ from: accounts[6] }));
    await expectRevert.unspecified(pool_instance_USDC.toggleBuyBack({ from: accounts[6] }));
    await expectRevert.unspecified(pool_instance_USDC.toggleCollateralPrice({ from: accounts[6] }));
    await expectRevert.unspecified(pool_instance_USDC.setPoolParameters(
      new BigNumber("100e6"),
      new BigNumber("5000e0"),
      new BigNumber("3600e0"),
      { from: accounts[6] }
    ));
    await expectRevert.unspecified(pool_instance_USDC.setTimelock(DUMP_ADDRESS, { from: accounts[6] }));
    await expectRevert.unspecified(pool_instance_USDC.setOwner(DUMP_ADDRESS, { from: accounts[6] }));


  });

  it("Does a fair launch", async () => {
    console.log("====================================================================");
    await arthxInstance.transfer(stakingInstance_ARTH_WETH.address, new BigNumber("1000000e18"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await pair_instance_ARTH_WETH.transfer(accounts[2], new BigNumber("1e18"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await pair_instance_ARTH_WETH.transfer(accounts[3], new BigNumber("1e18"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    console.log("staking contract ARTHX balance:", (new BigNumber(await arthxInstance.balanceOf(stakingInstance_ARTH_WETH.address))).div(BIG18).toNumber());
    console.log("accounts[2] ARTH-WETH LP token balance:", (new BigNumber(await pair_instance_ARTH_WETH.balanceOf(accounts[2]))).div(BIG18).toNumber());
    console.log("accounts[3] ARTH-WETH LP token balance:", (new BigNumber(await pair_instance_ARTH_WETH.balanceOf(accounts[3]))).div(BIG18).toNumber());

    console.log("");

    let acc2_startingARTHSbalance = new BigNumber(await (arthxInstance.balanceOf(accounts[2])));
    let acc3_startingARTHSbalance = new BigNumber(await (arthxInstance.balanceOf(accounts[3])));

    console.log("accounts[2] ARTHX balance:", new BigNumber(await arthxInstance.balanceOf(accounts[2])).div(BIG18).toNumber());
    console.log("accounts[3] ARTHX balance:", new BigNumber(await arthxInstance.balanceOf(accounts[3])).div(BIG18).toNumber());

    await pair_instance_ARTH_WETH.approve(stakingInstance_ARTH_WETH.address, new BigNumber("1e18"), { from: accounts[2] });
    await pair_instance_ARTH_WETH.approve(stakingInstance_ARTH_WETH.address, new BigNumber("1e18"), { from: accounts[3] });

    console.log("staking");
    await stakingInstance_ARTH_WETH.stake(new BigNumber("1e18"), { from: accounts[3] });


    // Note the last update time
    const block_time_before = (await time.latest()).toNumber();
    console.log("current block time (in seconds):", block_time_before);

    // Note the total lastUpdateTime
    let rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_ARTH_WETH.lastUpdateTime.call());
    console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toNumber());

    // Note the total periodFinish
    let rewards_contract_periodFinish = new BigNumber(await stakingInstance_ARTH_WETH.periodFinish.call());
    console.log("pool periodFinish:", rewards_contract_periodFinish.toNumber());

    // Note the total lastTimeRewardApplicable
    let rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstance_ARTH_WETH.lastTimeRewardApplicable.call());
    console.log("pool lastTimeRewardApplicable():", rewards_contract_lastTimeRewardApplicable.toNumber());


    const staking_arthx_earned_2 = new BigNumber(await stakingInstance_ARTH_WETH.earned(accounts[2])).div(BIG18);
    const staking_arthx_earned_3 = new BigNumber(await stakingInstance_ARTH_WETH.earned(accounts[3])).div(BIG18);

    console.log("accounts[2] staking earned():", staking_arthx_earned_2.toNumber());
    console.log("accounts[3] staking earned():", staking_arthx_earned_3.toNumber());

    let cr_boost_multiplier_2;
    let mid_block_time_before;
    let rewards_contract_stored_uni_pool;
    let mid_staking_arthx_earned_2;
    let mid_staking_arthx_earned_3;

    for (let i = 0; i < 3; i++) {
      console.log("====================================================================");
      console.log("advance one day [day number:", i, "]");

      if (i == 1) {
        await stakingInstance_ARTH_WETH.stake(new BigNumber("1e18"), { from: accounts[2] });
      }

      await time.increase(86400);
      await time.advanceBlock();
      console.log("");

      cr_boost_multiplier_2 = new BigNumber(await stakingInstance_ARTH_WETH.crBoostMultiplier()).div(BIG6);
      console.log("cr_boost_multiplier:", cr_boost_multiplier_2.toNumber());

      // Make sure there is a valid period for the contract
      await stakingInstance_ARTH_WETH.renewIfApplicable({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

      // Note the last update time
      mid_block_time_before = (await time.latest()).toNumber();
      console.log("current block time (in seconds):", mid_block_time_before);

      // Note the total lastUpdateTime
      rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_ARTH_WETH.lastUpdateTime());
      console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toNumber());

      // Note the total periodFinish
      rewards_contract_periodFinish = new BigNumber(await stakingInstance_ARTH_WETH.periodFinish());
      console.log("pool periodFinish:", rewards_contract_periodFinish.toNumber());

      // Note the total lastTimeRewardApplicable
      rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstance_ARTH_WETH.lastTimeRewardApplicable());
      console.log("pool lastTimeRewardApplicable():", rewards_contract_lastTimeRewardApplicable.toNumber());

      // Note the total ARTH supply
      rewards_contract_stored_uni_pool = new BigNumber(await stakingInstance_ARTH_WETH.totalSupply()).div(BIG18);
      console.log("pool totalSupply() (of LP tokens):", rewards_contract_stored_uni_pool.toNumber());


      // Show the reward
      mid_staking_arthx_earned_2 = new BigNumber(await stakingInstance_ARTH_WETH.earned(accounts[2])).div(BIG18);
      mid_staking_arthx_earned_3 = new BigNumber(await stakingInstance_ARTH_WETH.earned(accounts[3])).div(BIG18);

      console.log("accounts[2] staking earned():", mid_staking_arthx_earned_2.toNumber());
      console.log("accounts[3] staking earned():", mid_staking_arthx_earned_3.toNumber());
    }

    console.log("accounts[2] getReward()");
    await stakingInstance_ARTH_WETH.getReward({ from: accounts[2] });
    console.log("accounts[3] getReward()");
    await stakingInstance_ARTH_WETH.getReward({ from: accounts[3] });
    console.log("");

    console.log("accounts[2] ARTHX balance change:", ((new BigNumber(await arthxInstance.balanceOf(accounts[2]))).minus(acc2_startingARTHSbalance)).div(BIG18).toNumber());
    console.log("accounts[3] ARTHX balance change:", ((new BigNumber(await arthxInstance.balanceOf(accounts[3]))).minus(acc3_startingARTHSbalance)).div(BIG18).toNumber());

    console.log("");

    // Show the reward
    mid_staking_arthx_earned_2 = new BigNumber(await stakingInstance_ARTH_WETH.earned(accounts[2])).div(BIG18);
    mid_staking_arthx_earned_3 = new BigNumber(await stakingInstance_ARTH_WETH.earned(accounts[3])).div(BIG18);

    console.log("accounts[2] staking earned():", mid_staking_arthx_earned_2.toNumber());
    console.log("accounts[3] staking earned():", mid_staking_arthx_earned_3.toNumber());

    console.log("staking contract ARTHX balance:", new BigNumber(await arthxInstance.balanceOf(stakingInstance_ARTH_WETH.address)).div(BIG18).toNumber());
    console.log("crBoostMultiplier():", new BigNumber(await stakingInstance_ARTH_WETH.crBoostMultiplier()).toNumber());
  });

});
