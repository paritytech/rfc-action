import { ApiPromise, WsProvider } from "@polkadot/api";

describe("RFC Listing test", () => {
  let wsProvider: WsProvider;
  test.only("Should get proposals", async () => {
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
      console.log("Fetching element %s/%s", index, query);

      const refQuery = (await api.query.fellowshipReferenda.referendumInfoFor(index)).toJSON() as { ongoing?: OnGoing };
      console.log("Reference query", refQuery);
      if (refQuery.ongoing) {
        ongoing.push(refQuery.ongoing);
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
