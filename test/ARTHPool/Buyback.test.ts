import { ethers } from 'hardhat';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { JsonRpcProvider } from '@ethersproject/providers';
import { BigNumber, Contract, ContractFactory, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import deploy from './Deployments';
import { advanceBlock, advanceTimeAndBlock } from '../utilities';

chai.use(solidity);

describe('ARTHPool', () => {
  let attacker: SignerWithAddress;
  let timelock: SignerWithAddress;
  let owner: SignerWithAddress;
  let ETH: BigNumber;
  let provider: JsonRpcProvider;
  let dai: Contract;
  let arth: Contract;
  let arthx: Contract;
  let maha: Contract;
  let arthPool: Contract;;
  let oracle: Contract;;
  let arthController: Contract;
  let gmuOracle: Contract;;
  let mahaARTHUniswapOracle: Contract;;
  let daiETHUniswapOracle: Contract;;
  let ethUSDMockChainlinkAggregatorV3: Contract;
  let daiUSDMockChainlinkAggregatorV3: Contract;
  let arthxARTHUniswapOracle: Contract;

  beforeEach(' - Get deployment', async () => {
    const deployments = await deploy();

    dai = deployments.dai;
    arth = deployments.arth;
    arthx = deployments.arthx;
    maha = deployments.maha;
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
    daiUSDMockChainlinkAggregatorV3 = deployments.daiUSDMockChainlinkAggregatorV3;
    arthxARTHUniswapOracle = deployments.arthxARTHUniswapOracle;
  });

  describe('- Buyback ARTHX', async () => {
    beforeEach(' - Approve collateral', async () => {
      await arthx.approve(arthPool.address, ETH);
      await advanceTimeAndBlock(provider, 7 * 24 * 60 * 60);
    });

    it(' - Should not buyback when paused', async () => {
      await expect(arthPool.buyBackARTHX(ETH, 0))
        .to.revertedWith('Buyback is paused');

      await expect(arthPool.buyBackARTHX(ETH, ETH))
        .to.revertedWith('Buyback is paused');
    });

    it(' - Should not buyback when expected collateral > to be bought back', async () => {
      await arthController.connect(timelock).toggleBuyBack();

      await dai.transfer(arthPool.address, await dai.balanceOf(owner.address)); // Should cause effect of excess collateral.

      await expect(arthPool.buyBackARTHX(ETH, ETH.mul(3)))
        .to.revertedWith('Slippage limit reached');
    });

    describe(' - Using chainlink oracles', async() => {
      it(' - Should buyback properly when DAI/USD = 1 & USD/GMU = 1 & ARTHX/GMU = 1', async () => {
        await arthController.connect(timelock).toggleBuyBack();
        // Should causes effect of excess collateral.
        await dai.transfer(arthPool.address, await dai.balanceOf(owner.address));

        const daiBalanceBefore = await dai.balanceOf(owner.address);
        const poolsDaiBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const totalSupplyBefore = await arthx.totalSupply();

        const expectedBuyback = ETH.mul(BigNumber.from(1e6).sub(1000)).div(1e6);
        await arthPool.buyBackARTHX(ETH, expectedBuyback);

        expect(await dai.balanceOf(owner.address))
          .to.eq(daiBalanceBefore.add(expectedBuyback));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolsDaiBalanceBefore.sub(expectedBuyback));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.sub(ETH));

        expect(await arthx.totalSupply())
          .to.eq(totalSupplyBefore.sub(ETH));
      });

      it(' - Should buyback properly when DAI/USD = 1 & USD/GMU > 1 & ARTHX/GMU = 1', async () => {
        await arthController.connect(timelock).toggleBuyBack();
        // Should causes effect of excess collateral.
        await dai.transfer(arthPool.address, await dai.balanceOf(owner.address));

        const daiBalanceBefore = await dai.balanceOf(owner.address);
        const poolsDaiBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const totalSupplyBefore = await arthx.totalSupply();

        await gmuOracle.setPrice(1.06e6);
        const expectedBuyback = ETH.mul(1e6).div(1.06e6);
        const expectedBuybackWithoutFee = expectedBuyback.mul(BigNumber.from(1e6).sub(1000)).div(1e6);
        await arthPool.buyBackARTHX(ETH, expectedBuybackWithoutFee);

        expect(await dai.balanceOf(owner.address))
          .to.eq(daiBalanceBefore.add(expectedBuybackWithoutFee));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolsDaiBalanceBefore.sub(expectedBuybackWithoutFee));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.sub(ETH));

        expect(await arthx.totalSupply())
          .to.eq(totalSupplyBefore.sub(ETH));
      });

      it(' - Should buyback properly when DAI/USD = 1 & USD/GMU < 1 & ARTHX/GMU = 1', async () => {
        await arthController.connect(timelock).toggleBuyBack();
        // Should causes effect of excess collateral.
        await dai.transfer(arthPool.address, await dai.balanceOf(owner.address));

        const daiBalanceBefore = await dai.balanceOf(owner.address);
        const poolsDaiBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const totalSupplyBefore = await arthx.totalSupply();

        await gmuOracle.setPrice(0.94e6);
        const expectedBuyback = ETH.mul(1e6).div(0.94e6);
        const expectedBuybackWithoutFee = expectedBuyback.mul(BigNumber.from(1e6).sub(1000)).div(1e6);
        await arthPool.buyBackARTHX(ETH, expectedBuybackWithoutFee);

        expect(await dai.balanceOf(owner.address))
          .to.eq(daiBalanceBefore.add(expectedBuybackWithoutFee));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolsDaiBalanceBefore.sub(expectedBuybackWithoutFee));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.sub(ETH));

        expect(await arthx.totalSupply())
          .to.eq(totalSupplyBefore.sub(ETH));
      });

      it(' - Should buyback properly when DAI/USD > 1 & USD/GMU = 1 & ARTHX/GMU = 1', async () => {
        await arthController.connect(timelock).toggleBuyBack();
        // Should causes effect of excess collateral.
        await dai.transfer(arthPool.address, await dai.balanceOf(owner.address));

        const daiBalanceBefore = await dai.balanceOf(owner.address);
        const poolsDaiBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const totalSupplyBefore = await arthx.totalSupply();

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        const expectedBuyback = ETH.mul(1e6).div(1.06e6);
        const expectedBuybackWithoutFee = expectedBuyback.mul(BigNumber.from(1e6).sub(1000)).div(1e6);
        await arthPool.buyBackARTHX(ETH, expectedBuybackWithoutFee);

        expect(await dai.balanceOf(owner.address))
          .to.eq(daiBalanceBefore.add(expectedBuybackWithoutFee));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolsDaiBalanceBefore.sub(expectedBuybackWithoutFee));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.sub(ETH));

        expect(await arthx.totalSupply())
          .to.eq(totalSupplyBefore.sub(ETH));
      });

      it(' - Should buyback properly when DAI/USD > 1 & USD/GMU > 1 & ARTHX/GMU = 1', async () => {
        await arthController.connect(timelock).toggleBuyBack();
        // Should causes effect of excess collateral.
        await dai.transfer(arthPool.address, await dai.balanceOf(owner.address));

        const daiBalanceBefore = await dai.balanceOf(owner.address);
        const poolsDaiBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const totalSupplyBefore = await arthx.totalSupply();

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        await gmuOracle.setPrice(1.06e6);
        const oraclePrice = BigNumber.from(1.06e6).mul(1.06e6).div(1e6);
        const expectedBuyback = ETH.mul(1e6).div(oraclePrice);
        const expectedBuybackWithoutFee = expectedBuyback.mul(BigNumber.from(1e6).sub(1000)).div(1e6);
        await arthPool.buyBackARTHX(ETH, expectedBuybackWithoutFee);

        expect(await dai.balanceOf(owner.address))
          .to.eq(daiBalanceBefore.add(expectedBuybackWithoutFee));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolsDaiBalanceBefore.sub(expectedBuybackWithoutFee));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.sub(ETH));

        expect(await arthx.totalSupply())
          .to.eq(totalSupplyBefore.sub(ETH));
      });

      it(' - Should buyback properly when DAI/USD > 1 & USD/GMU < 1 & ARTHX/GMU = 1', async () => {
        await arthController.connect(timelock).toggleBuyBack();
        // Should causes effect of excess collateral.
        await dai.transfer(arthPool.address, await dai.balanceOf(owner.address));

        const daiBalanceBefore = await dai.balanceOf(owner.address);
        const poolsDaiBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const totalSupplyBefore = await arthx.totalSupply();

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        await gmuOracle.setPrice(0.94e6);
        const oraclePrice = BigNumber.from(1.06e6).mul(0.94e6).div(1e6);
        const expectedBuyback = ETH.mul(1e6).div(oraclePrice);
        const expectedBuybackWithoutFee = expectedBuyback.mul(BigNumber.from(1e6).sub(1000)).div(1e6);
        await arthPool.buyBackARTHX(ETH, expectedBuybackWithoutFee);

        expect(await dai.balanceOf(owner.address))
          .to.eq(daiBalanceBefore.add(expectedBuybackWithoutFee));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolsDaiBalanceBefore.sub(expectedBuybackWithoutFee));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.sub(ETH));

        expect(await arthx.totalSupply())
          .to.eq(totalSupplyBefore.sub(ETH));
      });

      it(' - Should buyback properly when DAI/USD < 1 & USD/GMU = 1 & ARTHX/GMU = 1', async () => {
        await arthController.connect(timelock).toggleBuyBack();
        await dai.transfer(arthPool.address, await dai.balanceOf(owner.address));

        const daiBalanceBefore = await dai.balanceOf(owner.address);
        const poolsDaiBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const totalSupplyBefore = await arthx.totalSupply();

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);
        const expectedBuyback = ETH.mul(1e6).div(0.94e6);
        const expectedBuybackWithoutFee = expectedBuyback.mul(BigNumber.from(1e6).sub(1000)).div(1e6);
        await arthPool.buyBackARTHX(ETH, expectedBuybackWithoutFee);

        expect(await dai.balanceOf(owner.address))
          .to.eq(daiBalanceBefore.add(expectedBuybackWithoutFee));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolsDaiBalanceBefore.sub(expectedBuybackWithoutFee));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.sub(ETH));

        expect(await arthx.totalSupply())
          .to.eq(totalSupplyBefore.sub(ETH));
      });

      it(' - Should buyback properly when DAI/USD < 1 & USD/GMU > 1 & ARTHX/GMU = 1', async () => {
        await arthController.connect(timelock).toggleBuyBack();
        await dai.transfer(arthPool.address, await dai.balanceOf(owner.address));

        const daiBalanceBefore = await dai.balanceOf(owner.address);
        const poolsDaiBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const totalSupplyBefore = await arthx.totalSupply();

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);
        await gmuOracle.setPrice(1.06e6);
        const oraclePrice = BigNumber.from(1.06e6).mul(0.94e6).div(1e6);
        const expectedBuyback = ETH.mul(1e6).div(oraclePrice);
        const expectedBuybackWithoutFee = expectedBuyback.mul(BigNumber.from(1e6).sub(1000)).div(1e6);
        await arthPool.buyBackARTHX(ETH, expectedBuybackWithoutFee);

        expect(await dai.balanceOf(owner.address))
          .to.eq(daiBalanceBefore.add(expectedBuybackWithoutFee));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolsDaiBalanceBefore.sub(expectedBuybackWithoutFee));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.sub(ETH));

        expect(await arthx.totalSupply())
          .to.eq(totalSupplyBefore.sub(ETH));
      });

      it(' - Should buyback properly when DAI/USD < 1 & USD/GMU < 1 & ARTHX/GMU = 1', async () => {
        await arthController.connect(timelock).toggleBuyBack();
        await dai.transfer(arthPool.address, await dai.balanceOf(owner.address));

        const daiBalanceBefore = await dai.balanceOf(owner.address);
        const poolsDaiBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const totalSupplyBefore = await arthx.totalSupply();

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);
        await gmuOracle.setPrice(0.94e6);
        const oraclePrice = BigNumber.from(0.94e6).mul(0.94e6).div(1e6);
        const expectedBuyback = ETH.mul(1e6).div(oraclePrice);
        const expectedBuybackWithoutFee = expectedBuyback.mul(BigNumber.from(1e6).sub(1000)).div(1e6);
        await arthPool.buyBackARTHX(ETH, expectedBuybackWithoutFee);

        expect(await dai.balanceOf(owner.address))
          .to.eq(daiBalanceBefore.add(expectedBuybackWithoutFee));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolsDaiBalanceBefore.sub(expectedBuybackWithoutFee));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.sub(ETH));

        expect(await arthx.totalSupply())
          .to.eq(totalSupplyBefore.sub(ETH));
      });
    });
  });
});
