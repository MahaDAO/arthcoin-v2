import { ethers } from 'hardhat';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { BigNumber, Contract, ContractFactory } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import { advanceTimeAndBlock } from './utilities';

chai.use(solidity);

describe('ARTHController', () => {
  const ETH = ethers.utils.parseEther('1');

  let owner: SignerWithAddress;
  let ARTH: ContractFactory;
  let arth: Contract;

  const GENESIS_SUPPLY = ETH.mul(22100000);
  const MAX_UINT256 = ethers.constants.MaxUint256;
  const INITIAL_AMOUNT_SUPPLY = BigNumber.from('21107858507999546111302861');
  const TOTAL_FRACTIONS = MAX_UINT256.sub(MAX_UINT256.mod(INITIAL_AMOUNT_SUPPLY));

  before(' - Setup accounts & deploy libraries', async () => {
    [owner] = await ethers.getSigners();
  });

  before(' - Fetch contract factories', async () => {
    ARTH = await ethers.getContractFactory('ARTHStablecoin');
  });

  beforeEach(' - Deploy contracts', async () => {
    arth = await ARTH.deploy();
  });

  describe(' - Rebase', async () => {
    it(' - Should work properly for 1% rebase', async() => {
      const arthBalanceBefore = await arth.balanceOf(owner.address);

      await arth.rebase(BigNumber.from(
        `-${GENESIS_SUPPLY.mul(1).div(100).toString()}`
      ));

      expect(await arth.balanceOf(owner.address))
        .to
        .eq(
          arthBalanceBefore.sub(arthBalanceBefore.mul(1).div(100))
        );
    });
  });
});
