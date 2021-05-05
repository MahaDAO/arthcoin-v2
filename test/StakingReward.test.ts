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

  let owner: SignerWithAddress;
  let whale: SignerWithAddress;

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
    [owner, whale] = await ethers.getSigners();
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
      arthController.address, // arthController
      owner.address,
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

    await maha.transfer(boostedStaking.address, ETH.mul(1000000));

    await mockChainlinkAggregatorV3.setLatestPrice(ETH.div(1e10));  // Keep the price of mock chainlink oracle as 1e8 for simplicity sake.
    await boostedStaking.initializeDefault()
  });

  describe('- Test Staking Rewards', async () => {
    it(' - Test Stake', async () => {
      let myBalance = await arth.balanceOf(owner.address);
      let stakingRewardsBalance = await arth.balanceOf(boostedStaking.address);
      console.log(await stakingRewardsBalance.toString());

      await arth.approve(boostedStaking.address, ETH);
      await boostedStaking.stake(ETH);

      expect(await arth.balanceOf(boostedStaking.address))
        .to
        .eq(
          await stakingRewardsBalance.add(ETH)
        )

      expect(await arth.balanceOf(owner.address)).to.eq(
        await myBalance.sub(ETH)
      );
    });

    // it(' - Stake should fail for grey listed addresses', async () => {
    //   await boostedStaking.greylistAddress(owner.address);

    //   await expect(boostedStaking.stake(ETH))
    //     .to
    //     .revertedWith(
    //       'address has been greylisted'
    //     )
    // })

    // it(' - Test stake for', async () => {
    //   let myBalance = await arth.balanceOf(owner.address);
    //   let whalesBalance = await arth.balanceOf(whale.address);
    //   let stakingRewardsBalance = await arth.balanceOf(boostedStaking.address);

    //   await arth.connect(owner).approve(boostedStaking.address, ETH);
    //   await boostedStaking.stakeFor(whale.address, ETH)

    //   expect(await arth.balanceOf(boostedStaking.address))
    //     .to
    //     .eq(
    //       await stakingRewardsBalance.add(ETH)
    //     )

    //   expect(await arth.balanceOf(owner.address))
    //     .to
    //     .eq(
    //       await myBalance.sub(ETH)
    //     )

    //   expect(await arth.balanceOf(whale.address))
    //     .to
    //     .eq(
    //       whalesBalance
    //     )

    //   let stakingContractsStakes = await boostedStaking.totalSupply()
    //   console.log('total Stake', stakingContractsStakes.toString());

    //   expect(await boostedStaking.totalSupply())
    //     .to
    //     .eq(
    //       ETH
    //     )

    //   let unlockedBalances = await boostedStaking.unlockedBalanceOf(whale.address)
    //   console.log('total unlock balance', unlockedBalances.toString());

    //   expect(await boostedStaking.unlockedBalanceOf(whale.address))
    //     .to
    //     .eq(
    //       ETH
    //     )
    // })

    // it(' - Test stake locked for', async () => {
    //   await arth.connect(owner).approve(boostedStaking.address, ETH);
    //   await expect(boostedStaking.stakeLockedFor(whale.address, ETH, 0))
    //     .to
    //     .revertedWith(
    //       'Cannot wait for a negative number'
    //     );
    // })

    // // 604800, 94,608,000
    // it(' - Test stake locked for less then 7 days', async () => {
    //   await arth.connect(owner).approve(boostedStaking.address, ETH);
    //   let sec = 604700
    //   await expect(boostedStaking.stakeLockedFor(whale.address, ETH, sec))
    //     .to
    //     .revertedWith(
    //       'Minimum stake time not met (' + 604800 + ')'
    //     );
    // })

    // it(' - Test stake locked for more then 3 years', async () => {
    //   await arth.connect(owner).approve(boostedStaking.address, ETH);
    //   let sec = 94608001
    //   await expect(boostedStaking.stakeLockedFor(whale.address, ETH, sec))
    //     .to
    //     .revertedWith(
    //       'You are trying to stake for too long'
    //     );
    // })

    // it(' - Test withdraw fail for amount 0', async () => {

    //   await expect(boostedStaking.withdraw(0))
    //     .to
    //     .revertedWith(
    //       'Cannot withdraw 0'
    //     );
    // })

    // it(' - Test withdraw ', async () => {
    //   await arth.connect(owner).approve(boostedStaking.address, ETH);
    //   await boostedStaking.stakeFor(whale.address, ETH)

    //   let whalesBalance = await boostedStaking.balanceOf(whale.address)
    //   console.log(whalesBalance.toString());

    //   await boostedStaking.connect(whale).withdraw(ETH)

    //   let whalesBalance2 = await boostedStaking.balanceOf(whale.address)
    //   console.log(whalesBalance2.toString());

    //   expect(await boostedStaking.balanceOf(whale.address))
    //     .to
    //     .eq(
    //       0
    //     )
    // })
  })
})
