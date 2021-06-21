import { ethers } from 'hardhat';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { JsonRpcProvider } from '@ethersproject/providers';
import { BigNumber, Contract, ContractFactory, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import deploy from './Deployments';
import { advanceBlock, advanceTimeAndBlock } from '../utilities';

chai.use(solidity);

describe('ARTHPool Redeem', () => {
  let attacker: SignerWithAddress;
  let timelock: SignerWithAddress;
  let owner: SignerWithAddress;
  let ETH: BigNumber;
  let provider: JsonRpcProvider;
  let dai: Contract;
  let arth: Contract;
  let arthx: Contract;
  let maha: Contract;
  let arthPool: Contract;
  let oracle: Contract;
  let arthController: Contract;
  let gmuOracle: Contract;
  let mahaARTHUniswapOracle: Contract;
  let arthxARTHUniswapOracle: Contract;
  let daiETHUniswapOracle: Contract;
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
    arthxARTHUniswapOracle = deployments.arthxARTHUniswapOracle;
    daiETHUniswapOracle = deployments.daiETHUniswapOracle;
    daiUSDMockChainlinkAggregatorV3 = deployments.daiUSDMockChainlinkAggregatorV3;
  });

  describe('- Redeem', async () => {
    beforeEach(' - Approve DAI & ARTHX', async () => {
      await arthx.approve(arthPool.address, ETH.mul(20));
      await arth.approve(arthPool.address, ETH.mul(20));
      await maha.approve(arthPool.address, ETH.mul(20));
      await advanceTimeAndBlock(provider, 7 * 24 * 60 * 60);
    });

    it(' - Should not mint when CR = 0 || CR = 1', async () => {
      await arthController.setGlobalCollateralRatio(0);

      await expect(arthPool.redeem(ETH, ETH, 0)).to.revertedWith('Collateral ratio < MIN');

      await arthController.setGlobalCollateralRatio(2.1e6);
      await expect(arthPool.redeem(ETH, ETH, 0)).to.revertedWith('Collateral ratio > MAX');
    });

    describe(' - Using collateral chainlink oracle', async () => {
      it(' - Should redeem properly when DAI/USD = 1 & USD/GMU = 1 & ARTHX/GMU = 1', async () => {
        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('111111111111111111');
        const expectedCollateral = BigNumber.from('1111111111111111111');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD = 1 & USD/GMU = 1 & ARTHX/GMU > 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(106).div(100));

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('104821802935010482');
        const expectedCollateral = BigNumber.from('1111111111111111111');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD = 1 & USD/GMU = 1 & ARTHX/GMU < 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(94).div(100));

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('118203309692671394');
        const expectedCollateral = BigNumber.from('1111111111111111111');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD = 1 & USD/GMU > 1 & ARTHX/GMU = 1', async () => {
        await gmuOracle.setPrice(1.06e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('111111111111111111');
        const expectedCollateral = BigNumber.from('1048218029350104821');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)) .to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD = 1 & USD/GMU > 1 & ARTHX/GMU > 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(106).div(100));
        await gmuOracle.setPrice(1.06e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('104821802935010482');
        const expectedCollateral = BigNumber.from('1048218029350104821');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD = 1 & USD/GMU > 1 & ARTHX/GMU < 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(94).div(100));
        await gmuOracle.setPrice(1.06e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('118203309692671394');
        const expectedCollateral = BigNumber.from('1048218029350104821');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD = 1 & USD/GMU < 1 & ARTHX/GMU = 1', async () => {
        await gmuOracle.setPrice(0.94e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('111111111111111111');
        const expectedCollateral = BigNumber.from('1182033096926713947');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD = 1 & USD/GMU < 1 & ARTHX/GMU > 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(106).div(100));
        await gmuOracle.setPrice(0.94e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('104821802935010482');
        const expectedCollateral = BigNumber.from('1182033096926713947');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD = 1 & USD/GMU < 1 & ARTHX/GMU < 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(94).div(100));
        await gmuOracle.setPrice(0.94e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('118203309692671394');
        const expectedCollateral = BigNumber.from('1182033096926713947');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD > 1 & USD/GMU = 1 & ARTHX/GMU = 1', async () => {
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        await gmuOracle.setPrice(1e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('111111111111111111');
        const expectedCollateral = BigNumber.from('1048218029350104821');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD > 1 & USD/GMU = 1 & ARTHX/GMU > 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(106).div(100));
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        await gmuOracle.setPrice(1e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('104821802935010482');
        const expectedCollateral = BigNumber.from('1048218029350104821');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD > 1 & USD/GMU = 1 & ARTHX/GMU < 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(94).div(100));
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        await gmuOracle.setPrice(1e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('118203309692671394');
        const expectedCollateral = BigNumber.from('1048218029350104821');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD > 1 & USD/GMU > 1 & ARTHX/GMU = 1', async () => {
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        await gmuOracle.setPrice(1.06e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('111111111111111111');
        const expectedCollateral = BigNumber.from('988884933349155492');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD > 1 & USD/GMU > 1 & ARTHX/GMU > 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(106).div(100));
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        await gmuOracle.setPrice(1.06e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('104821802935010482');
        const expectedCollateral = BigNumber.from('988884933349155492');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD > 1 & USD/GMU > 1 & ARTHX/GMU < 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(94).div(100));
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        await gmuOracle.setPrice(1.06e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('118203309692671394');
        const expectedCollateral = BigNumber.from('988884933349155492');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD > 1 & USD/GMU < 1 & ARTHX/GMU = 1', async () => {
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        await gmuOracle.setPrice(0.94e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('111111111111111111');
        const expectedCollateral = BigNumber.from('1115125563138409384');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD > 1 & USD/GMU < 1 & ARTHX/GMU > 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(106).div(100));
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        await gmuOracle.setPrice(0.94e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('104821802935010482');
        const expectedCollateral = BigNumber.from('1115125563138409384');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD > 1 & USD/GMU < 1 & ARTHX/GMU < 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(94).div(100));
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(1.06e8);
        await gmuOracle.setPrice(0.94e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('118203309692671394');
        const expectedCollateral = BigNumber.from('1115125563138409384');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD < 1 & USD/GMU = 1 & ARTHX/GMU = 1', async () => {
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('111111111111111111');
        const expectedCollateral = BigNumber.from('1182033096926713947');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD < 1 & USD/GMU = 1 & ARTHX/GMU > 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(106).div(100));
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('104821802935010482');
        const expectedCollateral = BigNumber.from('1182033096926713947');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD < 1 & USD/GMU = 1 & ARTHX/GMU < 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(94).div(100));
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('118203309692671394');
        const expectedCollateral = BigNumber.from('1182033096926713947');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD < 1 & USD/GMU > 1 & ARTHX/GMU = 1', async () => {
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);
        await gmuOracle.setPrice(1.06e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('111111111111111111');
        const expectedCollateral = BigNumber.from('1115125563138409384');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD < 1 & USD/GMU > 1 & ARTHX/GMU > 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(106).div(100));
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);
        await gmuOracle.setPrice(1.06e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('104821802935010482');
        const expectedCollateral = BigNumber.from('1115125563138409384');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD < 1 & USD/GMU > 1 & ARTHX/GMU < 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(94).div(100));
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);
        await gmuOracle.setPrice(1.06e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('118203309692671394');
        const expectedCollateral = BigNumber.from('1115125563138409384');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD < 1 & USD/GMU < 1 & ARTHX/GMU = 1', async () => {
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);
        await gmuOracle.setPrice(0.94e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('111111111111111111');
        const expectedCollateral = BigNumber.from('1257482018007142497');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)) .to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD < 1 & USD/GMU < 1 & ARTHX/GMU > 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(106).div(100));
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);
        await gmuOracle.setPrice(0.94e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('104821802935010482');
        const expectedCollateral = BigNumber.from('1257482018007142497');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });

      it(' - Should redeem properly when DAI/USD < 1 & USD/GMU < 1 & ARTHX/GMU < 1', async () => {
        await arthxARTHUniswapOracle.setPrice(ETH.mul(94).div(100));
        await daiUSDMockChainlinkAggregatorV3.setLatestPrice(0.94e8);
        await gmuOracle.setPrice(0.94e6);

        await dai.transfer(arthPool.address, ETH.mul(1000));

        const totalSupplyBefore = await arth.totalSupply();
        const arthBalanceBefore = await arth.balanceOf(owner.address);

        const arthxTotalSupply = await arthx.totalSupply();
        const arthxBalanceBefore = await arthx.balanceOf(owner.address);

        const collateralBalanceBefore = await dai.balanceOf(owner.address);
        const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

        const neededARTHX = BigNumber.from('118203309692671394');
        const expectedCollateral = BigNumber.from('1257482018007142497');
        const expectedCollateralWithoutFee = expectedCollateral.mul(BigNumber.from(1e6).sub(1000)).div(1e6);

        await arthPool.redeem(ETH, neededARTHX, expectedCollateralWithoutFee);

        expect(await arth.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
        expect(await arth.balanceOf(owner.address)).to.eq(arthBalanceBefore.sub(ETH));
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore);
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore);
        expect(await arthx.balanceOf(owner.address)).to.eq(arthxBalanceBefore.sub(neededARTHX));
        expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(neededARTHX));

        await advanceBlock(provider);
        await advanceBlock(provider);

        await arthPool.collectRedemption();
        expect(await dai.balanceOf(owner.address)).to.eq(collateralBalanceBefore.add(expectedCollateralWithoutFee));
        expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBefore.sub(expectedCollateralWithoutFee));
      });
    });
  });
});
