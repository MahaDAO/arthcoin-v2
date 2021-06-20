require('dotenv').config();
const chalk = require('chalk');
const BigNumber = require('bignumber.js');

const helpers = require('./helpers');

const Pool_USDC = artifacts.require("Arth/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Arth/Pools/Pool_USDT");
const Pool_WBTC = artifacts.require("Arth/Pools/Pool_WBTC");
const Pool_WMATIC = artifacts.require("Arth/Pools/Pool_WMATIC");
const Pool_WETH = artifacts.require("Arth/Pools/Pool_WETH");

module.exports = async function (deployer, network, accounts) {
  const DEPLOYER_ADDRESS = accounts[0];

  const ONE_HUNDRED_DEC6 = new BigNumber("100e6");
  const ONE_HUNDRED_DEC8 = new BigNumber("100e8");
  const ONE_HUNDRED_DEC18 = new BigNumber("100e18");

  const WETH_COLLATERAL_SEED = new BigNumber(1e18);

  const pool_instance_USDC = await Pool_USDC.deployed();
  const pool_instance_USDT = await Pool_USDT.deployed();
  const pool_instance_WBTC = await Pool_WBTC.deployed();
  const pool_instance_WMATIC = await Pool_WMATIC.deployed();
  const pool_instance_WETH = await Pool_WETH.deployed();

  const col_instance_USDC = await helpers.getUSDC(network, deployer, artifacts);
  const col_instance_USDT = await helpers.getUSDT(network, deployer, artifacts);
  const col_instance_WBTC = await helpers.getWBTC(network, deployer, artifacts);
  const col_instance_WMATIC = await helpers.getWMATIC(network, deployer, artifacts);
  const col_instance_WETH = await helpers.getWETH(network, deployer, artifacts);

  await col_instance_WETH.deposit({ value: new BigNumber(1e18) });

  console.log(chalk.yellow("\nSeeding the collateral pools some collateral to start off with..."));
  if (!helpers.isMainnet(network)) {
    await Promise.all([
      await col_instance_USDC.transfer(pool_instance_USDC.address, ONE_HUNDRED_DEC6, { from: DEPLOYER_ADDRESS }),
      await col_instance_USDT.transfer(pool_instance_USDT.address, ONE_HUNDRED_DEC6, { from: DEPLOYER_ADDRESS }),
      await col_instance_WBTC.transfer(pool_instance_WBTC.address, ONE_HUNDRED_DEC8, { from: DEPLOYER_ADDRESS }),
      await col_instance_WMATIC.transfer(pool_instance_WMATIC.address, ONE_HUNDRED_DEC18, { from: DEPLOYER_ADDRESS }),
      await col_instance_WETH.transfer(pool_instance_WETH.address, WETH_COLLATERAL_SEED, { from: DEPLOYER_ADDRESS }),
    ]);
  }
};
