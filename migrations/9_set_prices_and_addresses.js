require('dotenv').config();
const chalk = require('chalk');
const BigNumber = require('bignumber.js');
const helpers = require('./helpers');

const ARTHShares = artifacts.require("ARTHX/ARTHShares");
const ARTHController = artifacts.require("ArthController");
const Pool_USDC = artifacts.require("Arth/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Arth/Pools/Pool_USDT");
const Pool_WBTC = artifacts.require("Arth/Pools/Pool_WBTC");
const Pool_WMATIC = artifacts.require("Arth/Pools/Pool_WMATIC");
const Pool_WETH = artifacts.require("Arth/Pools/Pool_WETH");
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");

const UniswapPairOracle_MAHA_ARTH = artifacts.require("Oracle/Variants/UniswapPairOracle_MAHA_ARTH");
const UniswapPairOracle_ARTH_ARTHX = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_ARTHX");

const GenesisUSDC = artifacts.require("GenesisUSDC");
const GenesisUSDT = artifacts.require("GenesisUSDT");
const GenesisWBTC = artifacts.require("GenesisWBTC");
const GenesisWMATIC = artifacts.require("GenesisWMATIC");
const GenesisWETH = artifacts.require("GenesisWETH");

module.exports = async function (deployer, network, accounts) {
  const BIG6 = new BigNumber("1e6");
  const BIG18 = new BigNumber("1e18");

  const DEPLOYER_ADDRESS = accounts[0];

  const arthx = await ARTHShares.deployed();
  const arth = await ARTHStablecoin.deployed();
  const arthControllerInstance = await ARTHController.deployed();
  const wethInstance = await helpers.getWETH(network, deployer, artifacts, DEPLOYER_ADDRESS);

  const genesis_usdt = await GenesisUSDT.deployed();
  const genesis_usdc = await GenesisUSDC.deployed();
  const genesis_wbtc = await GenesisWBTC.deployed();
  const genesis_weth = await GenesisWETH.deployed();
  const genesis_wmatic = await GenesisWMATIC.deployed();

  const pool_instance_USDC = await Pool_USDC.deployed();
  const pool_instance_USDT = await Pool_USDT.deployed();
  const pool_instance_WBTC = await Pool_WBTC.deployed();
  const pool_instance_WETH = await Pool_WETH.deployed();
  const pool_instance_WMATIC = await Pool_WMATIC.deployed();

  const uniswapPairOracleARTHXARTH = await UniswapPairOracle_ARTH_ARTHX.deployed();
  const uniswapPairOracleMAHAARTH = await UniswapPairOracle_MAHA_ARTH.deployed();

  console.log(chalk.yellow('\nLinking collateral pools to arth contract...'));

  // await arthControllerInstance.addPool(pool_instance_USDC.address, { from: DEPLOYER_ADDRESS });
  // await arthControllerInstance.addPool(pool_instance_USDT.address, { from: DEPLOYER_ADDRESS });
  // await arthControllerInstance.addPool(pool_instance_WBTC.address, { from: DEPLOYER_ADDRESS });
  // await arthControllerInstance.addPool(pool_instance_WMATIC.address, { from: DEPLOYER_ADDRESS });
  // await arthControllerInstance.addPool(pool_instance_WETH.address, { from: DEPLOYER_ADDRESS });
  // await arthControllerInstance.addPool(genesis_usdc.address, { from: DEPLOYER_ADDRESS });
  // await arthControllerInstance.addPool(genesis_usdt.address, { from: DEPLOYER_ADDRESS });
  // await arthControllerInstance.addPool(genesis_wbtc.address, { from: DEPLOYER_ADDRESS });
  // await arthControllerInstance.addPool(genesis_weth.address, { from: DEPLOYER_ADDRESS });
  // await arthControllerInstance.addPool(genesis_wmatic.address, { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('\nSetting ARTH address within ARTHX...'));
  await arthx.setARTHAddress(arth.address, { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('\nSome oracle prices are: '));
  // const arth_price_initial = new BigNumber(await arthControllerInstance.getARTHPrice({ from: DEPLOYER_ADDRESS })).div(BIG6);
  // const arthx_price_initial = new BigNumber(await arthControllerInstance.getARTHXPrice({ from: DEPLOYER_ADDRESS })).div(BIG6);
  // const arthx_price_from_ARTHX_WETH = (new BigNumber(await uniswapPairOracleARTHXARTH.consult.call(arth.address, 1e6))).div(BIG6);
  // const maha_price_initial = new BigNumber(await arthControllerInstance.getMAHAPrice({ from: DEPLOYER_ADDRESS })).div(BIG6);
  // const maha_price_from_MAHA_ARTH = (new BigNumber(await uniswapPairOracleMAHAARTH.consult.call(arth.address, 1e6))).div(BIG6);

  // console.log(" NOTE: - maha_price_initial: ", maha_price_initial.toString(), "GMU = 1 MAHA");
  // console.log(" NOTE: - arthx_price_initial: ", arthx_price_initial.toString(), "GMU = 1 ARTHX");
  // console.log(" NOTE: - arthx_price_from_ARTHX_ARTH: ", arthx_price_from_ARTHX_WETH.toString(), "ARTHX = 1 WETH");
  // console.log(" NOTE: - maha_price_from_MAHA_ARTH: ", maha_price_from_MAHA_ARTH.toString(), "MAHA = 1 ARTH");

  const percentCollateralized = new BigNumber(await arthControllerInstance.getPercentCollateralized());
  const globalCollateralValue = new BigNumber(await arthControllerInstance.getGlobalCollateralValue());
  const targetCollateralValue = new BigNumber(await arthControllerInstance.getTargetCollateralValue());

  console.log(" NOTE: - global_collateral_value: ", globalCollateralValue.toString());
  console.log(" NOTE: - target_collateral_value: ", targetCollateralValue.toString());
  console.log(" NOTE: - percent_collateralized: ", percentCollateralized.toString());
  console.log(" NOTE: - percent_collateralized_in_readable: ", percentCollateralized.div(BIG18).toString());

  console.log(chalk.yellow('\nTransferring some tokens and eth to metamask...'));
  await Promise.all([
    arthx.transfer(DEPLOYER_ADDRESS, new BigNumber("1000e18"), { from: DEPLOYER_ADDRESS }),
    arth.transfer(DEPLOYER_ADDRESS, new BigNumber("1000e18"), { from: DEPLOYER_ADDRESS })
  ]);
};
