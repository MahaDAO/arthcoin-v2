require('dotenv').config();
const chalk = require('chalk');
const BigNumber = require('bignumber.js');
const helpers = require('./helpers');

const ARTHController = artifacts.require("ArthController");

const UniswapPairOracle_MAHA_ARTH = artifacts.require("Oracle/Variants/UniswapPairOracle_MAHA_ARTH");
const UniswapPairOracle_ARTH_ARTHX = artifacts.require("Oracle/Variants/UniswapPairOracle_ARTH_ARTHX");


module.exports = async function (deployer, network, accounts) {
  if (network === 'mainnet') return;

  const BIG6 = new BigNumber("1e6");
  const BIG18 = new BigNumber("1e18");

  const DEPLOYER_ADDRESS = accounts[0];

  const arth = await helpers.getARTH(network, deployer, artifacts);
  const arthx = await helpers.getARTHX(network, deployer, artifacts);

  const arthControllerInstance = await ARTHController.deployed();
  const wethInstance = await helpers.getWETH(network, deployer, artifacts, DEPLOYER_ADDRESS);

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
