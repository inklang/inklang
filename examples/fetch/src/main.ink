// expose record session {
//   uwu: u16
//   something: string
//   name: string
// }

// expose function BroIDK (something: string) -> string {
//   var aa: string;
//   aa = "hehe";
//
//   return "bruh" + aa + something;
// }

expose function append_json_to_header (headers: @http::headers) -> void {
  @http::append_header(headers, "Content-Type", "application/json");
}
