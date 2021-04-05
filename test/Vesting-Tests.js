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
const TestSwap = artifacts.require("Uniswap/TestSwap");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT");
// const FakeCollateral_yUSD = artifacts.require("FakeCollateral/FakeCollateral_yUSD");

// Collateral Pools
const Pool_USDC = artifacts.require("Arth/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Arth/Pools/Pool_USDT");
// const Pool_yUSD = artifacts.require("Arth/Pools/Pool_yUSD");

// Oracles
const UniswapPairOracle_ARTH_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_ARTH_WETH");
const UniswapPairOracle_ARTH_USDT = artifacts.require("Oracle/Fakes/UniswapPairOracle_ARTH_USDT");
const UniswapPairOracle_ARTH_USDC = artifacts.require("Oracle/Fakes/UniswapPairOracle_ARTH_USDC");
// const UniswapPairOracle_ARTH_yUSD = artifacts.require("Oracle/Fakes/UniswapPairOracle_ARTH_yUSD");
const UniswapPairOracle_ARTHS_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_ARTHS_WETH");
const UniswapPairOracle_ARTHS_USDT = artifacts.require("Oracle/Fakes/UniswapPairOracle_ARTHS_USDT");
const UniswapPairOracle_ARTHS_USDC = artifacts.require("Oracle/Fakes/UniswapPairOracle_ARTHS_USDC");
// const UniswapPairOracle_ARTHS_yUSD = artifacts.require("Oracle/Fakes/UniswapPairOracle_ARTHS_yUSD");
const UniswapPairOracle_USDT_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_USDT_WETH");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_USDC_WETH");

// Chainlink Price Consumer
//const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest");

// ARTH core
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");
const ARTHShares = artifacts.require("ARTHX/ARTHShares");
const StakingRewards_ARTH_WETH = artifacts.require("Staking/Fake_Stakes/Stake_ARTH_WETH.sol");
const StakingRewards_ARTH_USDC = artifacts.require("Staking/Fake_Stakes/Stake_ARTH_USDC.sol");
const StakingRewards_ARTH_USDT = artifacts.require("Staking/Fake_Stakes/Stake_ARTH_USDT.sol");
// const StakingRewards_ARTH_yUSD = artifacts.require("Staking/Fake_Stakes/Stake_ARTH_yUSD.sol");
const StakingRewards_ARTHS_WETH = artifacts.require("Staking/Fake_Stakes/Stake_ARTHS_WETH.sol");
const StakingRewards_ARTHS_USDC = artifacts.require("Staking/Fake_Stakes/Stake_ARTHS_USDC.sol");
const StakingRewards_ARTHS_USDT = artifacts.require("Staking/Fake_Stakes/Stake_ARTHS_USDT.sol");
// const StakingRewards_ARTHS_yUSD = artifacts.require("Staking/Fake_Stakes/Stake_ARTHS_yUSD.sol");

// Token vesting
const TokenVesting = artifacts.require("ARTHS/TokenVesting.sol");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

