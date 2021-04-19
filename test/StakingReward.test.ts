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
  let ARTHPool: ContractFactory;
  let SimpleOracle: ContractFactory;
  let MockCollateral: ContractFactory;
  let ARTHController: ContractFactory;
  let ARTHPoolLibrary: ContractFactory;
  let MockUniswapOracle: ContractFactory;
  let ChainlinkETHGMUOracle: ContractFactory;
  let RecollateralizationCurve: ContractFactory;
  let MockChainlinkAggregatorV3: ContractFactory;
  let StakingRewards: ContractFactory;
  let RewardsDistributionRecipient: ContractFactory;
  let TransferHelper: ContractFactory;

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
  let stakingRewards: Contract;
  let transferHelper: Contract;

  before(' - Setup accounts & deploy libraries', async () => {
    [owner, whale] = await ethers.getSigners();

    ARTHPoolLibrary = await ethers.getContractFactory('ArthPoolLibrary');
    arthPoolLibrary = await ARTHPoolLibrary.deploy();
    //TransferHelper = await ethers.getContractFactory('Uniswap/TransferHelper');
    //transferHelper = await TransferHelper.deploy();
  });

  before(' - Fetch contract factories', async () => {
    MAHA = await ethers.getContractFactory('MahaToken');
    ARTHX = await ethers.getContractFactory('ARTHShares');
    ARTH = await ethers.getContractFactory('ARTHStablecoin');
    MockCollateral = await ethers.getContractFactory('MockCollateral');
    // ARTHPool = await ethers.getContractFactory('ArthPool', {
    //   libraries: {
    //     ArthPoolLibrary: arthPoolLibrary.address
    //   }
    // });
    SimpleOracle = await ethers.getContractFactory('SimpleOracle');
    ARTHController = await ethers.getContractFactory('ArthController');
    MockUniswapOracle = await ethers.getContractFactory('MockUniswapPairOracle');
    ChainlinkETHGMUOracle = await ethers.getContractFactory('ChainlinkETHGMUOracle');
    MockChainlinkAggregatorV3 = await ethers.getContractFactory('MockChainlinkAggregatorV3');
    RecollateralizationCurve = await ethers.getContractFactory('RecollateralizeDiscountCurve');
    StakingRewards = await ethers.getContractFactory('StakingRewards');
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
    arthController = await ARTHController.deploy(owner.address, owner.address);
    recollaterizationCurve = await RecollateralizationCurve.deploy(arth.address, arthController.address);
    stakingRewards = await StakingRewards.deploy(
      owner.address,
      owner.address,
      maha.address,
      arth.address,
      arth.address,
      owner.address,
      1000
    )
  });

  beforeEach(' - Set some contract variables', async () => {
    arthController.setETHGMUOracle(chainlinkETHGMUOracle.address);
    await arthx.setARTHAddress(arth.address);
    await arthController.setGlobalCollateralRatio(0);
    await arthx.setArthController(arthController.address);
    await arthController.setARTHXETHOracle(arthxETHUniswapOracle.address, owner.address);
    await stakingRewards.setArthController(arthController.address);
    await maha.transfer(stakingRewards.address, ETH.mul(10000000000000));
  })

  describe('- Test Staking Rewards', async () => {
    beforeEach(' - Approve collateral', async () => {
      //dai.approve(arthPool.address, ETH);
    })

    it(' - Test Stake', async () => {
      let myBalance = await arth.balanceOf(owner.address);
      let stakingRewardsBalance = await arth.balanceOf(stakingRewards.address);
      // console.log('my balance', myBalance.toString());
      // console.log('staking contract balance', stakingRewardsBalance.toString());

      await arth.approve(stakingRewards.address, ETH);
      await stakingRewards.stake(ETH);

      let myBalance2 = await arth.balanceOf(owner.address);
      let stakingRewardsBalance2 = await arth.balanceOf(stakingRewards.address);

      // console.log('my balance', myBalance2.toString());
      // console.log('staking contract balance', stakingRewardsBalance2.toString());

      expect(await arth.balanceOf(stakingRewards.address))
        .to
        .eq(
          await stakingRewardsBalance.add(ETH)
        )

      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          await myBalance.sub(ETH)
        )
    })

    it(' - Stake should fail for grey listed addresses', async () => {
      await stakingRewards.greylistAddress(owner.address);

      await expect(stakingRewards.stake(ETH))
        .to
        .revertedWith(
          'address has been greylisted'
        )
    })

    it(' - Test stake for', async () => {
      let myBalance = await arth.balanceOf(owner.address);
      let whalesBalance = await arth.balanceOf(whale.address);
      let stakingRewardsBalance = await arth.balanceOf(stakingRewards.address);

      await arth.connect(owner).approve(stakingRewards.address, ETH);
      await stakingRewards.stakeFor(whale.address, ETH)

      expect(await arth.balanceOf(stakingRewards.address))
        .to
        .eq(
          await stakingRewardsBalance.add(ETH)
        )

      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          await myBalance.sub(ETH)
        )

      expect(await arth.balanceOf(whale.address))
        .to
        .eq(
          whalesBalance
        )

      let stakingContractsStakes = await stakingRewards.totalSupply()
      console.log('total Stake', stakingContractsStakes.toString());

      expect(await stakingRewards.totalSupply())
        .to
        .eq(
          ETH
        )

      let unlockedBalances = await stakingRewards.unlockedBalanceOf(whale.address)
      console.log('total unlock balance', unlockedBalances.toString());

      expect(await stakingRewards.unlockedBalanceOf(whale.address))
        .to
        .eq(
          ETH
        )
    })

    it(' - Test stake locked for', async () => {
      let myBalance = await arth.balanceOf(owner.address);
      let whalesBalance = await arth.balanceOf(whale.address);
      let stakingRewardsBalance = await arth.balanceOf(stakingRewards.address);

      await arth.connect(owner).approve(stakingRewards.address, ETH);
      await expect(stakingRewards.stakeLockedFor(whale.address, ETH, 0))
        .to
        .revertedWith(
          'Cannot wait for a negative number'
        );
    })

    //604800, 94,608,000
    it(' - Test stake locked for less then 7 days', async () => {
      let myBalance = await arth.balanceOf(owner.address);
      let whalesBalance = await arth.balanceOf(whale.address);
      let stakingRewardsBalance = await arth.balanceOf(stakingRewards.address);

      await arth.connect(owner).approve(stakingRewards.address, ETH);
      let sec = 604700
      await expect(stakingRewards.stakeLockedFor(whale.address, ETH, sec))
        .to
        .revertedWith(
          'Minimum stake time not met (' + 604800 + ')'
        );
    })

    it(' - Test stake locked for more then 3 years', async () => {
      let myBalance = await arth.balanceOf(owner.address);
      let whalesBalance = await arth.balanceOf(whale.address);
      let stakingRewardsBalance = await arth.balanceOf(stakingRewards.address);

      await arth.connect(owner).approve(stakingRewards.address, ETH);
      let sec = 94608001
      await expect(stakingRewards.stakeLockedFor(whale.address, ETH, sec))
        .to
        .revertedWith(
          'You are trying to stake for too long'
        );
    })

    it(' - Test withdraw fail for amount 0', async () => {

      await expect(stakingRewards.withdraw(0))
        .to
        .revertedWith(
          'Cannot withdraw 0'
        );
    })

    it(' - Test withdraw ', async () => {
      await arth.connect(owner).approve(stakingRewards.address, ETH);
      await stakingRewards.stakeFor(whale.address, ETH)

      let whalesBalance = await stakingRewards.balanceOf(whale.address)
      console.log(whalesBalance.toString());

      await stakingRewards.connect(whale).withdraw(ETH)

      let whalesBalance2 = await stakingRewards.balanceOf(whale.address)
      console.log(whalesBalance2.toString());

      expect(await stakingRewards.balanceOf(whale.address))
        .to
        .eq(
          0
        )
    })
  })
})
