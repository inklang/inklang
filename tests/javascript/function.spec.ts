import { test, expect } from "bun:test";
import { translate } from "./translate";
import { codeFormatter } from "../helpers";

test("function declaration", () => {
  expect(translate(`
    function hello_world () -> void {
    }
  `)).toBe(codeFormatter(`
    const helloWorld = () => {
    };
  `));
});

test("function declaration with return", () => {
  expect(translate(`
    function hello_world () -> void {
      return;
    }
  `)).toBe(codeFormatter(`
    const helloWorld = () => {
      return;
    };
  `));
});

test("function declaration with a single parameter that returns", () => {
  expect(translate(`
    function hello_world (my_number: u16) -> u16 {
      return a;
    }
  `)).toBe(codeFormatter(`
    const helloWorld = (myNumber) => {
      return a;
    };
  `));
});

test("function declaration with a multiple parameters that adds up in return", () => {
  expect(translate(`
    function hello_world (a: u16, b: u16) -> u16 {
      return a + b;
    }
  `)).toBe(codeFormatter(`
    const helloWorld = (a, b) => {
      return a + b;
    };
  `));
});

test("function declaration with string addition", () => {
  expect(translate(`
    function hello_world (name: string) -> u16 {
      return "hello " + name;
    }
  `)).toBe(codeFormatter(`
    const helloWorld = (name) => {
      return "hello " + name;
    };
  `));
});

test("function declaration with parameters renaming", () => {
  expect(translate(`
    function hello_world (my_num: u16, your_num: u16) -> u16 {
      var their_num = 10;
      return my_num + your_num + their_num;
    }
  `)).toBe(codeFormatter(`
    const helloWorld = (myNum, yourNum) => {
      let theirNum = 10;
      return myNum + yourNum + theirNum;
    };
  `));
});
