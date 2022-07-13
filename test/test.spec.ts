/* eslint-disable indent */
import 'jest';
import { Flow, AccountKey, prepareSimpleTransaction } from '../lib';
import { exec, ChildProcess } from 'child_process';
import { argBuilder, genP256 } from '../lib/signatures';

describe('ContractTesting', () => {
  let flow: Flow;
  let svc: AccountKey;
  let emulator: ChildProcess;

  beforeAll(async () => {
    // start emulator
    emulator = exec('flow emulator');
    // wait 1 second
    await new Promise((p) => setTimeout(p, 1000));
    svc = {
      id: 0,
      address: 'f8d6e0586b0a20c7',
      private_key: Buffer.from('ec8cd232a763fb481711a0f9ce7d1241c7bc3865689afb31e6b213d781642ea7', 'hex'),
      public_key: Buffer.from('81c12390330fdbb55340911b812b50ce7795eefe5478bc5659429f41bdf83d8b6b50f9acc730b9cae67dc29e594ade93cac33f085f07275b8d45331a754497dd', 'hex'),
      hash_algo: 3,
      sign_algo: 2,
      weight: 1000,
      sequence_number: 0,
      revoked: false,
    };
    // connect to emulator
    flow = new Flow('localhost');
  });

  afterAll(() => {
    emulator.kill();
  });
  it('getLatestBlock should work', async () => {
    const block = await flow.getLatestBlock();
    if (!block) return Promise.reject(block);
    expect(block.header.height).toBeTruthy();
  });

  it('getTransaction should work', async () => {
    const script = `
      transaction {

        prepare(acct: AuthAccount) {}
      
        execute {
          log("Hello WORLD!")
        }
      }
    `;
    const transaction = await prepareSimpleTransaction(flow, script, [], svc);
    if (transaction instanceof Error) return Promise.reject(transaction);
    const tx = await flow.submitTransaction(transaction);
    if (!tx) return Promise.reject(tx);
    expect(tx.id).toBeDefined();
    const finTx = await flow.getTransaction(tx.id);
    if (!finTx) return Promise.reject(finTx);
    expect(finTx.script).toBeDefined();
    expect(finTx.arguments.length).toBeDefined();
    expect(finTx.reference_block_id).toBeDefined();
    expect(finTx.gas_limit).toBeDefined();
    expect(finTx.proposal_key).toBeDefined();
    expect(finTx.payer).toBeDefined();
    expect(finTx.authorizers).toBeDefined();
    expect(finTx.payload_signatures).toBeDefined();
    expect(finTx.envelope_signatures).toBeDefined();
  });

  it('getTransactionResult should work', async () => {
    const script = `
      transaction {

        prepare(acct: AuthAccount) {}
      
        execute {
          log("Hello WORLD!")
        }
      }
    `;
    const transaction = await prepareSimpleTransaction(flow, script, [], svc);
    if (transaction instanceof Error) return Promise.reject(transaction);
    const tx = await flow.submitTransaction(transaction);
    if (!tx) return Promise.reject(new Error('bad TX'));
    const finTx = await flow.getTransaction(tx.id);
    if (!finTx) return Promise.reject(new Error('bad TX'));
    expect(tx.id).toBeDefined();
    expect(finTx.result.status).toBeDefined();
    expect(finTx.result.status_code).toBeDefined();
    expect(finTx.result.error_message).toBeDefined();
    expect(finTx.result.events.length).toBeDefined();
  });


  it('getAccount should work', async () => {
    const account = await flow.getAccount(svc.address);
    if (!account) return debugReject(new Error('Bad account address'));
    // the account we requested should be the one received
    expect(account.address).toBe(svc.address);
    expect(account.address).toBeDefined();
    expect(account.balance).toBeDefined();
    expect(account.keys.length).toBeDefined();
    expect(account.contracts).toBeDefined();
  });

  it('executeScript should work', async () => {
    const script = `
      pub fun main(): Int {
        return 1
      }
    `;
    const scRes = await flow.executeScript({ script: Buffer.from(script).toString('base64'), arguments: [] });
    if (scRes instanceof Error) return debugReject(scRes);
    expect(scRes).toBeTruthy();
  });

  it('executeScript should work with arguments', async () => {
    const script = `
      pub fun main(string: String, float: Fix64, int: Int): Int {
        log(string.concat(float.toString()));
        return int;
      }
    `;
    const args = argBuilder(['HelloWorld!', 1.234689, 42]);
    const scRes = await flow.executeScript({ script: Buffer.from(script).toString('base64'), arguments: args });
    if (!scRes) return debugReject(new Error('bad script request'));
    expect(scRes.value).toBeTruthy();
    expect(scRes.value).toBe('42');
  });

  it('getEventsWithinBlockHeight should work', async () => {
    const startingBlockHeight = await flow.getLatestBlock(true);
    if (startingBlockHeight instanceof Error) return debugReject(startingBlockHeight);
    // we need to generate some events to test
    const createAccountTemplate = `
      import Crypto
      transaction(svcKeys: [String], contracts: {String: String}) {
        prepare(signer: AuthAccount) {
          let acct = AuthAccount(payer: signer)
    
          for pkey in svcKeys {
              let key = PublicKey(
                  publicKey: pkey.decodeHex(),
                  signatureAlgorithm: SignatureAlgorithm.ECDSA_P256
              )
              acct.keys.add(publicKey: key, hashAlgorithm: HashAlgorithm.SHA3_256, weight: 1.0)
          }
    
          for contract in contracts.keys {
              acct.contracts.add(name: contract, code: contracts[contract]!.decodeHex())
          }
        }
      }`;
    // generate a new key for this account
    const newKey = genP256();
    const keys: Array<string> = [newKey.publicKey];
    const tx = await prepareSimpleTransaction(flow, createAccountTemplate, [keys, new Map<string, string>()], svc);
    if (tx instanceof Error) return debugReject(tx);
    const txRes = await flow.submitTransaction(tx);
    if (!txRes) return debugReject(new Error('TX Error'));
    console.log(txRes);
    // get ending block height
    const endingBlockHeight = await flow.getLatestBlock(true);
    if (!endingBlockHeight) return debugReject(new Error('bad ending block height'));
    // get events in the range
    const events = await flow.getEventsWithinBlockHeight('flow.AccountCreated', parseInt(startingBlockHeight!.header.height) - 2, parseInt(endingBlockHeight!.header.height));
    if (!events) return debugReject(new Error('bad events request'));
    expect(events.length).toBeGreaterThan(0);
    events.forEach((eventResponse) => {
      eventResponse.events.forEach((evt) => {
        expect(evt.type).toBeDefined();
        expect(evt.transaction_id).toBeDefined();
        expect(evt.transaction_index).toBeDefined();
        expect(evt.event_index).toBeDefined();
        expect(evt.payload).toBeDefined();
      });
    });
  });
});

const debugReject = (err: Error) => {
  console.log(err.message);
  return Promise.reject(err);
};
