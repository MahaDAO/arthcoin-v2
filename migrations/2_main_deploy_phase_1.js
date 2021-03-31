const chalk = require('chalk')
const BigNumber = require('bignumber.js')
const { time } = require('@openzeppelin/test-helpers')

require('dotenv').config()

const Math = artifacts.require("Math/Math")
const ERC20 = artifacts.require("ERC20/ERC20")
const Owned = artifacts.require("Staking/Owned")
const Address = artifacts.require("Utils/Address")
const SafeMath = artifacts.require("Math/SafeMath")
const UQ112x112 = artifacts.require("Math/UQ112x112")
const SafeERC20 = artifacts.require("ERC20/SafeERC20")
const Babylonian = artifacts.require("Math/Babylonian")
const FixedPoint = artifacts.require("Math/FixedPoint")
const BlockMiner = artifacts.require("Utils/BlockMiner")
const ERC20Custom = artifacts.require("ERC20/ERC20Custom")
const StringHelpers = artifacts.require("Utils/StringHelpers")
const MigrationHelper = artifacts.require("Utils/MigrationHelper")

// Uniswap related.
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice")
const UniswapV2Pair = artifacts.require("Uniswap/UniswapV2Pair")
const UniswapV2ERC20 = artifacts.require("Uniswap/UniswapV2ERC20")
const TransferHelper = artifacts.require("Uniswap/TransferHelper")
const UniswapV2Factory = artifacts.require("Uniswap/UniswapV2Factory")
const UniswapV2Library = artifacts.require("Uniswap/UniswapV2Library")
const UniswapV2Router02 = artifacts.require("Uniswap/UniswapV2Router02")
const UniswapV2OracleLibrary = artifacts.require("Uniswap/UniswapV2OracleLibrary")
const UniswapV2Router02_Modified = artifacts.require("Uniswap/UniswapV2Router02_Modified")

// Collateral related.
const WETH = artifacts.require("ERC20/WETH")
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC")
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT")

// Collateral Pools related.
const Pool_USDC = artifacts.require("Arth/Pools/Pool_USDC")
const Pool_USDT = artifacts.require("Arth/Pools/Pool_USDT")
const ArthPoolLibrary = artifacts.require("Arth/Pools/ArthPoolLibrary")

// Oracles related.
const GMUOracle = artifacts.require("Oracle/GMUOracle")
const ARTHMAHAOracle = artifacts.require("Oracle/ARTHMAHAOracle")
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH")
const UniswapPairOracle_USDT_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDT_WETH")
const UniswapPairOracle_ARTH_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_WETH")
const UniswapPairOracle_ARTH_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_USDC")
const UniswapPairOracle_ARTH_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_USDT")
const UniswapPairOracle_ARTH_ARTHS = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_ARTHS")
const UniswapPairOracle_ARTHS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHS_WETH")
const UniswapPairOracle_ARTHS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHS_USDC")
const UniswapPairOracle_ARTHS_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHS_USDT")

// Chainlink Price Consumer related.
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer")
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest")

// ARTH core realted.
const ARTHShares = artifacts.require("ARTHS/ARTHShares")
// const TokenVesting = artifacts.require("ARTHS/TokenVesting")
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin")

// Governance related,
const Timelock = artifacts.require("Governance/Timelock")
// const GovernorAlpha = artifacts.require("Governance/GovernorAlpha")

// Staking realted.
const StakingRewards_ARTH_WETH = artifacts.require("Staking/Variants/Stake_ARTH_WETH.sol")
const StakingRewards_ARTH_USDC = artifacts.require("Staking/Variants/Stake_ARTH_USDC.sol")
const StakingRewards_ARTH_ARTHS = artifacts.require("Staking/Variants/Stake_ARTH_ARTHS.sol")
const StakingRewards_ARTHS_WETH = artifacts.require("Staking/Variants/Stake_ARTHS_WETH.sol")

// Mock realted.
const MockMaha = artifacts.require("ERC20/MockMaha.sol")


