import { ethers } from 'hardhat';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract, ContractFactory, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import { advanceTimeAndBlock } from './utilities';

chai.use(solidity);

/**
 * TODO: add test cases for.
 *  - Manually set prices for different oracles and test it.
 */
describe('ARTHController', () => {
  const { provider } = ethers;

  const ETH = utils.parseEther('1');

  let owner: SignerWithAddress;
  let timelock: SignerWithAddress;
  let attacker: SignerWithAddress;
  let alternate: SignerWithAddress;

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
  let usdc: Contract;
  let arth: Contract;
  let maha: Contract;
  let arthx: Contract;
  let gmuOracle: Contract;
  let daiARTHPool: Contract;
  let usdcARTHPool: Contract;
  let bondingCurve: Contract;
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

  let mockDaiGMUAggregatorV3: Contract;
  let daiGMUChainlinkOracle: Contract;
  let usdcGMUChainlinkOracle: Contract;
  let mockUSDCGMUAggregatorV3: Contract;
  let mockChainlinkAggregatorV3: Contract;

  before(' - Setup accounts & deploy libraries', async () => {
    [owner, timelock, attacker, alternate] = await ethers.getSigners();

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
    BondingCurve = await ethers.getContractFactory('BondingCurve');
    ARTHController = await ethers.getContractFactory('ArthController');
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
    usdc = await MockCollateral.deploy(
      owner.address,
      ETH.mul(10000),
      'USDC',
      18
    );

    gmuOracle = await SimpleOracle.deploy('GMU/USD', ETH.div(1e12)); // Keep the price of simple oracle in 1e6 precision.
    daiETHUniswapOracle = await MockUniswapOracle.deploy();
    usdcETHUniswapOracle = await MockUniswapOracle.deploy();
    arthETHUniswapOracle = await MockUniswapOracle.deploy();
    arthxETHUniswapOracle = await MockUniswapOracle.deploy();
    arthMahaOracle = await SimpleOracle.deploy('ARTH/MAHA', ETH.div(1e12)); // Keep the price of simple oracle in 1e6 precision.

    mockChainlinkAggregatorV3 = await MockChainlinkAggregatorV3.deploy();
    mockDaiGMUAggregatorV3 = await MockChainlinkAggregatorV3.deploy();
    mockUSDCGMUAggregatorV3 = await MockChainlinkAggregatorV3.deploy();

    chainlinkETHGMUOracle = await ChainlinkETHGMUOracle.deploy(
      mockChainlinkAggregatorV3.address,
      gmuOracle.address
    );

    daiGMUChainlinkOracle = await ChainlinkETHGMUOracle.deploy(
      mockDaiGMUAggregatorV3.address,
      gmuOracle.address
    );

    usdcGMUChainlinkOracle = await ChainlinkETHGMUOracle.deploy(
      mockUSDCGMUAggregatorV3.address,
      gmuOracle.address
    );

    bondingCurve = await BondingCurve.deploy(1300e6);

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

    daiARTHPool = await ARTHPool.deploy(
      arth.address,
      arthx.address,
      dai.address,
      owner.address,
      owner.address,
      maha.address,
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
      usdcETHUniswapOracle.address,
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

    await arthController.setGlobalCollateralRatio(11e5);
    await arthx.setArthController(arthController.address);

    await daiARTHPool.setCollatGMUOracle(daiPoolOracle.address);
    await usdcARTHPool.setCollatGMUOracle(usdcPoolOracle.address);

    await arthController.setARTHGMUOracle(
      arthETHUniswapOracle.address,
      owner.address
    );
    await arthController.setARTHXGMUOracle(
      arthxETHUniswapOracle.address,
      owner.address
    );

    await arthController.setFeesParameters(1000, 1000, 1000);

    await daiARTHPool.setPoolParameters(ETH.mul(2), 1);

    await usdcARTHPool.setPoolParameters(ETH.mul(2), 1);

    await arthController.setRecollateralizationCurve(
      recollaterizationCurve.address
    );
    await arthController.setBondingCurve(bondingCurve.address);

    await mockChainlinkAggregatorV3.setLatestPrice(ETH.div(1e10)); // Keep the price of mock chainlink oracle as 1e8 for simplicity sake.
    await mockDaiGMUAggregatorV3.setLatestPrice(ETH.div(1e10)); // Keep the price of mock chainlink oracle as 1e8 for simplicity sake.
    await mockUSDCGMUAggregatorV3.setLatestPrice(ETH.div(1e10)); // Keep the price of mock chainlink oracle as 1e8 for simplicity sake.
  });

  describe('- Access restricted functions', async () => {
    it(' - Should not work if not COLLATERAL_RATIO_PAUSER', async () => {
      await expect(
        arthController.connect(attacker).toggleCollateralRatio()
      ).to.revertedWith('ARTHController: FORBIDDEN');
    });

    it(' - Should work if COLLATERAL_RATIO_PAUSER', async () => {
      await expect(arthController.connect(owner).toggleCollateralRatio()).to.not
        .reverted;

      expect(await arthController.isColalteralRatioPaused()).to.eq(true);

      await expect(arthController.connect(timelock).toggleCollateralRatio()).to
        .not.reverted;

      expect(await arthController.isColalteralRatioPaused()).to.eq(false);
    });

    it(' - Should not work if not DEFAULT_ADMIN_ROLE', async () => {
      await expect(
        arthController.connect(attacker).setGlobalCollateralRatio(1e5)
      ).to.revertedWith('ARTHController: FORBIDDEN');

      await expect(
        arthController.connect(timelock).setGlobalCollateralRatio(1e5)
      ).to.revertedWith('ARTHController: FORBIDDEN');
    });

    it(' - Should work if DEFAULT_ADMIN_ROLE', async () => {
      await expect(arthController.connect(owner).setGlobalCollateralRatio(1e5))
        .to.not.reverted;

      expect(await arthController.globalCollateralRatio()).to.eq(1e5);
    });

    it(' - Should not work if not (governance || owner)', async () => {
      await expect(
        arthController.connect(attacker).setARTHXAddress(arth.address)
      ) // Mock address to test access level.
        .to.revertedWith('ARTHController: FORBIDDEN');
    });

    it(' - Should not work if (governance || owner)', async () => {
      await expect(arthController.connect(owner).setARTHXAddress(arth.address)) // Mock address to test access level.
        .to.not.reverted;

      expect(await arthController.arthxAddress()).to.eq(arth.address);

      await expect(
        arthController.connect(timelock).setARTHXAddress(owner.address)
      ).to.not.reverted; // Mock address to test access level.

      expect(await arthController.arthxAddress()).to.eq(owner.address);
    });

    it(' - Should not work if not appropriate role', async () => {
      await expect(arthController.toggleMinting()).to.revertedWith('');
      await expect(
        arthController.connect(attacker).toggleMinting()
      ).to.revertedWith('');

      await expect(arthController.toggleRedeeming()).to.revertedWith('');
      await expect(
        arthController.connect(attacker).toggleRedeeming()
      ).to.revertedWith('');

      await expect(arthController.toggleRecollateralize()).to.revertedWith('');
      await expect(
        arthController.connect(attacker).toggleRecollateralize()
      ).to.revertedWith('');

      await expect(arthController.toggleBuyBack()).to.revertedWith('');
      await expect(
        arthController.connect(attacker).toggleBuyBack()
      ).to.revertedWith('');
    });

    it(' - Should work if appropriate role', async () => {
      await expect(arthController.connect(timelock).toggleMinting()).to.not
        .reverted;

      expect(await arthController.isMintPaused()).to.eq(true);

      await expect(arthController.connect(timelock).toggleRedeeming()).to.not
        .reverted;
      expect(await arthController.isRedeemPaused()).to.eq(true);

      await expect(arthController.connect(timelock).toggleRecollateralize()).to
        .not.reverted;
      expect(await arthController.isRecollaterlizePaused()).to.eq(true);

      await expect(arthController.connect(timelock).toggleBuyBack()).to.not
        .reverted;
      expect(await arthController.isBuybackPaused()).to.eq(true);
    });
  });

  describe('- Simpler Getters', async () => {
    it(' - Should get global CR correctly', async () => {
      expect(await arthController.getGlobalCollateralRatio()).to.eq(11e5);

      await arthController.setGlobalCollateralRatio(1e3);
      expect(
        await arthController.connect(owner).getGlobalCollateralRatio()
      ).to.eq(1e3);

      await arthController.setGlobalCollateralRatio(1e6);
      expect(
        await arthController.connect(owner).getGlobalCollateralRatio()
      ).to.eq(1e6);
    });

    it(' - Should work correctly', async () => {
      expect(await arthController.getARTHSupply()).to.eq(
        await arth.totalSupply()
      );
    });

    it(' - Should get fees correctly', async () => {
      expect(await arthController.stabilityFee()).to.eq(10000);

      await arthController.setStabilityFee(9);
      expect(await arthController.stabilityFee()).to.eq(9);

      await arthController.setFeesParameters(1e6, 1e6, 1e6);
      expect(await arthController.mintingFee()).to.eq(1e6);

      expect(await arthController.redemptionFee()).to.eq(1e6);

      expect(await arthController.buybackFee()).to.eq(1e6);
    });

    it(' - Should get paused or not correctly', async () => {
      expect(await arthController.isMintPaused()).to.eq(true);

      expect(await arthController.isRedeemPaused()).to.eq(true);

      expect(await arthController.isRecollaterlizePaused()).to.eq(false);

      expect(await arthController.isBuybackPaused()).to.eq(true);

      await arthController.connect(owner).deactivateGenesis();

      expect(await arthController.isMintPaused()).to.eq(false);

      expect(await arthController.isRedeemPaused()).to.eq(false);

      expect(await arthController.isRecollaterlizePaused()).to.eq(false);

      expect(await arthController.isBuybackPaused()).to.eq(false);
    });

    it(' - Should get ARTH info correctly during genesis', async () => {
      await arthController.setFeesParameters(1e6, 1e6, 1e6);

      const totalSupply = await arthController.getARTHSupply();
      const globalCollateralRatio = await arthController.getGlobalCollateralRatio();
      const globalCollateralValue = await arthController.getGlobalCollateralValue();
      const gmuPrice = await arthController.getETHGMUPrice();
      const arthInfo = await arthController.getARTHInfo();

      expect(arthInfo[0]).to.eq(1e6);

      expect(arthInfo[1]).to.eq(7e3);

      expect(arthInfo[2]).to.eq(totalSupply);

      expect(arthInfo[3]).to.eq(globalCollateralRatio);

      expect(arthInfo[4]).to.eq(globalCollateralValue);

      expect(arthInfo[5]).to.eq(1e6);

      expect(arthInfo[6]).to.eq(1e6);

      expect(arthInfo[7]).to.eq(gmuPrice);

      expect(arthInfo[8]).to.eq(1e6);
    });

    it(' - Should get ARTH info correctly after genesis', async () => {
      await arthController.setFeesParameters(1e6, 1e6, 1e6);
      await advanceTimeAndBlock(provider, 7 * 24 * 60 * 60);

      const totalSupply = await arthController.getARTHSupply();
      const globalCollateralRatio = await arthController.getGlobalCollateralRatio();
      const globalCollateralValue = await arthController.getGlobalCollateralValue();
      const gmuPrice = await arthController.getETHGMUPrice();
      const arthInfo = await arthController.getARTHInfo();

      expect(arthInfo[0]).to.eq(1e6);

      expect(arthInfo[1]).to.eq(1e6);

      expect(arthInfo[2]).to.eq(totalSupply);

      expect(arthInfo[3]).to.eq(globalCollateralRatio);

      expect(arthInfo[4]).to.eq(globalCollateralValue);

      expect(arthInfo[5]).to.eq(1e6);

      expect(arthInfo[6]).to.eq(1e6);

      expect(arthInfo[7]).to.eq(gmuPrice);

      expect(arthInfo[8]).to.eq(1e6);
    });
  });

  describe('- Prices', async () => {
    it(' - Should work correctly for ETH/GMU Price', async () => {
      await mockChainlinkAggregatorV3.setLatestPrice(2200e8);
      expect(await arthController.getETHGMUPrice()).to.eq(2200e6);

      await mockChainlinkAggregatorV3.setLatestPrice(1e8);
      expect(await arthController.getETHGMUPrice()).to.eq(1e6);

      await mockChainlinkAggregatorV3.setLatestPrice(1e9);
      expect(await arthController.getETHGMUPrice()).to.eq(1e7);

      await mockChainlinkAggregatorV3.setLatestPrice(1e7);
      expect(await arthController.getETHGMUPrice()).to.eq(1e5);

      await mockChainlinkAggregatorV3.setLatestPrice(1e4);
      expect(await arthController.getETHGMUPrice()).to.eq(1e2);

      await mockChainlinkAggregatorV3.setLatestPrice(5e7);
      expect(await arthController.getETHGMUPrice()).to.eq(5e5);

      await mockChainlinkAggregatorV3.setLatestPrice(5e9);
      expect(await arthController.getETHGMUPrice()).to.eq(5e7);

      await mockChainlinkAggregatorV3.setLatestPrice(35e4);
      expect(await arthController.getETHGMUPrice()).to.eq(35e2);

      await gmuOracle.setPrice(1e4);
      await mockChainlinkAggregatorV3.setLatestPrice(1e8);
      expect(await arthController.getETHGMUPrice()).to.eq(1e4);

      await gmuOracle.setPrice(5e3);
      await mockChainlinkAggregatorV3.setLatestPrice(1e8);
      expect(await arthController.getETHGMUPrice()).to.eq(5e3);

      await gmuOracle.setPrice(5e3);
      await mockChainlinkAggregatorV3.setLatestPrice(2e7);
      expect(await arthController.getETHGMUPrice()).to.eq(10e2);
    });

    it(' - Should work correctly for ARTH price', async () => {
      expect(await arthController.getARTHPrice()).to.eq(1e6);

      await mockChainlinkAggregatorV3.setLatestPrice(2e7);
      expect(await arthController.getARTHPrice()).to.eq(2e5);

      await mockChainlinkAggregatorV3.setLatestPrice(1e8);
      await arthETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthController.getARTHPrice()).to.eq(943396);

      await mockChainlinkAggregatorV3.setLatestPrice(2e7);
      await arthETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthController.getARTHPrice()).to.eq(188679);

      await mockChainlinkAggregatorV3.setLatestPrice(1e8);
      await arthETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthController.getARTHPrice()).to.eq(1063829);

      await mockChainlinkAggregatorV3.setLatestPrice(2e7);
      await arthETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthController.getARTHPrice()).to.eq(212765);
    });

    it(' - Should work correctly for ARTHX price', async () => {
      expect(await arthController.getARTHXPrice()).to.eq(7e3);

      await advanceTimeAndBlock(provider, 7 * 24 * 60 * 60);

      await mockChainlinkAggregatorV3.setLatestPrice(2e7);
      expect(await arthController.getARTHXPrice()).to.eq(2e5);

      await mockChainlinkAggregatorV3.setLatestPrice(1e8);
      await arthxETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(943396);

      await mockChainlinkAggregatorV3.setLatestPrice(2e7);
      await arthxETHUniswapOracle.setPrice(ETH.mul(106).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(188679);

      await mockChainlinkAggregatorV3.setLatestPrice(1e8);
      await arthxETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(1063829);

      await mockChainlinkAggregatorV3.setLatestPrice(2e7);
      await arthxETHUniswapOracle.setPrice(ETH.mul(94).div(100));
      expect(await arthController.getARTHXPrice()).to.eq(212765);
    });
  });

  describe('- Collateral value', async () => {
    beforeEach(' - Transfer tokens to pools', async () => {
      await dai.transfer(daiARTHPool.address, ETH.mul(2));
      await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
    });

    describe(' - Uniswap based collateral oracles', async () => {
      it('  - Should work correctly when DAI/ETH = 1) && (USDC/ETH = 1) && (DAI Pool Bal. != USDC Pool Bal.)', async () => {
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(4)
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(5)
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(7)
        );
      });

      it('  - Should work correctly when DAI/ETH > 1) && (USDC/ETH > 1) && (DAI/ETH = USD/ETH)', async () => {
        await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
        await usdcETHUniswapOracle.setPrice(ETH.mul(94).div(100));
        // Making sure that prices of collateral are set properly.
        expect(await daiARTHPool.getCollateralPrice()).to.eq(1063829);
        expect(await usdcARTHPool.getCollateralPrice()).to.eq(1063829);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(4).mul(1063829).div(1e6)
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(5).mul(1063829).div(1e6)
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(7).mul(1063829).div(1e6)
        );
      });

      it('  - Should work correctly when DAI/ETH < 1) && (USDC/ETH < 1) && (DAI/ETH = USD/ETH)', async () => {
        await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
        await usdcETHUniswapOracle.setPrice(ETH.mul(106).div(100));
        // Making sure that prices of collateral are set properly.
        expect(await daiARTHPool.getCollateralPrice()).to.eq(943396);
        expect(await usdcARTHPool.getCollateralPrice()).to.eq(943396);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(4).mul(943396).div(1e6)
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(5).mul(943396).div(1e6)
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(7).mul(943396).div(1e6)
        );
      });

      it('  - Should work correctly when DAI/ETH > 1) && (USDC/ETH < 1) && (DAI/ETH = USD/ETH)', async () => {
        await daiETHUniswapOracle.setPrice(ETH.mul(94).div(100));
        await usdcETHUniswapOracle.setPrice(ETH.mul(106).div(100));
        // Making sure that prices of collateral are set properly.
        expect(await daiARTHPool.getCollateralPrice()).to.eq(1063829);
        expect(await usdcARTHPool.getCollateralPrice()).to.eq(943396);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(2).mul(1063829).div(1e6).add(ETH.mul(2).mul(943396).div(1e6))
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(3).mul(1063829).div(1e6).add(ETH.mul(2).mul(943396).div(1e6))
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(3).mul(1063829).div(1e6).add(ETH.mul(4).mul(943396).div(1e6))
        );
      });

      it('  - Should work correctly when DAI/ETH < 1) && (USDC/ETH > 1) && (DAI/ETH = USD/ETH)', async () => {
        await daiETHUniswapOracle.setPrice(ETH.mul(106).div(100));
        await usdcETHUniswapOracle.setPrice(ETH.mul(94).div(100));
        // Making sure that prices of collateral are set properly.
        expect(await daiARTHPool.getCollateralPrice()).to.eq(943396);
        expect(await usdcARTHPool.getCollateralPrice()).to.eq(1063829);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(2).mul(943396).div(1e6).add(ETH.mul(2).mul(1063829).div(1e6))
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(3).mul(943396).div(1e6).add(ETH.mul(2).mul(1063829).div(1e6))
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(3).mul(943396).div(1e6).add(ETH.mul(4).mul(1063829).div(1e6))
        );
      });
    });

    describe(' - Chainlink based collateral oracles', async () => {
      beforeEach('  - Set chainlink oracles', async () => {
        await daiPoolOracle.setOracle(daiGMUChainlinkOracle.address);
        await usdcPoolOracle.setOracle(usdcGMUChainlinkOracle.address);
      });

      it('  - Should work correctly when (DAI/USD = 1) && (USDC/USD = 1) && (USD/GMU = 1)', async () => {
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(4)
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(5)
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(7)
        );
      });

      it('  - Should work correctly when (DAI/USD = 1) && (USDC/USD = 1) && (USD/GMU > 1)', async () => {
        await gmuOracle.setPrice(1063829);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(4).mul(1063829).div(1e6)
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(5).mul(1063829).div(1e6)
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(7).mul(1063829).div(1e6)
        );
      });

      it('  - Should work correctly when (DAI/USD = 1) && (USDC/USD = 1) && (USD/GMU < 1)', async () => {
        await gmuOracle.setPrice(943396);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(4).mul(943396).div(1e6)
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(5).mul(943396).div(1e6)
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(7).mul(943396).div(1e6)
        );
      });

      it('  - Should work correctly when (DAI/USD > 1) && (USDC/USD > 1) && (USD/GMU = 1)', async () => {
        await mockDaiGMUAggregatorV3.setLatestPrice(106382900);
        await mockUSDCGMUAggregatorV3.setLatestPrice(106382900);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(4).mul(1063829).div(1e6)
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(5).mul(1063829).div(1e6)
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(7).mul(1063829).div(1e6)
        );
      });

      it('  - Should work correctly when (DAI/USD > 1) && (USDC/USD > 1) && (USD/GMU > 1)', async () => {
        await mockDaiGMUAggregatorV3.setLatestPrice(106382900);
        await mockUSDCGMUAggregatorV3.setLatestPrice(106382900);
        await gmuOracle.setPrice(1063829);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(4).mul(1131732).div(1e6)
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(5).mul(1131732).div(1e6)
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(7).mul(1131732).div(1e6)
        );
      });

      it('  - Should work correctly when (DAI/USD > 1) && (USDC/USD > 1) && (USD/GMU < 1)', async () => {
        await mockDaiGMUAggregatorV3.setLatestPrice(106382900);
        await mockUSDCGMUAggregatorV3.setLatestPrice(106382900);
        await gmuOracle.setPrice(943396);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(4).mul(1003612).div(1e6)
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(5).mul(1003612).div(1e6)
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(7).mul(1003612).div(1e6)
        );
      });

      it('  - Should work correctly when (DAI/USD < 1) && (USDC/USD < 1) && (USD/GMU = 1)', async () => {
        await mockDaiGMUAggregatorV3.setLatestPrice(94339600);
        await mockUSDCGMUAggregatorV3.setLatestPrice(94339600);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(4).mul(943396).div(1e6)
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(5).mul(943396).div(1e6)
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(7).mul(943396).div(1e6)
        );
      });

      it('  - Should work correctly when (DAI/USD < 1) && (USDC/USD < 1) && (USD/GMU > 1)', async () => {
        await mockDaiGMUAggregatorV3.setLatestPrice(94339600);
        await mockUSDCGMUAggregatorV3.setLatestPrice(94339600);
        await gmuOracle.setPrice(1063829);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(4).mul(1003612).div(1e6)
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(5).mul(1003612).div(1e6)
        );
        1003612;

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(7).mul(1003612).div(1e6)
        );
      });

      it('  - Should work correctly when (DAI/USD < 1) && (USDC/USD < 1) && (USD/GMU < 1)', async () => {
        await mockDaiGMUAggregatorV3.setLatestPrice(94339600);
        await mockUSDCGMUAggregatorV3.setLatestPrice(94339600);
        await gmuOracle.setPrice(943396);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(4).mul(889996).div(1e6)
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(5).mul(889996).div(1e6)
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(7).mul(889996).div(1e6)
        );
      });

      it('  - Should work correctly when (DAI/USD > 1) && (USDC/USD < 1) && (USD/GMU = 1)', async () => {
        await mockDaiGMUAggregatorV3.setLatestPrice(106382900);
        await mockUSDCGMUAggregatorV3.setLatestPrice(94339600);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(2).mul(1063829).div(1e6).add(ETH.mul(2).mul(943396).div(1e6))
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(3).mul(1063829).div(1e6).add(ETH.mul(2).mul(943396).div(1e6))
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(3).mul(1063829).div(1e6).add(ETH.mul(4).mul(943396).div(1e6))
        );
      });

      it('  - Should work correctly when (DAI/USD > 1) && (USDC/USD < 1) && (USD/GMU < 1)', async () => {
        await mockDaiGMUAggregatorV3.setLatestPrice(106382900);
        await mockUSDCGMUAggregatorV3.setLatestPrice(94339600);
        await gmuOracle.setPrice(943396);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(2).mul(1003612).div(1e6).add(ETH.mul(2).mul(889996).div(1e6))
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(3).mul(1003612).div(1e6).add(ETH.mul(2).mul(889996).div(1e6))
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(3).mul(1003612).div(1e6).add(ETH.mul(4).mul(889996).div(1e6))
        );
      });

      it('  - Should work correctly when (DAI/USD > 1) && (USDC/USD < 1) && (USD/GMU > 1)', async () => {
        await mockDaiGMUAggregatorV3.setLatestPrice(106382900);
        await mockUSDCGMUAggregatorV3.setLatestPrice(94339600);
        await gmuOracle.setPrice(1063829);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(2).mul(1131732).div(1e6).add(ETH.mul(2).mul(1003612).div(1e6))
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(3).mul(1131732).div(1e6).add(ETH.mul(2).mul(1003612).div(1e6))
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(3).mul(1131732).div(1e6).add(ETH.mul(4).mul(1003612).div(1e6))
        );
      });

      it('  - Should work correctly when (DAI/USD < 1) && (USDC/USD > 1) && (USD/GMU = 1)', async () => {
        await mockDaiGMUAggregatorV3.setLatestPrice(94339600);
        await mockUSDCGMUAggregatorV3.setLatestPrice(106382900);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(2).mul(1063829).div(1e6).add(ETH.mul(2).mul(943396).div(1e6))
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(2).mul(1063829).div(1e6).add(ETH.mul(3).mul(943396).div(1e6))
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(4).mul(1063829).div(1e6).add(ETH.mul(3).mul(943396).div(1e6))
        );
      });

      it('  - Should work correctly when (DAI/USD < 1) && (USDC/USD > 1) && (USD/GMU < 1)', async () => {
        await mockDaiGMUAggregatorV3.setLatestPrice(94339600);
        await mockUSDCGMUAggregatorV3.setLatestPrice(106382900);
        await gmuOracle.setPrice(943396);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(2).mul(1003612).div(1e6).add(ETH.mul(2).mul(889996).div(1e6))
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(2).mul(1003612).div(1e6).add(ETH.mul(3).mul(889996).div(1e6))
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(4).mul(1003612).div(1e6).add(ETH.mul(3).mul(889996).div(1e6))
        );
      });

      it('  - Should work correctly when (DAI/USD < 1) && (USDC/USD > 1) && (USD/GMU > 1)', async () => {
        await mockDaiGMUAggregatorV3.setLatestPrice(94339600);
        await mockUSDCGMUAggregatorV3.setLatestPrice(106382900);
        await gmuOracle.setPrice(1063829);

        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(2).mul(1131732).div(1e6).add(ETH.mul(2).mul(1003612).div(1e6))
        );

        await dai.transfer(daiARTHPool.address, ETH);
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(2).mul(1131732).div(1e6).add(ETH.mul(3).mul(1003612).div(1e6))
        );

        await usdc.transfer(usdcARTHPool.address, ETH.mul(2));
        expect(await arthController.getGlobalCollateralValue()).to.eq(
          ETH.mul(4).mul(1131732).div(1e6).add(ETH.mul(3).mul(1003612).div(1e6))
        );
      });
    });
  });
});
