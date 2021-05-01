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
  let SimpleOracle: ContractFactory;
  let ARTHController: ContractFactory;
  let MockUniswapOracle: ContractFactory;
  let ChainlinkETHGMUOracle: ContractFactory;
  let MockChainlinkAggregatorV3: ContractFactory;

  let arth: Contract;
  let gmuOracle: Contract;
  let arthController: Contract;
  let arthETHUniswapOracle: Contract;
  let chainlinkETHGMUOracle: Contract;
  let arthxETHUniswapOracle: Contract;
  let mockChainlinkAggregatorV3: Contract;

  before(' - Setup accounts & deploy libraries', async () => {
    [owner, timelock, attacker] = await ethers.getSigners();
  });

  before(' - Fetch contract factories', async () => {
    ARTH = await ethers.getContractFactory('ARTHStablecoin');
    SimpleOracle = await ethers.getContractFactory('SimpleOracle');
    ARTHController = await ethers.getContractFactory('ArthController');
    MockUniswapOracle = await ethers.getContractFactory('MockUniswapPairOracle');
    ChainlinkETHGMUOracle = await ethers.getContractFactory('ChainlinkETHUSDPriceConsumer');
    MockChainlinkAggregatorV3 = await ethers.getContractFactory('MockChainlinkAggregatorV3');
  });

  beforeEach(' - Deploy contracts', async () => {
    arth = await ARTH.deploy();
    gmuOracle = await SimpleOracle.deploy('GMU/USD', ETH);
    arthETHUniswapOracle = await MockUniswapOracle.deploy();
    arthxETHUniswapOracle = await MockUniswapOracle.deploy();
    mockChainlinkAggregatorV3 = await MockChainlinkAggregatorV3.deploy();

    chainlinkETHGMUOracle = await ChainlinkETHGMUOracle.deploy(
      mockChainlinkAggregatorV3.address,
      gmuOracle.address
    );
    arthController = await ARTHController.deploy(
      arth.address,
      owner.address,
      timelock.address
    );
  });

  beforeEach(' - Set some contract variables', async () => {
    await arthController.setETHGMUOracle(chainlinkETHGMUOracle.address);

    await arthController.setARTHETHOracle(
      arthETHUniswapOracle.address,
      owner.address  // Dummy address for WETH.
    );
    await arthController.setARTHXETHOracle(
      arthxETHUniswapOracle.address,
      owner.address  // Dummy address for WETH.
    );

    await arthController.setGlobalCollateralRatio(0);
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
        .gt(
          1e6 + 2500
        );

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
        .gt(
          1e6 + 2500
        );
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
        .gt(
          1e6 + 2500
        );

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
        .eq(
          1e6
        );

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
        .gte(
          1e6 - 5000
        );
      // Making sure that ARTH price < (target)
      expect(await arthController.getARTHPrice())
        .to
        .lt(
          1e6
        );

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
        .lte(
          1e6 + 5000
        );
      // Making sure that ARTH price > (target)
      expect(await arthController.getARTHPrice())
        .to
        .gt(
          1e6
        );

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
        .lt(
          1e6 - 2500
        );
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
        .lt(
          1e6 - 2500
        );

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
        .lt(
          1e6 - 2500
        );

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
