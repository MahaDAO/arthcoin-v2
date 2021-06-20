import { ethers } from 'hardhat';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { BigNumber, Contract, ContractFactory, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import { advanceBlock, advanceTimeAndBlock } from './utilities';

chai.use(solidity);

describe('ARTHPool', () => {
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
  let BondingCurve: ContractFactory;
  let SimpleOracle: ContractFactory;
  let MockCollateral: ContractFactory;
  let ARTHController: ContractFactory;
  let ARTHPoolLibrary: ContractFactory;
  let MockUniswapOracle: ContractFactory;
  let ChainlinkETHGMUOracle: ContractFactory;
  let RecollateralizationCurve: ContractFactory;
  let MockChainlinkAggregatorV3: ContractFactory;

  let dai: Contract;
  let arth: Contract;
  let maha: Contract;
  let arthx: Contract;
  let oracle: Contract;
  let arthPool: Contract;
  let gmuOracle: Contract;
  let bondingCurve: Contract;
  let arthController: Contract;
  let arthPoolLibrary: Contract;
  let daiChainlinkOracle: Contract;
  let daiETHUniswapOracle: Contract;
  let arthETHUniswapOracle: Contract;
  let mahaARTHUniswapOracle: Contract;
  let chainlinkETHGMUOracle: Contract;
  let arthxETHUniswapOracle: Contract;
  let recollaterizationCurve: Contract;
  let mockChainlinkAggregatorV3: Contract;
  let daiUSDMockChainlinkAggregatorV3: Contract;

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
        ArthPoolLibrary: arthPoolLibrary.address,
      },
    });

    Oracle = await ethers.getContractFactory('Oracle');
    SimpleOracle = await ethers.getContractFactory('SimpleOracle');
    ARTHController = await ethers.getContractFactory('ArthController');

    BondingCurve = await ethers.getContractFactory('BondingCurve');

    MockUniswapOracle = await ethers.getContractFactory(
      'MockUniswapPairOracle'
    );

    RecollateralizationCurve = await ethers.getContractFactory(
      'MockRecollateralizeCurve'
    );

    ChainlinkETHGMUOracle = await ethers.getContractFactory(
      'ChainlinkETHUSDPriceConsumer'
    );

    MockChainlinkAggregatorV3 = await ethers.getContractFactory(
      'MockChainlinkAggregatorV3'
    );
  });

  beforeEach(' - Deploy contracts', async () => {
    arth = await ARTH.deploy();
    maha = await MAHA.deploy();
    dai = await MockCollateral.deploy(owner.address, ETH.mul(10000), 'DAI', 18);

    bondingCurve = await BondingCurve.deploy(1e6);
    gmuOracle = await SimpleOracle.deploy('GMU/USD', ETH.div(1e12));
    daiETHUniswapOracle = await MockUniswapOracle.deploy();
    arthETHUniswapOracle = await MockUniswapOracle.deploy();
    arthxETHUniswapOracle = await MockUniswapOracle.deploy();
    mahaARTHUniswapOracle = await MockUniswapOracle.deploy();

    mockChainlinkAggregatorV3 = await MockChainlinkAggregatorV3.deploy();
    daiUSDMockChainlinkAggregatorV3 = await MockChainlinkAggregatorV3.deploy();

    daiChainlinkOracle = await ChainlinkETHGMUOracle.deploy(
      daiUSDMockChainlinkAggregatorV3.address,
      gmuOracle.address
    );

    chainlinkETHGMUOracle = await ChainlinkETHGMUOracle.deploy(
      mockChainlinkAggregatorV3.address,
      gmuOracle.address
    );

    arthx = await ARTHX.deploy(
      arthxETHUniswapOracle.address,
      owner.address,
      owner.address
    );

    arthPoolLibrary = await ARTHPoolLibrary.deploy();
    arthController = await ARTHController.deploy(
      arth.address,
      owner.address,
      timelock.address
    );

    arthPool = await ARTHPool.deploy(
      arth.address,
      arthx.address,
      dai.address,
      owner.address,
      timelock.address,
      maha.address,
      arthController.address,
      ETH.mul(90000)
    );

    arthController.setBondingCurve(bondingCurve.address);

    oracle = await Oracle.deploy(
      dai.address,
      owner.address, // Temp address for weth in mock oracles.
      daiETHUniswapOracle.address,
      '0x0000000000000000000000000000000000000000', // daiChainlinkOracle.address,
      chainlinkETHGMUOracle.address
    );

    recollaterizationCurve = await RecollateralizationCurve.deploy();
  });

  beforeEach(' - Set some contract variables', async () => {
    await arthController.setETHGMUOracle(chainlinkETHGMUOracle.address);
    await arthx.setARTHAddress(arth.address);
    await arth.addPool(arthPool.address);
    await arthController.addPool(arthPool.address);
    await arthController.setGlobalCollateralRatio(0);
    await arthx.setArthController(arthController.address);
    await arthPool.setCollatGMUOracle(oracle.address);

    await arthController.setARTHGMUOracle(
      arthETHUniswapOracle.address,
      owner.address
    );

    await arthController.setARTHXGMUOracle(
      arthxETHUniswapOracle.address,
      owner.address
    );

    await arthController.setMAHAGMUOracle(mahaARTHUniswapOracle.address);

    await arthController.setFeesParameters(1000, 1000, 1000);

    await arthPool.setPoolParameters(ETH.mul(2), 1);
    await mockChainlinkAggregatorV3.setLatestPrice(ETH.div(1e10)); // Keep the price of mock chainlink oracle as 1e8 for simplicity sake.
    await arthController.setRecollateralizationCurve(
      recollaterizationCurve.address
    );
  });

  describe('- Some access restricted functions', async () => {
    it(' - Should not work if not (owner || governance)', async () => {
      await expect(
        arthPool.connect(attacker).setCollatGMUOracle(oracle.address)
      ).to.revertedWith(
        'ArthPool: You are not the owner or the governance timelock'
      );

      await expect(
        arthPool.connect(attacker).setTimelock(timelock.address)
      ).to.revertedWith(
        'ArthPool: You are not the owner or the governance timelock'
      );

      await expect(
        arthPool.connect(attacker).setOwner(owner.address)
      ).to.revertedWith(
        'ArthPool: You are not the owner or the governance timelock'
      );

      await expect(
        arthPool.connect(attacker).setPoolParameters(ETH.mul(2), 1)
      ).to.revertedWith(
        'ArthPool: You are not the owner or the governance timelock'
      );
    });

    it(' - Should work if (owner || governance)', async () => {
      await expect(arthPool.connect(owner).setCollatGMUOracle(oracle.address))
        .to.not.reverted;

      await expect(
        arthPool.connect(timelock).setCollatGMUOracle(oracle.address)
      ).to.not.reverted;

      await expect(arthPool.connect(owner).setTimelock(timelock.address)).to.not
        .reverted;

      await expect(arthPool.connect(owner).setOwner(owner.address)).to.not
        .reverted;

      await expect(arthPool.connect(owner).setPoolParameters(ETH.mul(2), 1)).to
        .not.reverted;

      await expect(arthPool.connect(timelock).setTimelock(timelock.address)).to
        .not.reverted;

      await expect(arthPool.connect(timelock).setOwner(owner.address)).to.not
        .reverted;

      await expect(arthPool.connect(timelock).setPoolParameters(ETH.mul(2), 1))
        .to.not.reverted;
    });

    it(' - Should not work if not (owner || admin || governance)', async () => {
      await expect(
        arthPool.connect(attacker).setBuyBackCollateralBuffer(10)
      ).to.revertedWith('ArthPool: forbidden');

      await expect(
        arthPool.connect(attacker).setARTHController(arthController.address)
      ).to.revertedWith('ArthPool: forbidden');
    });

    it(' - Should work if not (owner || admin || governance)', async () => {
      await expect(arthPool.connect(owner).setBuyBackCollateralBuffer(10)).to
        .not.reverted;

      await expect(
        arthPool.connect(owner).setARTHController(arthController.address)
      ).to.not.reverted;

      await expect(arthPool.connect(timelock).setBuyBackCollateralBuffer(10)).to
        .not.reverted;

      await expect(
        arthPool.connect(timelock).setARTHController(arthController.address)
      ).to.not.reverted;
    });
  });

  describe('- Getters', async () => {
    it(' - Should get global collateral ratio properly', async () => {
      await arthController.setGlobalCollateralRatio(1e6);
      expect(await arthPool.getGlobalCR()).to.eq(1e6);

      await arthController.setGlobalCollateralRatio(1e3);
      expect(await arthPool.getGlobalCR()).to.eq(1e3);
    });

    it(' - Should get collateral price properly using uniswap oracle', async () => {
      expect(await arthPool.getCollateralPrice()).to.eq(1e6);

      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(1063829);

      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(943396);

      await gmuOracle.setPrice(1e6);
      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      await mockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.getCollateralPrice()).to.eq(2340425531); // 2340423800); // Since we divide by weth price in this ecosystem.

      await gmuOracle.setPrice(1e3);
      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      await mockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.getCollateralPrice()).to.eq(2340425); // Since we divide by weth price in this ecosystem.

      await gmuOracle.setPrice(1e6);
      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      await mockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.getCollateralPrice()).to.eq(2075471698); // 2075471200); // Since we divide by weth price in this ecosystem.

      await gmuOracle.setPrice(1e3);
      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      await mockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.getCollateralPrice()).to.eq(2075471); // Since we divide by weth price in this ecosystem.
    });

    // it(' - Should get collateral price properly using chainlink oracle', async () => {
    //   expect(await arthPool.getCollateralPrice())
    //     .to
    //     .eq(1e6);

    //   await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
    //   expect(await arthPool.getCollateralPrice())
    //     .to
    //     .eq(1063829);

    //   await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
    //   expect(await arthPool.getCollateralPrice())
    //     .to
    //     .eq(943396);

    //   await gmuOracle.setPrice(1e6);
    //   await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
    //   await mockChainlinkAggregatorV3.setLatestPrice(2200e8);
    //   expect(await arthPool.getCollateralPrice())
    //     .to
    //     .eq(2340425531) // 2340423800); // Since we divide by weth price in this ecosystem.

    //   await gmuOracle.setPrice(1e3);
    //   await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
    //   await mockChainlinkAggregatorV3.setLatestPrice(2200e8);
    //   expect(await arthPool.getCollateralPrice())
    //     .to
    //     .eq(2340425); // Since we divide by weth price in this ecosystem.

    //   await gmuOracle.setPrice(1e6);
    //   await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
    //   await mockChainlinkAggregatorV3.setLatestPrice(2200e8);
    //   expect(await arthPool.getCollateralPrice())
    //     .to
    //     .eq(2075471698); // 2075471200); // Since we divide by weth price in this ecosystem.

    //   await gmuOracle.setPrice(1e3);
    //   await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
    //   await mockChainlinkAggregatorV3.setLatestPrice(2200e8);
    //   expect(await arthPool.getCollateralPrice())
    //     .to
    //     .eq(2075471); // Since we divide by weth price in this ecosystem.
    // });

    it(' - Should get collateral balance properly using uniswap oracle', async () => {
      await oracle.setOracle('0x0000000000000000000000000000000000000000');

      expect(await arthPool.getCollateralGMUBalance()).to.eq(0);

      await dai.transfer(arthPool.address, ETH);

      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthPool.getCollateralGMUBalance()).to.eq(
        BigNumber.from('1063829000000000000')
      );

      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthPool.getCollateralGMUBalance()).to.eq(
        BigNumber.from('943396000000000000')
      );

      await gmuOracle.setPrice(1e6);
      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      await mockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.getCollateralGMUBalance()).to.eq(
        BigNumber.from('2340425531').mul(ETH).div(1e6)
      ); // Since we divide by weth price in this ecosystem.

      await gmuOracle.setPrice(1e3);
      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      await mockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.getCollateralGMUBalance()).to.eq(
        BigNumber.from('2340425').mul(ETH).div(1e6)
      ); // Since we divide by weth price in this ecosystem.

      await gmuOracle.setPrice(1e6);
      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      await mockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.getCollateralGMUBalance()).to.eq(
        BigNumber.from('2075471698').mul(ETH).div(1e6)
      ); // Since we divide by weth price in this ecosystem.

      await gmuOracle.setPrice(1e3);
      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      await mockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.getCollateralGMUBalance()).to.eq(
        BigNumber.from('2075471').mul(ETH).div(1e6)
      ); // Since we divide by weth price in this ecosystem.
    });

    it(' - Should estimate MAHA stability fee properly', async () => {
      expect(await arthPool.estimateStabilityFeeInMAHA(ETH)).to.eq(
        BigNumber.from('0')
      );
      await advanceTimeAndBlock(provider, 7 * 24 * 60 * 60);

      await mockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthPool.estimateStabilityFeeInMAHA(ETH)).to.eq(
        BigNumber.from('4545454545454')
      );

      await mahaARTHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthPool.estimateStabilityFeeInMAHA(ETH)).to.eq(
        BigNumber.from('4818181818444')
      );

      await mahaARTHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthPool.estimateStabilityFeeInMAHA(ETH)).to.eq(
        BigNumber.from('4272727274397')
      );
    });

    it(' - Should return Target collateral value properly', async () => {
      await arthController.connect(owner).setGlobalCollateralRatio(11e5);
      expect(await arthPool.getTargetCollateralValue()).to.eq(
        BigNumber.from('24310000000000000000000000')
      );

      await arthController.connect(owner).setGlobalCollateralRatio(12e5);
      expect(await arthPool.getTargetCollateralValue()).to.eq(
        BigNumber.from('26520000000000000000000000')
      );
    });
  });

  describe('- Mint Fractional ARTH', async () => {
    beforeEach(' - Approve DAI & ARTHX', async () => {
      // Set higher approval for cases with different prices.
      await dai.approve(arthPool.address, ETH.mul(20));
      await arthx.approve(arthPool.address, ETH.mul(20));
      await advanceTimeAndBlock(provider, 7 * 24 * 60 * 60);
    });

    it(' - Should not mint when CR = 0 || CR = 1', async () => {
      await arthController.setGlobalCollateralRatio(0);

      await expect(arthPool.mintFractionalARTH(ETH, ETH, 0)).to.revertedWith(
        'ARTHPool: fails (.000001 <= Collateral ratio <= .999999)'
      );

      await expect(arthPool.mintFractionalARTH(ETH, ETH, ETH)).to.revertedWith(
        'ARTHPool: fails (.000001 <= Collateral ratio <= .999999)'
      );

      await arthController.setGlobalCollateralRatio(1e6);

      await expect(arthPool.mintFractionalARTH(ETH, ETH, 0)).to.revertedWith(
        'ARTHPool: fails (.000001 <= Collateral ratio <= .999999)'
      );

      await expect(arthPool.mintFractionalARTH(ETH, ETH, ETH)).to.revertedWith(
        'ARTHPool: fails (.000001 <= Collateral ratio <= .999999)'
      );
    });

    it(' - Should not mint when collateral > ceiling', async () => {
      await dai.transfer(arthPool.address, ETH.mul(2));
      await arthController.setGlobalCollateralRatio(1e5);

      await expect(arthPool.mintFractionalARTH(ETH, ETH, 0)).to.revertedWith(
        'ARTHPool: ceiling reached.'
      );

      await expect(arthPool.mintFractionalARTH(ETH, ETH, ETH)).to.revertedWith(
        'ARTHPool: ceiling reached.'
      );
    });

    it(' - Should not mint when expected > minted', async () => {
      await arthController.setGlobalCollateralRatio(1e5);

      // Some portion of minted is taken as fee.
      await expect(
        arthPool.mintFractionalARTH(ETH, ETH.mul(9), ETH.mul(11))
      ).to.revertedWith('ARTHPool: Slippage limit reached');

      // Clear slippage.
      await expect(
        arthPool.mintFractionalARTH(ETH, ETH.mul(10), ETH.mul(11))
      ).to.revertedWith('ARTHPool: Slippage limit reached');
    });

    it(' - Should mint properly when all prices = 1', async () => {
      await arthController.setGlobalCollateralRatio(1e5);

      const totalSupplyBefore = await arth.totalSupply();
      const arthBalanceBefore = await arth.balanceOf(owner.address);

      const arthxTotalSupply = await arthx.totalSupply();
      const arthxBalanceBefore = await arthx.balanceOf(owner.address);

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const expectedMint = ETH.mul(10).sub(ETH.mul(10).div(1000)); // Since, Mint fee is 0.1 %.

      await arthPool.mintFractionalARTH(ETH, ETH.mul(9), expectedMint);

      expect(await arth.totalSupply()).to.eq(
        totalSupplyBefore.add(expectedMint)
      );

      expect(await arth.balanceOf(owner.address)).to.eq(
        arthBalanceBefore.add(expectedMint)
      );

      expect(await dai.balanceOf(owner.address)).to.eq(
        collateralBalanceBefore.sub(ETH)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolCollateralBalanceBefore.add(ETH)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.sub(ETH.mul(9))
      );

      expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(ETH.mul(9)));
    });

    it(' - Should mint properly when all DAI/ETH & ARTHX/ETH > 1 && DAI/ETH = ARTHX/ETH', async () => {
      await arthController.setGlobalCollateralRatio(1e5);

      // Decrease price of WETH as as to increase price of DAI.
      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(1063829);

      // Decrease price of WETH as as to increase price of ARTHX.
      await arthxETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(1063829);

      const totalSupplyBefore = await arth.totalSupply();
      const arthBalanceBefore = await arth.balanceOf(owner.address);

      const arthxTotalSupply = await arthx.totalSupply();
      const arthxBalanceBefore = await arthx.balanceOf(owner.address);

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const expectedMintWithoutFee = ETH.mul(1063829).div(1e6).mul(10); // Since 1 DAI & 9ARTHX & DAI price = ARTH price.
      const expectedMint = expectedMintWithoutFee.sub(
        expectedMintWithoutFee.div(1000)
      ); // Since, Mint fee is 0.1 %.

      await arthPool.mintFractionalARTH(ETH, ETH.mul(9), expectedMint);

      expect(await arth.totalSupply()).to.eq(
        totalSupplyBefore.add(expectedMint)
      );

      expect(await arth.balanceOf(owner.address)).to.eq(
        arthBalanceBefore.add(expectedMint)
      );

      expect(await dai.balanceOf(owner.address)).to.eq(
        collateralBalanceBefore.sub(ETH)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolCollateralBalanceBefore.add(ETH)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.sub(ETH.mul(9))
      );

      expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(ETH.mul(9)));
    });

    it(' - Should mint properly when all DAI/ETH > 1 & ARTHX/ETH < 1', async () => {
      await arthController.setGlobalCollateralRatio(1e5);

      // Decrease price of WETH as as to increase price of DAI.
      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(1063829);

      // Increase price of WETH as as to decrease price of ARTH.
      await arthxETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(943396);

      const totalSupplyBefore = await arth.totalSupply();
      const arthBalanceBefore = await arth.balanceOf(owner.address);

      const arthxTotalSupply = await arthx.totalSupply();
      const arthxBalanceBefore = await arthx.balanceOf(owner.address);

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const valueSuppliedInCollateral = ETH.mul(1063829).div(1e6);
      const valueToBeSuppliedInTotal = valueSuppliedInCollateral
        .mul(100)
        .div(10); // 10% CR.
      const valueToBeSuppliedInARTHX = valueToBeSuppliedInTotal.sub(
        valueSuppliedInCollateral
      ); // Hence need 90% ARTHX.
      const arthxToBeSupplied = valueToBeSuppliedInARTHX.mul(1e6).div(943396);

      const expectedMintWithoutFee = valueSuppliedInCollateral.add(
        valueToBeSuppliedInARTHX
      );
      const expectedMint = expectedMintWithoutFee.sub(
        expectedMintWithoutFee.div(1000)
      ); // Since, Mint fee is 0.1 %.

      await arthPool.mintFractionalARTH(ETH, arthxToBeSupplied, expectedMint);

      expect(await arth.totalSupply()).to.eq(
        totalSupplyBefore.add(expectedMint)
      );

      expect(await arth.balanceOf(owner.address)).to.eq(
        arthBalanceBefore.add(expectedMint)
      );

      expect(await dai.balanceOf(owner.address)).to.eq(
        collateralBalanceBefore.sub(ETH)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolCollateralBalanceBefore.add(ETH)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.sub(arthxToBeSupplied)
      );

      expect(await arthx.totalSupply()).to.eq(
        arthxTotalSupply.sub(arthxToBeSupplied)
      );
    });

    it(' - Should mint properly when all DAI/ETH < 1 & ARTHX/ETH > 1', async () => {
      await arthController.setGlobalCollateralRatio(1e5);

      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(943396);

      await arthxETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(1063829);

      const totalSupplyBefore = await arth.totalSupply();
      const arthBalanceBefore = await arth.balanceOf(owner.address);

      const arthxTotalSupply = await arthx.totalSupply();
      const arthxBalanceBefore = await arthx.balanceOf(owner.address);

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const valueSuppliedInCollateral = ETH.mul(943396).div(1e6);
      const valueSuppliedInTotal = valueSuppliedInCollateral.mul(100).div(10);
      const valueSuppliedInARTHX = valueSuppliedInTotal.sub(
        valueSuppliedInCollateral
      );
      const arthxToBeSupplied = valueSuppliedInARTHX.mul(1e6).div(1063829);

      const expectedMintWithoutFee = valueSuppliedInCollateral.add(
        valueSuppliedInARTHX
      );
      const expectedMint = expectedMintWithoutFee.sub(
        expectedMintWithoutFee.div(1000)
      ); // Since, Mint fee is 0.1 %.

      await arthPool.mintFractionalARTH(ETH, arthxToBeSupplied, expectedMint);

      expect(await arth.totalSupply()).to.eq(
        totalSupplyBefore.add(expectedMint)
      );

      expect(await arth.balanceOf(owner.address)).to.eq(
        arthBalanceBefore.add(expectedMint)
      );

      expect(await dai.balanceOf(owner.address)).to.eq(
        collateralBalanceBefore.sub(ETH)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolCollateralBalanceBefore.add(ETH)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.sub(arthxToBeSupplied)
      );

      expect(await arthx.totalSupply()).to.eq(
        arthxTotalSupply.sub(arthxToBeSupplied)
      );
    });

    it(' - Should mint properly when all DAI/ETH & ARTHX/ETH < 1 && DAI/ETH = ARTHX/ETH', async () => {
      await arthController.setGlobalCollateralRatio(1e5);

      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(943396);

      await arthxETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(943396);

      const totalSupplyBefore = await arth.totalSupply();
      const arthBalanceBefore = await arth.balanceOf(owner.address);

      const arthxTotalSupply = await arthx.totalSupply();
      const arthxBalanceBefore = await arthx.balanceOf(owner.address);

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const expectedMintWithoutFee = ETH.mul(943396).div(1e6).mul(10); // Since 1 DAI & 9ARTHX & DAI price = ARTH price.
      const expectedMint = expectedMintWithoutFee.sub(
        expectedMintWithoutFee.div(1000)
      ); // Since, Mint fee is 0.1 %.

      await arthPool.mintFractionalARTH(ETH, ETH.mul(9), expectedMint);

      expect(await arth.totalSupply()).to.eq(
        totalSupplyBefore.add(expectedMint)
      );

      expect(await arth.balanceOf(owner.address)).to.eq(
        arthBalanceBefore.add(expectedMint)
      );

      expect(await dai.balanceOf(owner.address)).to.eq(
        collateralBalanceBefore.sub(ETH)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolCollateralBalanceBefore.add(ETH)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.sub(ETH.mul(9))
      );

      expect(await arthx.totalSupply()).to.eq(arthxTotalSupply.sub(ETH.mul(9)));
    });
  });

  describe('- Recollateralize ARTH', async () => {
    beforeEach(' - Approve collateral', async () => {
      await dai.approve(arthPool.address, ETH);
      await arthController.setGlobalCollateralRatio(1e4);
    });

    it(' - Should not recollateralize when paused', async () => {
      await arthController.connect(timelock).toggleRecollateralize();

      await expect(arthPool.recollateralizeARTH(ETH, 0)).to.revertedWith(
        'Recollateralize is paused'
      );

      await expect(arthPool.recollateralizeARTH(ETH, ETH)).to.revertedWith(
        'Recollateralize is paused'
      );
    });

    it(' - Should not recollateralize when expected ARTHX > to be minted', async () => {
      await expect(
        arthPool.recollateralizeARTH(ETH, ETH.mul(3))
      ).to.revertedWith('Slippage limit reached');
    });

    it(' - Should recollaterize properly when all prices = 1', async () => {
      await dai.transfer(arthPool.address, ETH); // Ensuring that pool has some collateral.

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const arthxTotalSupply = await arthx.totalSupply();

      const collateralValueBefore = await arthController.getGlobalCollateralValue();
      const targetCollateralValue = await arthPool.getTargetCollateralValue();

      expect(collateralValueBefore.div(targetCollateralValue).mul(100)).to.eq(
        0
      );

      const expectedMint = ETH.sub(ETH.div(1000));
      await arthPool.recollateralizeARTH(ETH, expectedMint);

      expect(await dai.balanceOf(owner.address)).to.eq(
        collateralBalanceBefore.sub(ETH)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolCollateralBalanceBefore.add(ETH)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.add(expectedMint)
      );

      expect(await arthx.totalSupply()).to.eq(
        arthxTotalSupply.add(expectedMint)
      );
    });

    it(' - Should recollaterize properly when all DAI/ETH & ARTHX/ETH > 1 && DAI/ETH = ARTHX/ETH', async () => {
      await dai.transfer(arthPool.address, ETH); // Ensuring that pool has some collateral.

      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(1063829);

      await arthxETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(1063829);

      const collateralValueBefore = await arthController.getGlobalCollateralValue();
      const targetCollateralValue = await arthPool.getTargetCollateralValue();

      expect(collateralValueBefore.div(targetCollateralValue).mul(100)).to.eq(
        0
      );

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const arthxTotalSupply = await arthx.totalSupply();

      const suppliedCollteralValue = ETH.mul(1063829).div(1e6); // Collateral's value.
      const expectedMint = suppliedCollteralValue // Amount to recollateralize as per ARTHX price and collatera's value.
        .sub(suppliedCollteralValue.div(1000))
        .mul(1e6)
        .div(1063829);

      await arthPool.recollateralizeARTH(ETH, expectedMint);

      expect(await dai.balanceOf(owner.address)).to.eq(
        collateralBalanceBefore.sub(ETH)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolCollateralBalanceBefore.add(ETH)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.add(expectedMint)
      );

      expect(await arthx.totalSupply()).to.eq(
        arthxTotalSupply.add(expectedMint)
      );
    });

    it(' - Should recollaterize properly when all DAI/ETH > 1 & ARTHX/ETH < 1', async () => {
      await dai.transfer(arthPool.address, ETH); // Ensuring that pool has some collateral.

      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(1063829);

      await arthxETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(943396);

      const collateralValueBefore = await arthController.getGlobalCollateralValue();
      const targetCollateralValue = await arthPool.getTargetCollateralValue();

      expect(collateralValueBefore.div(targetCollateralValue).mul(100)).to.eq(
        0
      );

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const arthxTotalSupply = await arthx.totalSupply();

      const suppliedCollteralValue = ETH.mul(1063829).div(1e6); // Collateral's value.
      const expectedMint = suppliedCollteralValue // Amount to recollateralize as per ARTHX price and collatera's value.
        .sub(suppliedCollteralValue.div(1000))
        .mul(1e6)
        .div(943396);

      await arthPool.recollateralizeARTH(ETH, expectedMint);

      expect(await dai.balanceOf(owner.address)).to.eq(
        collateralBalanceBefore.sub(ETH)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolCollateralBalanceBefore.add(ETH)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.add(expectedMint)
      );

      expect(await arthx.totalSupply()).to.eq(
        arthxTotalSupply.add(expectedMint)
      );
    });

    it(' - Should recollaterize properly when all DAI/ETH < 1 & ARTHX/ETH > 1', async () => {
      await dai.transfer(arthPool.address, ETH); // Ensuring that pool has some collateral.

      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(943396);

      await arthxETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(1063829);

      const collateralValueBefore = await arthController.getGlobalCollateralValue();
      const targetCollateralValue = await arthPool.getTargetCollateralValue();

      expect(collateralValueBefore.div(targetCollateralValue).mul(100)).to.eq(
        0
      );

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const arthxTotalSupply = await arthx.totalSupply();

      const suppliedCollteralValue = ETH.mul(943396).div(1e6); // Collateral's value.
      const expectedMint = suppliedCollteralValue // Amount to recollateralize as per ARTHX price and collatera's value.
        .sub(suppliedCollteralValue.div(1000))
        .mul(1e6)
        .div(1063829);

      await arthPool.recollateralizeARTH(ETH, expectedMint);

      expect(await dai.balanceOf(owner.address)).to.eq(
        collateralBalanceBefore.sub(ETH)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolCollateralBalanceBefore.add(ETH)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.add(expectedMint)
      );

      expect(await arthx.totalSupply()).to.eq(
        arthxTotalSupply.add(expectedMint)
      );
    });

    it(' - Should recollaterize properly when all DAI/ETH & ARTHX/ETH < 1 && DAI/ETH = ARTHX/ETH', async () => {
      await dai.transfer(arthPool.address, ETH); // Ensuring that pool has some collateral.

      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(943396);

      await arthxETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(943396);

      const collateralValueBefore = await arthController.getGlobalCollateralValue();
      const targetCollateralValue = await arthPool.getTargetCollateralValue();

      expect(collateralValueBefore.div(targetCollateralValue).mul(100)).to.eq(
        0
      );

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const arthxTotalSupply = await arthx.totalSupply();

      const suppliedCollteralValue = ETH.mul(943396).div(1e6);
      const expectedMint = suppliedCollteralValue
        .sub(suppliedCollteralValue.div(1000))
        .mul(1e6)
        .div(943396);

      await arthPool.recollateralizeARTH(ETH, expectedMint);

      expect(await dai.balanceOf(owner.address)).to.eq(
        collateralBalanceBefore.sub(ETH)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolCollateralBalanceBefore.add(ETH)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.add(expectedMint)
      );

      expect(await arthx.totalSupply()).to.eq(
        arthxTotalSupply.add(expectedMint)
      );
    });

    it(' - Should recollaterize properly when all prices = 1 & pool has no collateral', async () => {
      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      // Ensuring pool has no collateral at all.
      expect(await dai.balanceOf(arthPool.address)).to.eq(0);

      const collateralValueBefore = await arthController.getGlobalCollateralValue();
      const targetCollateralValue = await arthPool.getTargetCollateralValue();

      expect(collateralValueBefore.div(targetCollateralValue).mul(100)).to.eq(
        0
      );

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const arthxTotalSupply = await arthx.totalSupply();

      const expectedMint = ETH.sub(ETH.div(1000));

      await arthPool.recollateralizeARTH(ETH, expectedMint);

      expect(await dai.balanceOf(owner.address)).to.eq(
        collateralBalanceBefore.sub(ETH)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolCollateralBalanceBefore.add(ETH)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.add(expectedMint)
      );

      expect(await arthx.totalSupply()).to.eq(
        arthxTotalSupply.add(expectedMint)
      );
    });

    it(' - Should recollaterize properly when all DAI/ETH & ARTHX/ETH > 1 && DAI/ETH = ARTHX/ETH && pool has no collateral', async () => {
      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(1063829);

      await arthxETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(1063829);

      // Ensuring pool has no collateral at all.
      expect(await dai.balanceOf(arthPool.address)).to.eq(0);

      const collateralValueBefore = await arthController.getGlobalCollateralValue();
      const targetCollateralValue = await arthPool.getTargetCollateralValue();

      expect(collateralValueBefore.div(targetCollateralValue).mul(100)).to.eq(
        0
      );

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const arthxTotalSupply = await arthx.totalSupply();

      const suppliedCollteralValue = ETH.mul(1063829).div(1e6);
      const expectedMint = suppliedCollteralValue
        .sub(suppliedCollteralValue.div(1000))
        .mul(1e6)
        .div(1063829);

      await arthPool.recollateralizeARTH(ETH, expectedMint);

      expect(await dai.balanceOf(owner.address)).to.eq(
        collateralBalanceBefore.sub(ETH)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolCollateralBalanceBefore.add(ETH)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.add(expectedMint)
      );

      expect(await arthx.totalSupply()).to.eq(
        arthxTotalSupply.add(expectedMint)
      );
    });

    it(' - Should recollaterize properly when all DAI/ETH & ARTHX/ETH < 1 && DAI/ETH = ARTHX/ETH && pool has no collateral', async () => {
      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(943396);

      await arthxETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(943396);

      // Ensuring pool has no collateral at all.
      expect(await dai.balanceOf(arthPool.address)).to.eq(0);

      const collateralValueBefore = await arthController.getGlobalCollateralValue();
      const targetCollateralValue = await arthPool.getTargetCollateralValue();

      expect(collateralValueBefore.div(targetCollateralValue).mul(100)).to.eq(
        0
      );

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const arthxTotalSupply = await arthx.totalSupply();

      const suppliedCollteralValue = ETH.mul(943396).div(1e6);
      const expectedMint = suppliedCollteralValue
        .sub(suppliedCollteralValue.div(1000))
        .mul(1e6)
        .div(943396);

      await arthPool.recollateralizeARTH(ETH, expectedMint);

      expect(await dai.balanceOf(owner.address)).to.eq(
        collateralBalanceBefore.sub(ETH)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolCollateralBalanceBefore.add(ETH)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.add(expectedMint)
      );

      expect(await arthx.totalSupply()).to.eq(
        arthxTotalSupply.add(expectedMint)
      );
    });

    it(' - Should recollaterize properly when all DAI/ETH > 1 & ARTHX/ETH < 1 & pool has no collateral', async () => {
      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(1063829);

      await arthxETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(943396);

      const collateralValueBefore = await arthController.getGlobalCollateralValue();
      const targetCollateralValue = await arthPool.getTargetCollateralValue();

      expect(collateralValueBefore.div(targetCollateralValue).mul(100)).to.eq(
        0
      );

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const arthxTotalSupply = await arthx.totalSupply();

      const suppliedCollteralValue = ETH.mul(1063829).div(1e6);
      const expectedMint = suppliedCollteralValue
        .sub(suppliedCollteralValue.div(1000))
        .mul(1e6)
        .div(943396);

      await arthPool.recollateralizeARTH(ETH, expectedMint);

      expect(await dai.balanceOf(owner.address)).to.eq(
        collateralBalanceBefore.sub(ETH)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolCollateralBalanceBefore.add(ETH)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.add(expectedMint)
      );

      expect(await arthx.totalSupply()).to.eq(
        arthxTotalSupply.add(expectedMint)
      );
    });

    it(' - Should recollaterize properly when all DAI/ETH < 1 & ARTHX/ETH > 1 & pool has no collateral', async () => {
      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(943396);

      await arthxETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(1063829);

      const collateralValueBefore = await arthController.getGlobalCollateralValue();
      const targetCollateralValue = await arthPool.getTargetCollateralValue();

      expect(collateralValueBefore.div(targetCollateralValue).mul(100)).to.eq(
        0
      );

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const arthxTotalSupply = await arthx.totalSupply();

      const suppliedCollteralValue = ETH.mul(943396).div(1e6); // Collateral's value.
      const expectedMint = suppliedCollteralValue
        .sub(suppliedCollteralValue.div(1000))
        .mul(1e6)
        .div(1063829);

      await arthPool.recollateralizeARTH(ETH, expectedMint);

      expect(await dai.balanceOf(owner.address)).to.eq(
        collateralBalanceBefore.sub(ETH)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolCollateralBalanceBefore.add(ETH)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.add(expectedMint)
      );

      expect(await arthx.totalSupply()).to.eq(
        arthxTotalSupply.add(expectedMint)
      );
    });
  });

  describe('- Buyback ARTHX', async () => {
    beforeEach(' - Approve collateral', async () => {
      await arthx.approve(arthPool.address, ETH);
      await advanceTimeAndBlock(provider, 7 * 24 * 60 * 60);
    });

    it(' - Should not buyback when paused', async () => {
      await arthController.connect(timelock).toggleBuyBack();

      await expect(arthPool.buyBackARTHX(ETH, 0)).to.revertedWith(
        'Buyback is paused'
      );

      await expect(arthPool.buyBackARTHX(ETH, ETH)).to.revertedWith(
        'Buyback is paused'
      );
    });

    it(' - Should not buyback when expected collateral > to be bought back', async () => {
      await dai.transfer(arthPool.address, await dai.balanceOf(owner.address)); // Should cause effect of excess collateral.

      await expect(arthPool.buyBackARTHX(ETH, ETH.mul(3))).to.revertedWith(
        'Slippage limit reached'
      );
    });

    it(' - Should buyback properly when all prices = 1', async () => {
      await dai.transfer(arthPool.address, await dai.balanceOf(owner.address)); // Should causes effect of excess collateral.

      const daiBalanceBefore = await dai.balanceOf(owner.address);
      const poolsDaiBalanceBefore = await dai.balanceOf(arthPool.address);

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const totalSupplyBefore = await arthx.totalSupply();

      // Buyback fee is 0.1%(1 / 1000)
      const expectedBuyback = ETH.sub(ETH.div(1000));
      await arthPool.buyBackARTHX(ETH, expectedBuyback);

      expect(await dai.balanceOf(owner.address)).to.eq(
        daiBalanceBefore.add(expectedBuyback)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolsDaiBalanceBefore.sub(expectedBuyback)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.sub(ETH)
      );

      expect(await arthx.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
    });

    it(' - Should buyback properly when DAI/ETH & ARTHX/ETH < 1 && DAI/ETH = ARTHX/ETH', async () => {
      await dai.transfer(arthPool.address, await dai.balanceOf(owner.address)); // Should causes effect of excess collateral.

      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(943396);

      await arthxETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(943396);

      const daiBalanceBefore = await dai.balanceOf(owner.address);
      const poolsDaiBalanceBefore = await dai.balanceOf(arthPool.address);

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const totalSupplyBefore = await arthx.totalSupply();

      // Buyback fee is 0.1%(1 / 1000)
      const valueSuppliedInARTHX = ETH.mul(943396).div(1e6);
      const expectedBuyback = valueSuppliedInARTHX
        .sub(valueSuppliedInARTHX.div(1000))
        .mul(1e6)
        .div(943396);

      await arthPool.buyBackARTHX(ETH, expectedBuyback);

      expect(await dai.balanceOf(owner.address)).to.eq(
        daiBalanceBefore.add(expectedBuyback)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolsDaiBalanceBefore.sub(expectedBuyback)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.sub(ETH)
      );

      expect(await arthx.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
    });

    it(' - Should buyback properly when DAI/ETH & ARTHX/ETH > 1 && DAI/ETH = ARTHX/ETH', async () => {
      await dai.transfer(arthPool.address, await dai.balanceOf(owner.address)); // Should causes effect of excess collateral.

      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(1063829);

      await arthxETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(1063829);

      const daiBalanceBefore = await dai.balanceOf(owner.address);
      const poolsDaiBalanceBefore = await dai.balanceOf(arthPool.address);

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const totalSupplyBefore = await arthx.totalSupply();

      // Buyback fee is 0.1%(1 / 1000)
      const valueSuppliedInARTHX = ETH.mul(1063829).div(1e6);
      const expectedBuyback = valueSuppliedInARTHX
        .sub(valueSuppliedInARTHX.div(1000))
        .mul(1e6)
        .div(1063829);

      await arthPool.buyBackARTHX(ETH, expectedBuyback);

      expect(await dai.balanceOf(owner.address)).to.eq(
        daiBalanceBefore.add(expectedBuyback)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolsDaiBalanceBefore.sub(expectedBuyback)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.sub(ETH)
      );

      expect(await arthx.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
    });

    it(' - Should buyback properly when DAI/ETH > 1 & ARTHX/ETH < 1', async () => {
      await dai.transfer(arthPool.address, await dai.balanceOf(owner.address)); // Should causes effect of excess collateral.

      await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(1063829);

      await arthxETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(943396);

      const daiBalanceBefore = await dai.balanceOf(owner.address);
      const poolsDaiBalanceBefore = await dai.balanceOf(arthPool.address);

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const totalSupplyBefore = await arthx.totalSupply();

      // Buyback fee is 0.1%(1 / 1000)
      const valueSuppliedInARTHX = ETH.mul(943396).div(1e6);
      const expectedBuyback = valueSuppliedInARTHX
        .sub(valueSuppliedInARTHX.div(1000))
        .mul(1e6)
        .div(1063829);

      await arthPool.buyBackARTHX(ETH, expectedBuyback);

      expect(await dai.balanceOf(owner.address)).to.eq(
        daiBalanceBefore.add(expectedBuyback)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolsDaiBalanceBefore.sub(expectedBuyback)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.sub(ETH)
      );

      expect(await arthx.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
    });

    it(' - Should buyback properly when DAI/ETH < 1 & ARTHX/ETH > 1', async () => {
      await dai.transfer(arthPool.address, await dai.balanceOf(owner.address)); // Should causes effect of excess collateral.

      await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthPool.getCollateralPrice()).to.eq(943396);

      await arthxETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(1063829);

      const daiBalanceBefore = await dai.balanceOf(owner.address);
      const poolsDaiBalanceBefore = await dai.balanceOf(arthPool.address);

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const totalSupplyBefore = await arthx.totalSupply();

      // Buyback fee is 0.1%(1 / 1000)
      const valueSuppliedInARTHX = ETH.mul(1063829).div(1e6);
      const expectedBuyback = valueSuppliedInARTHX
        .sub(valueSuppliedInARTHX.div(1000))
        .mul(1e6)
        .div(943396);

      await arthPool.buyBackARTHX(ETH, expectedBuyback);

      expect(await dai.balanceOf(owner.address)).to.eq(
        daiBalanceBefore.add(expectedBuyback)
      );

      expect(await dai.balanceOf(arthPool.address)).to.eq(
        poolsDaiBalanceBefore.sub(expectedBuyback)
      );

      expect(await arthx.balanceOf(owner.address)).to.eq(
        arthxBalanceBefore.sub(ETH)
      );

      expect(await arthx.totalSupply()).to.eq(totalSupplyBefore.sub(ETH));
    });
  });
});
