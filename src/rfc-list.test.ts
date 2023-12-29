import { ApiPromise, WsProvider } from "@polkadot/api";

describe("RFC Listing test", () => {
  test.only("Should get proposals", async () => {
    const wsProvider = new WsProvider("wss://polkadot-collectives-rpc.polkadot.io");
    try {
      const api = await ApiPromise.create({ provider: wsProvider });
      // We fetch all the members
      const query = (await api.query.fellowshipReferenda.referendumCount.size()).toPrimitive();
      console.log("referendumCount", query);

      if (typeof query !== "number") {
        throw new Error(`Query result is not a number: ${query}`);
      }
      for (const index of Array.from(Array(query).keys())) {
        console.log("Fetching element N", index);

        const refQuery = (await api.query.fellowshipReferenda.referendumInfoFor(index)).toJSON();
        console.log("Reference query", refQuery);
      }
    } catch (e) {
      console.error("Operation failed");
      throw e;
    } finally {
      await wsProvider.disconnect();
    }
  });
});
