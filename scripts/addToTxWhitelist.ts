import { network, ethers } from 'hardhat';

require('dotenv').config();

async function main() {
  // Fetch already deployed contracts.
  const deployements = require(`../output/${network.name}.json`);
  const instance = await ethers.getContractAt(
    'ARTHShares',
    deployements.ARTHShares.address
  );

  const entities: string[] = [
    '0xDC495CF2bd10cd6B179e045A9Db51aF5E707f336',  // Staging ARTHX-MAHA Genesis staking.
    '0x83bF88AF74743916db6e140768c9F9f681A9B276',  // Staging ARTHX-ARTH LP staking.
    '0x9053126c1D10F9c84Ef6F3b66152fB692a3a6c2B',  // Staging ARTHX Staking.
    '0xc8Aa935bB66D46732800C4AD04eDdA385d197f06',  // Staging Pool token.
  ];

  console.log('Adding the following addresses to whitelist\n', entities);
  await instance.addToTaxWhiteListMultiple(entities);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
