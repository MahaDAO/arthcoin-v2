import { network, ethers } from 'hardhat';
require('dotenv').config();

const helpers = require('../migrations/helpers');
const knownContracts = require('../migrations/known-contracts');

async function main() {
  console.log(network.name);

  const [deployer] = await ethers.getSigners();

  // Deploying the curve
  const curveContract = await ethers.getContractFactory("RecollateralDiscountCurve");
  const curve = await curveContract.deploy()


  // Testing with USDC ETHGenesis
  const ethGenesisUSDCContract = await ethers.getContractFactory("ETHGenesisUSDC");
  const usdcAddress = knownContracts.USDC && knownContracts.USDC[network.name];
  console.log('usdcAddress', usdcAddress);

  const gmuOracleUSDC = await ethers.getContractFactory("GMUOracle");
  const usdcGmuOracle = await gmuOracleUSDC.deploy('USDCGmuOracle', 1e6); // inital price is also hardcoded
  console.log('usdcGmuOracle', usdcGmuOracle.address);

  const ethGenesisUSDC = await ethGenesisUSDCContract.deploy(usdcAddress, deployer.address, deployer.address, usdcGmuOracle.address);
  console.log("ethGenesisUSDC", ethGenesisUSDC.address);

  /*
    set arthSupply, arthxPrice, recollateralizeDiscountCruve, setGlobalCollateralRatio,
    setGlobalCollateralValue in ethGenesisDai
  */
  await ethGenesisUSDC.setArthSupply(21e10); // Need to fetch arthsupply from matic network
  await ethGenesisUSDC.setArthxPrice(1e6); // Need to fetch arthxprice from matic network
  await ethGenesisUSDC.setRecollateralizationCurve(curve.address);
  await ethGenesisUSDC.setGlobalCollateralRatio(11e5);
  await ethGenesisUSDC.setGlobalCollateralValue(0);


  // USDT ETH Genesis
  const ethGenesisUSDTContract = await ethers.getContractFactory("ETHGenesisUSDT");
  const usdtAddress = knownContracts.USDT && knownContracts.USDT[network.name];
  console.log('usdtAddress', usdtAddress);

  const gmuOracleUSDT = await ethers.getContractFactory("GMUOracle");
  const usdtGmuOracle = await gmuOracleUSDT.deploy('USDTGmuOracle', 1e6); // inital price is also hardcoded
  console.log('usdtGmuOracle', usdtGmuOracle.address);

  const ethGenesisUSDT = await ethGenesisUSDTContract.deploy(usdtAddress, deployer.address, deployer.address, usdtGmuOracle.address);
  console.log("ethGenesisUSDT", ethGenesisUSDT.address);

  /*
    set arthSupply, arthxPrice, recollateralizeDiscountCruve, setGlobalCollateralRatio,
    setGlobalCollateralValue in ethGenesisDai
  */
  await ethGenesisUSDT.setArthSupply(21e10); // Need to fetch arthsupply from matic network
  await ethGenesisUSDT.setArthxPrice(1e6); // Need to fetch arthxprice from matic network
  await ethGenesisUSDT.setRecollateralizationCurve(curve.address);
  await ethGenesisUSDT.setGlobalCollateralRatio(11e5);
  await ethGenesisUSDT.setGlobalCollateralValue(0);


  // WETH Genesis
  const ethGenesisWETHContract = await ethers.getContractFactory("ETHGenesisWETH");
  const wethAddress = knownContracts.WETH && knownContracts.WETH[network.name];
  console.log('wethAddress', wethAddress);

  const gmuOracleWETH = await ethers.getContractFactory("GMUOracle");
  const wethGmuOracle = await gmuOracleWETH.deploy('WETHGmuOracle', 1e6);
  console.log('wethGmuOracle', wethGmuOracle.address);

  const ethGenesisWETH = await ethGenesisWETHContract.deploy(wethAddress, deployer.address, deployer.address, wethGmuOracle.address);
  console.log("ethGenesisUSDC", ethGenesisUSDC.address);

  /*
    set arthSupply, arthxPrice, recollateralizeDiscountCruve, setGlobalCollateralRatio,
    setGlobalCollateralValue in ethGenesisDai
  */
  await ethGenesisWETH.setArthSupply(21e10); // Need to fetch arthsupply from matic network
  await ethGenesisWETH.setArthxPrice(1e6); // Need to fetch arthxprice from matic network
  await ethGenesisWETH.setRecollateralizationCurve(curve.address);
  await ethGenesisWETH.setGlobalCollateralRatio(11e5);
  await ethGenesisWETH.setGlobalCollateralValue(0);


  // WBTC Genesis
  const ethGenesisWBTCContract = await ethers.getContractFactory("ETHGenesisWBTC");
  const wbtcAddress = knownContracts.WBTC && knownContracts.WBTC[network.name];
  console.log('wbtcAddress', wbtcAddress);

  const gmuOracleWBTC = await ethers.getContractFactory("GMUOracle");
  const wbtcGmuOracle = await gmuOracleWBTC.deploy('WBTCGmuOracle', 1e6); // inital price is also hardcoded
  console.log('wbtcGmuOracle', wbtcGmuOracle.address);

  const ethGenesisWBTC = await ethGenesisUSDTContract.deploy(wbtcAddress, deployer.address, deployer.address, usdtGmuOracle.address);
  console.log("ethGenesisWBTC", ethGenesisWBTC.address);

  /*
    set arthSupply, arthxPrice, recollateralizeDiscountCruve, setGlobalCollateralRatio,
    setGlobalCollateralValue in ethGenesisDai
  */
  await ethGenesisWBTC.setArthSupply(21e10); // Need to fetch arthsupply from matic network
  await ethGenesisWBTC.setArthxPrice(1e6); // Need to fetch arthxprice from matic network
  await ethGenesisWBTC.setRecollateralizationCurve(curve.address);
  await ethGenesisWBTC.setGlobalCollateralRatio(11e5);
  await ethGenesisWBTC.setGlobalCollateralValue(0);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
