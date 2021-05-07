import { ethers } from 'hardhat';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract, ContractFactory, BigNumber, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import { advanceBlock } from './utilities';

chai.use(solidity);

describe('Staking Reward', () => {
  const { provider } = ethers;

  const ETH = utils.parseEther('1');
  const HALF_ETH = ETH.mul(50).div(100);

  let owner: SignerWithAddress;
  let whale: SignerWithAddress;
  let whale2: SignerWithAddress;
  let timelock: SignerWithAddress;

  let ARTH: ContractFactory;
  let MAHA: ContractFactory;
  let ARTHX: ContractFactory;
  let SimpleOracle: ContractFactory;
  let MockCollateral: ContractFactory;
  let ARTHController: ContractFactory;
  let BoostedStaking: ContractFactory;
  let MockUniswapOracle: ContractFactory;
  let ChainlinkETHGMUOracle: ContractFactory;
  let MockChainlinkAggregatorV3: ContractFactory;

  let dai: Contract;
  let arth: Contract;
  let maha: Contract;
  let arthx: Contract;
  let gmuOracle: Contract;
  let boostedStaking: Contract;
  let arthMahaOracle: Contract;
  let arthController: Contract;
  let daiETHUniswapOracle: Contract;
  let arthETHUniswapOracle: Contract;
  let chainlinkETHGMUOracle: Contract;
  let arthxETHUniswapOracle: Contract;
  let mockChainlinkAggregatorV3: Contract;

  before(' - Setup accounts', async () => {
    [owner, whale, whale2, timelock] = await ethers.getSigners();
  });

  before(' - Fetch contract factories', async () => {
    MAHA = await ethers.getContractFactory('MahaToken');
    ARTHX = await ethers.getContractFactory('ARTHShares');
    ARTH = await ethers.getContractFactory('ARTHStablecoin');
    MockCollateral = await ethers.getContractFactory('MockCollateral');
    SimpleOracle = await ethers.getContractFactory('SimpleOracle');
    ARTHController = await ethers.getContractFactory('ArthController');
    BoostedStaking = await ethers.getContractFactory('BoostedStaking');
    MockUniswapOracle = await ethers.getContractFactory('MockUniswapPairOracle');
    ChainlinkETHGMUOracle = await ethers.getContractFactory('ChainlinkETHUSDPriceConsumer');
    MockChainlinkAggregatorV3 = await ethers.getContractFactory('MockChainlinkAggregatorV3');
  });

  beforeEach(' - Deploy contracts', async () => {
    arth = await ARTH.deploy();
    maha = await MAHA.deploy();
    dai = await MockCollateral.deploy(owner.address, ETH.mul(10000), 'DAI', 18);

    gmuOracle = await SimpleOracle.deploy('GMU/USD', ETH.div(1e12)); // Keep the price of gmuOracle as 1e6 for simplicity sake.
    daiETHUniswapOracle = await MockUniswapOracle.deploy();
    arthETHUniswapOracle = await MockUniswapOracle.deploy();
    arthxETHUniswapOracle = await MockUniswapOracle.deploy();
    arthMahaOracle = await SimpleOracle.deploy('ARTH/MAHA', ETH.div(1e12)); // Keep the price of gmuOracle as 1e6 for simplicity sake.
    mockChainlinkAggregatorV3 = await MockChainlinkAggregatorV3.deploy();

    chainlinkETHGMUOracle = await ChainlinkETHGMUOracle.deploy(
      mockChainlinkAggregatorV3.address,
      gmuOracle.address
    );

    arthx = await ARTHX.deploy(
      arthxETHUniswapOracle.address,
      owner.address,
      owner.address
    );
    arthController = await ARTHController.deploy(
      arth.address,
      owner.address,
      owner.address
    );

    boostedStaking = await BoostedStaking.deploy(
      owner.address,
      owner.address,
      maha.address,
      arth.address,
      arthController.address,
      timelock.address,
      1000
    );
  });

  beforeEach(' - Set some contract variables', async () => {
    arthController.setETHGMUOracle(chainlinkETHGMUOracle.address);
    await arthx.setARTHAddress(arth.address);
    await arthController.setGlobalCollateralRatio(0);
    await arthx.setArthController(arthController.address);
    await arthController.setARTHXETHOracle(arthxETHUniswapOracle.address, owner.address);
    await boostedStaking.setArthController(arthController.address);

    await arth.transfer(whale.address, ETH.mul(1000));
    await arth.transfer(whale2.address, ETH.mul(1000));

    await mockChainlinkAggregatorV3.setLatestPrice(ETH.div(1e10));  // Keep the price of mock chainlink oracle as 1e8 for simplicity sake.

    await maha.transfer(boostedStaking.address, ETH.mul(1000000));
    await boostedStaking.initializeDefault();
  });

  describe('- Stake', async () => {
    beforeEach(' - Approve staking token', async () => {
      await arth.approve(boostedStaking.address, ETH.mul(2));
      await arth.connect(whale).approve(boostedStaking.address, ETH.mul(2));
    });

    it(' - Should work for 1 account', async () => {
      const ownerARTHBalanceBefore = await arth.balanceOf(owner.address);
      const contractARTHBalanceBefore = await arth.balanceOf(boostedStaking.address);

      await expect(boostedStaking.stake(ETH))
        .to
        .emit(boostedStaking, 'Staked')
        .withArgs(owner.address, ETH);

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH)
        );

      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          ownerARTHBalanceBefore.sub(ETH)
        );

      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH);

      expect(await boostedStaking.unlockedBalanceOf(owner.address))
        .to
        .eq(ETH);

      // Stake once again.
      await expect(boostedStaking.stake(ETH))
        .to
        .emit(boostedStaking, 'Staked')
        .withArgs(owner.address, ETH);

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH).add(ETH)
        );
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          ownerARTHBalanceBefore.sub(ETH).sub(ETH)
        );
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH.add(ETH));
      expect(await boostedStaking.unlockedBalanceOf(owner.address))
        .to
        .eq(ETH.add(ETH));
    });

    it(' - Should work for 2 accounts with same amounts', async () => {
      const ownerARTHBalanceBefore = await arth.balanceOf(owner.address);
      const whaleARTHBalanceBefore = await arth.balanceOf(whale.address);
      const contractARTHBalanceBefore = await arth.balanceOf(boostedStaking.address);

      await expect(boostedStaking.stake(ETH))
        .to
        .emit(boostedStaking, 'Staked')
        .withArgs(owner.address, ETH);

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH)
        );
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          ownerARTHBalanceBefore.sub(ETH)
        );
      expect(await arth.balanceOf(whale.address))
        .to
        .eq(whaleARTHBalanceBefore);
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH);
      expect(await boostedStaking.unlockedBalanceOf(owner.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.unlockedBalanceOf(whale.address))
        .to
        .eq(0);

      await expect(boostedStaking.connect(whale).stake(ETH))
        .to
        .emit(boostedStaking, 'Staked')
        .withArgs(whale.address, ETH);

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH).add(ETH)
        )
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          ownerARTHBalanceBefore.sub(ETH)
        );
      expect(await arth.balanceOf(whale.address))
        .to
        .eq(
          whaleARTHBalanceBefore.sub(ETH)
        );
      expect(await boostedStaking.totalSupply())
        .to
        .eq(
          ETH.add(ETH)
        );
      expect(await boostedStaking.unlockedBalanceOf(owner.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.unlockedBalanceOf(whale.address))
        .to
        .eq(ETH);
    });

    it(' - Should work for 2 accounts with different amounts', async () => {
      const ownerARTHBalanceBefore = await arth.balanceOf(owner.address);
      const whaleARTHBalanceBefore = await arth.balanceOf(whale.address);
      const contractARTHBalanceBefore = await arth.balanceOf(boostedStaking.address);

      await expect(boostedStaking.stake(ETH))
        .to
        .emit(boostedStaking, 'Staked')
        .withArgs(owner.address, ETH);
      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH)
        );
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          ownerARTHBalanceBefore.sub(ETH)
        );
      expect(await arth.balanceOf(whale.address))
        .to
        .eq(whaleARTHBalanceBefore);
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH);
      expect(await boostedStaking.unlockedBalanceOf(owner.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.unlockedBalanceOf(whale.address))
        .to
        .eq(0);

      await expect(boostedStaking.connect(whale).stake(ETH.mul(2)))
        .to
        .emit(boostedStaking, 'Staked')
        .withArgs(whale.address, ETH.mul(2));
      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH).add(ETH).add(ETH)
        );
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          ownerARTHBalanceBefore.sub(ETH)
        );
      expect(await arth.balanceOf(whale.address))
        .to
        .eq(
          whaleARTHBalanceBefore.sub(ETH).sub(ETH)
        );
      expect(await boostedStaking.totalSupply())
        .to
        .eq(
          ETH.add(ETH).add(ETH)
        );
      expect(await boostedStaking.unlockedBalanceOf(owner.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.unlockedBalanceOf(whale.address))
        .to
        .eq(
          ETH.add(ETH)
        );
    });

    it(' - Should fail for grey listed addresses', async () => {
      await boostedStaking.greylistAddress(owner.address);
      await expect(boostedStaking.stake(ETH))
        .to
        .revertedWith('address has been greylisted');

      await boostedStaking.greylistAddress(whale.address);
      await expect(boostedStaking.connect(whale).stake(ETH))
        .to
        .revertedWith('address has been greylisted');
    });
  });

  describe('- Stake for', async () => {
    beforeEach(' - Approve staking token', async () => {
      await arth.approve(boostedStaking.address, ETH.mul(2));
      await arth.connect(whale).approve(boostedStaking.address, ETH.mul(2));
      await arth.connect(whale2).approve(boostedStaking.address, ETH.mul(2));
    });

     it(' - Should fail if called by non pool address', async () => {
      await expect(boostedStaking.connect(whale).stakeFor(whale2.address, ETH))
        .to
        .revertedWith('Staking: FORBIDDEN');

      await expect(boostedStaking.connect(timelock).stakeFor(whale2.address, ETH))
        .to
        .revertedWith('Staking: FORBIDDEN');

      await expect(boostedStaking.connect(whale2).stakeFor(whale2.address, ETH))
        .to
        .revertedWith('Staking: FORBIDDEN');
    });

    it(' - Should fail for grey listed addresses', async () => {
      await boostedStaking.greylistAddress(whale.address);
      await expect(boostedStaking.stakeFor(whale.address, ETH))
        .to
        .revertedWith('address has been greylisted');

      await boostedStaking.greylistAddress(whale2.address);
      await expect(boostedStaking.stakeFor(whale2.address, ETH))
        .to
        .revertedWith('address has been greylisted');
    });

    it(' - Should work for 1 account', async () => {
      const ownerARTHBalanceBefore = await arth.balanceOf(owner.address);
      const whaleARTHBalanceBefore = await arth.balanceOf(whale.address);
      const contractARTHBalanceBefore = await arth.balanceOf(boostedStaking.address);

      await expect(boostedStaking.connect(owner).stakeFor(whale.address, ETH))
        .to
        .emit(boostedStaking, 'Staked')
        .withArgs(whale.address, ETH)

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH)
        );
      expect(await arth.balanceOf(whale.address))
        .to
        .eq(
          whaleARTHBalanceBefore.sub(ETH)
        );
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          ownerARTHBalanceBefore
        );
      expect(await boostedStaking.totalSupply())
        .to
        .eq(
          ETH
        );
      expect(await boostedStaking.unlockedBalanceOf(whale.address))
        .to
        .eq(
          ETH
        );
      expect(await boostedStaking.unlockedBalanceOf(owner.address))
        .to
        .eq(
          0
        );
    });

    it(' - Should work for 2 accounts with same amounts', async () => {
      const ownerARTHBalanceBefore = await arth.balanceOf(owner.address);
      const whaleARTHBalanceBefore = await arth.balanceOf(whale.address);
      const whale2ARTHBalanceBefore = await arth.balanceOf(whale2.address);
      const contractARTHBalanceBefore = await arth.balanceOf(boostedStaking.address);

      await expect(boostedStaking.connect(owner).stakeFor(whale.address, ETH))
        .to
        .emit(boostedStaking, 'Staked')
        .withArgs(whale.address, ETH)
      await expect(boostedStaking.connect(owner).stakeFor(whale2.address, ETH))
        .to
        .emit(boostedStaking, 'Staked')
        .withArgs(whale2.address, ETH)

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH).add(ETH)
        );

      expect(await arth.balanceOf(whale.address))
        .to
        .eq(
          whaleARTHBalanceBefore.sub(ETH)
        );
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(ownerARTHBalanceBefore);
      expect(await arth.balanceOf(whale2.address))
        .to
        .eq(
          whale2ARTHBalanceBefore.sub(ETH)
        );
      expect(await boostedStaking.totalSupply())
        .to
        .eq(
          ETH.mul(2)
        );
      expect(await boostedStaking.unlockedBalanceOf(whale.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.unlockedBalanceOf(whale2.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.unlockedBalanceOf(owner.address))
        .to
        .eq(0);
    });

    it(' - Should work for 2 accounts with different amounts', async () => {
      const ownerARTHBalanceBefore = await arth.balanceOf(owner.address);
      const whaleARTHBalanceBefore = await arth.balanceOf(whale.address);
      const whale2ARTHBalanceBefore = await arth.balanceOf(whale2.address);
      const contractARTHBalanceBefore = await arth.balanceOf(boostedStaking.address);

      await expect(boostedStaking.connect(owner).stakeFor(whale.address, ETH))
        .to
        .emit(boostedStaking, 'Staked')
        .withArgs(whale.address, ETH)
      await expect(boostedStaking.connect(owner).stakeFor(whale2.address, ETH.mul(2)))
        .to
        .emit(boostedStaking, 'Staked')
        .withArgs(whale2.address, ETH.mul(2))

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH).add(ETH).add(ETH)
        );
      expect(await arth.balanceOf(whale.address))
        .to
        .eq(
          whaleARTHBalanceBefore.sub(ETH)
        );
      expect(await arth.balanceOf(whale2.address))
        .to
        .eq(
          whale2ARTHBalanceBefore.sub(ETH.mul(2))
        );
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          ownerARTHBalanceBefore
        );
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH.mul(3));
      expect(await boostedStaking.unlockedBalanceOf(whale.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.unlockedBalanceOf(whale2.address))
        .to
        .eq(ETH.mul(2));
      expect(await boostedStaking.unlockedBalanceOf(owner.address))
        .to
        .eq(0);
    });
  });

  describe('- Stake locked', async () => {
    beforeEach(' - Approve staking token', async () => {
      await arth.approve(boostedStaking.address, ETH.mul(2));
      await arth.connect(whale).approve(boostedStaking.address, ETH.mul(2));
      await arth.connect(whale2).approve(boostedStaking.address, ETH.mul(2));
    });

    it(' - Should fail for grey listed addresses', async () => {
      await boostedStaking.greylistAddress(owner.address);
      await expect(boostedStaking.stakeLocked(ETH, 41472000))
        .to
        .revertedWith('address has been greylisted');

      await boostedStaking.greylistAddress(whale.address);
      await expect(boostedStaking.connect(whale).stakeLocked(ETH, 41472000))
        .to
        .revertedWith('address has been greylisted');
    });

    it(' - Should not work lockTime = 0', async () => {
      await expect(boostedStaking.stakeLocked(ETH, 0))
        .to
        .revertedWith('Cannot wait for a negative number');
    });

    it(' - Should not work for lockTime < 7 days', async () => {
      await arth.connect(owner).approve(boostedStaking.address, ETH);
      await expect(boostedStaking.stakeLocked(ETH, 604700))
        .to
        .revertedWith('Minimum stake time not met (' + 604800 + ')');
    });

    it(' - Should not work for lockTime > 3Y', async () => {
      await arth.connect(owner).approve(boostedStaking.address, ETH);
      await expect(boostedStaking.stakeLocked(ETH, 94608001))
        .to
        .revertedWith('You are trying to stake for too long');
    });

    it(' - Should work for 1 account', async () => {
      const ownerARTHBalanceBefore = await arth.balanceOf(owner.address);
      const contractARTHBalanceBefore = await arth.balanceOf(boostedStaking.address);

      await expect(boostedStaking.stakeLocked(ETH, 41472000))
        .to
        .emit(boostedStaking, 'StakeLocked')
        .withArgs(owner.address, ETH, 41472000);

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH)
        );

      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          ownerARTHBalanceBefore.sub(ETH)
        );

      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH);

      expect(await boostedStaking.lockedBalanceOf(owner.address))
        .to
        .eq(ETH);

      // Stake once again.
      await expect(boostedStaking.stakeLocked(ETH, 41472000))
        .to
        .emit(boostedStaking, 'StakeLocked')
        .withArgs(owner.address, ETH, 41472000);

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH).add(ETH)
        );
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          ownerARTHBalanceBefore.sub(ETH).sub(ETH)
        );
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH.add(ETH));
      expect(await boostedStaking.lockedBalanceOf(owner.address))
        .to
        .eq(ETH.add(ETH));
    });

    it(' - Should work for 2 accounts with same amount', async () => {
      const ownerARTHBalanceBefore = await arth.balanceOf(owner.address);
      const whaleARTHBalanceBefore = await arth.balanceOf(whale.address);
      const contractARTHBalanceBefore = await arth.balanceOf(boostedStaking.address);

      await expect(boostedStaking.stakeLocked(ETH, 41472000))
        .to
        .emit(boostedStaking, 'StakeLocked')
        .withArgs(owner.address, ETH, 41472000);

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH)
        );
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          ownerARTHBalanceBefore.sub(ETH)
        );
      expect(await arth.balanceOf(whale.address))
        .to
        .eq(whaleARTHBalanceBefore);
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH);
      expect(await boostedStaking.lockedBalanceOf(owner.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.lockedBalanceOf(whale.address))
        .to
        .eq(0);

      await expect(await boostedStaking.connect(whale).stakeLocked(ETH, 41472000))
        .to
        .emit(boostedStaking, 'StakeLocked')
        .withArgs(whale.address, ETH, 41472000);

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH).add(ETH)
        )
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          ownerARTHBalanceBefore.sub(ETH)
        );
      expect(await arth.balanceOf(whale.address))
        .to
        .eq(
          whaleARTHBalanceBefore.sub(ETH)
        );
      expect(await boostedStaking.totalSupply())
        .to
        .eq(
          ETH.add(ETH)
        );
      expect(await boostedStaking.lockedBalanceOf(owner.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.lockedBalanceOf(whale.address))
        .to
        .eq(ETH);
    });

    it(' - Should work for 2 accounts with different amounts', async () => {
      const ownerARTHBalanceBefore = await arth.balanceOf(owner.address);
      const whaleARTHBalanceBefore = await arth.balanceOf(whale.address);
      const contractARTHBalanceBefore = await arth.balanceOf(boostedStaking.address);

      await expect(await boostedStaking.stakeLocked(ETH, 41472000))
        .to
        .emit(boostedStaking, 'StakeLocked')
        .withArgs(owner.address, ETH, 41472000);

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH)
        );
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          ownerARTHBalanceBefore.sub(ETH)
        );
      expect(await arth.balanceOf(whale.address))
        .to
        .eq(whaleARTHBalanceBefore);
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH);
      expect(await boostedStaking.lockedBalanceOf(owner.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.lockedBalanceOf(whale.address))
        .to
        .eq(0);

      await expect(await boostedStaking.connect(whale).stakeLocked(ETH.mul(2), 41472000))
        .to
        .emit(boostedStaking, 'StakeLocked')
        .withArgs(whale.address, ETH.mul(2), 41472000);

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH).add(ETH).add(ETH)
        );
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          ownerARTHBalanceBefore.sub(ETH)
        );
      expect(await arth.balanceOf(whale.address))
        .to
        .eq(
          whaleARTHBalanceBefore.sub(ETH).sub(ETH)
        );
      expect(await boostedStaking.totalSupply())
        .to
        .eq(
          ETH.add(ETH).add(ETH)
        );
      expect(await boostedStaking.lockedBalanceOf(owner.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.lockedBalanceOf(whale.address))
        .to
        .eq(
          ETH.add(ETH)
        );
    });
  });

  describe('- Stake locked for', async () => {
    beforeEach(' - Approve staking token', async () => {
      await arth.approve(boostedStaking.address, ETH.mul(2));
      await arth.connect(whale).approve(boostedStaking.address, ETH.mul(2));
      await arth.connect(whale2).approve(boostedStaking.address, ETH.mul(2));
    });

    it(' - Should fail if called by non pool address', async () => {
      await expect(boostedStaking.connect(whale).stakeLockedFor(whale.address, ETH, 41472000))
        .to
        .revertedWith('Staking: FORBIDDEN');

      await expect(boostedStaking.connect(timelock).stakeLockedFor(whale.address, ETH, 41472000))
        .to
        .revertedWith('Staking: FORBIDDEN');

      await expect(boostedStaking.connect(whale2).stakeLockedFor(whale2.address, ETH, 41472000))
        .to
        .revertedWith('Staking: FORBIDDEN');
    });

    it(' - Should fail for grey listed addresses', async () => {
      await boostedStaking.greylistAddress(whale.address);
      await expect(boostedStaking.stakeLockedFor(whale.address, ETH, 41472000))
        .to
        .revertedWith('address has been greylisted');

      await boostedStaking.greylistAddress(whale2.address);
      await expect(boostedStaking.connect(owner).stakeLockedFor(whale2.address, ETH, 41472000))
        .to
        .revertedWith('address has been greylisted');
    });

    it(' - Should not work lockTime = 0', async () => {
      await expect(boostedStaking.stakeLockedFor(whale.address, ETH, 0))
        .to
        .revertedWith('Cannot wait for a negative number');
    });

    it(' - Should not work for lockTime < 7 days.', async () => {
      await arth.connect(owner).approve(boostedStaking.address, ETH);
      await expect(boostedStaking.stakeLockedFor(whale.address, ETH, 604700))
        .to
        .revertedWith('Minimum stake time not met (' + 604800 + ')');
    });

    it(' - Should not work for lockTime > 3Y', async () => {
      await arth.connect(owner).approve(boostedStaking.address, ETH);
      await expect(boostedStaking.stakeLockedFor(whale.address, ETH, 94608001))
        .to
        .revertedWith('You are trying to stake for too long');
    });

    it(' - Should work for 1 account', async () => {
      const ownerARTHBalanceBefore = await arth.balanceOf(owner.address);
      const whaleARTHBalanceBefore = await arth.balanceOf(whale.address);
      const contractARTHBalanceBefore = await arth.balanceOf(boostedStaking.address);

      await expect(boostedStaking.connect(owner).stakeLockedFor(whale.address, ETH, 41472000))
        .to
        .emit(boostedStaking, 'StakeLocked')
        .withArgs(whale.address, ETH, 41472000);

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH)
        );
      expect(await arth.balanceOf(whale.address))
        .to
        .eq(
          whaleARTHBalanceBefore.sub(ETH)
        );
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(ownerARTHBalanceBefore);
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH);
      expect(await boostedStaking.lockedBalanceOf(whale.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.lockedBalanceOf(owner.address))
        .to
        .eq(0);
    });

    it(' - Should work for 2 accounts with same amount', async () => {
      const ownerARTHBalanceBefore = await arth.balanceOf(owner.address);
      const whaleARTHBalanceBefore = await arth.balanceOf(whale.address);
      const whale2ARTHBalanceBefore = await arth.balanceOf(whale2.address);
      const contractARTHBalanceBefore = await arth.balanceOf(boostedStaking.address);

      await expect(boostedStaking.connect(owner).stakeLockedFor(whale.address, ETH, 41472000))
        .to
        .emit(boostedStaking, 'StakeLocked')
        .withArgs(whale.address, ETH, 41472000);

      await expect(boostedStaking.connect(owner).stakeLockedFor(whale2.address, ETH, 41472000))
        .to
        .emit(boostedStaking, 'StakeLocked')
        .withArgs(whale2.address, ETH, 41472000);

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add(ETH).add(ETH)
        );

      expect(await arth.balanceOf(whale.address))
        .to
        .eq(
          whaleARTHBalanceBefore.sub(ETH)
        );
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(ownerARTHBalanceBefore);
      expect(await arth.balanceOf(whale2.address))
        .to
        .eq(
          whale2ARTHBalanceBefore.sub(ETH)
        );
      expect(await boostedStaking.totalSupply())
        .to
        .eq(
          ETH.mul(2)
        );
      expect(await boostedStaking.lockedBalanceOf(whale.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.lockedBalanceOf(whale2.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.lockedBalanceOf(owner.address))
        .to
        .eq(0);
    });

    it(' - Should work for 2 accounts with different amounts', async () => {
      const ownerARTHBalanceBefore = await arth.balanceOf(owner.address);
      const whaleARTHBalanceBefore = await arth.balanceOf(whale.address);
      const whale2ARTHBalanceBefore = await arth.balanceOf(whale2.address);
      const contractARTHBalanceBefore = await arth.balanceOf(boostedStaking.address);

      await expect(boostedStaking.connect(owner).stakeLockedFor(whale.address, ETH, 41472000))
        .to
        .emit(boostedStaking, 'StakeLocked')
        .withArgs(whale.address, ETH, 41472000);
      await expect(boostedStaking.connect(owner).stakeLockedFor(whale2.address, ETH.mul(2), 41472000))
        .to
        .emit(boostedStaking, 'StakeLocked')
        .withArgs(whale2.address, ETH.mul(2), 41472000);

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          contractARTHBalanceBefore.add((ETH).mul(3))
        );
      expect(await arth.balanceOf(whale.address))
        .to
        .eq(
          whaleARTHBalanceBefore.sub(ETH)
        );
      expect(await arth.balanceOf(whale2.address))
        .to
        .eq(
          whale2ARTHBalanceBefore.sub(ETH.mul(2))
        );
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          ownerARTHBalanceBefore
        );
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH.mul(3));
      expect(await boostedStaking.lockedBalanceOf(whale.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.lockedBalanceOf(whale2.address))
        .to
        .eq(ETH.mul(2));
      expect(await boostedStaking.lockedBalanceOf(owner.address))
        .to
        .eq(0);
    });
  });

  describe('- Withdraw', async() => {
    beforeEach(' - Approve staking token', async () => {
      await arth.approve(boostedStaking.address, ETH.mul(2));
      await arth.connect(whale).approve(boostedStaking.address, ETH.mul(2));
      await arth.connect(whale2).approve(boostedStaking.address, ETH.mul(2));
    });

    it(' - Should fail for amount = 0', async () => {
      await expect(boostedStaking.withdraw(0))
        .to
        .revertedWith('Cannot withdraw 0');
    });

    it(' - Should not withdraw for non staker', async() => {
      await expect(boostedStaking.connect(owner).withdraw(ETH))
        .to
        .revertedWith('');

      await expect(boostedStaking.connect(whale).withdraw(ETH))
        .to
        .revertedWith('');
    });

    it(' - Should not work if withdrawing > staked', async () => {
      const ownerARTHBalanceBeforeStaking = await arth.balanceOf(owner.address);
      const contractARTHBalanceBeforeStaking = await arth.balanceOf(boostedStaking.address);

      await boostedStaking.stake(ETH);
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(ownerARTHBalanceBeforeStaking.sub(ETH));
      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(contractARTHBalanceBeforeStaking.add(ETH));
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH);
      expect(await boostedStaking.balanceOf(owner.address))
        .to
        .eq(ETH);

      await expect(boostedStaking.connect(owner).withdraw(ETH.mul(105).div(100)))
        .to
        .revertedWith('');

      expect(await boostedStaking.balanceOf(owner.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH);
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(ownerARTHBalanceBeforeStaking.sub(ETH));
      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(contractARTHBalanceBeforeStaking.add(ETH));
    });

    it(' - Should work for 1 account', async () => {
      const ownerARTHBalanceBeforeStaking = await arth.balanceOf(owner.address);
      const contractARTHBalanceBeforeStaking = await arth.balanceOf(boostedStaking.address);

      await boostedStaking.stake(ETH);
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(ownerARTHBalanceBeforeStaking.sub(ETH));
      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(contractARTHBalanceBeforeStaking.add(ETH));
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH);
      expect(await boostedStaking.balanceOf(owner.address))
        .to
        .eq(ETH);

      await boostedStaking.connect(owner).withdraw(ETH);

      expect(await boostedStaking.balanceOf(owner.address))
        .to
        .eq(0);
      expect(await boostedStaking.totalSupply())
        .to
        .eq(0);
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(ownerARTHBalanceBeforeStaking);
      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(contractARTHBalanceBeforeStaking);
    });

    it(' - Should work properly for 1 account if withdrawing < staked', async () => {
      const ownerARTHBalanceBeforeStaking = await arth.balanceOf(owner.address);
      const contractARTHBalanceBeforeStaking = await arth.balanceOf(boostedStaking.address);

      await boostedStaking.stake(ETH);
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(ownerARTHBalanceBeforeStaking.sub(ETH));
      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(contractARTHBalanceBeforeStaking.add(ETH));
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH);
      expect(await boostedStaking.balanceOf(owner.address))
        .to
        .eq(ETH);

      await boostedStaking.connect(owner).withdraw(HALF_ETH);

      expect(await boostedStaking.balanceOf(owner.address))
        .to
        .eq(HALF_ETH);
      expect(await boostedStaking.totalSupply())
        .to
        .eq(HALF_ETH);
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(ownerARTHBalanceBeforeStaking.sub(HALF_ETH));
      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(contractARTHBalanceBeforeStaking.add(HALF_ETH));
    });

    it(' - Should work for 2 accounts with same amount', async () => {
      const ownerARTHBalanceBeforeStaking = await arth.balanceOf(owner.address);
      const whaleARTHBalanceBeforeStaking = await arth.balanceOf(whale.address);
      const contractARTHBalanceBeforeStaking = await arth.balanceOf(boostedStaking.address);

      await boostedStaking.connect(owner).stake(ETH);
      await boostedStaking.connect(whale).stake(ETH);
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH.mul(2));
      expect(await boostedStaking.balanceOf(owner.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.balanceOf(whale.address))
        .to
        .eq(ETH);
      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(contractARTHBalanceBeforeStaking.add(ETH.mul(2)));

      await boostedStaking.connect(owner).withdraw(ETH)
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH);
      expect(await boostedStaking.balanceOf(owner.address))
        .to
        .eq(0);
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(ownerARTHBalanceBeforeStaking);
      expect(await boostedStaking.balanceOf(whale.address))
        .to
        .eq(ETH);
      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(contractARTHBalanceBeforeStaking.add(ETH));

      await boostedStaking.connect(whale).withdraw(ETH);
      expect(await boostedStaking.totalSupply())
        .to
        .eq(0);
      expect(await boostedStaking.balanceOf(owner.address))
        .to
        .eq(0);
      expect(await boostedStaking.balanceOf(whale.address))
        .to
        .eq(0);
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(ownerARTHBalanceBeforeStaking);
      expect(await arth.balanceOf(whale.address))
        .to
        .eq(whaleARTHBalanceBeforeStaking);
      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(contractARTHBalanceBeforeStaking);
    });

    it(' - Should work for 2 accounts with different amount', async () => {
      const ownerARTHBalanceBeforeStaking = await arth.balanceOf(owner.address);
      const whaleARTHBalanceBeforeStaking = await arth.balanceOf(whale.address);
      const contractARTHBalanceBeforeStaking = await arth.balanceOf(boostedStaking.address);

      await boostedStaking.connect(owner).stake(ETH);
      await boostedStaking.connect(whale).stake(ETH.mul(2));
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH.mul(3));
      expect(await boostedStaking.balanceOf(owner.address))
        .to
        .eq(ETH);
      expect(await boostedStaking.balanceOf(whale.address))
        .to
        .eq(ETH.mul(2));
      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(contractARTHBalanceBeforeStaking.add(ETH.mul(3)));

      await boostedStaking.connect(owner).withdraw(ETH)
      expect(await boostedStaking.totalSupply())
        .to
        .eq(ETH.mul(2));
      expect(await boostedStaking.balanceOf(owner.address))
        .to
        .eq(0);
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(ownerARTHBalanceBeforeStaking);
      expect(await boostedStaking.balanceOf(whale.address))
        .to
        .eq(ETH.mul(2));
      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(contractARTHBalanceBeforeStaking.add(ETH).add(ETH));

      await boostedStaking.connect(whale).withdraw(ETH.mul(2));
      expect(await boostedStaking.totalSupply())
        .to
        .eq(0);
      expect(await boostedStaking.balanceOf(owner.address))
        .to
        .eq(0);
      expect(await boostedStaking.balanceOf(whale.address))
        .to
        .eq(0);
      expect(await arth.balanceOf(owner.address))
        .to
        .eq(ownerARTHBalanceBeforeStaking);
      expect(await arth.balanceOf(whale.address))
        .to
        .eq(whaleARTHBalanceBeforeStaking);
      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(contractARTHBalanceBeforeStaking);
    });
  });
});