module.exports = async function (deployer, network, accounts) {

  const USE_MAINNET_EXISTING = true
  const IS_MAINNET = (process.env.MIGRATION_MODE == 'mainnet')
  const IS_TESTNET = (process.env.MIGRATION_MODE != 'ganache') && (process.env.MIGRATION_MODE != 'development') && !IS_MAINNET

  const METAMASK_ADDRESS = process.env.METAMASK_ADDRESS

  const BIG18 = new BigNumber("1e18")
  const ONE_MILLION_DEC18 = new BigNumber("1000000e18")
  const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18)
  const FIVE_MILLION_DEC18 = new BigNumber("5000000e18")
  const TEN_MILLION_DEC18 = new BigNumber("10000000e18")
  const ONE_BILLION_DEC18 = new BigNumber("1000000000e18")
  const ONE_HUNDRED_MILLION_DEC6 = new BigNumber("100000000e6")
  const ONE_HUNDRED_MILLION_DEC18 = new BigNumber("100000000e18")
  const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666"

  const REDEMPTION_FEE = 400 // 0.04%
  const MINTING_FEE = 300 // 0.03%
  const COLLATERAL_PRICE = 1040000 // $1.04
  const TIMELOCK_DELAY = 2 * 86400 // 2 days

  // Starting seed amounts
  const ARTH_SEED_AMOUNT_DEC18 = new BigNumber("10000e18")
  const ARTHS_SEED_AMOUNT_DEC18 = new BigNumber("10000e18")

  await deployer.deploy(Address)
  await deployer.deploy(BlockMiner)
  await deployer.deploy(Babylonian)
  await deployer.deploy(UQ112x112)
  await deployer.deploy(StringHelpers)
  await deployer.link(UQ112x112, [UniswapV2Pair])
  await deployer.link(Babylonian, [FixedPoint, SwapToPrice])
  await deployer.deploy(FixedPoint)
  await deployer.link(
    FixedPoint,
    [
      UniswapV2OracleLibrary,
      UniswapPairOracle_ARTH_WETH,
      UniswapPairOracle_ARTH_USDC,
      UniswapPairOracle_ARTH_USDT,
      UniswapPairOracle_ARTH_ARTHS,
      UniswapPairOracle_ARTHS_WETH,
      UniswapPairOracle_ARTHS_USDC,
      UniswapPairOracle_ARTHS_USDT,
      UniswapPairOracle_USDC_WETH,
      UniswapPairOracle_USDT_WETH
    ]
  )
  await deployer.link(Address, [ERC20, ERC20Custom, SafeERC20, WETH, FakeCollateral_USDC, FakeCollateral_USDT])
  await deployer.deploy(Math)
  await deployer.link(
    Math,
    [
      StakingRewards_ARTH_WETH,
      StakingRewards_ARTH_WETH,
      StakingRewards_ARTH_USDC,
      StakingRewards_ARTH_ARTHS,
      StakingRewards_ARTHS_WETH,
      UniswapV2ERC20,
      UniswapV2Pair
    ]
  )
  await deployer.deploy(SafeMath)
  await deployer.link(
    SafeMath,
    [
      ERC20,
      ERC20Custom,
      SafeERC20,
      WETH,
      FakeCollateral_USDC,
      FakeCollateral_USDT,
      ARTHStablecoin,
      Pool_USDC,
      Pool_USDT,
      ARTHShares,
      StakingRewards_ARTH_WETH,
      StakingRewards_ARTH_USDC,
      StakingRewards_ARTH_ARTHS,
      StakingRewards_ARTHS_WETH,
      UniswapV2ERC20,
      UniswapV2Library,
      UniswapV2Router02,
      UniswapV2Router02_Modified,
      SwapToPrice,
      Timelock
    ]
  )
  await deployer.deploy(TransferHelper)
  await deployer.link(
    TransferHelper,
    [
      UniswapV2Router02,
      UniswapV2Router02_Modified,
      SwapToPrice,
      StakingRewards_ARTH_WETH,
      StakingRewards_ARTH_USDC,
      StakingRewards_ARTH_ARTHS,
      StakingRewards_ARTHS_WETH,
      Pool_USDC,
      Pool_USDT
    ]
  )
  await deployer.deploy(UniswapV2ERC20)
  await deployer.link(UniswapV2ERC20, [UniswapV2Pair])
  await deployer.deploy(UniswapV2OracleLibrary)
  await deployer.link(
    UniswapV2OracleLibrary,
    [
      UniswapPairOracle_ARTH_WETH,
      UniswapPairOracle_ARTH_USDC,
      UniswapPairOracle_ARTH_USDT,
      UniswapPairOracle_ARTH_ARTHS,
      UniswapPairOracle_ARTHS_WETH,
      UniswapPairOracle_ARTHS_WETH,
      UniswapPairOracle_ARTHS_USDC,
      UniswapPairOracle_ARTHS_USDT,
      UniswapPairOracle_USDC_WETH,
      UniswapPairOracle_USDT_WETH
    ]
  )
  await deployer.deploy(UniswapV2Library)
  await deployer.link(
    UniswapV2Library,
    [
      UniswapPairOracle_ARTH_WETH,
      UniswapPairOracle_ARTH_USDC,
      UniswapPairOracle_ARTHS_WETH,
      UniswapPairOracle_ARTHS_USDC,
      UniswapPairOracle_USDC_WETH,
      UniswapV2Router02,
      UniswapV2Router02_Modified,
      SwapToPrice
    ]
  )
  await deployer.deploy(UniswapV2Pair)
  await deployer.link(UniswapV2Pair, [UniswapV2Factory])
  await deployer.deploy(UniswapV2Factory, DUMP_ADDRESS)
  await deployer.deploy(SafeERC20)
  await deployer.link(
    SafeERC20,
    [
      WETH,
      FakeCollateral_USDC,
      FakeCollateral_USDT,
      ARTHStablecoin,
      Pool_USDC,
      Pool_USDT,
      ARTHShares,
      StakingRewards_ARTH_WETH,
      StakingRewards_ARTH_USDC,
      StakingRewards_ARTH_ARTHS,
      StakingRewards_ARTHS_WETH
    ]
  )
  await deployer.deploy(ArthPoolLibrary)
  await deployer.link(ArthPoolLibrary, [Pool_USDC, Pool_USDT])
  await deployer.deploy(Owned, METAMASK_ADDRESS)
  await deployer.deploy(Timelock, METAMASK_ADDRESS, TIMELOCK_DELAY)
  await deployer.deploy(MigrationHelper, METAMASK_ADDRESS)
  await deployer.deploy(GMUOracle, 'GMU/USD', BIG18)
  await deployer.deploy(ARTHMAHAOracle, 'ARTH/MAHA', BIG18)
  await deployer.deploy(MockMaha, 'MAHA', 'MAHA')

  const gmuOracle = await GMUOracle.deployed()
  await deployer.deploy(ChainlinkETHUSDPriceConsumer, gmuOracle.address)
  await deployer.deploy(ChainlinkETHUSDPriceConsumerTest)

  const timelockInstance = await Timelock.deployed()
  const migrationHelperInstance = await MigrationHelper.deployed()

  await deployer.deploy(ARTHStablecoin, "Arth", "ARTH", METAMASK_ADDRESS, timelockInstance.address)
  const arthInstance = await ARTHStablecoin.deployed()
  await deployer.deploy(ARTHShares, "Arth Share", "ARTHS", METAMASK_ADDRESS, METAMASK_ADDRESS, timelockInstance.address)
  const arthsInstance = await ARTHShares.deployed()

  console.log(chalk.yellow("Making sure name()'s work..."))
  let arth_name = await arthInstance.name.call()
  let arths_name = await arthsInstance.name.call()
  console.log(`NOTE: ARTH name: ${arth_name}`)
  console.log(`NOTE: ARTHS name: ${arths_name}`)

  // console.log(chalk.yellow('===== DEPLOY THE GOVERNANCE CONTRACT ====='))
  //await deployer.deploy(GovernorAlpha, timelockInstance.address, arthsInstance.address, GOVERNOR_GUARDIAN_ADDRESS)
  //const governanceInstance = await GovernorAlpha.deployed()
  //await governanceInstance.__setTimelockAddress(timelockInstance.address, { from: GOVERNOR_GUARDIAN_ADDRESS })

  // ======== Set the Governance contract as the timelock admin [Phase 1] ========
  // console.log(chalk.yellow('===== SET THE GOVERNANCE CONTRACT AS THE TIMELOCK ADMIN [Phase 1] ====='))
  // console.log("GOVERNANCE_ADDRESS [BEFORE]: ", governanceInstance.address)
  let timelock_admin_address = await timelockInstance.admin.call()
  console.log("NOTE: timelock_admin [BEFORE]: ", timelock_admin_address)

  // // Give control from TIMELOCK_ADMIN to GovernorAlpha
  let current_timestamp = (await time.latest()).toNumber()
  let timelock_delay = (await timelockInstance.delay.call()).toNumber()
  let eta_with_delay = current_timestamp + timelock_delay + 300 // 5 minute buffer
  console.log("NOTE: timelock_delay [BEFORE]: ", timelock_delay)
  console.log("NOTE: current_timestamp [BEFORE]: ", current_timestamp)
  console.log("NOTE: current_timestamp + timelock_delay [BEFORE]: ", eta_with_delay)
  await migrationHelperInstance.setGovToTimeLockETA(eta_with_delay, { from: METAMASK_ADDRESS })

  // const tx_nugget = [
  //   timelockInstance.address,
  //   0,
  //   "setPendingAdmin(address)",
  //   web3.eth.abi.encodeParameters(['address'], [governanceInstance.address]),
  //   eta_with_delay,
  //   { from: TIMELOCK_ADMIN }
  // ]
  // await timelockInstance.queueTransaction(...tx_nugget)
  // console.log(chalk.red.bold('NEED TO DO THIS PART LATER [Execute timelock]'))

  console.log(chalk.yellow('Setting appropriate token addresses...'))
  // Link the ARTHS contract to the ARTH contract
  await arthInstance.setARTHSAddress(arthsInstance.address, { from: METAMASK_ADDRESS })

  let wethInstance
  let col_instance_USDC
  let col_instance_USDT

  if (IS_MAINNET) {
    console.log(chalk.yellow('Using real collateral addresses...'))
    wethInstance = await WETH.at("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
    col_instance_USDC = await FakeCollateral_USDC.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")
    col_instance_USDT = await FakeCollateral_USDT.at("0xdac17f958d2ee523a2206206994597c13d831ec7")
  }
  else {
    console.log(chalk.yellow('Using fake collateral addresses...'))
    await deployer.deploy(WETH, METAMASK_ADDRESS)
    await deployer.deploy(FakeCollateral_USDC, METAMASK_ADDRESS, ONE_HUNDRED_MILLION_DEC6, "USDC", 6)
    await deployer.deploy(FakeCollateral_USDT, METAMASK_ADDRESS, ONE_HUNDRED_MILLION_DEC6, "USDT", 6)
    wethInstance = await WETH.deployed()
    col_instance_USDC = await FakeCollateral_USDC.deployed()
    col_instance_USDT = await FakeCollateral_USDT.deployed()
  }

  let CONTRACT_ADDRESSES_PHASE_1 = {
    [process.env.MIGRATION_MODE]: {
      main: {
        ARTH: arthInstance.address,
        ARTHS: arthsInstance.address,
        vesting: "NOT_DEPLOYED_YET"
      },
      weth: wethInstance.address,
      oracles: {
        ARTH_WETH: "NOT_DEPLOYED_YET",
        ARTH_USDC: "NOT_DEPLOYED_YET",
        ARTH_USDT: "NOT_DEPLOYED_YET",
        ARTH_ARTHS: "NOT_DEPLOYED_YET",
        ARTHS_WETH: "NOT_DEPLOYED_YET",
        ARTHS_USDC: "NOT_DEPLOYED_YET",
        ARTHS_USDT: "NOT_DEPLOYED_YET",
        USDC_WETH: "NOT_DEPLOYED_YET",
        USDT_WETH: "NOT_DEPLOYED_YET",
      },
      collateral: {
        USDC: col_instance_USDC.address,
        USDT: col_instance_USDT.address,
      },
      // governance: governanceInstance.address,
      pools: {
        USDC: "NOT_DEPLOYED_YET",
        USDT: "NOT_DEPLOYED_YET",
      },
      uniswap_other: {
        router: "NOT_DEPLOYED_YET",
        factory: "NOT_DEPLOYED_YET",
      },
      pricing: {
        swap_to_price: "NOT_DEPLOYED_YET"
      },
      misc: {
        timelock: timelockInstance.address,
        migration_helper: migrationHelperInstance.address
      },
      libraries: {
        UniswapV2OracleLibrary: UniswapV2OracleLibrary.address,
        UniswapV2Library: UniswapV2Library.address,
        ArthPoolLibrary: ArthPoolLibrary.address,
      },
      pair_tokens: {
        'Uniswap ARTH/WETH': "NOT_DEPLOYED_YET",
        'Uniswap ARTH/USDC': "NOT_DEPLOYED_YET",
        'Uniswap ARTH/ARTHS': "NOT_DEPLOYED_YET",
        'Uniswap ARTHS/WETH': "NOT_DEPLOYED_YET",
      },
      staking_contracts: {
        'Uniswap ARTH/WETH': "NOT_DEPLOYED_YET",
        'Uniswap ARTH/USDC': "NOT_DEPLOYED_YET",
        'Uniswap ARTH/ARTHS': "NOT_DEPLOYED_YET",
        'Uniswap ARTHS/WETH': "NOT_DEPLOYED_YET",
      }
    }
  }

  console.log("Deployed Contract Addresses: \n", CONTRACT_ADDRESSES_PHASE_1)
}
