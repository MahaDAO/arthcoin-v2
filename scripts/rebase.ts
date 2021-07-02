import { BigNumber } from 'ethers';
import { network, ethers } from 'hardhat';

require('dotenv').config();

async function main() {
  console.log('network', network.name);

  // Fetch already deployed contracts.
  const deployements = require(`../output/${network.name}.json`);
  const instance = await ethers.getContractAt(
    'ARTHStablecoin',
    deployements.ARTHStablecoin.address
  );

  const dec = BigNumber.from(10).pow(18);
  const me = '0xaefb39d1bc9f5f506730005ec96ff10b4ded8dda';
  const rebaseAmount = BigNumber.from(108e5);

  console.log('owner', await instance.owner());

  console.log('symbol      ', (await instance.symbol()).toString());
  console.log('balance of', (await instance.balanceOf(me)).toString());
  console.log('supply      ', (await instance.totalSupply()).toString());
  console.log('rebaseAmount', rebaseAmount.toString());
  console.log(await instance.rebase(rebaseAmount));
  console.log('rebase done');
  console.log('supply', (await instance.totalSupply()).toString());
  console.log('balance of', (await instance.balanceOf(me)).toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
