const hre = require("hardhat");
const circomlibjs = require("circomlibjs");
const { keccak256 } = require("ethereumjs-util");
const { AbiCoder } = require("ethers");
const crypto = require("crypto");
const ethUtil = require("ethereumjs-util");
const snarkjs = require("snarkjs");
const fs = require("fs");

async function poseidonHash(inputs) {
  const poseidon = await circomlibjs.buildPoseidon();
  const poseidonHash = poseidon.F.toString(poseidon(inputs));
  return poseidonHash;
}

function generateMockPrivateKey() {
  const wallet = ethers.Wallet.createRandom();
  return wallet.privateKey;
}

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

  // Generate signers keys 
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

  // const MultiSigWallet = await hre.ethers.getContractFactory("MultiSigWallet");

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

  // Send 10000 ether to multisig
  console.log("Sending 1000 ether to the multisig...");
  const tx = await deployer.sendTransaction({
    to: multisig.target,
    value: ethers.parseEther("1000"),
    data: "0x",
  });

  await tx.wait();

  console.log(`Send 1000 ether. Hash: ${tx.hash}`);

  // Create a tx from owner1 and send it via deployer

  const to = owners[0];
  const value = hre.ethers.parseEther("1");
  const data = "0x";

  const msgHash = getSolidityKeccak256Hash(to, value, data);

  console.log("Generating Proof");
  let createdProof = await createProof(
    ownersDecomposedPk[0],
    msgHash,
    ownersPoshash[0],
    ownersPoshash[1],
    ownersPoshash[2]
  );
  const [proof_0, publicSignals_0] = [
    createdProof.proof,
    createdProof.publicSignals,
  ];

  const calldata = await snarkjs.groth16.exportSolidityCallData(
    proof_0,
    publicSignals_0
  );

  const calldataList = JSON.parse("[" + calldata + "]");
  // console.log("Calldata: ", calldataList);
  const vKey = JSON.parse(fs.readFileSync("build/vKey.json"));
  const res = await snarkjs.groth16.verify(vKey, publicSignals_0, proof_0);

  const txReceipt = await multisig.submitTransaction(
    to,
    value,
    data,
    calldataList[0],
    calldataList[1],
    calldataList[2],
    calldataList[3]
  );
  console.log(await txReceipt.wait());

  console.log("Transaction confirmed. Hash: ", txReceipt.hash);

  // see the stored tx

  let storedTx = await multisig.getTransaction(0);
  console.log("Stored tx: ", storedTx);

  // Create a tx from owner2 and send it via deployer
  createdProof = await createProof(ownersDecomposedPk[1], msgHash, ownersPoshash[0], ownersPoshash[1], ownersPoshash[2]);
  const [proof_1, publicSignals_1] = [createdProof.proof, createdProof.publicSignals];
  const calldata_1 = await snarkjs.groth16.exportSolidityCallData(proof_1, publicSignals_1);
  const calldataList_1 = JSON.parse("[" + calldata_1 + "]");

  let tx_index = 0;
  const tx_1 = await multisig.confirmTransaction(tx_index, calldataList_1[0], calldataList_1[1], calldataList_1[2], calldataList_1[3]);
  await tx_1.wait();
  console.log("Transaction confirmed. Hash: ", tx_1.hash);

  // execute transaction
  storedTx = await multisig.getTransaction(0);
  console.log("Stored tx: ", storedTx);

  const executingTx = await multisig.executeTransaction(0);
  await executingTx.wait()
  console.log(`Executed tx: ${executingTx}`)
}

async function createProof(privkey, msg, addrHash1, addrHash2, addrHash3) {
  return snarkjs.groth16.fullProve(
    {
      privkey: privkey,
      msg: msg,
      addrHash1: addrHash1,
      addrHash2: addrHash2,
      addrHash3: addrHash3,
    },
    "build/multisig_js/multisig.wasm",
    "build/multisig_0001.zkey"
  );
}

function getFirstTwoElements(arr) {
  return arr.slice(0, 2);
}

function formatProof_A(proof_a) {
  return [BigInt(proof_a[0]), BigInt(proof_a[1])];
}

function formatProof_B(proof_b) {
  return [
    [BigInt(proof_b[0][0]), BigInt(proof_b[0][1])],
    [BigInt(proof_b[1][0]), BigInt(proof_b[1][1])],
  ];
}

function formatPublicSignals(publicSignals) {
  return [
    BigInt(publicSignals[0]),
    BigInt(publicSignals[1]),
    BigInt(publicSignals[2]),
    BigInt(publicSignals[3]),
    BigInt(publicSignals[4]),
  ];
}

function getSolidityKeccak256Hash(_to, _value, _data) {
  const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "bytes"],
    [_to, _value, _data]
  );

  const hash = ethers.keccak256(encodedParams);
  console.log("Hash: ", hash);
  const msgHash = BigInt(hash.toString());
  return msgHash;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
