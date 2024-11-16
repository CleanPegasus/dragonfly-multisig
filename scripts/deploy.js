const hre = require("hardhat");

function generateEthereumAddress(privateKey) {
  privateKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  const privateKeyBuffer = Buffer.from(privateKey, "hex");
  const publicKey = ethUtil.privateToPublic(privateKeyBuffer);
  const address = ethUtil.publicToAddress(publicKey).toString("hex");
  return `0x${address}`;
}

function decomposeKey(key, n, k) {
  const totalBits = n * k;
  const keyBigInt = BigInt(`${key}`);
  const maxValue = BigInt(2) ** BigInt(totalBits) - BigInt(1);
  const adjustedKey = keyBigInt & maxValue;
  const registers = [];
  const mask = BigInt(2) ** BigInt(n) - BigInt(1);
  for (let i = 0; i < k; i++) {
    const register = (adjustedKey >> BigInt(i * n)) & mask;
    registers.push(register.toString());
  }
  return registers;
}

async function main() {
  const ownersPk = [
    "0x7128f1a29d5c77a152a8f6ea20a48e9cbbd03b84a92957fa2e6779b67fd9db21",
    "0xf5d995524e50e12db492ed59a6493ea8ca944d4d11a1741b9184068e990e8288",
    "0x08e7c807341d16ce2f2c9a026cb521510f13a86388b45171074d24e4705c2bc1",
  ];

  const ownersDecomposedPk = [
    decomposeKey(ownersPk[0], 64, 4),
    decomposeKey(ownersPk[1], 64, 4),
    decomposeKey(ownersPk[2], 64, 4),
  ];

  const owners = [
    generateEthereumAddress(ownersPk[0]),
    generateEthereumAddress(ownersPk[1]),
    generateEthereumAddress(ownersPk[2]),
  ];

  const Groth16Verifier = await hre.ethers.getContractFactory(
    "Groth16Verifier"
  );
  const verifier = await Groth16Verifier.deploy();

  const ownersPoshash = await Promise.all(
    owners.map(async (owner) => {
      let ownerBigInt = BigInt(owner);
      return poseidonHash([ownerBigInt]);
    })
  );

  // Deploy Contract
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const requiredConfirmations = 2;

  const MultiSigWallet = await hre.ethers.getContractFactory("MultiSigWallet");

  const multisig = await MultiSigWallet.deploy(
    ownersPoshash,
    requiredConfirmations,
    verifier.target
  );

  console.log("MultiSigWallet deployed to:", multisig.target);


}

main()