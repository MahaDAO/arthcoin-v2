import { ethers } from 'hardhat';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract, ContractFactory, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import { advanceTimeAndBlock } from './utilities';


chai.use(solidity);


/**
 *
 * TODO: add test cases for.
 *  - Access level check.
 *  - Manually set prices and check for getters(espcially price and value getters).
 */
describe('ARTHController', () => {
  const { provider } = ethers;

  const ETH = utils.parseEther('1');

  let owner: SignerWithAddress;
  let timelock: SignerWithAddress;
  let attacker: SignerWithAddress;

  let ARTH: ContractFactory;
  let MAHA: ContractFactory;
  let ARTHX: ContractFactory;
  let Oracle: ContractFactory;
  let ARTHPool: ContractFactory;
  let SimpleOracle: ContractFactory;
  let MockCollateral: ContractFactory;
  let ARTHController: ContractFactory;
  let ARTHPoolLibrary: ContractFactory;
  let MockUniswapOracle: ContractFactory;
  let ChainlinkETHGMUOracle: ContractFactory;
  let RecollateralizationCurve: ContractFactory;
  let MockChainlinkAggregatorV3: ContractFactory;

  let dai: Contract;
  let usdc: Contract;
  let arth: Contract;
  let maha: Contract;
  let arthx: Contract;
  let gmuOracle: Contract;
  let daiARTHPool: Contract;
  let usdcARTHPool: Contract;
  let daiPoolOracle: Contract;
  let usdcPoolOracle: Contract;
  let arthMahaOracle: Contract;
  let arthController: Contract;
  let arthPoolLibrary: Contract;
  let daiETHUniswapOracle: Contract;
  let usdcETHUniswapOracle: Contract;
  let arthETHUniswapOracle: Contract;
  let chainlinkETHGMUOracle: Contract;
  let arthxETHUniswapOracle: Contract;
  let recollaterizationCurve: Contract;
  let mockChainlinkAggregatorV3: Contract;

  before(' - Setup accounts & deploy libraries', async () => {
    [owner, timelock, attacker] = await ethers.getSigners();

    ARTHPoolLibrary = await ethers.getContractFactory('ArthPoolLibrary');
    arthPoolLibrary = await ARTHPoolLibrary.deploy();
  });

  before(' - Fetch contract factories', async () => {
    MAHA = await ethers.getContractFactory('MahaToken');
    ARTHX = await ethers.getContractFactory('ARTHShares');
    ARTH = await ethers.getContractFactory('ARTHStablecoin');
    MockCollateral = await ethers.getContractFactory('MockCollateral');

    ARTHPool = await ethers.getContractFactory('ArthPool', {
      libraries: {
        ArthPoolLibrary: arthPoolLibrary.address
      }
    });

    Oracle = await ethers.getContractFactory('Oracle');
    SimpleOracle = await ethers.getContractFactory('SimpleOracle');
    ARTHController = await ethers.getContractFactory('ArthController');
    MockUniswapOracle = await ethers.getContractFactory('MockUniswapPairOracle');
    RecollateralizationCurve = await ethers.getContractFactory('MockRecollateralizeCurve');
    ChainlinkETHGMUOracle = await ethers.getContractFactory('ChainlinkETHUSDPriceConsumer');
    MockChainlinkAggregatorV3 = await ethers.getContractFactory('MockChainlinkAggregatorV3');
  });

  beforeEach(' - Deploy contracts', async () => {
    arth = await ARTH.deploy();
    maha = await MAHA.deploy();
    dai = await MockCollateral.deploy(owner.address, ETH.mul(10000), 'DAI', 18);
    usdc = await MockCollateral.deploy(owner.address, ETH.mul(10000), 'USDC', 18);

    gmuOracle = await SimpleOracle.deploy('GMU/USD', ETH.div(1e12)); // Keep the price of simple oracle in 1e6 precision.
    daiETHUniswapOracle = await MockUniswapOracle.deploy();
    usdcETHUniswapOracle = await MockUniswapOracle.deploy();
    arthETHUniswapOracle = await MockUniswapOracle.deploy();
    arthxETHUniswapOracle = await MockUniswapOracle.deploy();
    arthMahaOracle = await SimpleOracle.deploy('ARTH/MAHA', ETH.div(1e12));  // Keep the price of simple oracle in 1e6 precision.
    mockChainlinkAggregatorV3 = await MockChainlinkAggregatorV3.deploy();

    chainlinkETHGMUOracle = await ChainlinkETHGMUOracle.deploy(
      mockChainlinkAggregatorV3.address,
      gmuOracle.address
    );

    arthx = await ARTHX.deploy(
      'ARTHX',
      'ARTHX',
      arthxETHUniswapOracle.address,
      owner.address,
      owner.address
    );

    arthPoolLibrary = await ARTHPoolLibrary.deploy();
    arthController = await ARTHController.deploy(arth.address, owner.address, timelock.address);

    daiARTHPool = await ARTHPool.deploy(
      arth.address,
      arthx.address,
      dai.address,
      owner.address,
      owner.address,
      maha.address,
      arthMahaOracle.address,
      arthController.address,
      ETH.mul(90000)
    );
    usdcARTHPool = await ARTHPool.deploy(
      arth.address,
      arthx.address,
      usdc.address,
      owner.address,
      owner.address,
      maha.address,
      arthMahaOracle.address,
      arthController.address,
      ETH.mul(90000)
    );

    daiPoolOracle = await Oracle.deploy(
      dai.address,
      owner.address, // Temp address for weth in mock oracles.
      daiETHUniswapOracle.address,
      '0x0000000000000000000000000000000000000000',
      chainlinkETHGMUOracle.address
    );

    usdcPoolOracle = await Oracle.deploy(
      usdc.address,
      owner.address, // Temp address for weth in mock oracles.
      daiETHUniswapOracle.address,
      '0x0000000000000000000000000000000000000000',
      chainlinkETHGMUOracle.address
    );

    recollaterizationCurve = await RecollateralizationCurve.deploy();
  });

  beforeEach(' - Set some contract variables', async () => {
    await arthController.setETHGMUOracle(chainlinkETHGMUOracle.address);
    await arthx.setARTHAddress(arth.address);

    await arth.addPool(daiARTHPool.address);
    await arth.addPool(usdcARTHPool.address);

    await arthController.addPool(daiARTHPool.address);
    await arthController.addPool(usdcARTHPool.address);

    await arthController.setGlobalCollateralRatio(0);
    await arthx.setArthController(arthController.address);

    await daiARTHPool.setCollatGMUOracle(daiPoolOracle.address);
    await usdcARTHPool.setCollatGMUOracle(usdcPoolOracle.address);

    await arthController.setARTHETHOracle(arthETHUniswapOracle.address, owner.address);
    await arthController.setARTHXETHOracle(arthxETHUniswapOracle.address, owner.address);

    await daiARTHPool.setPoolParameters(
      ETH.mul(2),
      1,
      1000,
      1000,
      1000,
      1000
    );
    await usdcARTHPool.setPoolParameters(
      ETH.mul(2),
      1,
      1000,
      1000,
      1000,
      1000
    );

    await mockChainlinkAggregatorV3.setLatestPrice(ETH.div(1e10));  // Keep the price of mock chainlink oracle as 1e8 for simplicity sake.

    await daiARTHPool.setRecollateralizationCurve(recollaterizationCurve.address);
    await usdcARTHPool.setRecollateralizationCurve(recollaterizationCurve.address);
  });

  describe('- Access restricted functions', async () => {
    it(' - Should not work if not COLLATERAL_RATIO_PAUSER', async() => {
      await expect(arthController.connect(attacker).toggleCollateralRatio())
        .to
        .revertedWith('');
    });

    it(' - Should work if COLLATERAL_RATIO_PAUSER', async () => {
      await expect(arthController.connect(owner).toggleCollateralRatio())
        .to
        .not
        .reverted;

      expect(await arthController.isColalteralRatioPaused())
        .to
        .eq(true);

      await expect(arthController.connect(timelock).toggleCollateralRatio())
        .to
        .not
        .reverted;

      expect(await arthController.isColalteralRatioPaused())
        .to
        .eq(false);
    });

    it(' - Should not work if not DEFAULT_ADMIN_ROLE', async () => {
      await expect(arthController.connect(attacker).setGlobalCollateralRatio(1e5))
        .to
        .revertedWith('ARTHController: FORBIDDEN');

      await expect(arthController.connect(timelock).setGlobalCollateralRatio(1e5))
        .to
        .revertedWith('ARTHController: FORBIDDEN');
    });

    it(' - Should work if DEFAULT_ADMIN_ROLE', async () => {
      await expect(arthController.connect(owner).setGlobalCollateralRatio(1e5))
        .to
        .not
        .reverted;

      expect(await arthController.globalCollateralRatio())
        .to
        .eq(1e5);
    });

    it(' - Should not work if not (governance || owner)', async () => {
      await expect(arthController.connect(attacker).setARTHXAddress(arth.address))  // Mock address to test access level.
        .to
        .revertedWith('ARTHController: FORBIDDEN');
    });

    it(' - Should not work if (governance || owner)', async () => {
      await expect(arthController.connect(owner).setARTHXAddress(arth.address))  // Mock address to test access level.
        .to
        .not
        .reverted;

      expect(await arthController.arthxAddress())
        .to
        .eq(arth.address);

      await expect(arthController.connect(timelock).setARTHXAddress(owner.address))  // Mock address to test access level.
        .to
        .not
        .reverted;

      expect(await arthController.arthxAddress())
        .to
        .eq(owner.address);
    });
  });

  describe('- Refresh collateral', async () => {
    it(' - Should not work if CR paused', async () => {
      await arthController.toggleCollateralRatio();

      expect(await arthController.isColalteralRatioPaused())
        .to
        .eq(true);

      await expect(arthController.refreshCollateralRatio())
        .to
        .revertedWith('ARTHController: Collateral Ratio has been paused');
    });

    it(' - Should not work if Refresh cooldown period not passed', async () => {
      expect(await arthController.isColalteralRatioPaused())
        .to
        .eq(false);

      await arthController.refreshCollateralRatio();

      await advanceTimeAndBlock(provider, 3598);

      await expect(arthController.refreshCollateralRatio())
        .to
        .revertedWith('ARTHController: must wait till callable again');
    });

    it(' - Should work if Refresh cooldown period has passed', async () => {
      expect(await arthController.isColalteralRatioPaused())
        .to
        .eq(false);

      await arthController.refreshCollateralRatio();

      await advanceTimeAndBlock(provider, 3601);

      await expect(arthController.refreshCollateralRatio())
        .to
        .not
        .reverted;
    });

    it(' - Should reduce CR by a step if price > (1 + band)', async () => {
      await arthController.setGlobalCollateralRatio(1e5)

      // Reduce the WETH to increase ARTH price.
      await arthETHUniswapOracle.setPrice(ETH.mul(50).div(100));

      // Making sure that ARTH price > (target + band)
      expect(await arthController.getARTHPrice())
        .to
        .gt(1e6 + 2500);

      // Making sure that CR ain't paused.
      expect(await arthController.isColalteralRatioPaused())
        .to
        .eq(false);

      await arthController.refreshCollateralRatio();

      expect(await arthController.getGlobalCollateralRatio())
        .to
        .eq(97500);  // 1e5 - 2500(step).
    });

    it(' - Should reduce CR to 0 if already CR < step & price > (1 + band)', async () => {
      await arthController.setGlobalCollateralRatio(2500)
      await arthETHUniswapOracle.setPrice(ETH.mul(50).div(100));  // Reduce WETH price, to increase ARTH price.

      // Making sure that ARTH price > (target + band).
      expect(await arthController.getARTHPrice())
        .to
        .gt(1e6 + 2500);

      // Making sure that CR ain't paused.
      expect(await arthController.isColalteralRatioPaused())
        .to
        .eq(false);

      await arthController.refreshCollateralRatio();
      expect(await arthController.getGlobalCollateralRatio())
        .to
        .eq(0);  // 2500 - 2500(step).

      // Must wait till callable again.
      await advanceTimeAndBlock(provider, 3601);

      await arthController.setGlobalCollateralRatio(2499);

      // Making sure that still, ARTH price > (target + band)
      expect(await arthController.getARTHPrice())
        .to
        .gt(1e6 + 2500);

      // Making sure that CR ain't paused.
      expect(await arthController.isColalteralRatioPaused())
        .to
        .eq(false);

      await arthController.refreshCollateralRatio();
      expect(await arthController.getGlobalCollateralRatio())
        .to
        .eq(0);  // 2500 - 2500(step).
    });

    it(' - Should not modify CR if price = 1', async () => {
      await arthController.setGlobalCollateralRatio(1e5);

      // Making sure that ARTH price = target.
      expect(await arthController.getARTHPrice())
        .to
        .eq(1e6);

      // Making sure that CR ain't paused.
      expect(await arthController.isColalteralRatioPaused())
        .to
        .eq(false);

      await arthController.refreshCollateralRatio();

      expect(await arthController.getGlobalCollateralRatio())
        .to
        .eq(1e5);
    });

    it(' - Should not modify CR if  (1 - band) > price > 1', async () => {
      await arthController.setGlobalCollateralRatio(1e5);

      await arthETHUniswapOracle.setPrice(
        ETH.add(ETH.div(200))
      );

      // Making sure that ARTH price > (target - band).
      expect(await arthController.getARTHPrice())
        .to
        .gte(1e6 - 5000);

      // Making sure that ARTH price < (target)
      expect(await arthController.getARTHPrice())
        .to
        .lt(1e6);

      // Making sure that CR ain't paused.
      expect(await arthController.isColalteralRatioPaused())
        .to
        .eq(false);

      await arthController.refreshCollateralRatio();

      expect(await arthController.getGlobalCollateralRatio())
        .to
        .eq(1e5);
    });

    it(' - Should not modify CR if 1 < price < (1 + band)', async () => {
      await arthController.setGlobalCollateralRatio(1e5);

      await arthETHUniswapOracle.setPrice(
        ETH.sub(ETH.div(225))
      );

      // Making sure that ARTH price < (target + band)
      expect(await arthController.getARTHPrice())
        .to
        .lte(1e6 + 5000);

      // Making sure that ARTH price > (target)
      expect(await arthController.getARTHPrice())
        .to
        .gt(1e6);

      // Making sure that CR ain't paused.
      expect(await arthController.isColalteralRatioPaused())
        .to
        .eq(false);

      await arthController.refreshCollateralRatio();

      expect(await arthController.getGlobalCollateralRatio())
        .to
        .eq(1e5);
    });

    it(' - Should cap CR to 1 if already CR + step >= 1 & price < (1 - band)', async () => {
      await arthController.setGlobalCollateralRatio(1e6)
      // Reduce WETH price, to increase ARTH price.
      await arthETHUniswapOracle.setPrice(ETH.mul(150).div(100));

      // Making sure that ARTH price < (target - band)
      expect(await arthController.getARTHPrice())
        .to
        .lt(1e6 - 2500);

      // Making sure that CR ain't paused.
      expect(await arthController.isColalteralRatioPaused())
        .to
        .eq(false);

      await arthController.refreshCollateralRatio();

      expect(await arthController.getGlobalCollateralRatio())
        .to
        .eq(1e6); // Checking capping of CR.

      // Must wait till callable again.
      await advanceTimeAndBlock(provider, 3601);

      await arthController.setGlobalCollateralRatio(1e6 + 1);

      // Making sure that still, ARTH price > (target - band)
      expect(await arthController.getARTHPrice())
        .to
        .lt(1e6 - 2500);

      // Making sure that CR ain't paused.
      expect(await arthController.isColalteralRatioPaused())
        .to
        .eq(false);

      await arthController.refreshCollateralRatio();
      expect(await arthController.getGlobalCollateralRatio())
        .to
        .eq(1e6); // Checking capping of CR.
    });

    it(' - Should increase CR by a step if price < (1 - band)', async () => {
      await arthController.setGlobalCollateralRatio(1e5)

      // Increase the WETH price to reduce ARTH price.
      await arthETHUniswapOracle.setPrice(ETH.mul(150).div(100));

      // Making sure that ARTH price > (target - band)
      expect(await arthController.getARTHPrice())
        .to
        .lt(1e6 - 2500);

      // Making sure that CR ain't paused.
      expect(await arthController.isColalteralRatioPaused())
        .to
        .eq(false);

      await arthController.refreshCollateralRatio();

      expect(await arthController.getGlobalCollateralRatio())
        .to
        .eq(102500);  // 1e5 + 2500(step).
    });
  });
});
