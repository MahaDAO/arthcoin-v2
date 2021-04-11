import { ethers } from 'hardhat';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract, ContractFactory, BigNumber, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';


chai.use(solidity);


describe('ARTHPool', () => {
  const ETH = utils.parseEther('1');

  let owner: SignerWithAddress;
  let whale: SignerWithAddress;

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
    [owner, whale] = await ethers.getSigners();

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
    arthController.setETHGMUOracle(chainlinkETHGMUOracle.address);
    await arth.addPool(arthPool.address);
    await arthController.addPool(arthPool.address);
    await arthController.setGlobalCollateralRatio(0);
    await arthx.setArthController(arthController.address);
    await arthPool.setCollatETHOracle(daiETHUniswapOracle.address, owner.address);
    await arthController.setARTHXETHOracle(arthxETHUniswapOracle.address, owner.address);
    await arthPool.setPoolParameters(
      ETH.mul(2),
      1500,
      1000,
      1000,
      1000,
      1000
    );
    await arthPool.setRecollateralizationCurve(recollaterizationCurve.address);
  })

  describe('- Mint 1:1 ARTH', async () => {
    beforeEach(' - Approve collateral', async () => {
      dai.approve(arthPool.address, ETH);
    })

    it(' - Should mint properly', async () => {
      await arthController.setGlobalCollateralRatio(1e6);

      const daiBeforeMint = await dai.balanceOf(owner.address);
      const arthBalanceBeforeMint = await arth.balanceOf(owner.address);
      const collateralArthPoolBalanceBeforeMint = await dai.balanceOf(arthPool.address);

      const expectedMint = ETH.sub(ETH.div(1000)); // 1e18 - 1e15

      await arthPool.mint1t1ARTH(ETH, expectedMint);

      expect(await dai.balanceOf(arthPool.address))
        .to
        .eq(collateralArthPoolBalanceBeforeMint.add(ETH));

      expect(await dai.balanceOf(owner.address))
        .to
        .eq(daiBeforeMint.sub(ETH));

      expect(await arth.balanceOf(owner.address))
        .to
        .eq(arthBalanceBeforeMint.add(expectedMint));
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

      const expectedMint = ETH.sub(ETH.div(1000)); // 1e18 - 1e15
      await expect(arthPool.mint1t1ARTH(ETH, expectedMint))
        .to
        .revertedWith(
          'ARHTPool: Collateral ratio < 1'
        );
    })

    it(' - Should not mint when collateral > celing', async () => {
      await arthController.setGlobalCollateralRatio(1e6);

      await expect(arthPool.mint1t1ARTH(ETH.mul(3), 0))
        .to
        .revertedWith(
          'ARTHPool: ceiling reached'
        );

      await dai.transfer(arthPool.address, ETH.mul(2))
      await expect(arthPool.mint1t1ARTH(ETH, ETH))
        .to
        .revertedWith(
          'ARTHPool: ceiling reached'
        );

      const expectedMint = ETH.sub(ETH.div(1000)); // 1e18 - 1e15
      await expect(arthPool.mint1t1ARTH(ETH, expectedMint))
        .to
        .revertedWith(
          'ARTHPool: ceiling reached'
        );
    })

    it(' - Should not mint when expected > to be minted', async () => {
      await arthController.setGlobalCollateralRatio(1e6);

      // Some portion of minted is taken as mint fee.
      await expect(arthPool.mint1t1ARTH(ETH, ETH))
        .to
        .revertedWith(
          'ARTHPool: Slippage limit reached'
        );

      await expect(arthPool.mint1t1ARTH(ETH, ETH.mul(2)))
        .to
        .revertedWith(
          'ARTHPool: Slippage limit reached'
        );
    })
  })

  describe('- Mint Algorithmic ARTH', async () => {
    beforeEach(' - Approve ARTHX', async () => {
      arthx.approve(arthPool.address, ETH);
    })

    it(' - Should mint properly', async () => {
      await arthController.setGlobalCollateralRatio(0);

      const expectedMint = ETH.sub(ETH.div(1000)); // 1e18 - 1e15

      await arthPool.mintAlgorithmicARTH(ETH, expectedMint);
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

      // Some portion of minted is taken as mint fee.
      await expect(arthPool.mintAlgorithmicARTH(ETH, ETH))
        .to
        .revertedWith(
          'Slippage limit reached'
        );

      await expect(arthPool.mintAlgorithmicARTH(ETH, ETH.mul(2)))
        .to
        .revertedWith(
          'Slippage limit reached'
        );
    })
  })

  describe('- Mint Fractional ARTH', async () => {
    beforeEach(' - Approve DAI & ARTHX', async () => {
      dai.approve(arthPool.address, ETH);
      arthx.approve(arthPool.address, ETH.mul(9));
    })

    it(' - Should mint properly', async () => {
      await arthController.setGlobalCollateralRatio(1e5);

      // Since total collateral now transfered is 10times.
      // (1 via DAI and 9 via ARTHX as CR = 0.1), Since GlobalCR = 10%.
      const expectedMint = ETH.mul(10).sub(ETH.mul(10).div(1000)); // 10e18 - 10e15

      await arthPool.mintFractionalARTH(ETH, ETH.mul(9), expectedMint);
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

      await expect(arthPool.mintFractionalARTH(ETH, ETH.mul(10), ETH.mul(11)))
        .to
        .revertedWith(
          'ARTHPool: Slippage limit reached'
        )
    })
  })

  describe('- Redeem 1:1 ARTH', async () => {
    beforeEach(' - Approve ARTHX', async () => {
      arth.approve(arthPool.address, ETH);
    })

    it(' - Should not redeem when CR != 0', async () => {
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

    it(' - Should not redeem if pools collateral balance is low', async () => {
      await arthController.setGlobalCollateralRatio(1e6);

      await expect(arthPool.redeem1t1ARTH(ETH.mul(9), ETH)).to.revertedWith(
        'ARTHPool: Not enough collateral in pool'
      )
    })

    it(' - Should throw error related to slipage', async () => {
      await arthController.setGlobalCollateralRatio(1e6);
      await dai.transfer(arthPool.address, ETH.mul(11));

      await expect(arthPool.redeem1t1ARTH(ETH, ETH.mul(11)))
        .to
        .revertedWith(
          'ARTHPool: Slippage limit reached'
        )
    })
  })

  describe('- Redeem Fractional ARTH', async () => {
    beforeEach(' - Approve ARTHX', async () => {
      arth.approve(arthPool.address, ETH);
      dai.approve(arthPool.address, ETH);
    })

    it('- Collateral Ratio Redeem Range', async () => {
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

    it('- Not Enough Collateral Balance', async () => {
      await arthController.setGlobalCollateralRatio(1e5);
      //await dai.transfer(arthPool.address, ETH.mul(3));

      await expect(arthPool.redeemFractionalARTH(ETH.mul(2), ETH, ETH.mul(2)))
        .to
        .revertedWith(
          'Not enough collateral in pool'
        )
    })

    it('- Slipage test collateral', async () => {
      await arthController.setGlobalCollateralRatio(1e5);
      await dai.transfer(arthPool.address, ETH.mul(3));

      await expect(arthPool.redeemFractionalARTH(ETH.mul(2), ETH, ETH.mul(3)))
        .to
        .revertedWith(
          'Slippage limit reached [collateral]'
        )
    })

    // TODO: check the below test.
    it('- Slipage test arthx', async () => {
      await arthController.setGlobalCollateralRatio(1e5);
      await dai.transfer(arthPool.address, ETH.mul(3));

      // TODO: check the argument values.
      await expect(arthPool.redeemFractionalARTH(ETH, ETH.mul(4), ETH.mul(80).div(100))) // Reducing expected collatOutMin by 50%.
        .to
        .revertedWith(
          'Slippage limit reached [ARTHX]'
        )
    })
  })

  describe('- Redeem Algorithmic ARTH', async () => {
    beforeEach(' - Approve ARTHX', async () => {
      arth.approve(arthPool.address, ETH);
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
      await arthController.setGlobalCollateralRatio(0);

      await expect(arthPool.redeemAlgorithmicARTH(ETH, ETH))
        .to
        .revertedWith(
          'Slippage limit reached'
        )
    })
  })

  describe('- Recollateralize ARTH', async () => {
    beforeEach(' - Approve collateral', async () => {
      dai.approve(arthPool.address, ETH);
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
  })

  describe('- Buyback ARTHX', async () => {
    beforeEach(' - Approve collateral', async () => {
      arthx.approve(arthPool.address, ETH);
    })

    it(' - Should not recollateralize when paused', async () => {
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

    it(' - Should not recollateralize when expected collateral > to be bought back', async () => {
      await dai.transfer(arthPool.address, await dai.balanceOf(owner.address)); // Causes effect of excess collateral.

      await expect(arthPool.buyBackARTHX(ETH, ETH.mul(3)))
        .to
        .revertedWith(
          'Slippage limit reached'
        );
    })
  })
})
