import { ApiPromise, WsProvider } from "@polkadot/api";
import fetch from "node-fetch";

const getReferendaData = async (track: number): Promise<ReferendaData> => {
  const url = `https://collectives.subsquare.io/api/fellowship/referenda/${track}.json`;
  const call = await fetch(url);
  const data = (await call.json()) as ReferendaData;
  console.log("Parsed data is", data);
  return data;
};

const hexToString = (hex: string) => {
  let str = "";
  for (let i = 0; i < hex.length; i += 2) {
    const hexValue = hex.substr(i, 2);
    const decimalValue = parseInt(hexValue, 16);
    str += String.fromCharCode(decimalValue);
  }
  return str;
};

describe("RFC Listing test", () => {
  let wsProvider: WsProvider;
  test.only("Should get proposals", async () => {
    const ref54 = await getReferendaData(54);
    if (ref54.onchainData?.inlineCall?.call?.args) {
      const [callData] = ref54.onchainData?.inlineCall?.call.args;
      console.log("Hex value is %s. Converted value is %s", callData.value, hexToString(callData.value));
    }
    wsProvider = new WsProvider("wss://polkadot-collectives-rpc.polkadot.io");
    const api = await ApiPromise.create({ provider: wsProvider });
    // We fetch all the members
    const query = (await api.query.fellowshipReferenda.referendumCount()).toPrimitive();
    console.log("referendumCount", query);

    if (typeof query !== "number") {
      throw new Error(`Query result is not a number: ${query}`);
    }
    const ongoing: OnGoing[] = [];
    for (const index of Array.from(Array(query).keys())) {
      console.log("Fetching element %s/%s", index + 1, query);

      const refQuery = (await api.query.fellowshipReferenda.referendumInfoFor(index)).toJSON() as { ongoing?: OnGoing };
      console.log("Reference query", refQuery);
      if (refQuery.ongoing) {
        ongoing.push(refQuery.ongoing);
        const referendaData = await getReferendaData(refQuery.ongoing.track);
      }
    }

    console.log(`Found ${ongoing.length} ongoing requests`, ongoing);
  }, 20_000);

  afterEach(async () => {
    await wsProvider.disconnect();
  });
});

interface OnGoing {
  track: number;
  origin: { fellowshipOrigins: string };
  proposal: { lookup: any };
  enactment: { after: number };
  submitted: number;
  submissionDeposit: {
    who: string;
    amount: number;
  };
  decisionDeposit: {
    who: string;
    amount: number;
  };
  deciding: { since: number; confirming: null };
  tally: Record<string, number>;
  inQueue: boolean;
}

interface ReferendaData {
  _id: string;
  referendumIndex: number;
  proposer: string;
  title: string;
  content: string;
  contentType: string | "markdown";
  track: number;
  createdAt: Date;
  updatedAt: Date;
  edited: boolean;
  onchainData?: {
    _id: string;
    referendumIndex: number;
    track: number;
    state: {
      name: string;
    };
    inlineCall?: {
      hex: string;
      hash: string;
      call?: {
        callIndex: string;
        section: string;
        method: "remark" | string;
        args: {
          name: "remark" | string;
          type: "Bytes" | string;
          value: string;
        }[];
      };
    };
  };
}
