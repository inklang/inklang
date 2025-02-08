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

expose function make_sum_request () -> void {
  var headers: @http::headers = @http::create_headers();
  @http::append_header(headers, "Content-Type", "application/json");
}
