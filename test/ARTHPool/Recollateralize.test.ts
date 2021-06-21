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
  let recollaterizationCurve: Contract;

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
    recollaterizationCurve = deployments.recollaterizationCurve;
    daiETHUniswapOracle = deployments.daiETHUniswapOracle;
    arthxARTHUniswapOracle = deployments.arthxARTHUniswapOracle;
    ethUSDMockChainlinkAggregatorV3 = deployments.ethUSDMockChainlinkAggregatorV3;
    daiUSDMockChainlinkAggregatorV3 = deployments.daiUSDMockChainlinkAggregatorV3;
  });

  describe('- Recollateralize ARTH', async () => {
    beforeEach(' - Approve collateral', async () => {
      await dai.approve(arthPool.address, ETH);
      await advanceTimeAndBlock(provider, 7 * 24 * 60 * 60);
      await arthController.connect(timelock).toggleRecollateralize();
    });

    it(' - Should not recollateralize when paused', async () => {
      await arthController.connect(timelock).toggleRecollateralize();

      await expect(arthPool.recollateralizeARTH(ETH, 0))
        .to.revertedWith('Recollateralize is paused');

      await expect(arthPool.recollateralizeARTH(ETH, ETH))
        .to.revertedWith('Recollateralize is paused');
    });

    it(' - Should not recollateralize when expected ARTHX > to be minted', async () => {
      await expect(arthPool.recollateralizeARTH(ETH, ETH.mul(3)))
        .to.revertedWith('Slippage limit reached');
    });

    describe(' - Using chainlink oracle', () => {
      it(' - Should recollaterize properly when DAI/USD = 1 & USD/GMU = 1 & ARTHX/GMU = 1', async () => {
        await dai.transfer(arthPool.address, ETH); // Ensuring that pool has some collateral.

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const arthxTotalSupply = await arthx.totalSupply();

        const expectedMint = ETH.mul(BigNumber.from(1e6).add(300000)).div(1e6);
        await arthPool.connect(owner).recollateralizeARTH(ETH, expectedMint);

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedMint));
      });

      it(' - Should recollaterize properly when DAI/USD = 1 & USD/GMU > 1 & ARTHX/GMU = 1', async () => {
        await dai.transfer(arthPool.address, ETH); // Ensuring that pool has some collateral.

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const arthxTotalSupply = await arthx.totalSupply();

        await gmuOracle.setPrice(1.06e6);
        const collateralValue = ETH.mul(1.06e6).div(1e6);
        const expectedMint = collateralValue.mul(BigNumber.from(1e6).add(300000)).div(1e6);
        await arthPool.recollateralizeARTH(ETH, expectedMint);

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedMint));
      });

      it(' - Should recollaterize properly when DAI/USD = 1 & USD/GMU < 1 & ARTHX/GMU = 1', async () => {
        await dai.transfer(arthPool.address, ETH); // Ensuring that pool has some collateral.

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const arthxTotalSupply = await arthx.totalSupply();

        await gmuOracle.setPrice(0.94e6);
        const collateralValue = ETH.mul(0.94e6).div(1e6);
        const expectedMint = collateralValue.mul(BigNumber.from(1e6).add(300000)).div(1e6);
        await arthPool.recollateralizeARTH(ETH, expectedMint);

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedMint));
      });

      it(' - Should recollaterize properly when DAI/USD > 1 & USD/GMU = 1 & ARTHX/GMU = 1', async () => {
        await dai.transfer(arthPool.address, ETH); // Ensuring that pool has some collateral.

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const arthxTotalSupply = await arthx.totalSupply();

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        const collateralValue = ETH.mul(1.06e6).div(1e6);
        const expectedMint = collateralValue.mul(BigNumber.from(1e6).add(300000)).div(1e6);
        await arthPool.recollateralizeARTH(ETH, expectedMint);

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedMint));
      });

      it(' - Should recollaterize properly when DAI/USD > 1 & USD/GMU > 1 & ARTHX/GMU = 1', async () => {
        await dai.transfer(arthPool.address, ETH); // Ensuring that pool has some collateral.

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const arthxTotalSupply = await arthx.totalSupply();

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        await gmuOracle.setPrice(1.06e6);
        const oraclePrice = BigNumber.from(1.06e6).mul(1.06e6).div(1e6);
        const collateralValue = ETH.mul(oraclePrice).div(1e6);
        const expectedMint = collateralValue.mul(BigNumber.from(1e6).add(300000)).div(1e6);
        await arthPool.recollateralizeARTH(ETH, expectedMint);

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedMint));
      });

      it(' - Should recollaterize properly when DAI/USD > 1 & USD/GMU < 1 & ARTHX/GMU = 1', async () => {
        await dai.transfer(arthPool.address, ETH); // Ensuring that pool has some collateral.

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const arthxTotalSupply = await arthx.totalSupply();

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        await gmuOracle.setPrice(0.94e6);
        const oraclePrice = BigNumber.from(1.06e6).mul(0.94e6).div(1e6);
        const collateralValue = ETH.mul(oraclePrice).div(1e6);
        const expectedMint = collateralValue.mul(BigNumber.from(1e6).add(300000)).div(1e6);
        await arthPool.recollateralizeARTH(ETH, expectedMint);

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedMint));
      });

      it(' - Should recollaterize properly when DAI/USD < 1 & USD/GMU = 1 & ARTHX/GMU = 1', async () => {
        await dai.transfer(arthPool.address, ETH); // Ensuring that pool has some collateral.

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const arthxTotalSupply = await arthx.totalSupply();

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);
        const collateralValue = ETH.mul(0.94e6).div(1e6);
        const expectedMint = collateralValue.mul(BigNumber.from(1e6).add(300000)).div(1e6);
        await arthPool.recollateralizeARTH(ETH, expectedMint);

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedMint));
      });

      it(' - Should recollaterize properly when DAI/USD < 1 & USD/GMU > 1 & ARTHX/GMU = 1', async () => {
        await dai.transfer(arthPool.address, ETH); // Ensuring that pool has some collateral.

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const arthxTotalSupply = await arthx.totalSupply();

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);
        await gmuOracle.setPrice(1.06e6);
        const oraclePrice = BigNumber.from(0.94e6).mul(1.06e6).div(1e6);
        const collateralValue = ETH.mul(oraclePrice).div(1e6);
        const expectedMint = collateralValue.mul(BigNumber.from(1e6).add(300000)).div(1e6);
        await arthPool.recollateralizeARTH(ETH, expectedMint);

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedMint));
      });

      it(' - Should recollaterize properly when DAI/USD < 1 & USD/GMU < 1 & ARTHX/GMU = 1', async () => {
        await dai.transfer(arthPool.address, ETH); // Ensuring that pool has some collateral.

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const arthxBalanceBefore = await arthx.balanceOf(owner.address);
        const arthxTotalSupply = await arthx.totalSupply();

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);
        await gmuOracle.setPrice(0.94e6);
        const oraclePrice = BigNumber.from(0.94e6).mul(0.94e6).div(1e6);
        const collateralValue = ETH.mul(oraclePrice).div(1e6);
        const expectedMint = collateralValue.mul(BigNumber.from(1e6).add(300000)).div(1e6);
        await arthPool.recollateralizeARTH(ETH, expectedMint);

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedMint));
      });
    });
  });
});