const ONE_MILLION_DEC18 = new BigNumber(1000000e18);
const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);
const ONE_THOUSAND_DEC18 = new BigNumber(1000e18);
const THREE_THOUSAND_DEC18 = new BigNumber(3000e18);
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
  // let col_instance_yUSD;

  let TestSwap_instance;

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
  // let oracle_instance_ARTH_yUSD;
  let oracle_instance_ARTHS_WETH;
  let oracle_instance_ARTHS_USDC;
  let oracle_instance_ARTHS_USDT;
  // let oracle_instance_ARTHS_yUSD;

  // Initialize ETH-USD Chainlink Oracle too
  let oracle_chainlink_ETH_USD;

  // Initialize the governance contract
  let governanceInstance;

  // Initialize pool instances
  let pool_instance_USDC;
  let pool_instance_USDT;
  // let pool_instance_yUSD;

  // Initialize pair addresses
  let pair_addr_ARTH_WETH;
  let pair_addr_ARTH_USDC;
  let pair_addr_ARTH_USDT;
  // let pair_addr_ARTH_yUSD;
  let pair_addr_ARTHS_WETH;
  let pair_addr_ARTHS_USDC;
  let pair_addr_ARTHS_USDT;
  // let pair_addr_ARTHS_yUSD;

  // Initialize pair contracts
  let pair_instance_ARTH_WETH;
  let pair_instance_ARTH_USDC;
  let pair_instance_ARTH_USDT;
  // let pair_instance_ARTH_yUSD;
  let pair_instance_ARTHS_WETH;
  let pair_instance_ARTHS_USDC;
  let pair_instance_ARTHS_USDT;
  // let pair_instance_ARTHS_yUSD;

  // Initialize pair orders
  let artharthx_first_ARTH_WETH;
  let artharthx_first_ARTH_USDC;
  let artharthx_first_ARTH_USDT;
  // let artharthx_first_ARTH_yUSD;
  let artharthx_first_ARTHS_WETH;
  let artharthx_first_ARTHS_USDC;
  let artharthx_first_ARTHS_USDT;
  // let artharthx_first_ARTHS_yUSD;

  // Initialize staking instances
  let stakingInstance_ARTH_WETH;
  let stakingInstance_ARTH_USDC;
  let stakingInstance_ARTH_USDT;
  // let stakingInstance_ARTH_yUSD;
  let stakingInstance_ARTHS_WETH;
  let stakingInstance_ARTHS_USDC;
  let stakingInstance_ARTHS_USDT;
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
    // col_instance_yUSD = await FakeCollateral_yUSD.deployed();

    TestSwap_instance = await TestSwap.deployed();

    // Fill the Uniswap Router Instance
    routerInstance = await UniswapV2Router02_Modified.deployed();

    // Fill the Timelock instance
    timelockInstance = await Timelock.deployed();

    // Fill oracle instances
    oracle_instance_ARTH_WETH = await UniswapPairOracle_ARTH_WETH.deployed();
    oracle_instance_ARTH_USDC = await UniswapPairOracle_ARTH_USDC.deployed();
    oracle_instance_ARTH_USDT = await UniswapPairOracle_ARTH_USDT.deployed();
    // oracle_instance_ARTH_yUSD = await UniswapPairOracle_ARTH_yUSD.deployed();
    oracle_instance_ARTHS_WETH = await UniswapPairOracle_ARTHS_WETH.deployed();
    oracle_instance_ARTHS_USDC = await UniswapPairOracle_ARTHS_USDC.deployed();
    oracle_instance_ARTHS_USDT = await UniswapPairOracle_ARTHS_USDT.deployed();
    // oracle_instance_ARTHS_yUSD = await UniswapPairOracle_ARTHS_yUSD.deployed();
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
    // pool_instance_yUSD = await Pool_yUSD.deployed();

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
    // pair_addr_ARTH_yUSD = await uniswapFactoryInstance.getPair(arthInstance.address, FakeCollateral_yUSD.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    pair_addr_ARTHS_WETH = await uniswapFactoryInstance.getPair(arthxInstance.address, WETH.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    pair_addr_ARTHS_USDC = await uniswapFactoryInstance.getPair(arthxInstance.address, FakeCollateral_USDC.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    pair_addr_ARTHS_USDT = await uniswapFactoryInstance.getPair(arthxInstance.address, FakeCollateral_USDT.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    // pair_addr_ARTHS_yUSD = await uniswapFactoryInstance.getPair(arthxInstance.address, FakeCollateral_yUSD.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    pair_addr_USDT_WETH = await uniswapFactoryInstance.getPair(FakeCollateral_USDT.address, WETH.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    pair_addr_USDC_WETH = await uniswapFactoryInstance.getPair(FakeCollateral_USDC.address, WETH.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Get instances of the pairs
    pair_instance_ARTH_WETH = await UniswapV2Pair.at(pair_addr_ARTH_WETH);
    pair_instance_ARTH_USDC = await UniswapV2Pair.at(pair_addr_ARTH_USDC);
    pair_instance_ARTH_USDT = await UniswapV2Pair.at(pair_addr_ARTH_USDT);
    // pair_instance_ARTH_yUSD = await UniswapV2Pair.at(pair_addr_ARTH_yUSD);
    pair_instance_ARTHS_WETH = await UniswapV2Pair.at(pair_addr_ARTHS_WETH);
    pair_instance_ARTHS_USDC = await UniswapV2Pair.at(pair_addr_ARTHS_USDC);
    pair_instance_ARTHS_USDT = await UniswapV2Pair.at(pair_addr_ARTHS_USDT);
    // pair_instance_ARTHS_yUSD = await UniswapV2Pair.at(pair_addr_ARTHS_yUSD);
    pair_instance_USDT_WETH = await UniswapV2Pair.at(pair_addr_USDT_WETH);
    pair_instance_USDC_WETH = await UniswapV2Pair.at(pair_addr_USDC_WETH);

    // Get the pair order results
    artharthx_first_ARTH_WETH = await oracle_instance_ARTH_WETH.token0();
    artharthx_first_ARTH_USDC = await oracle_instance_ARTH_USDC.token0();
    artharthx_first_ARTH_USDT = await oracle_instance_ARTH_USDT.token0();
    // artharthx_first_ARTH_yUSD = await oracle_instance_ARTH_yUSD.token0();
    artharthx_first_ARTHS_WETH = await oracle_instance_ARTHS_WETH.token0();
    artharthx_first_ARTHS_USDC = await oracle_instance_ARTHS_USDC.token0();
    artharthx_first_ARTHS_USDT = await oracle_instance_ARTHS_USDT.token0();
    // artharthx_first_ARTHS_yUSD = await oracle_instance_ARTHS_yUSD.token0();

    artharthx_first_ARTH_WETH = arthInstance.address == artharthx_first_ARTH_WETH;
    artharthx_first_ARTH_USDC = arthInstance.address == artharthx_first_ARTH_USDC;
    artharthx_first_ARTH_USDT = arthInstance.address == artharthx_first_ARTH_USDT;
    // artharthx_first_ARTH_yUSD = arthInstance.address == artharthx_first_ARTH_yUSD;
    artharthx_first_ARTHS_WETH = arthxInstance.address == artharthx_first_ARTHS_WETH;
    artharthx_first_ARTHS_USDC = arthxInstance.address == artharthx_first_ARTHS_USDC;
    artharthx_first_ARTHS_USDT = arthxInstance.address == artharthx_first_ARTHS_USDT;
    // artharthx_first_ARTHS_yUSD = arthxInstance.address == artharthx_first_ARTHS_yUSD;

    // Fill the staking rewards instances
    stakingInstance_ARTH_WETH = await StakingRewards_ARTH_WETH.deployed();
    stakingInstance_ARTH_USDC = await StakingRewards_ARTH_USDC.deployed();
    stakingInstance_ARTH_USDT = await StakingRewards_ARTH_USDT.deployed();
    // stakingInstance_ARTH_yUSD = await StakingRewards_ARTH_yUSD.deployed();
    stakingInstance_ARTHS_WETH = await StakingRewards_ARTHS_WETH.deployed();
    stakingInstance_ARTHS_USDC = await StakingRewards_ARTHS_USDC.deployed();
    stakingInstance_ARTHS_USDT = await StakingRewards_ARTHS_USDT.deployed();
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
    // await oracle_instance_ARTH_yUSD.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await oracle_instance_ARTHS_WETH.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await oracle_instance_ARTHS_USDC.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await oracle_instance_ARTHS_USDT.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    // await oracle_instance_ARTHS_yUSD.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    await oracle_instance_USDT_WETH.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await oracle_instance_USDC_WETH.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Get the prices
    // Price is in collateral needed for 1 ARTH
    let arth_price_from_ARTH_WETH = (new BigNumber(await oracle_instance_ARTH_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
    let arth_price_from_ARTH_USDC = (new BigNumber(await oracle_instance_ARTH_USDC.consult.call(FakeCollateral_USDC.address, 1e6))).div(BIG6).toNumber();
    let arth_price_from_ARTH_USDT = (new BigNumber(await oracle_instance_ARTH_USDT.consult.call(FakeCollateral_USDT.address, 1e6))).div(BIG6).toNumber();
    // let arth_price_from_ARTH_yUSD = (new BigNumber(await oracle_instance_ARTH_yUSD.consult.call(FakeCollateral_yUSD.address, 1e6))).div(BIG6).toNumber();
    let arthx_price_from_ARTHS_WETH = (new BigNumber(await oracle_instance_ARTHS_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
    let arthx_price_from_ARTHS_USDC = (new BigNumber(await oracle_instance_ARTHS_USDC.consult.call(FakeCollateral_USDC.address, 1e6))).div(BIG6).toNumber();
    let arthx_price_from_ARTHS_USDT = (new BigNumber(await oracle_instance_ARTHS_USDT.consult.call(FakeCollateral_USDT.address, 1e6))).div(BIG6).toNumber();
    // let arthx_price_from_ARTHS_yUSD = (new BigNumber(await oracle_instance_ARTHS_yUSD.consult.call(FakeCollateral_yUSD.address, 1e6))).div(BIG6).toNumber();
    let USDT_price_from_USDT_WETH = (new BigNumber(await oracle_instance_USDT_WETH.consult.call(WETH.address, 1e6))).div(1e6).toNumber();
    let USDC_price_from_USDC_WETH = (new BigNumber(await oracle_instance_USDC_WETH.consult.call(WETH.address, 1e6))).div(1e6).toNumber();

    // Print the prices
    console.log("arth_price_from_ARTH_WETH: ", arth_price_from_ARTH_WETH.toString(), " ARTH = 1 WETH");
    console.log("arth_price_from_ARTH_USDC: ", arth_price_from_ARTH_USDC.toString(), " ARTH = 1 USDC");
    console.log("arth_price_from_ARTH_USDT: ", arth_price_from_ARTH_USDT.toString(), " ARTH = 1 USDT");
    // console.log("arth_price_from_ARTH_yUSD: ", arth_price_from_ARTH_yUSD.toString(), " ARTH = 1 yUSD");
    console.log("arthx_price_from_ARTHS_WETH: ", arthx_price_from_ARTHS_WETH.toString(), " ARTHX = 1 WETH");
    console.log("arthx_price_from_ARTHS_USDC: ", arthx_price_from_ARTHS_USDC.toString(), " ARTHX = 1 USDC");
    console.log("arthx_price_from_ARTHS_USDT: ", arthx_price_from_ARTHS_USDT.toString(), " ARTHX = 1 USDT");
    // console.log("arthx_price_from_ARTHS_yUSD: ", arthx_price_from_ARTHS_yUSD.toString(), " ARTHX = 1 yUSD");
    console.log("USDT_price_from_USDT_WETH: ", USDT_price_from_USDT_WETH.toString(), " USDT = 1 WETH");
    console.log("USDC_price_from_USDC_WETH: ", USDC_price_from_USDC_WETH.toString(), " USDC = 1 WETH");

    // Add allowances to the Uniswap Router
    await wethInstance.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await col_instance_USDC.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await col_instance_USDT.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    // await col_instance_yUSD.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await arthInstance.approve(routerInstance.address, new BigNumber(1000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await arthxInstance.approve(routerInstance.address, new BigNumber(5000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // Add allowances to the swapToPrice contract
    await wethInstance.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await col_instance_USDC.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await col_instance_USDT.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    // await col_instance_yUSD.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await arthInstance.approve(swapToPriceInstance.address, new BigNumber(1000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await arthxInstance.approve(swapToPriceInstance.address, new BigNumber(5000000e18), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });


    // console.log("===============FIRST SWAPS===============");

    // //--- ARTH

    // // Handle ARTH / WETH
    // // Targeting 390.6 ARTH / 1 WETH
    // await swapToPriceInstance.swapToPrice(
    // 	arthInstance.address,
    // 	wethInstance.address,
    // 	new BigNumber(3906e5),
    // 	new BigNumber(1e6),
    // 	new BigNumber(100e18),
    // 	new BigNumber(100e18),
    // 	COLLATERAL_ARTH_AND_ARTHS_OWNER,
    // 	new BigNumber(2105300114),
    // 	{ from: COLLATERAL_ARTH_AND_ARTHS_OWNER }
    // )

    // // Handle ARTH / USDC
    // // Targeting 1.003 ARTH / 1 USDC
    // await swapToPriceInstance.swapToPrice(
    // 	arthInstance.address,
    // 	col_instance_USDC.address,
    // 	new BigNumber(1003e3),
    // 	new BigNumber(997e3),
    // 	new BigNumber(100e18),
    // 	new BigNumber(100e18),
    // 	COLLATERAL_ARTH_AND_ARTHS_OWNER,
    // 	new BigNumber(2105300114),
    // 	{ from: COLLATERAL_ARTH_AND_ARTHS_OWNER }
    // )

    // // Handle ARTH / USDT
    // // Targeting 0.995 ARTH / 1 USDT
    // await swapToPriceInstance.swapToPrice(
    // 	arthInstance.address,
    // 	col_instance_USDT.address,
    // 	new BigNumber(995e3),
    // 	new BigNumber(1005e3),
    // 	new BigNumber(100e18),
    // 	new BigNumber(100e18),
    // 	COLLATERAL_ARTH_AND_ARTHS_OWNER,
    // 	new BigNumber(2105300114),
    // 	{ from: COLLATERAL_ARTH_AND_ARTHS_OWNER }
    // )

    // // Handle ARTH / yUSD
    // // Targeting 0.998 ARTH / 1 yUSD
    // // await swapToPriceInstance.swapToPrice(
    // // 	arthInstance.address,
    // // 	col_instance_yUSD.address,
    // // 	new BigNumber(998e3),
    // // 	new BigNumber(1002e3),
    // // 	new BigNumber(100e18),
    // // 	new BigNumber(100e18),
    // // 	COLLATERAL_ARTH_AND_ARTHS_OWNER,
    // // 	new BigNumber(2105300114),
    // // 	{ from: COLLATERAL_ARTH_AND_ARTHS_OWNER }
    // // )

    // //--- ARTHS

    // // Handle ARTHX / WETH
    // // Targeting 1955 ARTHX / 1 WETH
    // await swapToPriceInstance.swapToPrice(
    // 	arthxInstance.address,
    // 	wethInstance.address,
    // 	new BigNumber(1955e6),
    // 	new BigNumber(1e6),
    // 	new BigNumber(100e18),
    // 	new BigNumber(100e18),
    // 	COLLATERAL_ARTH_AND_ARTHS_OWNER,
    // 	new BigNumber(2105300114),
    // 	{ from: COLLATERAL_ARTH_AND_ARTHS_OWNER }
    // )

    // // Handle ARTHX / USDC
    // // Targeting 5.2 ARTHX / 1 USDC
    // await swapToPriceInstance.swapToPrice(
    // 	arthxInstance.address,
    // 	col_instance_USDC.address,
    // 	new BigNumber(52e5),
    // 	new BigNumber(1e6),
    // 	new BigNumber(100e18),
    // 	new BigNumber(100e18),
    // 	COLLATERAL_ARTH_AND_ARTHS_OWNER,
    // 	new BigNumber(2105300114),
    // 	{ from: COLLATERAL_ARTH_AND_ARTHS_OWNER }
    // )


    // // Handle ARTHX / USDT
    // // Targeting 5.1 ARTHX / 1 USDT
    // await swapToPriceInstance.swapToPrice(
    // 	arthxInstance.address,
    // 	col_instance_USDT.address,
    // 	new BigNumber(51e5),
    // 	new BigNumber(1e6),
    // 	new BigNumber(100e18),
    // 	new BigNumber(100e18),
    // 	COLLATERAL_ARTH_AND_ARTHS_OWNER,
    // 	new BigNumber(2105300114),
    // 	{ from: COLLATERAL_ARTH_AND_ARTHS_OWNER }
    // )

    // // Handle ARTHX / yUSD
    // // Targeting 4.9 ARTHX / 1 yUSD
    // // await swapToPriceInstance.swapToPrice(
    // // 	arthxInstance.address,
    // // 	col_instance_yUSD.address,
    // // 	new BigNumber(49e5),
    // // 	new BigNumber(1e6),
    // // 	new BigNumber(100e18),
    // // 	new BigNumber(100e18),
    // // 	COLLATERAL_ARTH_AND_ARTHS_OWNER,
    // // 	new BigNumber(2105300114),
    // // 	{ from: COLLATERAL_ARTH_AND_ARTHS_OWNER }
    // // )

    // // Advance 24 hrs so the period can be computed
    // await time.increase(86400 + 1);
    // await time.advanceBlock();

    // // Make sure the prices are updated
    // await oracle_instance_ARTH_WETH.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    // await oracle_instance_ARTH_USDC.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    // await oracle_instance_ARTH_USDT.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    // // await oracle_instance_ARTH_yUSD.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    // await oracle_instance_ARTHS_WETH.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    // await oracle_instance_ARTHS_USDC.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    // await oracle_instance_ARTHS_USDT.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    // // await oracle_instance_ARTHS_yUSD.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    // await oracle_instance_USDT_WETH.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    // await oracle_instance_USDC_WETH.update({ from: COLLATERAL_ARTH_AND_ARTHS_OWNER });

    // // Advance 24 hrs so the period can be computed
    // await time.increase(86400 + 1);
    // await time.advanceBlock();

    // Get the prices
    arth_price_from_ARTH_WETH = (new BigNumber(await oracle_instance_ARTH_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
    arth_price_from_ARTH_USDC = (new BigNumber(await oracle_instance_ARTH_USDC.consult.call(FakeCollateral_USDC.address, 1e6))).div(BIG6).toNumber();
    arth_price_from_ARTH_USDT = (new BigNumber(await oracle_instance_ARTH_USDT.consult.call(FakeCollateral_USDT.address, 1e6))).div(BIG6).toNumber();
    // arth_price_from_ARTH_yUSD = (new BigNumber(await oracle_instance_ARTH_yUSD.consult.call(FakeCollateral_yUSD.address, 1e6))).div(BIG6).toNumber();
    arthx_price_from_ARTHS_WETH = (new BigNumber(await oracle_instance_ARTHS_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
    arthx_price_from_ARTHS_USDC = (new BigNumber(await oracle_instance_ARTHS_USDC.consult.call(FakeCollateral_USDC.address, 1e6))).div(BIG6).toNumber();
    arthx_price_from_ARTHS_USDT = (new BigNumber(await oracle_instance_ARTHS_USDT.consult.call(FakeCollateral_USDT.address, 1e6))).div(BIG6).toNumber();
    // arthx_price_from_ARTHS_yUSD = (new BigNumber(await oracle_instance_ARTHS_yUSD.consult.call(FakeCollateral_yUSD.address, 1e6))).div(BIG6).toNumber();
    USDT_price_from_USDT_WETH = (new BigNumber(await oracle_instance_USDT_WETH.consult.call(WETH.address, 1e6))).div(1e6).toNumber();
    USDC_price_from_USDC_WETH = (new BigNumber(await oracle_instance_USDC_WETH.consult.call(WETH.address, 1e6))).div(1e6).toNumber();

    console.log(chalk.blue("==================PRICES=================="));
    // Print the new prices
    console.log("ETH-USD price from Chainlink:", (new BigNumber((await arthInstance.arth_info.call())['7'])).div(1e6).toString(), "USD = 1 ETH");
    console.log("arth_price_from_ARTH_WETH: ", arth_price_from_ARTH_WETH.toString(), " ARTH = 1 WETH");
    console.log("ARTH-USD price from Chainlink, Uniswap:", (new BigNumber(await arthInstance.arth_price.call())).div(1e6).toString(), "ARTH = 1 USD");
    //console.log("arth_price_from_ARTH_USDC: ", arth_price_from_ARTH_USDC.toString(), " ARTH = 1 USDC");
    //console.log("arth_price_from_ARTH_USDT: ", arth_price_from_ARTH_USDT.toString(), " ARTH = 1 USDT");
    //console.log("arth_price_from_ARTH_yUSD: ", arth_price_from_ARTH_yUSD.toString(), " ARTH = 1 yUSD");
    console.log("arthx_price_from_ARTHS_WETH: ", arthx_price_from_ARTHS_WETH.toString(), " ARTHX = 1 WETH");
    //console.log("arthx_price_from_ARTHS_USDC: ", arthx_price_from_ARTHS_USDC.toString(), " ARTHX = 1 USDC");
    //console.log("arthx_price_from_ARTHS_USDT: ", arthx_price_from_ARTHS_USDT.toString(), " ARTHX = 1 USDT");
    //console.log("arthx_price_from_ARTHS_yUSD: ", arthx_price_from_ARTHS_yUSD.toString(), " ARTHX = 1 yUSD");
    console.log("USDT_price_from_USDT_WETH: ", USDT_price_from_USDT_WETH.toString(), " USDT = 1 WETH");
    console.log("USDC_price_from_USDC_WETH: ", USDC_price_from_USDC_WETH.toString(), " USDC = 1 WETH");
    console.log("USDT_price_from_pool: ", (new BigNumber(await pool_instance_USDT.getCollateralPrice.call())).div(1e6).toString(), " USDT = 1 USD");
    console.log("USDC_price_from_pool: ", (new BigNumber(await pool_instance_USDC.getCollateralPrice.call())).div(1e6).toString(), " USDC = 1 USD");


  });

  // TOKEN VESTING TEST

  it('Deposits ARTHX into the vesting contract, attempts to withdraw before the cliff, between cliff and end, and after end', async () => {
    await vestingInstance.setARTHSAddress(arthxInstance.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await vestingInstance.setTimelockAddress(timelockInstance.address, { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    await arthxInstance.transfer(vestingInstance.address, new BigNumber("5400000e18"), { from: COLLATERAL_ARTH_AND_ARTHS_OWNER });
    console.log("current timestamp:", (await time.latest()).toNumber());
    console.log("TokenVesting contract info:");
    console.log("beneficiary:", await vestingInstance.beneficiary());
    console.log("cliff:", (await vestingInstance.cliff()).toNumber());
    console.log("start:", (await vestingInstance.start()).toNumber());
    console.log("duration:", (await vestingInstance.duration()).toNumber());
    console.log("revocable:", await vestingInstance.revocable());
    console.log("released:", (await vestingInstance.released()).toNumber());
    console.log("accounts[9] ARTHX balance:", (new BigNumber(await arthxInstance.balanceOf(accounts[9]))).div(BIG18).toNumber());

    console.log("======================================");
    console.log("wait 121.25 days (1/3 of a year, ~four months)");
    await time.increase(86400 * 121.25);
    await time.advanceBlock();
    console.log("======================================");

    //console.log("current timestamp:", (await time.latest()).toNumber());
    //console.log("released:", (await vestingInstance.released()).toNumber());
    //console.log("attempt to withdraw from vesting instance", await vestingInstance.release({ from: accounts[9] }));
    //console.log("accounts[9] ARTHX balance:", (new BigNumber(await arthxInstance.balanceOf(accounts[9]))).div(BIG18).toNumber());

    console.log("======================================");
    console.log("wait another 121.25 days");
    await time.increase(86400 * 121.25);
    await time.advanceBlock();
    console.log("======================================");

    console.log("current timestamp:", (await time.latest()).toNumber());
    console.log("released:", (new BigNumber(await vestingInstance.released())).div(BIG18).toNumber())
    console.log("attempt to withdraw from vesting instance");
    await vestingInstance.release({ from: accounts[9] });
    console.log("accounts[9] ARTHX balance:", (new BigNumber(await arthxInstance.balanceOf(accounts[9]))).div(BIG18).toNumber());

    console.log("======================================");
    console.log("wait the last 121.25 days");
    await time.increase(86400 * 121.25);
    await time.advanceBlock();
    console.log("======================================");

    console.log("current timestamp:", (await time.latest()).toNumber());
    console.log("released:", (new BigNumber(await vestingInstance.released())).div(BIG18).toNumber())
    console.log("attempt to withdraw from vesting instance");
    await vestingInstance.release({ from: accounts[9] });
    console.log("accounts[9] ARTHX balance:", (new BigNumber(await arthxInstance.balanceOf(accounts[9]))).div(BIG18).toNumber());
  });

});
