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

  before(' - Setup accounts & deploy libraries', async () => {
    [owner] = await ethers.getSigners();
  });

  before(' - Fetch and deploy contract', async () => {
    ARTH = await ethers.getContractFactory('ARTHStablecoin');
    arth = await ARTH.deploy();
  });

  // TODO: write test cases.
});
