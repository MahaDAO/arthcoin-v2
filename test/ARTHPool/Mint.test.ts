import { ethers } from 'hardhat';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { JsonRpcProvider } from '@ethersproject/providers';
import { BigNumber, Contract, ContractFactory, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import deploy from './Deployments';
import { advanceBlock, advanceTimeAndBlock } from '../utilities';

chai.use(solidity);

describe('ARTHPool Mint', () => {
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
  });

  describe('- Mint', async () => {
    beforeEach(' - Approve DAI', async () => {
      // Set higher approval for cases with different prices.
      await dai.approve(arthPool.address, ETH.mul(20));
      await advanceTimeAndBlock(provider, 7 * 24 * 60 * 60);
    });

    it(' - Should not mint when CR = 0 || CR = 1', async () => {
      await arthController.setGlobalCollateralRatio(0);

      await expect(arthPool.mint(ETH, ETH, 0))
        .to.revertedWith('ARHTPool: Collateral ratio < MIN');

      await arthController.setGlobalCollateralRatio(2.1e6);
      await expect(arthPool.mint(ETH, ETH, 0))
        .to.revertedWith('ARHTPool: Collateral ratio > MAX');
    });

    it(' - Should not mint when collateral > ceiling', async () => {
      await dai.transfer(arthPool.address, ETH.mul(2));
      await arthController.setGlobalCollateralRatio(11e5);

      await expect(arthPool.mint(ETH, ETH, 0))
        .to.revertedWith('ARTHPool: ceiling reached');

      await expect(arthPool.mint(ETH, ETH, ETH))
        .to.revertedWith('ARTHPool: ceiling reached');
    });

    it(' - Should not mint when expected > minted', async () => {
      await arthController.setGlobalCollateralRatio(11e5);

      const arthxPrice = await arthController.getARTHXPrice();
      const expectedARTHXOutMin = ETH.mul(10).div(100).mul(1e6).div(arthxPrice);

      // Some portion of minted is taken as fee hence slippage.
      await expect(arthPool.mint(ETH, ETH.mul(90).div(100), ETH.mul(10).div(100)))
        .to.revertedWith('ARTHPool: ARTH Slippage limit reached');

      // Some portion of minted is taken as fee hence slippage.
      await expect(arthPool.mint(ETH, ETH, ETH.mul(10).div(100)))
        .to.revertedWith('ARTHPool: ARTH Slippage limit reached');

      await expect(arthPool.mint(ETH, ETH.mul(70).div(100), expectedARTHXOutMin.add(1)))
        .to.revertedWith('ARTHPool: ARTHX Slippage limit reached');

      await expect(arthPool.mint(ETH, ETH.mul(89).div(100), expectedARTHXOutMin.add(1)))
        .to.revertedWith('ARTHPool: ARTHX Slippage limit reached');
    });

    describe(' - Using collateral chainlink oracle', async () => {
      it('  - Should mint properly when DAI/USD > 1', async () => {
        await arthController.setGlobalCollateralRatio(11e5);
        const arthxPrice = await arthController.getARTHXPrice();

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        const collateralValue = ETH.mul(1.06e6).div(1e6);
        const expectedARTHMint = collateralValue.mul(90).div(100);
        const expectedARTHMintAfterFee = expectedARTHMint.mul(BigNumber.from(1e6).sub(await arthController.getMintingFee())).div(1e6);
        const expectedARTHXMint = collateralValue.mul(10).div(100).mul(1e6).div(arthxPrice);
        await arthPool.mint(ETH, expectedARTHMintAfterFee, expectedARTHXMint);

        expect(await arth.totalSupply())
          .to.eq(totalSupplyBefore.add(expectedARTHMintAfterFee));

        expect(await arth.balanceOf(owner.address))
          .to.eq(arthBalanceBefore.add(expectedARTHMintAfterFee));

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedARTHXMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedARTHXMint));
      });

      it('  - Should mint properly when DAI/USD > 1 & USD/GMU > 1', async () => {
        await arthController.setGlobalCollateralRatio(11e5);
        const arthxPrice = await arthController.getARTHXPrice();

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        await gmuOracle.setPrice(1.06e6);

        const collateralValue = ETH.mul(1.06e6).mul(1.06e6).div(1e6).div(1e6);
        const expectedARTHMint = collateralValue.mul(90).div(100);
        const expectedARTHMintAfterFee = expectedARTHMint.mul(BigNumber.from(1e6).sub(await arthController.getMintingFee())).div(1e6);
        const expectedARTHXMint = collateralValue.mul(10).div(100).mul(1e6).div(arthxPrice);
        await arthPool.mint(ETH, expectedARTHMintAfterFee, expectedARTHXMint);

        expect(await arth.totalSupply())
          .to.eq(totalSupplyBefore.add(expectedARTHMintAfterFee));

        expect(await arth.balanceOf(owner.address))
          .to.eq(arthBalanceBefore.add(expectedARTHMintAfterFee));

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedARTHXMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedARTHXMint));
      });

      it('  - Should mint properly when DAI/USD > 1 & USD/GMU < 1', async () => {
        await arthController.setGlobalCollateralRatio(11e5);
        const arthxPrice = await arthController.getARTHXPrice();

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        await gmuOracle.setPrice(0.94e6);
        const collateralValue = ETH.mul(1.06e6).mul(0.94e6).div(1e6).div(1e6);
        const expectedARTHMint = collateralValue.mul(90).div(100);
        const expectedARTHMintAfterFee = expectedARTHMint.mul(BigNumber.from(1e6).sub(await arthController.getMintingFee())).div(1e6);
        const expectedARTHXMint = collateralValue.mul(10).div(100).mul(1e6).div(arthxPrice);
        await arthPool.mint(ETH, expectedARTHMintAfterFee, expectedARTHXMint);

        expect(await arth.totalSupply())
          .to.eq(totalSupplyBefore.add(expectedARTHMintAfterFee));

        expect(await arth.balanceOf(owner.address))
          .to.eq(arthBalanceBefore.add(expectedARTHMintAfterFee));

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedARTHXMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedARTHXMint));
      });

      it('  - Should mint properly when DAI/USD < 1', async () => {
        await arthController.setGlobalCollateralRatio(11e5);
        const arthxPrice = await arthController.getARTHXPrice();

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);
        const collateralValue = ETH.mul(0.94e6).div(1e6);
        const expectedARTHMint = collateralValue.mul(90).div(100);
        const expectedARTHMintAfterFee = expectedARTHMint.mul(BigNumber.from(1e6).sub(await arthController.getMintingFee())).div(1e6);
        const expectedARTHXMint = collateralValue.mul(10).div(100).mul(1e6).div(arthxPrice);
        await arthPool.mint(ETH, expectedARTHMintAfterFee, expectedARTHXMint);

        expect(await arth.totalSupply())
          .to.eq(totalSupplyBefore.add(expectedARTHMintAfterFee));

        expect(await arth.balanceOf(owner.address))
          .to.eq(arthBalanceBefore.add(expectedARTHMintAfterFee));

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedARTHXMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedARTHXMint));
      });

      it('  - Should mint properly when DAI/USD < 1 & USD/GMU > 1', async () => {
        await arthController.setGlobalCollateralRatio(11e5);
        const arthxPrice = await arthController.getARTHXPrice();

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);
        await gmuOracle.setPrice(1.06e6);
        const collateralValue = ETH.mul(0.94e6).mul(1.06e6).div(1e6).div(1e6);
        const expectedARTHMint = collateralValue.mul(90).div(100);
        const expectedARTHMintAfterFee = expectedARTHMint.mul(BigNumber.from(1e6).sub(await arthController.getMintingFee())).div(1e6);
        const expectedARTHXMint = collateralValue.mul(10).div(100).mul(1e6).div(arthxPrice);
        await arthPool.mint(ETH, expectedARTHMintAfterFee, expectedARTHXMint);

        expect(await arth.totalSupply())
          .to.eq(totalSupplyBefore.add(expectedARTHMintAfterFee));

        expect(await arth.balanceOf(owner.address))
          .to.eq(arthBalanceBefore.add(expectedARTHMintAfterFee));

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedARTHXMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedARTHXMint));
      });

      it('  - Should mint properly when DAI/USD < 1 & USD/GMU < 1', async () => {
        await arthController.setGlobalCollateralRatio(11e5);
        const arthxPrice = await arthController.getARTHXPrice();

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);
        await gmuOracle.setPrice(0.96e6);
        const collateralValue = ETH.mul(0.94e6).mul(0.96e6).div(1e6).div(1e6);
        const expectedARTHMint = collateralValue.mul(90).div(100);
        const expectedARTHMintAfterFee = expectedARTHMint.mul(BigNumber.from(1e6).sub(await arthController.getMintingFee())).div(1e6);
        const expectedARTHXMint = collateralValue.mul(10).div(100).mul(1e6).div(arthxPrice);
        await arthPool.mint(ETH, expectedARTHMintAfterFee, expectedARTHXMint);

        expect(await arth.totalSupply())
          .to.eq(totalSupplyBefore.add(expectedARTHMintAfterFee));

        expect(await arth.balanceOf(owner.address))
          .to.eq(arthBalanceBefore.add(expectedARTHMintAfterFee));

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedARTHXMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedARTHXMint));
      });

      it('  - Should mint properly when DAI/USD = 1', async () => {
        await arthController.setGlobalCollateralRatio(11e5);
        const arthxPrice = await arthController.getARTHXPrice();

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const expectedARTHMint = ETH.mul(90).div(100);
        const expectedARTHMintAfterFee = expectedARTHMint.mul(BigNumber.from(1e6).sub(await arthController.getMintingFee())).div(1e6);
        const expectedARTHXMint = ETH.mul(10).div(100).mul(1e6).div(arthxPrice);
        await arthPool.mint(ETH, expectedARTHMintAfterFee, expectedARTHXMint);

        expect(await arth.totalSupply())
          .to.eq(totalSupplyBefore.add(expectedARTHMintAfterFee));

        expect(await arth.balanceOf(owner.address))
          .to.eq(arthBalanceBefore.add(expectedARTHMintAfterFee));

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedARTHXMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedARTHXMint));
      });

      it('  - Should mint properly when DAI/USD = 1 & USD/GMU > 1', async () => {
        await arthController.setGlobalCollateralRatio(11e5);
        const arthxPrice = await arthController.getARTHXPrice();

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        await gmuOracle.setPrice(1.06e6);
        const collateralValue = ETH.mul(1.06e6).div(1e6);

        const expectedARTHMint = collateralValue.mul(90).div(100);
        const expectedARTHMintAfterFee = expectedARTHMint.mul(BigNumber.from(1e6).sub(await arthController.getMintingFee())).div(1e6);
        const expectedARTHXMint = collateralValue.mul(10).div(100).mul(1e6).div(arthxPrice);
        await arthPool.mint(ETH, expectedARTHMintAfterFee, expectedARTHXMint);

        expect(await arth.totalSupply())
          .to.eq(totalSupplyBefore.add(expectedARTHMintAfterFee));

        expect(await arth.balanceOf(owner.address))
          .to.eq(arthBalanceBefore.add(expectedARTHMintAfterFee));

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedARTHXMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedARTHXMint));
      });

      it('  - Should mint properly when DAI/USD = 1 & USD/GMU < 1', async () => {
        await arthController.setGlobalCollateralRatio(11e5);
        const arthxPrice = await arthController.getARTHXPrice();

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        await gmuOracle.setPrice(0.94e6);
        const collateralValue = ETH.mul(0.94e6).div(1e6);

        const expectedARTHMint = collateralValue.mul(90).div(100);
        const expectedARTHMintAfterFee = expectedARTHMint.mul(BigNumber.from(1e6).sub(await arthController.getMintingFee())).div(1e6);
        const expectedARTHXMint = collateralValue.mul(10).div(100).mul(1e6).div(arthxPrice);
        await arthPool.mint(ETH, expectedARTHMintAfterFee, expectedARTHXMint);

        expect(await arth.totalSupply())
          .to.eq(totalSupplyBefore.add(expectedARTHMintAfterFee));

        expect(await arth.balanceOf(owner.address))
          .to.eq(arthBalanceBefore.add(expectedARTHMintAfterFee));

        expect(await dai.balanceOf(owner.address))
          .to.eq(collateralBalanceBefore.sub(ETH));

        expect(await dai.balanceOf(arthPool.address))
          .to.eq(poolCollateralBalanceBefore.add(ETH));

        expect(await arthx.balanceOf(owner.address))
          .to.eq(arthxBalanceBefore.add(expectedARTHXMint));

        expect(await arthx.totalSupply())
          .to.eq(arthxTotalSupply.add(expectedARTHXMint));
      });
    });
  });
});
