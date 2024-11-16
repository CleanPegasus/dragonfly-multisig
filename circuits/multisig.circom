pragma circom 2.0.2;

include "ecdsa-circuits/ecdsa.circom";
include "ecdsa-circuits/eth_addr.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/mimcsponge.circom";

template Multisig(n, k) {

  signal input privkey[k];

  signal input msg;
  signal input addrHash1;
  signal input addrHash2;
  signal input addrHash3;

  signal output msgAttestation;

  component privKeyToAddr = PrivKeyToAddr(n, k);
  for (var i = 0; i < k; i++) {
    privKeyToAddr.privkey[i] <== privkey[i];
  }

  component poseidonHash = Poseidon(1);
  poseidonHash.inputs[0] <== privKeyToAddr.addr;

  signal addrHash <== poseidonHash.out;
  signal temp1;
  signal temp2;
  
  temp1 <== (addrHash1 - addrHash);
  temp2 <== temp1 * (addrHash2 - addrHash);

  temp2 * (addrHash3 - addrHash) === 0;

  component mimcAttestation = MiMCSponge(k+1, 220, 1);
    mimcAttestation.ins[0] <== msg;
    for (var i = 0; i < k; i++) {
        mimcAttestation.ins[i+1] <== privkey[i];
    }
    mimcAttestation.k <== 0;
    msgAttestation <== mimcAttestation.outs[0];
}

component main { public [msg, addrHash1, addrHash2, addrHash3]} = Multisig(64, 4);