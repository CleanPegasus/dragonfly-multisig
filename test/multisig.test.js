// const chai = require("chai");
// const { wasm } = require("circom_tester");
// const path = require("path");
// const F1Field = require("ffjavascript").F1Field;
// const Scalar = require("ffjavascript").Scalar;
// const circomlibjs = require("circomlibjs");
// const snarkjs = require("snarkjs");
// const fs = require("fs");

// exports.p = Scalar.fromString(
//   "21888242871839275222246405745257275088548364400416034343698204186575808495617"
// );
// const Fr = new F1Field(exports.p);
// const crypto = require("crypto");
// const ethUtil = require("ethereumjs-util");
// const wasm_tester = require("circom_tester").wasm;

// const assert = chai.assert;

// function generateMockPrivateKey() {
//   return crypto.randomBytes(32).toString("hex");
// }

// function decomposeKey(key, n, k) {
//   const totalBits = n * k;
//   const keyBigInt = BigInt(`0x${key}`);

//   // Ensure the key fits in the specified number of bits
//   const maxValue = BigInt(2) ** BigInt(totalBits) - BigInt(1);
//   const adjustedKey = keyBigInt & maxValue;

//   const registers = [];
//   const mask = BigInt(2) ** BigInt(n) - BigInt(1);

//   for (let i = 0; i < k; i++) {
//     const register = (adjustedKey >> BigInt(i * n)) & mask;
//     registers.push(register.toString());
//   }

//   return registers;
// }

// async function poseidonHash(inputs) {
//   const poseidon = await circomlibjs.buildPoseidon();
//   const poseidonHash = poseidon.F.toString(poseidon(inputs));
//   return poseidonHash;
// }

// function hexToDecimal(hex) {
//   return BigInt(hex).toString();
// }

// function generateEthereumAddress(privateKey) {
//   privateKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
//   const privateKeyBuffer = Buffer.from(privateKey, "hex");
//   const publicKey = ethUtil.privateToPublic(privateKeyBuffer);
//   const address = ethUtil.publicToAddress(publicKey).toString("hex");
//   return `0x${address}`;
// }

// describe("ZK Multisig Test ", function () {
//   this.timeout(10000000);

//   it("should decompose a private key to k registers of n bit each", async () => {
//     const pk = generateMockPrivateKey();
//     const decomposedPk = decomposeKey(pk, 64, 4);
//     console.log(decomposedPk);
//     let address = generateEthereumAddress(pk);
//     let addressDecimal = hexToDecimal(address);
//     console.log("address: ", address);
//     console.log("address decimal: ", addressDecimal);
//   });

//   it("should test eth private key to address zk circuit", async () => {});

//   it("Should test the multisig", async () => {
//     const pk = generateMockPrivateKey();
//     const decomposedPk = decomposeKey(pk, 64, 4);
//     console.log(decomposedPk);
//     let address = generateEthereumAddress(pk);
//     let addressDecimal = hexToDecimal(address);
//     let addrDecPosHash = await poseidonHash([addressDecimal]);
//     const { proof, publicSignals } = await snarkjs.groth16.fullProve(
//       {
//         privkey: decomposedPk,
//         msg: "100",
//         addrHash1: addrDecPosHash,
//         addrHash2: "0",
//         addrHash3: "0",
//       },
//       "build/multisig_js/multisig.wasm",
//       "build/multisig_final.zkey"
//     );

//     console.log("proof:", proof);
//     console.log("pubSig:", publicSignals);
    
//   const vKey = JSON.parse(fs.readFileSync("build/vkey.json"));
//   const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);

//   console.log(res);
//   });
// });
