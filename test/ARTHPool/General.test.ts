import { ethers } from 'hardhat';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { JsonRpcProvider } from '@ethersproject/providers';
import { BigNumber, Contract, ContractFactory, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import deploy from './Deployments';
import { advanceBlock, advanceTimeAndBlock } from '../utilities';

chai.use(solidity);

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

describe('ARTHPool General', () => {
  let attacker: SignerWithAddress;
  let timelock: SignerWithAddress;
  let owner: SignerWithAddress;
  let ETH: BigNumber;
  let provider: JsonRpcProvider;
  let dai: Contract;
  let arthPool: Contract;;
  let oracle: Contract;;
  let arthController: Contract;
  let gmuOracle: Contract;;
  let mahaARTHUniswapOracle: Contract;;
  let daiETHUniswapOracle: Contract;;
  let ethUSDMockChainlinkAggregatorV3: Contract;;

  beforeEach(' - Get deployment', async() => {
    const deployments = await deploy();

    dai = deployments.dai;
    provider = deployments.provider;
    ETH = deployments.ETH;
    arthPool = deployments.arthPool;
    oracle = deployments.oracle;
    attacker = deployments.attacker;
    timelock = deployments.timelock;
    owner = deployments.owner;
    arthController = deployments.arthController;
    gmuOracle = deployments.gmuOracle;
    mahaARTHUniswapOracle = deployments.mahaARTHUniswapOracle;
    daiETHUniswapOracle = deployments.daiETHUniswapOracle;
    ethUSDMockChainlinkAggregatorV3 = deployments.ethUSDMockChainlinkAggregatorV3;
  });

  describe('- Some access restricted functions', async () => {
    it(' - Should not work if not (owner || governance)', async () => {
      await expect(arthPool.connect(attacker).setCollatGMUOracle(oracle.address))
        .to.revertedWith('ArthPool: You are not the owner or the governance timelock');

      await expect(arthPool.connect(attacker).setTimelock(timelock.address))
        .to.revertedWith('ArthPool: You are not the owner or the governance timelock');

      await expect(arthPool.connect(attacker).setOwner(owner.address))
        .to.revertedWith('ArthPool: You are not the owner or the governance timelock');

      await expect(arthPool.connect(attacker).setPoolParameters(ETH.mul(2), 1))
        .to.revertedWith('ArthPool: You are not the owner or the governance timelock');
    });

    it(' - Should work if (owner || governance)', async () => {
      await expect(arthPool.connect(owner).setCollatGMUOracle(oracle.address))
        .to.not.reverted;

      await expect(arthPool.connect(timelock).setCollatGMUOracle(oracle.address))
        .to.not.reverted;

      await expect(arthPool.connect(owner).setTimelock(timelock.address))
        .to.not.reverted;

      await expect(arthPool.connect(owner).setOwner(owner.address))
        .to.not.reverted;

      await expect(arthPool.connect(owner).setPoolParameters(ETH.mul(2), 1))
        .to.not.reverted;

      await expect(arthPool.connect(timelock).setTimelock(timelock.address))
        .to.not.reverted;

      await expect(arthPool.connect(timelock).setOwner(owner.address))
        .to.not.reverted;

      await expect(arthPool.connect(timelock).setPoolParameters(ETH.mul(2), 1))
        .to.not.reverted;
    });

    it(' - Should not work if not (owner || admin || governance)', async () => {
      await expect(arthPool.connect(attacker).setBuyBackCollateralBuffer(10))
        .to.revertedWith('ArthPool: forbidden');

      await expect(arthPool.connect(attacker).setARTHController(arthController.address))
        .to.revertedWith('ArthPool: forbidden');
    });

    it(' - Should work if not (owner || admin || governance)', async () => {
      await expect(arthPool.connect(owner).setBuyBackCollateralBuffer(10))
        .to.not.reverted

      await expect(arthPool.connect(owner).setARTHController(arthController.address))
        .to.not.reverted

      await expect(arthPool.connect(timelock).setBuyBackCollateralBuffer(10))
        .to.not.reverted

      await expect(arthPool.connect(timelock).setARTHController(arthController.address))
        .to.not.reverted
    });
  });

  describe('- Getters', async () => {
    it(' - Should get global collateral ratio properly', async () => {
      await arthController.setGlobalCollateralRatio(1e6);
      expect(await arthPool.getGlobalCR())
        .to.eq(1e6);

      await arthController.setGlobalCollateralRatio(1e3);
      expect(await arthPool.getGlobalCR())
        .to.eq(1e3);
    });

    it(' - Should get collateral price properly using uniswap oracle', async () => {
      await oracle.setBaseUSDChainlinkFeed(ZERO_ADDR);

      expect(await arthPool.getCollateralPrice())
        .to.eq(1e6);

      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthPool.getCollateralPrice())
        .to.eq(1063829);

      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthPool.getCollateralPrice())
        .to.eq(943396);

      await gmuOracle.setPrice(1e6);
      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      await ethUSDMockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.getCollateralPrice())
        .to.eq(2340425531) // 2340423800); // Since we divide by weth price in this ecosystem.

      await gmuOracle.setPrice(1e3);
      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      await ethUSDMockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.getCollateralPrice())
        .to.eq(2340425); // Since we divide by weth price in this ecosystem.

      await gmuOracle.setPrice(1e6);
      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      await ethUSDMockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.getCollateralPrice())
        .to.eq(2075471698); // 2075471200); // Since we divide by weth price in this ecosystem.

      await gmuOracle.setPrice(1e3);
      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      await ethUSDMockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.getCollateralPrice())
        .to.eq(2075471); // Since we divide by weth price in this ecosystem.
    });

    it(' - Should get collateral balance properly using uniswap oracle', async () => {
      await oracle.setBaseUSDChainlinkFeed(ZERO_ADDR);

      expect(await arthPool.getCollateralGMUBalance())
        .to.eq(0);

      await dai.transfer(arthPool.address, ETH);

      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthPool.getCollateralGMUBalance())
        .to.eq(BigNumber.from('1063829000000000000'));

      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthPool.getCollateralGMUBalance())
        .to.eq(BigNumber.from('943396000000000000'));

      await gmuOracle.setPrice(1e6);
      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      await ethUSDMockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.getCollateralGMUBalance())
        .to.eq(BigNumber.from('2340425531').mul(ETH).div(1e6)); // Since we divide by weth price in this ecosystem.

      await gmuOracle.setPrice(1e3);
      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      await ethUSDMockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.getCollateralGMUBalance())
        .to.eq(BigNumber.from('2340425').mul(ETH).div(1e6)); // Since we divide by weth price in this ecosystem.

      await gmuOracle.setPrice(1e6);
      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      await ethUSDMockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.getCollateralGMUBalance())
        .to.eq(BigNumber.from('2075471698').mul(ETH).div(1e6)); // Since we divide by weth price in this ecosystem.

      await gmuOracle.setPrice(1e3);
      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      await ethUSDMockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.getCollateralGMUBalance())
        .to.eq(BigNumber.from('2075471').mul(ETH).div(1e6)); // Since we divide by weth price in this ecosystem.
    });

    it(' - Should estimate MAHA stability fee properly', async () => {
      expect(await arthPool.estimateStabilityFeeInMAHA(ETH))
        .to.eq(BigNumber.from('0'));

      await advanceTimeAndBlock(provider, 7 * 24 * 60 * 60);

      expect(await arthPool.estimateStabilityFeeInMAHA(ETH))
        .to.eq(BigNumber.from('0'));

      await arthController.setStabilityFee(1e4);

      expect(await arthPool.estimateStabilityFeeInMAHA(ETH))
        .to.eq(BigNumber.from('10000000000000000'));

      await mahaARTHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthPool.estimateStabilityFeeInMAHA(ETH))
        .to.eq(BigNumber.from('9433962264150943'));

      await mahaARTHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthPool.estimateStabilityFeeInMAHA(ETH))
        .to.eq(BigNumber.from('10638297872340425'));
    });

    it(' - Should return Target collateral value properly', async () => {
      await arthController.connect(owner).setGlobalCollateralRatio(11e5)
      expect(await arthPool.getTargetCollateralValue())
        .to.eq(BigNumber.from('24310000000000000000000000'));

      await arthController.connect(owner).setGlobalCollateralRatio(12e5)
      expect(await arthPool.getTargetCollateralValue())
        .to.eq(BigNumber.from('26520000000000000000000000'));
    });
  });
});
