/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { OP_PUSHDATA1 } from '../opcodes';
import { DECIMAL_PLACES, DEFAULT_TX_VERSION, CREATE_TOKEN_TX_VERSION } from '../constants';
import buffer from 'buffer';
import Long from 'long';
import Transaction from '../models/transaction';
import CreateTokenTransaction from '../models/create_token_transaction';
import Network from '../models/network';
import Address from '../models/address';
import { hexToBuffer, unpackToInt } from '../utils/buffer';
import { crypto, encoding } from 'bitcore-lib';
import { clone } from 'lodash';
import { ParseError } from '../errors';

/**
 * Helper methods
 *
 * @namespace Helpers
 */

const helpers = {

  /**
   * Round float to closest int
   *
   * @param {number} n Number to be rounded
   *
   * @return {number} Closest integer to n passed
   *
   * @memberof Helpers
   * @inner
   */
  roundFloat(n: number): number {
    return Math.round(n*100)/100
  },

  /**
   * Get the formatted value with decimal places and thousand separators
   *
   * @param {number} value Amount to be formatted
   *
   * @return {string} Formatted value
   *
   * @memberof Helpers
   * @inner
   */
  prettyValue(value: number): string {
    const fixedPlaces = (value/10**DECIMAL_PLACES).toFixed(DECIMAL_PLACES);
    const integerPart = fixedPlaces.split('.')[0];
    const decimalPart = fixedPlaces.split('.')[1];
    const integerFormated = new Intl.NumberFormat('en-US').format(Math.abs(parseInt(integerPart)));
    const signal = value < 0 ? '-' : '';
    return `${signal}${integerFormated}.${decimalPart}`;
  },

  /**
   * Validate if the passed version is valid, comparing with the minVersion
   *
   * @param {string} version Version to check if is valid
   * @param {string} minVersion Minimum allowed version
   *
   * @return {boolean}
   *
   * @memberof Helpers
   * @inner
   */
  isVersionAllowed(version: string, minVersion: string): boolean {
    // Verifies if the version in parameter is allowed to make requests to other min version
    if (version.includes('beta') !== minVersion.includes('beta')) {
      // If one version is beta and the other is not, it's not allowed to use it
      return false;
    }

    // Clean the version string to have an array of integers
    // Check for each value if the version is allowed
    let versionTestArr = this.getCleanVersionArray(version);
    let minVersionArr = this.getCleanVersionArray(minVersion);
    for (let i=0; i<minVersionArr.length; i++) {
      if (minVersionArr[i] > versionTestArr[i]) {
        return false;
      } else if (minVersionArr[i] < versionTestArr[i]) {
        return true;
      }
    }

    return true;
  },

  /**
   * Get the version numbers separated by dot  
   * For example: if you haver version 0.3.1-beta you will get ['0', '3', '1']
   *
   * @param {string} version
   *
   * @return {Array} Array of numbers with each version number
   *
   * @memberof Helpers
   * @inner
   */
  getCleanVersionArray(version: string): string[] {
    return version.replace(/[^\d.]/g, '').split('.');
  },

  /**
   * Transform int to bytes
   *
   * @param {number} value Integer to be transformed to bytes
   * @param {number} bytes How many bytes this number uses
   *
   * @return {Buffer} number in bytes
   * @memberof Helpers
   * @inner
   */
  intToBytes(value: number, bytes: number): Buffer {
    let arr = new ArrayBuffer(bytes);
    let view = new DataView(arr);
    if (bytes === 1) {
      // byteOffset = 0;
      view.setUint8(0, value);
    } else if (bytes === 2) {
      // byteOffset = 0; isLittleEndian = false
      view.setUint16(0, value, false);
    } else if (bytes === 4) {
      // byteOffset = 0; isLittleEndian = false
      view.setUint32(0, value, false);
    }
    return buffer.Buffer.from(arr);
  },

  /**
   * Transform signed int to bytes (1, 2, or 4 bytes)
   *
   * @param {number} value Integer to be transformed to bytes
   * @param {number} bytes How many bytes this number uses
   *
   * @return {Buffer} number in bytes
   * @memberof Helpers
   * @inner
   */
  signedIntToBytes(value: number, bytes: number): Buffer {
    let arr = new ArrayBuffer(bytes);
    let view = new DataView(arr);
    if (bytes === 1) {
      // byteOffset = 0
      view.setInt8(0, value);
    } else if (bytes === 2) {
      // byteOffset = 0; isLittleEndian = false
      view.setInt16(0, value, false);
    } else if (bytes === 4) {
      view.setInt32(0, value, false);
    } else if (bytes === 8) {
      // In case of 8 bytes I need to handle the int with a Long lib
      let long = Long.fromNumber(value, false);
      arr = long.toBytesBE();
    }
    return buffer.Buffer.from(arr);
  },

  /**
   * Transform float to bytes
   *
   * @param {number} value Integer to be transformed to bytes
   * @param {number} bytes How many bytes this number uses
   *
   * @return {Buffer} number in bytes
   * @memberof Helpers
   * @inner
   */
  floatToBytes(value: number, bytes: number): Buffer {
    let arr = new ArrayBuffer(bytes);
    let view = new DataView(arr);
    if (bytes === 8) {
      // byteOffset = 0; isLitteEndian = false
      view.setFloat64(0, value, false);
    }
    return buffer.Buffer.from(arr);
  },

  /**
   * Push data to the stack checking if need to add the OP_PUSHDATA1 opcode
   * We push the length of data and the data
   * In case the data has length > 75, we need to push the OP_PUSHDATA1 before the length
   * We always push bytes
   * 
   * We update the array of Buffer sent as parameter, so we don't return a new one
   * 
   * @param {Array} stack Stack of bytes from the script
   * @param {Buffer} data Data to be pushed to stack
   *
   * @memberof Helpers
   * @inner
   */
  pushDataToStack(stack: Buffer[], data: Buffer) {
    // In case data has length bigger than 75, we need to add a pushdata opcode
    if (data.length > 75) {
      stack.push(OP_PUSHDATA1);
    }
    stack.push(this.intToBytes(data.length, 1));
    stack.push(data);
  },
  
  /**
   * Return the checksum of the bytes passed
   * Checksum is calculated as the 4 first bytes of the double sha256
   * 
   * @param {Buffer} bytes Data from where the checksum is calculated
   *
   * @return {Buffer}
   * @memberof Helpers
   * @inner
   */
  getChecksum(bytes: Buffer): Buffer {
    return crypto.Hash.sha256sha256(bytes).slice(0, 4);
  },

  /**
   * Get encoded address object from address hash (20 bytes) and network
   * We complete the address bytes with the network byte and checksum
   * then we encode to base 58 and create the address object
   * 
   * @param {Buffer} addressHash 20 bytes of the address hash in the output script
   * @param {Network} network Network to get the address first byte parameter
   *
   * @return {Address}
   * @memberof Helpers
   * @inner
   */
  encodeAddress(addressHash: Buffer, network: Network): Address {
    if (addressHash.length !== 20) {
      throw new Error('Expect address hash that must have 20 bytes.');
    }

    const addressVersionBytes = buffer.Buffer.from([network.versionBytes.p2pkh]);

    // With this sliced address we can calculate the checksum
    const slicedAddress = buffer.Buffer.concat([addressVersionBytes, addressHash]);
    const checksum = this.getChecksum(slicedAddress);
    const addressBytes = buffer.Buffer.concat([slicedAddress, checksum]);
    return new Address(encoding.Base58.encode(addressBytes), {network});
  },

  /**
   * Create a transaction from bytes
   * First we get the version value from the bytes to discover the
   * transaction type. We currently support only regular transactions and
   * create token transactions.
   * 
   * @param {Buffer} bytes Transaction in bytes
   * @param {Network} network Network to get the address first byte parameter
   *
   * @throws ParseError if sequence of bytes is invalid or network is undefined/null
   *
   * @return {Transaction | CreateTokenTransaction}
   * @memberof Helpers
   * @inner
   */
  createTxFromBytes(bytes: Buffer, network: Network): Transaction | CreateTokenTransaction {
    if (!network) {
      throw new ParseError('Invalid network parameter.');
    }

    // We should clone the buffer being sent in order to never mutate
    // what comes from outside the library
    // as soon as it's available natively we should use an immutable buffer
    const cloneBuffer = clone(bytes);

    // Get version
    const [version, ] = unpackToInt(2, false, cloneBuffer);

    if (version === DEFAULT_TX_VERSION) {
      return Transaction.createFromBytes(cloneBuffer, network);
    } else if (version === CREATE_TOKEN_TX_VERSION) {
      return CreateTokenTransaction.createFromBytes(cloneBuffer, network);
    } else {
      throw new ParseError('We currently support only the Transaction and CreateTokenTransaction types. Other types will be supported in the future.');
    }
  },

  /**
   * Create a transaction from hex
   * We transform the hex in bytes and call the function to get transaction from bytes
   * 
   * @param {string} hex Transaction in hexadecimal
   * @param {Network} network Network to get the address first byte parameter
   *
   * @return {Transaction | CreateTokenTransaction}
   * @memberof Helpers
   * @inner
   */
  createTxFromHex(hex: string, network: Network): Transaction | CreateTokenTransaction {
    return this.createTxFromBytes(hexToBuffer(hex), network);
  },
}

export default helpers;