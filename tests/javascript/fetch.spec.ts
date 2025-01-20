import { test, expect } from "bun:test";
import { translate } from "./translate";
import { codeFormatter } from "../helpers";

test("function declaration", () => {
  expect(translate(`
    function do_fetch () -> void {
      var response: @Response = @fetch(
        "https://jsonplaceholder.typicode.com/todos/1"
      );
    }
  `)).toBe(codeFormatter(`
    const { defaultFetcher } = require("@literate.ink/fetcher");

    const doFetch = (fetcher = defaultFetcher) => {
      let response = await fetcher({
        url: "https://jsonplaceholder.typicode.com/todos/1"
      });
    };
  `));
});
