import { ethers } from 'hardhat';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract, ContractFactory, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import { advanceBlock } from './utilities';


chai.use(solidity);


describe('ARTHPool', () => {
  const { provider } = ethers;

  const ETH = utils.parseEther('1');

  let owner: SignerWithAddress;

  let ARTH: ContractFactory;
  let MAHA: ContractFactory;
  let ARTHX: ContractFactory;
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
  let arth: Contract;
  let maha: Contract;
  let arthx: Contract;
  let arthPool: Contract;
  let gmuOracle: Contract;
  let arthMahaOracle: Contract;
  let arthController: Contract;
  let arthPoolLibrary: Contract;
  let daiETHUniswapOracle: Contract;
  let arthETHUniswapOracle: Contract;
  let chainlinkETHGMUOracle: Contract;
  let arthxETHUniswapOracle: Contract;
  let recollaterizationCurve: Contract;
  let mockChainlinkAggregatorV3: Contract;

  before(' - Setup accounts & deploy libraries', async () => {
    [owner] = await ethers.getSigners();

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

    SimpleOracle = await ethers.getContractFactory('SimpleOracle');
    ARTHController = await ethers.getContractFactory('ArthController');
    MockUniswapOracle = await ethers.getContractFactory('MockUniswapPairOracle');
    ChainlinkETHGMUOracle = await ethers.getContractFactory('ChainlinkETHUSDPriceConsumer');
    MockChainlinkAggregatorV3 = await ethers.getContractFactory('MockChainlinkAggregatorV3');
    RecollateralizationCurve = await ethers.getContractFactory('RecollateralizeDiscountCurve');
  });

  beforeEach(' - Deploy contracts', async () => {
    arth = await ARTH.deploy();
    maha = await MAHA.deploy();
    dai = await MockCollateral.deploy(owner.address, ETH.mul(10000), 'DAI', 18);

    gmuOracle = await SimpleOracle.deploy('GMU/USD', ETH);
    daiETHUniswapOracle = await MockUniswapOracle.deploy();
    arthETHUniswapOracle = await MockUniswapOracle.deploy();
    arthxETHUniswapOracle = await MockUniswapOracle.deploy();
    arthMahaOracle = await SimpleOracle.deploy('ARTH/MAHA', ETH);
    mockChainlinkAggregatorV3 = await MockChainlinkAggregatorV3.deploy();

    chainlinkETHGMUOracle = await ChainlinkETHGMUOracle.deploy(
      mockChainlinkAggregatorV3.address,
      gmuOracle.address
    );

    arthx = await ARTHX.deploy('ARTHX', 'ARTHX', arthxETHUniswapOracle.address, owner.address, owner.address);
    arthPoolLibrary = await ARTHPoolLibrary.deploy();
    arthController = await ARTHController.deploy(owner.address, owner.address);

    arthPool = await ARTHPool.deploy(
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

    recollaterizationCurve = await RecollateralizationCurve.deploy(arth.address, arthController.address);
  });

  beforeEach(' - Set some contract variables', async () => {
    await arthController.setETHGMUOracle(chainlinkETHGMUOracle.address);
    await arthx.setARTHAddress(arth.address);
    await arth.addPool(arthPool.address);
    await arthController.addPool(arthPool.address);
    await arthController.setGlobalCollateralRatio(0);
    await arthx.setArthController(arthController.address);
    await arthPool.setCollatETHOracle(daiETHUniswapOracle.address, owner.address);
    await arthController.setARTHXETHOracle(arthxETHUniswapOracle.address, owner.address);

    await arthPool.setPoolParameters(
      ETH.mul(2),
      1,
      1000,
      1000,
      1000,
      1000
    );

    await arthPool.setRecollateralizationCurve(recollaterizationCurve.address);
  })

  describe('- Mint 1:1 ARTH', async () => {
    beforeEach(' - Approve collateral', async () => {
      await dai.approve(arthPool.address, ETH);
    })

    it(' - Should not mint when CR < 1', async () => {
      await arthController.setGlobalCollateralRatio(100);

      await expect(arthPool.mint1t1ARTH(ETH, 0))
        .to
        .revertedWith(
          'ARHTPool: Collateral ratio < 1'
        );

      await expect(arthPool.mint1t1ARTH(ETH, ETH))
        .to
        .revertedWith(
          'ARHTPool: Collateral ratio < 1'
        );
    })

    it(' - Should not mint when collateral > celing', async () => {
      await arthController.setGlobalCollateralRatio(1e6);

      // First mint itself > ceiling.
      await expect(arthPool.mint1t1ARTH(ETH.mul(3), 0))
        .to
        .revertedWith(
          'ARTHPool: ceiling reached'
        );

      // Pool has some collateral, but new tx makes it > ceiling.
      await dai.transfer(arthPool.address, ETH.mul(2))
      await expect(arthPool.mint1t1ARTH(ETH, ETH))
        .to
        .revertedWith(
          'ARTHPool: ceiling reached'
        );
    })

    it(' - Should not mint when expected > to be minted', async () => {
      await arthController.setGlobalCollateralRatio(1e6);

      // Some portion of minted is taken as mint fee causing slippage.
      await expect(arthPool.mint1t1ARTH(ETH, ETH))
        .to
        .revertedWith(
          'ARTHPool: Slippage limit reached'
        );

      // A clear slippage.
      await expect(arthPool.mint1t1ARTH(ETH, ETH.mul(2)))
        .to
        .revertedWith(
          'ARTHPool: Slippage limit reached'
        );
    })

    it(' - Should mint properly when all prices = 1', async () => {
      await arthController.setGlobalCollateralRatio(1e6);

      const totalSupplyBefore = await arth.totalSupply();
      const arthBalanceBefore = await arth.balanceOf(owner.address);

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const expectedMint = ETH.sub(ETH.div(1000))  // Since, Mint fee is 0.1 %.
      await arthPool.mint1t1ARTH(ETH, expectedMint);

      expect(await arth.totalSupply())
        .to
        .eq(
          totalSupplyBefore.add(expectedMint)
        )

      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          arthBalanceBefore.add(expectedMint)
        )

      expect(await dai.balanceOf(owner.address))
        .to
        .eq(
          collateralBalanceBefore.sub(ETH)
        )

      expect(await dai.balanceOf(arthPool.address))
        .to
        .eq(
          poolCollateralBalanceBefore.add(ETH)
        )
    })
  })

  describe('- Mint Algorithmic ARTH', async () => {
    beforeEach(' - Approve ARTHX', async () => {
      await arthx.approve(arthPool.address, ETH);
    })

    it(' - Should not mint when CR != 0', async () => {
      await arthController.setGlobalCollateralRatio(100);

      await expect(arthPool.mintAlgorithmicARTH(ETH, 0))
        .to
        .revertedWith(
          'ARTHPool: Collateral ratio != 0'
        );

      await expect(arthPool.mintAlgorithmicARTH(ETH, ETH))
        .to
        .revertedWith(
          'ARTHPool: Collateral ratio != 0'
        );
    })

    it(' - Should not mint when expected > to be minted', async () => {
      await arthController.setGlobalCollateralRatio(0);

      // Some portion of minted is taken as mint fee causing some slippage.
      await expect(arthPool.mintAlgorithmicARTH(ETH, ETH))
        .to
        .revertedWith(
          'Slippage limit reached'
        );

      // Clear slippage between actual & expected out min.
      await expect(arthPool.mintAlgorithmicARTH(ETH, ETH.mul(2)))
        .to
        .revertedWith(
          'Slippage limit reached'
        );
    })

    it(' - Should mint properly when all prices = 1', async () => {
      await arthController.setGlobalCollateralRatio(0);

      const totalSupplyBefore = await arth.totalSupply();
      const arthBalanceBefore = await arth.balanceOf(owner.address);

      const arthxTotalSupplyBefore = await arthx.totalSupply();
      const arthxBalanceBefore = await arthx.balanceOf(owner.address);

      const expectedMint = ETH.sub(ETH.div(1000))  // Since, Mint fee is 0.1 %.
      await arthPool.mintAlgorithmicARTH(ETH, expectedMint);

      expect(await arth.totalSupply())
        .to
        .eq(
          totalSupplyBefore.add(expectedMint)
        )

      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          arthBalanceBefore.add(expectedMint)
        )

      expect(await arthx.balanceOf(owner.address))
        .to
        .eq(
          arthxBalanceBefore.sub(ETH)
        )

      expect(await arthx.totalSupply())
        .to
        .eq(
          arthxTotalSupplyBefore.sub(ETH)
        )
    })
  })

  describe('- Mint Fractional ARTH', async () => {
    beforeEach(' - Approve DAI & ARTHX', async () => {
      await dai.approve(arthPool.address, ETH);
      await arthx.approve(arthPool.address, ETH.mul(9));
    })

    it(' - Should not mint when CR = 0 || CR = 1', async () => {
      await arthController.setGlobalCollateralRatio(0);

      await expect(arthPool.mintFractionalARTH(ETH, ETH, 0))
        .to
        .revertedWith(
          'ARTHPool: fails (.000001 <= Collateral ratio <= .999999)'
        )

      await expect(arthPool.mintFractionalARTH(ETH, ETH, ETH))
        .to
        .revertedWith(
          'ARTHPool: fails (.000001 <= Collateral ratio <= .999999)'
        )

      await arthController.setGlobalCollateralRatio(1e6);

      await expect(arthPool.mintFractionalARTH(ETH, ETH, 0))
        .to
        .revertedWith(
          'ARTHPool: fails (.000001 <= Collateral ratio <= .999999)'
        )

      await expect(arthPool.mintFractionalARTH(ETH, ETH, ETH))
        .to
        .revertedWith(
          'ARTHPool: fails (.000001 <= Collateral ratio <= .999999)'
        )
    })

    it(' - Should not mint when collateral > ceiling', async () => {
      await dai.transfer(arthPool.address, ETH.mul(2))
      await arthController.setGlobalCollateralRatio(1e5);

      await expect(arthPool.mintFractionalARTH(ETH, ETH, 0))
        .to
        .revertedWith(
          'ARTHPool: ceiling reached.'
        )

      await expect(arthPool.mintFractionalARTH(ETH, ETH, ETH))
        .to
        .revertedWith(
          'ARTHPool: ceiling reached.'
        )
    })

    it(' - Should not mint when expected > minted', async () => {
      await arthController.setGlobalCollateralRatio(1e5);

      // Some portion of minted is taken as fee.
      await expect(arthPool.mintFractionalARTH(ETH, ETH.mul(9), ETH.mul(11)))
        .to
        .revertedWith(
          'ARTHPool: Slippage limit reached'
        )

      // Clear slippage.
      await expect(arthPool.mintFractionalARTH(ETH, ETH.mul(10), ETH.mul(11)))
        .to
        .revertedWith(
          'ARTHPool: Slippage limit reached'
        )
    })

    it(' - Should mint properly when all prices = 1', async () => {
      await arthController.setGlobalCollateralRatio(1e5);

      const totalSupplyBefore = await arth.totalSupply();
      const arthBalanceBefore = await arth.balanceOf(owner.address);

      const arthxTotalSupply = await arthx.totalSupply();
      const arthxBalanceBefore = await arthx.balanceOf(owner.address);

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const expectedMint = ETH.mul(10).sub(ETH.mul(10).div(1000))  // Since, Mint fee is 0.1 %.
      await arthPool.mintFractionalARTH(ETH, ETH.mul(9), expectedMint)

      expect(await arth.totalSupply())
        .to
        .eq(
          totalSupplyBefore.add(expectedMint)
        )

      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          arthBalanceBefore.add(expectedMint)
        )

      expect(await dai.balanceOf(owner.address))
        .to
        .eq(
          collateralBalanceBefore.sub(ETH)
        )

      expect(await dai.balanceOf(arthPool.address))
        .to
        .eq(
          poolCollateralBalanceBefore.add(ETH)
        )

      expect(await arthx.balanceOf(owner.address))
        .to
        .eq(
          arthxBalanceBefore.sub(ETH.mul(9))
        )

      expect(await arthx.totalSupply())
        .to
        .eq(
          arthxTotalSupply.sub(ETH.mul(9))
        )
    })
  })

  describe('- Redeem 1:1 ARTH', async () => {
    beforeEach(' - Approve ARTHX', async () => {
      await arth.approve(arthPool.address, ETH);
      await maha.approve(arthPool.address, ETH);
      await arthController.setGlobalCollateralRatio(1e6);
    })

    it(' - Should not redeem when CR != 1', async () => {
      await arthController.setGlobalCollateralRatio(0);

      await expect(arthPool.redeem1t1ARTH(ETH, 0))
        .to
        .revertedWith(
          'Collateral ratio must be == 1'
        )

      await expect(arthPool.redeem1t1ARTH(ETH, ETH))
        .to
        .revertedWith(
          'Collateral ratio must be == 1'
        )
    })

    it(' - Should not redeem if collateral low', async () => {
      await expect(arthPool.redeem1t1ARTH(ETH.mul(9), ETH))
        .to
        .revertedWith(
          'ARTHPool: Not enough collateral in pool'
        )
    })

    it(' - Should not redeem when expect > to be minted', async () => {
      // Making sure the pool has enough collateral to be redeemed.
      await dai.transfer(arthPool.address, ETH.mul(11));

      await expect(arthPool.redeem1t1ARTH(ETH, ETH.mul(11)))
        .to
        .revertedWith(
          'ARTHPool: Slippage limit reached'
        )
    })

    it(' - Should redeem properly when all prices = 1', async () => {
      // Making sure the pool has more than enough collateral.
      await dai.transfer(arthPool.address, ETH.mul(11));

      const arthTotalSupplyBefore = await arth.totalSupply();
      const arthBalanceBefore = await arth.balanceOf(owner.address);
      const mahaBalanceBefore = await maha.balanceOf(owner.address);

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const expectedCollateralRedeemed = ETH.sub(ETH.div(1000));  // Redemption fee is 0.1%.
      await arthPool.redeem1t1ARTH(ETH, expectedCollateralRedeemed);

      await advanceBlock(provider);  // Redemtion delay.
      await arthPool.collectRedemption();

      expect(await await dai.balanceOf(owner.address))
        .to
        .eq(
          collateralBalanceBefore.add(expectedCollateralRedeemed)
        );

      expect(await await dai.balanceOf(arthPool.address))
        .to
        .eq(
          poolCollateralBalanceBefore.sub(expectedCollateralRedeemed)
        );

      expect(await await arth.balanceOf(owner.address))
        .to
        .eq(
          arthBalanceBefore.sub(ETH)
        );

      expect(await await arth.totalSupply())
        .to
        .eq(
          arthTotalSupplyBefore.sub(ETH)
        );

      // TODO: use eq and proper amount in stability fee check.
      expect(await await maha.balanceOf(owner.address))
        .to
        .lt(mahaBalanceBefore);
    })
  })

  describe('- Redeem Fractional ARTH', async () => {
    beforeEach(' - Approve ARTHX', async () => {
      await arth.approve(arthPool.address, ETH);
      await maha.approve(arthPool.address, ETH);
      await arthController.setGlobalCollateralRatio(1e5);
    })

    it('- Should not redeem when CR not in range(0, 1)', async () => {
      await arthController.setGlobalCollateralRatio(0);
      await dai.transfer(arthPool.address, ETH.mul(3));

      await expect(arthPool.redeemFractionalARTH(ETH.mul(2), ETH, ETH))
        .to
        .revertedWith(
          'ARTHPool: Collateral ratio needs to be between .000001 and .999999'
        )

      await arthController.setGlobalCollateralRatio(1e6);
      await expect(arthPool.redeemFractionalARTH(ETH.mul(2), ETH, ETH))
        .to
        .revertedWith(
          'ARTHPool: Collateral ratio needs to be between .000001 and .999999'
        )
    })

    it('- Should not redeem when no collateral', async () => {
      await expect(arthPool.redeemFractionalARTH(ETH.mul(2), ETH, ETH.mul(2)))
        .to
        .revertedWith(
          'Not enough collateral in pool'
        )
    })

    it('- Should not redeem when expcted collateral > redeemable', async () => {
      await dai.transfer(arthPool.address, ETH.mul(3));

      await expect(arthPool.redeemFractionalARTH(ETH.mul(2), ETH, ETH.mul(3)))
        .to
        .revertedWith(
          'Slippage limit reached [collateral]'
        )
    })

    it('- Should not redeem when expected arthx > redeemable', async () => {
      await dai.transfer(arthPool.address, ETH.mul(3));

      const expectedARTHAmountPostFee = ETH.sub(ETH.div(1000));  // Redemption fee is 0.1%.
      const expectedCollateralRedeemed = expectedARTHAmountPostFee.mul(10).div(100);  // Since CR is 10%(1e5/1e6 * 100)
      const expectedArthxRedeemed = expectedARTHAmountPostFee.mul(90).div(100);

      await expect(arthPool.redeemFractionalARTH(ETH, expectedArthxRedeemed.add(1), expectedCollateralRedeemed))
        .to
        .revertedWith(
          'Slippage limit reached [ARTHX]'
        )
    })

    it(' - Should redeem properly when all prices = 1', async () => {
      // Making sure the pool has more than enough collateral.
      await dai.transfer(arthPool.address, ETH.mul(11));

      const arthTotalSupplyBefore = await arth.totalSupply();
      const arthBalanceBefore = await arth.balanceOf(owner.address);

      const arthxTotalSupplyBefore = await arthx.totalSupply();
      const arthxBalanceBefore = await arthx.balanceOf(owner.address);

      const mahaBalanceBefore = await maha.balanceOf(owner.address);

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const expectedARTHAmountPostFee = ETH.sub(ETH.div(1000));  // Redemption fee is 0.1%.
      const expectedCollateralRedeemed = expectedARTHAmountPostFee.mul(10).div(100);  // Since CR is 10%(1e5/1e6 * 100)
      const expectedArthxRedeemed = expectedARTHAmountPostFee.mul(90).div(100);
      await arthPool.redeemFractionalARTH(ETH, expectedArthxRedeemed, expectedCollateralRedeemed);

      await advanceBlock(provider);

      await arthPool.collectRedemption();

      expect(await dai.balanceOf(owner.address))
        .to
        .eq(collateralBalanceBefore.add(expectedCollateralRedeemed));

      expect(await dai.balanceOf(arthPool.address))
        .to
        .eq(poolCollateralBalanceBefore.sub(expectedCollateralRedeemed));

      expect(await arth.balanceOf(owner.address))
        .to
        .eq(arthBalanceBefore.sub(ETH));

      expect(await arth.totalSupply())
        .to
        .eq(arthTotalSupplyBefore.sub(ETH));

      expect(await arthx.balanceOf(owner.address))
        .to
        .eq(arthxBalanceBefore.add(expectedArthxRedeemed));

      expect(await arthx.totalSupply())
        .to
        .eq(arthxTotalSupplyBefore.add(expectedArthxRedeemed));

      // TODO: use eq and proper amount in stability fee check.
      expect(await await maha.balanceOf(owner.address))
        .to
        .lt(mahaBalanceBefore);
    })
  })

  describe('- Redeem Algorithmic ARTH', async () => {
    beforeEach(' - Approve ARTHX', async () => {
      await arth.approve(arthPool.address, ETH);
      await maha.approve(arthPool.address, ETH);
      await arthController.setGlobalCollateralRatio(0);
    })

    it('- Should not redeem when CR != 0', async () => {
      await arthController.setGlobalCollateralRatio(1e5);

      await expect(arthPool.redeemAlgorithmicARTH(ETH, ETH))
        .to
        .revertedWith(
          'Collateral ratio must be 0'
        )
    })

    it('- Should not redeem when expected > to be minted', async () => {
      await expect(arthPool.redeemAlgorithmicARTH(ETH, ETH))
        .to
        .revertedWith(
          'Slippage limit reached'
        )
    })

    it(' - Should redeem properly when all prices = 1', async () => {
      // Making sure the pool has more than enough collateral.
      await dai.transfer(arthPool.address, ETH.mul(11));

      const arthTotalSupplyBefore = await arth.totalSupply();
      const arthBalanceBefore = await arth.balanceOf(owner.address);

      const arthxTotalSupplyBefore = await arthx.totalSupply();
      const arthxBalanceBefore = await arthx.balanceOf(owner.address);

      const mahaBalanceBefore = await maha.balanceOf(owner.address);

      const expectedArthxRedeemed = ETH.sub(ETH.div(1000));   // Redemption fee is 0.1%.
      await arthPool.redeemAlgorithmicARTH(ETH, expectedArthxRedeemed);

      await advanceBlock(provider);  // Redemption delay.
      await arthPool.collectRedemption();

      expect(await arth.balanceOf(owner.address))
        .to
        .eq(arthBalanceBefore.sub(ETH));

      expect(await arth.totalSupply())
        .to
        .eq(arthTotalSupplyBefore.sub(ETH));

      expect(await arthx.balanceOf(owner.address))
        .to
        .eq(arthxBalanceBefore.add(expectedArthxRedeemed));

      expect(await arthx.totalSupply())
        .to
        .eq(arthxTotalSupplyBefore.add(expectedArthxRedeemed));

      // TODO: use eq and proper amount in stability fee check.
      expect(await await maha.balanceOf(owner.address))
        .to
        .lt(mahaBalanceBefore);
    })
  })

  describe('- Recollateralize ARTH', async () => {
    beforeEach(' - Approve collateral', async () => {
      await dai.approve(arthPool.address, ETH);
      await arthController.setGlobalCollateralRatio(1e4);
    })

    it(' - Should not recollateralize when paused', async () => {
      await arthPool.toggleRecollateralize();

      await expect(arthPool.recollateralizeARTH(ETH, 0))
        .to
        .revertedWith(
          'Recollateralize is paused'
        );

      await expect(arthPool.recollateralizeARTH(ETH, ETH))
        .to
        .revertedWith(
          'Recollateralize is paused'
        );
    })

    it(' - Should not recollateralize when expected ARTHX > to be minted', async () => {
      await expect(arthPool.recollateralizeARTH(ETH, ETH.mul(3)))
        .to
        .revertedWith(
          'Slippage limit reached'
        );
    })

    it(' - Should recollaterize properly when all prices = 1', async () => {
      await dai.transfer(arthPool.address, ETH);  // Ensuring that pool has some collateral.

      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const arthxTotalSupply = await arthx.totalSupply();

      const expectedMint = ETH.sub(ETH.div(1000))
      await arthPool.recollateralizeARTH(ETH, expectedMint);

      expect(await dai.balanceOf(owner.address))
        .to
        .eq(
          collateralBalanceBefore.sub(ETH)
        );

      expect(await dai.balanceOf(arthPool.address))
        .to
        .eq(
          poolCollateralBalanceBefore.add(ETH)
        );

      expect(await arthx.balanceOf(owner.address))
        .to
        .eq(
          arthxBalanceBefore.add(expectedMint)
        );

      expect(await arthx.totalSupply())
        .to
        .eq(
          arthxTotalSupply.add(expectedMint)
        );
    })

    it(' - Should recollaterize properly when all prices = 1 & pool has no collateral', async () => {
      const collateralBalanceBefore = await dai.balanceOf(owner.address);
      const poolCollateralBalanceBefore = await dai.balanceOf(arthPool.address);

      // Ensuring pool has no collateral at all.
      expect(await dai.balanceOf(arthPool.address))
        .to
        .eq(0)

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const arthxTotalSupply = await arthx.totalSupply();

      const expectedMint = ETH.sub(ETH.div(1000))
      await arthPool.recollateralizeARTH(ETH, expectedMint);

      expect(await dai.balanceOf(owner.address))
        .to
        .eq(
          collateralBalanceBefore.sub(ETH)
        );

      expect(await dai.balanceOf(arthPool.address))
        .to
        .eq(
          poolCollateralBalanceBefore.add(ETH)
        );

      expect(await arthx.balanceOf(owner.address))
        .to
        .eq(
          arthxBalanceBefore.add(expectedMint)
        );

      expect(await arthx.totalSupply())
        .to
        .eq(
          arthxTotalSupply.add(expectedMint)
        );
    })
  })

  describe('- Buyback ARTHX', async () => {
    beforeEach(' - Approve collateral', async () => {
      await arthx.approve(arthPool.address, ETH);
    })

    it(' - Should not buyback when paused', async () => {
      await arthPool.toggleBuyBack();

      await expect(arthPool.buyBackARTHX(ETH, 0))
        .to
        .revertedWith(
          'Buyback is paused'
        );

      await expect(arthPool.buyBackARTHX(ETH, ETH))
        .to
        .revertedWith(
          'Buyback is paused'
        );
    })

    it(' - Should not buyback when expected collateral > to be bought back', async () => {
      await dai.transfer(arthPool.address, await dai.balanceOf(owner.address));  // Should cause effect of excess collateral.

      await expect(arthPool.buyBackARTHX(ETH, ETH.mul(3)))
        .to
        .revertedWith(
          'Slippage limit reached'
        );
    })

    it(' - Should buyback properly when all prices = 1', async () => {
      await dai.transfer(arthPool.address, await dai.balanceOf(owner.address));  // Should causes effect of excess collateral.

      const daiBalanceBefore = await dai.balanceOf(owner.address);
      const poolsDaiBalanceBefore = await dai.balanceOf(arthPool.address);

      const arthxBalanceBefore = await arthx.balanceOf(owner.address);
      const totalSupplyBefore = await arthx.totalSupply();

      // Buyback fee is 0.1%.
      const expectedBuyback = ETH.sub(ETH.div(1000));
      await arthPool.buyBackARTHX(ETH, expectedBuyback)

      expect(await dai.balanceOf(owner.address))
        .to
        .eq(
          daiBalanceBefore.add(expectedBuyback)
        )

      expect(await dai.balanceOf(arthPool.address))
        .to
        .eq(
          poolsDaiBalanceBefore.sub(expectedBuyback)
        )

      expect(await arthx.balanceOf(owner.address))
        .to
        .eq(
          arthxBalanceBefore.sub(ETH)
        )

      expect(await arthx.totalSupply())
        .to
        .eq(
          totalSupplyBefore.sub(ETH)
        )
    })
  })
})
