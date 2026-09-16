export type { Ciphertext } from './crypto';
export {
  decryptString,
  encryptString,
  exportKey,
  generateKey,
  importKey,
} from './crypto';
export { loadOrCreateKey } from './keystore';
export { MappingVault, MAX_VAULT_RECORDS } from './vault';
export { createIdbRepository } from './idb-repository';
export { isEditableCopyTarget, restoreInDom, restoreInText, sealCopiedText } from './restore-dom';
export type { MappingRepository, VaultRecord } from './types';
