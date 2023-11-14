/**
 * Copyright (c) Flashbots Ltd. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {PropsWithChildren} from 'react';
import { snakeCase } from 'change-case';
import {useSDK} from '@metamask/sdk-react';

const RPC_GOERLI_FLASHBOTS_NET = 'https://rpc-goerli.flashbots.net';
const RPC_SEPOLIA_FLASHBOTS_NET = 'https://rpc-sepolia.flashbots.net';
const RPC_FLASHBOTS_NET = 'https://rpc.flashbots.net';

interface HintPreferences {
  calldata: boolean;
  contractAddress: boolean;
  functionSelector: boolean;
  logs: boolean;
  defaultLogs: boolean;
  hash: boolean;
}

export interface ProtectButtonOptions extends PropsWithChildren {
  /** Specify data to share; if undefined, uses default
   * [Stable config](https://docs.flashbots.net/flashbots-protect/rpc/mev-share#stable-configuration) */
  hints: HintPreferences;
  /** Selected builders that are permitted to build blocks using the client's
   *  transactions. */
  builders: Array<string>;
  /** `fast` mode enables all supported builders implicitly. Setting `fast`
   * will override `builders`. */
  fast: boolean;
}

export const generateRpcUrl = ({
  chainId,
  options: {hints, builders, fast},
}: {
  chainId: string;
  options: ProtectButtonOptions;
}) => {
  const protectUrl = (() => {
    switch (chainId) {
      case '0x5':
        return RPC_GOERLI_FLASHBOTS_NET;
      case '0xaa36a7':
        return RPC_SEPOLIA_FLASHBOTS_NET;
      default:
        return RPC_FLASHBOTS_NET;
    }
  })();
  const rpcUrl = new URL(protectUrl);

  if (hints) {
    Object.entries(hints).forEach(([hintName, hintEnabled]) => {
      if (hintEnabled) {
        rpcUrl.searchParams.append('hint', snakeCase(hintName));
      }
    });
  }

  if (fast) {
    rpcUrl.pathname += 'fast';
  } else if (builders) {
    builders.forEach((builder) => {
      rpcUrl.searchParams.append('builder', builder.toLowerCase());
    });
  }
  return rpcUrl;
};

const chainName = (chainId: string) => {
  switch (chainId) {
    case '0x1':
      return 'Mainnet';
    case '0x5':
      return 'Goerli';
    case '0xaa36a7':
      return 'Sepolia';
    default:
      return `Chain ${chainId}`;
  }
};

/**
 * Button that connects Metamask to Flashbots Protect when it's clicked.
 */
function FlashbotsProtectButton(options: ProtectButtonOptions) {
  const {chainId = '0x1', sdk, provider} = useSDK();
  const {children} = options;
  const rpcUrl = generateRpcUrl({
    chainId,
    options,
  });

  const connectToProtect = async () => {
    if (provider && sdk) {
      const addChainParams = {
        chainId,
        chainName: `Flashbots Protect (${chainName(chainId)})`,
        iconUrls: ['https://docs.flashbots.net/img/logo.png'],
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: [rpcUrl.toString()],
      };
      await sdk.connect();
      // delete local storage key "providerType" to allow users pick extension
      // or mobile when connecting
      localStorage.removeItem('providerType');
      // do it manually with window.ethereum
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [addChainParams],
        });
      } catch (err) {
        // handle "add" error
        console.error('addChain failed');
      }
    } else {
      console.error('ethereum provider not found');
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigator.clipboard.writeText(rpcUrl.toString())}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            navigator.clipboard.writeText(rpcUrl.toString());
          }
        }}
        className="group relative flex min-w-full max-w-full items-start gap-2 rounded-md border-solid border-slate-200 p-3 transition-colors duration-200 hover:bg-gray-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="mt-0.5 w-4 min-w-[16px]">
          <path
            fillRule="evenodd"
            d="M19.902 4.098a3.75 3.75 0 00-5.304 0l-4.5 4.5a3.75 3.75 0 001.035 6.037.75.75 0 01-.646 1.353 5.25 5.25 0 01-1.449-8.45l4.5-4.5a5.25 5.25 0 117.424 7.424l-1.757 1.757a.75.75 0 11-1.06-1.06l1.757-1.757a3.75 3.75 0 000-5.304zm-7.389 4.267a.75.75 0 011-.353 5.25 5.25 0 011.449 8.45l-4.5 4.5a5.25 5.25 0 11-7.424-7.424l1.757-1.757a.75.75 0 111.06 1.06l-1.757 1.757a3.75 3.75 0 105.304 5.304l4.5-4.5a3.75 3.75 0 00-1.035-6.037.75.75 0 01-.354-1z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <p className="m-0 text-sm font-bold">RPC URL</p>
          <p className="m-0 break-all text-sm text-gray-700">
            {rpcUrl.toString()}
          </p>
        </div>
      </div>
      <button
        type="button"
        className="ring-offset-background focus-visible:ring-ring inline-flex h-10 min-w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-md border-none bg-gray-950 px-4 py-2 text-base font-bold text-white transition-colors hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        onClick={() => connectToProtect()}>
        {children}
      </button>
    </div>
  );
}

export default FlashbotsProtectButton;
export type {HintPreferences};