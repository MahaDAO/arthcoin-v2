import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

async function main() {
  // We get the contract to deploy

  const instance = await ethers.getContractAt(
    'MultiSender',
    '0x59EDB579fF3bd2751bd5508aB0A1bFa13F78F512'
  );

  const ARTH = await ethers.getContractAt(
    'ARTHShares',
    '0xd354d56dae3588f1145dd664bc5094437b889d6f'
  );

  const decimals = BigNumber.from(10).pow(18);
  const infinity = decimals.mul(9999999999);

  console.log('approving contract');
  // await ARTH.approve(instance.address, infinity);
  console.log(
    await ARTH.balanceOf('0xaefb39d1bc9f5f506730005ec96ff10b4ded8dda')
  );
  console.log('approved');

  const txs = [
    '0x0dd119eb232b8f19f4bd117debcac494eb476ac2,4793.43938944',
    '0x2701e783156e9a842e9543ab94145e4953fe8db8,368032.43434555',
    '0x2f42e0f594d7c2bb68eb0e6545ee75aeb76fb14d,34244.2024691',
    '0x4f262395cdead58c12f97daaf1b44b1d0215d1c5,260065.39095108',
    '0x50765e7fa9d040eaf3598d8c59a691118a1324ce,30973.307976',
    '0x5e52b47629ea2d8b312de17b3255e32c2662fef4,260066.3',
    '0x7dd9c08c2e6b0ca7e91191c8928e268e3b9ed132,119468.813685',
    '0x7e000dda2842042e297e6acc2dcef0fe211098ff,148159.829298',
    '0x80f227a6f50d75f31e83e881d26ad22d147e2fd3,130943.38205',
    '0x8584cd7c5df7be54105e62cc5799f6e0fe1804f8,39010.062',
    '0x8d62c1f9a0b8ffcfb8927b5c6cbe3971a666cae2,130033.15',
    '0x8fb07b21383d331f3752a7590b0cfeac85514a1f,128941.52170575',
    '0x91548e4c6a221610ab1fd3746c2d8ea0119cf49f,15443.39136769',
    '0x92df2a5104fce10d77496710488382eb53def917,1035.3293002',
    '0xa32946d0d3aed19b9140857c43ea140cce16ff76,156036.816',
    '0xa5299c2cd1c67254a0ee18ec8e6797d1af5c6b62,185883.2976',
    '0xbf16866f75d5ad07fcc00cf5455b18935c2649b0,10512.25361472',
    '0xdd5864a413b7ba1cd438e20ca7a14d0e68fc0bfe,390213.74913885',
    '0xe9cb01a8e8b6a5364ae004f175743dea22393c6b,36072.270429',
    '0xe9e0b8b2066b82fa03d5a3471dc1c718f45f6989,24697.53',
    '0xecce08c2636820a81fc0c805dbdc7d846636bbc4,819506.27996926',
    '0xf3e93823f2c898044569d14c812d8c851ed08e9d,110000',
  ];

  const mappedValues = txs.map((t) => t.split(','));

  const addresses = mappedValues.map((t) => t[0]);
  const values = mappedValues.map((t) =>
    decimals.mul(Math.floor(Number(t[1])))
  );

  const gap = 200;
  for (let index = 0; index < values.length / gap; index++) {
    const address_snip = addresses.slice(index * gap, (index + 1) * gap);
    const values_snip = values.slice(index * gap, (index + 1) * gap);

    const tx1 = await instance.multiSendCoinWithDifferentValue(
      ARTH.address,
      address_snip,
      values_snip
    );

    console.log('done', tx1.hash);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
