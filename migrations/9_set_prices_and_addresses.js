require('dotenv').config();
const chalk = require('chalk');
const BigNumber = require('bignumber.js');
const helpers = require('./helpers');

const ARTHShares = artifacts.require("ARTHX/ARTHShares");
const ARTHController = artifacts.require("ArthController");
const Pool_USDC = artifacts.require("Arth/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Arth/Pools/Pool_USDT");
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");
const UniswapPairOracleMAHAARTH = artifacts.require("UniswapPairOracle_MAHA_ARTH");
const UniswapPairOracleARTHWETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_WETH");
const UniswapPairOracleARTHXWETH = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTHX_WETH");


module.exports = async function (deployer, network, accounts) {
  const BIG6 = new BigNumber("1e6");
  const DEPLOYER_ADDRESS = accounts[0];

  let arth = await ARTHStablecoin.deployed();
  let arthx = await ARTHShares.deployed();

  const pool_instance_USDC = await Pool_USDC.deployed();
  const pool_instance_USDT = await Pool_USDT.deployed();
  const arthControllerInstance = await ARTHController.deployed();
  const uniswapPairOracleARTHWETH = await UniswapPairOracleARTHWETH.deployed();
  const uniswapPairOracleARTHXWETH = await UniswapPairOracleARTHXWETH.deployed();
  const uniswapPairOracleMAHAARTH = await UniswapPairOracleMAHAARTH.deployed();

  const wethInstance = await helpers.getWETH(network, deployer, artifacts, DEPLOYER_ADDRESS);

  console.log(chalk.yellow('\nLinking collateral pools to arth contract...'));
  await arth.addPool(pool_instance_USDC.address, { from: DEPLOYER_ADDRESS });
  await arth.addPool(pool_instance_USDT.address, { from: DEPLOYER_ADDRESS });
  await arthControllerInstance.addPool(pool_instance_USDC.address, { from: DEPLOYER_ADDRESS });
  await arthControllerInstance.addPool(pool_instance_USDT.address, { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('\nSetting ARTH address within ARTHX...'));
  await arthx.setARTHAddress(arth.address, { from: DEPLOYER_ADDRESS });

  console.log(chalk.yellow('\nSome oracle prices are: '));
  const arth_price_initial = new BigNumber(await arthControllerInstance.getARTHPrice({ from: DEPLOYER_ADDRESS })).div(BIG6);
  const arthx_price_initial = new BigNumber(await arthControllerInstance.getARTHXPrice({ from: DEPLOYER_ADDRESS })).div(BIG6);
  const arth_price_from_ARTH_WETH = (new BigNumber(await uniswapPairOracleARTHWETH.consult.call(wethInstance.address, 1e6))).div(BIG6);
  const arthx_price_from_ARTHX_WETH = (new BigNumber(await uniswapPairOracleARTHXWETH.consult.call(wethInstance.address, 1e6))).div(BIG6);
  const maha_price_initial = new BigNumber(await arthControllerInstance.getMAHAPrice({ from: DEPLOYER_ADDRESS })).div(BIG6);
  const maha_price_from_MAHA_ARTH = (new BigNumber(await uniswapPairOracleMAHAARTH.consult.call(arth.address, 1e6))).div(BIG6);

  console.log(" NOTE: - arth_price_initial: ", arth_price_initial.toString(), "GMU = 1 ARTH");
  console.log(" NOTE: - maha_price_initial: ", maha_price_initial.toString(), "GMU = 1 MAHA");
  console.log(" NOTE: - arthx_price_initial: ", arthx_price_initial.toString(), "GMU = 1 ARTHX");
  console.log(" NOTE: - arth_price_from_ARTH_WETH: ", arth_price_from_ARTH_WETH.toString(), "ARTH = 1 WETH");
  console.log(" NOTE: - arthx_price_from_ARTHX_WETH: ", arthx_price_from_ARTHX_WETH.toString(), "ARTHX = 1 WETH");
  console.log(" NOTE: - maha_price_from_MAHA_ARTH: ", maha_price_from_MAHA_ARTH.toString(), "MAHA = 1 ARTH");

  const percentCollateralized = new BigNumber(await arthControllerInstance.getPercentCollateralized());
  const globalCollateralValue = new BigNumber(await arthControllerInstance.getGlobalCollateralValue());
  const targetCollateralValue = new BigNumber(await arthControllerInstance.getTargetCollateralValue());
  console.log(" NOTE: - percent_collateralized: ", percentCollateralized.toString());
  console.log(" NOTE: - global_collateral_value: ", globalCollateralValue.toString());
  console.log(" NOTE: - target_collateral_value: ", targetCollateralValue.toString());

  console.log(chalk.yellow('\nTransferring some tokens and eth to metamask...'));
  await Promise.all([
    arthx.transfer(DEPLOYER_ADDRESS, new BigNumber("1000e18"), { from: DEPLOYER_ADDRESS }),
    arth.transfer(DEPLOYER_ADDRESS, new BigNumber("1000e18"), { from: DEPLOYER_ADDRESS })
  ]);

  console.log(chalk.blue('\nRefreshing collateral ratio...'));
  await arthControllerInstance.refreshCollateralRatio();
};
